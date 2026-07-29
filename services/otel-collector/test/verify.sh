#!/usr/bin/env bash
# Verification suite for the Collector's redaction, health-check filtering,
# and hostmetrics collection — see ADR-00018's "Testing (hard requirement)"
# section. Not optional: this is what makes it safe to trust an alpha/beta
# -stability redaction pipeline. Runs standalone and from `pnpm run health`
# (via scripts/repo-health.sh) and from CI (services/otel-collector's own
# workflow, ADR-00019).
#
# Requires: the Collector binary already built at ./dist/starter-otelcol
# (see README.md), and telemetrygen on PATH (`go install
# github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@<version>`
# — see manifest.yaml for the version to match).
#
# Redaction test values are read from test/redaction-vectors.json, shared
# with packages/observability's own redaction test — see that file's
# header for why.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

BINARY="./dist/starter-otelcol"
OUTPUT_DIR="$(mktemp -d)"
COLLECTOR_LOG="$OUTPUT_DIR/collector.log"
FAILURES=0

# shellcheck disable=SC2329 # invoked indirectly via `trap ... EXIT` below
cleanup() {
  if [[ -n "${COLLECTOR_PID:-}" ]]; then
    kill -9 "$COLLECTOR_PID" 2>/dev/null || true
  fi
  rm -rf "$OUTPUT_DIR"
}
trap cleanup EXIT

fail() {
  echo "FAIL: $1"
  FAILURES=$((FAILURES + 1))
}

pass() {
  echo "PASS: $1"
}

if [[ ! -x "$BINARY" ]]; then
  echo "Collector binary not found at $BINARY — build it first (see README.md: builder --config manifest.yaml)"
  exit 1
fi
if ! command -v telemetrygen >/dev/null 2>&1; then
  echo "telemetrygen not found on PATH — see this script's header for the install command"
  exit 1
fi

export OTEL_REDACTION_HMAC_KEY
OTEL_REDACTION_HMAC_KEY=$(openssl rand -hex 32)

echo "Starting Collector (test config, file exporters -> $OUTPUT_DIR) ..."
sed "s#/tmp/otelcol-test-output#$OUTPUT_DIR#g" config/collector.test.yaml >"$OUTPUT_DIR/collector.test.yaml"
"$BINARY" --config "$OUTPUT_DIR/collector.test.yaml" >"$COLLECTOR_LOG" 2>&1 &
COLLECTOR_PID=$!

for _ in $(seq 1 20); do
  if curl -s http://localhost:13133 >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
if ! curl -s http://localhost:13133 >/dev/null 2>&1; then
  fail "Collector did not become healthy — see $COLLECTOR_LOG"
  cat "$COLLECTOR_LOG"
  exit 1
fi

# Redaction test values come from the shared canonical list (ADR-00017)
# — packages/observability's own redaction test reads the same file, so
# a case added here (or there) without a matching implementation on both
# sides shows up as a failure on whichever side is missing it.
VECTORS_FILE="test/redaction-vectors.json"
FAKE_IP=$(python3 -c "import json; print(next(v['value'] for v in json.load(open('$VECTORS_FILE'))['vectors'] if v['kind'] == 'ipv4'))")
FAKE_EMAIL=$(python3 -c "import json; print(next(v['value'] for v in json.load(open('$VECTORS_FILE'))['vectors'] if v['kind'] == 'email'))")
FAKE_IP_2="198.51.100.99" # only used for the filter check, not redaction — deliberately not in the shared vectors file
HEALTH_ROUTE="/api/health" # apps/web/src/app/api/health

echo "Sending synthetic traces ..."
telemetrygen traces --otlp-insecure --otlp-endpoint localhost:4317 --traces 1 \
  --telemetry-attributes "client.ip=\"$FAKE_IP\"" \
  --telemetry-attributes "user.email=\"$FAKE_EMAIL\"" \
  --telemetry-attributes 'http.route="/api/normal-route"' >/dev/null 2>&1

telemetrygen traces --otlp-insecure --otlp-endpoint localhost:4317 --traces 1 \
  --telemetry-attributes "client.ip=\"$FAKE_IP\"" \
  --telemetry-attributes 'http.route="/api/other-route"' >/dev/null 2>&1

# --child-spans 1 makes this a genuine multi-span trace (root + one
# child) — the real bug this guards against only showed up on
# multi-span traces (filterprocessor dropped the individually-matching
# span but left siblings/children behind); a single-span trace can't
# catch that regression. tail_sampling should drop both spans as one unit.
telemetrygen traces --otlp-insecure --otlp-endpoint localhost:4317 --traces 1 --child-spans 1 \
  --telemetry-attributes "client.ip=\"$FAKE_IP_2\"" \
  --telemetry-attributes "http.target=\"$HEALTH_ROUTE\"" >/dev/null 2>&1

# tail_sampling buffers each trace for decision_wait (1s in the test
# config) before deciding keep/drop — comfortably longer than that here.
sleep 4

TRACES_FILE="$OUTPUT_DIR/traces.json"
if [[ ! -f "$TRACES_FILE" ]]; then
  fail "no traces output file produced at all"
else
  # --- Redaction: plaintext must never leak ---
  if grep -qF "$FAKE_IP" "$TRACES_FILE"; then
    fail "redaction: plaintext IP ($FAKE_IP) found in output"
  else
    pass "redaction: plaintext IP not found in output"
  fi
  if grep -qF "$FAKE_EMAIL" "$TRACES_FILE"; then
    fail "redaction: plaintext email found in output"
  else
    pass "redaction: plaintext email not found in output"
  fi

  # --- Redaction: same input must hash identically both times ---
  HASHES=$(python3 -c "
import json
hashes = []
with open('$TRACES_FILE') as f:
    for line in f:
        d = json.loads(line)
        for rs in d.get('resourceSpans', []):
            for ss in rs.get('scopeSpans', []):
                for span in ss.get('spans', []):
                    for a in span.get('attributes', []):
                        if a['key'] == 'client.ip':
                            hashes.append(a['value']['stringValue'])
print('\n'.join(hashes))
")
  UNIQUE_COUNT=$(echo "$HASHES" | sort -u | wc -l)
  HASH_COUNT=$(echo "$HASHES" | grep -c .)
  if [[ "$HASH_COUNT" -ge 2 && "$UNIQUE_COUNT" -eq 1 ]]; then
    pass "redaction: same input ($FAKE_IP) hashed identically across both traces (correlation preserved)"
  else
    fail "redaction: expected one consistent hash across 2+ occurrences of $FAKE_IP, got: $HASHES"
  fi

  # --- Filtering: health-check telemetry must never reach output ---
  if grep -qF "$HEALTH_ROUTE" "$TRACES_FILE"; then
    fail "filter: health-check marker found in output — health-check telemetry was not dropped"
  else
    pass "filter: health-check telemetry correctly dropped"
  fi
  if grep -qF "$FAKE_IP_2" "$TRACES_FILE"; then
    fail "filter: health-check trace's IP found in output — trace was not fully dropped"
  else
    pass "filter: health-check trace fully dropped (no partial leakage)"
  fi
fi

# --- Hostmetrics: pipeline must actually produce host metric data ---
METRICS_FILE="$OUTPUT_DIR/metrics.json"
if [[ ! -f "$METRICS_FILE" ]]; then
  fail "hostmetrics: no metrics output file produced"
else
  if python3 -c "
import json, sys
with open('$METRICS_FILE') as f:
    for line in f:
        d = json.loads(line)
        for rm in d.get('resourceMetrics', []):
            for sm in rm.get('scopeMetrics', []):
                for m in sm.get('metrics', []):
                    if m.get('name', '').startswith('system.'):
                        sys.exit(0)
sys.exit(1)
"; then
    pass "hostmetrics: system.* metrics present in output (pipeline verified — see ADR-00018 for why this is plumbing verification, not meaningful local data)"
  else
    fail "hostmetrics: no system.* metrics found in output"
  fi
fi

echo
if [[ "$FAILURES" -eq 0 ]]; then
  echo "All checks passed."
  exit 0
else
  echo "$FAILURES check(s) failed."
  exit 1
fi

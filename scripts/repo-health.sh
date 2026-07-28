#!/usr/bin/env bash
# Runs every deliberately non-blocking, warn-only check in one place (ADR-00009).
# Always exits 0 — this script reports, it never gates. Run on-demand locally,
# or invoke it from a scheduled CI job against main.

set -uo pipefail

# Every check below assumes it's running from the repo root (pnpm-lock.yaml,
# knip.json, etc. are resolved relative to cwd) — don't rely on the caller's
# cwd, since this script can be invoked from anywhere (`pnpm run health`
# happens to run from the root, but `bash scripts/repo-health.sh` from
# inside scripts/ would silently resolve paths wrong otherwise).
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

section() {
  echo
  echo "── $1 ──"
}

section "Knip (unused files, exports, dependencies)"
pnpm exec knip || true

section "pnpm audit (dependency vulnerabilities)"
# pnpm audit exits non-zero both when it finds real vulnerabilities (the
# normal case — show it) and when the registry itself errors (an
# ERR_PNPM_-prefixed message, not a finding — has happened consistently in
# some environments due to a gzip/response-decoding issue, unrelated to our
# dependencies). Distinguish the two rather than dumping a raw, sometimes
# binary-garbled error to the terminal either way.
audit_output=$(pnpm audit 2>&1)
if echo "$audit_output" | grep -q '\[ERR_PNPM_'; then
  echo "pnpm audit could not complete — the registry returned an error, not a vulnerability finding."
  echo "(osv-scanner below covers the same category and is unaffected by this.)"
else
  echo "$audit_output"
fi

section "osv-scanner (dependency vulnerabilities, broader database)"
if command -v osv-scanner >/dev/null 2>&1; then
  osv-scanner --lockfile=pnpm-lock.yaml || true
else
  echo "osv-scanner not installed locally — skipped. See https://github.com/google/osv-scanner"
fi

section "Gitleaks (full history scan)"
# Periodic full-history scan, distinct from the pre-commit hook's staged-diff-only
# scan — catches anything that predates the hook being set up. Deliberately
# non-blocking here, like every other section in this script; the blocking,
# on-every-push secrets check is a separate step in ci.yml.
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --redact || true
else
  echo "gitleaks not installed locally — skipped. See https://github.com/gitleaks/gitleaks"
fi

section "Semgrep (fuller ruleset sweep)"
if command -v semgrep >/dev/null 2>&1; then
  semgrep scan --config p/javascript --config p/typescript --config p/owasp-top-ten --config p/security-audit || true
else
  echo "semgrep not installed locally — skipped. See https://semgrep.dev/docs/getting-started/"
fi

section "Bearer (fuller sweep)"
if command -v bearer >/dev/null 2>&1; then
  bearer scan . || true
else
  echo "bearer not installed locally — skipped. See https://docs.bearer.com/"
fi

section "Churn × complexity hotspots"
bash scripts/churn-vs-complexity.sh || true

section "E2E (full suite — ADR-00007)"
# All tests, all browsers — distinct from the small @critical-tagged subset
# that runs on every push in ci.yml. Needs Playwright's browser binaries
# installed (`pnpm exec playwright install`, or `--with-deps` in CI); if
# they're missing, Playwright's own error message below says so.
pnpm nx e2e web-e2e || true

echo
echo "Repo health check complete. Findings above are informational — review, don't panic."

# services/otel-collector

A custom-built [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/), built via the [OpenTelemetry Collector Builder (OCB)](https://opentelemetry.io/docs/collector/extend/ocb/) rather than the stock Contrib image. See [ADR-00018](../../docs/adrs/00018-otel-collector-architecture-and-redaction.md) for why, [ADR-00019](../../docs/adrs/00019-non-ts-service-pattern.md) for how this fits into the repo (it's the first non-TypeScript component here, and doesn't participate in the Nx/pnpm workspace), and [ADR-00017](../../docs/adrs/00017-telemetry-backend-selection.md) for where the telemetry actually goes.

## What it does

Every app talks OTLP to this Collector — never directly to a backend. It redacts sensitive values (hashed, not deleted — see below), drops health-check telemetry, derives request/error/duration metrics from traces, and forwards everything to the Grafana stack (Loki/Tempo/Mimir) plus Sentry for error reporting. Locally, all of those (except Sentry — see ADR-00021) are real, self-hosted instances Docker Compose brings up alongside this Collector, not stubs.

## Local setup

Requires Go (pinned in this directory's own `.tool-versions` — asdf/mise pick this up automatically once your shell's cwd is under this directory) and Docker.

```bash
# Build the Collector binary
builder --config manifest.yaml
# → ./dist/starter-otelcol

# Validate a config without running it
./dist/starter-otelcol validate --config config/collector.yaml

# Build the Docker image (what actually ships)
docker build -t starter-otel-collector:local .
```

## Configuration

- `manifest.yaml` — the OCB component manifest. Every component version is pinned to match exactly; bumping this is a manual, deliberate version bump (not covered by Renovate — see ADR-00018's Consequences).
- `config/collector.yaml` — the real pipeline: same shape in Docker Compose locally and in production (ADR-00008's dev/prod parity principle, extended to this service). Only the exporter destinations (env vars) differ between environments.
- `config/collector.test.yaml` — used only by `test/verify.sh`. Same receivers/processors as the real config (that's what's being verified); swaps the real exporters for a `file` exporter the test script reads.

### Required environment variables (real config)

| Variable                   | Purpose                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `OTEL_REDACTION_HMAC_KEY`  | HMAC key for redaction hashing — must be ≥ 32 bytes (`openssl rand -hex 32`)           |
| `OTEL_LOKI_OTLP_ENDPOINT`  | Loki's OTLP endpoint — `.env.example` already points this at the local Compose service |
| `OTEL_TEMPO_OTLP_ENDPOINT` | Tempo's OTLP endpoint — same                                                           |
| `OTEL_MIMIR_OTLP_ENDPOINT` | Mimir's OTLP endpoint — same                                                           |
| `SENTRY_URL`               | Sentry org base URL (e.g. `https://sentry.io`)                                         |
| `SENTRY_ORG_SLUG`          | Sentry organization slug                                                               |
| `SENTRY_AUTH_TOKEN`        | Sentry API auth token (needs `project:read`/`org:read` at minimum)                     |

The three `SENTRY_*` vars have no local self-hosted equivalent (ADR-00021 — GlitchTip only covers `packages/observability`'s direct-SDK path, not this Collector's `sentryexporter`). `.env.example`'s local defaults are syntactically valid placeholders that keep the Collector startable (it requires non-empty values) without resolving to anything real — that specific export path is silently unexercised locally, by design, until real Sentry credentials are set.

## Testing (hard requirement, not optional — see ADR-00018)

```bash
bash test/verify.sh
```

Builds nothing itself — requires `./dist/starter-otelcol` already built (see above) and [`telemetrygen`](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/cmd/telemetrygen) on `PATH`:

```bash
go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@v0.157.0
```

Verifies, against the real built binary: redacted values never appear in plaintext; the same input hashes identically across two separate traces (proves correlation is preserved, not just that data is hidden); health-check telemetry is fully dropped; hostmetrics data is actually present in output. This is wired into `pnpm run health` from the repo root and runs in this directory's own CI workflow.

## Health-check filtering

Telemetry from `apps/web`'s health-check route (`apps/web/src/app/api/health`) is dropped before it reaches any exporter — via two different mechanisms depending on signal type (ADR-00022):

- **Traces**: `tail_sampling` (`config/collector.yaml`'s `tail_sampling` processor), matched on `http.target == "/api/health"`. Buffers each trace until complete, then drops it as a whole unit — necessary because `filterprocessor` (tried first) only drops the individual span that matches, leaving orphaned sibling spans behind for any multi-span trace, which a real health-check request always is.
- **Logs**: `filterprocessor` (`config/collector.yaml`'s `filter/health_checks` processor), matched on `log.attributes["http.route"] == "/api/health"`. A log record has no multi-span structure to preserve, so per-record matching is correct here.

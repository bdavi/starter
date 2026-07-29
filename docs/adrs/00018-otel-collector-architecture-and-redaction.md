# ADR-00018: OpenTelemetry Collector Architecture, Components & Redaction Policy

Status: Accepted
Date: 2026-07-28

## Context

ADR-00016 mandated a Collector between every app and any backend; ADR-00017 chose where its output goes (Grafana stack, Sentry). This ADR covers how the Collector itself is built and configured: which distribution, which components, and — the most consequential single decision here — how it protects sensitive data before anything leaves the process.

Redaction was elevated from "nice to have" to a hard requirement specifically because this repo's own auth code (ADR-00012) is exactly the kind of code that silently logs PII if nobody guards against it, and because deletion-based redaction (the naive default) destroys a capability worth keeping: the ability to correlate two log lines that share a value (e.g. two requests from the same IP) without ever exposing that value.

## Options Considered

### Distribution

1. **Full Contrib Docker image** — simplest, no build step, but ships every community-maintained component (~120MB) regardless of use.
2. **Core distribution** — smaller, official, but the two processors this ADR needs (`redaction`, `attributes`) both live in Contrib, not Core. Ruled out once that became clear — there's no smaller-but-sufficient Core-only path available.
3. **Custom build via the OpenTelemetry Collector Builder (OCB)** — a manifest listing exactly the needed components compiles into a minimal, purpose-built binary. **Chosen.** The earlier reasoning for deferring this ("wait until the component list stabilizes") no longer applies — the list below is now well-defined, and redaction being Contrib-only means Contrib-sourced components are needed regardless of which distribution is the starting point.

### Redaction mechanism

1. **Deletion or static masking** (the `redaction` processor's default mode) — rejected: destroys correlatability. Two logs sharing an IP or email become indistinguishable from two logs with different ones.
2. **Plain hashing** (SHA1/SHA256/MD5) — rejected: low-entropy values like IPv4 addresses (~4 billion possible values) are rainbow-table-reversible in practice. A plain hash preserves correlation but not actual protection for exactly the values most likely to need it.
3. **HMAC hashing** (`hash_function: hmac-sha256`, a supported mode of the same `redaction` processor) — **chosen**. Keyed, so undiscoverable without the secret, while remaining fully deterministic — the same input always produces the same output, which is the actual property "hashing instead of deletion" was asked for.

## Decision

**Custom OCB-built Collector**, deployed in production as an agent alongside each service, and as a single instance in Docker Compose locally (same configuration shape in both places — this is a direct extension of ADR-00008's dev/prod-parity principle to observability infrastructure itself, not just backing services).

**Component list:**

- **Receivers**: `otlp` (the only real ingestion path — every app talks OTLP to this Collector, per ADR-00016); `hostmetrics`. Kept deliberately even though it's low-value as _data_ locally — this repo's apps run natively, not in Docker (ADR-00008), so the local Collector's own `hostmetrics` output reports on its own idle container, not on any app's real resource usage. It's kept anyway, specifically so the local and production Collector configurations stay identical rather than silently diverging — the value here is config parity, not the local data itself.
- **Processors**: `batch`, `memory_limiter` (both near-mandatory for a stable pipeline); `redaction` with `hash_function: hmac-sha256` and a secret key sourced from the environment (see Consequences); `filter`, scoped to start at dropping health-check telemetry. The exact match criteria (route path, span name) can't be finalized yet — `apps/web` doesn't have a health-check endpoint defined at the time of this decision. This is deferred deliberately, not forgotten: the filter rule ships with a placeholder pattern, to be replaced once a real endpoint exists.
- **Connectors**: `spanmetrics`, deriving Request/Error/Duration metrics directly from trace spans rather than requiring separate metrics instrumentation. Must run _before_ any future sampling processor in pipeline order — sampling after `spanmetrics` would make derived metrics reflect only the sampled subset rather than true traffic. No sampling processor exists yet; this constraint is recorded here so it isn't rediscovered the hard way later.
- **Extensions**: `health_check` — exposes the Collector's own health endpoint, needed the moment this runs as a real Docker Compose service.
- **Exporters**: `otlphttp`, reused as-is for all three Grafana destinations (confirmed in ADR-00017 that Loki/Tempo/Mimir all accept native OTLP), plus the Sentry exporter path from ADR-00017 (stability status to be verified before this ships — the redaction processor itself is beta for traces but only alpha for logs and metrics, and the Sentry exporter's own status is unverified as of this writing; neither is a reason not to proceed, but both are reasons the testing requirement below isn't optional).

## Testing (hard requirement, not optional)

Verified via `telemetrygen` generating synthetic telemetry against a running Collector, with a `debug`/`file` exporter capturing what actually reached the pipeline:

- **Redaction**: a known plaintext value (fake IP, fake password) never appears in output; the same input produces the same hash on repeat runs (proves correlation actually works, not just that data is hidden); two different inputs produce different hashes (catches a degenerate config that hashes everything to one value).
- **Filtering**: synthetic health-check telemetry never reaches the exporter.
- **Hostmetrics**: host metric records are actually present in output (verifies the pipeline works, independent of whether the data is meaningful in this specific local context, per the parity reasoning above).
- **Cross-path redaction sync** (ADR-00017, ADR-00020): the Collector's redaction rules and Sentry SDK's `beforeSend` redaction (a separate implementation, on the TypeScript side) must cover the same set of sensitive-field patterns. Implementation approach: a single canonical list of sensitive-field test cases, consumed by both this suite and `packages/observability`'s own redaction tests, so a pattern added to the canonical list creates a test obligation on both sides simultaneously rather than only wherever someone remembered to add it.

This suite runs standalone and is wired into `pnpm run health`. It's genuinely CI-feasible — ephemeral, stateless, no external dependency — the same category as Gitleaks/Semgrep/zizmor already running in CI, not the category Postgres was deliberately kept out of.

## Consequences

- Dependency currency for the OCB manifest (a Go-module-based YAML file, not `package.json`) isn't covered by Renovate's existing scope. This is a known, not-yet-solved gap — may end up as a manually-tracked update, which is an acceptable but real ongoing cost.
- Production hosting for the Collector itself isn't decided — "agent per service" is the architectural shape, but there's no production environment for it to run in yet, since hosting for `apps/web` is itself a separate, not-yet-written ADR.
- The health-check filter's placeholder match criteria (noted above as unfinished) was resolved once `apps/web` got a real health-check route (`apps/web/src/app/api/health`). The `filterprocessor`-based approach recorded here for traces was later found, via real end-to-end testing, to only drop the individual matching span rather than the whole trace — replaced by `tail_sampling` for traces specifically; see [ADR-00022](./00022-health-check-trace-filtering-tail-sampling.md). `filterprocessor` is still used as originally decided for logs.
- The redaction processor's alpha stability for logs specifically is accepted, not ignored — mitigated by the hard testing requirement above being exactly the kind of check that catches an alpha-stability component changing behavior out from under this repo.

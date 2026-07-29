# ADR-00021: Local Observability Backend Stack (Grafana Stack + GlitchTip)

Status: Accepted
Date: 2026-07-29

## Context

ADR-00017 chose the Grafana stack (Loki/Tempo/Mimir/Grafana) and Sentry, explicitly mirroring ADR-00008's principle for Postgres: real, open software running locally via Docker Compose, with a genuinely managed/hosted version of that _same_ software used in production. At the time, `docker-compose.yml` was never actually updated to include those backends — the Collector was wired to forward to them via env vars with nothing real behind those endpoints, so `docker compose up -d` didn't work out of the box and the self-hosted half of ADR-00017's principle was decided but not implemented. This ADR closes that gap.

Sentry itself doesn't fit the "self-host the same product locally" pattern ADR-00017 otherwise follows: self-hosted Sentry's own reference stack is on the order of 15-20 containers (Kafka, ClickHouse, Snuba, Relay, Symbolicator, and more) with 16GB+ RAM recommended by Sentry's own docs — impractical to default a local dev environment to. GlitchTip (already named in ADR-00017 as "the documented low-cost fallback") is the practical local alternative: ~4 containers, implements Sentry's classic DSN/SDK ingest protocol directly.

## Options Considered

### Local telemetry backends generally

1. **Self-host the full stack locally** — real Loki/Tempo/Mimir/Grafana, single-binary/monolithic mode. **Chosen.** No external accounts needed; matches ADR-00017's stated principle exactly.
2. **Point at hosted cloud accounts even for local dev** — simpler `docker-compose.yml`, but requires a Grafana Cloud signup before local dev works at all, and makes local dev depend on external network reachability. Rejected.
3. **Make backends optional, default to a debug/file exporter locally** — `docker compose up -d` works with zero setup, but the pipeline is never really exercised locally, undermining the reason ADR-00018 required end-to-end verification in the first place. Rejected.

### Local error tracking specifically

Once (1) was chosen for the rest of the stack, error tracking needed its own answer, since Sentry doesn't self-host lightly (see Context):

1. **GlitchTip for both the direct-SDK path and the Collector-routed path** — investigated directly: GlitchTip implements Sentry's classic DSN/SDK envelope protocol (fully compatible with `packages/observability`'s `Sentry.captureException()` calls), but the Collector's `sentryexporter` component uses a _different_, newer mechanism — Sentry's org-management API (`org_slug` + `auth_token`) plus native OTLP ingestion. GlitchTip implements neither. **Not viable** — this isn't a config gap, it's a protocol GlitchTip doesn't speak.
2. **Real Sentry.io (free tier) for both paths, drop GlitchTip entirely** — simpler (`docker-compose.yml` has no error-tracking containers at all), true single-product consistency, but requires a Sentry.io signup before local dev's error-reporting paths work at all, and self-hosts nothing for this concern.
3. **GlitchTip for the direct-SDK path only; leave the Collector-routed path unexercised locally** — **chosen**. No signup needed for local dev. Accepts that this one path (traces routed to Sentry via the Collector) isn't verified against a real backend locally — it needs a real Sentry account somewhere (e.g. staging, or a deliberate one-off local test) to actually exercise.

## Decision

**Self-hosted locally, real Sentry in any environment that exercises the Collector-routed path:**

- **Loki, Tempo, Mimir, Grafana** — single-binary/monolithic mode, filesystem storage, no object-store backend. This is exactly how none of these would run in production; it's sized for one local dev's traffic only. Grafana provisioned with all three datasources automatically (`docker/grafana/provisioning/`) — no manual click-through setup. Grafana's default UI port (3000) is remapped to 3001 on the host, since `apps/web` already owns 3000.
- **GlitchTip** — self-hosted, covers `packages/observability`'s direct-SDK error path (`SENTRY_DSN`) only. `SERVER_ROLE: all_in_one` (GlitchTip 6+) runs web+worker+beat in one container, avoiding a separate Celery service.
- **The Collector's `sentryexporter`** (`SENTRY_URL`/`SENTRY_ORG_SLUG`/`SENTRY_AUTH_TOKEN`) uses deliberate, syntactically-valid-but-nonfunctional placeholder values for local dev (`http://sentry.invalid`, etc.) — verified directly that the Collector requires non-empty strings for these to start at all (hard startup validation, not a soft check), but that a value which merely fails to _resolve_ at export time is a soft failure: a background warning + retry, isolated to that one exporter, that doesn't crash the Collector or affect any other pipeline. Set real values here in any environment where this specific path needs to actually be exercised.

## Consequences

- Local dev now runs meaningfully more containers: `postgres`, `otel-collector`, `loki`, `tempo`, `mimir`, `grafana`, `glitchtip`, `glitchtip-postgres`, `glitchtip-valkey` — nine total, up from two. Real resource cost, accepted as the price of the "real software, not substitutes" principle actually holding locally.
- Getting a `SENTRY_DSN` for local dev requires a one-time manual step (sign in at `http://localhost:8000`, create an org + project, copy its DSN into `.env`) — the same category of unavoidable manual step a real Sentry.io signup would require; nothing about self-hosting GlitchTip removes it.
- The Collector-routed Sentry path is a real, accepted gap in local test coverage — anyone needing to verify it end-to-end needs real Sentry credentials in an environment where the pipeline actually runs (this repo doesn't have a staging/CI environment for this yet; tracked here, not silently forgotten).
- Tempo and Mimir emit some background-job log noise in single-node mode (e.g. Tempo's backend-scheduler polling finding "no jobs," Loki's ring settling on startup) — confirmed benign (doesn't affect ingestion or query correctness), not investigated further.
- `docker/` (repo root) is a new directory holding static, mounted third-party config for these services — distinct from `services/` (ADR-00019), which is reserved for components this repo actually builds/tests/ships its own image for. Loki/Tempo/Mimir/Grafana/GlitchTip are none of that; they're off-the-shelf images with mounted config.

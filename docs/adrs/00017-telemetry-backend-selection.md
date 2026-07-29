# ADR-00017: Telemetry Backend Selection (Grafana + Sentry)

Status: Accepted
Date: 2026-07-28

## Context

ADR-00016 established that every app/service sends telemetry through a local OpenTelemetry Collector, never directly to a vendor. That Collector still needs somewhere real to send data. The guiding principle for this choice: mirror ADR-00008's existing pattern for Postgres and (planned) Redis — real, open software that runs locally via Docker Compose, with a genuinely managed/hosted version of that _same_ software used in production. Not a different product per environment, and not a SaaS-only tool with no self-hosted equivalent to develop against.

That principle rules out most of the backends that would otherwise be reasonable choices. Several strong-looking SaaS options from the initial survey (Axiom, Datadog, Honeycomb, Better Stack, New Relic) don't have a self-hosted version of the identical product — they're managed-only, which breaks the local-development half of the principle outright.

## Options Considered

For logs, traces, and metrics:

1. **SigNoz** — a single open-source product, ClickHouse-backed, OTel-native by design rather than retrofitted, covering all three signal types in one store. SigNoz Cloud and self-hosted SigNoz share the same core product and OTel-native model (confirmed: differences are operational — auth headers, TLS — not a different product). Strong fit for the stated principle, at the cost of a newer, smaller ecosystem.
2. **The Grafana stack — Loki (logs), Tempo (traces), Mimir (metrics), Grafana (visualization)** — each independently open source and self-hostable via Docker Compose. Grafana Cloud hosts the literal same Loki/Tempo/Mimir, not a repackaging. More mature and widely used than SigNoz; more moving parts locally (four services instead of one). **Chosen.**
3. **Jaeger** — genuinely open source, trivially self-hosted, but has no official managed offering from its own maintainers. Fails the "hosted version of the same tool" half of the principle — self-hosting it is the only option, forever. Rejected as a primary backend for this reason, despite being a fine tracing-only tool on its own.
4. **Prometheus alone**, for metrics specifically, paired with Grafana Cloud's Mimir (which speaks Prometheus's own remote-write protocol) — a narrower alternative to the full stack. Not chosen since Mimir (bundled with the rest of the Grafana stack) already covers this without a separate tool.

For error reporting specifically (a distinct concern from the above — none of them replicate a dedicated error tracker's grouping/release-tracking/alerting UX):

1. **GlitchTip** — open source, Sentry-DSN/SDK-protocol-compatible (switching is a URL change, not a code change), genuinely lightweight to self-host (its own stack is Django + Celery + Postgres + Redis, notably resonant with infrastructure this repo already runs). Has an official hosted plan from its own maintainers. The purer fit for "open tool, self-hosted or hosted, same product."
2. **Sentry** — more mature and feature-complete, but its self-hosted edition is licensed under the Functional Source License (an evolution of BSL): not OSI-approved open source, though usable freely unless directly competing with Sentry, and converts to Apache-2.0/MIT after two years. Self-hostable, and sentry.io is the same product hosted by the same company. **Chosen**, on maturity grounds, with GlitchTip's DSN-compatibility recorded as the documented low-cost fallback if the licensing distinction ever becomes a real concern.

## Decision

**Grafana stack** (Loki, Tempo, Mimir, Grafana) for logs, traces, and metrics. **Sentry** for error reporting.

Sentry is wired in via two deliberately separate paths, not one:

1. **Collector-routed traces**, via the Collector's dedicated Sentry exporter (component stability to be verified before implementation — same discipline already applied to the redaction processor in ADR-00018). This gives Sentry trace data correlated through the same central, redacted pipeline as everything else.
2. **Direct SDK capture** — `Sentry.captureException()`, called from `packages/observability`'s global exception handler (ADR-00020) — because this is Sentry's native mechanism, the one its grouping/release-tracking/alerting UX is actually built around. A translated span with an exception event is a valid OTel pattern but an indirect way to drive Sentry's purpose-built error UI.

Both paths apply redaction, but through genuinely different mechanisms: the Collector's OTTL/redaction-processor rules (ADR-00018) for path 1, and Sentry SDK's own `beforeSend` hook for path 2. This is a real, concrete drift risk — a sensitive field added to one could be missed in the other, silently. **A test verifying both redaction paths cover the same set of sensitive-field patterns is a required part of this work**, not a nice-to-have; see ADR-00018 and ADR-00020 for where it's implemented.

"Reports," per ADR-00016, is resolved as dashboards — satisfied directly by Grafana, which is now part of the chosen stack rather than a separate concern.

## Consequences

- Confirmed empirically before committing to this: Loki, Tempo, and Mimir are all reachable through the Collector's generic `otlphttp` exporter. Loki's dedicated exporter component was deprecated in mid-2024 in favor of a native OTLP endpoint added in Loki 3.0 — no Grafana-specific exporter component needs to be added to the Collector's manifest (ADR-00018).
- Two new secrets need the same treatment as existing ones (`BETTER_AUTH_SECRET`, etc.): a Sentry DSN and the Collector's HMAC redaction key (ADR-00018) both need `.env`/`.env.example` entries and CI placeholder handling.
- Neither Grafana nor Sentry's self-hosted edition is unconditionally OSI-approved open source in Sentry's case (FSL, not OSS) — accepted deliberately, not overlooked; GlitchTip is the documented fallback if that distinction later matters enough to act on.
- The dual-path Sentry integration and its sync-testing requirement is a real, ongoing maintenance surface: every future addition to one side's redaction rules needs the same addition on the other side, or the sync test should fail loudly.
- Production hosting for the Grafana stack and Sentry (self-managed vs. their respective managed clouds) is intentionally not pinned down further here — either is consistent with this decision; the actual choice can be made, or changed, without revisiting this ADR.
- The self-hosted-locally half of this decision (Grafana stack in `docker-compose.yml`) and the practical resolution for Sentry specifically (GlitchTip locally for the direct-SDK path only, real Sentry for the Collector-routed path) are recorded in [ADR-00021](./00021-local-observability-backend-stack.md), once actually implemented.

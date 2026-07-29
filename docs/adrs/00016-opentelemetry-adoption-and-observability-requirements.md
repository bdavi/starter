# ADR-00016: OpenTelemetry Adoption & Observability Requirements

Status: Accepted
Date: 2026-07-28

## Context

Observability had been informally assumed by this repo without ever being formally decided. ADR-00000 names "missing observability/testing discipline until it's already a production problem" as exactly the kind of pitfall this repo exists to avoid. ADR-00012 and ADR-00013 both reference "the OTel backend" as an already-assumed-but-unresolved choice, kept vendor-neutral on purpose so the template doesn't couple downstream products to one vendor's pricing. `AGENTS.md`'s dev/prod-parity convention assumes an OpenTelemetry Collector running locally too, once it exists. None of this was ever the subject of its own decision — just passing references that accumulated across other ADRs.

The requirements gathered when this was finally discussed directly: logging centralized in a package used by every app; vendor-agnostic patterns; OpenTelemetry specifically; configurable verbosity levels; the ability to attach custom tags/attributes; sensible defaults; error reporting; a logs viewer; metrics; and "reports." Several requirements were missing from that original list and only surfaced during discussion: distributed tracing itself (not named explicitly, despite being OTel's headline capability and directly relevant once `apps/worker`/`apps/admin` exist per ADR-00004); PII/secret redaction (implied by `AGENTS.md`'s "redaction/pipeline config" mention, but not stated as a requirement); a local-development story; context propagation across process/queue boundaries; and sampling/retention/cost-control policy. These are folded into scope by this ADR and its successors, not treated as separately-approved additions.

"Reports" was the vaguest item on the original list and stayed unresolved for several rounds of discussion — it could have meant dashboards, scheduled digest emails, or product/business analytics (a different category entirely, PostHog-shaped, distinct from operational observability). It's resolved here: dashboards, satisfied by whichever backend's visualization layer is chosen (see ADR-00017). Scheduled digests and product analytics remain unaddressed — not rejected, just genuinely out of scope until a concrete need for either surfaces.

## Options Considered

For the instrumentation standard itself:

1. **No shared standard — let each future service pick its own logging/tracing approach.** Rejected outright: directly contradicts the vendor-neutral principle already assumed in ADR-00012/00013, and would mean `apps/worker`/`apps/admin` each reinventing this rather than sharing one design.
2. **A single proprietary vendor's SDK** (e.g. Datadog's, New Relic's) **used directly.** Rejected: couples the template itself to one vendor's pricing and API surface, the exact thing ADR-00012/00013 already ruled out for auth/observability.
3. **OpenTelemetry** — a vendor-neutral standard: one set of APIs, one wire protocol (OTLP), and every major observability backend can receive it. Chosen.

For how apps reach whatever backend is eventually chosen:

1. **Apps export telemetry directly to a vendor's ingestion endpoint.** Simpler, fewer moving parts, but couples every app's runtime configuration to a specific vendor's endpoint/auth scheme, and provides no place to apply policy (redaction, filtering, sampling) once, centrally.
2. **An OpenTelemetry Collector sits between every app and any backend.** Apps only ever speak OTLP to a local Collector; the Collector's own configuration decides the final destination. Swapping backends, or sending to more than one, becomes a Collector config change — zero application code changes. Chosen.

## Decision

**Adopt OpenTelemetry** — traces, metrics, and logs as the three signal types, plus auto-instrumentation where available — **with an OpenTelemetry Collector as the mandatory intermediary** between every app/service and any backend. No app or package ever exports telemetry directly to a vendor endpoint.

This ADR establishes the standing architecture and requirements only. Four follow-on ADRs cover the actual implementation, each independently readable:

- **ADR-00017** — which backend(s) telemetry actually goes to, and why.
- **ADR-00018** — the Collector's own architecture, component list, and redaction policy.
- **ADR-00019** — the repo-structural and CI/CD pattern this requires (the first non-TypeScript component in this repo).
- **ADR-00020** — the `packages/observability` design every TypeScript app/package actually uses.

**Documentation amendment**: ADR-00006 scoped a single `docs/architecture.md`, generated from Nx's project graph for its structural parts. That doesn't hold once a non-TypeScript service exists (ADR-00019) — Nx's graph has no way to represent it. This work splits that single file into two: `docs/app-architecture.md` (Nx-graph-generated, exactly as ADR-00006 originally described) and `docs/system-architecture.md` (hand-drawn/hybrid, covering the broader picture including non-TS services and telemetry data flow). Written once the work described in ADR-00017 through ADR-00020 became real: [docs/app-architecture.md](../app-architecture.md) and [docs/system-architecture.md](../system-architecture.md).

## Consequences

- Every future app/service that emits telemetry does so through `packages/observability` (ADR-00020) and a local Collector (ADR-00018/00019) — never a direct vendor SDK. This is now a standing constraint, not a one-time choice for `apps/web`.
- "Reports" as scheduled digests or product analytics remains unaddressed. If either becomes a real need, it's a new decision, not something this ADR silently covers.
- The four follow-on ADRs are allowed to make backend-, component-, and package-level decisions without re-litigating why OpenTelemetry was chosen at all — that question is closed here.
- `docs/architecture.md` as a single file, per ADR-00006, is superseded by the two-file split described above.

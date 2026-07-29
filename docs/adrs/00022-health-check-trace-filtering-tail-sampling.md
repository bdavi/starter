# ADR-00022: Health-Check Trace Filtering — filterprocessor to tail_sampling

Status: Accepted
Date: 2026-07-29

## Context

ADR-00018 chose the `filterprocessor` (OTTL span-level matching) to drop health-check telemetry, verified via `test/verify.sh` against synthetic `telemetrygen`-generated traces. Those synthetic traces are single-span. Verifying the full local stack end-to-end (ADR-00021) against **real** `apps/web` traffic exposed two compounding problems synthetic single-span data couldn't catch:

1. **`filterprocessor`'s `trace_conditions` drop only the individual matching span, not the whole trace** — confirmed directly from the component's own README ("Telemetry is evaluated hierarchically... Drop the span if [condition] is true"). A real request to `/api/health` produces a multi-span trace (e.g. `resolve page components`, `executing api route (app) /api/health`, `start response`, and a root `GET`/`GET /api/health` span) — dropping only whichever span happened to match left the others behind in Tempo as an orphaned partial trace.
2. **Next.js's auto-instrumentation doesn't reliably set `http.route` on the root span.** Observed directly, repeatedly, on the same route: sometimes the root span carries `http.route`, sometimes only child spans do, sometimes neither does (only `http.target`, which was the one attribute consistently present on the root span across every observed case). A condition keyed on `http.route` alone missed the request outright in some runs.

Together, these meant the "no partial leakage" hard requirement ADR-00018 itself established was silently violated for real traffic, undetected because the original test suite's single-span synthetic traces couldn't exercise either failure mode.

## Options Considered

1. **Fix only the attribute-reliability problem** (e.g. manually stamp a custom attribute on the active span inside the health route handler) — rejected on its own: doesn't address problem 1. `filterprocessor` would still drop only the one span carrying that attribute, leaving siblings behind regardless of how reliable the attribute itself is.
2. **Switch the traces path to the `tail_sampling` processor**, using its `drop` policy type — **chosen**. Buffers each trace until it's complete (`decision_wait`), then makes one keep/drop decision for the entire trace based on whether any span matches. This is the officially documented pattern for exactly this case — the component's own README's example config uses a `/health`/`/metrics` path-drop policy near-verbatim.
3. **Suppress health-check spans at the app/instrumentation level** (disable auto-instrumentation selectively per-route) — rejected: a much more invasive, route-specific app-level change, and abandons the "one central place, same pipeline shape for everything" principle this Collector exists to provide (ADR-00016).

## Decision

**`tail_sampling`**, for traces only. Matches on `http.target` (the reliably-present attribute), not `http.route`. Two policies, in order:

```yaml
tail_sampling:
  decision_wait: 5s
  policies:
    - name: drop_health_checks
      type: drop
      drop:
        drop_sub_policy:
          - name: drop_health_checks_target
            type: string_attribute
            string_attribute:
              key: http.target
              values: ["/api/health"]
    - name: sample_everything_else
      type: always_sample
```

`sample_everything_else` is required, not redundant: per `tail_sampling`'s own documented decision flow, a trace with **no** explicit "sample" decision from any policy is dropped by default — the `drop` policy alone would silently drop everything, not just health checks.

`filterprocessor` stays in place for **logs** — unaffected by this change. A log record has no multi-record structure to preserve; per-record OTTL matching is the correct tool there, and each log record's health-check-ness doesn't depend on sibling records the way a trace's does.

## Consequences

- **`tail_sampling` requires every span of a trace to reach the same Collector instance** (documented directly in its own README) — a real, direct tension with ADR-00018's "agent per service" production deployment shape. If a future trace ever spans more than one of this repo's own services with propagated trace context (e.g. `apps/web` calling a future `apps/worker` synchronously), each service's own local agent Collector would only see its own slice of that trace, and neither agent could make a correct whole-trace decision alone. Not a live problem today — there's only one app, no cross-service trace propagation exists yet — but a real, documented constraint to revisit the moment a second service joins that topology. Likely resolution then: a shared/gateway Collector tier positioned specifically for trace-complete sampling decisions, or moving health-check-style filtering to a different mechanism at that point. Recorded here so it isn't rediscovered the hard way.
- Traces take longer to reach Tempo/Sentry/spanmetrics than before — `decision_wait: 5s` (buffered, not near-real-time like the previous `batch` timeout). Observed in practice to need closer to 10-15s end-to-end (decision + export + backend indexing) before a trace reliably becomes queryable in Grafana.
- `spanmetrics` (still positioned after `tail_sampling` in the traces pipeline, same relative order as before — ADR-00018's ordering constraint) now derives RED metrics only from traces that survive sampling, meaning health-check traffic is excluded from RED metrics too, not just from Tempo/Sentry. Deliberate, not an oversight — synthetic health-check pings shouldn't pollute real request/error/duration statistics either.
- `tail_sampling` is beta-stability for traces (confirmed directly against the built binary's own component listing) — accepted on the same basis ADR-00018 already accepted alpha/beta stability elsewhere in this pipeline (`redactionprocessor`, `sentryexporter`): mitigated by this same hard end-to-end testing requirement, not by avoiding beta components outright.
- Whether anything in this codebase actually populates `http.route`/`http.target` as a **log** attribute (for `filterprocessor`'s `log_conditions` to have anything real to match against) was not investigated in this pass — a related, lower-priority open question, not resolved here.
- `test/verify.sh` now sends the health-check test trace with `--child-spans 1` (a genuine multi-span trace, not the single-span shape that let the original bug through undetected) and asserts on `http.target` instead of `http.route`.

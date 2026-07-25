# ADR-00007: Testing & QA Strategy

Status: Accepted
Date: 2026-07-25

## Context

ADR-00006 decided that feature *behavior* documentation should be backed by automated acceptance tests rather than prose, specifically to avoid the same drift problem as everything else in that ADR. This ADR is where that principle becomes an actual testing strategy, alongside the more general question of what QA looks like in this repo.

ADR-00000 wants production-grade quality without excess ceremony at solo-dev scale — the testing strategy needs to hold up as the team grows without being overbuilt on day one, when there's no code to test yet.

## Options Considered

1. **Manual QA only, no automated tests** — fastest to start with, but drifts immediately, provides no CI gate, and directly contradicts both ADR-00006's automation-over-prose preference and ADR-00000's production-readiness goal.
2. **Full layered pyramid enforced from day one** (unit, integration, e2e, contract tests, with high coverage targets) — most rigorous, but real ceremony that doesn't fit "minimal cognitive overhead to get started" at the solo-dev end of ADR-00000's range, and there's no real code yet to justify the full apparatus.
3. **Pragmatic layered pyramid, scoped to what each layer is actually good at, with feature acceptance criteria expressed as tests** — the approach below.

## Decision

**(3).** Concretely:

### Testing pyramid, scoped by layer

- **Unit tests** — `packages/domain`, business logic with no I/O. Fast, the majority of tests should live here.
- **Integration tests** — `packages/db`, against a real (or realistic test) database — verifying the actual data layer, not a mock of it.
- **End-to-end tests** — through `apps/web`, split into two tiers by design: a small, critical-path suite (the highest-stakes flows — e.g. signup, auth, checkout) that runs on every CI run and blocks merge, and a fuller, broader e2e suite that exists but runs on demand rather than by default, specifically so CI build speed isn't held hostage to the slowest, most brittle test layer. The full suite should still be easy to trigger (manually, or on a schedule) — "not by default" is not "neglected."
- **Contract tests** — against the documented API surface, once/if one exists per ADR-00003's trigger (a real second client). Not relevant before that.

Specific frameworks (test runner, e2e tool) aren't chosen yet — this is scoped by layer and purpose, tool selection happens as part of scaffolding.

### Feature acceptance criteria are tests, not a separate document

Per ADR-00006: a feature's "behaves this way" documentation and its QA verification are the same artifact — acceptance tests written in a readable, behavior-first style (e.g. Given/When/Then-shaped test titles), not a separately-maintained prose description that a test suite happens to also exist alongside. A feature isn't done until both its short value statement (ADR-00006) and its acceptance tests exist.

### Regression discipline

A bug fix includes a regression test as a matter of course — the test is the record that the bug existed and stays fixed, not a changelog entry or a comment.

### Extensive, comprehensive testing is required — without a numeric gate

This project has a strong, explicit commitment to automated testing: meaningful code — business logic especially, but not only — is expected to be thoroughly tested, covering main paths *and* edge/error cases, not just enough to satisfy a metric. This is a real requirement, not an aspiration to be traded off under time pressure.

Deliberately not expressed as a numeric coverage percentage gate: coverage percentage measures how much code ran during tests, not whether that code's behavior was actually verified, so it's an imperfect proxy for the thing we actually care about. The bar here is whether behavior is genuinely verified, which is a judgment call made in review — coverage tooling can inform that judgment (e.g. flagging untested files worth a second look), but isn't a substitute for it. Worth stating explicitly so a coverage-percentage gate doesn't quietly become the de facto standard in its place without someone deciding to make that tradeoff deliberately.

### Considered and deferred

- **Mutation testing** (e.g. Stryker) — a stronger, harder-to-game signal than line coverage (it checks whether tests actually catch deliberately-introduced bugs, not just whether they execute code). Not adopted at this time. Revisit if there's reason to believe the suite is executing code without genuinely verifying it.
- **Accessibility testing** (e.g. axe-core integration against `packages/ui`/Storybook) — named as a future goal, not adopted now.

### CI gating, and reuse of existing tooling

What blocks a merge (lint, typecheck, unit/integration tests at minimum; e2e likely scoped to critical paths given cost/flakiness) is left for the scaffolding stage to define concretely. Test execution should run through Nx's task graph and affected-project detection (ADR-00005), so CI runs tests for what actually changed rather than the whole repo by default.

## Consequences

- No test framework or e2e tool is chosen by this ADR — that's scaffolding work, informed by the layer/purpose scoping above.
- Contract testing has no immediate applicability until a documented API surface exists.
- Every feature now has two paired obligations (value doc + acceptance tests) rather than one — worth reflecting as an explicit `AGENTS.md` convention so it isn't treated as optional.
- Not using a coverage-percentage target means code review carries real, ongoing responsibility for judging whether meaningful behavior is actually tested, rather than deferring to a number — accepted because it keeps the focus on what tests verify rather than how much code they merely touch.
- The on-demand full e2e suite only provides value if it's actually run regularly (manually or scheduled) — this needs a concrete trigger mechanism defined at scaffolding time, or it risks becoming neglected precisely because it isn't in the default path.

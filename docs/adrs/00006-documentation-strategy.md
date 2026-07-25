# ADR-00006: Documentation Strategy

Status: Accepted
Date: 2026-07-25

## Context

ADR-00000 names documented decisions (not tribal knowledge) and AI-tooling effectiveness as explicit goals. So far this repo has ADRs (`docs/adrs/`, the decision log — *why*) and `AGENTS.md` (agent operational instructions — *how*, for agents specifically). Neither of those is enough on its own: as real code and features arrive, we need a *current-state* view of the system (not just a chronological decision log), documentation for human developers that isn't just a copy of agent instructions, and a way to document feature-level behavior and value without that documentation silently going stale.

Two problems recur across all of these:

1. **Drift.** A hand-written description of "how the system is structured" or "how a feature behaves" goes stale the moment the underlying code changes and nobody remembers to update the doc. This is the same category of problem as the cross-package dependency-version drift addressed in ADR-00004 — two things meant to represent the same truth, kept in sync by human diligence instead of by the tool.
2. **Audience conflation.** Agent-facing and human-facing documentation have real, different needs (terse/scannable/behavioral-guardrail-focused vs. narrative/onboarding/process-focused), but they also share a lot of raw facts (build/test commands, repo layout, conventions). Writing those facts twice, once per audience, reintroduces the drift problem between the two copies.

## Options Considered

1. **Ad-hoc, unstructured docs** — whatever gets written wherever, no convention. Rejected: this is the status quo failure mode ADR-00000 already names as a risk (undocumented decisions, inconsistent patterns).
2. **Fully centralized docs** (one `docs/` folder holding everything, disconnected from the code it describes) — easy to browse, but far from the code it documents, so it goes stale faster and doesn't scale with the monorepo's `apps/*`/`packages/*` structure.
3. **Fully generated, nothing hand-written** — not achievable; *why* something exists and *what value* a feature provides require human judgment no generator can produce.
4. **Hybrid: generate what can be generated, hand-write only what requires judgment, single canonical source per fact, co-locate what's naturally co-located** — the approach below.

## Decision

**(4).** Concretely:

### Documentation is first-class, not a follow-up

Documentation updates land in the same commit as the code they describe — the same principle `AGENTS.md` already applies to code and tests, extended to docs.

### Prefer generated documentation wherever a generator exists

Hand-written prose that duplicates something derivable from code is treated as a liability, not a convenience:

- **API documentation** — generated (OpenAPI from Zod schemas, or framework decorators), not hand-written, once a real documented API surface exists (per ADR-00003's trigger).
- **Architecture/dependency diagrams** — the structural part of `docs/architecture.md` (what depends on what) is generated from Nx's real project graph (ADR-00005), not hand-drawn. Only the narrative/rationale parts of that doc are hand-written.
- **Code reference docs** — TypeDoc from TSDoc comments, scoped to `packages/*`'s public exports (the actual contracts other apps rely on) rather than every internal function, to avoid documentation toil that goes stale in effort rather than content.
- **Component docs** — Storybook for `packages/ui`, generated from real component code and stories.
- **Database schema docs** — generated from the ORM's schema files once one is chosen.

None of these are set up yet — this records the preference, to be acted on as each becomes real.

### Structure

- `docs/adrs/` — decision log, *why*, historical, append-only (existing).
- `docs/architecture.md` — current-state overview, a living doc that gets edited in place (not created yet — nothing to diagram until apps/packages exist).
- `CONTRIBUTING.md` — human PR/process norms (not created yet).
- `README.md` / `AGENTS.md` (root) — existing, stay as the human/agent entry points respectively.
- `apps/*/README.md` + `AGENTS.md`, `packages/*/README.md` + `AGENTS.md` — nested per-app/package once real, extending the nesting convention already established for `AGENTS.md` alone (ADR-00004) to include a human-facing counterpart.

### Canonical source for facts shared between agent and human docs

Where agents and humans need the *same fact* (build/test/run commands, layout, conventions), it's written once and the other file points to it, rather than both restating it — the same principle already used between the ADR log and `AGENTS.md` (ADR-00002), applied one level down. Concretely: a package/app's `README.md` is canonical for "how do I build/run/test this" (humans need it spelled out with setup context regardless); its `AGENTS.md` links to that instead of repeating it, and only adds agent-specific material — behavioral guardrails or context-budget-motivated notes — that would be out of place in a human doc.

### Feature-level documentation: split "value" from "behavior"

- **"Provides this value"** — why the feature exists, what problem it solves. Short, hand-written prose. This doesn't really drift, because it's a statement of intent, not a factual claim about current behavior.
- **"Behaves this way"** — this is exactly the drift-prone case, so it should be backed by automated acceptance tests rather than prose description wherever practical (see ADR-00007). If the description is wrong, the test fails — it cannot silently go stale the way prose can.
- Where these live is an open question, deliberately deferred until `packages/domain`'s internal structure exists: likely co-located with the relevant domain code rather than a disconnected central `docs/features/` folder, possibly with a thin index for discoverability. Revisit once there's real domain code to co-locate it with.

### Versioning and changelogs: explicitly deferred

Considered and set aside for now, not overlooked:

- **No package is published externally, nothing is deployed to production, and there is currently no audience for a changelog or a version number.** Per `packages/*` already being internal-only and unversioned (`workspace:*`, ADR-00004), and `apps/*` being continuously-deployed applications rather than versioned artifacts, this isn't a live need.
- **The existing commit message convention is retained as-is** (classic 50/72 style, `.gitmessage`) — not replaced with Conventional Commits.
- If/when a real trigger appears (a package is published externally, or a real release/deploy concept needs tracking), the recommended mechanism is **Changesets**: per-PR changeset files decoupled from commit message format (so the existing convention doesn't need to change), natively monorepo-aware, and supporting independent (not lockstep) per-package versioning, which is the more accurate default for a monorepo with a mix of internal and potentially-published packages.

## Consequences

- Generator tooling (TypeDoc, Storybook, Nx graph invocation, OpenAPI generation) still needs to be selected and wired up as part of future scaffolding — this ADR records the preference, not the setup.
- Feature-doc location remains an open judgment call until `packages/domain` has real internal structure.
- "Docs land in the same commit as the code" is a discipline that has to actually be followed; worth a lint/CI check where cheaply enforceable later (e.g., requiring TSDoc on public package exports), not implemented yet.
- No changelog/versioning tooling is adopted now. This ADR is also the record of that deferral, so it isn't silently re-litigated — the trigger for revisiting is concrete (first externally-published package, or a real release/deploy concept).

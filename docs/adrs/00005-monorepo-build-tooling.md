# ADR-00005: Monorepo Build Tooling

Status: Accepted
Date: 2026-07-24

## Context

ADR-00001 flagged the specific tool (Turborepo, Nx, or plain workspaces) as a separate decision. ADR-00004 now gives us a concrete shape to decide it against: multiple TypeScript apps (`web`, `worker`, `admin`, later `mobile`) and multiple shared packages, with real rules we want enforced — packages hold logic, apps stay thin; a future service must not be reached into via a shared package; singleton libraries must not end up duplicated.

Workspace protocol (pnpm/Yarn/npm workspaces) is the substrate that lets packages reference each other and share one lockfile, but it doesn't do task orchestration (build ordering, caching) or enforce anything on its own.

## Options Considered

1. **pnpm workspaces alone, no task orchestrator** — simplest possible setup, but no caching (everything rebuilds every time) and no dependency-graph-aware task ordering as the number of packages grows. Doesn't scale past a handful of packages without becoming slow.
2. **Turborepo** — minimal config (`turbo.json` defining task relationships), hash-based local + remote caching, very low learning curve, TypeScript/JavaScript only. No code generation, no enforced module boundaries — it orders and caches tasks, nothing more. Best fit for small-to-medium package counts (roughly under ~20).
3. **Nx** — same caching/task-graph foundation as Turborepo, plus: code generators (scaffold a new app/package with consistent structure — directly serves ADR-00000's "encode good decisions once" goal), and enforceable module-boundary rules via tags (e.g. "`packages/domain` may not import from `apps/*`," or "nothing may reach into a service's data except through its client package" — a lint-enforced version of ADR-00004's service-boundary principle, not just convention). Also has first-class plugin support for React Native/Expo, relevant once `apps/mobile` is built — React Native's build step (Metro, native modules, platform-specific test runners) has enough special-casing that Nx's more opinionated plugin model meaningfully reduces setup pain there compared to Turborepo's "bring your own scripts" approach. Steeper learning curve and more config investment than Turborepo.
4. **Moonrepo / Bazel / Buck2 / Pants** (polyglot-capable or hermetic build systems) — ruled out for now. ADR-00004 explicitly defers any actual polyglot component to a real future need, and ADR-00000 names Bazel-style systems as something to evaluate on merit, not assume necessary, at this project's target scale. Revisit only if a genuine polyglot service (per ADR-00004) actually lands and needs to be integrated into a unified build/dependency graph — a single such service behind an API boundary, with its own independent toolchain, doesn't need this either.

## Decision

**pnpm workspaces + Nx.**

pnpm for the package-manager/workspace substrate (workspace protocol for internal packages, catalogs for shared external dependency versions — see ADR-00004's dependency-management section). Nx on top of it for task orchestration, chosen over Turborepo specifically because:

- Module-boundary enforcement turns ADR-00004's service-boundary and packages-hold-logic principles into something the build fails on, not just something documented and hoped for.
- Code generation supports ADR-00000's goal of encoding conventions once, rather than each new app/package starting from a slightly different hand-rolled setup.
- Its React Native/Expo plugin materially reduces the setup cost for `apps/mobile` when that's built.

## Consequences

- More upfront config investment and a steeper learning curve than Turborepo — a real cost at the solo-dev end of ADR-00000's target range, accepted because the boundary-enforcement and codegen benefits matter more here than raw simplicity.
- If Nx's complexity genuinely outweighs its value in practice (e.g. it's mostly getting in the way at small scale and the boundary rules aren't earning their keep), this is worth revisiting — nothing here is a one-way door.
- A future polyglot service (per ADR-00004) is not expected to join Nx's task graph at all; it brings its own toolchain and coexists in the repo, with its own independent CI job.

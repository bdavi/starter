# ADR-0001: Monorepo vs Polyrepo

Status: Accepted
Date: 2026-07-23

## Context

This is a SaaS starter template meant to be reused as the seed for future projects, and to double as a sandbox for experimenting with different patterns/technologies. It should be structured so it can scale from a solo project to an enterprise-load, larger-team setup. We expect it to eventually include multiple services (e.g. API backend, frontend, background workers, possibly separate services per domain).

The question: do we keep all code in one repository (monorepo) or split it across multiple repositories (polyrepo), one per service/app?

## Options Considered

1. **Monorepo** (all apps/services/packages in one repo, e.g. `apps/web`, `apps/api`, `packages/ui`, `packages/config`)
   - Pros: atomic cross-service commits/PRs, easy code sharing (types, UI components, config) without publishing packages, single CI config to reason about, easier for a small team to see the whole system, simpler local dev (one clone, one install)
   - Cons: needs tooling investment (Turborepo, Nx, pnpm workspaces, Bazel, etc.) to keep builds/CI fast as it grows; repo-wide permissions are coarser (harder to restrict who can touch what); can encourage tighter coupling if not disciplined; large repo history/checkout over time

2. **Polyrepo** (one repo per service/app)
   - Pros: clear ownership boundaries per team/service, independent versioning and release cadence, smaller/faster individual CI runs, finer-grained access control
   - Cons: sharing code means publishing/versioning internal packages (more process overhead), cross-service changes require coordinated PRs across repos, harder to get a "whole system" view, more repo/CI boilerplate to duplicate and maintain

3. **Hybrid** (monorepo per logical domain/team, polyrepo across domains)
   - Pros: middle ground — shared code within a domain stays easy, teams still get isolation from each other
   - Cons: adds a "which repo does this go in" decision; only pays off once you actually have multiple teams/domains

## Decision

Monorepo, backed by workspace tooling (exact tool — Turborepo, Nx, or plain pnpm workspaces — is a separate ADR).

Key reasons:
- Easier to share context and types across frontend/backend/packages as the number of services grows.
- Enables true end-to-end testing across services from a single checkout/CI run.
- **AI-tooling effectiveness is an explicit design goal for this project.** Coding agents (Claude Code and similar) work significantly better with full repo context available in one place — one dependency graph, one place to search, no guessing at cross-repo contracts or juggling multiple checkouts. This is a first-class reason for the decision, not just a side benefit.

## Consequences

- We accept upfront investment in build/CI tooling (caching, affected-project detection, task orchestration) to keep the repo fast as it grows — this becomes its own ADR (build/task tooling).
- Multi-team ownership boundaries will need to be enforced through convention + CODEOWNERS + possibly path-based CI permissions, rather than repo-level access control. Worth revisiting if/when the team grows large enough that this becomes painful — at that point, splitting a package into its own repo remains an option (see "Hybrid" above).
- We'll need a clear top-level layout convention (e.g. `apps/*` for deployable services, `packages/*` for shared libraries) decided early so it doesn't get messy as things are added.
- Local dev setup should stay a single clone + single install where possible, which reinforces the "one repo, one context" benefit for both humans and AI tooling.

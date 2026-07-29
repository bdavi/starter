# ADR-00019: Non-TypeScript Service Pattern — Repo Structure, CI/CD, and Registry

Status: Accepted
Date: 2026-07-28

## Context

`services/otel-collector` (ADR-00018) is the first genuinely non-TypeScript component in this repo — a Go binary, built via the OpenTelemetry Collector Builder, not participating in the Nx/pnpm workspace at all. This isn't unanticipated: ADR-00004 named a "polyglot-service principle" specifically for this situation, and ADR-00005 stated outright that "a future polyglot service is not expected to join Nx's task graph at all; it brings its own toolchain and coexists in the repo, with its own independent CI job." Neither ADR had a concrete instantiation until now.

One precision worth recording: ADR-00004's specific definition of "service" is about _data ownership_ — something becomes a service, as opposed to a thin app sharing `packages/db`, specifically when it owns its own data and everything else reaches it through an API. The Collector doesn't own business data; it's operational/infrastructure tooling, closer in kind to Postgres (which lives in `docker-compose.yml`, not as an `apps/*` entry) than to ADR-00004's hypothetical data-owning Python/Go service. "Service" is used here in the looser sense — an independently-built, independently-deployed unit — not ADR-00004's precise one. This doesn't change the structural conclusion, just worth being honest about the terminology.

This ADR is written to be reusable: the pattern it establishes should apply to any future non-TypeScript component, not just this one.

## Options Considered

### Location and naming

1. **Flat top-level directory** (`otel-collector/`) — simplest, no speculative structure for a single member.
2. **A new top-level `services/` category** (`services/otel-collector/`) — echoes ADR-00004's own "polyglot-service" language directly, and anticipates that this won't stay the only non-TypeScript component indefinitely. **Chosen.**

### CI trigger mechanism

1. **Fold into the existing `nx affected`-based CI** — rejected outright: this directory has zero dependency edges to or from the rest of the repo (separate Go toolchain, no shared imports either direction), so there's no graph for Nx to reason about here.
2. **Native GitHub Actions path filtering** (`paths: ['services/otel-collector/**']` on a dedicated workflow) — **chosen**. This is the correct tool specifically because there's no real dependency graph to be graph-aware about, unlike the TypeScript side where `nx affected` earns its keep by reasoning about genuine cross-package dependencies.

### CI caching

1. **No caching** — rejected, defeats "only do this when there are changes" in spirit even if the trigger itself is already scoped.
2. **`actions/setup-go`'s built-in Go module/build cache**, plus **`docker/build-push-action` with `cache-from/to: type=gha, mode=max`** for the Docker layer cache — **chosen**. Unlike the earlier, failed attempt to self-manage an `actions/cache`-based cache for Nx (reverted; Nx's db-cache scopes trust to a machine ID that changes on every ephemeral runner), neither Go's nor Docker's caching mechanisms have that per-machine trust gate — a self-managed cache genuinely works here. `mode=max` specifically matters: without it, only the final image's layers are cached, so the expensive Go compile stage reruns every time regardless.

### Registry

1. **Docker Hub** — rejected: needs a separate account and access-token secret, and has a well-known anonymous-pull rate limit (200 pulls/6 hours) that would become a real operational papercut.
2. **A cloud-provider registry** (ECR, Artifact Registry, ACR) — rejected as premature: no production hosting decision exists yet to tie a specific cloud provider's registry to.
3. **GitHub Container Registry (`ghcr.io`)** — **chosen**. Authenticates automatically via `GITHUB_TOKEN` (needs `packages: write` granted explicitly, since it defaults to read-only) — no new account or secret. No pull rate limits. Package made public specifically to avoid local-auth friction for the pull-vs-build flow below.

### Tagging strategy

`git rev-parse HEAD:services/otel-collector` — a deterministic hash of that subtree's exact content at a given commit, changing automatically and only when something under that path actually changes — plus a floating `:main` convenience tag. Chosen over inventing an ad hoc versioning scheme, reusing a real git primitive instead, consistent with how this repo already prefers real tools over bespoke mechanisms (e.g. churn-vs-complexity hotspot detection using actual git history rather than a new dependency).

### Local development: pull vs. build

1. **Rely on Docker Compose's own `pull_policy`+`build` interaction** — investigated and rejected. Compose's spec describes a pull-then-build-fallback default, but there are multiple open, real Compose issues describing inconsistent behavior in exactly this interaction (`pull_policy: build` pulling anyway before building; `pull_policy: always` silently ignoring a local build). Not a solid foundation to build "does this actually work" on.
2. **An explicit wrapper script**, using the same tree-hash from the tagging strategy above — **chosen**. Uncommitted changes under `services/otel-collector/` force a local build unconditionally (no pushed image could reflect uncommitted work); otherwise, compute the current tree-hash and attempt to pull that exact tag, falling back to a local build if it doesn't exist (this exact commit hasn't been built by CI yet). Either path tags its result to one stable local name, which `docker-compose.yml` references with `pull_policy: never` — deliberately preventing Compose from applying any of its own pull/build logic, since the script already resolved that decision.

### Local Go tooling

Pinned in a **nested `services/otel-collector/.tool-versions`**, not the root file — both asdf (nearest-file-wins when resolving up the directory tree) and mise (cascading configuration) handle this correctly: contributors who never cd into this directory never need Go installed, and those who do get it pinned automatically.

## Decision

Combining the above: `services/` as a new top-level category; path-filtered dedicated CI workflow with Go and Docker layer caching; GHCR as the registry, public, tagged by content tree-hash; an explicit tree-hash-based script (not Compose's native logic) deciding pull-vs-build locally; Go tooling pinned in a nested, directory-scoped `.tool-versions`.

## Consequences

- This is now the template for any future non-TypeScript component in this repo, not a Collector-specific pattern — the next one should reuse this ADR's mechanisms rather than re-deriving them.
- Renovate's dependency-currency coverage doesn't extend to this directory's Go-module-based manifest (ADR-00018) — a known gap shared with that ADR, not solved here.
- Root `AGENTS.md`'s Layout section needs a `services/*` entry alongside the existing `apps/*`/`packages/*` bullets, not a one-off mention of this specific service.
- If branch protection is ever configured to require this workflow's check (currently deferred, per existing project context), a PR that doesn't touch `services/otel-collector/` will show the check as pending rather than passing, since path-filtered workflows that never trigger show no status at all — worth remembering when that day comes, not a problem today.

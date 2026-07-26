# ADR-00008: Local Development Environment

Status: Accepted
Date: 2026-07-25

## Context

ADR-00003/00004/00005 committed to TypeScript, a pnpm+Nx monorepo, and multiple apps (`web`, `worker`, `admin`, later `mobile`). Running this locally requires backing services (at minimum a database; likely a cache and, per ADR-00004's queue guidance, eventually a message broker) alongside the apps themselves. ADR-00000 wants this to work with minimal onboarding friction from solo-dev up through a larger team, and ADR-00004 established that future services may not be TypeScript at all — the local environment strategy shouldn't assume everything is a Node process.

## Options Considered

1. **Docker Compose for everything** (apps and backing services both containerized) — most uniform, closest to a containerized production environment, but containerizing the Node apps costs real day-to-day DX: slower HMR/file-watching through bind mounts (particularly painful on macOS), slower cold starts, and more awkward IDE debugging through a container boundary.
2. **Docker Compose for backing services only; apps run natively via Nx** — keeps fast native HMR and normal IDE debugging for the apps, while still getting consistent, pinned service versions and easy onboarding for Postgres/Redis/etc. Language-agnostic for backing services, which fits ADR-00004's polyglot-service principle regardless of what language a future service is written in.
3. **No containers — natively installed services** — simplest for a single developer, but real version-drift risk across contributors' machines and messy reset/teardown; this is the option that ages worst as the team grows, directly against ADR-00000's stated aim of minimizing onboarding friction at scale.
4. **Cloud-hosted dev services** (e.g. Neon for Postgres, Upstash for Redis) in place of local containers — zero local install, and Neon's per-branch DB isolation is a genuine capability Compose doesn't offer for free, but it requires network connectivity to develop at all and adds a third-party dependency to the most basic local dev loop, working against this repo's otherwise self-contained, offline-capable posture.

## Decision

**(2).** Concretely:

- A `docker-compose.yml` at the repo root defines backing services (Postgres, Redis, and whatever else is added later — e.g. a mail catcher for local email testing, an object-storage emulator, a future message broker). New services join this file regardless of what language eventually consumes them.
- The apps (`apps/web`, `apps/worker`, `apps/admin`, later `apps/mobile`'s backend needs) run natively via Nx (`nx run-many -t dev`, or a scoped subset), not inside Compose. They connect to backing services via `localhost` and the ports Compose maps to the host — not Docker-internal service names — since the apps aren't part of Compose's network.
- No specific container runtime is mandated. All setup instructions, scripts, and docs target the standard `docker`/`docker compose` CLI only. Each developer chooses their own underlying runtime — same philosophy as `.tool-versions` leaving the choice of version manager to the developer.
- A single root `pnpm dev` script should wire up both halves — an idempotent `docker compose up -d` followed by `nx run-many -t dev` — so a new contributor runs one command rather than remembering two, per the reusable-script convention already in `AGENTS.md`. Backing services are long-lived (started once, left running across sessions); the app processes are ephemeral (started and stopped with each dev session).
- A documented reset script (e.g. `scripts/db-reset.sh`) handles tearing down and recreating backing-service state (`docker compose down -v` plus re-running migrations/seed data), rather than leaving that as tribal knowledge.

### Local language/tool versions

Already scaffolded ([`.tool-versions`](../../.tool-versions)): Node and pnpm versions are pinned in the portable format shared by asdf and mise, with no specific tool mandated — a developer picks whichever they prefer. Once `package.json` exists (at scaffolding time), pnpm's own version should additionally be pinned via Corepack's `packageManager` field, which is complementary to `.tool-versions`, not a replacement for it.

## Consequences

- Every contributor needs _some_ container runtime installed, of their own choosing — a real, if minor, environment requirement.
- Docker Compose here is a local-dev convenience, not a description of the production deployment — it shouldn't be assumed to double as deploy tooling without a deliberate future decision (a hosting/infra ADR).
- The Compose file will need updating as new backing services are added over time (e.g. the eventual message broker) — expected maintenance, not a one-time task.
- Setup docs and scripts must stick to plain `docker`/`docker compose` commands rather than assuming a specific runtime's quirks or tooling, so the choice of runtime stays genuinely free.
- None of this is built yet — no `docker-compose.yml`, combined dev script, or reset script exists. This ADR records the decision; the files land as part of scaffolding, consistent with `AGENTS.md`'s current "nothing scaffolded yet" status.

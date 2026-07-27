# ADR-00011: Database Technology

Status: Accepted
Date: 2026-07-27

## Context

ADR-00004 named `packages/db` as "single source of truth for the database: ORM client, schema, migrations" but didn't choose an engine or ORM — that was deferred until something actually needed a database. Authentication (ADR-00012) is that something: session/user/account storage needs a real, durable store. ADR-00008 had already used Postgres as its example backing service when deciding the local dev environment shape, but that was illustrative, not a considered decision — this ADR is the first place the database engine and ORM are actually chosen, with alternatives weighed.

## Options Considered

**Engine:**

1. **PostgreSQL** — richest feature set of the open-source relational options (JSONB, full-text search, extensions like `pgvector` — relevant given ADR-00004 names possible future AI/ML integration), the best-supported engine across both TypeScript ORMs under consideration, and works with effectively every hosting path (self-hosted, Neon, Supabase, RDS, ...) regardless of the still-undecided hosting ADR. Chosen.
2. **MySQL** — also a reasonable relational choice, slightly narrower feature set (no equivalent to `pgvector`/JSONB's maturity), no specific advantage over Postgres for this project. Rejected for lack of a compelling reason over Postgres.
3. **SQLite** — excellent for embedded/simple use cases, but the wrong fit for a multi-tenant SaaS with concurrent production writes; tools like Turso exist to stretch it further, but that's compensating for a mismatch rather than a natural fit. Rejected.
4. **MongoDB** — document model doesn't fit this domain well: auth, billing, and multi-tenant relationships are inherently relational (foreign keys, joins, referential integrity actually matter here). The TypeScript ORM ecosystem around Postgres is also considerably more mature. Rejected.

**ORM (Postgres-compatible options):**

1. **Drizzle** — schema defined directly in TypeScript, no separate client-generation step. Chosen specifically to avoid a codegen-drift failure class already hit once in this repo with `next-env.d.ts` (a generated file whose staleness silently passed type-checking) — if the schema changes and you forget a manual step, Drizzle has no separate step to forget. Smaller runtime, closer to raw SQL.
2. **Prisma** — most widely adopted TypeScript ORM, schema-first with a separate `prisma generate` codegen step, mature tooling (Prisma Studio). Prisma 7 (Nov 2025) substantially shrank its runtime and improved edge support, closing most of the gap that used to favor Drizzle on performance grounds. Rejected specifically for the codegen-drift risk, not for capability — a legitimate choice a team with different priorities could reasonably make instead.

## Decision

Postgres + Drizzle. `packages/db` owns the Drizzle client, schema, and migrations (`drizzle-kit`) — every app/package that touches data imports this rather than maintaining its own connection or schema, per ADR-00004. `packages/config` (ADR-00012 also introduces this) owns `DATABASE_URL` validation; `packages/db` never reads `process.env` directly.

## Consequences

- **A real, hard-won gotcha worth recording so it isn't rediscovered**: Nx's library generator defaults new packages to `"module": "nodenext"` / `"moduleResolution": "nodenext"` in their `tsconfig.lib.json`/`tsconfig.spec.json` (distinct from the root `tsconfig.base.json`'s `"moduleResolution": "bundler"`), which requires explicit `.js` extensions on relative imports (`./lib/config.js` referring to `config.ts`). That's correct for a package meant to run standalone under Node's own ESM loader, but Next.js's bundler (confirmed identically broken under both Turbopack and webpack) does not resolve that convention when consuming workspace packages as raw source via `transpilePackages` — it fails with `Module not found`. Fixed by removing the `nodenext` overrides from `packages/db`/`packages/config`/`packages/auth`'s tsconfig files (inheriting the root's `bundler` mode) and dropping the `.js` extensions from their internal relative imports. Verified this doesn't break the CLI tools that execute these files directly (`drizzle-kit generate`/`migrate`, `better-auth generate`) — they resolve extensionless imports fine.
- Postgres 18's official Docker image changed its expected volume mount path (a single mount at `/var/lib/postgresql`, not `/var/lib/postgresql/data`) — documented in `docker-compose.yml` directly, since it silently crash-loops otherwise.
- Every CLI tool that touches the database (`drizzle-kit`, `better-auth generate`) needs real env vars in the shell it runs in — there's no framework auto-loading `.env` for standalone CLI invocations the way Next.js does for the app itself.
- Choosing Drizzle is a bet that avoiding codegen-drift is worth more than Prisma's more mature standalone tooling (Prisma Studio, etc.) — revisit if that tradeoff stops holding, e.g. if Drizzle's own tooling gap turns out to cost more than the risk it avoids.

# AGENTS.md — packages/db

See [README.md](./README.md) for what this package is and its commands — not repeated here.

## Agent-specific notes

- `src/lib/schema.ts` is generated output (from `pnpm nx run auth:auth-schema`, currently the only schema source) — treat the `user`/`session`/`account`/`verification` tables as generated, not hand-authored. Real domain tables (once `packages/domain` exists) get added here by hand, alongside the generated ones, not in a separate file — this package is the single schema source of truth per ADR-00004.
- Postgres 18+'s official Docker image expects its data volume mounted at `/var/lib/postgresql` (not `/var/lib/postgresql/data`) — see the comment in the root `docker-compose.yml`. Don't "fix" that path back to the old convention; it crash-loops.
- `moduleResolution` is deliberately `bundler` (inherited from root), not Nx's generator default of `nodenext` — same reasoning as `packages/config`'s AGENTS.md. Internal imports have no `.js` extension.
- `drizzle.config.ts` and the CLI tools that read it (`drizzle-kit generate`/`migrate`) need `DATABASE_URL` present in the actual shell environment — nothing auto-loads `.env` for standalone CLI invocations outside the Next.js app itself.
- `DATABASE_URL` validation lives in `src/lib/env.ts` (`getDbEnv`), not in `@starter/config` directly — that package only provides the generic `createEnvGetter` factory. Don't move this var back to a shared/central schema; see [ADR-00013](../../docs/adrs/00013-environment-config-scoping.md) for why per-package env ownership matters (least-privilege/blast-radius, not just tidiness).

# ADR-00013: Environment Config Scoping

Status: Accepted
Date: 2026-07-27

## Context

`packages/config` (introduced alongside ADR-00011/00012) started as a single flat Zod schema covering every environment variable in the system — `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` — validated and returned together by one `getEnv()`. That's fine while `apps/web` is the only app and genuinely needs all three, directly or transitively. It stops being fine the moment a second app (`apps/admin`, `apps/worker`) or more secrets (a payment provider key, an email provider key, ...) show up: a flat shared schema forces a choice between provisioning every secret into every app's runtime just to satisfy one shared validator (real over-exposure — the most publicly-exposed app, `apps/web`, ends up able to read secrets it never uses), or the schema breaking for any app missing a var it doesn't need. Neither is acceptable, and the risk compounds the longer more call sites are built against the flat pattern.

Also worth being precise about upfront: Zod validation is a correctness/DX aid ("fail loudly at boot if a var is missing or malformed"), not a security boundary. Nothing about `getEnv()` prevents code from reading `process.env.ANYTHING` directly, and nothing about it controls which secrets a deployment platform actually injects into a given app's runtime. The real access-control boundary is deployment-time secret provisioning (Vercel project-scoped env vars, Kubernetes Secrets per Deployment, a secrets manager with per-service IAM policy, ...) — which depends on the still-undecided hosting choice. What this ADR _can_ fix now is the code-level shape: making an app's typed access to config follow its actual import graph, so it's ready to plug into correct per-service provisioning whenever that lands, rather than needing a rewrite then too.

## Options Considered

1. **Keep one flat, centralized schema** (status quo) — simplest today, but doesn't scale past one app and actively encourages over-provisioning secrets as more apps/vars arrive. Rejected.
2. **Per-app env files** — the common Next.js convention (e.g. `@t3-oss/env-nextjs`, popularized by the T3 Stack): each _app_ declares its own `env.ts` with exactly the vars it needs, no shared package. A reasonable default for a collection of independent apps, but doesn't fit this monorepo's actual shape, where `packages/db`/`packages/auth` — not the apps — are the reusable units with the real operational dependency on specific vars (ADR-00004: "apps are thin, packages hold the logic"). Rejected as a mismatch, not on its own merits.
3. **Per-domain-package ownership** — analogous to NestJS's `registerAs()` pattern: each package that has a genuine operational need for config owns and validates its own schema, exposed as its own typed getter. A shared helper still exists for the common "lazily validate once, cache" plumbing, but there's no central schema aggregating everything. Chosen.

## Decision

**(3).** `packages/config` shrinks to exactly one export: `createEnvGetter(schema)`, a factory that returns a lazily-validated, cached getter for whatever Zod schema it's given. It has no env vars of its own. Each package that needs specific config owns a small `src/lib/env.ts` calling this factory with its own schema:

- `packages/db/src/lib/env.ts` — `getDbEnv()`, validates `DATABASE_URL`.
- `packages/auth/src/lib/env.ts` — `getAuthEnv()`, validates `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`.

An app's typed access to config now falls directly out of its import graph: importing `packages/db` gets you `DATABASE_URL` access (via `getDbEnv`, or more commonly just the already-configured `db` client) and nothing else, unless it also imports `packages/auth`.

## Consequences

- Adding a new env var means adding it to the schema of whichever package actually needs it — not to a shared central file. `packages/config` only gains a schema of its own for something genuinely cross-cutting and not owned by any specific domain package (e.g. a future `LOG_LEVEL`).
- This is a code-level fix, not a full solution — it doesn't by itself stop a deployment from injecting every secret into every app's environment regardless of what the code imports. Real secret isolation still requires correct per-service provisioning at the hosting layer, which remains an open, deferred decision (same status as the OTel backend and message-broker choices). Don't mistake this ADR for "secrets are now properly isolated" — it's "the code is now shaped to make correct isolation possible without a later rewrite."
- Slightly more files (a small `env.ts` per package needing config) versus one central file — an acceptable, small cost for the scoping property gained.

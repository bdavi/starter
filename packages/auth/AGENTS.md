# AGENTS.md — packages/auth

See [README.md](./README.md) for what this package is and its commands — not repeated here.

## Agent-specific notes

- **Never re-export `server.ts` and `client.ts` from one barrel file.** `server.ts` imports the Drizzle DB client and reads `BETTER_AUTH_SECRET` — a combined export would ship that into the browser bundle the moment any client component imported this package. The `package.json` `exports` map only has `./server` and `./client` subpaths, no `.` entry, specifically to make the wrong import path unavailable rather than just discouraged.
- `better-auth` and a real chunk of its dependency tree (`@better-auth/*`, `@noble/hashes`, more) ship ESM-only, no CJS build. `jest.config.cts` sets `transformIgnorePatterns: []` (transform everything, ignore nothing) rather than an allowlist regex — an allowlist was tried first and abandoned after the third distinct ESM-only transitive dependency surfaced one at a time; that's an unbounded, ever-growing maintenance burden, not a real fix. Don't reintroduce an allowlist without expecting to hit the same wall again on the next dependency bump.
- `moduleResolution` is deliberately `bundler` (inherited from root), not Nx's generator default of `nodenext` — see `packages/config/AGENTS.md` for the full reasoning (Next.js's bundler can't resolve `nodenext`-style `.js`-extension imports for workspace packages consumed via `transpilePackages`).
- The `auth-schema` Nx target (`pnpm exec better-auth generate ...`) writes into `packages/db/src/lib/schema.ts`, not this package — `packages/db` stays the single schema source of truth (ADR-00004) even though this package owns the config being introspected to produce it.
- No `proxy.ts`/`middleware.ts` exists here or in `apps/web` — Next.js 16 explicitly discourages database-backed session checks in that layer (see ADR-00012). Protecting a route means calling `auth.api.getSession()` directly in that route's own Server Component, not adding a proxy rule.
- `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` validation lives in `src/lib/env.ts` (`getAuthEnv`), not in `@starter/config` directly — see [ADR-00013](../../docs/adrs/00013-environment-config-scoping.md). Don't reach for `@starter/config` expecting a system-wide `getEnv()`; it no longer exists, on purpose.

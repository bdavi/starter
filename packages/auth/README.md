# @starter/auth

Authentication via [Better Auth](https://www.better-auth.com/), on Postgres/Drizzle (`packages/db`). See [ADR-00012](../../docs/adrs/00012-authentication-architecture.md).

## Usage

Two separate subpaths — **not** one combined export, on purpose (a single barrel would leak server-only secrets/DB access into client bundles):

```ts
// Server-only: route handlers, Server Components, proxy/middleware
import { auth } from "@starter/auth/server";

// Client-safe: "use client" components
import { signIn, signUp, signOut, useSession } from "@starter/auth/client";
```

See `apps/web/src/app/api/auth/[...all]/route.ts`, `apps/web/src/app/sign-in/page.tsx`, and `apps/web/src/app/dashboard/page.tsx` for real, working usage of all three.

## Commands

```
pnpm nx run auth:auth-schema   # regenerate packages/db's auth tables from this config
pnpm nx test auth
pnpm nx lint auth
pnpm nx typecheck auth
```

## Environment

`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` are validated in `src/lib/env.ts` (via `@starter/config`'s `createEnvGetter` helper) — this package owns those vars directly, not a shared central schema. See [ADR-00013](../../docs/adrs/00013-environment-config-scoping.md).

## Status

Email/password only. `socialProviders` is empty — Google (or others) plugs into that exact config key later, once there are real OAuth client credentials to test against; no restructuring needed. Mobile (OAuth + PKCE, Better Auth's Expo plugin) isn't built — no `apps/mobile` yet. `apps/admin` isn't built either; the exported `auth` instance is already structured to be reusable by a second app when it exists.

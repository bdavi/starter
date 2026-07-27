# @starter/config

A single reusable helper — `createEnvGetter()` — for building a lazily-validated, Zod-backed environment config getter. Not an aggregator of every env var in the system: each package that has a genuine operational need for specific env vars (e.g. `packages/db`, `packages/auth`) owns and validates its own schema using this helper, rather than a shared schema handing every consumer every secret regardless of whether it's used. See [ADR-00013](../../docs/adrs/00013-environment-config-scoping.md).

## Usage

```ts
import { z } from "zod";
import { createEnvGetter } from "@starter/config";

const myEnvSchema = z.object({
  MY_VAR: z.string(),
});

export const getMyEnv = createEnvGetter(myEnvSchema);
```

`getMyEnv()` validates `process.env` against `myEnvSchema` on first call (throwing a clear error if anything's missing/invalid), then caches and returns the same validated object on every subsequent call.

## Commands

```
pnpm nx test config
pnpm nx lint config
pnpm nx typecheck config
```

## Status

No env vars of its own right now — every var that exists (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) is owned by the package that needs it (`packages/db`, `packages/auth` respectively). This package would only gain its own schema for something genuinely cross-cutting and not owned by a specific domain package (e.g. a future `LOG_LEVEL`).

# AGENTS.md — packages/config

See [README.md](./README.md) for what this package is and its commands — not repeated here.

## Agent-specific notes

- **Don't add a system-wide env schema back here.** This package was originally a flat schema covering every env var in the system, handing any consumer everything regardless of what it actually used — a real least-privilege/blast-radius gap (see [ADR-00013](../../docs/adrs/00013-environment-config-scoping.md)). It's deliberately just the generic `createEnvGetter()` factory now. A new env var almost always belongs in the schema of the specific package that needs it (`packages/db`, `packages/auth`, ...), not here — only add a var here if it's genuinely cross-cutting and not owned by any specific domain package.
- Each call to `createEnvGetter(schema)` creates its own independent cache (a closure), validated lazily on first call to the returned getter — not at import time, and not shared across separate `createEnvGetter()` calls even with the same schema. See `create-env-getter.spec.ts` for the exact caching behavior this guarantees.
- This package's `tsconfig.lib.json`/`tsconfig.spec.json` deliberately do **not** override `moduleResolution` to `nodenext` (Nx's library generator's default) — they inherit the root's `bundler` mode instead, and internal relative imports have no `.js` extension. See [ADR-00011](../../docs/adrs/00011-database-technology.md)'s Consequences section for why: Next.js's bundler (Turbopack and webpack both) can't resolve `nodenext`-style `.js`-extension imports when consuming this package as raw workspace source via `transpilePackages`. Don't reintroduce either without understanding that gotcha.

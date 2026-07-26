# web

The customer-facing product. Next.js (App Router), colocated backend — see [ADR-00003](../../docs/adrs/00003-web-app-language-and-architecture.md) for why.

## Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS v4 (`@import "tailwindcss"` in `src/app/global.css` — no `tailwind.config.js` needed)
- Jest for unit tests, Playwright for e2e (see [`apps/web-e2e`](../web-e2e/README.md))

## Commands

Run from the repo root, via Nx:

```
pnpm nx dev web         # dev server
pnpm nx build web       # production build
pnpm nx test web        # unit tests (Jest)
pnpm nx lint web        # lint
pnpm nx typecheck web   # tsc --noEmit
```

## Layout

- `src/app/` — App Router pages/layouts/routes. Files here are auto-discovered by Next.js's file-based routing — nothing imports them explicitly.
- `specs/` — Jest unit tests.

## Status

Currently a minimal placeholder ("Hello, world") — no real business logic yet. This is genuinely the starting point, not a stub left behind.

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
- `src/app/api/auth/[...all]/route.ts` — Better Auth's catch-all handler (see [`packages/auth`](../../packages/auth/README.md)).
- `src/app/sign-in/`, `src/app/dashboard/` — minimal, unstyled proof-of-wiring for authentication (ADR-00012), not real UX yet.
- `specs/` — Jest unit tests.

## Status

Mostly still a minimal placeholder ("Hello, world" at `/`) — no real business logic yet. Authentication is wired end-to-end (sign up/in/out, a session-protected route) as a real, working example, not a stub. Needs `docker compose up -d` + `pnpm run db:migrate` + a `.env` (see repo-root README) to actually run.

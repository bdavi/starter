# SaaS Starter

A reusable starting point for building SaaS products — opinionated, production-ready defaults that scale from a solo project up to a multi-team org, without over-engineering the small end.

See [ADR-0000](./docs/ards/0000-purpose-and-goals.md) for the full purpose and design goals behind this repo.

## Repo layout

This is a monorepo (see [ADR-0001](./docs/ards/0001-monorepo-vs-polyrepo.md)), using TypeScript throughout with pnpm + Nx ([ADR-0003](./docs/ards/0003-web-app-language-and-architecture.md), [ADR-0004](./docs/ards/0004-monorepo-app-and-package-structure.md), [ADR-0005](./docs/ards/0005-monorepo-build-tooling.md)):

- `apps/web` — customer-facing product (Next.js)
- `apps/worker` — background/async job processing
- `apps/admin` — internal admin tooling
- `apps/mobile` — planned (React Native / Expo), once a native app is actually needed
- `packages/*` — shared logic (data access, domain rules, validation schemas, UI components, etc.) that the apps above are thin orchestration layers around

None of this is scaffolded yet — the ADRs above record the decision, not a working setup.

## Getting started

Setup instructions land here once the monorepo is actually scaffolded (`package.json`, workspace config, first app).

## Architecture Decision Records

Significant technical decisions are logged in [`docs/ards`](./docs/ards), in the order they were made. Start with [ADR-0000](./docs/ards/0000-purpose-and-goals.md) for context, then browse the [index](./docs/ards/README.md).

## License

[MIT](./LICENSE)

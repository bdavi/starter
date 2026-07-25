# SaaS Starter

A reusable starting point for building SaaS products — opinionated, production-ready defaults that scale from a solo project up to a multi-team org, without over-engineering the small end.

See [ADR-00000](./docs/adrs/00000-purpose-and-goals.md) for the full purpose and design goals behind this repo.

## Repo layout

This is a monorepo (see [ADR-00001](./docs/adrs/00001-monorepo-vs-polyrepo.md)), using TypeScript throughout with pnpm + Nx ([ADR-00003](./docs/adrs/00003-web-app-language-and-architecture.md), [ADR-00004](./docs/adrs/00004-monorepo-app-and-package-structure.md), [ADR-00005](./docs/adrs/00005-monorepo-build-tooling.md)):

- `apps/web` — customer-facing product (Next.js)
- `apps/worker` — background/async job processing
- `apps/admin` — internal admin tooling
- `apps/mobile` — planned (React Native / Expo), once a native app is actually needed
- `packages/*` — shared logic (data access, domain rules, validation schemas, UI components, etc.) that the apps above are thin orchestration layers around

The workspace itself is scaffolded (`package.json`, `pnpm-workspace.yaml`, Nx); no apps or packages exist yet.

## Getting started

Install [Node and pnpm](./.tool-versions) (via [asdf](https://asdf-vm.com/) or [mise](https://mise.jdx.dev/), your choice), then:

```
pnpm install
```

There's nothing to run yet — no apps exist in the workspace. `pnpm nx show projects` will list them as they're added.

## Architecture Decision Records

Significant technical decisions are logged in [`docs/adrs`](./docs/adrs), in the order they were made. Start with [ADR-00000](./docs/adrs/00000-purpose-and-goals.md) for context, then browse the [index](./docs/adrs/README.md).

## License

[MIT](./LICENSE)

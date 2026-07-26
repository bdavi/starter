# SaaS Starter

A reusable starting point for building SaaS products — opinionated, production-ready defaults that scale from a solo project up to a multi-team org, without over-engineering the small end.

See [ADR-00000](./docs/adrs/00000-purpose-and-goals.md) for the full purpose and design goals behind this repo.

## Repo layout

This is a monorepo (see [ADR-00001](./docs/adrs/00001-monorepo-vs-polyrepo.md)), using TypeScript throughout with pnpm + Nx ([ADR-00003](./docs/adrs/00003-web-app-language-and-architecture.md), [ADR-00004](./docs/adrs/00004-monorepo-app-and-package-structure.md), [ADR-00005](./docs/adrs/00005-monorepo-build-tooling.md)):

- `apps/web` — customer-facing product (Next.js, App Router). Scaffolded.
- `apps/worker` — background/async job processing. Not yet scaffolded.
- `apps/admin` — internal admin tooling. Not yet scaffolded.
- `apps/mobile` — planned (React Native / Expo), once a native app is actually needed.
- `packages/*` — shared logic (data access, domain rules, validation schemas, UI components, etc.) that the apps above are thin orchestration layers around. None exist yet.

## Getting started

Install [Node and pnpm](./.tool-versions) (via [asdf](https://asdf-vm.com/) or [mise](https://mise.jdx.dev/), your choice), plus two required tools with no single install path — pick whichever fits your setup:

- [lefthook](https://github.com/evilmartians/lefthook) for git hooks (Homebrew, npm/pnpm global, a Go install, or an asdf/mise-managed tool)
- [gitleaks](https://github.com/gitleaks/gitleaks) for secret scanning (Homebrew, a downloaded binary, or Docker) — the pre-commit hook hard-fails if it isn't installed, by design (see [ADR-00009](./docs/adrs/00009-linting-formatting-and-security-scanning.md): secrets scanning always blocks)

Then, once both are installed:

```
pnpm install
lefthook install
```

Run tasks via Nx, always prefixed with `pnpm` (not a global `nx` install):

```
pnpm nx dev web      # start the dev server
pnpm nx build web     # production build
pnpm nx test web      # unit tests (Jest)
pnpm nx lint web      # lint
pnpm nx show projects # list everything in the workspace
```

## Architecture Decision Records

Significant technical decisions are logged in [`docs/adrs`](./docs/adrs), in the order they were made. Start with [ADR-00000](./docs/adrs/00000-purpose-and-goals.md) for context, then browse the [index](./docs/adrs/README.md).

## License

[MIT](./LICENSE)

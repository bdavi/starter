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

Optional: [zizmor](https://docs.zizmor.sh/installation/) (pip/pipx, Homebrew, or Cargo) gives the pre-push hook a fast local check that GitHub Actions refs stay SHA-pinned (see [ADR-00010](./docs/adrs/00010-github-actions-supply-chain-hardening.md)). Not required — if it's missing, the hook just skips that check and prints a note; CI's `zizmor` job enforces it regardless.

Then, once both required tools are installed:

```
pnpm install
lefthook install
```

Run tasks via Nx, always prefixed with `pnpm` (not a global `nx` install):

```
pnpm nx dev web           # start the dev server
pnpm nx build web         # production build
pnpm nx test web          # unit tests (Jest)
pnpm nx lint web          # lint
pnpm nx typecheck web     # tsc --noEmit
pnpm nx e2e web-e2e       # e2e tests (Playwright) — see apps/web-e2e/README.md
pnpm nx show projects     # list everything in the workspace
```

Repo-wide scripts:

```
pnpm run format        # format the whole repo with Prettier
pnpm run format:check  # check formatting without writing
pnpm run health         # repo health report — Knip, pnpm audit, osv-scanner,
                        # Gitleaks, Semgrep, Bearer, and the full e2e suite
                        # (see ADR-00009); non-blocking, for review, uses
                        # whichever of those tools are installed
```

CI (`.github/workflows/ci.yml`) runs on every push/PR: format check, lint, typecheck, unit tests, build, a critical-path e2e smoke test, and a secrets scan. A separate scheduled workflow (`repo-health.yml`, weekly + on demand) runs `pnpm run health` — the fuller, non-blocking checks, including the full e2e suite. Renovate is installed and keeps dependencies up to date automatically. See [`docs/scanning-tools.md`](./docs/scanning-tools.md) for the full current list of linting/security/CI-supply-chain tools, what each checks, and whether it blocks.

## Architecture Decision Records

Significant technical decisions are logged in [`docs/adrs`](./docs/adrs), in the order they were made. Start with [ADR-00000](./docs/adrs/00000-purpose-and-goals.md) for context, then browse the [index](./docs/adrs/README.md).

## License

[MIT](./LICENSE)

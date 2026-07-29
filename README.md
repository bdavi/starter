# SaaS Starter

A reusable starting point for building SaaS products — opinionated, production-ready defaults that scale from a solo project up to a multi-team org, without over-engineering the small end.

See [ADR-00000](./docs/adrs/00000-purpose-and-goals.md) for the full purpose and design goals behind this repo.

## Repo layout

This is a monorepo (see [ADR-00001](./docs/adrs/00001-monorepo-vs-polyrepo.md)), using TypeScript throughout with pnpm + Nx ([ADR-00003](./docs/adrs/00003-web-app-language-and-architecture.md), [ADR-00004](./docs/adrs/00004-monorepo-app-and-package-structure.md), [ADR-00005](./docs/adrs/00005-monorepo-build-tooling.md)):

- `apps/web` — customer-facing product (Next.js, App Router). Scaffolded.
- `apps/worker` — background/async job processing. Not yet scaffolded.
- `apps/admin` — internal admin tooling. Not yet scaffolded.
- `apps/mobile` — planned (React Native / Expo), once a native app is actually needed.
- `packages/config` — a reusable Zod-backed validated-env-getter helper (not an aggregator of every env var — each package that needs specific vars owns and validates its own schema with it). Scaffolded.
- `packages/db` — Postgres + Drizzle: client, schema, migrations. Scaffolded.
- `packages/auth` — authentication (Better Auth). Scaffolded.
- `packages/observability` — logging/tracing/metrics/error-reporting on OpenTelemetry, used by every app/package. Scaffolded.
- Remaining `packages/*` (domain rules, validation schemas, UI components, etc.) — planned, not yet built.
- `services/otel-collector` — a custom-built OpenTelemetry Collector every app talks to (Go, outside the pnpm/Nx workspace — see [ADR-00019](./docs/adrs/00019-non-ts-service-pattern.md)). Scaffolded.
- `docker-compose.yml` also runs a full local observability backend stack — self-hosted Loki/Tempo/Mimir/Grafana and GlitchTip (a Sentry-DSN-compatible error tracker) — so the whole pipeline works out of the box with no external accounts required for local dev ([ADR-00021](./docs/adrs/00021-local-observability-backend-stack.md)).

See [`docs/app-architecture.md`](./docs/app-architecture.md) (the TypeScript side, generated from Nx's project graph) and [`docs/system-architecture.md`](./docs/system-architecture.md) (the whole running system, including `services/*` and telemetry data flow) for the current-state picture.

## Getting started

Install [Node and pnpm](./.tool-versions) (via [asdf](https://asdf-vm.com/) or [mise](https://mise.jdx.dev/), your choice), a container runtime for Postgres ([ADR-00008](./docs/adrs/00008-local-development-environment.md) — plain `docker`/`docker compose` CLI, any underlying runtime), plus two required tools with no single install path — pick whichever fits your setup:

- [lefthook](https://github.com/evilmartians/lefthook) for git hooks (Homebrew, npm/pnpm global, a Go install, or an asdf/mise-managed tool)
- [gitleaks](https://github.com/gitleaks/gitleaks) for secret scanning (Homebrew, a downloaded binary, or Docker) — the pre-commit hook hard-fails if it isn't installed, by design (see [ADR-00009](./docs/adrs/00009-linting-formatting-and-security-scanning.md): secrets scanning always blocks)

Optional: [zizmor](https://docs.zizmor.sh/installation/) (pip/pipx, Homebrew, or Cargo) gives the pre-push hook a fast local check that GitHub Actions refs stay SHA-pinned (see [ADR-00010](./docs/adrs/00010-github-actions-supply-chain-hardening.md)). Not required — if it's missing, the hook just skips that check and prints a note; CI's `zizmor` job enforces it regardless.

Also optional: [`jq`](https://jqlang.org/) (usually already installed — Homebrew, most Linux package managers) for `pnpm run hotspots`/`pnpm run health`'s churn×complexity report. Skips gracefully with a note if it's missing.

Also required if `pnpm run otel:sync` (below) needs to build the Collector locally rather than pull a prebuilt image (the common case whenever `services/otel-collector` has local changes CI hasn't built yet): Go, pinned in `services/otel-collector/.tool-versions` — asdf/mise pick it up automatically once your shell's cwd is under that directory. See `services/otel-collector/README.md`.

Then:

```
pnpm install
lefthook install
pnpm run otel:sync         # pulls or builds the local OTel Collector image
                            # (see services/otel-collector/README.md)
cp .env.example .env       # fill in DATABASE_URL (matches the compose defaults),
                            # BETTER_AUTH_SECRET (generate: pnpm exec better-auth secret),
                            # BETTER_AUTH_URL,
                            # OTEL_REDACTION_HMAC_KEY (generate: openssl rand -hex 32),
                            # GLITCHTIP_SECRET_KEY (generate: openssl rand -hex 32) —
                            # the rest of the OTEL_*/SENTRY_* vars already have
                            # working local defaults in .env.example, see ADR-00021
docker compose up -d       # starts Postgres + the full local observability stack
                            # (OTel Collector, Loki, Tempo, Mimir, Grafana, GlitchTip)
pnpm run db:migrate         # creates the database schema
```

Grafana is at http://localhost:3001 (not 3000 — `apps/web` owns that port), with Loki/Tempo/Mimir already wired in as datasources — no manual setup. GlitchTip is at http://localhost:8000; sign up once, create an org + project, and put its DSN in `.env`'s `SENTRY_DSN` if you want to exercise `packages/observability`'s direct-SDK error path locally (ADR-00021 — the Collector-routed Sentry path isn't exercised locally, only GlitchTip-compatible paths are).

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
                        # Gitleaks, Semgrep, Bearer, churn×complexity hotspots,
                        # and the full e2e suite (see ADR-00009); non-blocking,
                        # for review, uses whichever of those tools are installed
pnpm run db:generate    # drizzle-kit generate — SQL migration from schema changes
pnpm run db:migrate     # drizzle-kit migrate — apply pending migrations
pnpm run db:reset       # drop + recreate local Postgres, re-migrate
pnpm run deps:check     # syncpack lint — cross-package dependency version drift
pnpm run hotspots       # files that are both frequently changed and complex —
                        # real refactoring priority, not just "complex" or just
                        # "busy" (needs jq; usually preinstalled, see below)
pnpm run otel:sync      # pull or build the local OTel Collector image —
                        # run before `docker compose up -d`, and again after
                        # pulling changes to services/otel-collector/
```

CI (`.github/workflows/ci.yml`) runs on every push/PR: dependency version consistency (Syncpack), format check, lint, typecheck, unit tests, build, a critical-path e2e smoke test, and a secrets scan. A separate scheduled workflow (`repo-health.yml`, weekly + on demand) runs `pnpm run health` — the fuller, non-blocking checks, including the full e2e suite. Renovate is installed and keeps dependencies up to date automatically. See [`docs/scanning-tools.md`](./docs/scanning-tools.md) for the full current list of linting/security/CI-supply-chain tools, what each checks, and whether it blocks.

For a periodic maintenance audit beyond the automated checks above — refactor candidates, documentation drift, unreviewed Renovate PRs, all synthesized into one punch list you sign off on — see [`docs/maintenance-review.md`](./docs/maintenance-review.md) (ADR-00015). Claude Code users can run it directly with `/maintenance-review`.

## Architecture Decision Records

Significant technical decisions are logged in [`docs/adrs`](./docs/adrs), in the order they were made. Start with [ADR-00000](./docs/adrs/00000-purpose-and-goals.md) for context, then browse the [index](./docs/adrs/README.md).

## License

[MIT](./LICENSE)

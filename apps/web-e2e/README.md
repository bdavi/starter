# web-e2e

Playwright end-to-end tests for [`apps/web`](../web/README.md). See [ADR-00007](../../docs/adrs/00007-testing-and-qa-strategy.md) for the testing strategy this implements.

## Commands

Run from the repo root, via Nx (automatically starts `web`'s dev server first):

```
pnpm nx e2e web-e2e                              # full suite, all browsers
pnpm nx e2e web-e2e -- --grep @critical --project=chromium   # critical path only, fast
pnpm nx typecheck web-e2e
pnpm nx lint web-e2e
```

## Two-tier design (ADR-00007)

- **`@critical`-tagged tests, chromium only** — run on every push in `ci.yml`, blocking. Keep this tag for flows that must never break (signup, auth, checkout, as they're added). Fast by design — don't add slow or flaky tests to this tier.
- **Everything else** — only runs in the full suite, all three browsers (chromium, firefox, webkit). That's part of `pnpm run health` (see root `README.md`) — on demand locally, and weekly + on-demand in CI via `repo-health.yml`.

To add a new critical-path test: tag it with `{ tag: "@critical" }` as the second argument to `test(...)`, same as the existing example.

## Status

One test exists (`src/example.spec.ts`) — a smoke test that the home page renders. Tagged `@critical` since it's currently the only signal that the app works at all.

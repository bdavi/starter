# AGENTS.md — apps/web-e2e

See [README.md](./README.md) for what this is, commands, and the critical/full tiering — not repeated here.

## Agent-specific notes

- Playwright browsers aren't installed by default in a fresh environment — run `pnpm exec playwright install --with-deps` (or `chromium` only, for the fast critical-path subset) before running tests locally for the first time. `--with-deps` needs root/sudo for system libraries; CI runners have this, a local sandboxed environment might not (install without `--with-deps` and expect chromium to work, firefox/webkit may not).
- When adding a new test, default to **not** tagging it `@critical` unless it genuinely must block every push — the whole point of the tiering is keeping the blocking suite small and fast. Ask before adding to the critical tier if it's not obviously a must-never-break flow.

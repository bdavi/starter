# Maintenance Review Log

A dated record of each [periodic maintenance review](./maintenance-review.md) — what was raised, and what happened to it. Newest entry first. This file is written to only by that procedure's final step; nothing else should append here.

## Format

Each entry:

```
## YYYY-MM-DD

**Carried over from last time:**
- Item — still open | resolved since last review

**New this review:**
- Item (group) — one-line reason it matters
```

Skip the "Carried over" section on the first-ever entry (nothing to carry over yet). Omit either section on later entries if it's empty (e.g. everything from last time got resolved).

---

## 2026-07-27

**New this review:**

- `@better-auth/cli` (devDependency) hard-pins vulnerable `better-auth@1.4.21`/`drizzle-orm@0.41.0`/stale `lodash` internally, including a critical OAuth CVE (Dependencies & Security) — dev-tool-only, not the runtime `better-auth@1.6.23`, which is fully patched; can't be fixed by a normal bump since even `@better-auth/cli`'s latest release still pins it. **Decision: wait for an upstream fix.** Still open.
- Build-tooling-only transitive vulnerability cluster (`axios`, `esbuild`, `postcss`, `sharp`, `fast-uri`, `brace-expansion`) via `@nx/devkit`/`next`/`drizzle-kit` internals (Dependencies & Security) — lower priority, likely clears on next Nx/Next minor bump. **Decision: wait for the next version.** Still open.
- 10 open Renovate PRs, 7 safe to merge as routine bumps, 3 need review before merging (TypeScript v7, ESLint v10, `actions/checkout` v7 — all major/breaking) (Dependencies & Security). **Resolved**: 7 routine bumps merged (2 stale-based rebases needed, 1 had a genuine Renovate lockfile-artifact failure fixed by regenerating); `Lock file maintenance` closed rather than manually reconstructed (Renovate will reopen it on its Monday schedule). `actions/checkout` v7 and ESLint v10 applied directly and verified (build/lint/test/typecheck all pass, lint re-verified against deliberately reintroduced violations); PRs #8/#11 closed. **TypeScript v7 stays open** — breaks Nx 23.1.0's own TypeScript plugin and `typescript-eslint`'s `ts-api-utils` outright (project graph fails to load); a real upstream gap, not a config fix, same category as the `@better-auth/cli` item above.
- `@types/node` (`^22.0.0`) vs. actual Node runtime (`26.5.0`) — a 4-major gap the open Renovate PR only partially closes (Dependencies & Security). **Decision: no change.** Still open (now `^24.0.0` after the PR #9 merge, so the gap narrowed to 2 majors as a side effect, but not directly addressed).
- Semgrep, blocking: two `curl | sh`/`curl | tar` unverified-binary installs in `repo-health.yml` (gitleaks, Bearer) (Dependencies & Security). Options presented (reuse the already-SHA-pinned `gitleaks/gitleaks-action`/`bearer/bearer-action` used elsewhere in `ci.yml`; checksum verification; pin Bearer's install script to a release tag instead of `main`) — no decision made yet. Still open.
- Semgrep, blocking: `renovate.json` has no `minimumReleaseAge` (Dependencies & Security). **Resolved**: added `"minimumReleaseAge": "7 days"` at the top level (no single canonical best-practice value found in Renovate's own docs; used the 7-day fallback). Semgrep finding confirmed cleared.
- `apps/web/src/app/sign-in/page.tsx` is the one real churn×complexity hotspot (complexity 11) — not urgent, just worth watching (Code Health). No change requested.
- `apps/web/AGENTS.md` still claims "No real business logic exists yet," no longer accurate (Documentation). **Resolved**: updated to reflect the real sign-in/sign-up/dashboard/sign-out logic that exists now.
- Still-open gap: `ci.yml`'s `main`/`security-warn` jobs don't `needs: zizmor` (Documentation) — previously known, resurfaced since branch protection (its blocker) still isn't set up. **Decision: skip for now, keep tracking.** Still open.
- Log-based error-pattern analysis: skipped by design, no logging/observability destination chosen yet (Other).

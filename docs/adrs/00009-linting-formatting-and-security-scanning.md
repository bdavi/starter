# ADR-00009: Linting, Formatting, and Security Scanning Strategy

Status: Accepted
Date: 2026-07-25

## Context

`apps/web` already has ESLint scaffolded (via `@nx/next`) and Prettier was chosen for formatting. ADR-00007 established a strong testing commitment; the same posture applies here. ADR-00004's dependency-drift and service-boundary concerns, and ADR-00005's Nx-based module-boundary enforcement, are both partly implemented through lint tooling already. The brief was to build a comprehensive but appropriately-scoped matrix: what kind of checks (code quality, formatting, security patterns, secrets, dependency management, architecture), where they run (local, git hooks, PR CI, scheduled), and what happens when they fire (warn, fail, autofix, open a PR) — sticking to free tools unless there's a compelling reason otherwise.

## Options Considered

1. **Minimal** (ESLint only, what's already scaffolded) — cheapest, but leaves real, distinct categories (secrets, dependency vulnerabilities, dead code, architecture cycles, SAST) with zero coverage.
2. **Comprehensive free-tool matrix** — covers every category identified with a specific free/OSS tool, placed at the workflow stage that fits its cost/value tradeoff. Chosen.
3. **Paid platforms** (SonarQube, CodeQL/GitHub Advanced Security, Snyk Code) — evaluated and rejected for now on cost grounds specific to this project's target scale: GitHub Advanced Security's Code Security add-on is $30/active committer/month (plus $19/committer/month for Secret Protection) on private repos, billed per unique committer — at the ~50-engineer range ADR-00000 targets, that's a real, recurring five-figure-a-year cost for something free tooling covers adequately today. SonarCloud's free tier caps at 50K lines of code. Snyk Code's free tier caps at 200 tests/month. None of these are ruled out forever — revisit if a specific compelling need appears (e.g. a compliance requirement), not by default.

## Decision

Git hooks are split into **pre-commit** (must stay fast — staged files only) and **pre-push** (about to share code — a slightly heavier check is acceptable here) rather than one collapsed "git hook" stage. Typecheck was considered for pre-commit but deliberately left off — caught at pre-push/PR CI instead, keeping the commit-time hook fast.

### Tools

```
────────────────────────────────────────
Scanner type: Code quality / logic
Tool: ESLint (core)
Description: AST-based linter for JS/TS — catches real bugs and
  enforces consistent patterns, not just style.
Cost: Free, OSS
Local: `nx lint`; live in-editor via IDE extension
Pre-commit: staged files — fail
Pre-push: —
PR CI: `nx affected -t lint` — fail
Repo health script: —
Notes: Already scaffolded via @nx/next. Foundation the plugins
  below build on.
────────────────────────────────────────
Scanner type: Code quality / logic
Tool: typescript-eslint
Description: TypeScript-aware ESLint rules. Two tiers: syntactic
  (fast, no type info) and type-aware (needs parserOptions.project,
  catches real semantic bugs like floating promises, but slower).
Cost: Free, OSS
Local / Pre-commit / PR CI: bundled into the ESLint (core) pass above
Repo health script: —
Notes: Already scaffolded. Type-aware rules currently disabled
  (setParserOptionsProject: false, the generator's default "for
  lint performance reasons") — worth revisiting later.
────────────────────────────────────────
Scanner type: Code quality / logic
Tool: eslint-plugin-sonarjs
Description: Brings SonarQube-style code-smell rules (cognitive
  complexity limits, duplicate branches, suspicious patterns) into
  ESLint directly, no server needed.
Cost: Free, OSS
Local / Pre-commit / PR CI: bundled into the ESLint pass — fail
Repo health script: —
Notes: Gets a meaningful slice of SonarQube's value for free.
  Cognitive-complexity rules can flag legitimately complex business
  logic — needs threshold tuning, not default-accept.
────────────────────────────────────────
Scanner type: Code quality / logic
Tool: eslint-plugin-jsx-a11y
Description: Accessibility linting — alt text, ARIA roles,
  keyboard-nav patterns.
Cost: Free, OSS
Local / Pre-commit / PR CI: bundled into the ESLint pass — fail
Repo health script: —
Notes: Already included transitively via eslint-config-next. Can
  be noisy on icon-only/decorative elements — expect occasional
  justified eslint-disable.
────────────────────────────────────────
Scanner type: Code quality / logic
Tool: eslint-plugin-react-hooks
Description: Enforces the Rules of Hooks and exhaustive-deps.
Cost: Free, OSS
Local / Pre-commit / PR CI: bundled into the ESLint pass — fail
Repo health script: —
Notes: Already included transitively via eslint-config-next.
  exhaustive-deps can be overly aggressive with intentional
  dependency omissions.
────────────────────────────────────────
Scanner type: Formatting
Tool: Prettier
Description: Deterministic code formatter — removes style debate.
Cost: Free, OSS
Local: editor-on-save or manual — autofix
Pre-commit: staged files — autofix + re-stage
Pre-push: —
PR CI: `prettier --check` — fail (defense in depth vs. skipped hooks)
Repo health script: —
Notes: Chosen over Biome-as-formatter for now given the mature,
  battle-tested pairing with our existing ESLint setup.
────────────────────────────────────────
Scanner type: Formatting
Tool: prettier-plugin-tailwindcss
Description: Official Tailwind Labs Prettier plugin — auto-sorts
  Tailwind class names as part of formatting.
Cost: Free, OSS
Local / Pre-commit / PR CI: bundled into the Prettier pass above
Repo health script: —
Notes: Avoids version-compatibility issues the older
  eslint-plugin-tailwindcss has had with Tailwind v4.
────────────────────────────────────────
Scanner type: Type checking
Tool: TypeScript compiler (`tsc --noEmit`)
Description: The actual type checker. Distinct from ESLint — most
  ESLint rules don't do full type inference.
Cost: Free, built in
Local: `nx typecheck`; live via editor's TS server
Pre-commit: skipped — kept fast, caught later
Pre-push: scoped/affected — fail
PR CI: fail — essential, always
Repo health script: —
Notes: Non-negotiable at PR CI. Deliberately excluded from
  pre-commit to keep commits fast.
────────────────────────────────────────
Scanner type: Architecture boundaries
Tool: @nx/enforce-module-boundaries
Description: Tag-based architecture rule enforcement (an ESLint
  rule) — e.g. "packages/domain can't import from apps/*".
Cost: Free, included with Nx
Local / Pre-commit / PR CI: bundled into the ESLint pass — fail
Repo health script: —
Notes: Already the plan per ADR-00005. Silently does nothing if a
  project's tags aren't kept current — requires actually tagging
  new projects.
────────────────────────────────────────
Scanner type: Architecture boundaries
Tool: eslint-plugin-import-x
Description: Import ordering plus `no-cycle` (circular dependency
  detection) and `no-unresolved`.
Cost: Free, OSS
Local / Pre-commit / PR CI: bundled into the ESLint pass — fail
Repo health script: —
Notes: Actively-maintained fork of eslint-plugin-import — preferred
  over the original, which has slower maintenance. Needs
  eslint-import-resolver-typescript to resolve our path aliases
  correctly. Can be slow on large import graphs.
────────────────────────────────────────
Scanner type: Security patterns
Tool: eslint-plugin-security
Description: AST-level security-smell detection — eval, unsafe
  regex (ReDoS), unsafe child_process, non-literal require.
Cost: Free, OSS
Local / Pre-commit / PR CI: bundled into the ESLint pass — fail
Repo health script: —
Notes: Known for a meaningfully high false-positive rate — budget
  setup time to tune/disable noisy rules.
────────────────────────────────────────
Scanner type: Security patterns
Tool: Semgrep
Description: Broader pattern-based SAST, large community ruleset
  library (e.g. p/javascript, p/typescript, p/owasp-top-ten).
Cost: Free core + community rules; a paid AppSec Platform tier
  exists for centralized dashboards, not required
Local: optional manual run
Pre-commit: skipped — too slow
Pre-push: —
PR CI: warn initially, promote to fail once tuned
Repo health script: optional fuller ruleset sweep
Notes: Default rulesets are noisy until tuned/scoped.
────────────────────────────────────────
Scanner type: Security patterns
Tool: Bearer
Description: Free/OSS SAST focused on data-flow and privacy —
  traces PII and sensitive data through code, a distinct angle from
  Semgrep's general pattern matching.
Cost: Free, OSS
Local / Pre-commit / Pre-push: same posture as Semgrep above
PR CI: warn initially, promote to fail once tuned
Repo health script: optional fuller sweep
Notes: Complements Semgrep rather than replacing it.
────────────────────────────────────────
Scanner type: Secrets
Tool: Gitleaks
Description: Regex-pattern secret detection across diffs and git
  history.
Cost: Free, OSS
Local: optional manual scan
Pre-commit: staged files — fail (secrets always block)
Pre-push: —
PR CI: fail (defense in depth against a `--no-verify` bypass)
Repo health script: periodic full-history scan (catches anything
  pre-dating hooks)
Notes: Pattern-based — can miss novel secret formats, needs an
  allowlist file for occasional false positives on high-entropy
  non-secret strings.
────────────────────────────────────────
Scanner type: Dependency vulnerabilities
Tool: pnpm audit
Description: Checks installed dependency versions against the npm
  advisory database.
Cost: Free, built into pnpm
Local: on-demand — warn
Pre-commit / Pre-push / PR CI: —
Repo health script: primary home
Notes: No auto-fix/PR capability of its own — that's Renovate's
  job. Can flag transitive-dependency CVEs with no immediate fix
  available.
────────────────────────────────────────
Scanner type: Dependency vulnerabilities
Tool: osv-scanner
Description: Google's Open Source Vulnerabilities scanner —
  broader aggregated database (OSV, GitHub Security Advisories,
  etc.) than the npm advisory database alone.
Cost: Free, OSS
Local: on-demand — warn
Pre-commit / Pre-push / PR CI: —
Repo health script: primary home
Notes: Complements pnpm audit rather than replacing it.
────────────────────────────────────────
Scanner type: Dependency updates
Tool: Renovate
Description: Automated dependency-update PRs, highly configurable
  grouping — respects pnpm catalogs (ADR-00004).
Cost: Free (hosted GitHub App free tier, or self-hosted OSS)
Local / Pre-commit / Pre-push: —
PR CI: its PRs go through normal PR CI like any other PR
Repo health script: own schedule — creates PR
Notes: Already the implicit plan from ADR-00004. Real config-tuning
  effort needed up front (grouping/scheduling) or it becomes PR spam.
────────────────────────────────────────
Scanner type: Dead code / unused exports & dependencies
Tool: Knip
Description: Monorepo-aware reachability analysis — finds unused
  files, unused exports, unused dependencies, and unlisted
  dependencies.
Cost: Free, OSS
Local: on-demand
Pre-commit / Pre-push: —
PR CI: not yet trusted as a gate
Repo health script: primary home, warn-only report
Notes: Needs its Next.js plugin configured correctly or it will
  falsely flag every App Router route file as dead code (file-based
  routing has no explicit imports). Real false-positive risk until
  entry-point config is proven out — deliberately warn-only for now.
────────────────────────────────────────
```

### Explicitly deferred, not silently dropped

- **Commit message format enforcement** — skipped for now. `commitlint` is built around Conventional Commits, which ADR-00006 already declined; not worth adopting a tool shaped for a convention we don't use.
- **License compliance scanning** (`license-checker` or similar) — skipped, not needed while MIT/open.
- **Container/Dockerfile linting** (**Hadolint**, free/OSS) — no Dockerfiles exist yet (ADR-00008 scopes Docker Compose to local backing services only). Noted here as a future addition once any app gets containerized for deployment.
- **Infrastructure-as-code scanning** (**Checkov** or **tfsec**, both free/OSS) — no IaC exists yet. Noted here as a future addition once a hosting/infra ADR introduces one.

### The repo health script

A dedicated script (e.g. `pnpm nx run workspace:health` or `scripts/repo-health.sh`) bundling every deliberately non-blocking, warn-only check into one runnable command — Knip's report, `pnpm audit`/`osv-scanner`'s dependency warnings, and similar. Runnable on-demand locally, and invoked by a scheduled CI job against `main`, rather than each warn-only tool being wired up separately. This is a direct application of the reusable-script convention already in `AGENTS.md` — a repeated, non-blocking diagnostic task getting a real, shared script instead of being re-run ad hoc or forgotten.

## Consequences

- None of this is installed or configured yet — this ADR records the decision; wiring it up (lefthook config, ESLint plugin installs, the repo health script itself) is separate follow-up work.
- Knip's config (entry points, Next.js plugin) will need real tuning before it's trustworthy even as a warn-only signal — budget setup time.
- Semgrep/Bearer start as PR CI warnings, not failures — promoting them to blocking is a deliberate future step once the false-positive rate is proven low, not automatic.
- Secrets scanning is the one category that always blocks (pre-commit and PR CI both fail) — never downgraded to warn, per general practice that a leaked credential can't be un-leaked.
- Dependency vulnerabilities deliberately never block a PR — CVEs in transitive dependencies aren't about the PR's actual change and would cause constant unrelated CI failures; they're the repo health script's job instead.
- Hadolint and Checkov/tfsec are named here so they aren't forgotten, but adopting them is gated on real triggers (a Dockerfile, an IaC setup) that don't exist yet.
- All tooling chosen is free; paid alternatives (SonarQube, GitHub Advanced Security, Snyk Code) were evaluated and explicitly declined for cost reasons at this project's target scale, not overlooked.

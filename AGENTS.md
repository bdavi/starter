# AGENTS.md

Instructions for AI coding agents working in this repo. See [ADR-00002](./docs/adrs/00002-ai-agent-context-files.md) for why this file exists and how it relates to the ADR log.

## What this repo is

A reusable starter template for building SaaS products. Full purpose and design goals: [ADR-00000](./docs/adrs/00000-purpose-and-goals.md).

## Layout

This is a monorepo ([ADR-00001](./docs/adrs/00001-monorepo-vs-polyrepo.md)):

- `docs/adrs/` — Architecture Decision Records, in chronological order. Read the relevant ones before making structural changes.
- `apps/web` — customer-facing product (Next.js, colocated backend) — not yet scaffolded. See [ADR-00003](./docs/adrs/00003-web-app-language-and-architecture.md).
- `apps/worker` — background/async job processor (TypeScript) — not yet scaffolded.
- `apps/admin` — internal admin tooling, separate deployable from `apps/web` — not yet scaffolded.
- `apps/mobile` — planned, not yet built: React Native via Expo, once a native app is actually needed.
- `packages/db`, `packages/domain`, `packages/schemas`, `packages/queue`, `packages/email`, `packages/ui`, `packages/config` — shared logic; apps stay thin orchestration shells around these. See [ADR-00004](./docs/adrs/00004-monorepo-app-and-package-structure.md) for what each holds and why.

## Status

Stack decided: TypeScript throughout, pnpm workspaces + Nx for the monorepo, Next.js for `apps/web` (see [ADR-00003](./docs/adrs/00003-web-app-language-and-architecture.md), [ADR-00004](./docs/adrs/00004-monorepo-app-and-package-structure.md), [ADR-00005](./docs/adrs/00005-monorepo-build-tooling.md)).

**Nothing has been scaffolded yet** — no `package.json`, no actual app/package directories, no build/test/lint commands exist in this repo at this time. Do not assume or invent commands; check whether scaffolding has landed before claiming a command exists.

## Conventions

- Significant technical decisions are recorded as ADRs in `docs/adrs/`, following the template in `docs/adrs/README.md`. If you make or observe a structural/architectural decision, propose an ADR for it rather than leaving it undocumented.
- Do not run `git commit` (or otherwise create commits) unless the user gives specific direction to do so in that moment. Staging, diffing, and other read-only or reversible git commands are fine.
- When committing, evaluate the pending changes first: if they contain several distinct logical changes, split them into separate commits rather than one bundled commit. Generally, commit code, its tests, and its documentation together as a single unit rather than splitting them apart.
- Once `apps/*` or `packages/*` contain real packages, each should get its own `AGENTS.md` and `README.md`. Use the nearest one to the file you're editing — root files are the fallback baseline, package-level ones take precedence for anything package-specific. `README.md` is canonical for facts a human and an agent both need (build/test/run commands, layout); the package's `AGENTS.md` should link to it rather than restating those facts, adding only agent-specific behavioral guidance.
- Documentation is a first-class concern, not an afterthought — see [ADR-00006](./docs/adrs/00006-documentation-strategy.md). Prefer generated documentation over hand-written wherever a generator exists (e.g. OpenAPI from schemas, TypeDoc from code comments, Nx's dependency graph) rather than writing prose that duplicates what the code already states.
- A feature's *value* (why it exists) is short, hand-written prose; a feature's *behavior* ("it does X") should be backed by automated acceptance tests, not a prose description — tests can't silently drift out of sync with the code the way descriptions can. See [ADR-00007](./docs/adrs/00007-testing-and-qa-strategy.md). Treat a feature as incomplete if it has one but not the other.
- When a commit touches many lines without changing meaning (reformatting, mass renames, lint-fix sweeps), add its hash to `.git-blame-ignore-revs` so `git blame` keeps pointing at the last meaningful change. This only takes effect per-clone via `git config blame.ignoreRevsFile .git-blame-ignore-revs`.
- Commit messages follow the classic 50/72 style (see `.gitmessage`): imperative-mood subject ≤50 chars, blank line, body wrapped at ~72 chars explaining why not what. This only takes effect per-clone via `git config commit.template .gitmessage`.
- When creating a new application or other code structure that has an official generator/scaffolding CLI, prefer running that tool over hand-writing the files. For example, scaffold a new Next.js app with `pnpm create next-app` rather than creating its files manually — generators track upstream conventions and config more accurately than reproducing them by hand. After scaffolding, make whatever changes are needed on top of the generated result.
- If a requested task is really something a script could do — especially one that's repetitive, iterative, or likely to be run again (a data migration, a bulk rename, a repeated audit/check) — prefer writing a small, reusable script (bash or otherwise) over doing the work by hand step by step. If it seems likely the task will come up again, ask the user whether the script is worth keeping around rather than treating it as disposable.

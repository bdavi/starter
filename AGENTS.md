# AGENTS.md

Instructions for AI coding agents working in this repo. See [ADR-00002](./docs/ards/00002-ai-agent-context-files.md) for why this file exists and how it relates to the ADR log.

## What this repo is

A reusable starter template for building SaaS products. Full purpose and design goals: [ADR-00000](./docs/ards/00000-purpose-and-goals.md).

## Layout

This is a monorepo ([ADR-00001](./docs/ards/00001-monorepo-vs-polyrepo.md)):

- `docs/ards/` — Architecture Decision Records, in chronological order. Read the relevant ones before making structural changes.
- `apps/web` — customer-facing product (Next.js, colocated backend) — not yet scaffolded. See [ADR-00003](./docs/ards/00003-web-app-language-and-architecture.md).
- `apps/worker` — background/async job processor (TypeScript) — not yet scaffolded.
- `apps/admin` — internal admin tooling, separate deployable from `apps/web` — not yet scaffolded.
- `apps/mobile` — planned, not yet built: React Native via Expo, once a native app is actually needed.
- `packages/db`, `packages/domain`, `packages/schemas`, `packages/queue`, `packages/email`, `packages/ui`, `packages/config` — shared logic; apps stay thin orchestration shells around these. See [ADR-00004](./docs/ards/00004-monorepo-app-and-package-structure.md) for what each holds and why.

## Status

Stack decided: TypeScript throughout, pnpm workspaces + Nx for the monorepo, Next.js for `apps/web` (see [ADR-00003](./docs/ards/00003-web-app-language-and-architecture.md), [ADR-00004](./docs/ards/00004-monorepo-app-and-package-structure.md), [ADR-00005](./docs/ards/00005-monorepo-build-tooling.md)).

**Nothing has been scaffolded yet** — no `package.json`, no actual app/package directories, no build/test/lint commands exist in this repo at this time. Do not assume or invent commands; check whether scaffolding has landed before claiming a command exists.

## Conventions

- Significant technical decisions are recorded as ADRs in `docs/ards/`, following the template in `docs/ards/README.md`. If you make or observe a structural/architectural decision, propose an ADR for it rather than leaving it undocumented.
- Do not run `git commit` (or otherwise create commits) unless the user gives specific direction to do so in that moment. Staging, diffing, and other read-only or reversible git commands are fine.
- When committing, evaluate the pending changes first: if they contain several distinct logical changes, split them into separate commits rather than one bundled commit. Generally, commit code and its tests together as a single unit rather than splitting them apart.
- Once `apps/*` or `packages/*` contain real packages, each should get its own `AGENTS.md` describing that package's build/test/run commands and conventions. Use the nearest `AGENTS.md` to the file you're editing — root `AGENTS.md` is the fallback baseline, package-level files take precedence for anything package-specific.
- When a commit touches many lines without changing meaning (reformatting, mass renames, lint-fix sweeps), add its hash to `.git-blame-ignore-revs` so `git blame` keeps pointing at the last meaningful change. This only takes effect per-clone via `git config blame.ignoreRevsFile .git-blame-ignore-revs`.
- Commit messages follow the classic 50/72 style (see `.gitmessage`): imperative-mood subject ≤50 chars, blank line, body wrapped at ~72 chars explaining why not what. This only takes effect per-clone via `git config commit.template .gitmessage`.
- When creating a new application or other code structure that has an official generator/scaffolding CLI, prefer running that tool over hand-writing the files. For example, scaffold a new Next.js app with `pnpm create next-app` rather than creating its files manually — generators track upstream conventions and config more accurately than reproducing them by hand. After scaffolding, make whatever changes are needed on top of the generated result.
- If a requested task is really something a script could do — especially one that's repetitive, iterative, or likely to be run again (a data migration, a bulk rename, a repeated audit/check) — prefer writing a small, reusable script (bash or otherwise) over doing the work by hand step by step. If it seems likely the task will come up again, ask the user whether the script is worth keeping around rather than treating it as disposable.

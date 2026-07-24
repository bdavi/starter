# AGENTS.md

Instructions for AI coding agents working in this repo. See [ADR-0002](./docs/ards/0002-ai-agent-context-files.md) for why this file exists and how it relates to the ADR log.

## What this repo is

A reusable starter template for building SaaS products. Full purpose and design goals: [ADR-0000](./docs/ards/0000-purpose-and-goals.md).

## Layout

This is a monorepo ([ADR-0001](./docs/ards/0001-monorepo-vs-polyrepo.md)):

- `docs/ards/` — Architecture Decision Records, in chronological order. Read the relevant ones before making structural changes.
- code structures TBD

## Status

No stack, package manager, or build/test/lint tooling has been chosen yet. There are no build, test, or lint commands to run in this repo at this time. This section will be filled in once that decision is made and recorded as an ADR — do not assume or invent commands in the meantime.

## Conventions

- Significant technical decisions are recorded as ADRs in `docs/ards/`, following the template in `docs/ards/README.md`. If you make or observe a structural/architectural decision, propose an ADR for it rather than leaving it undocumented.
- Do not run `git commit` (or otherwise create commits) unless the user gives specific direction to do so in that moment. Staging, diffing, and other read-only or reversible git commands are fine.
- When committing, evaluate the pending changes first: if they contain several distinct logical changes, split them into separate commits rather than one bundled commit. Generally, commit code and its tests together as a single unit rather than splitting them apart.
- Once `apps/*` or `packages/*` contain real packages, each should get its own `AGENTS.md` describing that package's build/test/run commands and conventions. Use the nearest `AGENTS.md` to the file you're editing — root `AGENTS.md` is the fallback baseline, package-level files take precedence for anything package-specific.
- When a commit touches many lines without changing meaning (reformatting, mass renames, lint-fix sweeps), add its hash to `.git-blame-ignore-revs` so `git blame` keeps pointing at the last meaningful change. This only takes effect per-clone via `git config blame.ignoreRevsFile .git-blame-ignore-revs`.
- Commit messages follow the classic 50/72 style (see `.gitmessage`): imperative-mood subject ≤50 chars, blank line, body wrapped at ~72 chars explaining why not what. This only takes effect per-clone via `git config commit.template .gitmessage`.

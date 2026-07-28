---
name: maintenance-review
description: Runs the periodic maintenance review (ADR-00015) — repo health, open Renovate PRs, refactor/documentation debt — and produces one punch list to sign off on.
disable-model-invocation: true
allowed-tools: Bash(pnpm run health) Bash(gh pr list *) Bash(git grep *) Bash(git log *) Read Grep Glob
---

# Maintenance review

Follow [`docs/maintenance-review.md`](../../../docs/maintenance-review.md) exactly — that file is the actual procedure (tool-agnostic, so it stays correct even if this repo is ever worked on with something other than Claude Code) and takes precedence over anything below if they ever disagree. This skill only wires up the invocation: it pre-runs the two fully-automated steps and pre-approves the read-only tools the rest of the procedure needs.

## Live data (already run — read this, don't re-run it)

### `pnpm run health` (step 1)

!`pnpm run health`

### Open Renovate PRs (step 2)

!`gh pr list --search "author:app/renovate" --state open --json number,title,createdAt`

## Your task

1. Read the two outputs above as steps 1–2 of `docs/maintenance-review.md` — don't re-run either command.
2. Carry out steps 3–6 of that doc yourself (vulnerability grouping, hotspots + TODO/FIXME grep, documentation drift, the log-analysis placeholder note).
3. Before writing anything, read [`docs/maintenance-log.md`](../../../docs/maintenance-log.md) to see what the previous review (if any) left open, per step 8.
4. Produce the single synthesized punch list per step 7, then ask which items to act on. Do not implement anything in this same turn — that's a separate, explicit follow-up, same as any other change in this repo.
5. Only after presenting the list, append the new dated entry to `docs/maintenance-log.md` per step 8's format. This is the one write action in this whole review — everything else is read-only.

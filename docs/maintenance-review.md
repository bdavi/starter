# Periodic Maintenance Review

A recurring maintenance audit: run the existing tooling, read the output, use judgment on what it means, and hand back one prioritized list of things worth doing. See [ADR-00015](./adrs/00015-periodic-maintenance-review.md) for why this exists.

This doc is intentionally tool-agnostic — any coding agent (or a human) can follow it directly. Claude Code additionally exposes it as `/maintenance-review` (`.claude/skills/maintenance-review/SKILL.md`), which just runs the automated steps below and hands you this procedure with their output already attached.

## Ground rules

- **Read-only.** This procedure inspects and reports. It never edits files, installs or upgrades anything, merges a PR, or commits — including the log entry in the last step, which is the one write action, and even that only records what was found, not a code change.
- **Synthesize, don't dump.** The job is to turn several tools' raw output into one list someone can actually act on — group related findings, skip noise (e.g. don't list every low-severity transitive-dependency advisory individually if there are dozens of them), and give each item a one-line reason it matters.
- **End with a question, not an action.** After presenting the list, ask which items (if any) to act on next. Nothing here gets implemented as part of the review itself — that's a separate, explicit follow-up task per item, same as any other change in this repo.

## Steps

### 1. Automated health baseline

Run:

```
pnpm run health
```

This is `scripts/repo-health.sh` (ADR-00009) — Knip, `pnpm audit`, osv-scanner, a full-history Gitleaks scan, Semgrep, Bearer, the churn×complexity hotspot report, and the full e2e suite. All non-blocking by design; read the output rather than treating a non-zero exit as failure.

### 2. Dependency freshness — via Renovate's backlog, not a fresh check

Renovate (ADR-00009) already finds outdated dependencies and opens PRs; re-deriving that list would just duplicate it. Instead, look at what's already been found and not yet dealt with:

```
gh pr list --search "author:app/renovate" --state open --json number,title,createdAt
```

For each open PR, use judgment to sort into:

- **Safe to merge as-is** — patch/minor bumps, especially ones Renovate's own config already automerges (see `renovate.json`) that are nonetheless still sitting open.
- **Needs manual attention** — major version bumps, or anything that's been open long enough to suggest it's stuck (a breaking change, a failing check, or just forgotten).

### 3. Vulnerability follow-up

`pnpm audit` and osv-scanner findings come from step 1. This repo has no vulnerability-exceptions/allowlist file, so there's no "already acknowledged" state to check against yet — report findings as-is, but group by package rather than listing every affected transitive path separately.

### 4. Code health signals

- Reuse the churn×complexity hotspot output from step 1 (`scripts/churn-vs-complexity.sh`) — the top few entries are refactor candidates: files that are both frequently changed and structurally complex, not just complex in isolation.
- Secondary, cheap signal: search for deliberately-left markers.

```
git grep -n -E "TODO|FIXME|XXX" -- '*.ts' '*.tsx'
```

Not everything found here is worth a punch-list line — use judgment on which markers represent real, still-relevant debt versus ones that have effectively become permanent comments.

### 5. Documentation drift

- For each `AGENTS.md` (root and nested under `apps/*`/`packages/*`), check whether its "Status" section still matches the current state of that app/package — e.g. does it still say "no real logic yet" for something that now has real logic, or reference a file, tool, or convention that's since changed or been removed.
- Search ADRs and `AGENTS.md` files for self-declared, still-open debt:

```
git grep -n -iE "known gap|not yet closed|deferred|todo" -- 'docs/adrs/*.md' 'AGENTS.md' '**/AGENTS.md'
```

These are places the repo already admitted something was incomplete — the point of resurfacing them periodically is making sure they don't quietly become permanent.

### 6. Log-based error patterns — placeholder, not yet real

There is no logging/observability destination chosen for this repo yet (no ADR covers it). This step is a deliberate placeholder: skip it and say so explicitly, the same way `scripts/repo-health.sh` skips an optional tool that isn't installed, rather than silently omitting it. Once a logging/observability ADR exists, replace this step with a real query against wherever logs actually land (recent error-level entries, grouped by frequency, looking for anything recurring).

### 7. Synthesize the punch list

One markdown list, grouped under headings like `Dependencies & Security`, `Code Health`, `Documentation`, `Other` — only include groups that actually have findings. Each item: a one-line description, why it matters, and a suggested next step. End with:

> Which of these would you like me to act on?

### 8. Record the review

Append a dated entry to [`maintenance-log.md`](./maintenance-log.md) — see that file for the exact format. Before writing the new entry, check whether items from the _previous_ entry are still open (still true today) or have since been resolved, and note that in this entry rather than re-discovering the same finding as if it were new.

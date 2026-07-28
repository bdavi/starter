# ADR-00015: Periodic Maintenance Review

Status: Accepted
Date: 2026-07-27

## Context

ADR-00009 gave us `pnpm run health` (`scripts/repo-health.sh`) — a non-blocking sweep of Knip, `pnpm audit`, osv-scanner, Gitleaks, Semgrep, Bearer, and the churn×complexity hotspot report (ADR-00014's tooling). Renovate (ADR-00009) opens PRs for outdated dependencies automatically. Both are real, working tools. Neither is a _practice_ — nothing prompts anyone to actually sit down, run them, read the output, and decide what to act on. In the time it took to build this repo, Renovate has already accumulated 10 open, unreviewed PRs (three of them major version bumps), and several ADRs and `AGENTS.md` files carry "known gap, not yet closed" notes that were true when written and haven't been revisited since.

This is exactly the failure mode ADR-00014 named for lint rules — a good decision that's only written down is one bad week away from being silently ignored — but it applies just as much to a _process_ as to a convention: without a recurring trigger, "check on the repo's health" never happens on its own.

We also want this procedure usable by more than Claude Code. ADR-00002 already established the precedent for this: `AGENTS.md` as the tool-agnostic instruction file, with a thin Claude-specific layer only where genuinely needed. The same split applies here.

## Options Considered

1. **Do nothing new — rely on `pnpm run health` and Renovate PRs being noticed organically.** Zero effort, but this is the status quo that already produced 10 unreviewed PRs and stale "known gap" notes. Rejected for the same reason ADR-00014 rejected relying on memory for conventions.
2. **A single Claude-Code-only skill (`.claude/skills/maintenance-review/SKILL.md`) with the full procedure inline.** Simple, but ties a genuinely tool-agnostic procedure (run some scripts, read output, use judgment, report back) to one vendor, repeating the mistake ADR-00002 already ruled out for `AGENTS.md`.
3. **A tool-agnostic procedure doc (`docs/maintenance-review.md`) plus a thin tool-specific wrapper that invokes it** — the same split ADR-00002 uses for `AGENTS.md` vs. any vendor-specific file. The procedure itself is followable by any coding agent (or a human) given just the file path; the wrapper only adds the invocation mechanics (a `/maintenance-review` command, pre-approved read-only tools, live data injected into the prompt) for whichever tool is actually in use today.

## Decision

**Option 3.** `docs/maintenance-review.md` holds the actual procedure: run `pnpm run health`, summarize open Renovate PRs (flagging which are safe to merge vs. need manual migration attention, rather than re-deriving what Renovate already found), treat the churn×complexity hotspot output as refactor candidates, grep for `TODO`/`FIXME` markers, check whether `AGENTS.md` "Status" sections still match reality, resurface ADR/`AGENTS.md` "known gap" callouts, and explicitly skip log-based error analysis for now (no logging/observability destination has been chosen yet — see Consequences). It synthesizes one prioritized, grouped punch list and stops — it never edits files, installs anything, or commits, and it explicitly asks which items (if any) to act on next, consistent with this repo's standing rule that changes need specific, in-the-moment sign-off.

`.claude/skills/maintenance-review/SKILL.md` is the Claude Code wrapper: `disable-model-invocation: true` (this is a deliberate `/maintenance-review`, not something an agent decides to run on its own initiative mid-conversation, the same reasoning the skills docs give for `/deploy`-style commands), pre-approved read-only tools for the scripts and `gh pr list` it needs, and the live health-script/PR output injected into the prompt before the model sees it.

Each review appends a dated entry to `docs/maintenance-log.md` — items raised, and whether they were already open from a previous review or new this time. This is a deliberate iteration on ADR-00009's "run and read the output" model of health checks: the whole point of a _periodic_ review is noticing what hasn't been dealt with since the last one, which a stateless run of the same scripts can't do on its own.

## Consequences

- A new persistent artifact, `docs/maintenance-log.md`, needs upkeep — it's only useful if reviews actually keep appending to it. Worth revisiting if it goes stale itself.
- Log-based error analysis is a named, deliberate gap, not an oversight: there's no logging/observability ADR yet, so there's nothing real to query. Once one exists, `docs/maintenance-review.md` should gain a real step for it instead of the current placeholder.
- This adds a recurring manual trigger (running `/maintenance-review`, or the equivalent for another agent), not an automated schedule — consistent with keeping changes to explicit, in-the-moment developer decisions rather than anything that acts on its own.
- If a second AI coding tool is genuinely adopted later, it only needs its own thin wrapper pointing at `docs/maintenance-review.md` — the procedure itself doesn't change, the same benefit ADR-00002 already banked for `AGENTS.md`.

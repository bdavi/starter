# ADR-00002: AI Agent Context Files

Status: Accepted
Date: 2026-07-23

## Context

ADR-00000 names AI-tooling effectiveness as an explicit, first-class design goal — coding agents should be able to navigate this repo, understand context, and make safe changes, not just humans. ADR-00001 chose a monorepo partly for the same reason: one place for agents to find full context.

Right now the repo has no dedicated file telling an agent _how_ to work here — build/test commands, coding conventions, directory boundaries. The ADR log documents _why_ decisions were made, not operational instructions, and agents shouldn't have to infer conventions from scratch each session.

We want a format that works across multiple AI coding tools (Claude Code today, potentially others later), not one tied to a single vendor.

## Options Considered

1. **AGENTS.md** (open, tool-agnostic standard)
   - Pros: plain markdown, no required schema; natively read by Claude Code, Codex, Cursor, Copilot, Gemini CLI, Aider, Windsurf, Zed, and others; established nested-file convention (nearest-file-wins) that maps directly onto a monorepo's `apps/*`/`packages/*` layout; no vendor lock-in
   - Cons: newer standard than any single vendor's own format; less Claude-specific tuning than CLAUDE.md's richer memory model

2. **CLAUDE.md only**
   - Pros: Claude Code's native format, richer 3-layer (global/project/local) memory model
   - Cons: locks instructions to one vendor, directly contradicts the tool-agnostic goal, every other tool gets nothing

3. **Per-tool files** (`.cursorrules`, `.github/copilot-instructions.md`, `CLAUDE.md`, etc., one per tool)
   - Pros: each tool gets tailored content
   - Cons: duplication across files, drift risk as conventions change, maintenance cost grows with every tool added

4. **Status quo** (rely on the ADR log only)
   - Pros: zero additional effort
   - Cons: fails ADR-00000's explicit AI-tooling goal directly; agents have to infer conventions instead of being told, and rationale (the "why") is not a substitute for operational instructions (the "how")

## Decision

Adopt **AGENTS.md** as the single tool-agnostic instruction file for AI coding agents. No `CLAUDE.md` or other vendor-specific file is added — Claude Code's native AGENTS.md support covers our needs today, and we default to vendor-neutral unless a concrete need for Claude-only content shows up later.

A root `AGENTS.md` is added now, but scoped to only what's already true (purpose, layout, pointer to this ADR log, explicit "no stack chosen yet"). It gets filled in incrementally as later ADRs (stack, build tooling) land — it is not a placeholder for content we haven't decided yet.

We commit now to the community-standard **nested convention**: once `apps/*` and `packages/*` contain real packages, each gets its own `AGENTS.md` describing that package's build/test/run commands and conventions, with agents using the nearest `AGENTS.md` to the file being edited. Deciding this now avoids re-litigating it when the first app/package is added.

Content split going forward: `docs/adrs/` remains the record of _why_ (decision rationale); `AGENTS.md` is the record of _how_ (operational instructions). `AGENTS.md` should link back to the ADR log rather than duplicating rationale, so the two don't drift apart.

## Consequences

- Root `AGENTS.md` needs a follow-up edit once the stack/build-tooling ADR lands, to add real build/test/lint commands in place of the current "not yet decided" note.
- Nested `AGENTS.md` files add maintenance surface as apps/packages are added — worth reinforcing as a norm (e.g., PR checklist, or noted in the eventual build-tooling ADR) so it isn't skipped under time pressure.
- If a future AI coding tool doesn't support AGENTS.md, we accept degraded support for that tool rather than adding a vendor-specific shim — consistent with staying tool-agnostic.
- Revisit this decision if a genuine Claude-only need emerges (e.g., content that would actively hurt other tools if they read it) — at that point a `CLAUDE.md` importing `@AGENTS.md` is the documented fallback.

# Architecture Decision Records

This folder tracks the significant technical decisions made while building this SaaS starter, in the order we made them. Each file is one decision.

## Why ADRs

- Future-us (or a new team member) can see *why* something is the way it is, not just that it is that way.
- Decisions get revisited as the project grows. An ADR can be superseded by a later one without deleting history.
- Forces us to actually weigh tradeoffs instead of defaulting to "whatever's familiar."
- These records are also included in the repo to give AI coding tools context on why the architecture is the way it is, so their suggestions stay consistent with past decisions.

## Format

Each ADR follows this template:

```
# ADR-NNNNN: <short title>

Status: Proposed | Accepted | Superseded by ADR-XXXXX | Deprecated
Date: YYYY-MM-DD

## Context
What problem are we solving? What constraints matter (team size, load, timeline, existing skills)?

## Options Considered
1. Option A — pros/cons
2. Option B — pros/cons
3. Option C — pros/cons

## Decision
What we chose and the one or two reasons that tipped it.

## Consequences
What this makes easier, what this makes harder, what we're deferring or accepting as a tradeoff.
```

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [00000](./00000-purpose-and-goals.md) | Project Purpose & Design Goals | Accepted |
| [00001](./00001-monorepo-vs-polyrepo.md) | Monorepo vs Polyrepo | Accepted |
| [00002](./00002-ai-agent-context-files.md) | AI Agent Context Files | Accepted |
| [00003](./00003-web-app-language-and-architecture.md) | Web Application Language & Architecture | Accepted |
| [00004](./00004-monorepo-app-and-package-structure.md) | Monorepo App & Package Structure | Accepted |
| [00005](./00005-monorepo-build-tooling.md) | Monorepo Build Tooling | Accepted |
| [00006](./00006-documentation-strategy.md) | Documentation Strategy | Accepted |
| [00007](./00007-testing-and-qa-strategy.md) | Testing & QA Strategy | Accepted |
| [00008](./00008-local-development-environment.md) | Local Development Environment | Accepted |


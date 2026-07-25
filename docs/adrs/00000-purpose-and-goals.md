# ADR-00000: Project Purpose & Design Goals

Status: Accepted
Date: 2026-07-23

## Context

Before making individual technical decisions (repo structure, language, tooling, etc.), we need a shared statement of what this project is *for*. Every later ADR should be evaluated against this document — if a decision doesn't serve these goals, that's a reason to question it.

## Purpose

A starter template / reference application for building SaaS products, meant to:

1. **Be reusable** — the starting point for future projects, not a one-off.
2. **Be a learning sandbox** — a place to experiment with different patterns and technologies, and to figure out (and document) production/enterprise-grade best practices firsthand rather than just cite them.
3. **Encode good decisions once** so future projects inherit them instead of re-litigating the same architecture questions from scratch.

## Target Scale

Must work well across the whole range, not just at one end:

- **Low end:** a single developer moving fast, minimal ceremony, low cognitive overhead to get started.
- **High end:** an engineering org of roughly **up to ~50 engineers**, multiple teams, multiple services, real production/enterprise load.

This is the central design tension: solo-dev-friendly and 50-engineer-friendly pull in different directions (ceremony, process, tooling investment). Decisions should lean toward **structure that costs little at small scale but pays off at large scale**, rather than either extreme.

## Design Goals

- **Extensible** — adding a new service, module, or capability should not require re-architecting what exists.
- **Scalable** — both technically (load) and organizationally (more engineers, more teams working concurrently without stepping on each other).
- **Future-proof against common architecture/process failure modes**, specifically:
  - Tight coupling that makes independent changes/deploys impossible.
  - Inconsistent patterns across services/modules because there was no enforced convention early.
  - Onboarding friction — a new engineer (or team) taking too long to become productive.
  - CI/CD that doesn't scale with repo/team size (slow builds, unclear ownership, unsafe deploys).
  - Missing observability/testing discipline until it's already a production problem.
  - Undocumented decisions that get silently re-decided (or violated) later — this is what the ADR log itself is meant to prevent.
- **AI-tooling effectiveness is an explicit, first-class goal** — the project structure should be designed so coding agents (not just humans) can navigate it, understand context, and make safe changes. This should actively inform decisions (repo structure, documentation, code organization), not be an afterthought.
- **Decisions should be documented, not tribal knowledge** — via this ADR log.

## Non-Goals (for now)

- We are not optimizing for scale beyond ~50 engineers / hyperscale infrastructure. Patterns that only make sense at that scale (e.g. Bazel-style build systems, service meshes by default) should be evaluated on their own merits, not assumed necessary.
- We are not locking in a single "correct" stack forever — part of the point is experimenting with alternatives. But the *default*/starter path should be opinionated and production-ready, not a menu of unfinished options.

## Consequences

- Every subsequent ADR should reference back to this document's goals when weighing tradeoffs.
- Where solo-dev simplicity and 50-engineer scalability genuinely conflict, we default toward the structure that scales, as long as it doesn't meaningfully hurt the solo/small-team experience (this is a judgment call to make explicitly, case by case — not a blanket rule).

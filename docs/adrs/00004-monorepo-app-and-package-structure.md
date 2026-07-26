# ADR-00004: Monorepo Application & Package Structure

Status: Accepted
Date: 2026-07-24

## Context

ADR-00001 chose a monorepo with an `apps/*` / `packages/*` convention; ADR-00003 chose TypeScript and a colocated Next.js architecture for the core product. Several needs surfaced during design that a single `apps/web` can't satisfy on its own:

- **Background/async work doesn't fit a request/response app.** Sending emails, processing uploads, generating reports, retrying webhooks, and scheduled jobs need to run outside the request lifecycle — and serverless hosting (the natural target for a Next.js app) has execution time limits and no persistent process, so this can't just live inside `apps/web`.
- **Admin tooling has a different security perimeter than the customer-facing app.** Gating admin routes inside the public app risks shipping admin logic in the public bundle and depends on a role check never breaking.
- **A native mobile app is planned, though not yet built** (see ADR-00003) — when it arrives, it should share as much logic/types with the rest of the system as possible.
- **The business logic and data-access patterns used by these apps need one home**, not one per app, or they'll drift out of sync with each other.
- **The future is genuinely uncertain**: possible AI/ML integration (likely Python-shaped if it goes beyond calling hosted LLM APIs) and possible future need for a non-TypeScript language for CPU-bound, high-throughput processing (e.g. Elixir, Go, Rust) if TypeScript's raw throughput is ever the actual bottleneck.

## Decision

### Apps

- **`apps/web`** — the customer-facing product. Next.js, colocated backend per ADR-00003.
- **`apps/worker`** — background/async job processor, TypeScript. Exists specifically because request/response apps and serverless hosting can't run long-lived or scheduled work. Will need different hosting than `apps/web` (a persistent process, not typical serverless) — left for a future hosting ADR.
- **`apps/admin`** — a separate deployable for internal tooling, not routes gated inside `apps/web`. Keeps admin-only code out of the public bundle and allows a tighter, independent security perimeter (auth, network restrictions) without depending on the customer app's deploy.
- **`apps/mobile`** — planned, not yet built. React Native via Expo when it happens (see ADR-00003), specifically so it can import `packages/domain`, `packages/schemas`, and a typed API client rather than reimplementing logic in a second language.

### Packages

- **`packages/db`** — single source of truth for the database: ORM client, schema, migrations. Every app that touches data imports this rather than maintaining its own connection/schema.
- **`packages/domain`** — business logic (e.g. renewal-date calculation, invoice-overdue rules), kept as UI-agnostic as practical. Whether it depends directly on `packages/db` or only on repository interfaces implemented by `packages/db` is an open judgment call (pragmatic direct coupling vs. stricter ports-and-adapters) — deliberately left unresolved here; revisit if the direct-coupling approach starts causing real pain, rather than pre-deciding it.
- **`packages/schemas`** — Zod schemas as the single source of both runtime validation and static types (`z.infer`), used for API input validation, form validation, and job payload shapes alike.
- **`packages/queue`** — job/event payload _type_ definitions, shared by producers (`apps/web`) and consumers (`apps/worker`) so payload shape can't drift between them.
- **`packages/email`, `packages/ui`, `packages/config`** — supporting shared concerns (email templates/sending, shared React components, validated env/config). `packages/ui` will not transfer as-is to `apps/mobile`; when mobile is built, either a separate `packages/ui-native` sharing only design tokens, or a deliberate "universal" (Expo Router + React Native Web) approach is a real fork to decide at that time — not decided now, since it would mean reconsidering how `apps/web` itself is built.

### Principle: apps are thin, packages hold the logic

Apps orchestrate (translate an HTTP request or queue message into a call), packages implement. This is what lets `apps/worker` exist without reimplementing how to read a subscription or what the renewal rules are — it imports the same `packages/domain`/`packages/db` that `apps/web` uses, just triggered differently.

### Principle: future services are defined by data ownership + API, not by language

A component only becomes a genuinely separate _service_ (as opposed to another thin app sharing `packages/db`) when it owns its own data. When that's true, other parts of the system must reach it through its API or events — never by importing a shared package that touches its data directly. This boundary is deliberately language-agnostic: it's what allows a future component (e.g. a Python service for real ML/model-training work, or an Elixir/Go/Rust service for CPU-bound high-throughput processing, if TypeScript's throughput is ever genuinely the bottleneck) to be added later without re-architecting anything that already exists. Per ADR-00001, such a service still belongs in this monorepo — the repo boundary and the service boundary are orthogonal; splitting the repo is justified by things like hard access-control needs, not by architecture alone.

We are explicitly _not_ building any such service now — this is a future-proofing principle, not new scope. Whether it's ever needed depends on real, not hypothetical, requirements (e.g. AI/ML work turning out to need real model training rather than just calling a hosted LLM API; a CPU-bound — not I/O-bound — data-processing workload TypeScript genuinely can't handle).

### Dependency management (cross-package version drift)

Multiple packages depending on different versions of the same external library is a known real problem (duplicate runtime instances of "singleton" libraries like React; TypeScript structural-type incompatibilities between two versions of the same library, e.g. Zod). Mitigations to adopt once the package manager is set up:

- **pnpm workspace catalogs** — declare a shared dependency's version once in `pnpm-workspace.yaml`, every package references it as `"<dep>": "catalog:"`. Single place to bump, no per-package drift.
- **`peerDependencies`** for singleton libraries (e.g. `packages/ui` declares `react` as a peer, not a direct dependency), so the consuming app controls the one installed copy structurally, not by convention.
- **Syncpack (or equivalent) in CI** to catch any version mismatch across `package.json` files before merge.
- **Renovate configured to group updates** for shared dependencies into a single PR that bumps every package at once, rather than one PR per package drifting independently.
- Internal (`packages/*`) cross-references use the workspace protocol (`workspace:*`) and are not independently versioned — there is no version to drift, since it's always the current code in the same commit.

### Queue/broker technology guidance (for the future job-system ADR)

Not decided here (no job/queue system has been chosen yet), but constrained: default to a broker with genuine multi-language client support (e.g. NATS, RabbitMQ, Kafka, or a managed equivalent like SQS) rather than a Node-specific library (e.g. BullMQ). This keeps the door open, at effectively no cost today, for a future non-TypeScript worker or service (per the polyglot-service principle above) to produce or consume from the same queue.

## Consequences

- Each new app/package is cheap to add architecturally, but adds real maintenance surface (another `AGENTS.md`, another thing that can drift) — worth a norm (PR checklist or similar) once there are enough of them for it to matter.
- The `packages/domain` vs `packages/db` coupling strictness is explicitly deferred, not resolved — expect to revisit.
- `apps/worker` will need its own hosting decision, since it can't run on the same serverless-style platform as `apps/web`.
- `packages/ui`'s mobile story is deliberately unresolved until `apps/mobile` is actually being built.
- The polyglot-service principle means a future Python/Elixir/Go/Rust component doesn't require re-litigating this ADR — it just needs to honor the data-ownership + API boundary already established here.

# ADR-00020: `packages/observability` Design

Status: Accepted
Date: 2026-07-28

## Context

ADR-00016 through ADR-00019 establish the infrastructure side of observability — why OpenTelemetry, where telemetry goes, how the Collector is built, how a non-TypeScript service lives in this repo. This ADR covers the piece every TypeScript app and package actually touches: `packages/observability`.

The explicit design principle for this package, stated directly rather than inferred: **apps and packages should depend only on `packages/observability`, never install OpenTelemetry or Pino packages directly.** This extends a pattern already established elsewhere in this repo — `packages/auth`'s `./server`/`./client` split exists so consumers get an interface without needing to know the underlying vendor (Better Auth) directly — to the whole repo, not just this one package, and to observability specifically, not just auth.

## Options Considered

### How much to isolate

1. **Apps install `@opentelemetry/*` and Pino directly, `packages/observability` only provides shared configuration helpers.** Simpler package surface, but every app independently manages OTel/Pino versions — reintroduces exactly the cross-package version-drift risk ADR-00004 already named for React and Zod, just for a new set of libraries.
2. **Apps depend only on `packages/observability`; it wraps everything, including the vendor SDKs.** More upfront design work (a real facade, multi-entry-point exports), but a single point of version control, and — combined with treating `@opentelemetry/api`/`api-logs` as `peerDependencies` off a pnpm workspace catalog entry — makes the singleton-drift failure mode structurally impossible rather than just discouraged. **Chosen.**

### API vs. SDK exposure

OpenTelemetry's own guidance for library authors: depend only on `@opentelemetry/api` (a thin, deliberately stable, versioned interface whose methods are safe no-ops until an SDK is registered), never on SDK packages (`@opentelemetry/sdk-node` and friends) directly — doing so couples a library to implementation details an application owner might swap out. This repo's principle goes one step further than OpenTelemetry's own recommendation: not just "don't import the SDK," but "don't import the API package directly either — import our facade around it." Reasonable specifically because `@opentelemetry/api` is designed to be thin and stable enough to wrap at low cost; teams that skip this extra layer and use the API directly aren't wrong, this is a deliberate added layer of internal consistency, not a correction of bad practice.

**Decision**: internal application code touches only `packages/observability`'s own exported surface. Inside the package, that surface is built on `@opentelemetry/api`/`api-logs` only; the actual SDK is instantiated exactly once, inside a `setup()`/`register()` function called from each app's true entry point (`apps/web`'s `instrumentation.ts`; a future `apps/worker`'s own entry point).

### Logging library

**Pino**, chosen for its performance and minimal footprint, bridged into the OTel logs pipeline via `@opentelemetry/instrumentation-pino` (auto-stamps trace context onto every log line for free) and `pino-opentelemetry-transport`. `pino-pretty` (dev-mode console formatting) is included for the same reason — it's still Pino's concern, not an app's.

### Context propagation

`AsyncLocalStorageContextManager` (`@opentelemetry/context-async-hooks`) — the modern replacement for the older `async_hooks`-based context manager, notably also the one relevant to a real Node.js DoS-mitigation advisory OpenTelemetry JS published. This is what lets a log call anywhere in a request's call stack automatically inherit the current trace ID and any tags set earlier in that request, with no manual threading of a context object through function signatures — the mechanism that makes "configure additional tags/attributes" (ADR-00016's original requirement) actually scale.

### Auto-instrumentation

1. **Hand-list individual instrumentation packages** (`@opentelemetry/instrumentation-pg`, `-http`, etc.) as each becomes relevant. Real drift risk: the day a package starts using a new library with an available instrumentation, someone has to remember to add it here — a coordination gap between what packages actually do and what this package knows to watch.
2. **`@opentelemetry/auto-instrumentations-node`** — a catch-all meta-package that detects and enables whichever supported libraries are actually present in the dependency tree. **Chosen**, specifically to avoid the drift risk above, and because it also resolves per-app variation (a future `apps/worker` instrumenting a queue client instead of an HTTP server) without per-app configuration.

Auto-instrumentation patches modules by hooking Node's module loader process-wide (`require-in-the-middle`/`import-in-the-middle`), not by reaching into a specific package's `node_modules` — so it doesn't matter which `package.json` declares a target library like `pg`, only that instrumentation registration completes before that library is first loaded anywhere in the process. This is exactly what Next.js's `instrumentation.ts` already guarantees (documented to complete before the server handles its first request), which is what makes centralizing instrumentation into this package safe regardless of where a target library like `pg` is actually declared.

### Facade design

**Decision**: the package's public surface must encode real opinions — auto-attached tags, redaction-aware logging helpers, OTel's actual severity-number mapping (not an arbitrary string) — not a transparent `export * from "@opentelemetry/api"`. A flat re-export would technically satisfy "apps don't install OTel directly" while forfeiting the actual value of having a facade at all. The exact interface shape is intentionally not finalized in this ADR — it needs careful design during implementation, informed by real call sites, not decided in the abstract here.

### Package boundary mechanics (Next.js-specific)

Two concrete consequences of centralizing everything here, surfaced during design and worth recording rather than discovering mid-implementation:

- **Multi-entry-point `exports` map required.** Next.js's `instrumentation.ts` can run in either the Node.js or Edge runtime, and most OTel SDK internals are Node-only. A single flat export can't serve both safely. This needs the same shape `packages/auth` already uses for `./server`/`./client`, likely extended to a Node/Edge/browser-safe split, with `server-only` guards reused on server-only entry points for the same reason `packages/db`/`packages/auth` already carry them — this repo already has real client-bundle-bloat protection precedent to extend, not invent.
- **Bundler-externalization is a real leak in the abstraction.** Auto-instrumentation's dynamic `require()` calls need to be excluded from bundling (Next.js's `serverExternalPackages`), which lives in `apps/web`'s `next.config.js` and needs actual vendor package names (`pg`, `pino`, instrumentation packages) — even though `apps/web` never imports any of them directly anymore. This repo has hit the identical shape of problem once already: `next.config.js`'s `transpilePackages` must list every internal `@starter/*` package `apps/web` imports, and omitting one produces a `Module not found` specifically in the server bundle (documented in `apps/web/AGENTS.md`, tied to ADR-00011). The resolution here follows the same shape: `packages/observability` exports its own list of packages needing externalization, and `next.config.js` imports and spreads that list rather than hardcoding it — `apps/web` still doesn't _maintain_ the list, it just has to plumb it through, which is unavoidable given where `next.config.js` has to physically live.

### Testing

1. **Rely solely on `services/otel-collector`'s `telemetrygen`-based integration tests (ADR-00018).** Verifies the pipeline, not the package — too slow and too indirect for everyday package-level correctness.
2. **`InMemorySpanExporter`-style in-memory exporters** (OTel ships equivalents for logs) wired to a real `TracerProvider`/`LoggerProvider` for fast, deterministic unit tests of the package itself. **Chosen**, as a distinct, complementary layer to ADR-00018's integration suite — reset the exporter between tests to avoid cross-test leakage, and keep these tests separate from business-logic tests so a span-naming change doesn't fail unrelated code.
3. **The redaction-sync test** (ADR-00017, ADR-00018): a shared canonical list of sensitive-field test cases, consumed by both this package's unit tests (exercising Sentry's `beforeSend` hook directly) and `services/otel-collector`'s integration suite (exercising the Collector's redaction processor) — so a pattern added to the canonical list creates a test obligation on both sides, and the two redaction implementations can't silently drift apart.

### Error handling

A global exception handler (`process.on('uncaughtException')`/`process.on('unhandledRejection')`), registered as part of `setup()`, calling `Sentry.captureException()` directly per ADR-00017's dual-path decision, alongside normal OTel error-status recording on the active span/log.

## Decision

Combining the above: `packages/observability` is the sole point of contact for every app/package that needs to log, trace, or record a metric. Internally it's built on `@opentelemetry/api`/`api-logs` (workspace-catalog-pinned peer dependencies) plus Pino, wraps SDK instantiation behind a one-time `setup()` call, uses `AsyncLocalStorageContextManager` for context propagation, `@opentelemetry/auto-instrumentations-node` for auto-detected instrumentation, and exposes a genuinely curated facade (not a re-export) across a multi-entry-point `exports` map mirroring `packages/auth`'s existing pattern. It also exports its own bundler-externalization list for `next.config.js` to consume. Tested via in-memory exporters for the package itself, plus the shared redaction-sync suite with ADR-00018.

## Consequences

- The exact facade interface (function names, what gets auto-tagged, what the leveled API looks like) is explicitly not decided here — real design work remains, to be done with actual call sites in front of it, not in the abstract.
- Two empirical risks are carried forward from earlier design discussion, not yet resolved, and should be verified before this is considered done: Pino's transport mechanism (often worker-thread-based) resolving its target file correctly under Next.js's bundling; and `serverExternalPackages` actually covering what Turbopack specifically needs, since prior guidance on this was written against older webpack-based bundling.
- Every future app or package that logs anything — including `packages/db`, `packages/auth`, or a future `apps/worker` — depends on this package, not on `@opentelemetry/api` or Pino directly. This is a standing constraint from this point forward, not a one-time setup choice for `apps/web`.

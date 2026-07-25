# ADR-00003: Web Application Language & Architecture

Status: Accepted
Date: 2026-07-24

## Context

ADR-00000 sets the constraints this decision has to satisfy: work well from a solo developer up to ~50 engineers, treat AI-tooling effectiveness as first-class, and default to an opinionated production-ready path rather than a menu of options. ADR-00001 already committed to a monorepo. This ADR picks the language and application architecture for the core product itself.

Two inputs shaped this more than generic best-practice comparison:

- **Lived experience, not just taste.** Elixir is technically appealing (concurrency, speed) but has caused real trouble in the past: difficulty hiring qualified engineers, and repeatedly having to write custom integration libraries because the ecosystem is thin for common third-party integrations. Ruby/Rails is avoided on the belief that it's harder to keep a large codebase clean over time.
- **A hard requirement for static typing**, specifically because it makes tooling and static analysis easier — this is a first-class filter, not a preference to weigh against others.

## Options Considered — Language

1. **TypeScript** (Node) — largest ecosystem and hiring pool of any candidate (directly addresses the Elixir pain points above), strong static typing, and by far the deepest AI coding-agent fluency of any language today (most LLM training data), which matters given ADR-00000's explicit AI-tooling goal.
2. **Go** — strongly typed, decent hiring pool, but a thinner ecosystem for SaaS/business-app concerns (billing, auth providers, third-party integrations) than TypeScript — risks reintroducing the "write my own integration library" problem from Elixir.
3. **Kotlin/Java (Spring)** — strongly typed, extremely mature, best-in-class OpenAPI tooling, proven at the high end of our target scale — but heavier ceremony and a slower iteration loop, which hurts the solo-dev end of the range.
4. **Ruby (Rails)** — excellent productivity, but excluded on the large-codebase-cleanliness concern above.
5. **Python (Django/FastAPI)** — strong ecosystem, but dynamically typed, which fails the static-typing requirement.
6. **Elixir (Phoenix)** — excluded on hiring and ecosystem-thinness grounds from direct prior experience, despite genuine technical strengths.

**Decision: TypeScript.** It's the only candidate that simultaneously satisfies the static-typing requirement, has the deepest ecosystem (mitigating the exact integration-library pain that ruled out Elixir), the largest hiring pool, and the strongest AI-tooling fluency.

## Options Considered — Application Architecture

Given TypeScript, the real fork is how the frontend relates to the backend:

1. **(A) Plain SPA + separate API from day one** — full separation, but no server rendering, so no first-load performance/SEO benefit without a second app for marketing pages. No framework tension, but pays a real separation cost immediately for a need (a second API consumer) that doesn't exist yet.
2. **(B) Metaframework as a BFF in front of a separate, documented API** — a Next.js/Remix-style app owns SSR/hydration, but its server-side data loading is a thin proxy to a genuinely separate, independently-documented API. Preserves strong separation and gets SSR benefits, but works against the framework's own grain (Next.js in particular is increasingly built around colocated Server Components/Server Actions as the primary way to mutate data) and pays the API-documentation/versioning cost for consumers that don't exist yet.
3. **(C) Colocated metaframework, no separate API until a real second client exists** — a single `apps/web` (Next.js) is both frontend and backend; server-side data loading and mutations use the framework's own conventions directly. TypeScript's end-to-end type checking (a server function's return type flows directly into the component that calls it) serves as the safety contract in place of a formal spec, since there's only one codebase. A documented API surface is deliberately deferred until a real second consumer (see below) requires it.

**Decision: (C).** This is the option that doesn't fight the framework, and it matches ADR-00000's explicit bias against designing for hypothetical future requirements — most products only have one client (the web app) for a long time, and paying separation/documentation costs for a consumer that doesn't exist yet is premature optimization. TypeScript's type system substitutes for a formal API contract for first-party, same-codebase consumers.

### What actually triggers building a documented API later

- A **PWA is not a trigger.** It's an additive layer on the same web app (manifest + service worker for installability/offline/push) — same origin, same routes, no separate client.
- A **genuine native mobile app is a trigger.** It cannot call Next.js Server Actions the way `apps/web`'s own components can. When this becomes real (not before), it justifies building a deliberate, documented API surface (Route Handlers / REST+OpenAPI, or tRPC if staying TS-to-TS) for that specific need — not a general-purpose API built speculatively today.
- If/when a native app is built, it should be **React Native via Expo**, not Flutter or fully native Swift/Kotlin — this is what lets the mobile app share `packages/domain`, `packages/schemas`, and a typed API client with the rest of the TypeScript monorepo, avoiding the exact duplicate-implementation problem that ruled out Elixir.

## Rendering Strategy

Not a single mode — chosen per route:

- **SSR/SSG** for public, unauthenticated pages (marketing, docs) where SEO and first-load speed matter and a crawler needs real HTML.
- **More CSR-leaning** for the authenticated application itself — there's nothing for a crawler to index once a user is logged in, so prioritizing interactivity over first-paint SEO is the right tradeoff there.

## Consequences

- We accept "fighting the framework" is avoided, but we accept a real, deliberate deferral: if/when a second client shows up, someone has to do the work of carving out and documenting a real API surface at that time, rather than it already existing.
- Framework lock-in to Next.js's own conventions for server logic is accepted as the cost of not building option (B)'s extra separation layer.
- `apps/web`'s internal data-loading functions are not a public contract and should never be treated as one by another service or client — only deliberately-built, documented endpoints are.
- See ADR-00004 for how this plays out across multiple apps (worker, admin, mobile) and shared packages.

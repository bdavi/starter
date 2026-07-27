# ADR-00012: Authentication Architecture

Status: Accepted
Date: 2026-07-27

## Context

Authentication needs to work across the customer-facing web app, a future admin web app, and a future mobile app via OAuth — three consumers with genuinely different security models, not one mechanism stretched across all of them. Extended discussion covered current best practice for each: session cookies vs. client-stored JWTs for browser apps, and OAuth 2.0 + PKCE for mobile, specifically the first-party case (same organization owns both the mobile app and the backend), where the IETF's "OAuth 2.0 for First-Party Native Applications" draft formalizes a direct, browser-less credential-collection flow via an Authorization Challenge Endpoint — distinct from and lighter than building a full third-party-style OAuth authorization server, which is only necessary for a public developer platform (not our case).

## Options Considered

1. **Better Auth** — TypeScript-first, no vendor lock-in, self-hostable, plugin architecture (2FA, organizations/multi-tenancy, magic links, passkeys — all directly relevant to a SaaS starter), real first-party support for React Native/Expo via an official plugin. Emerged late 2025, has quickly become the pragmatic 2026 default for new Next.js App Router projects. Chosen.
2. **Auth.js (NextAuth v5)** — still the most widely deployed option (~2.5M weekly downloads), fully capable, JWT-only or database-session strategies. Passed over in favor of Better Auth's plugin ecosystem and more explicit control over session/schema shape, not because it's deficient.
3. **Lucia** — pivoted to being a low-level session-management primitive rather than a full auth library; would mean hand-building OAuth, schema, and provider handling ourselves. Rejected as more scope than this template should own.
4. **Managed platforms** (Clerk, Auth0, WorkOS) — handle MFA, social login, and sometimes org/RBAC out of the box, cost scales with MAUs. Rejected as the _template's_ default for the same reason the OTel backend and message-broker choices were kept vendor-neutral: baking a specific paid vendor into a reusable starter couples every downstream product to that vendor's pricing. A real product built from this template choosing a managed platform instead is a perfectly reasonable, easy substitution — just not the template's own default.

## Decision

**Better Auth, in its own `packages/auth`.** Concretely:

- **Session model**: httpOnly, Secure, SameSite cookies for browser apps (web now, admin later), validated server-side against Postgres via the Drizzle adapter (ADR-00011) — not client-stored JWTs, which are exposed to XSS-based theft in a way httpOnly cookies aren't.
- **`packages/auth` exports two separate subpaths, deliberately not one barrel**: `@starter/auth/server` (the Better Auth instance, DB access, secrets) and `@starter/auth/client` (browser-safe `createAuthClient()` helpers). A single combined export would leak server-only secrets and the Drizzle/`pg` dependency into the client bundle the moment any app imported it for `useSession`.
- **The `betterAuth({...})` config is structured as a reusable instance, not hardcoded to one app** — a future `apps/admin` imports the same instance (shared user identity) and layers a stricter session policy on top, rather than duplicating auth setup. Admin/customer privilege separation itself (should they be fully separate trust boundaries?) is named here as a real open question, not resolved — there's no `apps/admin` yet to make the decision concrete against.
- **Mobile** (not built yet): the eventual first-party OAuth+PKCE flow is a real future consumer of this same `packages/auth` instance, using Better Auth's Expo plugin (handles token/session storage, OAuth state, and the deep-link handshake back to the native app after a social-login browser leg) plus the direct/browserless credential flow for first-party email+password or passkey login. Not built now — no `apps/mobile` to build it against yet.
- **Social login (Google) — deferred on direct instruction.** `emailAndPassword` is the only sign-in method wired up in this pass. `socialProviders` is the exact, unchanged config key it plugs into later; no restructuring needed when Google credentials exist to test against.

### A real, current Next.js finding that shaped this

Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` and explicitly narrowed its intended use: "designed to be a Thin Proxy for redirects and rewrites, NOT for heavy database calls or complex JWT validation" (the proxy runtime is fixed to Node.js and no longer configurable). A database-backed session check — exactly what protecting a route needs — therefore does not belong in `proxy.ts`. The protected `/dashboard` example route instead performs its own `auth.api.getSession()` check directly in the (async, Server Component) page, redirecting via `next/navigation`'s `redirect()` if there's no session. No `proxy.ts`/`middleware.ts` exists in this pass — the pattern that actually matters (and scales to more protected routes later) lives in the page itself.

## Consequences

- Every app that needs session/user data takes a real dependency on `@starter/auth` (and, transitively, `@starter/db`) — acceptable per ADR-00004's "apps are thin, packages hold the logic" principle.
- Google/social login, `apps/admin` integration, and the mobile OAuth+PKCE flow are named, real, expected follow-ups — not forgotten scope. Each has a clear seam already in place (`socialProviders`, the reusable auth instance, Better Auth's Expo plugin) rather than needing this ADR's decisions revisited when they land.
- Protected-route logic lives per-page rather than in one central proxy/middleware file — more places to remember to add a check as routes grow, but correctly aligned with Next.js 16's own guidance against DB calls in the proxy layer. Worth a shared helper (e.g. a `requireSession()` utility in `packages/auth`) once enough protected routes exist to make the duplication real, not preemptively now.

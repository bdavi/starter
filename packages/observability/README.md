# @starter/observability

Centralized logging/tracing/metrics/error-reporting, on OpenTelemetry, used by every app in this repo. See [ADR-00020](../../docs/adrs/00020-packages-observability-design.md); the broader system (Collector, backends, redaction) is [ADR-00016](../../docs/adrs/00016-opentelemetry-adoption-and-observability-requirements.md) through [ADR-00019](../../docs/adrs/00019-non-ts-service-pattern.md).

## Usage

Three subpaths:

```ts
// Universal-safe — client or server, before or after setup() has run.
// Falls back to console output if setup() hasn't registered a real logger yet.
import { logger, withTags } from "@starter/observability";

// Node-only, real SDK — call setup() exactly once, from an app's true
// entry point (e.g. instrumentation.ts), before any other app code runs.
import { setup } from "@starter/observability/node";

// Dependency-free — for next.config.js, which runs under plain Node
// before any bundler exists (see AGENTS.md).
import { OBSERVABILITY_EXTERNAL_PACKAGES } from "@starter/observability/external-packages";
```

See `apps/web/src/instrumentation.ts`, `apps/web/next.config.js`, and `apps/web/src/app/api/health/route.ts` for real, working usage of all three.

## Commands

```
pnpm nx test observability
pnpm nx lint observability
pnpm nx typecheck observability
```

## Environment

`OTEL_REDACTION_HMAC_KEY` is validated in `src/lib/env.ts` (via `@starter/config`'s `createEnvGetter`) — must be ≥32 bytes, the same key `services/otel-collector` uses, generated the same way (`openssl rand -hex 32`). A consuming app owns its own `otlpEndpoint`/`serviceName`/`sentryDsn` (passed as `setup()` arguments, not read by this package) — see `apps/web/src/env.ts` for that pattern.

## Testing

`src/lib/redaction.spec.ts` reads `services/otel-collector/test/redaction-vectors.json` directly — the same canonical test-vector list both the Collector's own Go-side redaction and this package's TypeScript-side redaction (the direct-to-Sentry path) are verified against, so a pattern added to that list without a matching implementation on either side fails on whichever side is missing it (ADR-00018/00020).

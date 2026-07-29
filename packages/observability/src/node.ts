// Node-only entry point (`@starter/observability/node`) — the real SDK.
// Only import this from an app's true entry point (e.g. apps/web's
// instrumentation.ts, guarded there by `NEXT_RUNTIME === "nodejs"` so it
// never loads under the Edge runtime). See ADR-00020.

import "server-only";

export { setup, type SetupOptions } from "./lib/setup";
export { OBSERVABILITY_EXTERNAL_PACKAGES } from "./lib/external-packages";
export { logger } from "./lib/logger";
export { withTags, getActiveTags } from "./lib/tags";

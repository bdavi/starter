// Universal-safe entry point (`@starter/observability`) — safe to import
// from anywhere, including before setup() (./node.ts) has run. Never
// import the SDK/Pino/Sentry packages here — see ADR-00020.

export { logger } from "./lib/logger";
export { withTags, getActiveTags } from "./lib/tags";

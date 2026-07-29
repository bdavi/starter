// Internal only — not exported from index.ts or node.ts. Holds whatever
// real logger `setup()` (node.ts) installs, so the universal-safe facade
// in logger.ts can delegate to it without importing Pino's runtime code
// itself. See ADR-00020: the facade must stay safe to import anywhere,
// even before setup() has run.
//
// State lives on globalThis (keyed by a Symbol.for(), not a module-scoped
// `let`) because this module can end up loaded as more than one instance
// in the same process: apps/web's next.config.js puts this package in
// transpilePackages, and Next/Turbopack compiles each of its entry points
// (instrumentation.ts vs. an individual route handler) into separate
// chunks that don't necessarily share module state, even though they're
// the same file on disk. Symbol.for() returns the identical symbol across
// those separate instances (unlike a plain module-scoped variable), so
// they all read/write the same globalThis slot regardless of which
// compiled copy of this file is running. Verified empirically against a
// real `next build && next start` — a module-scoped singleton here
// produced a false "no logger registered" fallback in a route handler
// even though setup() had already run (see git history for how this was
// diagnosed).

export type LogFields = Record<string, unknown>;

export interface ActiveLogger {
  debug(fields: LogFields, message: string): void;
  info(fields: LogFields, message: string): void;
  warn(fields: LogFields, message: string): void;
  error(fields: LogFields, message: string): void;
}

const GLOBAL_KEY = Symbol.for("@starter/observability:active-logger");

interface GlobalWithActiveLogger {
  [GLOBAL_KEY]?: ActiveLogger;
}

function getGlobal(): GlobalWithActiveLogger {
  return globalThis as GlobalWithActiveLogger;
}

export function registerActiveLogger(logger: ActiveLogger): void {
  getGlobal()[GLOBAL_KEY] = logger;
}

export function getActiveLogger(): ActiveLogger | undefined {
  return getGlobal()[GLOBAL_KEY];
}

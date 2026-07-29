// The universal-safe logging facade — this is what application code
// actually imports. Safe to call before `setup()` (node.ts) has run: it
// falls back to console output rather than throwing or silently
// dropping, so a package that merely imports this doesn't require
// telemetry to already be wired up (the same laziness principle
// packages/config's createEnvGetter already established).
//
// A real facade, not `export * from "@opentelemetry/api"` — every call
// automatically merges in the active request's tags (tags.ts) so callers
// never have to pass them manually. See ADR-00020.

import { getActiveLogger, type LogFields } from "./logger-registry";
import { getActiveTags } from "./tags";

function emit(
  level: "debug" | "info" | "warn" | "error",
  fields: LogFields,
  message: string,
): void {
  const merged = { ...getActiveTags(), ...fields };
  const active = getActiveLogger();
  if (active) {
    active[level](merged, message);
    return;
  }
  // No real logger registered yet (setup() hasn't run) — fall back to
  // console rather than dropping the log or throwing.
  console[level === "debug" ? "debug" : level](message, merged);
}

export const logger = {
  debug: (fields: LogFields, message: string): void =>
    emit("debug", fields, message),
  info: (fields: LogFields, message: string): void =>
    emit("info", fields, message),
  warn: (fields: LogFields, message: string): void =>
    emit("warn", fields, message),
  error: (fields: LogFields, message: string): void =>
    emit("error", fields, message),
};

// Request-scoped tags/attributes, propagated via AsyncLocalStorage so a
// log call anywhere in a request's call stack automatically inherits
// whatever was set earlier in that request — no manual threading of a
// context object through every function signature. See ADR-00020.
//
// Node's AsyncLocalStorage, not a framework-specific mechanism — this is
// the same primitive OpenTelemetry's own Node SDK uses internally for
// trace context propagation.
//
// The AsyncLocalStorage instance itself lives on globalThis (keyed by a
// Symbol.for()), not a module-scoped `const` — see logger-registry.ts's
// comment for why: this package can be loaded as more than one module
// instance in the same process once apps/web's next.config.js puts it in
// transpilePackages, and two different AsyncLocalStorage instances don't
// share context, so withTags() in one instance would be invisible to
// getActiveTags() in another.

import { AsyncLocalStorage } from "node:async_hooks";

type Tags = Record<string, unknown>;

const GLOBAL_KEY = Symbol.for("@starter/observability:tags-storage");

interface GlobalWithTagsStorage {
  [GLOBAL_KEY]?: AsyncLocalStorage<Tags>;
}

function getStorage(): AsyncLocalStorage<Tags> {
  const g = globalThis as GlobalWithTagsStorage;
  g[GLOBAL_KEY] ??= new AsyncLocalStorage<Tags>();
  return g[GLOBAL_KEY];
}

/**
 * Runs `fn` with `tags` merged into whatever tags are already active
 * (nested calls add to, rather than replace, the outer scope's tags).
 */
export function withTags<T>(tags: Tags, fn: () => T): T {
  const storage = getStorage();
  const merged = { ...(storage.getStore() ?? {}), ...tags };
  return storage.run(merged, fn);
}

/** The tags active in the current async context, if any. */
export function getActiveTags(): Tags {
  return getStorage().getStore() ?? {};
}

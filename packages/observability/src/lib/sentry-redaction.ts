// Sentry's beforeSend hook for the direct-SDK error path (ADR-00017's
// dual path — the other half is the Collector's own redaction processor,
// which never sees data sent this way). Deep-redacts every string value
// in the event, matching the Collector's allow_all_keys: true + scan-all
// -values approach rather than requiring an explicit per-field allowlist.

import { redactString } from "./redaction";

function deepRedact<T>(value: T, hmacKey: string): T {
  if (typeof value === "string") {
    return redactString(value, hmacKey) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => deepRedact(item, hmacKey)) as T;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = deepRedact(val, hmacKey);
    }
    return result as T;
  }
  return value;
}

/**
 * Pass to Sentry.init({ beforeSend: createSentryRedactor(hmacKey) }).
 * Same hmacKey the Collector uses (OTEL_REDACTION_HMAC_KEY) — using a
 * different key would still redact, just with hashes that can't be
 * correlated against the Collector-routed path's output.
 */
export function createSentryRedactor(
  hmacKey: string,
): (event: Record<string, unknown>) => Record<string, unknown> {
  return (event) => deepRedact(event, hmacKey);
}

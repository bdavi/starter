// Node-only (uses node:crypto) — mirrors services/otel-collector's
// redaction processor config (config/collector.yaml) exactly: same
// patterns, same hmac-sha256 algorithm, same "hash don't delete"
// rationale (ADR-00018). This is what packages/observability's Sentry
// beforeSend hook (sentry-redaction.ts) uses for the direct-SDK error
// path (ADR-00017's dual path) — the Collector-routed path is redacted
// by the Collector itself, this path needs its own implementation since
// it never touches the Collector.
//
// Keep these patterns in sync with config/collector.yaml's
// `redaction.blocked_values` by hand — there's no shared source both a
// Go/YAML config and this TS module can both consume directly. The
// redaction-sync test (redaction.spec.ts) is what actually catches drift
// between the two, by running both against the same canonical test
// vectors (services/otel-collector/test/redaction-vectors.json), not
// this comment.

import { createHmac } from "node:crypto";

export const SENSITIVE_PATTERNS: { kind: string; pattern: RegExp }[] = [
  { kind: "ipv4", pattern: /(?:\d{1,3}\.){3}\d{1,3}/g },
  {
    // Deliberately not a full RFC 5322 validator — this only needs to
    // recognize "looks like an email" well enough to redact it. Three flat
    // (non-nested) quantified segments around literal "@"/"." anchors, no
    // group is itself repeated, so there's no nested-quantifier shape for
    // catastrophic backtracking to exploit. Verified empirically (adversarial
    // strings up to 100 chars with no matching "." after "@") that this
    // stays sub-millisecond — sonarjs's static heuristic still flags any
    // A+.B+ shape regardless of actual ambiguity cost, which is a false
    // positive here.
    kind: "email",
    // eslint-disable-next-line sonarjs/super-linear-regex
    pattern: /[^\s@]+@[^\s@]+\.[^\s@]+/g,
  },
];

/** Same algorithm as the Collector's `hash_function: hmac-sha256`. */
export function hashSensitiveValue(value: string, hmacKey: string): string {
  return createHmac("sha256", hmacKey).update(value).digest("hex");
}

/**
 * Replaces every substring matching a sensitive pattern with its HMAC
 * hash, leaving the rest of the string untouched. Deterministic — the
 * same input always hashes the same, preserving correlation (ADR-00018).
 */
export function redactString(input: string, hmacKey: string): string {
  let result = input;
  for (const { pattern } of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, (match) =>
      hashSensitiveValue(match, hmacKey),
    );
  }
  return result;
}

// The redaction-sync test (ADR-00017/00018/00020): verifies this
// package's redaction — the direct-SDK Sentry error path — catches the
// same sensitive-value patterns as services/otel-collector's redaction
// processor, by running against the exact same canonical test vectors
// that Collector-side suite (test/verify.sh) uses. A pattern added to
// the shared vectors file without a matching implementation update here
// (or there) fails on whichever side is missing it — that's the point.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hashSensitiveValue, redactString } from "./redaction";
import { createSentryRedactor } from "./sentry-redaction";

interface Vector {
  kind: string;
  value: string;
  description: string;
}

const VECTORS_PATH = join(
  __dirname,
  "../../../../services/otel-collector/test/redaction-vectors.json",
);

function loadVectors(): Vector[] {
  const raw = readFileSync(VECTORS_PATH, "utf-8");
  return (JSON.parse(raw) as { vectors: Vector[] }).vectors;
}

const HMAC_KEY = "test-key-at-least-32-bytes-long-for-hmac-sha256";

describe("redaction (sync with services/otel-collector)", () => {
  const vectors = loadVectors();

  it("loaded the shared canonical vectors file (sanity check the path resolves)", () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  it.each(vectors)(
    "redacts $kind ($description) out of a plain string",
    ({ value }) => {
      const result = redactString(`prefix ${value} suffix`, HMAC_KEY);
      expect(result).not.toContain(value);
      expect(result).toContain("prefix");
      expect(result).toContain("suffix");
    },
  );

  it.each(vectors)(
    "hashes $kind identically across two separate calls (correlation preserved)",
    ({ value }) => {
      const first = hashSensitiveValue(value, HMAC_KEY);
      const second = hashSensitiveValue(value, HMAC_KEY);
      expect(first).toBe(second);
    },
  );

  it("produces different hashes for different vectors (not a degenerate always-same-output config)", () => {
    const hashes = vectors.map((v) => hashSensitiveValue(v.value, HMAC_KEY));
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  describe("Sentry beforeSend deep redaction", () => {
    const redact = createSentryRedactor(HMAC_KEY);

    it.each(vectors)(
      "redacts $kind ($description) nested inside a realistic event object",
      ({ value }) => {
        const event = {
          message: `something happened near ${value}`,
          exception: {
            values: [{ type: "Error", value: `failed for ${value}` }],
          },
          extra: { note: value, unrelated: 42 },
        };

        const redacted = redact(event);
        const serialized = JSON.stringify(redacted);
        expect(serialized).not.toContain(value);
        // unrelated, non-sensitive data must survive untouched
        expect((redacted.extra as Record<string, unknown>).unrelated).toBe(42);
      },
    );
  });
});

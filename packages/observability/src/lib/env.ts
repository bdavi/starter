import "server-only";
import { z } from "zod";
import { createEnvGetter } from "@starter/config";

const observabilityEnvSchema = z.object({
  OTEL_REDACTION_HMAC_KEY: z.string().min(32),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export const getObservabilityEnv = createEnvGetter(observabilityEnvSchema);

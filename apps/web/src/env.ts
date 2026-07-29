import "server-only";
import { z } from "zod";
import { createEnvGetter } from "@starter/config";

const webEnvSchema = z.object({
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url(),
  SENTRY_DSN: z.string().url().optional(),
});

export const getWebEnv = createEnvGetter(webEnvSchema);

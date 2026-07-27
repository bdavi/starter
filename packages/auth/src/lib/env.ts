import "server-only";
import { z } from "zod";
import { createEnvGetter } from "@starter/config";

const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
});

export const getAuthEnv = createEnvGetter(authEnvSchema);

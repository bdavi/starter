import { z } from "zod";
import { createEnvGetter } from "@starter/config";

const dbEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
});

export const getDbEnv = createEnvGetter(dbEnvSchema);

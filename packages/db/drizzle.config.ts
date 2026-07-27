import { defineConfig } from "drizzle-kit";
import { getDbEnv } from "./src/lib/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: getDbEnv().DATABASE_URL,
  },
});

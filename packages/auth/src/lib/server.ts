import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@starter/db";
import { getAuthEnv } from "./env";

// A reusable config, not hardcoded to one app — apps/web uses this as-is;
// a future apps/admin can import this same instance (shared user identity)
// and layer a stricter session policy on top rather than duplicating
// this setup. See ADR-00012.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: getAuthEnv().BETTER_AUTH_SECRET,
  baseURL: getAuthEnv().BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  // socialProviders intentionally empty for now — Google needs an external
  // OAuth client we don't have credentials for yet. Same `socialProviders`
  // key is where it plugs in later; no restructuring needed.
});

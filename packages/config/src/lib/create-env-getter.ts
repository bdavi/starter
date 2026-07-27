import { z } from "zod";

// A factory, not a fixed schema: env vars are scoped to whichever package
// actually needs them (packages/db validates DATABASE_URL, packages/auth
// validates its own secret/URL, etc.) rather than one shared schema that
// hands every consumer every secret in the system regardless of whether it
// uses them. See ADR-00013.
export function createEnvGetter<Schema extends z.ZodType>(
  schema: Schema,
): () => z.infer<Schema> {
  let cached: z.infer<Schema> | undefined;

  // Lazily validated (not at module load) so importing a package that uses
  // this doesn't itself require those env vars to be present — e.g. a test
  // file exercising something else in that package shouldn't be forced
  // through validation it never actually triggers. Cached after the first
  // real call so validation only runs once per process.
  return () => {
    if (!cached) {
      cached = schema.parse(process.env);
    }
    return cached;
  };
}

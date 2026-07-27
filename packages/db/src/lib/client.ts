import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { getDbEnv } from "./env";

import * as schema from "./schema";

export const db = drizzle(getDbEnv().DATABASE_URL, { schema });

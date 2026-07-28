import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

export function createDb(connectionString: string = process.env.DATABASE_URL ?? "") {
  const pool = new pg.Pool({ connectionString });
  return drizzle(pool, { schema });
}

export type Db = ReturnType<typeof createDb>;

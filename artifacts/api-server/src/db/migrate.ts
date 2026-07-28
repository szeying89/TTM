import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL ?? "";
  const pool = new pg.Pool({ connectionString });
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector");

  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

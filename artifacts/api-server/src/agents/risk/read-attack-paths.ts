import { eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { attackPaths } from "../../db/schema/threats.js";

export async function loadAttackPathsForSystemModel(db: Db, systemModelId: string) {
  return db.select().from(attackPaths).where(eq(attackPaths.systemModelId, systemModelId));
}

import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { intelFeedItems } from "../db/schema/intel.js";

export class IntelFeedsRepository {
  constructor(private readonly db: Db) {}

  async createUrlFeed(projectId: string, url: string) {
    const [item] = await this.db
      .insert(intelFeedItems)
      .values({ projectId, sourceType: "url", sourceRef: url, status: "pending" })
      .returning();
    if (!item) throw new Error("Failed to insert intel_feed_items row");
    return item;
  }

  async createPdfFeed(projectId: string, storedFilePath: string) {
    const [item] = await this.db
      .insert(intelFeedItems)
      .values({ projectId, sourceType: "pdf", sourceRef: storedFilePath, status: "pending" })
      .returning();
    if (!item) throw new Error("Failed to insert intel_feed_items row");
    return item;
  }

  async markFailed(id: string, reason: string) {
    await this.db
      .update(intelFeedItems)
      .set({ status: "failed", failureReason: reason })
      .where(eq(intelFeedItems.id, id));
  }

  async listByProject(projectId: string) {
    return this.db.select().from(intelFeedItems).where(eq(intelFeedItems.projectId, projectId));
  }
}

import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { designDocs, projects } from "../db/schema/projects.js";

export interface CreateProjectInput {
  name: string;
  description?: string;
  criMaturity?: Record<string, string>;
}

export class ProjectsRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateProjectInput) {
    const [project] = await this.db
      .insert(projects)
      .values({
        name: input.name,
        description: input.description ?? "",
        criMaturity: input.criMaturity ?? {},
      })
      .returning();
    if (!project) throw new Error("Failed to insert projects row");
    return project;
  }

  async findById(id: string) {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return project;
  }

  async addDesignDoc(projectId: string, prose: string, mermaidText: string) {
    const [doc] = await this.db
      .insert(designDocs)
      .values({ projectId, prose, mermaidText })
      .returning();
    if (!doc) throw new Error("Failed to insert design_docs row");
    return doc;
  }
}

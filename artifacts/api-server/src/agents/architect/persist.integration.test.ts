import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../db/schema/index.js";
import { persistSystemModel } from "./persist.js";
import type { ArchitectOutput } from "./schema.js";

const runIntegration = !!process.env.DATABASE_URL;

describe.skipIf(!runIntegration)("persistSystemModel (integration)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let runId: string;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    const [project] = await db.insert(schema.projects).values({ name: "Architect persist test" }).returning();
    const [run] = await db.insert(schema.pipelineRuns).values({ projectId: project!.id }).returning();
    runId = run!.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("resolves local ids into a separate trust boundary for the internal tier", async () => {
    const output: ArchitectOutput = {
      components: [
        {
          id: "browser",
          name: "Web Browser",
          type: "actor",
          description: "End user's browser",
          technologies: [],
          trustBoundaryId: "public",
          sourceRefs: ["mermaid:Browser"],
        },
        {
          id: "api",
          name: "API Gateway",
          type: "process",
          description: "Public REST API",
          technologies: ["REST"],
          trustBoundaryId: "public",
          sourceRefs: ["mermaid:API"],
        },
        {
          id: "db",
          name: "Order Database",
          type: "datastore",
          description: "PostgreSQL order database",
          technologies: ["PostgreSQL"],
          trustBoundaryId: "internal",
          sourceRefs: ["mermaid:DB"],
        },
      ],
      dataflows: [
        {
          id: "df1",
          name: "Browser to API",
          sourceComponentId: "browser",
          targetComponentId: "api",
          protocol: "HTTPS",
          crossesTrustBoundaryIds: [],
        },
        {
          id: "df2",
          name: "API to DB",
          sourceComponentId: "api",
          targetComponentId: "db",
          protocol: "SQL",
          crossesTrustBoundaryIds: ["internal"],
        },
      ],
      trustBoundaries: [
        { id: "public", name: "Public-facing tier", componentIds: [] },
        { id: "internal", name: "Internal network", componentIds: [] },
      ],
    };

    const result = await persistSystemModel(db, runId, output);

    expect(result.componentIds).toHaveLength(3);
    expect(result.dataflowIds).toHaveLength(2);
    expect(result.trustBoundaryIds).toHaveLength(2);

    const persistedComponents = await db
      .select()
      .from(schema.components)
      .where(eq(schema.components.systemModelId, result.systemModelId));

    const dbComponent = persistedComponents.find((c) => c.name === "Order Database");
    const apiComponent = persistedComponents.find((c) => c.name === "API Gateway");
    expect(dbComponent?.trustBoundaryId).toBeDefined();
    expect(apiComponent?.trustBoundaryId).toBeDefined();
    expect(dbComponent?.trustBoundaryId).not.toBe(apiComponent?.trustBoundaryId);

    const persistedBoundaries = await db
      .select()
      .from(schema.trustBoundaries)
      .where(eq(schema.trustBoundaries.systemModelId, result.systemModelId));
    const internalBoundary = persistedBoundaries.find((b) => b.name === "Internal network");
    expect(internalBoundary?.componentIds).toEqual([dbComponent!.id]);

    const persistedDataflows = await db
      .select()
      .from(schema.dataflows)
      .where(eq(schema.dataflows.systemModelId, result.systemModelId));
    const apiToDb = persistedDataflows.find((d) => d.name === "API to DB");
    expect(apiToDb?.crossesTrustBoundaryIds).toEqual([internalBoundary!.id]);
  });
});

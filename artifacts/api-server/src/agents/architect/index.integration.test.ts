import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema/index.js";
import type { LLMClient, StructuredCompletionRequest, StructuredCompletionResponse } from "@intel-threat-modeller/llm-client";
import { createArchitectAgentDescriptor } from "./index.js";
import { ArchitectOutput } from "./schema.js";

const runIntegration = !!process.env.DATABASE_URL;
const FIXTURE_DIR = path.join(process.cwd(), "..", "..", "fixtures", "design-docs");

class CannedLLMClient implements LLMClient {
  async complete(): Promise<never> {
    throw new Error("not used in this test");
  }

  async completeStructured<T>(_req: StructuredCompletionRequest<T>): Promise<StructuredCompletionResponse<T>> {
    const output: ArchitectOutput = {
      components: [
        {
          id: "Browser",
          name: "Web Browser",
          type: "actor",
          description: "End user's browser",
          technologies: [],
          trustBoundaryId: "Public",
          sourceRefs: ["mermaid:Browser"],
        },
        {
          id: "API",
          name: "API Gateway",
          type: "process",
          description: "Public REST API",
          technologies: ["REST"],
          trustBoundaryId: "Public",
          sourceRefs: ["mermaid:API"],
        },
        {
          id: "DB",
          name: "Order Database",
          type: "datastore",
          description: "PostgreSQL order database",
          technologies: ["PostgreSQL"],
          trustBoundaryId: "Internal",
          sourceRefs: ["mermaid:DB"],
        },
      ],
      dataflows: [
        {
          id: "df1",
          name: "Browser to API",
          sourceComponentId: "Browser",
          targetComponentId: "API",
          protocol: "HTTPS",
          crossesTrustBoundaryIds: [],
        },
        {
          id: "df2",
          name: "API to DB",
          sourceComponentId: "API",
          targetComponentId: "DB",
          protocol: "SQL",
          crossesTrustBoundaryIds: ["Internal"],
        },
      ],
      trustBoundaries: [
        { id: "Public", name: "Public-facing tier", componentIds: [] },
        { id: "Internal", name: "Internal network", componentIds: [] },
      ],
    };
    return { data: ArchitectOutput.parse(output) as T, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}

describe.skipIf(!runIntegration)("architect agent (integration, mocked LLM)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("parses the 3-tier fixture, calls the LLM, and persists a system model with a separate internal boundary", async () => {
    const prose = readFileSync(path.join(FIXTURE_DIR, "three-tier-app.md"), "utf-8");
    const mermaidText = readFileSync(path.join(FIXTURE_DIR, "three-tier-app.mmd"), "utf-8");

    const [project] = await db.insert(schema.projects).values({ name: "Architect e2e test" }).returning();
    await db.insert(schema.designDocs).values({ projectId: project!.id, prose, mermaidText });
    const [run] = await db.insert(schema.pipelineRuns).values({ projectId: project!.id }).returning();

    const descriptor = createArchitectAgentDescriptor({ db, llmClient: new CannedLLMClient() });
    const result = await descriptor.handler({ runId: run!.id });

    expect(result.outputRefs.some((r) => r.startsWith("system_model:"))).toBe(true);
    expect(result.outputRefs.filter((r) => r.startsWith("component:"))).toHaveLength(3);
    expect(result.outputRefs.filter((r) => r.startsWith("dataflow:"))).toHaveLength(2);
    expect(result.outputRefs.filter((r) => r.startsWith("trust_boundary:"))).toHaveLength(2);

    const persistedComponents = await db.select().from(schema.components);
    const dbComponent = persistedComponents.find((c) => c.name === "Order Database");
    const apiComponent = persistedComponents.find((c) => c.name === "API Gateway");
    expect(dbComponent?.trustBoundaryId).not.toBe(apiComponent?.trustBoundaryId);
  });

  it("throws when the pipeline run's project has no design doc", async () => {
    const [project] = await db.insert(schema.projects).values({ name: "No design doc project" }).returning();
    const [run] = await db.insert(schema.pipelineRuns).values({ projectId: project!.id }).returning();

    const descriptor = createArchitectAgentDescriptor({ db, llmClient: new CannedLLMClient() });
    await expect(descriptor.handler({ runId: run!.id })).rejects.toThrow(/No design doc found/);
  });
});

describe.skipIf(process.env.RUN_LIVE_API_TESTS !== "1" || !runIntegration)(
  "architect agent (live Anthropic API)",
  () => {
    it("produces a real, schema-valid system model from the 3-tier fixture", async () => {
      const { AnthropicLLMClient } = await import("@intel-threat-modeller/llm-client");
      const pool2 = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      const db2 = drizzle(pool2, { schema });

      const prose = readFileSync(path.join(FIXTURE_DIR, "three-tier-app.md"), "utf-8");
      const mermaidText = readFileSync(path.join(FIXTURE_DIR, "three-tier-app.mmd"), "utf-8");
      const [project] = await db2.insert(schema.projects).values({ name: "Architect live test" }).returning();
      await db2.insert(schema.designDocs).values({ projectId: project!.id, prose, mermaidText });
      const [run] = await db2.insert(schema.pipelineRuns).values({ projectId: project!.id }).returning();

      const descriptor = createArchitectAgentDescriptor({ db: db2, llmClient: new AnthropicLLMClient() });
      const result = await descriptor.handler({ runId: run!.id });

      expect(result.outputRefs.filter((r) => r.startsWith("component:")).length).toBeGreaterThanOrEqual(3);
      await pool2.end();
    }, 60_000);
  },
);

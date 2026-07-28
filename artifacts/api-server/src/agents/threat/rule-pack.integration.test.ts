import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema/index.js";
import { runRulePack } from "./rule-pack.js";
import type { LoadedSystemModel } from "./read-system-model.js";
import { oneHotVector } from "../../test-utils/vector-fixtures.js";

const runIntegration = !!process.env.DATABASE_URL;

describe.skipIf(!runIntegration)("runRulePack (integration)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  const seedTechnique = async (techniqueId: string) => {
    await db.insert(schema.techniqueChunks).values({
      techniqueId,
      framework: "enterprise",
      name: techniqueId,
      tactic: "Initial Access",
      chunkType: "description",
      chunkText: "test fixture chunk",
      embedding: oneHotVector(1),
      contentHash: `test-${techniqueId}-${Math.random()}`,
    });
  };

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    await seedTechnique("T1557");
    await seedTechnique("T1078");
    await seedTechnique("T1190");
  });

  afterAll(async () => {
    await pool.end();
  });

  const componentId = (id: string) => id; // component ids are already real DB-looking strings in this fixture

  it("emits an unencrypted-boundary-crossing finding for a plaintext cross-boundary dataflow", async () => {
    const systemModel: LoadedSystemModel = {
      systemModelId: "sm1",
      components: [
        { id: "browser", systemModelId: "sm1", name: "Browser", type: "actor", description: "", technologies: [], trustBoundaryId: null, sourceRefs: [] },
        { id: "api", systemModelId: "sm1", name: "API", type: "process", description: "", technologies: [], trustBoundaryId: "tb1", sourceRefs: [] },
      ] as unknown as LoadedSystemModel["components"],
      dataflows: [
        {
          id: "df1",
          systemModelId: "sm1",
          name: "Browser to API",
          sourceComponentId: componentId("browser"),
          targetComponentId: componentId("api"),
          protocol: "HTTP",
          dataClassification: null,
          crossesTrustBoundaryIds: ["tb1"],
        },
      ] as unknown as LoadedSystemModel["dataflows"],
      trustBoundaries: [] as unknown as LoadedSystemModel["trustBoundaries"],
    };

    const results = await runRulePack({ db, framework: "enterprise", systemModel });
    const finding = results.find((r) => r.name.includes("Unencrypted trust-boundary crossing"));
    expect(finding).toBeDefined();
    expect(finding?.strideCategories).toEqual(["tampering", "information-disclosure"]);
    expect(finding?.groundingRefs[0]?.techniqueId).toBe("T1557");
    expect(finding?.applicability).toBe("applicable");
  });

  it("does not flag an encrypted cross-boundary dataflow", async () => {
    const systemModel: LoadedSystemModel = {
      systemModelId: "sm1",
      components: [
        { id: "browser", systemModelId: "sm1", name: "Browser", type: "actor", description: "", technologies: [], trustBoundaryId: null, sourceRefs: [] },
        { id: "api", systemModelId: "sm1", name: "API", type: "process", description: "", technologies: [], trustBoundaryId: "tb1", sourceRefs: [] },
      ] as unknown as LoadedSystemModel["components"],
      dataflows: [
        {
          id: "df1",
          systemModelId: "sm1",
          name: "Browser to API",
          sourceComponentId: "browser",
          targetComponentId: "api",
          protocol: "HTTPS",
          dataClassification: null,
          crossesTrustBoundaryIds: ["tb1"],
        },
      ] as unknown as LoadedSystemModel["dataflows"],
      trustBoundaries: [] as unknown as LoadedSystemModel["trustBoundaries"],
    };

    const results = await runRulePack({ db, framework: "enterprise", systemModel });
    expect(results.some((r) => r.name.includes("Unencrypted trust-boundary crossing"))).toBe(false);
  });

  it("flags a datastore directly reachable from an actor and an unauthenticated process ingress", async () => {
    const systemModel: LoadedSystemModel = {
      systemModelId: "sm1",
      components: [
        { id: "attacker", systemModelId: "sm1", name: "External Attacker", type: "external_entity", description: "", technologies: [], trustBoundaryId: null, sourceRefs: [] },
        { id: "db", systemModelId: "sm1", name: "Order DB", type: "datastore", description: "", technologies: [], trustBoundaryId: null, sourceRefs: [] },
        { id: "api", systemModelId: "sm1", name: "API", type: "process", description: "", technologies: [], trustBoundaryId: null, sourceRefs: [] },
      ] as unknown as LoadedSystemModel["components"],
      dataflows: [
        { id: "df1", systemModelId: "sm1", name: "Attacker to DB", sourceComponentId: "attacker", targetComponentId: "db", protocol: "TCP", dataClassification: null, crossesTrustBoundaryIds: [] },
        { id: "df2", systemModelId: "sm1", name: "Attacker to API", sourceComponentId: "attacker", targetComponentId: "api", protocol: "HTTPS", dataClassification: null, crossesTrustBoundaryIds: [] },
      ] as unknown as LoadedSystemModel["dataflows"],
      trustBoundaries: [] as unknown as LoadedSystemModel["trustBoundaries"],
    };

    const results = await runRulePack({ db, framework: "enterprise", systemModel });
    expect(results.some((r) => r.name.includes("Direct external access to datastore"))).toBe(true);
    expect(results.some((r) => r.name.includes("Unauthenticated external ingress"))).toBe(true);
  });

  it("produces no findings and no crash when no dataflows cross boundaries or touch external entities", async () => {
    const systemModel: LoadedSystemModel = {
      systemModelId: "sm1",
      components: [
        { id: "svc-a", systemModelId: "sm1", name: "Service A", type: "process", description: "", technologies: [], trustBoundaryId: null, sourceRefs: [] },
        { id: "svc-b", systemModelId: "sm1", name: "Service B", type: "process", description: "", technologies: [], trustBoundaryId: null, sourceRefs: [] },
      ] as unknown as LoadedSystemModel["components"],
      dataflows: [
        { id: "df1", systemModelId: "sm1", name: "A to B", sourceComponentId: "svc-a", targetComponentId: "svc-b", protocol: "HTTPS", dataClassification: null, crossesTrustBoundaryIds: [] },
      ] as unknown as LoadedSystemModel["dataflows"],
      trustBoundaries: [] as unknown as LoadedSystemModel["trustBoundaries"],
    };

    const results = await runRulePack({ db, framework: "enterprise", systemModel });
    expect(results).toEqual([]);
  });
});

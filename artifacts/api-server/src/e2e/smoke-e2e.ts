import { readFileSync } from "node:fs";
import path from "node:path";
import { inArray } from "drizzle-orm";
import { buildApp } from "../app.js";
import { createDb } from "../db/client.js";
import { registerAllAgents } from "../agents/bootstrap.js";
import { clearRegistry } from "../agents/registry.js";
import { techniqueChunks } from "../db/schema/technique-chunks.js";
import { CannedLLMClient } from "./canned-llm-client.js";
import { CannedEmbeddingClient } from "./canned-embedding-client.js";
import { seedFixtureKb } from "./seed-fixture-kb.js";

/**
 * Phase 14 smoke test: runs the full 7-agent pipeline against all 3 fixture design docs
 * (increasing complexity: simple 3-tier, multi-service with an external payment processor,
 * and an ICS/OT scenario) and asserts referential integrity across every persisted contract
 * type - not just that each agent didn't throw, but that every id one contract type cites
 * (a component, an attack path, a technique chunk) actually resolves to a real row. Uses the
 * canned LLM/embedding clients (see canned-llm-client.ts) so it runs deterministically
 * without live API credentials, in CI's fast path.
 *
 * Note: CannedLLMClient's ArchitectOutput response is the same fixed 3-component system
 * regardless of which fixture's prose/Mermaid is uploaded, so this does not verify that the
 * Architect agent's real LLM output is faithful to each fixture's actual complexity - that
 * requires a live Anthropic call (see the nightly live-API job in .github/workflows). What
 * this verifies is that 3 independent projects/runs of increasing intended complexity all
 * flow through every agent and persist a fully cross-referenced graph with no dangling ids.
 */

const FIXTURE_DIR = path.join(process.cwd(), "..", "..", "fixtures", "design-docs");

interface Fixture {
  name: string;
  prose: string;
  mermaidText: string;
  framework: "enterprise" | "ics" | "atlas";
}

function loadFixture(baseName: string, framework: Fixture["framework"]): Fixture {
  return {
    name: baseName,
    prose: readFileSync(path.join(FIXTURE_DIR, `${baseName}.md`), "utf-8"),
    mermaidText: readFileSync(path.join(FIXTURE_DIR, `${baseName}.mmd`), "utf-8"),
    framework,
  };
}

const FIXTURES: Fixture[] = [
  loadFixture("three-tier-app", "enterprise"),
  loadFixture("payment-processor-system", "enterprise"),
  loadFixture("ics-water-treatment", "ics"),
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function main() {
  const db = createDb();
  await seedFixtureKb(db);
  const llmClient = new CannedLLMClient();
  const embeddingClient = new CannedEmbeddingClient();

  let failures = 0;

  for (const fixture of FIXTURES) {
    console.log(`\n--- ${fixture.name} (${fixture.framework}) ---`);
    clearRegistry();
    registerAllAgents({ db, llmClient, embeddingClient });
    const app = await buildApp({ db, llmClient, embeddingClient });

    try {
      const projectRes = await app.inject({ method: "POST", url: "/projects", payload: { name: `Smoke: ${fixture.name}` } });
      assert(projectRes.statusCode === 201, `project created (got ${projectRes.statusCode})`);
      const project = projectRes.json();

      const docRes = await app.inject({
        method: "POST",
        url: `/projects/${project.id}/design-doc`,
        payload: { prose: fixture.prose, mermaidText: fixture.mermaidText },
      });
      assert(docRes.statusCode === 201, `design doc uploaded (got ${docRes.statusCode})`);

      const runRes = await app.inject({
        method: "POST",
        url: `/projects/${project.id}/pipeline-runs`,
        payload: { framework: fixture.framework },
      });
      assert(runRes.statusCode === 202, `pipeline run triggered (got ${runRes.statusCode})`);
      const run = runRes.json();

      let status = run.status;
      for (let attempt = 0; attempt < 40 && (status === "pending" || status === "running"); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const poll = await app.inject({ method: "GET", url: `/pipeline-runs/${run.id}` });
        status = poll.json().status;
      }
      assert(status === "succeeded", `pipeline run reached "succeeded" (was "${status}")`);
      console.log(`✓ pipeline run ${run.id} succeeded`);

      const stepsRes = await app.inject({ method: "GET", url: `/pipeline-runs/${run.id}/steps` });
      const steps: { agentName: string; status: string }[] = stepsRes.json();
      assert(steps.length === 7, `all 7 agent steps reported (got ${steps.length})`);
      assert(
        steps.every((s) => s.status === "succeeded"),
        `every agent step succeeded (got: ${steps.map((s) => `${s.agentName}=${s.status}`).join(", ")})`,
      );
      console.log(`✓ all 7 agent steps succeeded: ${steps.map((s) => s.agentName).join(", ")}`);

      const modelRes = await app.inject({ method: "GET", url: `/pipeline-runs/${run.id}/system-model` });
      const model: {
        components: { id: string; trustBoundaryId: string | null }[];
        dataflows: { sourceComponentId: string; targetComponentId: string }[];
        trustBoundaries: { id: string }[];
      } = modelRes.json();
      const componentIds = new Set(model.components.map((c) => c.id));
      const boundaryIds = new Set(model.trustBoundaries.map((b) => b.id));
      assert(model.components.length > 0, "system model has at least one component");
      for (const c of model.components) {
        assert(c.trustBoundaryId === null || boundaryIds.has(c.trustBoundaryId), `component ${c.id} trustBoundaryId resolves`);
      }
      for (const df of model.dataflows) {
        assert(componentIds.has(df.sourceComponentId), `dataflow source ${df.sourceComponentId} resolves to a component`);
        assert(componentIds.has(df.targetComponentId), `dataflow target ${df.targetComponentId} resolves to a component`);
      }
      console.log(`✓ system model: ${model.components.length} components, ${model.dataflows.length} dataflows, ${model.trustBoundaries.length} trust boundaries - all internally consistent`);

      const pathsRes = await app.inject({ method: "GET", url: `/pipeline-runs/${run.id}/attack-paths` });
      const attackPaths: {
        id: string;
        entities: { componentId: string }[];
        groundingRefs: { chunkId: string; techniqueId: string }[];
        risk: { attackPathId: string } | null;
      }[] = pathsRes.json();
      const attackPathIds = new Set(attackPaths.map((p) => p.id));
      const allChunkIds = attackPaths.flatMap((p) => p.groundingRefs.map((r) => r.chunkId));
      const realChunkRows =
        allChunkIds.length > 0 ? await db.select({ id: techniqueChunks.id }).from(techniqueChunks).where(inArray(techniqueChunks.id, allChunkIds)) : [];
      const realChunkIds = new Set(realChunkRows.map((r) => r.id));
      for (const p of attackPaths) {
        for (const entity of p.entities) {
          assert(componentIds.has(entity.componentId), `attack path ${p.id} entity ${entity.componentId} resolves to a component`);
        }
        for (const ref of p.groundingRefs) {
          assert(realChunkIds.has(ref.chunkId), `attack path ${p.id} groundingRef chunkId ${ref.chunkId} resolves to a real technique_chunks row`);
        }
        assert(p.risk !== null && p.risk.attackPathId === p.id, `attack path ${p.id} has a matching risk score`);
      }
      console.log(`✓ ${attackPaths.length} attack paths - every entity and groundingRef resolves, every path has a risk score`);

      const mitigationsRes = await app.inject({ method: "GET", url: `/pipeline-runs/${run.id}/mitigations` });
      const mitigations: { id: string; attackPathIds: string[] }[] = mitigationsRes.json();
      for (const m of mitigations) {
        assert(m.attackPathIds.length > 0, `mitigation ${m.id} references at least one attack path`);
        for (const id of m.attackPathIds) {
          assert(attackPathIds.has(id), `mitigation ${m.id} attackPathId ${id} resolves to a real attack path`);
        }
      }
      console.log(`✓ ${mitigations.length} mitigations - every attackPathIds entry resolves`);

      const artifactsRes = await app.inject({ method: "GET", url: `/pipeline-runs/${run.id}/report-artifacts` });
      assert(artifactsRes.statusCode === 200, `report artifacts exist (got ${artifactsRes.statusCode})`);
      const artifacts: { hasPdf: boolean; riskRegisterCsv: string; navigatorLayer: unknown; jsonDump: unknown } = artifactsRes.json();
      assert(artifacts.hasPdf, "report artifacts include a generated PDF");
      assert(artifacts.riskRegisterCsv.length > 0, "risk register CSV is non-empty");
      assert(artifacts.navigatorLayer !== null, "Navigator layer JSON was generated");
      assert(artifacts.jsonDump !== null, "full JSON dump was generated");
      console.log(`✓ report artifacts: PDF + risk-register CSV + Navigator layer + JSON dump all present`);

      const reportsRes = await app.inject({ method: "GET", url: `/projects/${project.id}/reports` });
      const reports: { audience: string; runId: string }[] = reportsRes.json();
      const audiences = new Set(reports.filter((r) => r.runId === run.id).map((r) => r.audience));
      assert(
        ["executive", "ciso", "technical"].every((a) => audiences.has(a)),
        `all 3 audience reports generated (got: ${[...audiences].join(", ")})`,
      );
      console.log(`✓ all 3 audience reports generated`);
    } catch (err) {
      failures += 1;
      console.error(`✗ ${fixture.name} FAILED:`, err instanceof Error ? err.message : err);
    } finally {
      await app.close();
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} fixture(s) failed smoke-e2e verification.`);
    process.exit(1);
  }
  console.log(`\nAll ${FIXTURES.length} fixtures passed smoke-e2e verification.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * Scripted verification of every MCP tool against a running api-server, per the build
 * plan's Phase 13 verify step: exercise each tool and drive one full pipeline run through
 * MCP tool calls only (no direct REST calls from this script).
 *
 * Prerequisites (not started by this script):
 *   - A running api-server, ideally the canned/e2e one so the pipeline actually completes
 *     without live LLM credentials: DATABASE_URL=... E2E_API_PORT=4100 \
 *       npx tsx ../artifacts/api-server/src/e2e/serve.ts
 *   - A running mcp-server pointed at it: API_BASE_URL=http://localhost:4100 MCP_PORT=4200 \
 *       npx tsx src/index.ts
 *
 * Run with: MCP_SERVER_URL=http://localhost:4200/mcp npx tsx src/e2e/verify-tools.ts
 */

const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? "http://localhost:4200/mcp";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function textOf(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content as { type: string; text?: string }[];
  const first = content[0];
  assert(first?.type === "text" && typeof first.text === "string", "tool result content[0] is text");
  return first.text!;
}

function jsonOf<T>(result: Awaited<ReturnType<Client["callTool"]>>): T {
  return JSON.parse(textOf(result)) as T;
}

async function main() {
  const client = new Client({ name: "verify-tools-script", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL));
  await client.connect(transport);

  const { tools } = await client.listTools();
  const toolNames = tools.map((t) => t.name).sort();
  assert(
    ["create_project", "get_pipeline_status", "get_report", "list_projects", "run_threat_model_pipeline", "upload_design_doc"].every((n) =>
      toolNames.includes(n),
    ),
    `all 6 tools registered, got: ${toolNames.join(", ")}`,
  );
  console.log("✓ all 6 tools are registered:", toolNames.join(", "));

  const beforeCreate = jsonOf<unknown[]>(await client.callTool({ name: "list_projects", arguments: {} }));
  assert(Array.isArray(beforeCreate), "list_projects returns an array");
  console.log(`✓ list_projects returned ${beforeCreate.length} existing project(s)`);

  const project = jsonOf<{ id: string; name: string }>(
    await client.callTool({ name: "create_project", arguments: { name: `MCP verify ${Date.now()}`, description: "Created by verify-tools.ts" } }),
  );
  assert(typeof project.id === "string" && project.id.length > 0, "create_project returns an id");
  console.log(`✓ create_project created project ${project.id}`);

  const designDoc = jsonOf<{ id: string; projectId: string }>(
    await client.callTool({
      name: "upload_design_doc",
      arguments: {
        projectId: project.id,
        prose: "A simple 3-tier web app: a browser, an API gateway, and a database.",
        mermaidText: "flowchart LR\n  Browser-->API\n  API-->DB[(Database)]",
      },
    }),
  );
  assert(designDoc.projectId === project.id, "upload_design_doc attaches to the right project");
  console.log(`✓ upload_design_doc attached design doc ${designDoc.id}`);

  const run = jsonOf<{ id: string; projectId: string; status: string }>(
    await client.callTool({ name: "run_threat_model_pipeline", arguments: { projectId: project.id, framework: "enterprise" } }),
  );
  assert(run.projectId === project.id, "run_threat_model_pipeline starts a run for the right project");
  console.log(`✓ run_threat_model_pipeline started run ${run.id}`);

  type PipelineStatus = { run: { status: string }; steps: { agentName: string; status: string }[] };
  let status: PipelineStatus = { run: { status: "pending" }, steps: [] };
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current: PipelineStatus = jsonOf(await client.callTool({ name: "get_pipeline_status", arguments: { runId: run.id } }));
    status = current;
    if (current.run.status === "succeeded" || current.run.status === "failed") break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert(status.run.status === "succeeded", `pipeline run succeeded (was "${status.run.status}")`);
  assert(status.steps.length === 7, `all 7 agent steps reported (got ${status.steps.length})`);
  console.log(`✓ get_pipeline_status: run succeeded with ${status.steps.length} agent steps, all via MCP tool calls`);

  const reports = jsonOf<{ audience: string; runId: string }[]>(
    await client.callTool({ name: "get_report", arguments: { projectId: project.id, runId: run.id } }),
  );
  assert(reports.length === 3, `get_report returned 3 audience reports (got ${reports.length})`);
  assert(
    ["executive", "ciso", "technical"].every((a) => reports.some((r) => r.audience === a)),
    "reports cover all 3 audiences",
  );
  console.log(`✓ get_report returned ${reports.length} audience reports for the run`);

  await client.close();
  console.log("\nAll MCP tools verified successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

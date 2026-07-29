import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

describe("mcp-server tool registration", () => {
  let server: Server;
  let client: Client;
  let baseUrl: string;

  beforeAll(async () => {
    // Point at an address nothing listens on, set before importing api-client.js (which
    // reads API_BASE_URL once at module load) so the "unreachable upstream" test below is
    // deterministic regardless of what else happens to be running on the machine.
    process.env.API_BASE_URL = "http://127.0.0.1:1";
    const { createHttpServer } = await import("./server.js");
    server = createHttpServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://localhost:${port}/mcp`;

    client = new Client({ name: "test-client", version: "0.1.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(baseUrl)));
  });

  afterAll(async () => {
    await client.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("registers exactly the 6 tools the build plan specifies", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "create_project",
      "get_pipeline_status",
      "get_report",
      "list_projects",
      "run_threat_model_pipeline",
      "upload_design_doc",
    ]);
  });

  it("returns an MCP tool error (not a transport error) when the upstream api-server is unreachable", async () => {
    const result = await client.callTool({ name: "list_projects", arguments: {} });
    expect(result.isError).toBe(true);
  });
});

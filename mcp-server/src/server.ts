import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerTools } from "./tools.js";

const MCP_ENDPOINT_PATH = "/mcp";

function buildServer(): McpServer {
  const server = new McpServer({ name: "intel-threat-modeller", version: "0.1.0" });
  registerTools(server);
  return server;
}

/**
 * A fresh McpServer + stateless StreamableHTTPServerTransport per request, so concurrent
 * clients never share request/response correlation state. Every tool here is a thin,
 * side-effect-free-on-the-MCP-side proxy over the api-server REST API (see api-client.ts)
 * - there's no orchestrator or agent logic in this package, so per-request server instances
 * cost nothing beyond tool registration.
 */
async function handleMcpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res);
}

export function createHttpServer(): http.Server {
  return http.createServer((req, res) => {
    if (req.url !== MCP_ENDPOINT_PATH) {
      res.writeHead(404).end("Not found");
      return;
    }
    handleMcpRequest(req, res).catch((err) => {
      console.error(err);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
}

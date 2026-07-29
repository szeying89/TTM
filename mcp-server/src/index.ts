import { createHttpServer } from "./server.js";

const port = Number(process.env.MCP_PORT ?? 4200);
createHttpServer().listen(port, () => {
  console.log(`Intel-Threat-Modeller MCP server (Streamable HTTP) listening on :${port}/mcp`);
});

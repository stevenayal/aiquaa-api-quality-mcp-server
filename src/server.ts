import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { registerTools, type ToolContext } from "./tools/register-tools.js";

export function createAiquaaMcpServer(context: ToolContext = {}): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );
  registerTools(server, context);
  return server;
}

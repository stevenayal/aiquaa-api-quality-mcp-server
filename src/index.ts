#!/usr/bin/env node
import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { loadServerEnv } from "./config/env.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { createAiquaaMcpServer } from "./server.js";

const env = loadServerEnv();
const app = express();
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_request: Request, response: Response) => {
  response.json({
    status: "ok",
    name: SERVER_NAME,
    version: SERVER_VERSION,
    transport: "streamable-http",
  });
});

app.post(env.mcpPath, (request: Request, response: Response) => {
  void handleMcpRequest(request, response);
});

async function handleMcpRequest(request: Request, response: Response): Promise<void> {
  const aiquaaAccessToken = bearerToken(request.header("authorization"));
  const server = createAiquaaMcpServer(aiquaaAccessToken ? { aiquaaAccessToken } : {});
  const transport = new StreamableHTTPServerTransport({});
  response.on("close", () => {
    void transport.close();
    void server.close();
  });
  try {
    await server.connect(transport as unknown as Transport);
    await transport.handleRequest(request, response, request.body);
  } catch (error: unknown) {
    if (!response.headersSent) {
      response.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal server error",
        },
        id: null,
      });
    }
  }
}

app.all(env.mcpPath, (_request: Request, response: Response) => {
  response.status(405).set("Allow", "POST").json({
    error: "Este servidor usa Streamable HTTP sin estado; enviá solicitudes MCP por POST.",
  });
});

app.listen(env.port, () => {
  process.stderr.write(
    `${SERVER_NAME} ${SERVER_VERSION} escuchando en http://localhost:${env.port}${env.mcpPath}\n`,
  );
});

function bearerToken(header?: string): string | undefined {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || undefined;
}

import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createAiquaaMcpServer } from "./server.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("createAiquaaMcpServer", () => {
  let server: McpServer;
  let client: Client;

  beforeEach(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createAiquaaMcpServer();
    client = new Client({ name: "integration-test", version: "1.0.0" });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it("registers all ten tools with annotations", async () => {
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name).sort()).toEqual(
      [
        "api_analizar",
        "api_cambios",
        "api_cobertura",
        "api_ejecutar",
        "api_fallos",
        "api_generar",
        "api_pipeline",
        "api_pr",
        "api_requisitos",
        "api_validar",
      ].sort(),
    );
    const pr = listed.tools.find((tool) => tool.name === "api_pr");
    expect(pr?.annotations?.readOnlyHint).toBe(false);
  });

  it("runs api_requisitos end to end without external access", async () => {
    const result = await client.callTool({
      name: "api_requisitos",
      arguments: {
        text: "Como cliente quiero ver mis pedidos.\nEl sistema no debe mostrar pedidos de otros clientes.",
        response_format: "json",
      },
    });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.structuredContent)).toMatch(/REQ-001/);
    expect(JSON.stringify(result.structuredContent)).toMatch(/BR-001/);
  });

  it("runs api_cobertura end to end without external access", async () => {
    const result = await client.callTool({
      name: "api_cobertura",
      arguments: {
        requirements: [{ id: "REQ-001", text: "Get user", operationId: "getUser" }],
        operations: [{ operationId: "getUser", method: "GET", path: "/users/{id}" }],
        response_format: "markdown",
      },
    });
    expect(result.isError).not.toBe(true);
    expect(result.content?.[0]).toMatchObject({ type: "text" });
  });

  it("runs api_cambios end to end and returns a plan", async () => {
    const result = await client.callTool({
      name: "api_cambios",
      arguments: {
        api_name: "Users API",
        requirements: [{ id: "REQ-001", text: "Get user", operationId: "getUser" }],
        operations: [{ operationId: "getUser", method: "GET", path: "/users/{id}" }],
        response_format: "json",
      },
    });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.structuredContent)).toMatch(/strategy/);
  });

  it("runs api_pipeline end to end and returns a GitHub Actions workflow", async () => {
    const result = await client.callTool({
      name: "api_pipeline",
      arguments: { api_name: "Users API", target: "github_actions", response_format: "json" },
    });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.structuredContent)).toMatch(/newman/);
  });

  it("runs api_generar end to end and returns collection + environment files", async () => {
    const result = await client.callTool({
      name: "api_generar",
      arguments: {
        api_name: "Users API",
        mode: "create",
        operations: [
          {
            operationId: "getUser",
            method: "GET",
            path: "/users/{id}",
            requiresAuth: false,
            expectedStatus: 200,
            requiredFields: ["id"],
            requirementIds: ["REQ-001"],
          },
        ],
        response_format: "json",
      },
    });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.structuredContent)).toMatch(/C_USERS_API\.json/);
  });

  it("returns a graceful error result for invalid input instead of throwing", async () => {
    const result = await client.callTool({ name: "api_requisitos", arguments: { text: "" } });
    expect(result.isError).toBe(true);
  });

  it("runs api_validar end to end", async () => {
    const result = await client.callTool({
      name: "api_validar",
      arguments: {
        collection: {
          info: {
            name: "API",
            schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
          },
          item: [],
        },
        response_format: "markdown",
      },
    });
    expect(result.isError).not.toBe(true);
  });

  it("runs api_fallos end to end with raw error messages", async () => {
    const result = await client.callTool({
      name: "api_fallos",
      arguments: { error_messages: ["expected 500 to equal 200"], response_format: "json" },
    });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.structuredContent)).toMatch(/product_defect/);
  });

  it("runs api_pr in dry run mode end to end", async () => {
    const result = await client.callTool({
      name: "api_pr",
      arguments: {
        repository: { owner: "aiquaa-labs", name: "customer-api" },
        requirement_source: "REQ-142",
        files: [{ path: "tests/postman/C_API.json", content: "{}", operation: "create" }],
        response_format: "markdown",
      },
    });
    expect(result.isError).not.toBe(true);
    expect(result.content?.[0]).toMatchObject({ type: "text" });
  });

  it("runs api_analizar end to end from source_files only", async () => {
    const result = await client.callTool({
      name: "api_analizar",
      arguments: {
        source_files: [
          {
            path: "src/routes.js",
            content: 'require("express"); router.get("/ping", h);',
          },
        ],
        response_format: "json",
      },
    });
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result.structuredContent)).toMatch(/express/);
  });
});

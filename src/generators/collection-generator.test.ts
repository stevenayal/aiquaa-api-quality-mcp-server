import { describe, expect, it } from "vitest";
import {
  generateOrExtendCollection,
  type CollectionOperationInput,
} from "./collection-generator.js";

const operation: CollectionOperationInput = {
  operationId: "getUser",
  method: "GET",
  path: "/users/{id}",
  requiresAuth: false,
  expectedStatus: 200,
  requiredFields: ["id"],
  requirementIds: ["REQ-001"],
};

describe("generateOrExtendCollection", () => {
  it("creates a new collection with one item per operation", () => {
    const result = generateOrExtendCollection({
      apiName: "Users API",
      mode: "create",
      baseUrlVariable: "baseUrl",
      operations: [operation],
    });
    expect(result.addedOperationIds).toEqual(["getUser"]);
    const items = result.collectionJson["item"] as Array<{ name: string }>;
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe("GET /users/{id}");
  });

  it("does not duplicate a request that already exists in create mode", () => {
    const first = generateOrExtendCollection({
      apiName: "Users API",
      mode: "create",
      baseUrlVariable: "baseUrl",
      operations: [operation],
    });
    const second = generateOrExtendCollection({
      apiName: "Users API",
      mode: "create",
      baseUrlVariable: "baseUrl",
      operations: [operation],
      existingCollection: first.collectionJson,
    });
    expect(second.skippedOperationIds).toEqual(["getUser"]);
    expect(second.addedOperationIds).toHaveLength(0);
  });

  it("extends an existing request with missing assertions instead of duplicating it", () => {
    const first = generateOrExtendCollection({
      apiName: "Users API",
      mode: "create",
      baseUrlVariable: "baseUrl",
      operations: [{ ...operation, requiredFields: ["id"] }],
    });
    const second = generateOrExtendCollection({
      apiName: "Users API",
      mode: "extend",
      baseUrlVariable: "baseUrl",
      operations: [{ ...operation, requiredFields: ["id", "email"] }],
      existingCollection: first.collectionJson,
    });
    expect(second.modifiedOperationIds).toEqual(["getUser"]);
    expect(second.addedOperationIds).toHaveLength(0);
    const items = second.collectionJson["item"] as Array<{
      event: Array<{ script: { exec: string[] } }>;
    }>;
    const exec = items[0]!.event[0]!.script.exec.join("\n");
    expect(exec).toContain("email");
  });

  it("skips extend when the request already covers every required field", () => {
    const first = generateOrExtendCollection({
      apiName: "Users API",
      mode: "create",
      baseUrlVariable: "baseUrl",
      operations: [operation],
    });
    const second = generateOrExtendCollection({
      apiName: "Users API",
      mode: "extend",
      baseUrlVariable: "baseUrl",
      operations: [operation],
      existingCollection: first.collectionJson,
    });
    expect(second.skippedOperationIds).toEqual(["getUser"]);
  });

  it("adds a root prerequest event with the sql sandbox helper when sqlSandbox is set", () => {
    const result = generateOrExtendCollection({
      apiName: "Users API",
      mode: "create",
      baseUrlVariable: "baseUrl",
      operations: [operation],
      sqlSandbox: { baseUrlVariable: "sqlSandboxBaseUrl", apiKeyVariable: "sqlSandboxApiKey" },
    });
    const event = result.collectionJson["event"] as Array<{
      listen: string;
      script: { exec: string[] };
    }>;
    expect(event).toHaveLength(1);
    expect(event[0]!.listen).toBe("prerequest");
    const exec = event[0]!.script.exec.join("\n");
    expect(exec).toContain("sqlSandboxBaseUrl");
    expect(exec).toContain("sqlSandboxApiKey");
  });

  it("does not add a root event when sqlSandbox is not set", () => {
    const result = generateOrExtendCollection({
      apiName: "Users API",
      mode: "create",
      baseUrlVariable: "baseUrl",
      operations: [operation],
    });
    expect(result.collectionJson["event"]).toBeUndefined();
  });

  it("uses the template variable directly when there are no bodyMutations", () => {
    const result = generateOrExtendCollection({
      apiName: "Orders API",
      mode: "create",
      baseUrlVariable: "baseUrl",
      operations: [
        {
          operationId: "createOrder",
          method: "POST",
          path: "/orders",
          requiresAuth: false,
          expectedStatus: 201,
          requiredFields: [],
          requirementIds: [],
          requestBodyExample: { amount: 100 },
          bodyTemplateVariable: "createOrder_template",
        },
      ],
    });
    const items = result.collectionJson["item"] as Array<{
      request: { body?: { raw: string } };
      event: Array<{ listen: string }>;
    }>;
    expect(items[0]!.request.body?.raw).toBe("{{createOrder_template}}");
    expect(items[0]!.event.some((e) => e.listen === "prerequest")).toBe(false);

    const variables = result.collectionJson["variable"] as Array<{ key: string; value: string }>;
    const template = variables.find((v) => v.key === "createOrder_template");
    expect(template?.value).toBe(JSON.stringify({ amount: 100 }));
  });

  it("clones and mutates the template via a prerequest script when bodyMutations is set", () => {
    const result = generateOrExtendCollection({
      apiName: "Orders API",
      mode: "create",
      baseUrlVariable: "baseUrl",
      operations: [
        {
          operationId: "createOrderNegative",
          method: "POST",
          path: "/orders",
          requiresAuth: false,
          expectedStatus: 400,
          requiredFields: [],
          requirementIds: [],
          bodyTemplateVariable: "createOrder_template",
          bodyMutations: { amount: -1 },
        },
      ],
    });
    const items = result.collectionJson["item"] as Array<{
      request: { body?: { raw: string } };
      event: Array<{ listen: string; script: { exec: string[] } }>;
    }>;
    expect(items[0]!.request.body?.raw).toBe("{{createOrderNegative_body}}");
    const prerequest = items[0]!.event.find((e) => e.listen === "prerequest");
    expect(prerequest).toBeDefined();
    const exec = prerequest!.script.exec.join("\n");
    expect(exec).toContain("createOrder_template");
    expect(exec).toContain('body["amount"] = -1;');
    expect(exec).toContain("createOrderNegative_body");
  });

  it("generates a pm.sendRequest DB pre-check and post-check when dbValidation is set", () => {
    const result = generateOrExtendCollection({
      apiName: "Orders API",
      mode: "create",
      baseUrlVariable: "baseUrl",
      operations: [
        {
          operationId: "createOrder",
          method: "POST",
          path: "/orders",
          requiresAuth: false,
          expectedStatus: 201,
          requiredFields: [],
          requirementIds: ["REQ-010"],
          requestBodyExample: { amount: 100 },
          dbValidation: {
            preCondition: { query: "SELECT COUNT(*) FROM orders", expect: 0 },
            postCheck: {
              query: "SELECT COUNT(*) FROM orders",
              expect: 1,
              description: "se creó 1 fila en orders",
            },
          },
        },
      ],
      sqlSandbox: { baseUrlVariable: "sqlSandboxBaseUrl", apiKeyVariable: "sqlSandboxApiKey" },
    });
    const items = result.collectionJson["item"] as Array<{
      event: Array<{ listen: string; script: { exec: string[] } }>;
    }>;
    const prerequest = items[0]!.event.find((e) => e.listen === "prerequest");
    expect(prerequest?.script.exec.join("\n")).toContain("SELECT COUNT(*) FROM orders");

    const test = items[0]!.event.find((e) => e.listen === "test");
    const testExec = test!.script.exec.join("\n");
    expect(testExec).toContain("pm.sendRequest");
    expect(testExec).toContain("REQ-010");
    expect(testExec).toContain("se creó 1 fila en orders");
  });

  it("captures a dynamic value from the DB pre-request and lets the request use it via {{var}}", () => {
    const result = generateOrExtendCollection({
      apiName: "Facturas API",
      mode: "create",
      baseUrlVariable: "baseUrl",
      operations: [
        {
          operationId: "pagarFactura",
          method: "POST",
          path: "/facturas/{{facturaIdDinamico}}/pagar",
          requiresAuth: false,
          expectedStatus: 200,
          requiredFields: [],
          requirementIds: ["REQ-020"],
          requestBodyExample: { metodoPago: "tarjeta" },
          dbValidation: {
            preCondition: {
              query: "SELECT id FROM facturas WHERE estado = 'pendiente' LIMIT 1",
              captureAs: "facturaIdDinamico",
              extractPath: "data[0].id",
            },
          },
        },
      ],
      sqlSandbox: { baseUrlVariable: "sqlSandboxBaseUrl", apiKeyVariable: "sqlSandboxApiKey" },
    });

    const items = result.collectionJson["item"] as Array<{
      request: { url: { raw: string } };
      event: Array<{ listen: string; script: { exec: string[] } }>;
    }>;
    expect(items[0]!.request.url.raw).toBe("{{baseUrl}}/facturas/{{facturaIdDinamico}}/pagar");

    const prerequest = items[0]!.event.find((e) => e.listen === "prerequest");
    const exec = prerequest!.script.exec.join("\n");
    expect(exec).toContain("SELECT id FROM facturas WHERE estado = 'pendiente' LIMIT 1");
    expect(exec).toContain('aiquaaGetPath(result, "data[0].id")');
    expect(exec).toContain('pm.collectionVariables.set("facturaIdDinamico", capturedValue);');
  });

  it("supports a postCheck-only dbValidation that just captures the generated id (no expect)", () => {
    const result = generateOrExtendCollection({
      apiName: "Orders API",
      mode: "create",
      baseUrlVariable: "baseUrl",
      operations: [
        {
          operationId: "createOrder",
          method: "POST",
          path: "/orders",
          requiresAuth: false,
          expectedStatus: 201,
          requiredFields: [],
          requirementIds: [],
          requestBodyExample: { amount: 100 },
          dbValidation: {
            postCheck: {
              query: "SELECT id FROM orders ORDER BY id DESC LIMIT 1",
              captureAs: "createdOrderId",
              extractPath: "data[0].id",
              description: "captura el id real generado por el INSERT",
            },
          },
        },
      ],
      sqlSandbox: { baseUrlVariable: "sqlSandboxBaseUrl", apiKeyVariable: "sqlSandboxApiKey" },
    });

    const items = result.collectionJson["item"] as Array<{
      event: Array<{ listen: string; script: { exec: string[] } }>;
    }>;
    expect(items[0]!.event.some((e) => e.listen === "prerequest")).toBe(false);
    const test = items[0]!.event.find((e) => e.listen === "test");
    const testExec = test!.script.exec.join("\n");
    expect(testExec).toContain('pm.collectionVariables.set("createdOrderId", capturedValue);');
  });

  it("does not duplicate the root prerequest event when regenerating an existing collection", () => {
    const first = generateOrExtendCollection({
      apiName: "Users API",
      mode: "create",
      baseUrlVariable: "baseUrl",
      operations: [operation],
      sqlSandbox: { baseUrlVariable: "sqlSandboxBaseUrl", apiKeyVariable: "sqlSandboxApiKey" },
    });
    const second = generateOrExtendCollection({
      apiName: "Users API",
      mode: "extend",
      baseUrlVariable: "baseUrl",
      operations: [{ ...operation, requiredFields: ["id", "email"] }],
      existingCollection: first.collectionJson,
      sqlSandbox: { baseUrlVariable: "sqlSandboxBaseUrl", apiKeyVariable: "sqlSandboxApiKey" },
    });
    const event = second.collectionJson["event"] as Array<unknown>;
    expect(event).toHaveLength(1);
  });
});

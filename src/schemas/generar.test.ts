import { describe, expect, it } from "vitest";
import { ApiGenerarInputSchema } from "./generar.js";

const operation = {
  operationId: "getUser",
  method: "GET" as const,
  path: "/users/{id}",
  requiresAuth: false,
  expectedStatus: 200,
  requiredFields: [],
  requirementIds: [],
};

describe("ApiGenerarInputSchema", () => {
  it("requires existing_collection when mode is extend", () => {
    const result = ApiGenerarInputSchema.safeParse({
      api_name: "Users API",
      mode: "extend",
      operations: [operation],
    });
    expect(result.success).toBe(false);
  });

  it("allows mode create without an existing collection", () => {
    const result = ApiGenerarInputSchema.safeParse({
      api_name: "Users API",
      mode: "create",
      operations: [operation],
    });
    expect(result.success).toBe(true);
  });

  it("requires at least one operation", () => {
    const result = ApiGenerarInputSchema.safeParse({
      api_name: "Users API",
      mode: "create",
      operations: [],
    });
    expect(result.success).toBe(false);
  });

  it("applies default variable names for sql_sandbox when omitted", () => {
    const result = ApiGenerarInputSchema.safeParse({
      api_name: "Users API",
      mode: "create",
      operations: [operation],
      sql_sandbox: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sql_sandbox).toEqual({
        base_url_variable: "sqlSandboxBaseUrl",
        api_key_variable: "sqlSandboxApiKey",
      });
    }
  });

  it("allows omitting sql_sandbox entirely", () => {
    const result = ApiGenerarInputSchema.safeParse({
      api_name: "Users API",
      mode: "create",
      operations: [operation],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sql_sandbox).toBeUndefined();
  });

  it("rejects an operation with dbValidation when sql_sandbox is not declared", () => {
    const result = ApiGenerarInputSchema.safeParse({
      api_name: "Facturas API",
      mode: "create",
      operations: [
        {
          ...operation,
          dbValidation: {
            preCondition: { query: "SELECT id FROM facturas LIMIT 1", captureAs: "facturaId" },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a preCondition that only captures a dynamic value (no expect)", () => {
    const result = ApiGenerarInputSchema.safeParse({
      api_name: "Facturas API",
      mode: "create",
      sql_sandbox: {},
      operations: [
        {
          ...operation,
          dbValidation: {
            preCondition: {
              query: "SELECT id FROM facturas WHERE estado = 'pendiente' LIMIT 1",
              captureAs: "facturaIdDinamico",
              extractPath: "data[0].id",
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a preCondition with neither expect nor captureAs", () => {
    const result = ApiGenerarInputSchema.safeParse({
      api_name: "Facturas API",
      mode: "create",
      sql_sandbox: {},
      operations: [
        {
          ...operation,
          dbValidation: {
            preCondition: { query: "SELECT id FROM facturas LIMIT 1" },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects dbValidation with neither preCondition nor postCheck", () => {
    const result = ApiGenerarInputSchema.safeParse({
      api_name: "Facturas API",
      mode: "create",
      sql_sandbox: {},
      operations: [{ ...operation, dbValidation: {} }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a postCheck that only captures the generated id (no expect)", () => {
    const result = ApiGenerarInputSchema.safeParse({
      api_name: "Orders API",
      mode: "create",
      sql_sandbox: {},
      operations: [
        {
          ...operation,
          dbValidation: {
            postCheck: {
              query: "SELECT id FROM orders ORDER BY id DESC LIMIT 1",
              captureAs: "createdOrderId",
              description: "captura el id generado",
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

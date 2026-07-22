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
});

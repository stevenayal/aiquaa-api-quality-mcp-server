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
});

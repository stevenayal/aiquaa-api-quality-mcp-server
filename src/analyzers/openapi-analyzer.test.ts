import { describe, expect, it } from "vitest";
import { parseOpenApiDocument } from "./openapi-analyzer.js";

const OPENAPI_JSON = {
  paths: {
    "/users": {
      post: {
        operationId: "createUser",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateUser" },
            },
          },
        },
        responses: {
          "201": {
            content: {
              "application/json": {
                schema: { type: "object", properties: { id: { type: "string" } } },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      CreateUser: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email", maxLength: 200 },
          age: { type: "integer", minimum: 0, maximum: 150 },
        },
      },
    },
  },
};

describe("parseOpenApiDocument", () => {
  it("parses operations, auth and response schemas from an object", () => {
    const operations = parseOpenApiDocument(OPENAPI_JSON);
    expect(operations).toHaveLength(1);
    const op = operations[0]!;
    expect(op.method).toBe("POST");
    expect(op.path).toBe("/users");
    expect(op.operationId).toBe("createUser");
    expect(op.authentication?.type).toBe("bearer");
    expect(op.responseSchemas["201"]).toBeDefined();
  });

  it("derives validation rules from the resolved request schema", () => {
    const operations = parseOpenApiDocument(OPENAPI_JSON);
    const rules = operations[0]!.validationRules;
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "email", kind: "required" }),
        expect.objectContaining({ field: "email", kind: "format", detail: "email" }),
        expect.objectContaining({ field: "email", kind: "max_length", detail: "maxLength=200" }),
        expect.objectContaining({ field: "age", kind: "min", detail: "minimum=0" }),
        expect.objectContaining({ field: "age", kind: "max", detail: "maximum=150" }),
      ]),
    );
  });

  it("parses a YAML string document", () => {
    const yaml = `
paths:
  /ping:
    get:
      operationId: ping
      responses:
        '200':
          content: {}
`;
    const operations = parseOpenApiDocument(yaml);
    expect(operations).toHaveLength(1);
    expect(operations[0]!.method).toBe("GET");
    expect(operations[0]!.path).toBe("/ping");
  });
});

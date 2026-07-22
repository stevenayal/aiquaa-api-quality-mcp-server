import { describe, expect, it } from "vitest";
import { runApiValidar } from "./api-validar.js";

describe("runApiValidar", () => {
  it("flags a collection missing the v2.1 schema", () => {
    const result = runApiValidar({
      collection: { info: { name: "API" }, item: [] },
      response_format: "json",
    });
    expect(result.valid).toBe(false);
    expect(result.findings.some((f) => f.message.includes("v2.1"))).toBe(true);
  });

  it("flags duplicate request names", () => {
    const collection = {
      info: {
        name: "API",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [
        { name: "dup", request: { method: "GET", url: { raw: "{{baseUrl}}/a" } }, event: [] },
        { name: "dup", request: { method: "GET", url: { raw: "{{baseUrl}}/b" } }, event: [] },
      ],
    };
    const result = runApiValidar({ collection, response_format: "json" });
    expect(result.findings.some((f) => f.message.includes("duplicado"))).toBe(true);
  });

  it("flags an undeclared variable reference", () => {
    const collection = {
      info: {
        name: "API",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [
        {
          name: "req",
          request: { method: "GET", url: { raw: "{{baseUrl}}/x?token={{missingVar}}" } },
          event: [{ listen: "test", script: { exec: ['pm.test("status is 200", () => {});'] } }],
        },
      ],
      variable: [{ key: "baseUrl", value: "" }],
    };
    const result = runApiValidar({ collection, response_format: "json" });
    expect(result.findings.some((f) => f.message.includes("missingVar"))).toBe(true);
  });

  it("flags a hardcoded secret value in the environment", () => {
    const collection = {
      info: {
        name: "API",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [],
    };
    const environment = {
      values: [{ key: "apiToken", value: "sk_live_abcdef1234567890", type: "default" }],
    };
    const result = runApiValidar({ collection, environment, response_format: "json" });
    expect(result.valid).toBe(false);
    expect(result.findings.some((f) => f.message.includes("secreto"))).toBe(true);
  });

  it("returns valid for a well-formed minimal collection", () => {
    const collection = {
      info: {
        name: "API",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [
        {
          name: "ping",
          request: { method: "GET", url: { raw: "{{baseUrl}}/ping" } },
          event: [{ listen: "test", script: { exec: ['pm.test("status is 200", () => {});'] } }],
        },
      ],
      variable: [{ key: "baseUrl", value: "" }],
    };
    const result = runApiValidar({ collection, response_format: "json" });
    expect(result.valid).toBe(true);
  });
});

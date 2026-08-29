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

  it("warns about a write request with no pre-request or DB-verification when sql_sandbox is configured", () => {
    const collection = {
      info: {
        name: "API",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [
        {
          name: "createOrder",
          request: { method: "POST", url: { raw: "{{baseUrl}}/orders" } },
          event: [{ listen: "test", script: { exec: ['pm.test("status is 201", () => {});'] } }],
        },
      ],
      variable: [
        { key: "baseUrl", value: "" },
        { key: "sqlSandboxBaseUrl", value: "" },
      ],
    };
    const result = runApiValidar({ collection, response_format: "json" });
    expect(
      result.findings.some((f) => f.message.includes("no tiene pre-request script")),
    ).toBe(true);
    expect(
      result.findings.some((f) => f.message.includes("no verifica el efecto en base")),
    ).toBe(true);
  });

  it("does not warn about missing DB verification for a write request without sql_sandbox configured", () => {
    const collection = {
      info: {
        name: "API",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [
        {
          name: "createOrder",
          request: { method: "POST", url: { raw: "{{baseUrl}}/orders" } },
          event: [{ listen: "test", script: { exec: ['pm.test("status is 201", () => {});'] } }],
        },
      ],
      variable: [{ key: "baseUrl", value: "" }],
    };
    const result = runApiValidar({ collection, response_format: "json" });
    expect(
      result.findings.some((f) => f.message.includes("no tiene pre-request script")),
    ).toBe(false);
  });

  it("does not warn when a write request already has a pre-request script and pm.sendRequest", () => {
    const collection = {
      info: {
        name: "API",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [
        {
          name: "createOrder",
          request: { method: "POST", url: { raw: "{{baseUrl}}/orders" } },
          event: [
            { listen: "prerequest", script: { exec: ["const x = 1;"] } },
            {
              listen: "test",
              script: {
                exec: [
                  'pm.test("REQ-010 | orden creada", () => { pm.sendRequest({}, () => {}); });',
                ],
              },
            },
          ],
        },
      ],
      variable: [
        { key: "baseUrl", value: "" },
        { key: "sqlSandboxApiKey", value: "" },
      ],
    };
    const result = runApiValidar({ collection, response_format: "json" });
    expect(
      result.findings.some(
        (f) =>
          f.message.includes("no tiene pre-request script") ||
          f.message.includes("no verifica el efecto en base"),
      ),
    ).toBe(false);
  });

  it("does not flag a variable that is set at runtime by a prerequest script", () => {
    const collection = {
      info: {
        name: "API",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [
        {
          name: "createOrderNegative",
          request: {
            method: "POST",
            url: { raw: "{{baseUrl}}/orders" },
            body: { mode: "raw", raw: "{{createOrderNegative_body}}" },
          },
          event: [
            {
              listen: "prerequest",
              script: {
                exec: [
                  'const body = JSON.parse(pm.collectionVariables.get("template"));',
                  'pm.collectionVariables.set("createOrderNegative_body", JSON.stringify(body));',
                ],
              },
            },
            { listen: "test", script: { exec: ['pm.test("status is 400", () => {});'] } },
          ],
        },
      ],
      variable: [
        { key: "baseUrl", value: "" },
        { key: "template", value: "{}" },
      ],
    };
    const result = runApiValidar({ collection, response_format: "json" });
    expect(
      result.findings.some((f) => f.message.includes("createOrderNegative_body")),
    ).toBe(false);
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

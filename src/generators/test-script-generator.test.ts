import { describe, expect, it } from "vitest";
import {
  buildDbPostCheckAssertion,
  buildDbPreconditionScript,
  buildSqlSandboxHelperScript,
} from "./test-script-generator.js";

const sandbox = { baseUrlVariable: "sqlSandboxBaseUrl", apiKeyVariable: "sqlSandboxApiKey" };

describe("buildSqlSandboxHelperScript", () => {
  it("declares aiquaaGetPath as an implicit global, guarded like sqlSandboxBaseUrl/ApiKey", () => {
    const script = buildSqlSandboxHelperScript("sqlSandboxBaseUrl", "sqlSandboxApiKey");
    expect(script).toContain('typeof aiquaaGetPath === "undefined"');
    expect(script).not.toMatch(/\b(?:var|let|const)\s+aiquaaGetPath\b/);
  });
});

describe("buildDbPreconditionScript", () => {
  it("asserts expect without capturing anything when captureAs is absent", () => {
    const script = buildDbPreconditionScript(
      { query: "SELECT COUNT(*) FROM orders", expect: 0 },
      sandbox,
    );
    expect(script).toContain("Precondición SQL no cumplida");
    expect(script).not.toContain("pm.collectionVariables.set");
  });

  it("captures the full result into a collection variable when extractPath is absent", () => {
    const script = buildDbPreconditionScript(
      { query: "SELECT id FROM usuarios LIMIT 1", captureAs: "usuarioIdDinamico" },
      sandbox,
    );
    expect(script).not.toContain("Precondición SQL no cumplida");
    expect(script).toContain("const capturedValue = result;");
    expect(script).toContain('pm.collectionVariables.set("usuarioIdDinamico", capturedValue);');
  });

  it("captures a nested field via extractPath and throws if it is missing", () => {
    const script = buildDbPreconditionScript(
      {
        query: "SELECT id FROM facturas WHERE estado = 'pendiente' LIMIT 1",
        captureAs: "facturaIdDinamico",
        extractPath: "data[0].id",
      },
      sandbox,
    );
    expect(script).toContain('aiquaaGetPath(result, "data[0].id")');
    expect(script).toContain('No se pudo obtener "data[0].id"');
    expect(script).toContain('pm.collectionVariables.set("facturaIdDinamico", capturedValue);');
  });

  it("can both assert a precondition and capture a value in the same query", () => {
    const script = buildDbPreconditionScript(
      {
        query: "SELECT estado FROM facturas WHERE id = 3",
        expect: "pendiente",
        captureAs: "estadoPrevio",
      },
      sandbox,
    );
    expect(script).toContain("Precondición SQL no cumplida");
    expect(script).toContain('pm.collectionVariables.set("estadoPrevio", capturedValue);');
  });
});

describe("buildDbPostCheckAssertion", () => {
  it("captures a generated id without requiring expect", () => {
    const assertion = buildDbPostCheckAssertion(
      {
        query: "SELECT id FROM orders ORDER BY id DESC LIMIT 1",
        description: "captura el id real generado por el INSERT",
        captureAs: "createdOrderId",
        extractPath: "data[0].id",
      },
      sandbox,
      ["REQ-010"],
    );
    expect(assertion.name).toBe("REQ-010 | captura el id real generado por el INSERT");
    expect(assertion.body).toContain("pm.test(");
    expect(assertion.body).toContain('aiquaaGetPath(result, "data[0].id")');
    expect(assertion.body).toContain(
      'pm.collectionVariables.set("createdOrderId", capturedValue);',
    );
    expect(assertion.body).not.toContain("pm.expect(result).to.eql");
  });

  it("keeps asserting expect when captureAs is absent (existing behavior)", () => {
    const assertion = buildDbPostCheckAssertion(
      { query: "SELECT COUNT(*) FROM orders", expect: 1, description: "se creó 1 fila" },
      sandbox,
      [],
    );
    expect(assertion.body).toContain("pm.expect(result).to.eql(1);");
    expect(assertion.body).not.toContain("pm.collectionVariables.set");
  });

  it("can assert expect and capture a value in the same post-check", () => {
    const assertion = buildDbPostCheckAssertion(
      {
        query: "SELECT estado, id FROM facturas WHERE id = 3",
        expect: "pagada",
        captureAs: "pagoId",
        extractPath: "data[0].id",
        description: "queda pagada y guarda el id",
      },
      sandbox,
      [],
    );
    expect(assertion.body).toContain('pm.expect(result).to.eql("pagada");');
    expect(assertion.body).toContain('pm.collectionVariables.set("pagoId", capturedValue);');
  });
});

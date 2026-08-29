import type { ApiValidarInput } from "../schemas/validar.js";
import { parsePostmanCollection } from "../analyzers/postman-analyzer.js";
import { findHardcodedSecretVariables, scanForSecrets } from "../security/secret-scanner.js";

export interface ValidationFinding {
  severity: "error" | "warning";
  message: string;
}

export interface ApiValidarResult {
  valid: boolean;
  findings: ValidationFinding[];
}

export function runApiValidar(input: ApiValidarInput): ApiValidarResult {
  const findings: ValidationFinding[] = [];
  let collectionJson: Record<string, unknown>;

  try {
    collectionJson =
      typeof input.collection === "string"
        ? (JSON.parse(input.collection) as Record<string, unknown>)
        : input.collection;
  } catch (error: unknown) {
    return {
      valid: false,
      findings: [
        {
          severity: "error",
          message: `JSON de colección inválido: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }

  const info = collectionJson["info"] as { schema?: string } | undefined;
  if (!info?.schema || !/collection\/v2\.1/.test(info.schema)) {
    findings.push({
      severity: "error",
      message: "La colección no declara el schema Postman v2.1 en info.schema.",
    });
  }
  if (!Array.isArray(collectionJson["item"])) {
    findings.push({ severity: "error", message: "La colección no tiene un array 'item' válido." });
  }

  const summary = parsePostmanCollection(collectionJson);

  const namesSeen = new Map<string, number>();
  for (const request of summary.requests) {
    namesSeen.set(request.name, (namesSeen.get(request.name) ?? 0) + 1);
  }
  for (const [name, count] of namesSeen) {
    if (count > 1)
      findings.push({
        severity: "error",
        message: `Nombre de request duplicado: "${name}" aparece ${count} veces.`,
      });
  }

  const requestSignatures = new Map<string, number>();
  for (const request of summary.requests) {
    const signature = `${request.method} ${request.url}`;
    requestSignatures.set(signature, (requestSignatures.get(signature) ?? 0) + 1);
  }
  for (const [signature, count] of requestSignatures) {
    if (count > 1)
      findings.push({
        severity: "warning",
        message: `Request duplicado (mismo método+URL): ${signature} (${count} veces).`,
      });
  }

  for (const request of summary.requests) {
    if (!request.hasTestScript) {
      findings.push({
        severity: "warning",
        message: `El request "${request.name}" no tiene test script.`,
      });
    }
  }

  const hasSqlSandbox = summary.variables.some(
    (v) => v.key === "sqlSandboxBaseUrl" || v.key === "sqlSandboxApiKey",
  );
  if (hasSqlSandbox) {
    const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
    for (const request of summary.requests) {
      if (!writeMethods.has(request.method)) continue;
      if (!request.hasPreRequestScript) {
        findings.push({
          severity: "warning",
          message: `El request "${request.name}" es de escritura pero no tiene pre-request script (revisá si necesita clonar/mutar un body de plantilla o validar una precondición SQL).`,
        });
      }
      if (!request.hasDbVerification) {
        findings.push({
          severity: "warning",
          message: `El request "${request.name}" es de escritura pero su test script no verifica el efecto en base (sin pm.sendRequest al sandbox SQL).`,
        });
      }
    }
  }

  const declaredVariableKeys = new Set(summary.variables.map((v) => v.key));
  let environmentJson: Record<string, unknown> | undefined;
  if (input.environment) {
    try {
      environmentJson =
        typeof input.environment === "string"
          ? (JSON.parse(input.environment) as Record<string, unknown>)
          : input.environment;
      const values = (environmentJson?.["values"] as Array<{ key: string }> | undefined) ?? [];
      for (const value of values) declaredVariableKeys.add(value.key);
    } catch (error: unknown) {
      findings.push({
        severity: "error",
        message: `JSON de environment inválido: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  const usedVariables = new Set<string>();
  const varRegex = /\{\{\s*([A-Za-z0-9_.]+)\s*}}/g;
  const collectionText = JSON.stringify(collectionJson);
  let match: RegExpExecArray | null;
  while ((match = varRegex.exec(collectionText)) !== null) {
    if (match[1]) usedVariables.add(match[1]);
  }

  // Variables set at runtime by a prerequest script (e.g. the clone+mutate
  // body-template pattern) are legitimately undeclared statically.
  const dynamicSetRegex = /pm\.collectionVariables\.set\(\s*\\?["'`]([A-Za-z0-9_.]+)\\?["'`]/g;
  while ((match = dynamicSetRegex.exec(collectionText)) !== null) {
    if (match[1]) declaredVariableKeys.add(match[1]);
  }

  for (const variable of usedVariables) {
    if (!declaredVariableKeys.has(variable)) {
      findings.push({
        severity: "warning",
        message: `La colección usa {{${variable}}} pero no está declarada en collection.variable ni en el environment.`,
      });
    }
  }

  const collectionSecrets = scanForSecrets(collectionText);
  for (const secretType of collectionSecrets) {
    findings.push({
      severity: "error",
      message: `Posible secreto embebido en la colección: ${secretType}.`,
    });
  }
  if (environmentJson) {
    const values =
      (environmentJson["values"] as Array<{ key: string; value: string }> | undefined) ?? [];
    for (const finding of findHardcodedSecretVariables(values)) {
      findings.push({ severity: "error", message: finding.reason });
    }
    const envSecrets = scanForSecrets(JSON.stringify(environmentJson));
    for (const secretType of envSecrets) {
      findings.push({
        severity: "error",
        message: `Posible secreto embebido en el environment: ${secretType}.`,
      });
    }
  }

  const valid = findings.every((finding) => finding.severity !== "error");
  return { valid, findings };
}

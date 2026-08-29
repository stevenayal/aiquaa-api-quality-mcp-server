import type { ApiGenerarInput } from "../schemas/generar.js";
import type { GeneratedFile } from "../types/index.js";
import { DEFAULT_PATHS, FILE_PREFIX } from "../constants.js";
import { generateOrExtendCollection } from "../generators/collection-generator.js";
import { generateOrExtendEnvironment } from "../generators/environment-generator.js";
import { findHardcodedSecretVariables } from "../security/secret-scanner.js";

export interface ApiGenerarResult {
  files: GeneratedFile[];
  addedOperationIds: string[];
  skippedOperationIds: string[];
  modifiedOperationIds: string[];
  warnings: string[];
}

export function runApiGenerar(input: ApiGenerarInput): ApiGenerarResult {
  const apiSlug = normalizeApiName(input.api_name);
  const warnings: string[] = [];

  const collectionResult = generateOrExtendCollection({
    apiName: input.api_name,
    mode: input.mode,
    baseUrlVariable: input.base_url_variable,
    operations: input.operations.map((operation) => ({
      operationId: operation.operationId,
      method: operation.method,
      path: operation.path,
      requiresAuth: operation.requiresAuth,
      ...(operation.requestBodyExample ? { requestBodyExample: operation.requestBodyExample } : {}),
      expectedStatus: operation.expectedStatus,
      requiredFields: operation.requiredFields,
      requirementIds: operation.requirementIds,
      ...(operation.bodyTemplateVariable
        ? { bodyTemplateVariable: operation.bodyTemplateVariable }
        : {}),
      ...(operation.bodyMutations ? { bodyMutations: operation.bodyMutations } : {}),
      ...(operation.dbValidation ? { dbValidation: operation.dbValidation } : {}),
    })),
    ...(input.existing_collection ? { existingCollection: input.existing_collection } : {}),
    ...(input.sql_sandbox
      ? {
          sqlSandbox: {
            baseUrlVariable: input.sql_sandbox.base_url_variable,
            apiKeyVariable: input.sql_sandbox.api_key_variable,
          },
        }
      : {}),
  });

  const sqlSandboxVariables = input.sql_sandbox
    ? [
        { key: input.sql_sandbox.base_url_variable, value: "", secret: false },
        { key: input.sql_sandbox.api_key_variable, value: "", secret: true },
      ]
    : [];

  const environmentJson = generateOrExtendEnvironment({
    environmentName: input.environment_name ?? `${apiSlug} Local`,
    baseUrl: "",
    baseUrlVariable: input.base_url_variable,
    variables: [
      ...input.environment_variables.map((v) => ({
        key: v.key,
        value: v.value,
        secret: v.secret,
      })),
      ...sqlSandboxVariables,
    ],
    ...(input.existing_environment ? { existingEnvironment: input.existing_environment } : {}),
  });

  const envVariables = (environmentJson["values"] as Array<{ key: string; value: string }>) ?? [];
  const secretFindings = findHardcodedSecretVariables(envVariables);
  for (const finding of secretFindings) warnings.push(finding.reason);

  const collectionPath = `${DEFAULT_PATHS.postmanDir}/${FILE_PREFIX.collection}${apiSlug}.json`;
  const environmentPath = `${DEFAULT_PATHS.postmanDir}/${FILE_PREFIX.environment}${apiSlug}.json`;

  const files: GeneratedFile[] = [
    {
      path: collectionPath,
      operation: input.mode === "create" ? "create" : "update",
      content: JSON.stringify(collectionResult.collectionJson, null, 2),
      reason:
        input.mode === "create"
          ? `Colección nueva con ${collectionResult.addedOperationIds.length} endpoint(s).`
          : `Colección actualizada: +${collectionResult.addedOperationIds.length} nuevos, ~${collectionResult.modifiedOperationIds.length} extendidos/modificados, =${collectionResult.skippedOperationIds.length} sin cambios (ya cubiertos).`,
    },
    {
      path: environmentPath,
      operation: input.existing_environment ? "update" : "create",
      content: JSON.stringify(environmentJson, null, 2),
      reason:
        "Environment con baseUrl y variables declaradas; valores secretos quedan vacíos por seguridad.",
    },
  ];

  return {
    files,
    addedOperationIds: collectionResult.addedOperationIds,
    skippedOperationIds: collectionResult.skippedOperationIds,
    modifiedOperationIds: collectionResult.modifiedOperationIds,
    warnings,
  };
}

export function normalizeApiName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

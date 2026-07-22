import type { HttpMethod, PostmanCollectionSummary } from "../types/index.js";
import { findRequestByOperation, parsePostmanCollection } from "../analyzers/postman-analyzer.js";
import {
  buildAssertions,
  joinAssertions,
  type TestScriptOptions,
} from "./test-script-generator.js";

export interface CollectionOperationInput {
  operationId: string;
  method: HttpMethod;
  path: string;
  requiresAuth: boolean;
  requestBodyExample?: Record<string, unknown>;
  expectedStatus: number;
  requiredFields: string[];
  requirementIds: string[];
}

export interface CollectionGeneratorOptions {
  apiName: string;
  mode: "create" | "extend" | "modify";
  baseUrlVariable: string;
  operations: CollectionOperationInput[];
  existingCollection?: string | Record<string, unknown>;
}

export interface CollectionGenerationResult {
  collectionJson: Record<string, unknown>;
  addedOperationIds: string[];
  skippedOperationIds: string[];
  modifiedOperationIds: string[];
}

interface PostmanItemJson {
  name: string;
  request: {
    method: string;
    header: Array<{ key: string; value: string }>;
    url: { raw: string; host: string[]; path: string[] };
    body?: { mode: "raw"; raw: string; options: { raw: { language: "json" } } };
  };
  event: Array<{ listen: string; script: { type: string; exec: string[] } }>;
}

export function generateOrExtendCollection(
  options: CollectionGeneratorOptions,
): CollectionGenerationResult {
  const existingSummary = options.existingCollection
    ? parsePostmanCollection(options.existingCollection)
    : undefined;
  const existingJson = options.existingCollection
    ? normalizeExisting(options.existingCollection)
    : undefined;

  const items: PostmanItemJson[] = existingJson
    ? ((existingJson.item as PostmanItemJson[] | undefined) ?? [])
    : [];

  const addedOperationIds: string[] = [];
  const skippedOperationIds: string[] = [];
  const modifiedOperationIds: string[] = [];

  for (const operation of options.operations) {
    const existingRequest = existingSummary
      ? findRequestByOperation(existingSummary, operation.method, operation.path)
      : undefined;

    if (existingRequest && options.mode === "extend") {
      const missingFields = operation.requiredFields.filter(
        (field) => !existingRequest.assertionNames.some((name) => name.includes(field)),
      );
      if (missingFields.length === 0 && existingRequest.hasTestScript) {
        skippedOperationIds.push(operation.operationId);
        continue;
      }
      const item = items.find((entry) => entry.name === existingRequest.name);
      if (item) {
        appendAssertions(item, buildTestOptions({ ...operation, requiredFields: missingFields }));
        modifiedOperationIds.push(operation.operationId);
        continue;
      }
    }

    if (existingRequest && options.mode === "modify") {
      const item = items.find((entry) => entry.name === existingRequest.name);
      if (item) {
        replaceAssertions(item, buildTestOptions(operation));
        modifiedOperationIds.push(operation.operationId);
        continue;
      }
    }

    if (existingRequest && options.mode === "create") {
      skippedOperationIds.push(operation.operationId);
      continue;
    }

    items.push(buildItem(operation, options.baseUrlVariable));
    addedOperationIds.push(operation.operationId);
  }

  const collectionJson: Record<string, unknown> = {
    info: {
      name:
        existingJson?.["info"] && typeof existingJson["info"] === "object"
          ? ((existingJson["info"] as { name?: string }).name ?? options.apiName)
          : options.apiName,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: items,
    variable: existingJson?.["variable"] ?? [{ key: options.baseUrlVariable, value: "" }],
  };

  return { collectionJson, addedOperationIds, skippedOperationIds, modifiedOperationIds };
}

function normalizeExisting(source: string | Record<string, unknown>): Record<string, unknown> {
  return typeof source === "string" ? (JSON.parse(source) as Record<string, unknown>) : source;
}

function buildTestOptions(operation: CollectionOperationInput): TestScriptOptions {
  return {
    expectedStatus: operation.expectedStatus,
    requiredFields: operation.requiredFields,
    requirementIds: operation.requirementIds,
    expectedContentType: "application/json",
  };
}

function buildItem(operation: CollectionOperationInput, baseUrlVariable: string): PostmanItemJson {
  const assertions = buildAssertions(buildTestOptions(operation));
  const pathSegments = operation.path.split("/").filter(Boolean);
  const header = operation.requiresAuth
    ? [
        { key: "Authorization", value: "Bearer {{accessToken}}" },
        { key: "Content-Type", value: "application/json" },
      ]
    : [{ key: "Content-Type", value: "application/json" }];

  const item: PostmanItemJson = {
    name: `${operation.method} ${operation.path}`,
    request: {
      method: operation.method,
      header,
      url: {
        raw: `{{${baseUrlVariable}}}${operation.path}`,
        host: [`{{${baseUrlVariable}}}`],
        path: pathSegments,
      },
    },
    event: [
      {
        listen: "test",
        script: { type: "text/javascript", exec: joinAssertions(assertions).split("\n") },
      },
    ],
  };

  if (operation.requestBodyExample) {
    item.request.body = {
      mode: "raw",
      raw: JSON.stringify(operation.requestBodyExample, null, 2),
      options: { raw: { language: "json" } },
    };
  }

  return item;
}

function appendAssertions(item: PostmanItemJson, options: TestScriptOptions): void {
  const assertions = buildAssertions(options);
  if (assertions.length === 0) return;
  const testEvent = item.event.find((event) => event.listen === "test");
  if (testEvent) {
    testEvent.script.exec = [
      ...testEvent.script.exec,
      "",
      ...joinAssertions(assertions).split("\n"),
    ];
  } else {
    item.event.push({
      listen: "test",
      script: { type: "text/javascript", exec: joinAssertions(assertions).split("\n") },
    });
  }
}

function replaceAssertions(item: PostmanItemJson, options: TestScriptOptions): void {
  const assertions = buildAssertions(options);
  const testEvent = item.event.find((event) => event.listen === "test");
  const exec = joinAssertions(assertions).split("\n");
  if (testEvent) {
    testEvent.script.exec = exec;
  } else {
    item.event.push({ listen: "test", script: { type: "text/javascript", exec } });
  }
}

export type { PostmanCollectionSummary };

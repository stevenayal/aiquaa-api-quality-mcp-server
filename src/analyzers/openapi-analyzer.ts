import { parse as parseYaml } from "yaml";
import type {
  ApiOperation,
  HttpMethod,
  JsonSchema,
  SourceReference,
  ValidationRule,
} from "../types/index.js";

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

interface OpenApiDocument {
  paths?: Record<string, Record<string, OpenApiOperationObject>>;
  components?: { schemas?: Record<string, JsonSchema> };
}

interface OpenApiOperationObject {
  operationId?: string;
  summary?: string;
  security?: Array<Record<string, unknown>>;
  requestBody?: {
    content?: Record<string, { schema?: JsonSchema | { $ref: string } }>;
  };
  responses?: Record<
    string,
    { content?: Record<string, { schema?: JsonSchema | { $ref: string } }> }
  >;
}

export function parseOpenApiDocument(source: string | Record<string, unknown>): ApiOperation[] {
  const document = normalizeDocument(source);
  const operations: ApiOperation[] = [];

  for (const [routePath, pathItem] of Object.entries(document.paths ?? {})) {
    for (const [rawMethod, operationObject] of Object.entries(pathItem)) {
      const method = rawMethod.toUpperCase();
      if (!HTTP_METHODS.includes(method as HttpMethod)) continue;
      operations.push(toApiOperation(method as HttpMethod, routePath, operationObject, document));
    }
  }

  return operations;
}

function normalizeDocument(source: string | Record<string, unknown>): OpenApiDocument {
  if (typeof source === "string") {
    const trimmed = source.trim();
    const parsed = trimmed.startsWith("{")
      ? (JSON.parse(trimmed) as unknown)
      : (parseYaml(trimmed) as unknown);
    return parsed as OpenApiDocument;
  }
  return source;
}

function toApiOperation(
  method: HttpMethod,
  routePath: string,
  operationObject: OpenApiOperationObject,
  document: OpenApiDocument,
): ApiOperation {
  const source: SourceReference = { path: "openapi", provenance: "openapi" };
  const requestSchema = resolveSchema(
    operationObject.requestBody?.content?.["application/json"]?.schema,
    document,
  );
  const responseSchemas: Record<string, JsonSchema> = {};
  for (const [status, response] of Object.entries(operationObject.responses ?? {})) {
    const schema = resolveSchema(response.content?.["application/json"]?.schema, document);
    if (schema) responseSchemas[status] = schema;
  }

  return {
    operationId:
      operationObject.operationId ?? `${method.toLowerCase()}${routePath.replace(/[/{}:]/g, "_")}`,
    method,
    path: routePath,
    ...(requestSchema ? { requestSchema } : {}),
    responseSchemas,
    validationRules: requestSchema ? deriveValidationRules(requestSchema) : [],
    businessRules: [],
    sourceFiles: [source],
    ...(operationObject.security && operationObject.security.length > 0
      ? { authentication: { type: "bearer" as const, source } }
      : {}),
  };
}

function resolveSchema(
  schema: JsonSchema | { $ref: string } | undefined,
  document: OpenApiDocument,
): JsonSchema | undefined {
  if (!schema) return undefined;
  if ("$ref" in schema && typeof schema.$ref === "string") {
    const name = schema.$ref.split("/").pop();
    return name ? document.components?.schemas?.[name] : undefined;
  }
  return schema;
}

function deriveValidationRules(schema: JsonSchema): ValidationRule[] {
  const rules: ValidationRule[] = [];
  const source: SourceReference = { path: "openapi", provenance: "openapi" };
  const required = new Set(schema.required ?? []);
  for (const [field, propertySchema] of Object.entries(schema.properties ?? {})) {
    if (required.has(field)) {
      rules.push({ field, kind: "required", detail: `${field} es obligatorio`, source });
    }
    if (propertySchema.minLength !== undefined) {
      rules.push({
        field,
        kind: "min_length",
        detail: `minLength=${propertySchema.minLength}`,
        source,
      });
    }
    if (propertySchema.maxLength !== undefined) {
      rules.push({
        field,
        kind: "max_length",
        detail: `maxLength=${propertySchema.maxLength}`,
        source,
      });
    }
    if (propertySchema.minimum !== undefined) {
      rules.push({ field, kind: "min", detail: `minimum=${propertySchema.minimum}`, source });
    }
    if (propertySchema.maximum !== undefined) {
      rules.push({ field, kind: "max", detail: `maximum=${propertySchema.maximum}`, source });
    }
    if (propertySchema.pattern) {
      rules.push({ field, kind: "pattern", detail: propertySchema.pattern, source });
    }
    if (propertySchema.enum) {
      rules.push({ field, kind: "enum", detail: propertySchema.enum.join(", "), source });
    }
    if (propertySchema.format) {
      rules.push({ field, kind: "format", detail: propertySchema.format, source });
    }
  }
  return rules;
}

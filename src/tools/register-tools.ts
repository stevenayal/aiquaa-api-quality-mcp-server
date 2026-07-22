import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  ApiAnalizarInputObjectSchema,
  ApiAnalizarInputSchema,
  ApiCambiosInputSchema,
  ApiCoberturaInputSchema,
  ApiEjecutarInputSchema,
  ApiFallosInputObjectSchema,
  ApiFallosInputSchema,
  ApiGenerarInputObjectSchema,
  ApiGenerarInputSchema,
  ApiPipelineInputSchema,
  ApiPrInputSchema,
  ApiRequisitosInputSchema,
  ApiValidarInputSchema,
} from "../schemas/index.js";
import type { ResponseFormat } from "../types/index.js";
import { runApiAnalizar } from "./api-analizar.js";
import { runApiRequisitos } from "./api-requisitos.js";
import { runApiCobertura } from "./api-cobertura.js";
import { runApiGenerar } from "./api-generar.js";
import { runApiValidar } from "./api-validar.js";
import { runApiEjecutar } from "./api-ejecutar.js";
import { runApiFallos } from "./api-fallos.js";
import { runApiPipeline } from "./api-pipeline.js";
import { runApiCambios } from "./api-cambios.js";
import { runApiPr } from "./api-pr.js";
import {
  analysisToMarkdown,
  changePlanToMarkdown,
  coverageToMarkdown,
  failuresToMarkdown,
  filesToMarkdown,
  newmanSummaryToMarkdown,
  prResultToMarkdown,
  requirementsToMarkdown,
  validationToMarkdown,
} from "./formatters.js";

export interface ToolContext {
  githubToken?: string;
  aiquaaAccessToken?: string;
}

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const generatingAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const executingAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

const prAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export function registerTools(server: McpServer, _context: ToolContext = {}): void {
  server.registerTool(
    "api_analizar",
    {
      title: "Analizar API y requisitos",
      description:
        "Analiza requisitos, un repositorio GitHub, OpenAPI, comandos curl o archivos fuente. Detecta stack, endpoints, colecciones y workflows existentes.",
      inputSchema: ApiAnalizarInputObjectSchema.shape,
      annotations: readOnlyAnnotations,
    },
    async (rawInput) =>
      safeToolCall(async () => {
        const input = ApiAnalizarInputSchema.parse(rawInput);
        const result = await runApiAnalizar(input);
        return successResult(input.response_format, result, analysisToMarkdown(result));
      }),
  );

  server.registerTool(
    "api_requisitos",
    {
      title: "Estructurar requisitos",
      description:
        "Convierte historias de usuario, criterios de aceptación y reglas de negocio en un modelo estructurado con IDs estables (REQ-/AC-/BR-).",
      inputSchema: ApiRequisitosInputSchema.shape,
      annotations: generatingAnnotations,
    },
    async (rawInput) =>
      safeToolCall(() => {
        const input = ApiRequisitosInputSchema.parse(rawInput);
        const result = runApiRequisitos(input);
        return successResult(input.response_format, result, requirementsToMarkdown(result));
      }),
  );

  server.registerTool(
    "api_cobertura",
    {
      title: "Evaluar cobertura",
      description:
        "Compara requisitos, endpoints y una colección Postman existente. Devuelve una matriz Requirement→Endpoint→Request→Assertions→Status.",
      inputSchema: ApiCoberturaInputSchema.shape,
      annotations: readOnlyAnnotations,
    },
    async (rawInput) =>
      safeToolCall(() => {
        const input = ApiCoberturaInputSchema.parse(rawInput);
        const result = runApiCobertura(input);
        return successResult(input.response_format, result, coverageToMarkdown(result));
      }),
  );

  server.registerTool(
    "api_generar",
    {
      title: "Generar o extender artefactos Postman",
      description:
        "Genera o modifica colecciones Postman v2.1, environments y assertions con trazabilidad. Soporta modos create/extend/modify sin duplicar cobertura existente.",
      inputSchema: ApiGenerarInputObjectSchema.shape,
      annotations: generatingAnnotations,
    },
    async (rawInput) =>
      safeToolCall(() => {
        const input = ApiGenerarInputSchema.parse(rawInput);
        const result = runApiGenerar(input);
        return successResult(input.response_format, result, filesToMarkdown(result.files));
      }),
  );

  server.registerTool(
    "api_validar",
    {
      title: "Validar artefactos Postman",
      description:
        "Valida estructuralmente una colección y environment Postman: JSON válido, schema v2.1, variables, duplicados, scripts y secretos embebidos. No ejecuta contra la API.",
      inputSchema: ApiValidarInputSchema.shape,
      annotations: readOnlyAnnotations,
    },
    async (rawInput) =>
      safeToolCall(() => {
        const input = ApiValidarInputSchema.parse(rawInput);
        const result = runApiValidar(input);
        return successResult(input.response_format, result, validationToMarkdown(result));
      }),
  );

  server.registerTool(
    "api_ejecutar",
    {
      title: "Ejecutar colección con Newman",
      description:
        "Ejecuta Newman contra la API solo cuando el usuario lo invoca explícitamente. Hosts que parecen de producción requieren confirmed_production_run=true.",
      inputSchema: ApiEjecutarInputSchema.shape,
      annotations: executingAnnotations,
    },
    async (rawInput) =>
      safeToolCall(async () => {
        const input = ApiEjecutarInputSchema.parse(rawInput);
        const result = await runApiEjecutar(input);
        return successResult(input.response_format, result, newmanSummaryToMarkdown(result));
      }),
  );

  server.registerTool(
    "api_fallos",
    {
      title: "Analizar fallos de tests",
      description:
        "Clasifica resultados Newman, JUnit o mensajes de error en categorías (error de producto, contrato, datos, auth, test desactualizado, assertion incorrecta, dependencia rota, flaky, timeout, infraestructura).",
      inputSchema: ApiFallosInputObjectSchema.shape,
      annotations: readOnlyAnnotations,
    },
    async (rawInput) =>
      safeToolCall(() => {
        const input = ApiFallosInputSchema.parse(rawInput);
        const result = runApiFallos(input);
        return successResult(input.response_format, result, failuresToMarkdown(result));
      }),
  );

  server.registerTool(
    "api_pipeline",
    {
      title: "Generar pipeline CI",
      description:
        "Genera o extiende un workflow de GitHub Actions o Azure Pipelines con el job de Newman, preservando jobs/steps existentes.",
      inputSchema: ApiPipelineInputSchema.shape,
      annotations: generatingAnnotations,
    },
    async (rawInput) =>
      safeToolCall(() => {
        const input = ApiPipelineInputSchema.parse(rawInput);
        const result = runApiPipeline(input);
        return successResult(input.response_format, result, filesToMarkdown([result]));
      }),
  );

  server.registerTool(
    "api_cambios",
    {
      title: "Plan de cambios",
      description:
        "Devuelve el plan de cambios (create/extend/modify/keep/deprecate) antes de escribir ningún archivo, con cobertura antes/después estimada.",
      inputSchema: ApiCambiosInputSchema.shape,
      annotations: readOnlyAnnotations,
    },
    async (rawInput) =>
      safeToolCall(() => {
        const input = ApiCambiosInputSchema.parse(rawInput);
        const result = runApiCambios(input);
        return successResult(input.response_format, result, changePlanToMarkdown(result));
      }),
  );

  server.registerTool(
    "api_pr",
    {
      title: "Crear pull request",
      description:
        "Crea una rama, aplica los archivos provistos y abre un draft pull request en GitHub. dryRun=true (por defecto) solo devuelve el plan sin escribir nada.",
      inputSchema: ApiPrInputSchema.shape,
      annotations: prAnnotations,
    },
    async (rawInput) =>
      safeToolCall(async () => {
        const input = ApiPrInputSchema.parse(rawInput);
        const result = await runApiPr(input);
        return successResult(input.response_format, result, prResultToMarkdown(result));
      }),
  );
}

async function safeToolCall(
  action: () => CallToolResult | Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    return await action();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [{ type: "text", text: `No se pudo completar la operación: ${message}` }],
    };
  }
}

function successResult(format: ResponseFormat, value: unknown, markdown: string): CallToolResult {
  const structuredContent = toRecord(value);
  const text = format === "json" ? JSON.stringify(value, null, 2) : markdown;
  return {
    content: [{ type: "text", text }],
    structuredContent,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  const normalized = JSON.parse(JSON.stringify(value)) as unknown;
  return typeof normalized === "object" && normalized !== null && !Array.isArray(normalized)
    ? (normalized as Record<string, unknown>)
    : { value: normalized };
}

import { z } from "zod";
import {
  JsonOrTextSchema,
  RepositoryRefSchema,
  ResponseFormatSchema,
  SourceFileSchema,
} from "./common.js";

export const ApiAnalizarInputObjectSchema = z
  .object({
    repository: RepositoryRefSchema.optional().describe(
      "Repositorio a inspeccionar. Si se omite, se analiza solo lo provisto en source_files/openapi/curl_commands.",
    ),
    openapi: JsonOrTextSchema.optional().describe(
      "Documento OpenAPI JSON o YAML, como texto u objeto.",
    ),
    curl_commands: z
      .array(z.string().min(4))
      .optional()
      .describe("Comandos curl que describen uno o más endpoints."),
    requirement_text: z
      .string()
      .min(10)
      .optional()
      .describe("Requisito, historia de usuario o reglas de negocio en texto plano."),
    source_files: z
      .array(SourceFileSchema)
      .optional()
      .describe(
        "Archivos fuente ya obtenidos (controladores, DTOs, validadores, tests, colecciones).",
      ),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const ApiAnalizarInputSchema = ApiAnalizarInputObjectSchema.superRefine((value, ctx) => {
  const hasAnySource = Boolean(
    value.repository ||
      value.openapi ||
      (value.curl_commands && value.curl_commands.length > 0) ||
      value.requirement_text ||
      (value.source_files && value.source_files.length > 0),
  );
  if (!hasAnySource) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Proporcioná al menos una fuente: repository, openapi, curl_commands, requirement_text o source_files.",
      path: ["repository"],
    });
  }
});

export type ApiAnalizarInput = z.infer<typeof ApiAnalizarInputSchema>;

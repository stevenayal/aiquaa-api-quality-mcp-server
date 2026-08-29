import { z } from "zod";
import {
  HttpMethodSchema,
  JsonOrTextSchema,
  RequirementIdSchema,
  ResponseFormatSchema,
} from "./common.js";

const OperationInputSchema = z
  .object({
    operationId: z.string().min(1),
    method: HttpMethodSchema,
    path: z.string().min(1),
    requiresAuth: z.boolean().default(false),
    requestBodyExample: z.record(z.unknown()).optional(),
    expectedStatus: z.number().int().min(100).max(599).default(200),
    requiredFields: z.array(z.string().min(1)).default([]),
    requirementIds: z.array(RequirementIdSchema).default([]),
    bodyTemplateVariable: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Nombre de la collection variable que guarda el JSON base del body. Si se declara sin bodyMutations, el request usa la plantilla directamente; con bodyMutations, un pre-request script la clona y muta.",
      ),
    bodyMutations: z
      .record(z.unknown())
      .optional()
      .describe(
        "Campos a mutar sobre bodyTemplateVariable para armar el body de este caso (ej. un caso negativo).",
      ),
    dbValidation: z
      .object({
        preCondition: z
          .object({ query: z.string().min(1), expect: z.unknown() })
          .strict()
          .optional()
          .describe("Query SQL a validar contra el sandbox antes de disparar el request."),
        postCheck: z
          .object({
            query: z.string().min(1),
            expect: z.unknown(),
            description: z.string().min(1),
          })
          .strict()
          .describe("Query SQL a validar contra el sandbox después de la respuesta."),
      })
      .strict()
      .optional()
      .describe(
        "Verificación de efecto en base de datos vía el sandbox SQL (requiere sql_sandbox configurado a nivel colección).",
      ),
  })
  .strict();

export const ApiGenerarInputObjectSchema = z
  .object({
    api_name: z
      .string()
      .min(1)
      .regex(/^[A-Za-z][A-Za-z0-9_ ]*$/, "Usá letras/números/espacios/guion bajo.")
      .describe("Nombre de la API. Se normaliza a UPPER_SNAKE_CASE para los nombres de archivo."),
    mode: z.enum(["create", "extend", "modify"]).describe("Estrategia de generación."),
    base_url_variable: z.string().min(1).default("baseUrl"),
    operations: z
      .array(OperationInputSchema)
      .min(1)
      .describe("Endpoints a cubrir con requests y assertions."),
    existing_collection: JsonOrTextSchema.optional().describe(
      "Colección Postman v2.1 existente (modo extend/modify).",
    ),
    existing_environment: JsonOrTextSchema.optional().describe("Environment Postman existente."),
    environment_name: z
      .string()
      .min(1)
      .optional()
      .describe("Nombre del environment a crear si no existe uno."),
    environment_variables: z
      .array(
        z
          .object({
            key: z.string().min(1),
            value: z.string().default(""),
            secret: z.boolean().default(false),
          })
          .strict(),
      )
      .default([])
      .describe(
        "Variables adicionales a declarar en el environment (los valores secretos quedan vacíos).",
      ),
    sql_sandbox: z
      .object({
        base_url_variable: z.string().min(1).default("sqlSandboxBaseUrl"),
        api_key_variable: z.string().min(1).default("sqlSandboxApiKey"),
      })
      .strict()
      .optional()
      .describe(
        "Config del sandbox SQL usado para verificar el efecto en base de requests de escritura. Si se declara, se genera un pre-request script de colección y se habilitan dbValidation/bodyTemplateVariable en las operaciones.",
      ),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const ApiGenerarInputSchema = ApiGenerarInputObjectSchema.superRefine((value, ctx) => {
  if ((value.mode === "extend" || value.mode === "modify") && !value.existing_collection) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "mode 'extend' o 'modify' requiere existing_collection.",
      path: ["existing_collection"],
    });
  }
});

export type ApiGenerarInput = z.infer<typeof ApiGenerarInputSchema>;

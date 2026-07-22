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

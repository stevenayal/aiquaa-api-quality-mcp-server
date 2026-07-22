import { z } from "zod";
import {
  JsonOrTextSchema,
  OperationRefSchema,
  RequirementIdSchema,
  ResponseFormatSchema,
} from "./common.js";

const RequirementInputSchema = z
  .object({
    id: RequirementIdSchema,
    text: z.string().min(1),
    operationId: z.string().min(1).optional().describe("Endpoint asociado, si ya se conoce."),
  })
  .strict();

export const ApiCoberturaInputSchema = z
  .object({
    requirements: z
      .array(RequirementInputSchema)
      .min(1)
      .describe("Requisitos/criterios/reglas a evaluar."),
    operations: z
      .array(OperationRefSchema)
      .default([])
      .describe("Endpoints detectados por api_analizar."),
    existing_collection: JsonOrTextSchema.optional().describe(
      "Colección Postman v2.1 existente para cruzar assertions ya implementadas.",
    ),
    response_format: ResponseFormatSchema,
  })
  .strict();

export type ApiCoberturaInput = z.infer<typeof ApiCoberturaInputSchema>;

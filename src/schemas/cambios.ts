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
    operationId: z.string().min(1).optional(),
  })
  .strict();

export const ApiCambiosInputSchema = z
  .object({
    api_name: z.string().min(1),
    requirements: z.array(RequirementInputSchema).min(1),
    operations: z.array(OperationRefSchema).default([]),
    existing_collection: JsonOrTextSchema.optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export type ApiCambiosInput = z.infer<typeof ApiCambiosInputSchema>;

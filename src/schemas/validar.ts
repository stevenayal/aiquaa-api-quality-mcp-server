import { z } from "zod";
import { JsonOrTextSchema, ResponseFormatSchema } from "./common.js";

export const ApiValidarInputSchema = z
  .object({
    collection: JsonOrTextSchema.describe("Colección Postman v2.1 a validar."),
    environment: JsonOrTextSchema.optional().describe(
      "Environment Postman a validar en conjunto con la colección.",
    ),
    response_format: ResponseFormatSchema,
  })
  .strict();

export type ApiValidarInput = z.infer<typeof ApiValidarInputSchema>;

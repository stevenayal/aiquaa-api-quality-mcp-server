import { z } from "zod";
import { JsonOrTextSchema, ResponseFormatSchema } from "./common.js";

export const ApiFallosInputObjectSchema = z
  .object({
    newman_results: JsonOrTextSchema.optional().describe("Salida JSON del reporter de Newman."),
    junit_xml: z.string().min(1).optional().describe("Reporte JUnit XML."),
    error_messages: z
      .array(z.string().min(1))
      .optional()
      .describe("Mensajes de error sueltos a clasificar."),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const ApiFallosInputSchema = ApiFallosInputObjectSchema.superRefine((value, ctx) => {
  if (
    !value.newman_results &&
    !value.junit_xml &&
    !(value.error_messages && value.error_messages.length > 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Proporcioná newman_results, junit_xml o error_messages.",
      path: ["newman_results"],
    });
  }
});

export type ApiFallosInput = z.infer<typeof ApiFallosInputSchema>;

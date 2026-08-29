import { z } from "zod";
import { DEFAULT_PATHS } from "../constants.js";
import { DEFAULT_USAGE_MODEL } from "../usage/pricing.js";
import { ResponseFormatSchema } from "./common.js";

export const ApiUsoTokensInputSchema = z
  .object({
    desde: z
      .string()
      .datetime()
      .optional()
      .describe("Filtra eventos desde esta fecha/hora ISO 8601 UTC (inclusive). Ejemplo: 2026-08-29T00:00:00Z."),
    hasta: z
      .string()
      .datetime()
      .optional()
      .describe("Filtra eventos hasta esta fecha/hora ISO 8601 UTC (inclusive). Ejemplo: 2026-08-29T23:59:59Z."),
    fase: z.enum(["desarrollo", "ejecucion"]).optional().describe("Filtra por fase de automatización."),
    model: z
      .string()
      .default(DEFAULT_USAGE_MODEL)
      .describe("Modelo de referencia para el cálculo de costo estimado."),
    generate_pdf_report: z
      .boolean()
      .default(false)
      .describe(`Genera un reporte PDF del uso de tokens en ${DEFAULT_PATHS.usageReportPdf}.`),
    response_format: ResponseFormatSchema,
  })
  .strict();

export type ApiUsoTokensInput = z.infer<typeof ApiUsoTokensInputSchema>;

import { z } from "zod";
import { DEFAULT_PATHS } from "../constants.js";
import { JsonOrTextSchema, ResponseFormatSchema } from "./common.js";

export const ApiEjecutarInputSchema = z
  .object({
    collection: JsonOrTextSchema.describe("Colección Postman v2.1 a ejecutar."),
    environment: JsonOrTextSchema.optional().describe("Environment Postman a usar."),
    data_file: JsonOrTextSchema.optional().describe("Archivo de datos (iteration data) como JSON."),
    folder: z.string().min(1).optional().describe("Nombre de carpeta/subset a ejecutar."),
    iterations: z.number().int().min(1).max(1000).default(1),
    timeout_ms: z.number().int().min(1000).max(600_000).default(30_000),
    reporters: z.array(z.enum(["cli", "json", "junit", "htmlextra"])).default(["cli", "json"]),
    insecure: z
      .boolean()
      .default(false)
      .describe("Ignora errores de certificado TLS. Usar solo en entornos de prueba controlados."),
    bail: z.boolean().default(false),
    delay_request_ms: z.number().int().min(0).max(60_000).default(0),
    global_variables: z.record(z.string()).default({}),
    generate_pdf_report: z
      .boolean()
      .default(false)
      .describe(`Genera un reporte PDF del resultado de la ejecución en ${DEFAULT_PATHS.newmanReportPdf}.`),
    confirmed_production_run: z
      .boolean()
      .default(false)
      .describe(
        "Debe ser true explícitamente para ejecutar contra un host que parezca de producción (prod, production, api. sin staging/dev).",
      ),
    response_format: ResponseFormatSchema,
  })
  .strict();

export type ApiEjecutarInput = z.infer<typeof ApiEjecutarInputSchema>;

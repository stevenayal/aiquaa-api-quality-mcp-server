import { z } from "zod";
import { RepositoryRefSchema, ResponseFormatSchema } from "./common.js";

const FileChangeSchema = z
  .object({
    path: z.string().min(1),
    content: z.string(),
    operation: z.enum(["create", "update", "delete"]).default("update"),
  })
  .strict();

export const ApiPrInputSchema = z
  .object({
    repository: RepositoryRefSchema,
    base_branch: z
      .string()
      .min(1)
      .optional()
      .describe("Branch base. Por defecto, el default branch del repositorio."),
    branch_name: z
      .string()
      .min(1)
      .optional()
      .describe("Por defecto: test/api-quality/<requirement-or-operation>."),
    title: z
      .string()
      .min(1)
      .optional()
      .describe("Por defecto: test(api): add coverage for <feature>."),
    requirement_source: z
      .string()
      .min(1)
      .optional()
      .describe("Requisito u operación que motiva el cambio, para branch/título por defecto."),
    files: z
      .array(FileChangeSchema)
      .min(1)
      .describe("Archivos a crear/actualizar/eliminar en la rama."),
    summary: z
      .object({
        context: z.string().default(""),
        requirementsEvaluated: z.array(z.string()).default([]),
        endpointsAffected: z.array(z.string()).default([]),
        coverageBefore: z.number().min(0).max(100).default(0),
        coverageAfterEstimated: z.number().min(0).max(100).default(0),
        assumptions: z.array(z.string()).default([]),
        risks: z.array(z.string()).default([]),
        requiredSecrets: z.array(z.string()).default([]),
        runInstructions: z.string().default(""),
      })
      .strict()
      .default({})
      .describe("Contenido para el cuerpo del PR."),
    dry_run: z
      .boolean()
      .default(true)
      .describe("Si es true (por defecto), no escribe nada en GitHub: solo devuelve el plan."),
    draft: z.boolean().default(true).describe("Crea el PR como draft por defecto."),
    response_format: ResponseFormatSchema,
  })
  .strict();

export type ApiPrInput = z.infer<typeof ApiPrInputSchema>;

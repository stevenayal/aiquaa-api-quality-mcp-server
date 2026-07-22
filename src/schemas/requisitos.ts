import { z } from "zod";
import { ResponseFormatSchema } from "./common.js";

export const ApiRequisitosInputSchema = z
  .object({
    text: z
      .string()
      .min(10)
      .describe(
        "Texto libre con historias de usuario, criterios de aceptación y/o reglas de negocio a estructurar.",
      ),
    project_id: z.string().min(1).optional().describe("ID de proyecto AIQUAA, si aplica."),
    id_prefix_offset: z
      .object({
        req: z.number().int().min(1).default(1),
        ac: z.number().int().min(1).default(1),
        br: z.number().int().min(1).default(1),
      })
      .partial()
      .default({})
      .describe("Offset inicial para continuar numeración existente (REQ-/AC-/BR-)."),
    response_format: ResponseFormatSchema,
  })
  .strict();

export type ApiRequisitosInput = z.infer<typeof ApiRequisitosInputSchema>;

import { z } from "zod";
import { ResponseFormatSchema } from "./common.js";

export const ApiPipelineInputSchema = z
  .object({
    api_name: z.string().min(1).describe("Nombre de la API. Se normaliza a UPPER_SNAKE_CASE."),
    target: z.enum(["github_actions", "azure_pipelines"]),
    existing_workflow: z
      .string()
      .min(1)
      .optional()
      .describe("Contenido YAML de un workflow existente a preservar y extender."),
    collection_path: z.string().min(1).default("tests/postman/C_API.json"),
    environment_path: z.string().min(1).default("tests/postman/E_API.json"),
    node_version: z.string().min(1).default("20"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export type ApiPipelineInput = z.infer<typeof ApiPipelineInputSchema>;

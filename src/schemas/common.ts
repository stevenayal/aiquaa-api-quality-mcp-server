import { z } from "zod";

export const ResponseFormatSchema = z
  .enum(["json", "markdown", "files", "patch"])
  .default("markdown")
  .describe("Formato de respuesta. Ejemplo: 'json'.");

export const RequirementIdSchema = z
  .string()
  .min(1)
  .regex(/^(REQ|AC|BR)-\d+$/, "Usá el formato REQ-001, AC-001 o BR-001.")
  .describe("Identificador estable de requisito, criterio o regla. Ejemplo: REQ-142.");

export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

export const SourceFileSchema = z
  .object({
    path: z
      .string()
      .min(1)
      .describe("Ruta relativa dentro del repositorio. Ejemplo: src/users/users.controller.ts."),
    content: z.string().min(1).describe("Contenido completo del archivo fuente."),
  })
  .strict();

export const RepositoryRefSchema = z
  .object({
    owner: z.string().min(1).describe("Owner/organización del repositorio. Ejemplo: aiquaa-labs."),
    name: z.string().min(1).describe("Nombre del repositorio. Ejemplo: customer-api."),
    ref: z
      .string()
      .min(1)
      .optional()
      .describe("Branch, tag o commit SHA a inspeccionar. Por defecto, el default branch."),
  })
  .strict();

export const JsonOrTextSchema = z
  .union([z.string().min(1), z.record(z.unknown())])
  .describe("Contenido como texto (JSON/YAML) u objeto ya parseado.");

export const OperationRefSchema = z
  .object({
    operationId: z.string().min(1),
    method: HttpMethodSchema,
    path: z.string().min(1),
  })
  .strict();

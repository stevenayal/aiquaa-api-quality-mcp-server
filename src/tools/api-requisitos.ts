import type { ApiRequisitosInput } from "../schemas/requisitos.js";
import type { RequirementModel } from "../types/index.js";
import { parseRequirementsFromText } from "../traceability/requirement-parser.js";

export function runApiRequisitos(input: ApiRequisitosInput): RequirementModel {
  return parseRequirementsFromText(input.text, {
    offsets: {
      ...(input.id_prefix_offset.req !== undefined ? { REQ: input.id_prefix_offset.req } : {}),
      ...(input.id_prefix_offset.ac !== undefined ? { AC: input.id_prefix_offset.ac } : {}),
      ...(input.id_prefix_offset.br !== undefined ? { BR: input.id_prefix_offset.br } : {}),
    },
    sourcePath: input.project_id ? `aiquaa:${input.project_id}` : "requirement_text",
  });
}

import type { RequirementItem, RequirementModel, SourceReference } from "../types/index.js";
import { SequentialIdGenerator } from "./id-generator.js";

const BUSINESS_RULE_SIGNAL =
  /\b(debe|no debe|must|shall|must not|regla de negocio|business rule)\b/i;
const ACCEPTANCE_CRITERION_SIGNAL = /^\s*(dado|given|cuando|when|entonces|then|and|y\s)/i;
const USER_STORY_SIGNAL = /\bcomo\b.+\bquiero\b|\bas an?\b.+\bi want\b/i;

export interface ParseRequirementsOptions {
  offsets?: { REQ?: number; AC?: number; BR?: number };
  sourcePath?: string;
}

export function parseRequirementsFromText(
  text: string,
  options: ParseRequirementsOptions = {},
): RequirementModel {
  const generator = new SequentialIdGenerator(options.offsets);
  const source: SourceReference = {
    path: options.sourcePath ?? "requirement_text",
    provenance: "requirement",
  };

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0);

  const requirements: RequirementItem[] = [];
  const acceptanceCriteria: RequirementItem[] = [];
  const businessRules: RequirementItem[] = [];

  let currentRequirementId: string | undefined;

  for (const line of lines) {
    if (ACCEPTANCE_CRITERION_SIGNAL.test(line)) {
      const id = generator.next("AC");
      acceptanceCriteria.push({
        id,
        kind: "acceptance_criterion",
        text: line,
        ...(currentRequirementId ? { parentId: currentRequirementId } : {}),
        source,
      });
      continue;
    }
    if (BUSINESS_RULE_SIGNAL.test(line)) {
      const id = generator.next("BR");
      businessRules.push({
        id,
        kind: "business_rule",
        text: line,
        ...(currentRequirementId ? { parentId: currentRequirementId } : {}),
        source,
      });
      continue;
    }
    const id = generator.next("REQ");
    currentRequirementId = id;
    requirements.push({
      id,
      kind: USER_STORY_SIGNAL.test(line) ? "user_story" : "requirement",
      text: line,
      source,
    });
  }

  return { requirements, acceptanceCriteria, businessRules };
}

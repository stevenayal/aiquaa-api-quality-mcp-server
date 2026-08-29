import type { ChangeDecision, CoverageMatrixEntry, CoverageStatus } from "../types/index.js";

const DECISION_BY_STATUS: Record<CoverageStatus, ChangeDecision> = {
  covered: "keep",
  partially_covered: "extend",
  outdated: "modify",
  uncovered: "create",
  blocked: "block",
  not_applicable: "keep",
};

export function decideForEntry(entry: CoverageMatrixEntry): ChangeDecision {
  return DECISION_BY_STATUS[entry.status];
}

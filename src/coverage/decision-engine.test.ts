import { describe, expect, it } from "vitest";
import { decideForEntry } from "./decision-engine.js";
import type { CoverageMatrixEntry, CoverageStatus, ChangeDecision } from "../types/index.js";

function entry(status: CoverageStatus): CoverageMatrixEntry {
  return { requirementId: "REQ-001", assertionNames: [], status, reason: "test" };
}

describe("decideForEntry", () => {
  const cases: Array<[CoverageStatus, ChangeDecision]> = [
    ["covered", "keep"],
    ["partially_covered", "extend"],
    ["outdated", "modify"],
    ["uncovered", "create"],
    ["blocked", "block"],
    ["not_applicable", "keep"],
  ];

  for (const [status, decision] of cases) {
    it(`maps ${status} to ${decision}`, () => {
      expect(decideForEntry(entry(status))).toBe(decision);
    });
  }
});

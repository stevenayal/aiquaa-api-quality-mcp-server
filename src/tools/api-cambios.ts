import type { ApiCambiosInput } from "../schemas/cambios.js";
import type { ChangePlan } from "../types/index.js";
import { DEFAULT_PATHS, FILE_PREFIX } from "../constants.js";
import { buildCoverageMatrix } from "../coverage/coverage-matrix.js";
import { decideForEntry } from "../coverage/decision-engine.js";
import { parsePostmanCollection } from "../analyzers/postman-analyzer.js";
import { normalizeApiName } from "./api-generar.js";

export function runApiCambios(input: ApiCambiosInput): ChangePlan {
  const existingCollection = input.existing_collection
    ? parsePostmanCollection(input.existing_collection)
    : undefined;
  const { entries, summary } = buildCoverageMatrix(
    input.requirements,
    input.operations,
    existingCollection,
  );

  const apiSlug = normalizeApiName(input.api_name);
  const collectionPath = `${DEFAULT_PATHS.postmanDir}/${FILE_PREFIX.collection}${apiSlug}.json`;
  const environmentPath = `${DEFAULT_PATHS.postmanDir}/${FILE_PREFIX.environment}${apiSlug}.json`;

  const filesToCreate = new Set<string>();
  const filesToModify = new Set<string>();
  const filesToKeep = new Set<string>();
  const risks: string[] = [];

  for (const entry of entries) {
    const decision = decideForEntry(entry);
    if (decision === "create") {
      filesToCreate.add(existingCollection ? environmentPath : collectionPath);
      filesToCreate.add(collectionPath);
    } else if (decision === "extend" || decision === "modify") {
      filesToModify.add(collectionPath);
    } else if (decision === "keep") {
      filesToKeep.add(collectionPath);
    } else if (decision === "block") {
      risks.push(`${entry.requirementId}: ${entry.reason}`);
    }
  }

  const strategy = existingCollection
    ? filesToModify.size > 0 || filesToCreate.size > 0
      ? "extend"
      : "keep"
    : "create";

  const coveredAfter = entries.filter(
    (entry) => entry.status !== "not_applicable" && entry.status !== "blocked",
  ).length;
  const applicable = entries.length - summary.notApplicable;
  const coverageAfterEstimated = applicable > 0 ? Math.round((coveredAfter / applicable) * 100) : 0;

  return {
    strategy,
    filesToCreate: [...filesToCreate],
    filesToModify: [...filesToModify],
    filesToKeep: [...filesToKeep],
    filesToDeprecate: [],
    coverageBefore: summary.coveragePercentage,
    coverageAfterEstimated,
    risks,
  };
}

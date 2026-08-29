import type {
  CoverageMatrixEntry,
  CoverageStatus,
  CoverageSummary,
  HttpMethod,
  PostmanCollectionSummary,
} from "../types/index.js";
import { findRequestByOperation } from "../analyzers/postman-analyzer.js";

export interface CoverageRequirementRef {
  id: string;
  text: string;
  operationId?: string | undefined;
}

export interface CoverageOperationRef {
  operationId: string;
  method: HttpMethod;
  path: string;
}

export interface CoverageMatrixResult {
  entries: CoverageMatrixEntry[];
  summary: CoverageSummary;
}

export function buildCoverageMatrix(
  requirements: CoverageRequirementRef[],
  operations: CoverageOperationRef[],
  existingCollection?: PostmanCollectionSummary,
): CoverageMatrixResult {
  const entries = requirements.map((requirement) =>
    buildEntry(requirement, operations, existingCollection),
  );
  return { entries, summary: buildSummary(entries) };
}

function buildEntry(
  requirement: CoverageRequirementRef,
  operations: CoverageOperationRef[],
  existingCollection?: PostmanCollectionSummary,
): CoverageMatrixEntry {
  const operation = requirement.operationId
    ? operations.find((op) => op.operationId === requirement.operationId)
    : undefined;

  if (!operation) {
    return {
      requirementId: requirement.id,
      assertionNames: [],
      status: "blocked",
      reason: requirement.operationId
        ? `No se encontró ningún endpoint con operationId "${requirement.operationId}".`
        : "El requisito no tiene operationId asociado a ningún endpoint conocido.",
    };
  }

  if (!existingCollection) {
    return {
      requirementId: requirement.id,
      operationId: operation.operationId,
      assertionNames: [],
      status: "uncovered",
      reason: "No existe colección Postman todavía; hay que generar el request.",
    };
  }

  const request = findRequestByOperation(existingCollection, operation.method, operation.path);
  if (!request) {
    return {
      requirementId: requirement.id,
      operationId: operation.operationId,
      assertionNames: [],
      status: "uncovered",
      reason: "No hay un request en la colección existente para este endpoint.",
    };
  }

  if (!request.hasTestScript) {
    return {
      requirementId: requirement.id,
      operationId: operation.operationId,
      requestName: request.name,
      assertionNames: request.assertionNames,
      status: "uncovered",
      reason: `El request "${request.name}" existe pero no tiene test script.`,
    };
  }

  const hasRequirementAssertion = request.assertionNames.some((name) =>
    name.includes(requirement.id),
  );
  if (!hasRequirementAssertion) {
    return {
      requirementId: requirement.id,
      operationId: operation.operationId,
      requestName: request.name,
      assertionNames: request.assertionNames,
      status: "partially_covered",
      reason: `El request "${request.name}" tiene test script pero ninguna assertion referencia ${requirement.id}.`,
    };
  }

  return {
    requirementId: requirement.id,
    operationId: operation.operationId,
    requestName: request.name,
    assertionNames: request.assertionNames,
    status: "covered",
    reason: `El request "${request.name}" cubre ${requirement.id} con una assertion trazable.`,
  };
}

function buildSummary(entries: CoverageMatrixEntry[]): CoverageSummary {
  const counts: Record<CoverageStatus, number> = {
    covered: 0,
    partially_covered: 0,
    uncovered: 0,
    outdated: 0,
    blocked: 0,
    not_applicable: 0,
  };
  for (const entry of entries) counts[entry.status] += 1;

  const applicable = entries.length - counts.not_applicable;
  const coveragePercentage =
    applicable > 0 ? Math.round((counts.covered / applicable) * 100) : 0;

  return {
    totalRequirements: entries.length,
    covered: counts.covered,
    partiallyCovered: counts.partially_covered,
    uncovered: counts.uncovered,
    outdated: counts.outdated,
    blocked: counts.blocked,
    notApplicable: counts.not_applicable,
    coveragePercentage,
  };
}

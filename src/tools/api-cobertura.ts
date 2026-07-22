import type { ApiCoberturaInput } from "../schemas/cobertura.js";
import type { CoverageMatrixResult } from "../coverage/coverage-matrix.js";
import { buildCoverageMatrix } from "../coverage/coverage-matrix.js";
import { parsePostmanCollection } from "../analyzers/postman-analyzer.js";

export function runApiCobertura(input: ApiCoberturaInput): CoverageMatrixResult {
  const existingCollection = input.existing_collection
    ? parsePostmanCollection(input.existing_collection)
    : undefined;
  return buildCoverageMatrix(input.requirements, input.operations, existingCollection);
}

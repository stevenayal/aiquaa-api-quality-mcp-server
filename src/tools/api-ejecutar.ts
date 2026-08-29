import type { ApiEjecutarInput } from "../schemas/ejecutar.js";
import type { NewmanRunSummary } from "../types/index.js";
import { DEFAULT_PATHS } from "../constants.js";
import { runNewman } from "../execution/newman-runner.js";
import { buildNewmanPdfReport } from "../reporting/newman-pdf-report.js";
import { writePdfReport } from "../reporting/pdf-helpers.js";

export async function runApiEjecutar(
  input: ApiEjecutarInput,
  newmanRunner: typeof runNewman = runNewman,
): Promise<NewmanRunSummary> {
  const collection: Record<string, unknown> =
    typeof input.collection === "string"
      ? (JSON.parse(input.collection) as Record<string, unknown>)
      : input.collection;
  const environment: Record<string, unknown> | undefined = input.environment
    ? typeof input.environment === "string"
      ? (JSON.parse(input.environment) as Record<string, unknown>)
      : input.environment
    : undefined;
  const dataFile: Record<string, unknown>[] | undefined = input.data_file
    ? ((typeof input.data_file === "string"
        ? JSON.parse(input.data_file)
        : input.data_file) as Record<string, unknown>[])
    : undefined;

  const summary = await newmanRunner({
    collection,
    ...(environment ? { environment } : {}),
    ...(dataFile ? { dataFile } : {}),
    ...(input.folder ? { folder: input.folder } : {}),
    iterations: input.iterations,
    timeoutMs: input.timeout_ms,
    reporters: input.reporters,
    insecure: input.insecure,
    bail: input.bail,
    delayRequestMs: input.delay_request_ms,
    globalVariables: input.global_variables,
    confirmedProductionRun: input.confirmed_production_run,
  });

  if (!input.generate_pdf_report) return summary;

  const environmentName =
    typeof environment?.["name"] === "string" ? environment["name"] : undefined;
  const pdfBuffer = await buildNewmanPdfReport(summary, {
    ...(environmentName ? { environmentName } : {}),
  });
  const pdfReportPath = await writePdfReport(DEFAULT_PATHS.newmanReportPdf, pdfBuffer);
  return { ...summary, pdfReportPath };
}

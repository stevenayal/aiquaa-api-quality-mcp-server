import type { ApiUsoTokensInput } from "../schemas/uso-tokens.js";
import type { UsageReport } from "../usage/types.js";
import { DEFAULT_PATHS } from "../constants.js";
import { readUsageEvents } from "../usage/usage-store.js";
import { buildUsageReport } from "../usage/usage-aggregator.js";
import { buildUsagePdfReport } from "../reporting/usage-pdf-report.js";
import { writePdfReport } from "../reporting/pdf-helpers.js";

export async function runApiUsoTokens(
  input: ApiUsoTokensInput,
  readEvents: typeof readUsageEvents = readUsageEvents,
): Promise<UsageReport> {
  const events = await readEvents({
    ...(input.desde ? { desde: input.desde } : {}),
    ...(input.hasta ? { hasta: input.hasta } : {}),
    ...(input.fase ? { fase: input.fase } : {}),
  });

  const report = buildUsageReport(events, input.model);
  if (!input.generate_pdf_report) return report;

  const pdfBuffer = await buildUsagePdfReport(report);
  const pdfReportPath = await writePdfReport(DEFAULT_PATHS.usageReportPdf, pdfBuffer);
  return { ...report, pdfReportPath };
}

import PDFDocument from "pdfkit";
import type { UsageReport } from "../usage/types.js";
import {
  collectPdfBuffer,
  drawDocumentHeader,
  drawKeyValueTable,
  drawSectionTitle,
  drawFooterPageNumbers,
} from "./pdf-helpers.js";

export async function buildUsagePdfReport(report: UsageReport): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50, bufferPages: true });
  const bufferPromise = collectPdfBuffer(doc);

  drawDocumentHeader(
    doc,
    "Reporte de uso de tokens",
    `Modelo de referencia: ${report.model}`,
    new Date(report.generatedAt),
  );

  doc.fontSize(9).fillColor("#c0392b").text(report.disclaimer, { width: 495 });
  doc.moveDown(0.75);

  drawSectionTitle(doc, "Total");
  drawKeyValueTable(doc, [
    ["Llamadas", String(report.total.calls)],
    ["Tokens estimados (input)", String(report.total.estimatedInputTokens)],
    ["Tokens estimados (output)", String(report.total.estimatedOutputTokens)],
    ["Tokens estimados (total)", String(report.total.estimatedTokens)],
    ["Costo estimado (USD)", report.total.estimatedCostUsd.toFixed(4)],
  ]);

  for (const phase of ["desarrollo", "ejecucion"] as const) {
    const stats = report.byPhase[phase];
    drawSectionTitle(doc, `Fase: ${phase}`);
    drawKeyValueTable(doc, [
      ["Llamadas", String(stats.calls)],
      ["Tokens estimados (total)", String(stats.estimatedTokens)],
      ["Costo estimado (USD)", stats.estimatedCostUsd.toFixed(4)],
    ]);
  }

  drawSectionTitle(doc, `Desglose por tool (${report.byTool.length})`);
  for (const tool of report.byTool) {
    doc
      .fontSize(10)
      .fillColor("#111111")
      .text(
        `${tool.toolName} [${tool.phase}] — ${tool.calls} llamadas, ${tool.estimatedTokens} tokens, $${tool.estimatedCostUsd.toFixed(4)}`,
      );
  }

  drawFooterPageNumbers(doc);
  doc.end();
  return bufferPromise;
}

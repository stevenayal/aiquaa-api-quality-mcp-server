import PDFDocument from "pdfkit";
import type { NewmanRunSummary } from "../types/index.js";
import {
  collectPdfBuffer,
  drawDocumentHeader,
  drawFooterPageNumbers,
  drawKeyValueTable,
  drawSectionTitle,
} from "./pdf-helpers.js";

export interface NewmanPdfReportMeta {
  environmentName?: string;
  generatedAt?: Date;
}

export async function buildNewmanPdfReport(
  summary: NewmanRunSummary,
  meta: NewmanPdfReportMeta = {},
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50, bufferPages: true });
  const bufferPromise = collectPdfBuffer(doc);

  drawDocumentHeader(
    doc,
    "Reporte de ejecución Postman",
    summary.collectionName,
    meta.generatedAt ?? new Date(),
  );

  const statsRows: Array<[string, string]> = [
    ["Requests", String(summary.totalRequests)],
    ["Assertions", String(summary.totalAssertions)],
    ["Fallidas", String(summary.failedAssertions)],
    ["Duración", `${summary.durationMs} ms`],
  ];
  if (meta.environmentName) statsRows.unshift(["Environment", meta.environmentName]);
  drawKeyValueTable(doc, statsRows);

  drawSectionTitle(doc, `Resultados por request (${summary.results.length})`);
  for (const result of summary.results) {
    doc
      .fontSize(10)
      .fillColor(result.passed ? "#1a7f37" : "#c0392b")
      .text(`${result.passed ? "PASS" : "FAIL"}  ${result.requestName} → ${result.assertionName}`);
    if (!result.passed && result.errorMessage) {
      doc.fontSize(9).fillColor("#666666").text(`   ${result.errorMessage}`);
    }
  }

  if (summary.failedAssertions > 0) {
    drawSectionTitle(doc, "Detalle de fallas");
    for (const result of summary.results.filter((r) => !r.passed)) {
      doc.fontSize(10).fillColor("#111111").text(`${result.requestName} → ${result.assertionName}`);
      doc
        .fontSize(9)
        .fillColor("#c0392b")
        .text(result.errorMessage ?? "Sin mensaje de error.");
      doc.moveDown(0.3);
    }
  }

  drawFooterPageNumbers(doc);
  doc.end();
  return bufferPromise;
}

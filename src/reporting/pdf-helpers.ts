import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export function collectPdfBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export async function writePdfReport(path: string, buffer: Buffer): Promise<string> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);
  return path;
}

export function drawDocumentHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  subtitle: string,
  generatedAt: Date,
): void {
  doc.fontSize(20).fillColor("#111111").text(title, { align: "left" });
  doc.fontSize(12).fillColor("#333333").text(subtitle);
  doc.fontSize(9).fillColor("#777777").text(`Generado: ${generatedAt.toISOString()}`);
  doc.moveDown(1);
}

export function drawKeyValueTable(doc: PDFKit.PDFDocument, rows: Array<[string, string]>): void {
  const startX = doc.x;
  const labelWidth = 160;
  for (const [label, value] of rows) {
    const y = doc.y;
    doc.fontSize(10).fillColor("#111111").text(label, startX, y, { width: labelWidth, continued: false });
    doc.fontSize(10).fillColor("#333333").text(value, startX + labelWidth, y);
  }
  doc.moveDown(0.75);
}

export function drawSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor("#111111").text(title, { underline: true });
  doc.moveDown(0.4);
}

export function drawFooterPageNumbers(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc
      .fontSize(8)
      .fillColor("#999999")
      .text(`Página ${i + 1} de ${range.count}`, 50, doc.page.height - 40, {
        width: doc.page.width - 100,
        align: "center",
      });
  }
}

import { describe, expect, it, afterEach } from "vitest";
import { readFile, rm } from "node:fs/promises";
import { runApiEjecutar } from "./api-ejecutar.js";
import type { NewmanRunSummary } from "../types/index.js";
import { DEFAULT_PATHS } from "../constants.js";

const baseSummary: NewmanRunSummary = {
  collectionName: "Sample API",
  totalRequests: 1,
  totalAssertions: 1,
  failedAssertions: 0,
  durationMs: 100,
  results: [{ requestName: "GET /ping", assertionName: "status is 200", passed: true }],
};

const baseInput = {
  collection: JSON.stringify({ info: { name: "Sample API" }, item: [] }),
  iterations: 1,
  timeout_ms: 5000,
  reporters: ["json"] as const,
  insecure: false,
  bail: false,
  delay_request_ms: 0,
  global_variables: {},
  confirmed_production_run: false,
  response_format: "json" as const,
};

describe("runApiEjecutar", () => {
  afterEach(async () => {
    await rm(DEFAULT_PATHS.newmanReportPdf, { force: true });
  });

  it("returns the summary as-is when generate_pdf_report is false", async () => {
    const result = await runApiEjecutar(
      { ...baseInput, generate_pdf_report: false },
      () => Promise.resolve(baseSummary),
    );
    expect(result.pdfReportPath).toBeUndefined();
  });

  it("generates a PDF report when generate_pdf_report is true", async () => {
    const result = await runApiEjecutar(
      { ...baseInput, generate_pdf_report: true },
      () => Promise.resolve(baseSummary),
    );

    expect(result.pdfReportPath).toBe(DEFAULT_PATHS.newmanReportPdf);
    const written = await readFile(result.pdfReportPath as string);
    expect(written.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});

import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordUsageEvent, readUsageEvents } from "../usage/usage-store.js";
import { runApiUsoTokens } from "./api-uso-tokens.js";
import { DEFAULT_PATHS } from "../constants.js";

describe("runApiUsoTokens", () => {
  let workdir: string;

  afterEach(async () => {
    if (workdir) await rm(workdir, { recursive: true, force: true });
  });

  it("aggregates events read from the usage store", async () => {
    workdir = await mkdtemp(join(tmpdir(), "aiquaa-uso-tokens-"));
    const logPath = join(workdir, "usage-log.jsonl");

    await recordUsageEvent(
      {
        toolName: "api_generar",
        phase: "desarrollo",
        timestamp: "2026-08-29T00:00:00.000Z",
        durationMs: 5,
        estimatedInputTokens: 100,
        estimatedOutputTokens: 50,
      },
      logPath,
    );

    const report = await runApiUsoTokens(
      { model: "claude-sonnet-5", generate_pdf_report: false, response_format: "json" },
      (filters) => readUsageEvents(filters, logPath),
    );

    expect(report.total.calls).toBe(1);
    expect(report.total.estimatedTokens).toBe(150);
    expect(report.pdfReportPath).toBeUndefined();
  });

  it("writes a PDF report when generate_pdf_report is true", async () => {
    const report = await runApiUsoTokens(
      { model: "claude-sonnet-5", generate_pdf_report: true, response_format: "json" },
      () => Promise.resolve([]),
    );

    expect(report.pdfReportPath).toBe(DEFAULT_PATHS.usageReportPdf);
    const written = await readFile(report.pdfReportPath as string);
    expect(written.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    await rm(DEFAULT_PATHS.usageReportPdf, { force: true });
  });
});

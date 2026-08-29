import { describe, expect, it } from "vitest";
import { buildUsagePdfReport } from "./usage-pdf-report.js";
import { buildUsageReport } from "../usage/usage-aggregator.js";

describe("buildUsagePdfReport", () => {
  it("produces a valid PDF buffer", async () => {
    const report = buildUsageReport(
      [
        {
          toolName: "api_generar",
          phase: "desarrollo",
          timestamp: "2026-08-29T00:00:00.000Z",
          durationMs: 10,
          estimatedInputTokens: 100,
          estimatedOutputTokens: 50,
        },
      ],
      "claude-sonnet-5",
    );
    const buffer = await buildUsagePdfReport(report);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(100);
  });
});

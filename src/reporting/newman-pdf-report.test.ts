import { describe, expect, it } from "vitest";
import { buildNewmanPdfReport } from "./newman-pdf-report.js";
import type { NewmanRunSummary } from "../types/index.js";

const summary: NewmanRunSummary = {
  collectionName: "Sample API",
  totalRequests: 2,
  totalAssertions: 3,
  failedAssertions: 1,
  durationMs: 456,
  results: [
    { requestName: "GET /ping", assertionName: "status is 200", passed: true },
    {
      requestName: "POST /users",
      assertionName: "status is 201",
      passed: false,
      errorMessage: "expected 201, got 500",
    },
  ],
};

describe("buildNewmanPdfReport", () => {
  it("produces a valid PDF buffer", async () => {
    const buffer = await buildNewmanPdfReport(summary, { environmentName: "staging" });
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(100);
  });

  it("works without optional environment metadata", async () => {
    const buffer = await buildNewmanPdfReport({ ...summary, failedAssertions: 0, results: [] });
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});

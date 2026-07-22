import { describe, expect, it, vi } from "vitest";
import { writeFile } from "node:fs/promises";
import { runNewman, parseNewmanJson } from "./newman-runner.js";
import { GuardrailViolationError } from "../security/guardrails.js";

const NEWMAN_JSON = {
  collection: { info: { name: "Sample API" } },
  run: {
    stats: { requests: { total: 1 }, assertions: { total: 1, failed: 0 } },
    timings: { started: 1000, completed: 1200 },
    executions: [
      {
        item: { name: "GET /ping" },
        response: { responseTime: 42 },
        assertions: [{ assertion: "status is 200" }],
      },
    ],
  },
};

describe("parseNewmanJson", () => {
  it("flattens executions into a NewmanRunSummary", () => {
    const summary = parseNewmanJson(NEWMAN_JSON);
    expect(summary.collectionName).toBe("Sample API");
    expect(summary.totalRequests).toBe(1);
    expect(summary.failedAssertions).toBe(0);
    expect(summary.durationMs).toBe(200);
    expect(summary.results[0]).toMatchObject({
      requestName: "GET /ping",
      passed: true,
      responseTimeMs: 42,
    });
  });
});

describe("runNewman", () => {
  it("writes collection/environment to temp files and parses the resulting report", async () => {
    const runner = vi.fn(async (options: { args: string[] }) => {
      const exportIndex = options.args.indexOf("--reporter-json-export");
      const resultsPath = options.args[exportIndex + 1] as string;
      await writeFile(resultsPath, JSON.stringify(NEWMAN_JSON), "utf-8");
      return "";
    });

    const summary = await runNewman(
      {
        collection: { info: { name: "Sample API" }, item: [] },
        environment: { values: [{ key: "baseUrl", value: "http://localhost:5000" }] },
        iterations: 1,
        timeoutMs: 5000,
        reporters: ["json"],
        insecure: false,
        bail: false,
        delayRequestMs: 0,
        globalVariables: {},
        confirmedProductionRun: false,
      },
      runner,
    );

    expect(summary.collectionName).toBe("Sample API");
    expect(runner).toHaveBeenCalled();
  });

  it("refuses to run against a host that looks like production without confirmation", async () => {
    const runner = vi.fn();
    await expect(
      runNewman(
        {
          collection: { info: { name: "Sample API" }, item: [] },
          environment: { values: [{ key: "baseUrl", value: "https://api.prod.example.com" }] },
          iterations: 1,
          timeoutMs: 5000,
          reporters: ["json"],
          insecure: false,
          bail: false,
          delayRequestMs: 0,
          globalVariables: {},
          confirmedProductionRun: false,
        },
        runner,
      ),
    ).rejects.toThrow(GuardrailViolationError);
    expect(runner).not.toHaveBeenCalled();
  });
});

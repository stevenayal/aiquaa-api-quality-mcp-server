import { describe, expect, it } from "vitest";
import { buildUsageReport } from "./usage-aggregator.js";
import type { UsageEvent } from "./types.js";

const events: UsageEvent[] = [
  {
    toolName: "api_generar",
    phase: "desarrollo",
    timestamp: "2026-08-29T00:00:00.000Z",
    durationMs: 10,
    estimatedInputTokens: 1000,
    estimatedOutputTokens: 500,
  },
  {
    toolName: "api_generar",
    phase: "desarrollo",
    timestamp: "2026-08-29T00:01:00.000Z",
    durationMs: 12,
    estimatedInputTokens: 200,
    estimatedOutputTokens: 100,
  },
  {
    toolName: "api_ejecutar",
    phase: "ejecucion",
    timestamp: "2026-08-29T00:02:00.000Z",
    durationMs: 500,
    estimatedInputTokens: 300,
    estimatedOutputTokens: 900,
  },
];

describe("buildUsageReport", () => {
  it("aggregates totals, per-phase and per-tool stats", () => {
    const report = buildUsageReport(events, "claude-sonnet-5", new Date("2026-08-29T01:00:00.000Z"));

    expect(report.model).toBe("claude-sonnet-5");
    expect(report.generatedAt).toBe("2026-08-29T01:00:00.000Z");
    expect(report.total.calls).toBe(3);
    expect(report.total.estimatedInputTokens).toBe(1500);
    expect(report.total.estimatedOutputTokens).toBe(1500);
    expect(report.total.estimatedTokens).toBe(3000);

    expect(report.byPhase.desarrollo.calls).toBe(2);
    expect(report.byPhase.desarrollo.estimatedTokens).toBe(1800);
    expect(report.byPhase.ejecucion.calls).toBe(1);
    expect(report.byPhase.ejecucion.estimatedTokens).toBe(1200);

    const generarStats = report.byTool.find((t) => t.toolName === "api_generar");
    expect(generarStats?.calls).toBe(2);
    expect(generarStats?.estimatedTokens).toBe(1800);

    expect(report.disclaimer).toMatch(/estimación/i);
  });

  it("returns zeroed stats for an empty event list", () => {
    const report = buildUsageReport([], "claude-sonnet-5");
    expect(report.total.calls).toBe(0);
    expect(report.total.estimatedCostUsd).toBe(0);
    expect(report.byTool).toEqual([]);
  });
});

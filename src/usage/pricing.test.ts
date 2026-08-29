import { describe, expect, it } from "vitest";
import { DEFAULT_USAGE_MODEL, estimateCostUsd, resolvePricing } from "./pricing.js";

describe("resolvePricing", () => {
  it("returns the known pricing for a listed model", () => {
    expect(resolvePricing("claude-opus-5")).toEqual({
      inputPerMillionUsd: 5,
      outputPerMillionUsd: 25,
    });
  });

  it("falls back to the default model for an unknown model", () => {
    expect(resolvePricing("some-unknown-model")).toEqual(resolvePricing(DEFAULT_USAGE_MODEL));
  });
});

describe("estimateCostUsd", () => {
  it("computes cost from input/output tokens at the model's rate", () => {
    const cost = estimateCostUsd(1_000_000, 1_000_000, "claude-sonnet-5");
    expect(cost).toBeCloseTo(2 + 10, 5);
  });

  it("returns 0 for zero tokens", () => {
    expect(estimateCostUsd(0, 0, "claude-sonnet-5")).toBe(0);
  });
});

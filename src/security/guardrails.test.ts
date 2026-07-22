import { describe, expect, it } from "vitest";
import {
  assertDryRunDefault,
  assertProductionRunAuthorized,
  GuardrailViolationError,
} from "./guardrails.js";

describe("assertProductionRunAuthorized", () => {
  it("throws when the host looks like production and is not confirmed", () => {
    expect(() => assertProductionRunAuthorized(true, false)).toThrow(GuardrailViolationError);
  });

  it("does not throw when confirmed", () => {
    expect(() => assertProductionRunAuthorized(true, true)).not.toThrow();
  });

  it("does not throw when the host is not production", () => {
    expect(() => assertProductionRunAuthorized(false, false)).not.toThrow();
  });
});

describe("assertDryRunDefault", () => {
  it("throws when dryRun is not a boolean", () => {
    expect(() => assertDryRunDefault(undefined)).toThrow(GuardrailViolationError);
  });

  it("does not throw for an explicit boolean", () => {
    expect(() => assertDryRunDefault(true)).not.toThrow();
  });
});

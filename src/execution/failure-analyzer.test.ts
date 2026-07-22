import { describe, expect, it } from "vitest";
import { analyzeFailures, classifyErrorMessage } from "./failure-analyzer.js";

describe("classifyErrorMessage", () => {
  it("classifies connection refused as infrastructure", () => {
    expect(classifyErrorMessage("connect ECONNREFUSED 127.0.0.1:5000").category).toBe(
      "infrastructure",
    );
  });

  it("classifies a 401/403 message as auth_error", () => {
    expect(classifyErrorMessage("expected 401 to equal 200: unauthorized").category).toBe(
      "auth_error",
    );
  });

  it("classifies a 5xx expectation as product_defect with high confidence", () => {
    const result = classifyErrorMessage("expected 500 to equal 200");
    expect(result.category).toBe("product_defect");
    expect(result.confidence).toBe("high");
  });

  it("falls back to wrong_assertion with low confidence for unknown messages", () => {
    const result = classifyErrorMessage("something odd happened");
    expect(result.category).toBe("wrong_assertion");
    expect(result.confidence).toBe("low");
  });
});

describe("analyzeFailures", () => {
  it("only analyzes failed results", () => {
    const results = [
      { requestName: "GET /a", assertionName: "status is 200", passed: true },
      {
        requestName: "GET /b",
        assertionName: "status is 200",
        passed: false,
        errorMessage: "ECONNREFUSED",
      },
    ];
    const analyses = analyzeFailures(results);
    expect(analyses).toHaveLength(1);
    expect(analyses[0]!.requestName).toBe("GET /b");
  });
});

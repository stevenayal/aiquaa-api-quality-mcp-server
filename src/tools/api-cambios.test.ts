import { describe, expect, it } from "vitest";
import { runApiCambios } from "./api-cambios.js";

describe("runApiCambios", () => {
  it("plans a create strategy when there is no existing collection", () => {
    const plan = runApiCambios({
      api_name: "Users API",
      requirements: [{ id: "REQ-001", text: "Get user", operationId: "getUser" }],
      operations: [{ operationId: "getUser", method: "GET", path: "/users/{id}" }],
      response_format: "json",
    });
    expect(plan.strategy).toBe("create");
    expect(plan.coverageAfterEstimated).toBeGreaterThan(plan.coverageBefore);
  });

  it("reports a risk for uncovered requirements with no known operation", () => {
    const plan = runApiCambios({
      api_name: "Users API",
      requirements: [{ id: "REQ-002", text: "Something with no matching endpoint" }],
      operations: [],
      response_format: "json",
    });
    expect(plan.risks.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { buildCoverageMatrix } from "./coverage-matrix.js";
import type { PostmanCollectionSummary } from "../types/index.js";

describe("buildCoverageMatrix", () => {
  it("marks a requirement as blocked when it has no resolvable operation", () => {
    const { entries, summary } = buildCoverageMatrix(
      [{ id: "REQ-001", text: "Something with no matching endpoint" }],
      [],
    );
    expect(entries[0]?.status).toBe("blocked");
    expect(summary.blocked).toBe(1);
  });

  it("marks a requirement as blocked when operationId doesn't match any operation", () => {
    const { entries } = buildCoverageMatrix(
      [{ id: "REQ-001", text: "Get user", operationId: "getUser" }],
      [{ operationId: "createUser", method: "POST", path: "/users" }],
    );
    expect(entries[0]?.status).toBe("blocked");
  });

  it("marks a requirement as uncovered when there is no existing collection", () => {
    const { entries, summary } = buildCoverageMatrix(
      [{ id: "REQ-001", text: "Get user", operationId: "getUser" }],
      [{ operationId: "getUser", method: "GET", path: "/users/{id}" }],
    );
    expect(entries[0]?.status).toBe("uncovered");
    expect(summary.coveragePercentage).toBe(0);
  });

  it("marks a requirement as covered when a matching request has a traceable assertion", () => {
    const collection: PostmanCollectionSummary = {
      name: "Users API",
      variables: [],
      requests: [
        {
          id: "1",
          name: "GET /users/{id}",
          method: "GET",
          url: "{{baseUrl}}/users/1",
          assertionNames: ["REQ-001 | status is 200"],
          hasPreRequestScript: false,
          hasTestScript: true,
        },
      ],
    };
    const { entries, summary } = buildCoverageMatrix(
      [{ id: "REQ-001", text: "Get user", operationId: "getUser" }],
      [{ operationId: "getUser", method: "GET", path: "/users/{id}" }],
      collection,
    );
    expect(entries[0]?.status).toBe("covered");
    expect(summary.coveragePercentage).toBe(100);
  });

  it("marks a requirement as partially_covered when the request has tests but not for this requirement", () => {
    const collection: PostmanCollectionSummary = {
      name: "Users API",
      variables: [],
      requests: [
        {
          id: "1",
          name: "GET /users/{id}",
          method: "GET",
          url: "{{baseUrl}}/users/1",
          assertionNames: ["REQ-999 | status is 200"],
          hasPreRequestScript: false,
          hasTestScript: true,
        },
      ],
    };
    const { entries } = buildCoverageMatrix(
      [{ id: "REQ-001", text: "Get user", operationId: "getUser" }],
      [{ operationId: "getUser", method: "GET", path: "/users/{id}" }],
      collection,
    );
    expect(entries[0]?.status).toBe("partially_covered");
  });
});

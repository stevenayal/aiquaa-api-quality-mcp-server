import { describe, expect, it } from "vitest";
import { runPrFlow } from "./pr-flow.js";
import { GitHubClientError } from "./octokit-client.js";

const baseSummary = {
  context: "test",
  requirementsEvaluated: ["REQ-001"],
  endpointsAffected: ["GET /users"],
  coverageBefore: 50,
  coverageAfterEstimated: 90,
  assumptions: [],
  risks: [],
  requiredSecrets: [],
  runInstructions: "npm test",
};

describe("runPrFlow", () => {
  it("returns a plan without calling GitHub when dryRun is true", async () => {
    const result = await runPrFlow({
      repository: { owner: "aiquaa-labs", name: "customer-api" },
      requirementSource: "REQ-142",
      files: [{ path: "tests/postman/C_API.json", content: "{}", operation: "create" }],
      summary: baseSummary,
      dryRun: true,
      draft: true,
    });
    expect(result.dryRun).toBe(true);
    expect(result.branch).toBe("test/api-quality/req-142");
    expect(result.title).toContain("REQ-142");
    expect(result.url).toBeUndefined();
  });

  it("rejects files that look like they contain secrets, even in dry run", async () => {
    await expect(
      runPrFlow({
        repository: { owner: "aiquaa-labs", name: "customer-api" },
        files: [
          {
            path: "tests/postman/E_API.json",
            content: "AKIAABCDEFGHIJKLMNOP",
            operation: "create",
          },
        ],
        summary: baseSummary,
        dryRun: true,
        draft: true,
      }),
    ).rejects.toThrow(GitHubClientError);
  });

  it("uses the explicit branch name and title when provided", async () => {
    const result = await runPrFlow({
      repository: { owner: "aiquaa-labs", name: "customer-api" },
      branchName: "test/api-quality/custom",
      title: "test(api): custom title",
      files: [{ path: "a.json", content: "{}", operation: "create" }],
      summary: baseSummary,
      dryRun: true,
      draft: false,
    });
    expect(result.branch).toBe("test/api-quality/custom");
    expect(result.title).toBe("test(api): custom title");
  });
});

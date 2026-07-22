import { describe, expect, it } from "vitest";
import { generatePipeline } from "./pipeline-generator.js";

const baseOptions = {
  apiName: "Users API",
  collectionPath: "tests/postman/C_USERS_API.json",
  environmentPath: "tests/postman/E_USERS_API.json",
  nodeVersion: "20",
} as const;

describe("generatePipeline", () => {
  it("creates a new GitHub Actions workflow when none exists", () => {
    const result = generatePipeline({ ...baseOptions, target: "github_actions" });
    expect(result.strategy).toBe("create");
    expect(result.content).toContain("newman run tests/postman/C_USERS_API.json");
    expect(result.content).toContain("jobs:");
  });

  it("does not touch a workflow that already runs Newman", () => {
    const existing =
      "jobs:\n  newman:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npx newman run collection.json\n";
    const result = generatePipeline({
      ...baseOptions,
      target: "github_actions",
      existingWorkflow: existing,
    });
    expect(result.strategy).toBe("extend");
    expect(result.content).toBe(existing);
  });

  it("inserts a Newman job into an existing workflow without a newman job, preserving other jobs", () => {
    const existing =
      "on:\n  push:\n    branches: [main]\njobs:\n  lint:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm run lint\n";
    const result = generatePipeline({
      ...baseOptions,
      target: "github_actions",
      existingWorkflow: existing,
    });
    expect(result.strategy).toBe("extend");
    expect(result.content).toContain("lint:");
    expect(result.content).toContain("newman:");
    expect(result.content).toContain("npm run lint");
  });

  it("creates a new Azure Pipelines workflow when none exists", () => {
    const result = generatePipeline({ ...baseOptions, target: "azure_pipelines" });
    expect(result.strategy).toBe("create");
    expect(result.content).toContain("vmImage: ubuntu-latest");
  });
});

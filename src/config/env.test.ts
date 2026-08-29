import { describe, expect, it } from "vitest";
import { loadServerEnv, normalizePath, parsePort } from "./env.js";

describe("parsePort", () => {
  it("defaults to 3000 when unset", () => {
    expect(parsePort(undefined)).toBe(3000);
  });

  it("parses a valid port", () => {
    expect(parsePort("8080")).toBe(8080);
  });

  it("throws for an out-of-range port", () => {
    expect(() => parsePort("70000")).toThrow(/inválido/);
  });

  it("throws for a non-numeric value", () => {
    expect(() => parsePort("abc")).toThrow(/inválido/);
  });
});

describe("normalizePath", () => {
  it("adds a leading slash when missing", () => {
    expect(normalizePath("mcp")).toBe("/mcp");
  });

  it("keeps an existing leading slash", () => {
    expect(normalizePath("/mcp")).toBe("/mcp");
  });
});

describe("loadServerEnv", () => {
  it("applies defaults when the environment is empty", () => {
    const env = loadServerEnv({});
    expect(env.port).toBe(3000);
    expect(env.mcpPath).toBe("/mcp");
    expect(env.codegraphBin).toBe("codegraph");
    expect(env.engramProjectPrefix).toBe("aiquaa-");
    expect(env.githubToken).toBeUndefined();
  });

  it("reads overrides from the provided source", () => {
    const env = loadServerEnv({
      PORT: "4000",
      MCP_PATH: "custom",
      GITHUB_TOKEN: "ghp_test",
      AIQUAA_API_BASE_URL: "https://api.example.com",
      AIQUAA_SQL_SANDBOX_BASE_URL: "https://sql-sandbox.example.com",
    });
    expect(env.port).toBe(4000);
    expect(env.mcpPath).toBe("/custom");
    expect(env.githubToken).toBe("ghp_test");
    expect(env.aiquaaApiBaseUrl).toBe("https://api.example.com");
    expect(env.aiquaaSqlSandboxBaseUrl).toBe("https://sql-sandbox.example.com");
  });

  it("leaves aiquaaSqlSandboxBaseUrl undefined when unset", () => {
    const env = loadServerEnv({});
    expect(env.aiquaaSqlSandboxBaseUrl).toBeUndefined();
  });
});

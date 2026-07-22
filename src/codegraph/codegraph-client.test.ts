import { describe, expect, it } from "vitest";
import {
  CodeGraphClient,
  parseAllowedRoots,
  resolveAllowedProjectPath,
} from "./codegraph-client.js";
import type { CommandRunner } from "../execution/command-runner.js";
import path from "node:path";

describe("parseAllowedRoots / resolveAllowedProjectPath", () => {
  it("throws when no roots are configured", () => {
    expect(() => resolveAllowedProjectPath("/anything", [])).toThrow(/deshabilitado/);
  });

  it("rejects a path outside the allowed roots", () => {
    const roots = parseAllowedRoots(path.resolve("/workspace/projects"));
    expect(() => resolveAllowedProjectPath("/etc/secrets", roots)).toThrow(/no está dentro/);
  });

  it("accepts a path inside an allowed root", () => {
    const roots = [path.resolve("/workspace/projects")];
    const resolved = resolveAllowedProjectPath(path.resolve("/workspace/projects/api"), roots);
    expect(resolved).toBe(path.resolve("/workspace/projects/api"));
  });
});

describe("CodeGraphClient", () => {
  it("builds context by delegating to the injected command runner", async () => {
    let receivedCommand = "";
    let receivedArgs: string[] = [];
    const runner: CommandRunner = (options) => {
      receivedCommand = options.command;
      receivedArgs = options.args;
      return Promise.resolve("# context markdown");
    };
    const allowedRoot = path.resolve("/workspace/projects");
    const client = new CodeGraphClient(runner, "codegraph", [allowedRoot]);

    const result = await client.buildContext({
      projectPath: path.resolve("/workspace/projects/api"),
      task: "find auth middleware",
      maxNodes: 10,
      maxCodeBlocks: 2,
      includeCode: true,
    });

    expect(result.context).toBe("# context markdown");
    expect(receivedCommand).toBe("codegraph");
    expect(receivedArgs).toEqual(expect.arrayContaining(["context", "find auth middleware"]));
  });
});

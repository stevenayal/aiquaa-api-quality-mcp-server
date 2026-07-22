import { describe, expect, it } from "vitest";
import { EngramClient } from "./engram-client.js";
import type { CommandRunner } from "../execution/command-runner.js";

describe("EngramClient", () => {
  it("scopes search calls to the per-project namespace", async () => {
    let receivedArgs: string[] = [];
    const runner: CommandRunner = (options) => {
      receivedArgs = options.args;
      return Promise.resolve("no memories found");
    };
    const client = new EngramClient(runner, "engram", "aiquaa-");

    const result = await client.search("prj_123", "auth strategy", 5);

    expect(result.project).toBe("aiquaa-prj_123");
    expect(receivedArgs).toEqual(
      expect.arrayContaining(["search", "auth strategy", "--project", "aiquaa-prj_123"]),
    );
  });

  it("scopes save calls to the per-project namespace with a topic key", async () => {
    let receivedArgs: string[] = [];
    const runner: CommandRunner = (options) => {
      receivedArgs = options.args;
      return Promise.resolve("saved");
    };
    const client = new EngramClient(runner, "engram", "aiquaa-");

    const result = await client.save({
      projectId: "prj_123",
      title: "Auth strategy",
      content: "Uses JWT bearer tokens issued by /auth/login.",
      type: "decision",
      topicKey: "decision/auth",
    });

    expect(result.topicKey).toBe("decision/auth");
    expect(receivedArgs).toEqual(expect.arrayContaining(["save", "--topic", "decision/auth"]));
  });
});

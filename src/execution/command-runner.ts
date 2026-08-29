import spawn from "cross-spawn";

export interface CommandOptions {
  command: string;
  args: string[];
  cwd?: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
}

export type CommandRunner = (options: CommandOptions) => Promise<string>;

// Usa cross-spawn en vez de `node:child_process` con `shell: true`: en Windows,
// `spawn(cmd, args, { shell: true })` delega en cmd.exe y NO escapa de forma
// segura metacaracteres (`&`, `|`, `^`, `%VAR%`) dentro de `args` — cualquier
// valor con origen en el usuario/LLM (p. ej. `global_variables`, `task`,
// `query` de codegraph/engram) podía inyectar comandos. cross-spawn resuelve
// los shims `.cmd`/`.bat` de Windows de forma segura sin invocar una shell.
export const runCommand: CommandRunner = (options) =>
  new Promise((resolve, reject) => {
    const child = spawn(options.command, options.args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(
        new Error(`El comando "${options.command}" superó el timeout de ${options.timeoutMs}ms.`),
      );
    }, options.timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(
          new Error(
            `"${options.command} ${options.args.join(" ")}" salió con código ${code}: ${stderr.trim()}`,
          ),
        );
      }
    });
  });

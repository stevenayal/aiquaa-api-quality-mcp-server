import path from "node:path";
import { runCommand, type CommandRunner } from "../execution/command-runner.js";

export interface CodeGraphContextOptions {
  projectPath: string;
  task: string;
  maxNodes: number;
  maxCodeBlocks: number;
  includeCode: boolean;
}

export interface CodeGraphContextResult {
  provider: "codegraph";
  projectPath: string;
  task: string;
  context: string;
}

export class CodeGraphClient {
  constructor(
    private readonly runner: CommandRunner = runCommand,
    private readonly binary = process.env.CODEGRAPH_BIN?.trim() || "codegraph",
    private readonly allowedRoots = parseAllowedRoots(process.env.CODEGRAPH_ALLOWED_ROOTS),
  ) {}

  async buildContext(options: CodeGraphContextOptions): Promise<CodeGraphContextResult> {
    const projectPath = resolveAllowedProjectPath(options.projectPath, this.allowedRoots);
    const args = [
      "context",
      options.task,
      "--path",
      projectPath,
      "--max-nodes",
      String(options.maxNodes),
      "--max-code",
      String(options.maxCodeBlocks),
      "--format",
      "markdown",
    ];
    if (!options.includeCode) args.push("--no-code");

    const context = await this.runner({
      command: this.binary,
      args,
      cwd: projectPath,
      timeoutMs: 45_000,
    });
    return { provider: "codegraph", projectPath, task: options.task, context };
  }
}

export function parseAllowedRoots(value: string | undefined): string[] {
  return (value ?? "")
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => path.resolve(entry));
}

export function resolveAllowedProjectPath(projectPath: string, allowedRoots: string[]): string {
  if (allowedRoots.length === 0) {
    throw new Error(
      "CodeGraph está deshabilitado. Configurá CODEGRAPH_ALLOWED_ROOTS con las carpetas permitidas.",
    );
  }
  const resolved = path.resolve(projectPath);
  const allowed = allowedRoots.some((root) => isPathInside(resolved, root));
  if (!allowed) {
    throw new Error(`La ruta ${resolved} no está dentro de CODEGRAPH_ALLOWED_ROOTS.`);
  }
  return resolved;
}

function isPathInside(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

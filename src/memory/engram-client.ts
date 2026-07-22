import { runCommand, type CommandRunner } from "../execution/command-runner.js";

export interface EngramSearchResult {
  provider: "engram";
  project: string;
  query: string;
  memories: string;
}

export interface EngramSaveOptions {
  projectId: string;
  title: string;
  content: string;
  type: string;
  topicKey: string;
}

export interface EngramSaveResult {
  provider: "engram";
  project: string;
  topicKey: string;
  status: string;
}

/**
 * Wraps the engram CLI, scoping every call to a per-project namespace
 * (ENGRAM_PROJECT_PREFIX + projectId) so memory never leaks across APIs and
 * never stores secrets — callers must pass already-sanitized content.
 */
export class EngramClient {
  constructor(
    private readonly runner: CommandRunner = runCommand,
    private readonly binary = process.env.ENGRAM_BIN?.trim() || "engram",
    private readonly projectPrefix = process.env.ENGRAM_PROJECT_PREFIX?.trim() || "aiquaa-",
  ) {}

  async search(projectId: string, query: string, limit: number): Promise<EngramSearchResult> {
    const project = this.projectName(projectId);
    const memories = await this.runner({
      command: this.binary,
      args: ["search", query, "--project", project, "--scope", "project", "--limit", String(limit)],
      timeoutMs: 15_000,
    });
    return { provider: "engram", project, query, memories };
  }

  async save(options: EngramSaveOptions): Promise<EngramSaveResult> {
    const project = this.projectName(options.projectId);
    const status = await this.runner({
      command: this.binary,
      args: [
        "save",
        options.title,
        options.content,
        "--type",
        options.type,
        "--project",
        project,
        "--scope",
        "project",
        "--topic",
        options.topicKey,
      ],
      timeoutMs: 15_000,
    });
    return { provider: "engram", project, topicKey: options.topicKey, status };
  }

  private projectName(projectId: string): string {
    return `${this.projectPrefix}${projectId}`.trim().toLowerCase();
  }
}

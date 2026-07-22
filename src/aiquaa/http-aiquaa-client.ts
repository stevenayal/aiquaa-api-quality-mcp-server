import { AIQUAA_ENDPOINTS } from "../constants.js";
import type { AiquaaClientPort } from "./aiquaa-client-port.js";
import type {
  AiquaaAutomationRunInput,
  AiquaaBusinessRule,
  AiquaaCoverageResultInput,
  AiquaaProject,
  AiquaaPullRequestInput,
  AiquaaRequirement,
} from "./types.js";

export class AiquaaClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AiquaaClientError";
  }
}

export class HttpAiquaaClient implements AiquaaClientPort {
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor(options: { baseUrl?: string; accessToken?: string } = {}) {
    const baseUrl = options.baseUrl ?? process.env.AIQUAA_API_BASE_URL;
    const accessToken = options.accessToken ?? process.env.AIQUAA_ACCESS_TOKEN;
    if (!baseUrl) {
      throw new AiquaaClientError("Falta AIQUAA_API_BASE_URL para operaciones remotas de AIQUAA.");
    }
    if (!accessToken) {
      throw new AiquaaClientError("Falta AIQUAA_ACCESS_TOKEN o un Bearer token en la request MCP.");
    }
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.accessToken = accessToken;
  }

  async getRequirement(projectId: string, requirementId: string): Promise<AiquaaRequirement> {
    const value = await this.get(AIQUAA_ENDPOINTS.requirement(projectId, requirementId));
    const record = asRecord(value);
    const text = firstString(record, ["text", "content", "description"]);
    if (!text)
      throw new AiquaaClientError(`El requisito ${requirementId} no tiene texto disponible.`);
    return { id: requirementId, text };
  }

  async getBusinessRules(projectId: string): Promise<AiquaaBusinessRule[]> {
    const value = await this.get(AIQUAA_ENDPOINTS.businessRules(projectId));
    const record = asRecord(value);
    const items = Array.isArray(record["items"])
      ? record["items"]
      : Array.isArray(value)
        ? value
        : [];
    return items.map((entry) => {
      const r = asRecord(entry);
      return {
        id: firstString(r, ["id", "code"]) ?? "unknown",
        title: firstString(r, ["title", "name"]) ?? "",
        description: firstString(r, ["description", "text"]) ?? "",
      };
    });
  }

  async listProjects(): Promise<AiquaaProject[]> {
    const value = await this.get(AIQUAA_ENDPOINTS.projects());
    const record = asRecord(value);
    const items = Array.isArray(record["items"])
      ? record["items"]
      : Array.isArray(value)
        ? value
        : [];
    return items.map((entry) => {
      const r = asRecord(entry);
      return { id: firstString(r, ["id"]) ?? "unknown", name: firstString(r, ["name"]) ?? "" };
    });
  }

  async saveCoverageResult(input: AiquaaCoverageResultInput): Promise<void> {
    await this.post(AIQUAA_ENDPOINTS.coverageResults(input.projectId), input);
  }

  async associateAutomationRun(input: AiquaaAutomationRunInput): Promise<void> {
    await this.post(AIQUAA_ENDPOINTS.automationRuns(input.projectId), input);
  }

  async associatePullRequest(input: AiquaaPullRequestInput): Promise<void> {
    await this.post(AIQUAA_ENDPOINTS.pullRequests(input.projectId), input);
  }

  async updateAutomationStatus(projectId: string, status: string): Promise<void> {
    await this.post(AIQUAA_ENDPOINTS.automationStatus(projectId), { status });
  }

  private async get(path: string): Promise<unknown> {
    return this.request(path, "GET");
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    return this.request(path, "POST", body);
  }

  private async request(path: string, method: "GET" | "POST", body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.accessToken}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (error: unknown) {
      throw new AiquaaClientError(
        `No se pudo conectar con AIQUAA en ${this.baseUrl}${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!response.ok) {
      throw new AiquaaClientError(
        `AIQUAA respondió ${response.status} para ${path}.`,
        response.status,
      );
    }
    if (response.status === 204) return undefined;
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

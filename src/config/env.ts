import { DEFAULT_MCP_PATH, DEFAULT_PORT } from "../constants.js";

export interface ServerEnv {
  port: number;
  mcpPath: string;
  githubToken?: string;
  githubApiUrl: string;
  aiquaaApiBaseUrl?: string;
  aiquaaAccessToken?: string;
  codegraphBin: string;
  codegraphAllowedRoots: string;
  engramBin: string;
  engramProjectPrefix: string;
}

export function loadServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  return {
    port: parsePort(source.PORT),
    mcpPath: normalizePath(source.MCP_PATH ?? DEFAULT_MCP_PATH),
    ...(source.GITHUB_TOKEN ? { githubToken: source.GITHUB_TOKEN } : {}),
    githubApiUrl: source.GITHUB_API_URL ?? "https://api.github.com",
    ...(source.AIQUAA_API_BASE_URL ? { aiquaaApiBaseUrl: source.AIQUAA_API_BASE_URL } : {}),
    ...(source.AIQUAA_ACCESS_TOKEN ? { aiquaaAccessToken: source.AIQUAA_ACCESS_TOKEN } : {}),
    codegraphBin: source.CODEGRAPH_BIN?.trim() || "codegraph",
    codegraphAllowedRoots: source.CODEGRAPH_ALLOWED_ROOTS ?? "",
    engramBin: source.ENGRAM_BIN?.trim() || "engram",
    engramProjectPrefix: source.ENGRAM_PROJECT_PREFIX?.trim() || "aiquaa-",
  };
}

export function parsePort(value?: string): number {
  const parsed = value ? Number(value) : DEFAULT_PORT;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error(`PORT inválido: ${value ?? ""}. Usá un entero entre 1 y 65535.`);
  }
  return parsed;
}

export function normalizePath(value: string): string {
  return value.startsWith("/") ? value : `/${value}`;
}

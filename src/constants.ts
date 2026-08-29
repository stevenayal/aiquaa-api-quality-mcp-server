export const SERVER_NAME = "aiquaa-api-quality";
export const SERVER_VERSION = "0.1.0";
export const DEFAULT_PORT = 3000;
export const DEFAULT_MCP_PATH = "/mcp";

export const FILE_PREFIX = {
  collection: "C_",
  environment: "E_",
  pipeline: "Y_",
  data: "D_",
} as const;

export const DEFAULT_PATHS = {
  postmanDir: "tests/postman",
  postmanDataDir: "tests/postman/data",
  githubWorkflowsDir: ".github/workflows",
  azurePipelinesDir: "azure-pipelines",
  resultsDir: "test-results",
  newmanResultsJson: "test-results/newman-results.json",
  newmanJunitXml: "test-results/newman-junit.xml",
  newmanReportHtml: "test-results/newman-report.html",
  newmanReportPdf: "test-results/newman-report.pdf",
  coverageJson: "test-results/aiquaa-api-coverage.json",
  usageLogJsonl: "test-results/usage-log.jsonl",
  usageReportPdf: "test-results/usage-report.pdf",
} as const;

/**
 * Centralizes every AIQUAA backend route. Not assumed final per project spec —
 * change here only, never inline a path in a client or tool.
 */
export const AIQUAA_ENDPOINTS = {
  requirements: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/requirements`,
  requirement: (projectId: string, requirementId: string) =>
    `/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}`,
  businessRules: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/business-rules`,
  projects: () => "/projects",
  coverageResults: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/coverage-results`,
  automationRuns: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/automation-runs`,
  pullRequests: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/pull-requests`,
  automationStatus: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/automation-status`,
} as const;

export const BRANCH_NAME_PREFIX = "test/api-quality/";
export const PR_TITLE_PREFIX = "test(api): ";

export const SECRET_LIKE_ENV_KEYS = [
  "token",
  "secret",
  "password",
  "apikey",
  "api_key",
  "authorization",
  "access_token",
  "private_key",
  "client_secret",
] as const;

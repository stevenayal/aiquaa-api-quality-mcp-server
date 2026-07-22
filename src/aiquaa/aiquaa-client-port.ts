import type {
  AiquaaAutomationRunInput,
  AiquaaBusinessRule,
  AiquaaCoverageResultInput,
  AiquaaProject,
  AiquaaPullRequestInput,
  AiquaaRequirement,
} from "./types.js";

/**
 * Port for the AIQUAA backend. The core MCP depends only on this interface —
 * swapping the HTTP adapter (or mocking it in tests) never touches tool code.
 */
export interface AiquaaClientPort {
  getRequirement(projectId: string, requirementId: string): Promise<AiquaaRequirement>;
  getBusinessRules(projectId: string): Promise<AiquaaBusinessRule[]>;
  listProjects(): Promise<AiquaaProject[]>;
  saveCoverageResult(input: AiquaaCoverageResultInput): Promise<void>;
  associateAutomationRun(input: AiquaaAutomationRunInput): Promise<void>;
  associatePullRequest(input: AiquaaPullRequestInput): Promise<void>;
  updateAutomationStatus(projectId: string, status: string): Promise<void>;
}

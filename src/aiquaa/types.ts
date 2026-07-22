export interface AiquaaRequirement {
  id: string;
  text: string;
}

export interface AiquaaBusinessRule {
  id: string;
  title: string;
  description: string;
}

export interface AiquaaProject {
  id: string;
  name: string;
}

export interface AiquaaCoverageResultInput {
  projectId: string;
  coveragePercentage: number;
  summary: string;
}

export interface AiquaaAutomationRunInput {
  projectId: string;
  status: "passed" | "failed" | "partial";
  summary: string;
}

export interface AiquaaPullRequestInput {
  projectId: string;
  url: string;
  branch: string;
}

export type CiPlatform = "github_actions" | "azure_pipelines" | "unknown";

export interface CiAnalysisResult {
  platform: CiPlatform;
  hasNewmanJob: boolean;
  jobNames: string[];
}

export function analyzeCiWorkflow(content: string): CiAnalysisResult {
  const platform = detectPlatform(content);
  const hasNewmanJob = /newman/i.test(content);
  const jobNames = extractJobNames(content, platform);
  return { platform, hasNewmanJob, jobNames };
}

function detectPlatform(content: string): CiPlatform {
  if (/^jobs:/m.test(content) && /runs-on:/.test(content)) return "github_actions";
  if (/^trigger:/m.test(content) || /vmImage:/.test(content) || /^pool:/m.test(content))
    return "azure_pipelines";
  return "unknown";
}

function extractJobNames(content: string, platform: CiPlatform): string[] {
  if (platform === "github_actions") {
    const jobsBlock = /^jobs:\n([\s\S]*)/m.exec(content)?.[1] ?? "";
    const jobRegex = /^ {2}([A-Za-z0-9_-]+):/gm;
    const names: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = jobRegex.exec(jobsBlock)) !== null) {
      if (match[1]) names.push(match[1]);
    }
    return names;
  }
  if (platform === "azure_pipelines") {
    const nameRegex = /displayName:\s*(.+)/g;
    const names: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = nameRegex.exec(content)) !== null) {
      if (match[1]) names.push(match[1].trim());
    }
    return names;
  }
  return [];
}

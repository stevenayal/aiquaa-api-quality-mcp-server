import type { ApiFallosInput } from "../schemas/fallos.js";
import type { FailureAnalysis } from "../types/index.js";
import { analyzeFailures, classifyErrorMessage } from "../execution/failure-analyzer.js";
import { parseNewmanJson } from "../execution/newman-runner.js";

export function runApiFallos(input: ApiFallosInput): FailureAnalysis[] {
  const analyses: FailureAnalysis[] = [];

  if (input.newman_results) {
    const parsed: Record<string, unknown> =
      typeof input.newman_results === "string"
        ? (JSON.parse(input.newman_results) as Record<string, unknown>)
        : input.newman_results;
    const summary = parseNewmanJson(parsed);
    analyses.push(...analyzeFailures(summary.results));
  }

  if (input.junit_xml) {
    analyses.push(...parseJunitFailures(input.junit_xml));
  }

  if (input.error_messages) {
    analyses.push(...input.error_messages.map(classifyErrorMessage));
  }

  return analyses;
}

function parseJunitFailures(xml: string): FailureAnalysis[] {
  const analyses: FailureAnalysis[] = [];
  const testcaseRegex = /<testcase\b[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/testcase>/g;
  let match: RegExpExecArray | null;
  while ((match = testcaseRegex.exec(xml)) !== null) {
    const name = match[1] ?? "unknown";
    const body = match[2] ?? "";
    const failureMatch = /<failure\b[^>]*message="([^"]*)"/.exec(body);
    if (!failureMatch?.[1]) continue;
    const analysis = classifyErrorMessage(failureMatch[1]);
    analyses.push({ ...analysis, requestName: name, assertionName: name });
  }
  return analyses;
}

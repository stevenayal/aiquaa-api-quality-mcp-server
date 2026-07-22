import type { ApiPrInput } from "../schemas/pr.js";
import { runPrFlow, type PrFlowResult } from "../github/pr-flow.js";

export async function runApiPr(input: ApiPrInput): Promise<PrFlowResult> {
  return runPrFlow({
    repository: input.repository,
    ...(input.base_branch ? { baseBranch: input.base_branch } : {}),
    ...(input.branch_name ? { branchName: input.branch_name } : {}),
    ...(input.title ? { title: input.title } : {}),
    ...(input.requirement_source ? { requirementSource: input.requirement_source } : {}),
    files: input.files.map((file) => ({
      path: file.path,
      content: file.content,
      operation: file.operation,
    })),
    summary: input.summary,
    dryRun: input.dry_run,
    draft: input.draft,
  });
}

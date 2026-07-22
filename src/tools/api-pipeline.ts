import type { ApiPipelineInput } from "../schemas/pipeline.js";
import type { GeneratedFile } from "../types/index.js";
import { DEFAULT_PATHS } from "../constants.js";
import { generatePipeline } from "../generators/pipeline-generator.js";
import { normalizeApiName } from "./api-generar.js";

export function runApiPipeline(input: ApiPipelineInput): GeneratedFile {
  const apiSlug = normalizeApiName(input.api_name);
  const result = generatePipeline({
    apiName: input.api_name,
    target: input.target,
    collectionPath: input.collection_path,
    environmentPath: input.environment_path,
    nodeVersion: input.node_version,
    ...(input.existing_workflow ? { existingWorkflow: input.existing_workflow } : {}),
  });

  const path =
    input.target === "github_actions"
      ? `${DEFAULT_PATHS.githubWorkflowsDir}/Y_${apiSlug}_newman.yml`
      : `${DEFAULT_PATHS.azurePipelinesDir}/Y_${apiSlug}_newman.yml`;

  return {
    path,
    operation: result.strategy === "create" ? "create" : "update",
    content: result.content,
    reason: result.reason,
  };
}

import { BRANCH_NAME_PREFIX, PR_TITLE_PREFIX } from "../constants.js";
import {
  GitHubClient,
  GitHubClientError,
  type FileChange,
  type RepositoryRef,
} from "./octokit-client.js";
import { buildPullRequestBody, type PrBodyInput } from "./pr-body.js";
import { scanForSecrets } from "../security/secret-scanner.js";

export interface PrFlowInput {
  repository: RepositoryRef;
  baseBranch?: string;
  branchName?: string;
  title?: string;
  requirementSource?: string;
  files: FileChange[];
  summary: Omit<PrBodyInput, "filesCreated" | "filesModified" | "testsAdded">;
  dryRun: boolean;
  draft: boolean;
}

export interface PrFlowResult {
  dryRun: boolean;
  branch: string;
  baseBranch: string;
  title: string;
  body: string;
  url?: string;
  number?: number;
  commitSha?: string;
  filesPlanned: FileChange[];
  warnings: string[];
}

export async function runPrFlow(
  input: PrFlowInput,
  clientFactory: (token?: string) => GitHubClient = (token) =>
    new GitHubClient(token ? { token } : {}),
): Promise<PrFlowResult> {
  const warnings: string[] = [];
  for (const file of input.files) {
    const findings = scanForSecrets(file.content);
    if (findings.length > 0) {
      throw new GitHubClientError(
        `El archivo ${file.path} parece contener secretos (${findings.join(", ")}). No se puede continuar; representá los valores sensibles como variables.`,
      );
    }
  }

  const branch =
    input.branchName ?? `${BRANCH_NAME_PREFIX}${slug(input.requirementSource ?? "coverage")}`;
  const title =
    input.title ?? `${PR_TITLE_PREFIX}${input.requirementSource ?? "coverage improvements"}`;
  const body = buildPullRequestBody({
    ...input.summary,
    filesCreated: input.files.filter((f) => f.operation === "create").map((f) => f.path),
    filesModified: input.files.filter((f) => f.operation === "update").map((f) => f.path),
    testsAdded: input.files.filter((f) => f.path.includes("postman")).map((f) => f.path),
  });

  if (input.dryRun) {
    return {
      dryRun: true,
      branch,
      baseBranch: input.baseBranch ?? "(default branch)",
      title,
      body,
      filesPlanned: input.files,
      warnings,
    };
  }

  const client = clientFactory();

  const canWrite = await client.checkWritePermission(input.repository);
  if (!canWrite) {
    throw new GitHubClientError(
      `El token de GITHUB_TOKEN no tiene permisos de escritura sobre ${input.repository.owner}/${input.repository.name}.`,
    );
  }

  const baseBranch = input.baseBranch ?? (await client.getDefaultBranch(input.repository));
  const baseSha = await client.getBranchSha(input.repository, baseBranch);

  const branchAlreadyExists = await client.branchExists(input.repository, branch);
  if (branchAlreadyExists) {
    warnings.push(`La rama ${branch} ya existía; se reutilizó en vez de crearla nuevamente.`);
  } else {
    await client.createBranch(input.repository, branch, baseSha);
  }

  let lastCommitSha = "";
  for (const file of input.files) {
    if (file.operation === "delete") {
      await client.deleteFile(
        input.repository,
        branch,
        file.path,
        `${title} — remove ${file.path}`,
      );
      continue;
    }
    lastCommitSha = await client.upsertFile(input.repository, branch, {
      path: file.path,
      content: file.content,
      message: `${title} — ${file.operation} ${file.path}`,
    });
  }

  const pr = await client.openPullRequest(input.repository, {
    title,
    head: branch,
    base: baseBranch,
    body,
    draft: input.draft,
  });

  return {
    dryRun: false,
    branch,
    baseBranch,
    title,
    body,
    url: pr.url,
    number: pr.number,
    commitSha: lastCommitSha,
    filesPlanned: input.files,
    warnings,
  };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

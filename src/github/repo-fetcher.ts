import { Octokit } from "@octokit/rest";
import type { RepositoryRef } from "./octokit-client.js";

const RELEVANT_FILE_PATTERN =
  /\.(controller|service|dto|validator|model|schema)\.(ts|js)$|\.(ts|js|java|cs|py)$|openapi\.(json|ya?ml)$|swagger\.(json|ya?ml)$|\.postman_collection\.json$|\.postman_environment\.json$|(^|\/)(package\.json|pom\.xml|.*\.csproj)$|\.github\/workflows\/.*\.ya?ml$|azure-pipelines.*\.ya?ml$/i;

const MAX_FILES = 150;
const MAX_FILE_SIZE_BYTES = 200_000;

export interface FetchedRepositoryFile {
  path: string;
  content: string;
}

export interface RepositoryFetcher {
  fetchRelevantFiles(repository: RepositoryRef, ref?: string): Promise<FetchedRepositoryFile[]>;
}

export class OctokitRepositoryFetcher implements RepositoryFetcher {
  private readonly octokit: Octokit;

  constructor(options: { token?: string; baseUrl?: string } = {}) {
    const token = options.token ?? process.env.GITHUB_TOKEN;
    const baseUrl = options.baseUrl ?? process.env.GITHUB_API_URL;
    this.octokit = new Octokit({
      ...(token ? { auth: token } : {}),
      ...(baseUrl ? { baseUrl } : {}),
    });
  }

  async fetchRelevantFiles(
    repository: RepositoryRef,
    ref?: string,
  ): Promise<FetchedRepositoryFile[]> {
    const branch =
      ref ??
      (await this.octokit.repos.get({ owner: repository.owner, repo: repository.name })).data
        .default_branch;
    const { data: branchData } = await this.octokit.repos.getBranch({
      owner: repository.owner,
      repo: repository.name,
      branch,
    });
    const { data: tree } = await this.octokit.git.getTree({
      owner: repository.owner,
      repo: repository.name,
      tree_sha: branchData.commit.sha,
      recursive: "true",
    });

    const candidates = (tree.tree ?? [])
      .filter(
        (entry) => entry.type === "blob" && entry.path && RELEVANT_FILE_PATTERN.test(entry.path),
      )
      .filter((entry) => (entry.size ?? 0) <= MAX_FILE_SIZE_BYTES)
      .slice(0, MAX_FILES);

    const files: FetchedRepositoryFile[] = [];
    for (const entry of candidates) {
      if (!entry.sha || !entry.path) continue;
      const { data: blob } = await this.octokit.git.getBlob({
        owner: repository.owner,
        repo: repository.name,
        file_sha: entry.sha,
      });
      if (blob.encoding !== "base64") continue;
      files.push({
        path: entry.path,
        content: Buffer.from(blob.content, "base64").toString("utf-8"),
      });
    }
    return files;
  }
}

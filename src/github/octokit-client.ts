import { Octokit } from "@octokit/rest";

export interface RepositoryRef {
  owner: string;
  name: string;
}

export interface FileChange {
  path: string;
  content: string;
  operation: "create" | "update" | "delete";
}

export class GitHubClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubClientError";
  }
}

export class GitHubClient {
  private readonly octokit: Octokit;

  constructor(options: { token?: string; baseUrl?: string }) {
    const token = options.token ?? process.env.GITHUB_TOKEN;
    if (!token) {
      throw new GitHubClientError(
        "Falta GITHUB_TOKEN. Configurá un token con permisos de contents:write y pull-requests:write.",
      );
    }
    const baseUrl = options.baseUrl ?? process.env.GITHUB_API_URL;
    this.octokit = new Octokit({ auth: token, ...(baseUrl ? { baseUrl } : {}) });
  }

  async checkWritePermission(repo: RepositoryRef): Promise<boolean> {
    const { data } = await this.octokit.repos.get({ owner: repo.owner, repo: repo.name });
    return Boolean(data.permissions?.push);
  }

  async getDefaultBranch(repo: RepositoryRef): Promise<string> {
    const { data } = await this.octokit.repos.get({ owner: repo.owner, repo: repo.name });
    return data.default_branch;
  }

  async getBranchSha(repo: RepositoryRef, branch: string): Promise<string> {
    const { data } = await this.octokit.repos.getBranch({
      owner: repo.owner,
      repo: repo.name,
      branch,
    });
    return data.commit.sha;
  }

  async branchExists(repo: RepositoryRef, branch: string): Promise<boolean> {
    try {
      await this.octokit.repos.getBranch({ owner: repo.owner, repo: repo.name, branch });
      return true;
    } catch (error: unknown) {
      if (isNotFound(error)) return false;
      throw error;
    }
  }

  async createBranch(repo: RepositoryRef, branch: string, fromSha: string): Promise<void> {
    await this.octokit.git.createRef({
      owner: repo.owner,
      repo: repo.name,
      ref: `refs/heads/${branch}`,
      sha: fromSha,
    });
  }

  async getFileSha(repo: RepositoryRef, path: string, ref: string): Promise<string | undefined> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: repo.owner,
        repo: repo.name,
        path,
        ref,
      });
      if (Array.isArray(data)) return undefined;
      return "sha" in data ? data.sha : undefined;
    } catch (error: unknown) {
      if (isNotFound(error)) return undefined;
      throw error;
    }
  }

  async upsertFile(
    repo: RepositoryRef,
    branch: string,
    file: { path: string; content: string; message: string },
  ): Promise<string> {
    const existingSha = await this.getFileSha(repo, file.path, branch);
    const { data } = await this.octokit.repos.createOrUpdateFileContents({
      owner: repo.owner,
      repo: repo.name,
      path: file.path,
      branch,
      message: file.message,
      content: Buffer.from(file.content, "utf-8").toString("base64"),
      ...(existingSha ? { sha: existingSha } : {}),
    });
    return data.commit.sha ?? "";
  }

  async deleteFile(
    repo: RepositoryRef,
    branch: string,
    path: string,
    message: string,
  ): Promise<void> {
    const sha = await this.getFileSha(repo, path, branch);
    if (!sha) return;
    await this.octokit.repos.deleteFile({
      owner: repo.owner,
      repo: repo.name,
      path,
      branch,
      message,
      sha,
    });
  }

  async openPullRequest(
    repo: RepositoryRef,
    options: { title: string; head: string; base: string; body: string; draft: boolean },
  ): Promise<{ url: string; number: number }> {
    const { data } = await this.octokit.pulls.create({
      owner: repo.owner,
      repo: repo.name,
      title: options.title,
      head: options.head,
      base: options.base,
      body: options.body,
      draft: options.draft,
    });
    return { url: data.html_url, number: data.number };
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

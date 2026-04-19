import { Octokit } from "@octokit/rest";
import { z } from "zod";

const OAuthTokenSchema = z.object({
  access_token: z.string().min(1),
});

export type GitHubUser = {
  id: number;
  login: string;
  avatarUrl: string | null;
};

export type GitHubRepoSummary = {
  fullName: string;
  private: boolean;
  permissions: {
    admin: boolean;
    push: boolean;
  };
};

export type PullRequestContext = {
  title: string;
  body: string;
  headSha: string;
  htmlUrl: string;
  diff: string;
};

const MAX_FILES = 40;
const MAX_TOTAL_PATCH_CHARS = 45_000;
const MAX_PATCH_PER_FILE = 2_500;

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createGitHubClient(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

export async function exchangeGitHubCodeForToken(code: string, redirectUri: string) {
  const clientId = getRequiredEnv("GITHUB_CLIENT_ID");
  const clientSecret = getRequiredEnv("GITHUB_CLIENT_SECRET");

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub OAuth token exchange failed with status ${response.status}`);
  }

  const parsed = OAuthTokenSchema.parse(await response.json());
  return parsed.access_token;
}

export async function fetchAuthenticatedGitHubUser(accessToken: string): Promise<GitHubUser> {
  const octokit = createGitHubClient(accessToken);
  const result = await octokit.users.getAuthenticated();

  return {
    id: result.data.id,
    login: result.data.login,
    avatarUrl: result.data.avatar_url ?? null,
  };
}

export async function listUserRepositories(accessToken: string): Promise<GitHubRepoSummary[]> {
  const octokit = createGitHubClient(accessToken);
  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: "pushed",
  });

  return repos
    .filter((repo) => repo.permissions?.admin || repo.permissions?.push)
    .map((repo) => ({
      fullName: repo.full_name,
      private: repo.private,
      permissions: {
        admin: Boolean(repo.permissions?.admin),
        push: Boolean(repo.permissions?.push),
      },
    }))
    .slice(0, 100);
}

function truncatePatch(patch: string, maxLength: number) {
  if (patch.length <= maxLength) {
    return patch;
  }

  return `${patch.slice(0, maxLength)}\n...diff truncated for brevity`;
}

export async function fetchPullRequestContext(input: {
  owner: string;
  repo: string;
  pullNumber: number;
  accessToken: string;
}): Promise<PullRequestContext> {
  const octokit = createGitHubClient(input.accessToken);

  const pr = await octokit.pulls.get({
    owner: input.owner,
    repo: input.repo,
    pull_number: input.pullNumber,
  });

  const files = await octokit.paginate(octokit.pulls.listFiles, {
    owner: input.owner,
    repo: input.repo,
    pull_number: input.pullNumber,
    per_page: 100,
  });

  let charBudget = MAX_TOTAL_PATCH_CHARS;
  const renderedFiles: string[] = [];

  for (const file of files.slice(0, MAX_FILES)) {
    const patch = file.patch
      ? truncatePatch(file.patch, Math.min(MAX_PATCH_PER_FILE, Math.max(500, charBudget)))
      : "Patch unavailable for this file type.";

    if (charBudget <= 0) {
      break;
    }

    const section = [
      `File: ${file.filename}`,
      `Status: ${file.status}, +${file.additions} -${file.deletions}`,
      "```diff",
      patch,
      "```",
    ].join("\n");

    charBudget -= section.length;
    renderedFiles.push(section);
  }

  const diff = renderedFiles.join("\n\n");

  return {
    title: pr.data.title,
    body: pr.data.body ?? "",
    headSha: pr.data.head.sha,
    htmlUrl: pr.data.html_url,
    diff,
  };
}

export async function postPullRequestComment(input: {
  owner: string;
  repo: string;
  pullNumber: number;
  body: string;
  accessToken: string;
}) {
  const octokit = createGitHubClient(input.accessToken);
  const result = await octokit.issues.createComment({
    owner: input.owner,
    repo: input.repo,
    issue_number: input.pullNumber,
    body: input.body,
  });

  return {
    htmlUrl: result.data.html_url,
  };
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { Octokit } from "@octokit/rest";
import type { PullRequestContext, PullRequestFile } from "@/lib/types";

function getGitHubToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Missing GITHUB_TOKEN.");
  }

  return token;
}

export function verifyGitHubSignature(input: {
  body: string;
  signature: string | null;
  secret: string;
}): boolean {
  if (!input.signature) {
    return false;
  }

  const [method, hash] = input.signature.split("=");
  if (method !== "sha256" || !hash) {
    return false;
  }

  const digest = createHmac("sha256", input.secret).update(input.body).digest("hex");
  const digestBytes = Buffer.from(digest);
  const hashBytes = Buffer.from(hash);

  if (digestBytes.length !== hashBytes.length) {
    return false;
  }

  return timingSafeEqual(digestBytes, hashBytes);
}

export function createGitHubClient(): Octokit {
  return new Octokit({ auth: getGitHubToken() });
}

export async function fetchPullRequestContext(input: {
  owner: string;
  repo: string;
  pullNumber: number;
}): Promise<PullRequestContext> {
  const octokit = createGitHubClient();

  const [prResponse, files] = await Promise.all([
    octokit.pulls.get({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber
    }),
    octokit.paginate(octokit.pulls.listFiles, {
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pullNumber,
      per_page: 100
    })
  ]);

  const normalizedFiles: PullRequestFile[] = files.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch ?? ""
  }));

  return {
    owner: input.owner,
    repo: input.repo,
    repoFullName: `${input.owner}/${input.repo}`,
    pullNumber: input.pullNumber,
    title: prResponse.data.title,
    body: prResponse.data.body ?? "",
    author: prResponse.data.user?.login ?? "unknown",
    headSha: prResponse.data.head.sha,
    files: normalizedFiles,
    changedFiles: normalizedFiles.length
  };
}

export async function upsertPullRequestReviewComment(input: {
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  reviewMarkdown: string;
}): Promise<void> {
  const octokit = createGitHubClient();
  const marker = `<!-- pr-review-ai:${input.headSha} -->`;
  const body = `${marker}\n${input.reviewMarkdown}`;

  const comments = await octokit.paginate(octokit.issues.listComments, {
    owner: input.owner,
    repo: input.repo,
    issue_number: input.pullNumber,
    per_page: 100
  });

  const existing = comments.find((comment) => {
    return comment.body?.includes(marker);
  });

  if (existing) {
    await octokit.issues.updateComment({
      owner: input.owner,
      repo: input.repo,
      comment_id: existing.id,
      body
    });
    return;
  }

  await octokit.issues.createComment({
    owner: input.owner,
    repo: input.repo,
    issue_number: input.pullNumber,
    body
  });
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { analyzePullRequestWithClaude, formatReviewMarkdown } from "@/lib/claude";
import { getWebhookRepoContext, insertReview } from "@/lib/db";
import { fetchPullRequestContext, postPullRequestComment } from "@/lib/github";

type PullRequestWebhookPayload = {
  action?: string;
  number?: number;
  repository?: {
    full_name?: string;
  };
  pull_request?: {
    title?: string;
    body?: string;
    head?: {
      sha?: string;
    };
  };
};

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyGitHubSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompare(`sha256=${expected}`, signatureHeader);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyGitHubSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event") ?? "";
  if (event === "ping") {
    return NextResponse.json({ status: "ok" });
  }

  if (event !== "pull_request") {
    return NextResponse.json({ ignored: true, reason: "Unsupported event" }, { status: 202 });
  }

  let payload: PullRequestWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PullRequestWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = payload.action ?? "";
  if (!["opened", "reopened", "synchronize"].includes(action)) {
    return NextResponse.json({ ignored: true, reason: `Action ${action} not configured` }, { status: 202 });
  }

  const repoFullName = payload.repository?.full_name;
  const prNumber = payload.number;

  if (!repoFullName || !prNumber) {
    return NextResponse.json({ error: "Missing repository or pull request data" }, { status: 400 });
  }

  const context = await getWebhookRepoContext(repoFullName);
  if (!context) {
    return NextResponse.json({ ignored: true, reason: "Repository not connected" }, { status: 202 });
  }

  if (!context.subscriptionActive) {
    return NextResponse.json({ ignored: true, reason: "No active subscription" }, { status: 202 });
  }

  if (!context.accessToken) {
    return NextResponse.json({ error: "No GitHub token available for repository" }, { status: 500 });
  }

  try {
    const pullRequest = await fetchPullRequestContext({
      owner: context.owner,
      repo: context.name,
      pullNumber: prNumber,
      accessToken: context.accessToken,
    });

    const review = await analyzePullRequestWithClaude({
      repoFullName,
      prTitle: pullRequest.title,
      prBody: pullRequest.body,
      diff: pullRequest.diff,
    });

    const commentBody = `${formatReviewMarkdown(review)}\n\n<!-- pr-review-ai:${pullRequest.headSha} -->`;

    const comment = await postPullRequestComment({
      owner: context.owner,
      repo: context.name,
      pullNumber: prNumber,
      body: commentBody,
      accessToken: context.accessToken,
    });

    await insertReview({
      repoFullName,
      prNumber,
      commitSha: pullRequest.headSha,
      summary: review.summary,
      findings: JSON.stringify(review),
      commentUrl: comment.htmlUrl,
    });

    return NextResponse.json({ status: "review_posted", commentUrl: comment.htmlUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { generatePullRequestReview } from "@/lib/claude-reviewer";
import {
  fetchPullRequestContext,
  upsertPullRequestReviewComment,
  verifyGitHubSignature
} from "@/lib/github-client";
import { findActiveSubscriptionForRepo, markWebhookDelivery } from "@/lib/storage";

export const runtime = "nodejs";

const REVIEWABLE_ACTIONS = new Set(["opened", "reopened", "synchronize", "ready_for_review"]);

interface PullRequestWebhookPayload {
  action: string;
  repository?: {
    owner?: {
      login?: string;
    };
    name?: string;
    full_name?: string;
  };
  pull_request?: {
    number?: number;
    draft?: boolean;
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const event = request.headers.get("x-github-event");
  const deliveryId = request.headers.get("x-github-delivery") ?? "unknown";

  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get("x-hub-signature-256");
    const isValid = verifyGitHubSignature({
      body: rawBody,
      signature,
      secret: webhookSecret
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid GitHub signature." }, { status: 401 });
    }
  }

  const isNew = await markWebhookDelivery("github", deliveryId);
  if (!isNew) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  if (event !== "pull_request") {
    return NextResponse.json({ ok: true, skipped: "not_pull_request" });
  }

  const payload = JSON.parse(rawBody) as PullRequestWebhookPayload;
  if (!REVIEWABLE_ACTIONS.has(payload.action)) {
    return NextResponse.json({ ok: true, skipped: "unsupported_action" });
  }

  if (payload.pull_request?.draft) {
    return NextResponse.json({ ok: true, skipped: "draft_pr" });
  }

  const owner = payload.repository?.owner?.login;
  const repo = payload.repository?.name;
  const repoFullName = payload.repository?.full_name;
  const pullNumber = payload.pull_request?.number;

  if (!owner || !repo || !repoFullName || !pullNumber) {
    return NextResponse.json({ error: "Incomplete pull_request payload." }, { status: 400 });
  }

  const activeSubscription = await findActiveSubscriptionForRepo(repoFullName);
  if (!activeSubscription) {
    return NextResponse.json({ ok: true, skipped: "no_active_subscription" });
  }

  const context = await fetchPullRequestContext({ owner, repo, pullNumber });
  const review = await generatePullRequestReview(context);

  await upsertPullRequestReviewComment({
    owner,
    repo,
    pullNumber,
    headSha: context.headSha,
    reviewMarkdown: review
  });

  return NextResponse.json({
    ok: true,
    reviewed: true,
    repo: repoFullName,
    pullNumber
  });
}

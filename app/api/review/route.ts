import { NextResponse } from "next/server";
import { generatePullRequestReview } from "@/lib/claude-reviewer";
import {
  fetchPullRequestContext,
  upsertPullRequestReviewComment
} from "@/lib/github-client";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/paywall";
import { findActiveSubscriptionForRepo } from "@/lib/storage";

export const runtime = "nodejs";

interface ReviewRequest {
  repoFullName?: string;
  pullNumber?: number;
  postComment?: boolean;
}

function parseAccessToken(cookieHeader: string): string | undefined {
  const match = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((cookie) => cookie.startsWith(`${ACCESS_COOKIE_NAME}=`));

  return match?.split("=").slice(1).join("=");
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = parseAccessToken(cookieHeader);
  const access = verifyAccessToken(token);

  if (!access) {
    return NextResponse.json({ error: "Unauthorized: unlock access first." }, { status: 401 });
  }

  const body = (await request.json()) as ReviewRequest;
  const repoFullName = body.repoFullName?.trim();
  const pullNumber = Number(body.pullNumber);

  if (!repoFullName || !repoFullName.includes("/")) {
    return NextResponse.json({ error: "repoFullName must be owner/repo." }, { status: 400 });
  }

  if (!Number.isInteger(pullNumber) || pullNumber < 1) {
    return NextResponse.json({ error: "pullNumber must be a positive integer." }, { status: 400 });
  }

  if (access.plan === "repo" && access.repoFullName?.toLowerCase() !== repoFullName.toLowerCase()) {
    return NextResponse.json({ error: "This cookie is scoped to a different repository." }, { status: 403 });
  }

  const activeSubscription = await findActiveSubscriptionForRepo(repoFullName);
  if (!activeSubscription && access.plan === "repo") {
    return NextResponse.json({ error: "No active subscription for this repository." }, { status: 403 });
  }

  const [owner, repo] = repoFullName.split("/");
  const context = await fetchPullRequestContext({ owner, repo, pullNumber });
  const review = await generatePullRequestReview(context);

  if (body.postComment) {
    await upsertPullRequestReviewComment({
      owner,
      repo,
      pullNumber,
      headSha: context.headSha,
      reviewMarkdown: review
    });
  }

  return NextResponse.json({
    review,
    changedFiles: context.changedFiles,
    postedComment: !!body.postComment
  });
}

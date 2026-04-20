import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  ACCESS_COOKIE_NAME,
  createAccessToken
} from "@/lib/paywall";
import { assignRepoToSubscription, listActiveSubscriptionsForEmail } from "@/lib/storage";
import type { PlanType } from "@/lib/types";

export const runtime = "nodejs";

interface VerifyRequest {
  email?: string;
  plan?: PlanType;
  repoFullName?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as VerifyRequest;
  const email = body.email?.trim().toLowerCase();
  const requestedPlan = body.plan === "org" ? "org" : "repo";
  const repoFullName = body.repoFullName?.trim();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (requestedPlan === "repo" && !repoFullName) {
    return NextResponse.json({ error: "Repository is required for the repo plan." }, { status: 400 });
  }

  const active = await listActiveSubscriptionsForEmail(email);
  const matched = active.find((subscription) => {
    if (subscription.plan === "org" && requestedPlan === "org") {
      return true;
    }

    if (subscription.plan === "repo" && requestedPlan === "repo") {
      if (!subscription.repoFullName || !repoFullName) {
        return true;
      }

      return subscription.repoFullName.toLowerCase() === repoFullName.toLowerCase();
    }

    return false;
  });

  const bypass = process.env.NODE_ENV !== "production" && process.env.PAYWALL_DEV_BYPASS === "true";

  if (!matched && !bypass) {
    return NextResponse.json(
      {
        error:
          "No active subscription found for this email and plan. Complete checkout first, then retry verification."
      },
      { status: 403 }
    );
  }

  if (repoFullName && requestedPlan === "repo") {
    await assignRepoToSubscription(email, repoFullName);
  }

  const token = createAccessToken({
    email,
    plan: requestedPlan,
    repoFullName: requestedPlan === "repo" ? repoFullName : undefined
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS
  });

  return response;
}

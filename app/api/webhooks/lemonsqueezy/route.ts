import { NextResponse } from "next/server";
import { upsertSubscription } from "@/lib/db";
import { parseLemonSubscriptionUpdate, verifyLemonWebhookSignature } from "@/lib/lemonsqueezy";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update = parseLemonSubscriptionUpdate(payload as any);
  if (!update) {
    return NextResponse.json({ ignored: true, reason: "Missing subscription scope" }, { status: 202 });
  }

  await upsertSubscription(update);

  return NextResponse.json({ status: "subscription_synced", scope: update.scope, subscription: update.status });
}

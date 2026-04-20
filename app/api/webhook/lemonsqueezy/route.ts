import { NextResponse } from "next/server";
import { parseLemonWebhook, verifyLemonSignature } from "@/lib/lemonsqueezy";
import { markWebhookDelivery, upsertSubscription } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const event = parseLemonWebhook(rawBody);
  if (!event) {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const deliveryId = `${event.eventName}:${event.subscriptionId ?? event.orderId ?? Date.now().toString()}`;
  const isNew = await markWebhookDelivery("lemonsqueezy", deliveryId);

  if (!isNew) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  await upsertSubscription({
    email: event.email,
    plan: event.plan,
    status: event.status,
    lemonOrderId: event.orderId,
    lemonSubscriptionId: event.subscriptionId,
    repoFullName: event.repoFullName,
    orgName: event.orgName,
    renewsAt: event.renewsAt
  });

  return NextResponse.json({ ok: true });
}

import { createHmac, timingSafeEqual } from "node:crypto";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/db";

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      user_email?: string;
      customer_email?: string;
      custom_data?: Record<string, unknown>;
      variant_name?: string;
      product_name?: string;
      first_order_item?: {
        variant_name?: string;
        product_name?: string;
      };
    };
  };
};

export type LemonSubscriptionUpdate = {
  scope: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  lemonSubscriptionId: string | null;
  lemonCustomerEmail: string | null;
  githubUserId: string | null;
};

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyLemonWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!secret || !signatureHeader) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompare(digest, signatureHeader);
}

function normalizeStatus(eventName: string, rawStatus: string | undefined): SubscriptionStatus {
  const loweredEvent = eventName.toLowerCase();
  const loweredStatus = rawStatus?.toLowerCase() ?? "";

  if (loweredEvent.includes("cancel") || loweredEvent.includes("expired") || loweredStatus === "cancelled") {
    return "cancelled";
  }

  if (loweredEvent.includes("payment_failed") || loweredStatus === "past_due") {
    return "past_due";
  }

  if (
    loweredStatus === "active" ||
    loweredStatus === "on_trial" ||
    loweredEvent.includes("subscription_created") ||
    loweredEvent.includes("subscription_resumed")
  ) {
    return "active";
  }

  return "inactive";
}

function readStringRecordValue(record: Record<string, unknown> | undefined, keys: string[]) {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export function parseLemonSubscriptionUpdate(payload: LemonWebhookPayload): LemonSubscriptionUpdate | null {
  const eventName = payload.meta?.event_name ?? "";
  const attrs = payload.data?.attributes;

  const customData = (attrs?.custom_data ?? payload.meta?.custom_data ?? {}) as Record<string, unknown>;

  const repoScope = readStringRecordValue(customData, ["scope", "repo_full_name", "repo"]);
  const org = readStringRecordValue(customData, ["org", "organization"]);
  const githubUserId = readStringRecordValue(customData, ["github_user_id", "user_id"]);

  const scope = repoScope ?? (org ? `org:${org}` : null);
  if (!scope) {
    return null;
  }

  const explicitPlan = readStringRecordValue(customData, ["plan"]);
  const inferredPlan: SubscriptionPlan =
    explicitPlan === "org" || scope.startsWith("org:") ? "org" : ("repo" as SubscriptionPlan);

  return {
    scope,
    plan: inferredPlan,
    status: normalizeStatus(eventName, attrs?.status),
    lemonSubscriptionId: payload.data?.id ?? null,
    lemonCustomerEmail: attrs?.user_email ?? attrs?.customer_email ?? null,
    githubUserId,
  };
}

export function buildLemonCheckoutUrl(input: {
  productId: string;
  scope: string;
  githubUserId: string;
  plan: SubscriptionPlan;
}) {
  const base = `https://checkout.lemonsqueezy.com/buy/${input.productId}`;
  const params = new URLSearchParams({
    embed: "1",
    media: "0",
    logo: "0",
    desc: "0",
    "checkout[custom][scope]": input.scope,
    "checkout[custom][plan]": input.plan,
    "checkout[custom][github_user_id]": input.githubUserId,
  });

  return `${base}?${params.toString()}`;
}

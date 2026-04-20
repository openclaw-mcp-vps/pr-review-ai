import { createHmac, timingSafeEqual } from "node:crypto";
import type { PlanType, SubscriptionStatus } from "@/lib/types";

export interface LemonEvent {
  eventName: string;
  email: string;
  plan: PlanType;
  status: SubscriptionStatus;
  repoFullName?: string;
  orgName?: string;
  orderId?: string;
  subscriptionId?: string;
  renewsAt?: string;
}

function normalizeStatus(eventName: string, currentStatus: string | undefined): SubscriptionStatus {
  if (eventName.includes("cancel") || currentStatus === "cancelled" || currentStatus === "expired") {
    return "canceled";
  }

  if (
    currentStatus === "active" ||
    currentStatus === "on_trial" ||
    currentStatus === "paid" ||
    eventName.includes("created") ||
    eventName.includes("resumed")
  ) {
    return "active";
  }

  return "inactive";
}

function inferPlan(price: number | undefined, customPlan: string | undefined): PlanType {
  if (customPlan === "repo" || customPlan === "org") {
    return customPlan;
  }

  if (typeof price === "number" && price >= 9900) {
    return "org";
  }

  return "repo";
}

export function verifyLemonSignature(body: string, signature: string | null): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }

  if (!signature) {
    return false;
  }

  const computed = createHmac("sha256", secret).update(body).digest("hex");
  const computedBytes = Buffer.from(computed);
  const signatureBytes = Buffer.from(signature);

  if (computedBytes.length !== signatureBytes.length) {
    return false;
  }

  return timingSafeEqual(computedBytes, signatureBytes);
}

export function parseLemonWebhook(body: string): LemonEvent | null {
  const payload = JSON.parse(body) as {
    meta?: {
      event_name?: string;
      custom_data?: Record<string, string | undefined>;
    };
    data?: {
      id?: string;
      attributes?: {
        status?: string;
        user_email?: string;
        customer_email?: string;
        identifier?: string;
        order_id?: number;
        first_order_item?: {
          price?: number;
        };
        renews_at?: string;
      };
    };
  };

  const eventName = payload.meta?.event_name ?? "unknown";
  const attrs = payload.data?.attributes;
  const customData = payload.meta?.custom_data ?? {};

  const email = (attrs?.user_email ?? attrs?.customer_email ?? customData.email ?? "").toLowerCase();
  if (!email) {
    return null;
  }

  const plan = inferPlan(attrs?.first_order_item?.price, customData.plan);
  const status = normalizeStatus(eventName, attrs?.status);

  return {
    eventName,
    email,
    plan,
    status,
    repoFullName: customData.repo_full_name,
    orgName: customData.org_name,
    orderId: attrs?.order_id ? String(attrs.order_id) : undefined,
    subscriptionId: attrs?.identifier ?? payload.data?.id,
    renewsAt: attrs?.renews_at
  };
}

export function buildCheckoutUrl(input: {
  plan: PlanType;
  repoFullName?: string;
  email?: string;
  origin: string;
}): string | null {
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;
  if (!productId) {
    return null;
  }

  const base = productId.startsWith("http")
    ? new URL(productId)
    : new URL(`https://checkout.lemonsqueezy.com/buy/${productId}`);

  base.searchParams.set("embed", "1");
  base.searchParams.set("media", "0");
  base.searchParams.set("logo", "0");
  base.searchParams.set("checkout[custom][plan]", input.plan);

  if (input.email) {
    base.searchParams.set("checkout[email]", input.email);
    base.searchParams.set("checkout[custom][email]", input.email);
  }

  if (input.repoFullName) {
    base.searchParams.set("checkout[custom][repo_full_name]", input.repoFullName);
  }

  const successUrl = new URL("/unlock", input.origin);
  successUrl.searchParams.set("status", "paid");
  base.searchParams.set("checkout[success_url]", successUrl.toString());

  return base.toString();
}

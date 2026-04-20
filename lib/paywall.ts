import { createHmac, timingSafeEqual } from "node:crypto";
import type { AccessPayload, PlanType } from "@/lib/types";

export const ACCESS_COOKIE_NAME = "prra_access";
export const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  const secret = process.env.PAYWALL_COOKIE_SECRET ?? process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("Missing PAYWALL_COOKIE_SECRET or LEMON_SQUEEZY_WEBHOOK_SECRET.");
  }

  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createAccessToken(input: {
  email: string;
  plan: PlanType;
  repoFullName?: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AccessPayload = {
    email: input.email.toLowerCase(),
    plan: input.plan,
    repoFullName: input.repoFullName,
    iat: now,
    exp: now + ACCESS_COOKIE_MAX_AGE_SECONDS
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyAccessToken(token: string | undefined): AccessPayload | null {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  const expected = sign(encoded);

  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(signature);

  if (expectedBytes.length !== signatureBytes.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBytes, signatureBytes)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AccessPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

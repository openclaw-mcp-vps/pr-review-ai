import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "pr_review_ai_session";
export const PAYWALL_COOKIE = "pr_review_ai_paid";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PAYWALL_TTL_SECONDS = 60 * 60 * 6;

function getSecret() {
  return process.env.SESSION_SECRET ?? "local-dev-insecure-secret-change-me";
}

function toBase64Url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

function encodeToken(payload: Record<string, string | number | boolean>) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function decodeToken<T extends Record<string, unknown>>(token: string): T | null {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload);
  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(payload)) as T;
  } catch {
    return null;
  }
}

export function createSessionToken(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return encodeToken({ userId, exp });
}

export function readSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const payload = decodeToken<{ userId: string; exp: number }>(token);
  if (!payload) {
    return null;
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export function createPaywallToken(userId: string, access: "locked" | "paid") {
  const exp = Math.floor(Date.now() / 1000) + PAYWALL_TTL_SECONDS;
  return encodeToken({ userId, access, exp });
}

export function readPaywallToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const payload = decodeToken<{ userId: string; access: "locked" | "paid"; exp: number }>(token);
  if (!payload) {
    return null;
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

import { cookies } from "next/headers";
import { PAYWALL_COOKIE, readPaywallToken, readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getUserById } from "@/lib/db";

function parseCookieHeader(headerValue: string | null, key: string) {
  if (!headerValue) {
    return undefined;
  }

  for (const chunk of headerValue.split(";")) {
    const trimmed = chunk.trim();
    if (trimmed.startsWith(`${key}=`)) {
      return decodeURIComponent(trimmed.slice(key.length + 1));
    }
  }

  return undefined;
}

export async function getSessionUserFromRequest(request: Request) {
  const sessionCookie = parseCookieHeader(request.headers.get("cookie"), SESSION_COOKIE);
  const session = readSessionToken(sessionCookie);

  if (!session) {
    return null;
  }

  return getUserById(session.userId);
}

export async function getSessionUserFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = readSessionToken(token);

  if (!session) {
    return null;
  }

  return getUserById(session.userId);
}

export async function getPaywallStateFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PAYWALL_COOKIE)?.value;
  return readPaywallToken(token);
}

import { NextResponse } from "next/server";
import { createPaywallToken, PAYWALL_COOKIE } from "@/lib/auth";
import { hasActiveSubscriptionForUser } from "@/lib/db";
import { getSessionUserFromRequest } from "@/lib/server-auth";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export async function GET(request: Request) {
  const user = await getSessionUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await hasActiveSubscriptionForUser(user.id);
  const token = createPaywallToken(user.id, hasAccess ? "paid" : "locked");

  const response = NextResponse.json({ access: hasAccess ? "paid" : "locked" });
  response.cookies.set({
    name: PAYWALL_COOKIE,
    value: token,
    path: "/",
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: 60 * 60 * 6,
  });

  return response;
}

import { NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/paywall";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((cookie) => cookie.startsWith(`${ACCESS_COOKIE_NAME}=`));

  const token = match?.split("=").slice(1).join("=");
  const access = verifyAccessToken(token);

  return NextResponse.json({ access });
}

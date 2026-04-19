import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createPaywallToken, createSessionToken, PAYWALL_COOKIE, SESSION_COOKIE } from "@/lib/auth";
import { fetchAuthenticatedGitHubUser, exchangeGitHubCodeForToken } from "@/lib/github";
import { upsertUser } from "@/lib/db";

const STATE_COOKIE = "pr_review_ai_github_state";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const appUrl = process.env.APP_URL ?? url.origin;
  const callback = `${appUrl}/api/auth/github`;

  if (!code) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "Missing GITHUB_CLIENT_ID" }, { status: 500 });
    }

    const oauthState = randomUUID();
    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", callback);
    authUrl.searchParams.set("scope", "repo read:user user:email");
    authUrl.searchParams.set("state", oauthState);

    const response = NextResponse.redirect(authUrl, 302);
    response.cookies.set({
      name: STATE_COOKIE,
      value: oauthState,
      path: "/",
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      maxAge: 60 * 10,
    });

    return response;
  }

  const stateCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${STATE_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");

  if (!state || !stateCookie || stateCookie !== state) {
    return NextResponse.json({ error: "OAuth state mismatch" }, { status: 400 });
  }

  try {
    const accessToken = await exchangeGitHubCodeForToken(code, callback);
    const user = await fetchAuthenticatedGitHubUser(accessToken);
    const dbUser = await upsertUser({
      githubId: user.id,
      login: user.login,
      avatarUrl: user.avatarUrl,
      accessToken,
    });

    const sessionToken = createSessionToken(dbUser.id);
    const paywallToken = createPaywallToken(dbUser.id, "locked");

    const response = NextResponse.redirect(new URL("/dashboard", appUrl), 302);

    response.cookies.set({
      name: STATE_COOKIE,
      value: "",
      path: "/",
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      maxAge: 0,
    });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionToken,
      path: "/",
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set({
      name: PAYWALL_COOKIE,
      value: paywallToken,
      path: "/",
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      maxAge: 60 * 60 * 6,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to authenticate with GitHub";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

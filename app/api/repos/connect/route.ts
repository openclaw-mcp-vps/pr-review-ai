import { NextResponse } from "next/server";
import { z } from "zod";
import { createPaywallToken, PAYWALL_COOKIE } from "@/lib/auth";
import { canUserAccessRepo, upsertRepository } from "@/lib/db";
import { getSessionUserFromRequest } from "@/lib/server-auth";

const BodySchema = z.object({
  repoFullName: z
    .string()
    .min(3)
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Repository must follow owner/repo"),
});

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export async function POST(request: Request) {
  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const allowed = await canUserAccessRepo(user.id, body.repoFullName);
  if (!allowed) {
    return NextResponse.json(
      {
        error: "This repository is not unlocked yet. Complete checkout first.",
      },
      { status: 402 },
    );
  }

  const repo = await upsertRepository({
    fullName: body.repoFullName,
    userId: user.id,
  });

  const response = NextResponse.json({ repo });
  response.cookies.set({
    name: PAYWALL_COOKIE,
    value: createPaywallToken(user.id, "paid"),
    path: "/",
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: 60 * 60 * 6,
  });

  return response;
}

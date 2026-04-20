import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const installUrl = process.env.GITHUB_APP_INSTALL_URL;
  if (!installUrl) {
    return NextResponse.json(
      {
        error: "Set GITHUB_APP_INSTALL_URL to your GitHub App installation URL."
      },
      { status: 500 }
    );
  }

  return NextResponse.redirect(new URL(installUrl));
}

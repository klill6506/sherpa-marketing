import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/social-accounts/meta
 * Redirects the user to Meta OAuth dialog
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "orgId required" }, { status: 400 });
  }

  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: "Meta App not configured" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/social-accounts/meta/callback`;

  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "instagram_basic",
    "instagram_content_publish",
  ].join(",");

  const state = Buffer.from(JSON.stringify({ orgId })).toString("base64url");

  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");

  return NextResponse.redirect(url.toString());
}

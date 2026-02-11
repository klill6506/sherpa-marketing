import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { Provider } from "@prisma/client";

/**
 * GET /api/social-accounts/linkedin/callback
 * Handles the OAuth callback from LinkedIn
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  if (error) {
    console.error("[LinkedIn Callback] OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL("/connect?error=linkedin_denied", req.url)
    );
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(
      new URL("/connect?error=missing_code", req.url)
    );
  }

  let orgId: string;
  try {
    const state = JSON.parse(
      Buffer.from(stateParam, "base64url").toString()
    );
    orgId = state.orgId;
  } catch {
    return NextResponse.redirect(
      new URL("/connect?error=invalid_state", req.url)
    );
  }

  // Verify user is member of this org
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: user.id, orgId } },
  });
  if (!member) {
    return NextResponse.redirect(
      new URL("/connect?error=not_member", req.url)
    );
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/social-accounts/linkedin/callback`;

    // Exchange code for access token
    const tokenRes = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: process.env.LINKEDIN_CLIENT_ID || "",
          client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
        }),
      }
    );

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error("[LinkedIn Callback] Token exchange error:", tokenData);
      return NextResponse.redirect(
        new URL("/connect?error=token_exchange", req.url)
      );
    }

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 5184000; // ~60 days
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Get user profile info via userinfo endpoint
    const profileRes = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const profileData = await profileRes.json();
    if (!profileRes.ok) {
      console.error("[LinkedIn Callback] Profile fetch error:", profileData);
      return NextResponse.redirect(
        new URL("/connect?error=profile_fetch", req.url)
      );
    }

    const linkedInSub = profileData.sub; // unique LinkedIn user ID
    const displayName = profileData.name || "LinkedIn Profile";

    // Upsert LinkedIn social account
    await prisma.socialAccount.upsert({
      where: {
        id: (
          await prisma.socialAccount.findFirst({
            where: { orgId, provider: Provider.LINKEDIN },
          })
        )?.id || "new",
      },
      update: {
        accessTokenEnc: encrypt(accessToken),
        expiresAt,
        displayName,
        providerAccountId: linkedInSub,
        metadataJson: {
          linkedInSub,
          name: profileData.name,
          email: profileData.email,
          picture: profileData.picture,
        },
      },
      create: {
        orgId,
        provider: Provider.LINKEDIN,
        accessTokenEnc: encrypt(accessToken),
        expiresAt,
        displayName,
        providerAccountId: linkedInSub,
        metadataJson: {
          linkedInSub,
          name: profileData.name,
          email: profileData.email,
          picture: profileData.picture,
        },
      },
    });

    return NextResponse.redirect(
      new URL("/connect?success=true", req.url)
    );
  } catch (error) {
    console.error("[LinkedIn Callback] Error:", error);
    return NextResponse.redirect(
      new URL("/connect?error=unknown", req.url)
    );
  }
}

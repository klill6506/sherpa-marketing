import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { Provider } from "@prisma/client";

const GRAPH_API = "https://graph.facebook.com/v21.0";

/**
 * GET /api/social-accounts/meta/callback
 * Handles the OAuth callback from Meta
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    console.error("[Meta Callback] OAuth error:", error);
    return NextResponse.redirect(
      new URL("/connect?error=meta_denied", req.url)
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
    const redirectUri = `${baseUrl}/api/social-accounts/meta/callback`;

    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `${GRAPH_API}/oauth/access_token?` +
        new URLSearchParams({
          client_id: process.env.META_APP_ID || "",
          client_secret: process.env.META_APP_SECRET || "",
          redirect_uri: redirectUri,
          code,
        })
    );

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error("[Meta Callback] Token exchange error:", tokenData.error);
      return NextResponse.redirect(
        new URL("/connect?error=token_exchange", req.url)
      );
    }

    // Exchange for long-lived token
    const longLivedRes = await fetch(
      `${GRAPH_API}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: process.env.META_APP_ID || "",
          client_secret: process.env.META_APP_SECRET || "",
          fb_exchange_token: tokenData.access_token,
        })
    );

    const longLivedData = await longLivedRes.json();
    if (longLivedData.error) {
      console.error("[Meta Callback] Long-lived token error:", longLivedData.error);
      return NextResponse.redirect(
        new URL("/connect?error=long_lived_token", req.url)
      );
    }

    const userAccessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in || 5184000; // ~60 days
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Get user's pages
    const pagesRes = await fetch(
      `${GRAPH_API}/me/accounts?access_token=${userAccessToken}&fields=id,name,access_token,instagram_business_account`
    );
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.redirect(
        new URL("/connect?error=no_pages", req.url)
      );
    }

    // Use the first page (MVP simplification)
    const page = pagesData.data[0];
    const pageAccessToken = page.access_token;
    const instagramBusinessAccountId =
      page.instagram_business_account?.id || null;

    // Upsert Facebook social account
    await prisma.socialAccount.upsert({
      where: {
        id: (
          await prisma.socialAccount.findFirst({
            where: { orgId, provider: Provider.FACEBOOK },
          })
        )?.id || "new",
      },
      update: {
        accessTokenEnc: encrypt(userAccessToken),
        expiresAt,
        displayName: page.name,
        providerAccountId: page.id,
        metadataJson: {
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: encrypt(pageAccessToken),
          instagramBusinessAccountId,
        },
      },
      create: {
        orgId,
        provider: Provider.FACEBOOK,
        accessTokenEnc: encrypt(userAccessToken),
        expiresAt,
        displayName: page.name,
        providerAccountId: page.id,
        metadataJson: {
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: encrypt(pageAccessToken),
          instagramBusinessAccountId,
        },
      },
    });

    // If Instagram business account exists, create/update that too
    if (instagramBusinessAccountId) {
      await prisma.socialAccount.upsert({
        where: {
          id: (
            await prisma.socialAccount.findFirst({
              where: { orgId, provider: Provider.INSTAGRAM },
            })
          )?.id || "new",
        },
        update: {
          accessTokenEnc: encrypt(userAccessToken),
          expiresAt,
          displayName: `${page.name} (Instagram)`,
          providerAccountId: instagramBusinessAccountId,
          metadataJson: {
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: encrypt(pageAccessToken),
            instagramBusinessAccountId,
          },
        },
        create: {
          orgId,
          provider: Provider.INSTAGRAM,
          accessTokenEnc: encrypt(userAccessToken),
          expiresAt,
          displayName: `${page.name} (Instagram)`,
          providerAccountId: instagramBusinessAccountId,
          metadataJson: {
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: encrypt(pageAccessToken),
            instagramBusinessAccountId,
          },
        },
      });
    }

    return NextResponse.redirect(
      new URL("/connect?success=true", req.url)
    );
  } catch (error) {
    console.error("[Meta Callback] Error:", error);
    return NextResponse.redirect(
      new URL("/connect?error=unknown", req.url)
    );
  }
}

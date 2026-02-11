import { Provider, SocialAccount, PostVariant, MediaAsset } from "@prisma/client";
import { decrypt } from "@/lib/encryption";
import {
  ProviderAdapter,
  ConnectionValidation,
  PublishResult,
  ProviderError,
} from "./types";

const LINKEDIN_API = "https://api.linkedin.com";
const LINKEDIN_VERSION = "202602"; // YYYYMM format

interface LinkedInMetadata {
  linkedInSub?: string;
  name?: string;
  email?: string;
  picture?: string;
}

export class LinkedInAdapter implements ProviderAdapter {
  provider = Provider.LINKEDIN;

  async validateConnection(account: SocialAccount): Promise<ConnectionValidation> {
    const warnings: string[] = [];
    const requiredActions: string[] = [];

    // Check expiry
    if (account.expiresAt) {
      const daysUntilExpiry = Math.floor(
        (account.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry <= 0) {
        return {
          ok: false,
          warnings: [],
          requiredActions: ["Token expired. Please reconnect your LinkedIn account."],
        };
      }
      if (daysUntilExpiry <= 7) {
        warnings.push(`Token expires in ${daysUntilExpiry} days. Consider reconnecting.`);
      }
    }

    // Validate token by calling userinfo
    try {
      const accessToken = decrypt(account.accessTokenEnc);
      const res = await fetch(`${LINKEDIN_API}/v2/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          return {
            ok: false,
            warnings: [],
            requiredActions: ["Token is invalid. Please reconnect your LinkedIn account."],
          };
        }
        requiredActions.push(
          `Unable to verify connection (${res.status}). Try reconnecting.`
        );
      }
    } catch {
      requiredActions.push("Unable to verify connection.");
    }

    return {
      ok: requiredActions.length === 0,
      warnings,
      requiredActions,
    };
  }

  async publish(
    variant: PostVariant,
    account: SocialAccount,
    caption: string,
    mediaAsset?: MediaAsset | null
  ): Promise<PublishResult> {
    const metadata = (account.metadataJson ?? {}) as LinkedInMetadata;
    const accessToken = decrypt(account.accessTokenEnc);

    const linkedInSub = metadata.linkedInSub || account.providerAccountId;
    if (!linkedInSub) {
      throw new ProviderError(
        "No LinkedIn user ID in metadata",
        "MISSING_USER_ID",
        "No LinkedIn profile connected. Please reconnect your account."
      );
    }

    const effectiveCaption = variant.captionOverride || caption;
    const authorUrn = `urn:li:person:${linkedInSub}`;

    if (mediaAsset && mediaAsset.mimeType.startsWith("image/")) {
      return this.publishWithImage(authorUrn, accessToken, effectiveCaption, mediaAsset);
    }

    // Text-only post
    return this.publishTextPost(authorUrn, accessToken, effectiveCaption);
  }

  private async publishTextPost(
    authorUrn: string,
    accessToken: string,
    caption: string
  ): Promise<PublishResult> {
    const body = {
      author: authorUrn,
      commentary: caption,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    const res = await fetch(`${LINKEDIN_API}/rest/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      this.handleLinkedInError(res.status, errorData);
    }

    // LinkedIn returns the post ID in the x-restli-id header
    const postId = res.headers.get("x-restli-id") || "";

    return {
      externalId: postId,
      permalink: postId
        ? `https://www.linkedin.com/feed/update/${postId}`
        : undefined,
    };
  }

  private async publishWithImage(
    authorUrn: string,
    accessToken: string,
    caption: string,
    mediaAsset: MediaAsset
  ): Promise<PublishResult> {
    // Step 1: Initialize image upload
    const initBody = {
      initializeUploadRequest: {
        owner: authorUrn,
      },
    };

    const initRes = await fetch(`${LINKEDIN_API}/rest/images?action=initializeUpload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(initBody),
    });

    if (!initRes.ok) {
      const errorData = await initRes.json().catch(() => ({}));
      this.handleLinkedInError(initRes.status, errorData);
    }

    const initData = await initRes.json();
    const uploadUrl = initData.value?.uploadUrl;
    const imageUrn = initData.value?.image;

    if (!uploadUrl || !imageUrn) {
      throw new ProviderError(
        "Failed to initialize LinkedIn image upload",
        "UPLOAD_INIT_FAILED",
        "Could not start image upload to LinkedIn. Please try again."
      );
    }

    // Step 2: Upload the actual image binary
    const imageUrl = this.resolveMediaUrl(mediaAsset.url);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new ProviderError(
        "Failed to fetch image for upload",
        "IMAGE_FETCH_FAILED",
        "Could not read the image file. Please check the media asset."
      );
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": mediaAsset.mimeType,
      },
      body: imageBuffer,
    });

    if (!uploadRes.ok) {
      throw new ProviderError(
        `LinkedIn image upload failed with status ${uploadRes.status}`,
        "UPLOAD_FAILED",
        "Failed to upload image to LinkedIn. Please try again."
      );
    }

    // Step 3: Create the post with the uploaded image
    const postBody = {
      author: authorUrn,
      commentary: caption,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        media: {
          altText: caption.substring(0, 120),
          id: imageUrn,
        },
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    const postRes = await fetch(`${LINKEDIN_API}/rest/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    if (!postRes.ok) {
      const errorData = await postRes.json().catch(() => ({}));
      this.handleLinkedInError(postRes.status, errorData);
    }

    const postId = postRes.headers.get("x-restli-id") || "";

    return {
      externalId: postId,
      permalink: postId
        ? `https://www.linkedin.com/feed/update/${postId}`
        : undefined,
    };
  }

  private resolveMediaUrl(url: string): string {
    if (url.startsWith("/")) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      return `${baseUrl}${url}`;
    }
    return url;
  }

  private handleLinkedInError(
    status: number,
    data: { message?: string; status?: number; code?: string; serviceErrorCode?: number }
  ): never {
    if (status === 401) {
      throw new ProviderError(
        data.message || "Token expired or invalid",
        "TOKEN_EXPIRED",
        "Your LinkedIn connection has expired. Please reconnect your account.",
        data
      );
    }

    if (status === 403) {
      throw new ProviderError(
        data.message || "Permissions error",
        "PERMISSIONS_MISSING",
        "Missing required permissions. Please reconnect and grant all requested permissions.",
        data
      );
    }

    if (status === 429) {
      throw new ProviderError(
        data.message || "Rate limited",
        "RATE_LIMITED",
        "LinkedIn rate limit reached. Please try again later.",
        data
      );
    }

    if (status === 422) {
      throw new ProviderError(
        data.message || "Invalid content",
        "INVALID_CONTENT",
        "LinkedIn rejected the post content. Check text length and media format.",
        data
      );
    }

    throw new ProviderError(
      data.message || `LinkedIn API error (${status})`,
      `LINKEDIN_${status}`,
      data.message || "An error occurred publishing to LinkedIn.",
      data
    );
  }
}

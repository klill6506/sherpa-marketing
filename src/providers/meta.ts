import { Provider, SocialAccount, PostVariant, MediaAsset } from "@prisma/client";
import { decrypt } from "@/lib/encryption";
import {
  ProviderAdapter,
  ConnectionValidation,
  PublishResult,
  ProviderError,
} from "./types";

const GRAPH_API = "https://graph.facebook.com/v21.0";

interface MetaMetadata {
  pageId?: string;
  pageName?: string;
  pageAccessToken?: string; // encrypted
  instagramBusinessAccountId?: string;
}

export class MetaAdapter implements ProviderAdapter {
  provider = Provider.FACEBOOK;

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
          requiredActions: ["Token expired. Please reconnect your Meta account."],
        };
      }
      if (daysUntilExpiry <= 7) {
        warnings.push(`Token expires in ${daysUntilExpiry} days. Consider reconnecting.`);
      }
    }

    // Try to validate the token
    try {
      const accessToken = decrypt(account.accessTokenEnc);
      const res = await fetch(`${GRAPH_API}/me?access_token=${accessToken}`);
      if (!res.ok) {
        const err = await res.json();
        if (err.error?.code === 190) {
          return {
            ok: false,
            warnings: [],
            requiredActions: ["Token is invalid. Please reconnect your Meta account."],
          };
        }
        requiredActions.push("Unable to verify connection. Try reconnecting.");
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
    const metadata = (account.metadataJson ?? {}) as MetaMetadata;
    const accessToken = decrypt(account.accessTokenEnc);

    const effectiveCaption = variant.captionOverride || caption;

    if (variant.provider === Provider.FACEBOOK) {
      return this.publishToFacebook(metadata, accessToken, effectiveCaption, mediaAsset);
    } else if (variant.provider === Provider.INSTAGRAM) {
      return this.publishToInstagram(metadata, accessToken, effectiveCaption, mediaAsset);
    }

    throw new ProviderError(
      `Unsupported Meta variant provider: ${variant.provider}`,
      "UNSUPPORTED_PROVIDER",
      "This platform is not supported yet."
    );
  }

  private async publishToFacebook(
    metadata: MetaMetadata,
    accessToken: string,
    caption: string,
    mediaAsset?: MediaAsset | null
  ): Promise<PublishResult> {
    const pageId = metadata.pageId;
    if (!pageId) {
      throw new ProviderError(
        "No Facebook Page ID in metadata",
        "MISSING_PAGE_ID",
        "No Facebook Page connected. Please reconnect your account."
      );
    }

    // Use page access token if available, otherwise user token
    const token = metadata.pageAccessToken
      ? decrypt(metadata.pageAccessToken)
      : accessToken;

    let endpoint: string;
    let body: Record<string, string>;

    if (mediaAsset && mediaAsset.mimeType.startsWith("image/")) {
      // Photo post
      endpoint = `${GRAPH_API}/${pageId}/photos`;
      const imageUrl = this.resolveMediaUrl(mediaAsset.url);
      body = { url: imageUrl, message: caption, access_token: token };
    } else if (mediaAsset && mediaAsset.mimeType.startsWith("video/")) {
      // Video post
      endpoint = `${GRAPH_API}/${pageId}/videos`;
      const videoUrl = this.resolveMediaUrl(mediaAsset.url);
      body = { file_url: videoUrl, description: caption, access_token: token };
    } else {
      // Text-only post
      endpoint = `${GRAPH_API}/${pageId}/feed`;
      body = { message: caption, access_token: token };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });

    const data = await res.json();

    if (!res.ok) {
      this.handleMetaError(data);
    }

    return {
      externalId: data.id || data.post_id || "",
      permalink: data.permalink_url,
    };
  }

  private async publishToInstagram(
    metadata: MetaMetadata,
    accessToken: string,
    caption: string,
    mediaAsset?: MediaAsset | null
  ): Promise<PublishResult> {
    const igAccountId = metadata.instagramBusinessAccountId;
    if (!igAccountId) {
      throw new ProviderError(
        "No Instagram Business Account ID in metadata",
        "MISSING_IG_ACCOUNT",
        "No Instagram Business Account connected. Please reconnect your account."
      );
    }

    if (!mediaAsset) {
      throw new ProviderError(
        "Instagram requires media",
        "MEDIA_REQUIRED",
        "Instagram posts require an image or video."
      );
    }

    const imageUrl = this.resolveMediaUrl(mediaAsset.url);

    // Step 1: Create media container
    const isVideo = mediaAsset.mimeType.startsWith("video/");
    const containerParams: Record<string, string> = {
      caption,
      access_token: accessToken,
    };

    if (isVideo) {
      containerParams.media_type = "VIDEO";
      containerParams.video_url = imageUrl;
    } else {
      containerParams.image_url = imageUrl;
    }

    const containerRes = await fetch(
      `${GRAPH_API}/${igAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(containerParams),
      }
    );

    const containerData = await containerRes.json();
    if (!containerRes.ok) {
      this.handleMetaError(containerData);
    }

    const creationId = containerData.id;

    // For video, poll until ready
    if (isVideo) {
      await this.waitForMediaReady(creationId, accessToken);
    }

    // Step 2: Publish the container
    const publishRes = await fetch(
      `${GRAPH_API}/${igAccountId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          creation_id: creationId,
          access_token: accessToken,
        }),
      }
    );

    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      this.handleMetaError(publishData);
    }

    return {
      externalId: publishData.id || "",
      permalink: undefined,
    };
  }

  private async waitForMediaReady(
    containerId: string,
    accessToken: string,
    maxAttempts = 30
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(
        `${GRAPH_API}/${containerId}?fields=status_code&access_token=${accessToken}`
      );
      const data = await res.json();

      if (data.status_code === "FINISHED") return;
      if (data.status_code === "ERROR") {
        throw new ProviderError(
          "Instagram media processing failed",
          "MEDIA_PROCESSING_ERROR",
          "Instagram could not process this media. Check format and size."
        );
      }

      // Wait 2 seconds between polls
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new ProviderError(
      "Instagram media processing timed out",
      "MEDIA_TIMEOUT",
      "Instagram is still processing this media. Please try again later."
    );
  }

  private resolveMediaUrl(url: string): string {
    // If it's a local URL, we need the full public URL for Meta to fetch
    if (url.startsWith("/")) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      return `${baseUrl}${url}`;
    }
    return url;
  }

  private handleMetaError(data: { error?: { code?: number; message?: string; type?: string } }): never {
    const err = data.error;
    if (!err) {
      throw new ProviderError(
        "Unknown Meta API error",
        "UNKNOWN",
        "An unexpected error occurred with Meta.",
        data
      );
    }

    // Map common errors to actionable messages
    if (err.code === 190) {
      throw new ProviderError(
        err.message || "Token expired",
        "TOKEN_EXPIRED",
        "Your Meta connection has expired. Please reconnect your account.",
        data
      );
    }

    if (err.code === 10 || err.code === 200) {
      throw new ProviderError(
        err.message || "Permissions error",
        "PERMISSIONS_MISSING",
        "Missing required permissions. Please reconnect and grant all requested permissions.",
        data
      );
    }

    if (err.code === 324 || err.code === 352) {
      throw new ProviderError(
        err.message || "Invalid media",
        "INVALID_MEDIA",
        "The media file is not supported. Check format, size, and duration limits.",
        data
      );
    }

    throw new ProviderError(
      err.message || "Meta API error",
      `META_${err.code || "UNKNOWN"}`,
      err.message || "An error occurred publishing to Meta.",
      data
    );
  }
}

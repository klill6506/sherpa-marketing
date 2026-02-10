import { Provider, SocialAccount, PostVariant, MediaAsset } from "@prisma/client";
import {
  ProviderAdapter,
  ConnectionValidation,
  PublishResult,
  ProviderError,
} from "./types";

/**
 * TikTok adapter — stub for future implementation.
 * Not part of MVP; scaffolding only.
 */
export class TikTokAdapter implements ProviderAdapter {
  provider = Provider.TIKTOK;

  async validateConnection(_account: SocialAccount): Promise<ConnectionValidation> {
    return {
      ok: false,
      warnings: [],
      requiredActions: ["TikTok integration is not yet available."],
    };
  }

  async publish(
    _variant: PostVariant,
    _account: SocialAccount,
    _caption: string,
    _mediaAsset?: MediaAsset | null
  ): Promise<PublishResult> {
    throw new ProviderError(
      "TikTok publishing not implemented",
      "NOT_IMPLEMENTED",
      "TikTok publishing is coming soon."
    );
  }
}

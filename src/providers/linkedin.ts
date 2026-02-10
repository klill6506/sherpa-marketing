import { Provider, SocialAccount, PostVariant, MediaAsset } from "@prisma/client";
import {
  ProviderAdapter,
  ConnectionValidation,
  PublishResult,
  ProviderError,
} from "./types";

/**
 * LinkedIn adapter — stub for future implementation.
 * Not part of MVP; scaffolding only.
 */
export class LinkedInAdapter implements ProviderAdapter {
  provider = Provider.LINKEDIN;

  async validateConnection(_account: SocialAccount): Promise<ConnectionValidation> {
    return {
      ok: false,
      warnings: [],
      requiredActions: ["LinkedIn integration is not yet available."],
    };
  }

  async publish(
    _variant: PostVariant,
    _account: SocialAccount,
    _caption: string,
    _mediaAsset?: MediaAsset | null
  ): Promise<PublishResult> {
    throw new ProviderError(
      "LinkedIn publishing not implemented",
      "NOT_IMPLEMENTED",
      "LinkedIn publishing is coming soon."
    );
  }
}

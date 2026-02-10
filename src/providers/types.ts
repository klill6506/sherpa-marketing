import { Provider, SocialAccount, PostVariant, MediaAsset } from "@prisma/client";

export interface ConnectionValidation {
  ok: boolean;
  warnings: string[];
  requiredActions: string[];
}

export interface PublishResult {
  externalId: string;
  permalink?: string;
}

export interface ProviderAdapter {
  provider: Provider;

  /** Check if the social account connection is healthy */
  validateConnection(account: SocialAccount): Promise<ConnectionValidation>;

  /** Publish a post variant to the provider */
  publish(
    variant: PostVariant,
    account: SocialAccount,
    caption: string,
    mediaAsset?: MediaAsset | null
  ): Promise<PublishResult>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public providerResponse?: unknown
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

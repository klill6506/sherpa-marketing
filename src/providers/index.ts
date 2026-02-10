import { Provider } from "@prisma/client";
import { ProviderAdapter } from "./types";
import { MetaAdapter } from "./meta";
import { LinkedInAdapter } from "./linkedin";
import { TikTokAdapter } from "./tiktok";

const adapters: Record<string, ProviderAdapter> = {
  [Provider.FACEBOOK]: new MetaAdapter(),
  [Provider.INSTAGRAM]: new MetaAdapter(), // Instagram uses Meta Graph API
  [Provider.LINKEDIN]: new LinkedInAdapter(),
  [Provider.TIKTOK]: new TikTokAdapter(),
};

export function getAdapter(provider: Provider): ProviderAdapter {
  const adapter = adapters[provider];
  if (!adapter) {
    throw new Error(`No adapter registered for provider: ${provider}`);
  }
  return adapter;
}

export { ProviderError } from "./types";
export type { ProviderAdapter, ConnectionValidation, PublishResult } from "./types";

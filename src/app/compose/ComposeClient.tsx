"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Account {
  id: string;
  provider: string;
  displayName: string | null;
}

interface VariantState {
  provider: "FACEBOOK" | "INSTAGRAM" | "LINKEDIN";
  enabled: boolean;
  captionOverride: string;
}

export function ComposeClient({
  accounts,
  hasAccounts,
}: {
  accounts: Account[];
  hasAccounts: boolean;
}) {
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMode, setPublishMode] = useState<"now" | "schedule" | "draft">(
    "now"
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [error, setError] = useState("");

  // Build variants based on connected accounts
  const availableProviders = [
    ...new Set(
      accounts
        .map((a) => a.provider)
        .filter((p) => p === "FACEBOOK" || p === "INSTAGRAM" || p === "LINKEDIN")
    ),
  ] as ("FACEBOOK" | "INSTAGRAM" | "LINKEDIN")[];

  const [variants, setVariants] = useState<VariantState[]>(
    availableProviders.map((provider) => ({
      provider,
      enabled: true,
      captionOverride: "",
    }))
  );

  const toggleVariant = (provider: string) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.provider === provider ? { ...v, enabled: !v.enabled } : v
      )
    );
  };

  const setOverride = (provider: string, override: string) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.provider === provider ? { ...v, captionOverride: override } : v
      )
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/media", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        return;
      }

      const asset = await res.json();
      setMediaAssetId(asset.id);
      setMediaPreview(asset.url);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);
    setError("");

    if (variants.filter((v) => v.enabled).length === 0) {
      setError("Enable at least one platform");
      setPublishing(false);
      return;
    }

    try {
      const body = {
        caption,
        hashtags,
        mediaAssetId: mediaAssetId || undefined,
        variants: variants.map((v) => ({
          provider: v.provider,
          enabled: v.enabled,
          captionOverride: v.captionOverride || undefined,
        })),
        publishMode,
        scheduledAt:
          publishMode === "schedule" ? new Date(scheduledAt).toISOString() : undefined,
        timezone,
      };

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(
          typeof data.error === "string"
            ? data.error
            : "Failed to create post"
        );
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong");
    } finally {
      setPublishing(false);
    }
  };

  if (!hasAccounts) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4 text-4xl">
          📱
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          No accounts connected
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Connect a social media account before composing posts.
        </p>
        <Link
          href="/connect"
          className="mt-4 inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
        >
          Connect an account
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compose Post</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Create and publish content across your connected platforms
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Caption */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <label
            htmlFor="caption"
            className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300"
          >
            Caption
          </label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            required
            rows={4}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500"
            placeholder="What would you like to share?"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {caption.length} / 5,000 characters
          </p>

          <div className="mt-4">
            <label
              htmlFor="hashtags"
              className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300"
            >
              Hashtags
            </label>
            <input
              id="hashtags"
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500"
              placeholder="#marketing #socialmedia"
            />
          </div>
        </div>

        {/* Media Upload */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
            Media (optional)
          </label>

          {mediaPreview ? (
            <div className="relative">
              {mediaPreview.match(/\.(mp4|mov)$/i) ? (
                <video
                  src={mediaPreview}
                  controls
                  className="max-h-64 rounded-lg"
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="max-h-64 rounded-lg object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setMediaAssetId(null);
                  setMediaPreview(null);
                }}
                className="absolute top-2 right-2 rounded-full bg-gray-900/60 p-1 text-white hover:bg-gray-900/80"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="file-upload"
                className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-8 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700/50 dark:hover:bg-gray-700"
              >
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {uploading ? "Uploading..." : "Click to upload image or video"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    JPEG, PNG, GIF, WebP, MP4, MOV (max 100MB)
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Platform Selection + Overrides */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-700 mb-4 dark:text-gray-300">
            Platforms
          </h3>
          <div className="space-y-4">
            {variants.map((variant) => {
              const account = accounts.find(
                (a) => a.provider === variant.provider
              );
              return (
                <div key={variant.provider} className="space-y-2">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={variant.enabled}
                      onChange={() => toggleVariant(variant.provider)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {variant.provider === "FACEBOOK"
                        ? "Facebook"
                        : variant.provider === "LINKEDIN"
                        ? "LinkedIn"
                        : "Instagram"}
                    </span>
                    {account?.displayName && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({account.displayName})
                      </span>
                    )}
                  </label>

                  {variant.enabled && (
                    <div className="ml-7">
                      <label className="block text-xs text-gray-500 mb-1 dark:text-gray-400">
                        Caption override (optional)
                      </label>
                      <textarea
                        value={variant.captionOverride}
                        onChange={(e) =>
                          setOverride(variant.provider, e.target.value)
                        }
                        rows={2}
                        className="block w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500"
                        placeholder="Leave blank to use main caption"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Publish Mode */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-700 mb-4 dark:text-gray-300">
            When to publish
          </h3>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="publishMode"
                value="now"
                checked={publishMode === "now"}
                onChange={() => setPublishMode("now")}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="text-sm text-gray-900 dark:text-gray-200">Publish now</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="publishMode"
                value="schedule"
                checked={publishMode === "schedule"}
                onChange={() => setPublishMode("schedule")}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="text-sm text-gray-900 dark:text-gray-200">Schedule</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="publishMode"
                value="draft"
                checked={publishMode === "draft"}
                onChange={() => setPublishMode("draft")}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="text-sm text-gray-900 dark:text-gray-200">Save as draft</span>
            </label>
          </div>

          {publishMode === "schedule" && (
            <div className="mt-4 flex gap-4">
              <div className="flex-1">
                <label
                  htmlFor="scheduledAt"
                  className="block text-xs text-gray-500 mb-1 dark:text-gray-400"
                >
                  Date &amp; Time
                </label>
                <input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="timezone"
                  className="block text-xs text-gray-500 mb-1 dark:text-gray-400"
                >
                  Timezone
                </label>
                <input
                  id="timezone"
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 dark:bg-red-900/30 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={publishing}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 ${
              publishMode === "now"
                ? "bg-green-600 hover:bg-green-500"
                : publishMode === "schedule"
                ? "bg-blue-600 hover:bg-blue-500"
                : "bg-gray-600 hover:bg-gray-500"
            }`}
          >
            {publishing
              ? "Working..."
              : publishMode === "now"
              ? "Publish Now"
              : publishMode === "schedule"
              ? "Schedule"
              : "Save Draft"}
          </button>
        </div>
      </form>
    </div>
  );
}

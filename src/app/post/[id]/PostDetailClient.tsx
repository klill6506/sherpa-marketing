"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

interface PostDetail {
  id: string;
  caption: string;
  hashtags: string | null;
  createdAt: string;
  createdBy: { name: string | null; email: string | null };
  variants: {
    id: string;
    provider: string;
    enabled: boolean;
    captionOverride: string | null;
  }[];
  mediaAsset: {
    url: string;
    mimeType: string;
    filename: string;
    sizeBytes: number;
  } | null;
  publishJob: {
    id: string;
    status: string;
    runAtUtc: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    attempts: {
      id: string;
      provider: string;
      status: string;
      externalId: string | null;
      permalink: string | null;
      errorCode: string | null;
      errorMessage: string | null;
      attemptNumber: number;
      createdAt: string;
    }[];
  } | null;
}

export function PostDetailClient({ post }: { post: PostDetail }) {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
      >
        &larr; Back to Dashboard
      </Link>

      {/* Post content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Post Details</h1>
          {post.publishJob && (
            <StatusBadge status={post.publishJob.status} />
          )}
          {!post.publishJob && <StatusBadge status="DRAFT" />}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Caption
            </label>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">
              {post.caption}
            </p>
          </div>

          {post.hashtags && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Hashtags
              </label>
              <p className="text-sm text-blue-600">{post.hashtags}</p>
            </div>
          )}

          {post.mediaAsset && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Media
              </label>
              {post.mediaAsset.mimeType.startsWith("video/") ? (
                <video
                  src={post.mediaAsset.url}
                  controls
                  className="max-h-48 rounded-lg"
                />
              ) : (
                <img
                  src={post.mediaAsset.url}
                  alt="Post media"
                  className="max-h-48 rounded-lg object-cover"
                />
              )}
              <p className="mt-1 text-xs text-gray-500">
                {post.mediaAsset.filename} (
                {(post.mediaAsset.sizeBytes / 1024).toFixed(0)} KB)
              </p>
            </div>
          )}

          <div className="flex gap-6 text-xs text-gray-500">
            <span>
              Created by {post.createdBy.name || post.createdBy.email}
            </span>
            <span>
              {new Date(post.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Variants */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Platform Variants
        </h2>
        <div className="space-y-3">
          {post.variants.map((v) => (
            <div
              key={v.id}
              className={`rounded-lg border p-4 ${
                v.enabled
                  ? "border-blue-200 bg-blue-50"
                  : "border-gray-200 bg-gray-50 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {v.provider === "FACEBOOK"
                      ? "Facebook"
                      : v.provider === "INSTAGRAM"
                      ? "Instagram"
                      : v.provider}
                  </span>
                  <span
                    className={`text-xs ${
                      v.enabled ? "text-blue-600" : "text-gray-500"
                    }`}
                  >
                    {v.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
              {v.captionOverride && (
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                  <span className="text-xs font-medium text-gray-500">
                    Caption Override:{" "}
                  </span>
                  {v.captionOverride}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule & Job Info */}
      {post.publishJob && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Publish Job
          </h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={post.publishJob.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">
                Scheduled For
              </dt>
              <dd className="mt-1 text-gray-900">
                {new Date(post.publishJob.runAtUtc).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Timezone</dt>
              <dd className="mt-1 text-gray-900">
                {post.publishJob.timezone}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">
                Last Updated
              </dt>
              <dd className="mt-1 text-gray-900">
                {new Date(post.publishJob.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Publish Attempts */}
      {post.publishJob && post.publishJob.attempts.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Publish Attempts
          </h2>
          <div className="space-y-3">
            {post.publishJob.attempts.map((attempt) => (
              <div
                key={attempt.id}
                className={`rounded-lg border p-4 ${
                  attempt.status === "SUCCESS"
                    ? "border-blue-200 bg-blue-50"
                    : attempt.status === "FAILED"
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">
                      {attempt.provider === "FACEBOOK"
                        ? "Facebook"
                        : attempt.provider === "INSTAGRAM"
                        ? "Instagram"
                        : attempt.provider}
                    </span>
                    <StatusBadge status={attempt.status} />
                    <span className="text-xs text-gray-500">
                      Attempt #{attempt.attemptNumber}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(attempt.createdAt).toLocaleString()}
                  </span>
                </div>

                {attempt.externalId && (
                  <p className="text-xs text-gray-600">
                    External ID: {attempt.externalId}
                  </p>
                )}
                {attempt.permalink && (
                  <a
                    href={attempt.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View on platform &rarr;
                  </a>
                )}
                {attempt.errorMessage && (
                  <div className="mt-2 rounded bg-red-100 px-3 py-2 text-xs text-red-800">
                    <span className="font-medium">Error:</span>{" "}
                    {attempt.errorMessage}
                    {attempt.errorCode && (
                      <span className="ml-2 text-red-600">
                        ({attempt.errorCode})
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

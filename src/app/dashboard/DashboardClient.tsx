"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

interface Post {
  id: string;
  caption: string;
  hashtags: string | null;
  createdAt: string;
  createdBy: { name: string | null; email: string | null };
  variants: { provider: string; enabled: boolean }[];
  mediaAsset: { url: string; mimeType: string } | null;
  publishJob: {
    status: string;
    runAtUtc: string;
    timezone: string;
    attempts: {
      provider: string;
      status: string;
      errorMessage: string | null;
      createdAt: string;
    }[];
  } | null;
}

interface Stats {
  total: number;
  scheduled: number;
  published: number;
  failed: number;
}

export function DashboardClient({
  posts,
  stats,
  accountCount,
}: {
  posts: Post[];
  stats: Stats;
  accountCount: number;
}) {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Overview of your social media publishing
          </p>
        </div>
        <Link
          href="/compose"
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
        >
          New Post
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Posts</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stats.total}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Scheduled</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {stats.scheduled}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Published</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">
            {stats.published}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {stats.failed}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      {(accountCount === 0 || stats.total === 0) && (
        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Get Started
          </h2>
          <div className="flex flex-wrap gap-3">
            {accountCount === 0 && (
              <Link
                href="/connect"
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
              >
                Connect Social Account
              </Link>
            )}
            {accountCount > 0 && stats.total === 0 && (
              <Link
                href="/compose"
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
              >
                Create First Post
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Posts Table */}
      {posts.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Post
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Platforms
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Scheduled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/post/${post.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {post.caption.length > 60
                        ? post.caption.slice(0, 60) + "..."
                        : post.caption}
                    </Link>
                    {post.mediaAsset && (
                      <span className="ml-2 text-xs text-gray-400">
                        {post.mediaAsset.mimeType.startsWith("video/")
                          ? "🎬"
                          : "📷"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {post.variants
                        .filter((v) => v.enabled)
                        .map((v) => (
                          <span
                            key={v.provider}
                            className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                          >
                            {v.provider === "FACEBOOK"
                              ? "FB"
                              : v.provider === "INSTAGRAM"
                              ? "IG"
                              : v.provider}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge
                      status={post.publishJob?.status || "DRAFT"}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {post.publishJob
                      ? new Date(post.publishJob.runAtUtc).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">No posts yet</p>
        </div>
      )}
    </div>
  );
}

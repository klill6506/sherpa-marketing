"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

interface Account {
  id: string;
  provider: string;
  providerAccountId: string | null;
  displayName: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function ConnectContent({
  accounts,
  orgId,
}: {
  accounts: Account[];
  orgId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const getStatusInfo = (account: Account) => {
    if (!account.expiresAt) {
      return { label: "Connected", color: "bg-blue-100 text-blue-800" };
    }

    const expiresAt = new Date(account.expiresAt);
    const now = new Date();
    const daysLeft = Math.floor(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft <= 0) {
      return { label: "Expired", color: "bg-red-100 text-red-800" };
    }
    if (daysLeft <= 7) {
      return {
        label: `Expires in ${daysLeft}d`,
        color: "bg-amber-100 text-amber-800",
      };
    }
    return { label: "Connected", color: "bg-blue-100 text-blue-800" };
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm("Disconnect this account?")) return;
    setDisconnecting(accountId);
    try {
      await fetch("/api/social-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: accountId, orgId }),
      });
      router.refresh();
    } catch {
      alert("Failed to disconnect");
    } finally {
      setDisconnecting(null);
    }
  };

  const connectMeta = () => {
    window.location.href = `/api/social-accounts/meta?orgId=${orgId}`;
  };

  const errorMessages: Record<string, string> = {
    meta_denied: "Meta connection was cancelled.",
    missing_code: "Missing authorization code from Meta.",
    invalid_state: "Invalid state parameter. Please try again.",
    not_member: "You are not a member of this organization.",
    token_exchange: "Failed to exchange token with Meta.",
    long_lived_token: "Failed to get long-lived token from Meta.",
    no_pages: "No Facebook Pages found. You need a Facebook Page to connect.",
    unknown: "An unexpected error occurred. Please try again.",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Connected Accounts
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Connect your social media accounts to publish content
        </p>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-6 rounded-md bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-800">
            Account connected successfully!
          </p>
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">
            {errorMessages[error] || errorMessages.unknown}
          </p>
        </div>
      )}

      {/* Connected accounts list */}
      {accounts.length > 0 && (
        <div className="mb-8">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <ul className="divide-y divide-gray-200">
              {accounts.map((account) => {
                const status = getStatusInfo(account);
                return (
                  <li
                    key={account.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                        {account.provider === "FACEBOOK"
                          ? "FB"
                          : account.provider === "INSTAGRAM"
                          ? "IG"
                          : account.provider.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {account.displayName || account.provider}
                        </p>
                        <p className="text-xs text-gray-500">
                          {account.provider}
                          {account.expiresAt &&
                            ` · Expires ${new Date(account.expiresAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                      {status.label === "Expired" && (
                        <button
                          onClick={connectMeta}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                        >
                          Reconnect
                        </button>
                      )}
                      <button
                        onClick={() => handleDisconnect(account.id)}
                        disabled={disconnecting === account.id}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 ring-1 ring-red-300 hover:bg-red-50 disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Connect new account */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Connect a new account
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Meta (Facebook + Instagram) */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm">
                M
              </div>
              <div>
                <p className="font-medium text-gray-900">Meta</p>
                <p className="text-xs text-gray-500">
                  Facebook + Instagram
                </p>
              </div>
            </div>
            <button
              onClick={connectMeta}
              className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
            >
              Connect Meta
            </button>
          </div>

          {/* LinkedIn (stub) */}
          <div className="rounded-lg border border-gray-200 p-4 opacity-60">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-white font-bold text-sm">
                Li
              </div>
              <div>
                <p className="font-medium text-gray-900">LinkedIn</p>
                <p className="text-xs text-gray-500">Coming soon</p>
              </div>
            </div>
            <button
              disabled
              className="w-full rounded-md bg-gray-300 px-3 py-2 text-sm font-semibold text-gray-500 cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>

          {/* TikTok (stub) */}
          <div className="rounded-lg border border-gray-200 p-4 opacity-60">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white font-bold text-sm">
                Tk
              </div>
              <div>
                <p className="font-medium text-gray-900">TikTok</p>
                <p className="text-xs text-gray-500">Coming soon</p>
              </div>
            </div>
            <button
              disabled
              className="w-full rounded-md bg-gray-300 px-3 py-2 text-sm font-semibold text-gray-500 cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConnectClient({
  accounts,
  orgId,
}: {
  accounts: Account[];
  orgId: string;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConnectContent accounts={accounts} orgId={orgId} />
    </Suspense>
  );
}

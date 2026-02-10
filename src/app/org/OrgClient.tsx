"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Org {
  id: string;
  name: string;
  role: string;
}

export function OrgClient({
  orgs,
  currentOrgId,
}: {
  orgs: Org[];
  currentOrgId?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.name?.[0] || "Failed to create organization");
        return;
      }

      router.refresh();
      setName("");
    } catch {
      setError("Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const selectOrg = (orgId: string) => {
    // For MVP, selecting an org just navigates to dashboard
    // The session picks the first org membership
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <h1 className="text-center text-2xl font-bold text-gray-900">
          Your Organizations
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Select or create an organization to get started
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="rounded-lg bg-white px-6 py-8 shadow ring-1 ring-gray-900/5 sm:px-10">
          {/* Existing orgs */}
          {orgs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Your organizations
              </h3>
              <ul className="space-y-2">
                {orgs.map((org) => (
                  <li key={org.id}>
                    <button
                      onClick={() => selectOrg(org.id)}
                      className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left hover:bg-gray-50 ${
                        org.id === currentOrgId
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div>
                        <p className="font-medium text-gray-900">{org.name}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {org.role}
                        </p>
                      </div>
                      {org.id === currentOrgId && (
                        <span className="text-xs font-medium text-blue-600">
                          Active
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Create new org */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Create a new organization
            </h3>
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Organization name"
                required
                className="block flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              />
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </form>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

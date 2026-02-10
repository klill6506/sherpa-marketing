"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Compose", href: "/compose" },
  { name: "Connections", href: "/connect" },
];

export function AppShell({
  children,
  orgName,
  userName,
}: {
  children: React.ReactNode;
  orgName?: string;
  userName?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-full">
      {/* Top nav bar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            {/* Left: Brand + Nav */}
            <div className="flex">
              <div className="flex shrink-0 items-center">
                <span className="text-xl font-bold text-blue-600">
                  ⛰ Sherpa
                </span>
                <span className="ml-1 text-xl font-light text-gray-500">
                  Marketing
                </span>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium",
                      pathname === item.href
                        ? "border-blue-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: Org + User */}
            <div className="flex items-center gap-4">
              {orgName && (
                <Link
                  href="/org"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {orgName}
                </Link>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  {userName || "User"}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden">
          <div className="flex space-x-2 px-4 pb-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium",
                  pathname === item.href
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

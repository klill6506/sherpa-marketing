import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sherpa Marketing",
  description: "Multi-platform social media publishing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full antialiased text-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

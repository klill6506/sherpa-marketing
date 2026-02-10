import { requireOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await requireOrg();

  const posts = await prisma.post.findMany({
    where: { orgId: session.orgId },
    include: {
      variants: true,
      publishJob: {
        include: {
          attempts: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
      mediaAsset: true,
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Serialize dates for client component
  const serializedPosts = posts.map((p) => ({
    id: p.id,
    caption: p.caption,
    hashtags: p.hashtags,
    createdAt: p.createdAt.toISOString(),
    createdBy: p.createdBy,
    variants: p.variants.map((v) => ({
      provider: v.provider,
      enabled: v.enabled,
    })),
    mediaAsset: p.mediaAsset
      ? { url: p.mediaAsset.url, mimeType: p.mediaAsset.mimeType }
      : null,
    publishJob: p.publishJob
      ? {
          status: p.publishJob.status,
          runAtUtc: p.publishJob.runAtUtc.toISOString(),
          timezone: p.publishJob.timezone,
          attempts: p.publishJob.attempts.map((a) => ({
            provider: a.provider,
            status: a.status,
            errorMessage: a.errorMessage,
            createdAt: a.createdAt.toISOString(),
          })),
        }
      : null,
  }));

  // Quick stats
  const stats = {
    total: posts.length,
    scheduled: posts.filter((p) => p.publishJob?.status === "SCHEDULED").length,
    published: posts.filter((p) => p.publishJob?.status === "PUBLISHED").length,
    failed: posts.filter((p) => p.publishJob?.status === "FAILED").length,
  };

  const accountCount = await prisma.socialAccount.count({
    where: { orgId: session.orgId },
  });

  return (
    <AppShell orgName={session.orgName} userName={session.name || session.email}>
      <DashboardClient
        posts={serializedPosts}
        stats={stats}
        accountCount={accountCount}
      />
    </AppShell>
  );
}

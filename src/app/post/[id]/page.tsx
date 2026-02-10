import { requireOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { PostDetailClient } from "./PostDetailClient";
import { notFound } from "next/navigation";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOrg();
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id, orgId: session.orgId },
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
  });

  if (!post) {
    notFound();
  }

  const serialized = {
    id: post.id,
    caption: post.caption,
    hashtags: post.hashtags,
    createdAt: post.createdAt.toISOString(),
    createdBy: post.createdBy,
    variants: post.variants.map((v) => ({
      id: v.id,
      provider: v.provider,
      enabled: v.enabled,
      captionOverride: v.captionOverride,
    })),
    mediaAsset: post.mediaAsset
      ? {
          url: post.mediaAsset.url,
          mimeType: post.mediaAsset.mimeType,
          filename: post.mediaAsset.filename,
          sizeBytes: post.mediaAsset.sizeBytes,
        }
      : null,
    publishJob: post.publishJob
      ? {
          id: post.publishJob.id,
          status: post.publishJob.status,
          runAtUtc: post.publishJob.runAtUtc.toISOString(),
          timezone: post.publishJob.timezone,
          createdAt: post.publishJob.createdAt.toISOString(),
          updatedAt: post.publishJob.updatedAt.toISOString(),
          attempts: post.publishJob.attempts.map((a) => ({
            id: a.id,
            provider: a.provider,
            status: a.status,
            externalId: a.externalId,
            permalink: a.permalink,
            errorCode: a.errorCode,
            errorMessage: a.errorMessage,
            attemptNumber: a.attemptNumber,
            createdAt: a.createdAt.toISOString(),
          })),
        }
      : null,
  };

  return (
    <AppShell orgName={session.orgName} userName={session.name || session.email}>
      <PostDetailClient post={serialized} />
    </AppShell>
  );
}

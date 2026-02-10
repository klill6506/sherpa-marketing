import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPostSchema } from "@/lib/validations";
import { PublishStatus } from "@prisma/client";
import { enqueuePublishJob } from "@/lib/queue";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get user's org
  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { caption, hashtags, mediaAssetId, variants, publishMode, scheduledAt, timezone } =
    parsed.data;

  // Create the post with variants
  const post = await prisma.post.create({
    data: {
      orgId: membership.orgId,
      createdByUserId: user.id,
      caption,
      hashtags: hashtags || "",
      mediaAssetId: mediaAssetId || null,
      variants: {
        create: variants.map((v) => ({
          provider: v.provider,
          enabled: v.enabled,
          captionOverride: v.captionOverride || null,
        })),
      },
    },
    include: { variants: true },
  });

  // Create publish job based on mode
  if (publishMode === "now" || publishMode === "schedule") {
    let runAtUtc: Date;

    if (publishMode === "now") {
      runAtUtc = new Date();
    } else {
      if (!scheduledAt) {
        return NextResponse.json(
          { error: "scheduledAt required for scheduled posts" },
          { status: 400 }
        );
      }
      runAtUtc = new Date(scheduledAt);
    }

    const publishJob = await prisma.publishJob.create({
      data: {
        postId: post.id,
        runAtUtc,
        timezone: timezone || "UTC",
        status: PublishStatus.SCHEDULED,
      },
    });

    // Enqueue the job
    await enqueuePublishJob(publishJob.id, runAtUtc);

    return NextResponse.json(
      { post, publishJob },
      { status: 201 }
    );
  }

  // Draft mode — no publish job
  return NextResponse.json({ post }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const posts = await prisma.post.findMany({
    where: { orgId: membership.orgId },
    include: {
      variants: true,
      publishJob: {
        include: { attempts: true },
      },
      mediaAsset: true,
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(posts);
}

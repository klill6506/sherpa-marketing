import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
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
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Verify user has access to this org
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: user.id, orgId: post.orgId } },
  });
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(post);
}

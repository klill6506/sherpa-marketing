import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "orgId required" }, { status: 400 });
  }

  // Verify membership
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: user.id, orgId } },
  });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const accounts = await prisma.socialAccount.findMany({
    where: { orgId },
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      displayName: true,
      expiresAt: true,
      metadataJson: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(accounts);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, orgId } = await req.json();
  if (!id || !orgId) {
    return NextResponse.json({ error: "id and orgId required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: user.id, orgId } },
  });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  await prisma.socialAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

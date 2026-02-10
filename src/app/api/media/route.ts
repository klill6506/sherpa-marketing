import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";

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

  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/quicktime",
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: `File type ${file.type} not supported. Allowed: ${allowedTypes.join(", ")}` },
      { status: 400 }
    );
  }

  // Max 100MB
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 100MB." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadFile(buffer, file.name, file.type);

  const mediaAsset = await prisma.mediaAsset.create({
    data: {
      orgId: membership.orgId,
      filename: result.filename,
      url: result.url,
      mimeType: file.type,
      sizeBytes: result.sizeBytes,
    },
  });

  return NextResponse.json(mediaAsset, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/providers";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accountId } = await req.json();
  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  const account = await prisma.socialAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    const adapter = getAdapter(account.provider);
    const result = await adapter.validateConnection(account);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Validate] Error:", error);
    return NextResponse.json(
      { ok: false, warnings: [], requiredActions: ["Unable to validate connection."] },
      { status: 500 }
    );
  }
}

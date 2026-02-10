import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";

export interface AppSession {
  userId: string;
  email: string;
  name?: string | null;
  orgId?: string;
  orgName?: string;
}

export async function requireSession(): Promise<AppSession> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/login");
  }

  // Try to get the user's org membership
  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id },
    include: { org: true },
    orderBy: { org: { createdAt: "desc" } },
  });

  return {
    userId: user.id,
    email: user.email!,
    name: user.name,
    orgId: membership?.orgId,
    orgName: membership?.org.name,
  };
}

export async function requireOrg(): Promise<AppSession & { orgId: string; orgName: string }> {
  const session = await requireSession();
  if (!session.orgId) {
    redirect("/org");
  }
  return session as AppSession & { orgId: string; orgName: string };
}

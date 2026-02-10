import { requireOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { ConnectClient } from "./ConnectClient";

export default async function ConnectPage() {
  const session = await requireOrg();

  const accounts = await prisma.socialAccount.findMany({
    where: { orgId: session.orgId },
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      displayName: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <AppShell orgName={session.orgName} userName={session.name || session.email}>
      <ConnectClient
        accounts={accounts.map((a) => ({
          ...a,
          expiresAt: a.expiresAt?.toISOString() || null,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
        }))}
        orgId={session.orgId}
      />
    </AppShell>
  );
}

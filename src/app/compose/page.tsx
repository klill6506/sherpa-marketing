import { requireOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { ComposeClient } from "./ComposeClient";

export default async function ComposePage() {
  const session = await requireOrg();

  const accounts = await prisma.socialAccount.findMany({
    where: { orgId: session.orgId },
    select: {
      id: true,
      provider: true,
      displayName: true,
    },
  });

  return (
    <AppShell orgName={session.orgName} userName={session.name || session.email}>
      <ComposeClient
        accounts={accounts}
        hasAccounts={accounts.length > 0}
      />
    </AppShell>
  );
}

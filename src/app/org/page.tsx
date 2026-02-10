import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { OrgClient } from "./OrgClient";

export default async function OrgPage() {
  const session = await requireSession();

  const memberships = await prisma.orgMember.findMany({
    where: { userId: session.userId },
    include: { org: true },
  });

  const orgs = memberships.map((m) => ({
    id: m.org.id,
    name: m.org.name,
    role: m.role,
  }));

  return <OrgClient orgs={orgs} currentOrgId={session.orgId} />;
}

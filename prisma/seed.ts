import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create or find the owner user
  const ownerEmail = "owner@thetaxshelter.com";
  const user = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      name: "Tax Shelter Admin",
    },
  });
  console.log(`User: ${user.email} (${user.id})`);

  // Create The Tax Shelter organization
  let org = await prisma.organization.findFirst({
    where: { name: "The Tax Shelter" },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "The Tax Shelter",
      },
    });
    console.log(`Organization created: ${org.name} (${org.id})`);
  } else {
    console.log(`Organization exists: ${org.name} (${org.id})`);
  }

  // Create membership
  await prisma.orgMember.upsert({
    where: {
      userId_orgId: { userId: user.id, orgId: org.id },
    },
    update: { role: "owner" },
    create: {
      userId: user.id,
      orgId: org.id,
      role: "owner",
    },
  });
  console.log(`OrgMember: ${user.email} -> ${org.name} (owner)`);

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

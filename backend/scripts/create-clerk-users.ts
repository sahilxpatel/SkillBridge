/**
 * create-clerk-users.ts
 * ─────────────────────
 * One-time script that creates all 5 test accounts in Clerk via the
 * Backend API (which has no .test TLD restriction) and then upserts
 * the matching rows in the local PostgreSQL DB.
 *
 * Run with:
 *   npx ts-node scripts/create-clerk-users.ts
 */

import * as dotenv from "dotenv";
dotenv.config(); // loads backend/.env

import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
const prisma = new PrismaClient();

const TEST_PASSWORD = "SkillBr1dge#Dev2026!";

const TEST_USERS = [
  {
    email: "student@skillbridge-app.dev",
    firstName: "Alice",
    lastName: "Student",
    role: "student" as const,
  },
  {
    email: "trainer@skillbridge-app.dev",
    firstName: "John",
    lastName: "Trainer",
    role: "trainer" as const,
  },
  {
    email: "institution@skillbridge-app.dev",
    firstName: "SkillBridge",
    lastName: "Institute",
    role: "institution" as const,
  },
  {
    email: "manager@skillbridge-app.dev",
    firstName: "Paula",
    lastName: "Manager",
    role: "programme_manager" as const,
  },
  {
    email: "officer@skillbridge-app.dev",
    firstName: "Omar",
    lastName: "Officer",
    role: "monitoring_officer" as const,
  },
];

async function createOrFindClerkUser(user: (typeof TEST_USERS)[0]) {
  // Check if a user with this email already exists in Clerk
  const existing = await clerk.users.getUserList({
    emailAddress: [user.email],
  });

  if (existing.totalCount > 0) {
    const clerkUser = existing.data[0];
    console.log(`  ✓ Already exists in Clerk: ${user.email} (${clerkUser.id})`);

    // Make sure publicMetadata.role is set correctly
    await clerk.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: { role: user.role },
    });
    return clerkUser.id;
  }

  // Create new user via Backend API — no .test TLD restriction here
  const clerkUser = await clerk.users.createUser({
    emailAddress: [user.email],
    password: TEST_PASSWORD,
    firstName: user.firstName,
    lastName: user.lastName,
    publicMetadata: { role: user.role },
    skipPasswordChecks: false,
  });

  console.log(`  ✅ Created in Clerk: ${user.email} (${clerkUser.id})`);
  return clerkUser.id;
}

async function upsertDbUser(
  clerkUserId: string,
  user: (typeof TEST_USERS)[0]
) {
  const dbUser = await prisma.user.upsert({
    where: { clerkUserId },
    update: { role: user.role },
    create: {
      clerkUserId,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
    },
  });
  console.log(`  ✅ DB upserted: ${dbUser.name} → role=${dbUser.role}`);
  return dbUser;
}

async function main() {
  console.log("🚀 Creating SkillBridge test accounts...\n");

  const createdUsers: { role: string; dbId: string; clerkId: string }[] = [];

  for (const user of TEST_USERS) {
    console.log(`\n[${user.role.toUpperCase()}] ${user.email}`);
    try {
      const clerkId = await createOrFindClerkUser(user);
      const dbUser = await upsertDbUser(clerkId, user);
      createdUsers.push({ role: user.role, dbId: dbUser.id, clerkId });
    } catch (err: any) {
      console.error(`  ❌ Failed for ${user.email}:`, err?.errors ?? err.message);
    }
  }

  // ── Optional: wire up the institution user as the institutionId for trainer ──
  const institutionDb = createdUsers.find((u) => u.role === "institution");
  const trainerDb = createdUsers.find((u) => u.role === "trainer");

  if (institutionDb && trainerDb) {
    await prisma.user.update({
      where: { id: trainerDb.dbId },
      data: { institutionId: institutionDb.dbId },
    });
    console.log("\n  🔗 Linked Trainer → Institution in DB");
  }

  console.log("\n\n✅ Done! All test accounts are ready.\n");
  console.log("You can now sign in at http://localhost:3001 using:");
  console.log("  Password for all: SkillBr1dge#Dev2026!\n");
  for (const u of TEST_USERS) {
    console.log(`  ${u.role.padEnd(20)} → ${u.email}`);
  }
}

main()
  .catch((e) => {
    console.error("\n💥 Script failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

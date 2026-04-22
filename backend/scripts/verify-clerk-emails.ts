/**
 * verify-clerk-emails.ts
 * ──────────────────────
 * Marks all 5 test-account email addresses as verified in Clerk.
 * This removes the "Check your email" device-verification OTP prompt.
 *
 * Run with:
 *   npx ts-node scripts/verify-clerk-emails.ts
 */

import * as dotenv from "dotenv";
dotenv.config();

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!;
const BASE_URL = "https://api.clerk.com/v1";

// User IDs created by create-clerk-users.ts
const CLERK_USER_IDS = [
  "user_3ChDsZ0zeuliEMdeET4kpNNuwCu", // student
  "user_3ChDtBkd599d0kMgJ0eoYTB54fN", // trainer
  "user_3ChDtTkaIy5QdiNrNyD17xiQ1HB", // institution
  "user_3ChDtv3NVkZA49Yj1Dk0rpNV5nJ", // programme_manager
  "user_3ChDu92NACBi8TyxPHOBBF1WLo2", // monitoring_officer
];

async function clerkFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(JSON.stringify(err, null, 2));
  }
  return res.json();
}

async function verifyUserEmails(clerkUserId: string) {
  // 1. Fetch the user to get their email address ID(s)
  const user: any = await clerkFetch(`/users/${clerkUserId}`);
  const primaryEmail = user.email_addresses?.find(
    (e: any) => e.id === user.primary_email_address_id
  );

  if (!primaryEmail) {
    console.log(`  ⚠️  No primary email found for ${clerkUserId}`);
    return;
  }

  const email = primaryEmail.email_address;
  const emailId = primaryEmail.id;
  const verified = primaryEmail.verification?.status === "verified";

  if (verified) {
    console.log(`  ✓ Already verified: ${email}`);
    return;
  }

  // 2. Call Clerk's verify endpoint to force-verify it
  await clerkFetch(`/email_addresses/${emailId}/verify`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  console.log(`  ✅ Verified: ${email}`);
}

async function main() {
  console.log("🔐 Verifying email addresses for all test accounts...\n");

  for (const userId of CLERK_USER_IDS) {
    try {
      process.stdout.write(`[${userId}] `);
      await verifyUserEmails(userId);
    } catch (err: any) {
      console.error(`  ❌ Failed:`, err.message);
    }
  }

  console.log("\n✅ Done! All emails are verified.");
  console.log("You can now sign in at http://localhost:3001 without any OTP prompt.\n");
  console.log("Credentials:");
  console.log("  student@skillbridge-app.dev");
  console.log("  trainer@skillbridge-app.dev");
  console.log("  institution@skillbridge-app.dev");
  console.log("  manager@skillbridge-app.dev");
  console.log("  officer@skillbridge-app.dev");
  console.log("  Password: SkillBr1dge#Dev2026!");
}

main().catch((e) => {
  console.error("\n💥 Script failed:", e);
  process.exit(1);
});

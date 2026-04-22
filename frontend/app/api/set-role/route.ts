import { clerkClient, auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const roles = [
  "student",
  "trainer",
  "institution",
  "programme_manager",
  "monitoring_officer"
] as const;

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const role = body?.role as string | undefined;
  if (!role || !roles.includes(role as (typeof roles)[number])) {
    return NextResponse.json({ success: false, message: "Invalid role" }, { status: 400 });
  }

  await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: { role }
  });

  return NextResponse.json({ success: true });
}

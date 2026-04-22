import { clerkClient, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const protectedRoutes = createRouteMatcher([
  "/student(.*)",
  "/trainer(.*)",
  "/institution(.*)",
  "/programme-manager(.*)",
  "/monitoring-officer(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  if (!protectedRoutes(req)) return;

  const { sessionClaims, userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  const claims = sessionClaims as { public_metadata?: { role?: string } } | null;
  let role = claims?.public_metadata?.role;
  if (!role) {
    const user = await clerkClient.users.getUser(userId);
    const metadataRole = user.publicMetadata?.role;
    role = typeof metadataRole === "string" ? metadataRole : undefined;
  }
  const path = req.nextUrl.pathname;

  const allowed =
    (path.startsWith("/student") && role === "student") ||
    (path.startsWith("/trainer") && role === "trainer") ||
    (path.startsWith("/institution") && role === "institution") ||
    (path.startsWith("/programme-manager") && role === "programme_manager") ||
    (path.startsWith("/monitoring-officer") && role === "monitoring_officer");

  if (!allowed) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"]
};

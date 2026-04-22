import { NextFunction, Request, Response } from "express";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { Role } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { unauthorized, forbidden } from "../utils/http";

const clerkClient = createClerkClient({ secretKey: env.clerkSecretKey });
const validRoles: Role[] = [
  "student",
  "trainer",
  "institution",
  "programme_manager",
  "monitoring_officer"
];

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw unauthorized("Missing or invalid bearer token");
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = await verifyToken(token, { secretKey: env.clerkSecretKey });
    if (!payload.sub) {
      throw unauthorized("Invalid token subject");
    }

    const clerkUser = await clerkClient.users.getUser(payload.sub);
    const metadataRole = clerkUser.publicMetadata?.role;
    const role = (typeof metadataRole === "string" ? metadataRole : "") as Role;

    if (!validRoles.includes(role)) {
      throw forbidden("User role is missing or invalid in Clerk publicMetadata.role");
    }

    const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress || "Unknown User";
    const institutionId = typeof clerkUser.publicMetadata?.institutionId === "string" ? clerkUser.publicMetadata.institutionId : null;

    const dbUser = await prisma.user.upsert({
      where: { clerkUserId: payload.sub },
      update: { name, role, institutionId },
      create: { clerkUserId: payload.sub, name, role, institutionId }
    });

    req.user = {
      clerkUserId: payload.sub,
      role,
      dbUserId: dbUser.id,
      institutionId: dbUser.institutionId,
      name: dbUser.name
    };

    next();
  } catch (error) {
    next(error);
  }
};

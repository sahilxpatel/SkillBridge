import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        clerkUserId: string;
        role: Role;
        dbUserId: string;
        institutionId: string | null;
        name: string;
      };
    }
  }
}

export {};

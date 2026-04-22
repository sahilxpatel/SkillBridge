import { Router } from "express";
import { prisma } from "../lib/prisma";
import { badRequest } from "../utils/http";

const router = Router();

router.get("/trainers", async (req, res, next) => {
  try {
    if (!req.user) throw badRequest("Missing authenticated user");
    
    // Fallback to dbUserId if institutionId isn't explicitly set yet
    const institutionId = req.user.institutionId || req.user.dbUserId;

    const trainers = await prisma.user.findMany({
      where: {
        role: "trainer",
        institutionId: institutionId,
      },
      select: {
        id: true,
        name: true,
        clerkUserId: true,
        createdAt: true
      }
    });

    res.json({ success: true, data: trainers });
  } catch (error) {
    next(error);
  }
});

export default router;

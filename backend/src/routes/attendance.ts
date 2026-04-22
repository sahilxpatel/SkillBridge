import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { badRequest, forbidden, notFound } from "../utils/http";

const router = Router();

const markAttendanceSchema = z.object({
  sessionId: z.string().min(2),
  status: z.enum(["present", "absent", "late"])
});

router.post("/mark", async (req, res, next) => {
  try {
    if (!req.user) throw badRequest("Missing authenticated user");
    if (req.user.role !== "student") throw forbidden("Only students can mark attendance");
    const parsed = markAttendanceSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.errors[0]?.message || "Invalid payload");

    const session = await prisma.session.findUnique({ where: { id: parsed.data.sessionId } });
    if (!session) throw notFound("Session not found");

    const membership = await prisma.batchStudent.findUnique({
      where: {
        batchId_studentId: {
          batchId: session.batchId,
          studentId: req.user.dbUserId
        }
      }
    });

    if (!membership) throw forbidden("You are not a student in this batch");

    const attendance = await prisma.attendance.upsert({
      where: {
        sessionId_studentId: {
          sessionId: parsed.data.sessionId,
          studentId: req.user.dbUserId
        }
      },
      update: { status: parsed.data.status, markedAt: new Date() },
      create: {
        sessionId: parsed.data.sessionId,
        studentId: req.user.dbUserId,
        status: parsed.data.status
      }
    });

    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
});

export default router;

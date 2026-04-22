import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { badRequest, forbidden, notFound } from "../utils/http";

const router = Router();

const createSessionSchema = z.object({
  batchId: z.string().min(2),
  title: z.string().min(2),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string()
});

router.post("/", async (req, res, next) => {
  try {
    if (!req.user) throw badRequest("Missing authenticated user");
    if (req.user.role !== "trainer") throw forbidden("Only trainer can create sessions");
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.errors[0]?.message || "Invalid payload");

    const trainerBatch = await prisma.batchTrainer.findUnique({
      where: {
        batchId_trainerId: {
          batchId: parsed.data.batchId,
          trainerId: req.user.dbUserId
        }
      }
    });

    if (!trainerBatch) throw forbidden("You can only create sessions for your own batches");

    const session = await prisma.session.create({
      data: {
        batchId: parsed.data.batchId,
        trainerId: req.user.dbUserId,
        title: parsed.data.title,
        date: new Date(parsed.data.date),
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime)
      }
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/attendance", async (req, res, next) => {
  try {
    if (!req.user) throw badRequest("Missing authenticated user");
    if (req.user.role !== "trainer") throw forbidden("Only trainer can view session attendance");
    const sessionId = req.params.id;

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw notFound("Session not found");
    if (session.trainerId !== req.user.dbUserId) throw forbidden("Unauthorized for this session");

    const attendance = await prisma.attendance.findMany({
      where: { sessionId },
      include: { student: true }
    });

    res.json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
});

router.get("/student/mine", async (req, res, next) => {
  try {
    if (!req.user) throw badRequest("Missing authenticated user");
    if (req.user.role !== "student") throw forbidden("Only students can access their sessions");
    const batchMemberships = await prisma.batchStudent.findMany({
      where: { studentId: req.user.dbUserId },
      select: { batchId: true }
    });

    const batchIds = batchMemberships.map((b) => b.batchId);
    console.log(`[student/mine] Student ${req.user.dbUserId} is in batches:`, batchIds);

    const sessions = await prisma.session.findMany({
      where: { batchId: { in: batchIds } },
      orderBy: { date: "asc" }
    });
    
    console.log(`[student/mine] Found ${sessions.length} sessions for student.`);

    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error("[student/mine] Error:", error);
    next(error);
  }
});

router.get("/trainer/mine", async (req, res, next) => {
  try {
    if (!req.user) throw badRequest("Missing authenticated user");
    if (req.user.role !== "trainer") throw forbidden("Only trainers can access their sessions");

    const sessions = await prisma.session.findMany({
      where: { trainerId: req.user.dbUserId },
      orderBy: { date: "desc" }
    });

    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
});

export default router;

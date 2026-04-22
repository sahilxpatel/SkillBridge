import { Router } from "express";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { badRequest, notFound, forbidden } from "../utils/http";
import { env } from "../config/env";

const router = Router();

const createBatchSchema = z.object({
  name: z.string().min(2),
  institutionId: z.string().min(2).optional()
});

router.get("/", async (req, res, next) => {
  try {
    if (!req.user) throw badRequest("Missing authenticated user");

    if (req.user.role === "institution") {
      const institutionId = req.user.institutionId || req.user.dbUserId;
      const batches = await prisma.batch.findMany({
        where: { institutionId },
        orderBy: { createdAt: "desc" }
      });
      return res.json({ success: true, data: batches });
    }

    if (req.user.role === "trainer") {
      const batches = await prisma.batch.findMany({
        where: { trainers: { some: { trainerId: req.user.dbUserId } } },
        orderBy: { createdAt: "desc" }
      });
      return res.json({ success: true, data: batches });
    }

    if (req.user.role === "student") {
      const batches = await prisma.batch.findMany({
        where: { students: { some: { studentId: req.user.dbUserId } } },
        orderBy: { createdAt: "desc" }
      });
      return res.json({ success: true, data: batches });
    }

    throw forbidden("You do not have access to batches list");
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    if (!req.user) throw badRequest("Missing authenticated user");
    if (!["trainer", "institution"].includes(req.user.role)) {
      throw forbidden("Only trainer or institution can create batches");
    }
    const parsed = createBatchSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.errors[0]?.message || "Invalid payload");

    const institutionId =
      req.user.role === "institution"
        ? req.user.institutionId || req.user.dbUserId
        : parsed.data.institutionId || req.user.institutionId || req.user.dbUserId;

    if (!institutionId) throw badRequest("institutionId is required");

    const batch = await prisma.batch.create({
      data: { name: parsed.data.name, institutionId }
    });

    if (req.user.role === "trainer") {
      await prisma.batchTrainer.create({
        data: { batchId: batch.id, trainerId: req.user.dbUserId }
      });
    }

    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/invite", async (req, res, next) => {
  try {
    if (!req.user) throw badRequest("Missing authenticated user");
    if (req.user.role !== "trainer") throw forbidden("Only trainer can generate invites");
    const batchId = req.params.id;

    const trainerBatch = await prisma.batchTrainer.findUnique({
      where: { batchId_trainerId: { batchId, trainerId: req.user.dbUserId } }
    });

    if (!trainerBatch) throw forbidden("You can only invite students to your own batches");

    const token = randomBytes(16).toString("hex");
    const invite = await prisma.batchInvite.create({
      data: {
        batchId,
        token,
        createdBy: req.user.dbUserId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
      }
    });

    const joinUrl = `${env.frontendUrl}/join/${batchId}?token=${token}`;

    res.json({
      success: true,
      data: { inviteId: invite.id, token, joinUrl }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/join", async (req, res, next) => {
  try {
    if (!req.user) throw badRequest("Missing authenticated user");
    if (req.user.role !== "student") throw forbidden("Only students can join via invite");
    const batchId = req.params.id;
    const token = (req.body?.token || req.query?.token) as string | undefined;
    if (!token) throw badRequest("Invite token is required");

    const invite = await prisma.batchInvite.findUnique({ where: { token } });
    if (!invite || invite.batchId !== batchId || invite.expiresAt < new Date()) {
      throw badRequest("Invite token is invalid or expired");
    }

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw notFound("Batch not found");

    await prisma.batchStudent.upsert({
      where: { batchId_studentId: { batchId, studentId: req.user.dbUserId } },
      update: {},
      create: { batchId, studentId: req.user.dbUserId }
    });

    res.json({ success: true, message: "Joined batch successfully" });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/summary", async (req, res, next) => {
  try {
    if (!req.user) throw badRequest("Missing authenticated user");
    if (req.user.role !== "institution") throw forbidden("Only institution can view batch summary");
    const batchId = req.params.id;
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw notFound("Batch not found");

    if (
      req.user.role === "institution" &&
      batch.institutionId !== (req.user.institutionId || req.user.dbUserId)
    ) {
      throw forbidden("You can only view summaries for your institution");
    }

    const sessionsCount = await prisma.session.count({ where: { batchId } });
    const studentsCount = await prisma.batchStudent.count({ where: { batchId } });
    const attendanceStats = await prisma.attendance.groupBy({
      by: ["status"],
      where: { session: { batchId } },
      _count: { _all: true }
    });

    res.json({
      success: true,
      data: {
        batchId,
        sessionsCount,
        studentsCount,
        attendanceStats
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

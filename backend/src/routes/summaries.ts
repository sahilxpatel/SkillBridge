import { Router } from "express";
import { prisma } from "../lib/prisma";
import { badRequest } from "../utils/http";

const router = Router();

router.get("/institutions", async (req, res, next) => {
  try {
    if (!req.user) throw badRequest("Missing authenticated user");
    if (req.user.role !== "programme_manager") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const institutions = await prisma.user.findMany({
      where: { role: "institution" },
      select: { id: true, name: true, institutionId: true }
    });

    const data = institutions.map((institution) => ({
      id: institution.id,
      name: institution.name,
      institutionId: institution.institutionId || institution.id
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/institutions/:id/summary", async (req, res, next) => {
  try {
    if (!req.user) throw badRequest("Missing authenticated user");
    if (req.user.role !== "programme_manager") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const institutionId = req.params.id;
    const batches = await prisma.batch.findMany({ where: { institutionId }, select: { id: true } });
    const batchIds = batches.map((b) => b.id);

    const sessionsCount = await prisma.session.count({ where: { batchId: { in: batchIds } } });
    const studentsCount = await prisma.batchStudent.count({ where: { batchId: { in: batchIds } } });
    const attendanceStats = await prisma.attendance.groupBy({
      by: ["status"],
      where: { session: { batchId: { in: batchIds } } },
      _count: { _all: true }
    });

    res.json({
      success: true,
      data: { institutionId, batchCount: batchIds.length, sessionsCount, studentsCount, attendanceStats }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/programme/summary", async (req, res, next) => {
  try {
    if (!req.user) throw badRequest("Missing authenticated user");
    if (!["programme_manager", "monitoring_officer"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const [institutions, batchCount, sessionsCount, studentsCount, attendanceStats] = await Promise.all([
      prisma.batch.findMany({ distinct: ["institutionId"], select: { institutionId: true } }),
      prisma.batch.count(),
      prisma.session.count(),
      prisma.user.count({ where: { role: "student" } }),
      prisma.attendance.groupBy({ by: ["status"], _count: { _all: true } })
    ]);

    res.json({
      success: true,
      data: {
        institutions: institutions.length,
        batchCount,
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

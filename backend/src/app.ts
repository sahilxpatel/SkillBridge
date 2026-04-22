import cors from "cors";
import express from "express";
import { authMiddleware } from "./middleware/authMiddleware";
import { errorMiddleware } from "./middleware/errorMiddleware";
import { roleMiddleware } from "./middleware/roleMiddleware";
import batchRoutes from "./routes/batches";
import sessionRoutes from "./routes/sessions";
import attendanceRoutes from "./routes/attendance";
import summaryRoutes from "./routes/summaries";
import institutionRoutes from "./routes/institution";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "SkillBridge API healthy" });
});

app.use("/api", authMiddleware);

app.use("/api/batches", roleMiddleware(["trainer", "institution", "student"]), batchRoutes);
app.use("/api/sessions", roleMiddleware(["trainer", "student"]), sessionRoutes);
app.use("/api/attendance", roleMiddleware(["student"]), attendanceRoutes);
app.use("/api/institution", roleMiddleware(["institution"]), institutionRoutes);
app.use("/api", roleMiddleware(["programme_manager", "monitoring_officer"]), summaryRoutes);

app.use(errorMiddleware);

export default app;

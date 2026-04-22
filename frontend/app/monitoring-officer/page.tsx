"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { useApiClient } from "@/hooks/useApiClient";

type AttendanceStat = { status: string; _count: { _all: number } };
type ProgrammeSummary = {
  institutions: number;
  batchCount: number;
  sessionsCount: number;
  studentsCount: number;
  attendanceStats: AttendanceStat[];
};

export default function MonitoringOfficerPage() {
  const api = useApiClient();
  const [summary, setSummary] = useState<ProgrammeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadProgrammeSummary = async () => {
    try {
      setLoading(true); setError("");
      const res = await api.get("/api/programme/summary");
      setSummary(res.data.data);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load programme data.");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadProgrammeSummary().catch(console.error); }, []);

  const getCount = (stats: AttendanceStat[], status: string) =>
    stats.find(s => s.status === status)?._count._all ?? 0;

  const total = summary
    ? getCount(summary.attendanceStats, "present") +
      getCount(summary.attendanceStats, "late") +
      getCount(summary.attendanceStats, "absent")
    : 0;

  return (
    <AuthGate expectedRole="monitoring_officer">
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Monitoring Officer</h1>
          <p>Read-only view of programme-wide attendance data.</p>
          {lastRefresh && (
            <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: 4 }}>
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399", padding: "4px 12px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700 }}>
            🔍 Read-Only
          </span>
          <button
            onClick={loadProgrammeSummary}
            disabled={loading}
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {loading ? (
              <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            ) : "↻"}
            Refresh
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {loading && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}
          </div>
          <div className="skeleton" style={{ height: 160 }} />
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "16px 20px", color: "#f87171" }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && summary && (
        <div className="fade-in">
          {/* KPI grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
            {[
              { label: "Institutions", value: summary.institutions, icon: "🏛️", color: "#06b6d4" },
              { label: "Batches", value: summary.batchCount, icon: "📦", color: "#6366f1" },
              { label: "Sessions", value: summary.sessionsCount, icon: "📅", color: "#8b5cf6" },
              { label: "Students", value: summary.studentsCount, icon: "🎓", color: "#f59e0b" },
            ].map(item => (
              <div key={item.label} className="stat-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: "1.3rem" }}>{item.icon}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>{item.label}</span>
                </div>
                <div style={{ fontSize: "2.2rem", fontWeight: 800, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Attendance breakdown */}
          <div className="glass-card" style={{ padding: 28 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 20 }}>
              📊 Programme-Wide Attendance Breakdown
            </div>

            {total > 0 ? (
              <>
                {/* Progress bar */}
                <div style={{ display: "flex", gap: 3, height: 14, borderRadius: 7, overflow: "hidden", marginBottom: 20 }}>
                  <div style={{ flex: getCount(summary.attendanceStats, "present"), background: "linear-gradient(90deg, #22c55e, #4ade80)", transition: "flex 0.5s" }} />
                  <div style={{ flex: getCount(summary.attendanceStats, "late"), background: "linear-gradient(90deg, #f59e0b, #fbbf24)", transition: "flex 0.5s" }} />
                  <div style={{ flex: getCount(summary.attendanceStats, "absent"), background: "linear-gradient(90deg, #ef4444, #f87171)", transition: "flex 0.5s" }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  {[
                    { label: "Present", status: "present", color: "#4ade80", bg: "rgba(74,222,128,0.08)", borderColor: "rgba(74,222,128,0.2)", icon: "✅" },
                    { label: "Late", status: "late", color: "#fbbf24", bg: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.2)", icon: "⏱" },
                    { label: "Absent", status: "absent", color: "#f87171", bg: "rgba(248,113,113,0.08)", borderColor: "rgba(248,113,113,0.2)", icon: "❌" },
                  ].map(item => {
                    const count = getCount(summary.attendanceStats, item.status);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.borderColor}`, borderRadius: 12, padding: "24px", textAlign: "center" }}>
                        <div style={{ fontSize: "2rem", marginBottom: 6 }}>{item.icon}</div>
                        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: item.color, lineHeight: 1 }}>{count}</div>
                        <div style={{ fontSize: "0.8rem", color: item.color, marginTop: 6, opacity: 0.8 }}>{pct}%</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 20, textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Total records tracked: <strong style={{ color: "var(--text-primary)" }}>{total}</strong>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No attendance records yet</div>
                <div style={{ fontSize: "0.85rem" }}>Data will appear here once trainers start marking attendance.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </AuthGate>
  );
}

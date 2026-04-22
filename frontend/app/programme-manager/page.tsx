"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { useApiClient } from "@/hooks/useApiClient";

type Institution = { id: string; name: string; institutionId: string };
type AttendanceStat = { status: string; _count: { _all: number } };
type ProgrammeSummary = {
  institutions: number;
  batchCount: number;
  sessionsCount: number;
  studentsCount: number;
  attendanceStats: AttendanceStat[];
};

export default function ProgrammeManagerPage() {
  const api = useApiClient();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [drilldown, setDrilldown] = useState<any>(null);
  const [programmeSummary, setProgrammeSummary] = useState<ProgrammeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInstitutions = async () => {
    const res = await api.get("/api/institutions");
    const data = (res.data.data || []) as Institution[];
    setInstitutions(data);
    if (!selectedInstitutionId && data.length > 0) setSelectedInstitutionId(data[0].institutionId);
  };

  const loadProgrammeSummary = async () => {
    try {
      setLoading(true); setError("");
      const res = await api.get("/api/programme/summary");
      setProgrammeSummary(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load programme summary.");
    } finally { setLoading(false); }
  };

  const loadDrilldown = async () => {
    if (!selectedInstitutionId) return;
    const res = await api.get(`/api/institutions/${selectedInstitutionId}/summary`);
    setDrilldown(res.data.data);
  };

  useEffect(() => {
    loadInstitutions().catch(console.error);
    loadProgrammeSummary().catch(console.error);
  }, []);

  const getCount = (stats: AttendanceStat[], status: string) =>
    stats.find(s => s.status === status)?._count._all ?? 0;

  const total = programmeSummary
    ? getCount(programmeSummary.attendanceStats, "present") +
      getCount(programmeSummary.attendanceStats, "late") +
      getCount(programmeSummary.attendanceStats, "absent")
    : 0;

  return (
    <AuthGate expectedRole="programme_manager">
      <div className="page-header">
        <h1>Programme Manager</h1>
        <p>Programme-wide overview across all institutions and batches.</p>
      </div>

      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "16px 20px", color: "#f87171", marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && programmeSummary && (
        <div className="fade-in">
          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
            {[
              { label: "Institutions", value: programmeSummary.institutions, icon: "🏛️", color: "#06b6d4" },
              { label: "Batches", value: programmeSummary.batchCount, icon: "📦", color: "#6366f1" },
              { label: "Sessions", value: programmeSummary.sessionsCount, icon: "📅", color: "#8b5cf6" },
              { label: "Students", value: programmeSummary.studentsCount, icon: "🎓", color: "#f59e0b" },
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
          <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 20 }}>📊 Programme-Wide Attendance</div>
            {total > 0 && (
              <>
                {/* Visual bar */}
                <div style={{ display: "flex", gap: 3, height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ flex: getCount(programmeSummary.attendanceStats, "present"), background: "#4ade80" }} />
                  <div style={{ flex: getCount(programmeSummary.attendanceStats, "late"), background: "#fbbf24" }} />
                  <div style={{ flex: getCount(programmeSummary.attendanceStats, "absent"), background: "#f87171" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Present", status: "present", color: "#4ade80", bg: "rgba(74,222,128,0.1)", icon: "✅" },
                    { label: "Late", status: "late", color: "#fbbf24", bg: "rgba(251,191,36,0.1)", icon: "⏱" },
                    { label: "Absent", status: "absent", color: "#f87171", bg: "rgba(248,113,113,0.1)", icon: "❌" },
                  ].map(item => {
                    const count = getCount(programmeSummary.attendanceStats, item.status);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.color}22`, borderRadius: 10, padding: "16px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{item.icon}</div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: item.color }}>{count}</div>
                        <div style={{ fontSize: "0.75rem", color: item.color, marginTop: 2 }}>{pct}% · {item.label}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {total === 0 && (
              <div className="empty-state" style={{ padding: "24px 0" }}>
                <div style={{ fontSize: "0.85rem" }}>No attendance records yet.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drill-down */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 16 }}>🏛️ Institution Drill-Down</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <select className="form-input" style={{ maxWidth: 280 }} value={selectedInstitutionId} onChange={e => setSelectedInstitutionId(e.target.value)}>
            <option value="">Select institution</option>
            {institutions.map(i => <option key={i.id} value={i.institutionId}>{i.name}</option>)}
          </select>
          <button onClick={loadDrilldown} className="btn-primary">Get Summary</button>
        </div>
        {drilldown && (
          <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
            {[
              { label: "Sessions", value: drilldown.sessionsCount ?? "—", icon: "📅", color: "#6366f1" },
              { label: "Students", value: drilldown.studentsCount ?? "—", icon: "🎓", color: "#8b5cf6" },
              { label: "Present", value: drilldown.attendanceStats?.find((s: any) => s.status === "present")?._count._all ?? "—", icon: "✅", color: "#4ade80" },
              { label: "Late", value: drilldown.attendanceStats?.find((s: any) => s.status === "late")?._count._all ?? "—", icon: "⏱", color: "#fbbf24" },
              { label: "Absent", value: drilldown.attendanceStats?.find((s: any) => s.status === "absent")?._count._all ?? "—", icon: "❌", color: "#f87171" },
            ].map(item => (
              <div key={item.label} className="stat-card">
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>{item.icon} {item.label}</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGate>
  );
}

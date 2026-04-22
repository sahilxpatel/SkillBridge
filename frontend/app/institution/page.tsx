"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { useApiClient } from "@/hooks/useApiClient";

type Batch = { id: string; name: string };
type Trainer = { id: string; name: string };

export default function InstitutionPage() {
  const api = useApiClient();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const loadBatches = async () => {
    const res = await api.get("/api/batches");
    const data = (res.data.data || []) as Batch[];
    setBatches(data);
    if (!selectedBatchId && data.length > 0) setSelectedBatchId(data[0].id);
  };

  const loadSummary = async () => {
    if (!selectedBatchId) return;
    setSummaryLoading(true);
    const res = await api.get(`/api/batches/${selectedBatchId}/summary`);
    setSummary(res.data.data);
    setSummaryLoading(false);
  };

  const loadTrainers = async () => {
    const res = await api.get("/api/institution/trainers");
    setTrainers(res.data.data || []);
  };

  useEffect(() => {
    loadBatches().catch(console.error);
    loadTrainers().catch(console.error);
  }, []);

  return (
    <AuthGate expectedRole="institution">
      <div className="page-header">
        <h1>Institution Dashboard</h1>
        <p>Manage your trainers and review batch performance.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Trainers */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>👨‍🏫 Assigned Trainers</span>
            <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "var(--text-muted)" }}>{trainers.length} trainers</span>
          </div>
          {trainers.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>👤</div>
              <div style={{ fontSize: "0.85rem" }}>No trainers assigned yet.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {trainers.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8rem", color: "white", flexShrink: 0 }}>
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--text-primary)" }}>{t.name}</span>
                  <span className="badge badge-role" style={{ marginLeft: "auto" }}>Trainer</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Batches */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>📦 Batches</span>
            <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "var(--text-muted)" }}>{batches.length} total</span>
          </div>
          {batches.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: "0.85rem" }}>No batches found.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {batches.map(b => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "1.1rem" }}>📦</span>
                  <span style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--text-primary)" }}>{b.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Batch Summary */}
      <div className="glass-card" style={{ padding: 24, marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 16 }}>📊 Batch Attendance Summary</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <select className="form-input" value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} style={{ maxWidth: 300 }}>
            <option value="">Select a batch</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={loadSummary} className="btn-primary" disabled={summaryLoading}>
            {summaryLoading ? "Loading…" : "Get Summary"}
          </button>
        </div>
        {summary && (
          <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            {[
              { label: "Sessions", value: summary.sessionsCount ?? summary.sessions ?? "—", icon: "📅", color: "#6366f1" },
              { label: "Students", value: summary.studentsCount ?? summary.students ?? "—", icon: "🎓", color: "#8b5cf6" },
              { label: "Present", value: summary.attendanceStats?.find((s: any) => s.status === "present")?._count._all ?? "—", icon: "✅", color: "#4ade80" },
              { label: "Late", value: summary.attendanceStats?.find((s: any) => s.status === "late")?._count._all ?? "—", icon: "⏱", color: "#fbbf24" },
              { label: "Absent", value: summary.attendanceStats?.find((s: any) => s.status === "absent")?._count._all ?? "—", icon: "❌", color: "#f87171" },
            ].map(item => (
              <div key={item.label} className="stat-card">
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 8 }}>{item.icon} {item.label}</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGate>
  );
}

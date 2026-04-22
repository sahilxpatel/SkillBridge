"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { useApiClient } from "@/hooks/useApiClient";
import { useUser } from "@clerk/nextjs";

type Session = { id: string; title: string; date: string; startTime: string; endTime: string };

export default function StudentPage() {
  const api = useApiClient();
  const { user } = useUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState<string | null>(null);
  const [markedMap, setMarkedMap] = useState<Record<string, string>>({});

  const loadSessions = async () => {
    try {
      setLoading(true); setError("");
      const res = await api.get("/api/sessions/student/mine");
      setSessions(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load sessions.");
    } finally { setLoading(false); }
  };

  const markAttendance = async (sessionId: string, status: "present" | "absent" | "late") => {
    setMarking(sessionId);
    try {
      await api.post("/api/attendance/mark", { sessionId, status });
      setMarkedMap(prev => ({ ...prev, [sessionId]: status }));
    } finally { setMarking(null); }
  };

  useEffect(() => { loadSessions().catch(console.error); }, []);

  const name = user?.firstName || "Student";
  const presentCount = Object.values(markedMap).filter(s => s === "present").length;
  const total = sessions.length;
  const rate = total > 0 ? Math.round(((presentCount + (total - Object.keys(markedMap).length)) / total) * 100) : 0;

  return (
    <AuthGate expectedRole="student">
      {/* Page header */}
      <div className="page-header">
        <h1>Welcome back, {name} 👋</h1>
        <p>Here are your upcoming sessions. Mark your attendance below.</p>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Sessions", value: total, color: "#6366f1", icon: "📅" },
          { label: "Marked Present", value: presentCount, color: "#4ade80", icon: "✅" },
          { label: "Attendance Rate", value: `${rate}%`, color: "#fbbf24", icon: "📈" },
        ].map(item => (
          <div key={item.label} className="stat-card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: "1.3rem" }}>{item.icon}</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Sessions */}
      <div className="section-title">Your Sessions</div>

      {loading && (
        <div style={{ display: "grid", gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "16px 20px", color: "#f87171" }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="glass-card empty-state">
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>No sessions yet</div>
          <div style={{ fontSize: "0.85rem" }}>You haven't been enrolled in any batches yet. Ask your trainer for an invite link.</div>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <div style={{ display: "grid", gap: 12 }} className="fade-in">
          {sessions.map((s) => {
            const marked = markedMap[s.id];
            return (
              <div key={s.id} className="glass-card" style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)", marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {new Date(s.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {s.startTime && ` · ${new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(s.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {marked ? (
                    <span className={`badge badge-${marked}`}>
                      {marked === "present" ? "✓ Present" : marked === "late" ? "⏱ Late" : "✗ Absent"}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => markAttendance(s.id, "present")}
                        disabled={marking === s.id}
                        style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)", padding: "7px 14px", borderRadius: 7, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(74,222,128,0.25)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(74,222,128,0.15)")}
                      >
                        ✓ Present
                      </button>
                      <button
                        onClick={() => markAttendance(s.id, "late")}
                        disabled={marking === s.id}
                        style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", padding: "7px 14px", borderRadius: 7, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(251,191,36,0.25)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(251,191,36,0.15)")}
                      >
                        ⏱ Late
                      </button>
                      <button
                        onClick={() => markAttendance(s.id, "absent")}
                        disabled={marking === s.id}
                        style={{ background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)", padding: "7px 14px", borderRadius: 7, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.25)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(248,113,113,0.15)")}
                      >
                        ✗ Absent
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AuthGate>
  );
}

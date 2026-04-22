"use client";

import { FormEvent, useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { useApiClient } from "@/hooks/useApiClient";

type Batch = { id: string; name: string };
type Session = { id: string; title: string; date: string };

export default function TrainerPage() {
  const api = useApiClient();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [newBatchName, setNewBatchName] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [attendance, setAttendance] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  const loadBatches = async () => {
    const res = await api.get("/api/batches");
    const data = (res.data.data || []) as Batch[];
    setBatches(data);
    if (!selectedBatchId && data.length > 0) setSelectedBatchId(data[0].id);
  };

  const loadSessions = async () => {
    const res = await api.get("/api/sessions/trainer/mine");
    const data = (res.data.data || []) as Session[];
    setSessions(data);
    if (!selectedSessionId && data.length > 0) setSelectedSessionId(data[0].id);
  };

  useEffect(() => {
    loadBatches().catch(console.error);
    loadSessions().catch(console.error);
  }, []);

  const createBatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBatchName) return;
    setBatchLoading(true);
    await api.post("/api/batches", { name: newBatchName });
    setNewBatchName("");
    await loadBatches();
    setBatchLoading(false);
  };

  const createSession = async (e: FormEvent) => {
    e.preventDefault();
    setSessionError("");
    if (!selectedBatchId || !title || !date || !startTime || !endTime) {
      setSessionError("Please fill in all fields."); return;
    }
    if (startTime >= endTime) { setSessionError("End time must be after start time."); return; }
    setSessionLoading(true);
    await api.post("/api/sessions", {
      batchId: selectedBatchId, title,
      date: new Date(date).toISOString(),
      startTime: new Date(`${date}T${startTime}`).toISOString(),
      endTime: new Date(`${date}T${endTime}`).toISOString(),
    });
    setTitle(""); setDate(""); setStartTime(""); setEndTime("");
    await loadSessions();
    setSessionLoading(false);
  };

  const generateInvite = async () => {
    if (!selectedBatchId) return;
    const res = await api.post(`/api/batches/${selectedBatchId}/invite`);
    setInviteLink(res.data.data.joinUrl);
    setCopied(false);
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadAttendance = async () => {
    if (!selectedSessionId) return;
    const res = await api.get(`/api/sessions/${selectedSessionId}/attendance`);
    setAttendance(res.data.data || []);
  };

  return (
    <AuthGate expectedRole="trainer">
      <div className="page-header">
        <h1>Trainer Dashboard</h1>
        <p>Manage your batches, sessions and track student attendance.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Create Batch */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📦</span> Create Batch
            </div>
            <form onSubmit={createBatch} style={{ display: "flex", gap: 10 }}>
              <input
                className="form-input"
                placeholder="e.g. Fall 2026 Full Stack"
                value={newBatchName}
                onChange={e => setNewBatchName(e.target.value)}
              />
              <button type="submit" className="btn-primary" style={{ whiteSpace: "nowrap" }} disabled={batchLoading}>
                {batchLoading ? "…" : "+ Create"}
              </button>
            </form>
          </div>

          {/* Create Session */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📅</span> Create Session
            </div>
            <form onSubmit={createSession} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="form-label">Batch</label>
                <select className="form-input" value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)}>
                  <option value="">Select a batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Session Title</label>
                <input className="form-input" placeholder="e.g. Intro to React Hooks" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="form-label">Start Time</label>
                  <input className="form-input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">End Time</label>
                  <input className="form-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              {sessionError && <div style={{ color: "#f87171", fontSize: "0.8rem" }}>⚠ {sessionError}</div>}
              <button type="submit" className="btn-primary" disabled={sessionLoading}>
                {sessionLoading ? "Creating…" : "📅 Create Session"}
              </button>
            </form>
          </div>

          {/* Invite Link */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🔗</span> Student Invite Link
            </div>
            <div>
              <label className="form-label">Select Batch</label>
              <select className="form-input" style={{ marginBottom: 12 }} value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)}>
                <option value="">Select a batch</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <button onClick={generateInvite} className="btn-secondary" style={{ marginBottom: 12 }}>
              Generate Link
            </button>
            {inviteLink && (
              <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <code style={{ flex: 1, fontSize: "0.72rem", color: "#a5b4fc", wordBreak: "break-all" }}>{inviteLink}</code>
                <button onClick={copyLink} className="btn-primary" style={{ padding: "5px 12px", fontSize: "0.75rem", flexShrink: 0 }}>
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Batches list */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>📦 My Batches</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "var(--text-muted)" }}>{batches.length} total</span>
            </div>
            {batches.length === 0 ? (
              <div className="empty-state" style={{ padding: "24px 0" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: "0.85rem" }}>No batches yet. Create one to get started.</div>
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

          {/* Attendance viewer */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>✅</span> Session Attendance
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Select Session</label>
              <select className="form-input" value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}>
                <option value="">Select a session</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>{s.title} — {new Date(s.date).toLocaleDateString()}</option>
                ))}
              </select>
            </div>
            <button onClick={loadAttendance} className="btn-secondary" style={{ marginBottom: 16 }}>
              Load Attendance
            </button>
            {attendance.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>
                No attendance records loaded yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {attendance.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 7 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{item.student?.name || "Unknown"}</span>
                    <span className={`badge badge-${item.status}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

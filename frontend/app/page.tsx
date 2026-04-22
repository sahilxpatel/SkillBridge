"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { Role, roleToPath } from "@/lib/roles";

const FEATURES = [
  { icon: "🎓", role: "Student", desc: "View sessions, mark attendance, track your record" },
  { icon: "🏋️", role: "Trainer", desc: "Create batches, schedule sessions, manage attendance" },
  { icon: "🏛️", role: "Institution", desc: "Oversee trainers, batches, and student rosters" },
  { icon: "📊", role: "Programme Manager", desc: "Monitor KPIs, compare institutions, view trends" },
  { icon: "🔍", role: "Monitoring Officer", desc: "Read-only programme-wide attendance overview" },
];

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !user) return;
    const role = user.publicMetadata.role as Role | undefined;
    if (role && roleToPath[role]) { router.replace(roleToPath[role]); return; }
    router.replace("/choose-role");
  }, [isLoaded, router, user]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Ambient background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.25) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 40px",
        background: "rgba(13,15,24,0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, color: "white", fontSize: "1rem",
          }}>S</div>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#f1f5f9" }}>SkillBridge</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn-secondary" style={{ padding: "8px 20px" }}>Sign In</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="btn-primary" style={{ padding: "8px 20px" }}>Get Started</button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: "36px" }}>Redirecting…</p>
          </SignedIn>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        flex: 1, position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "80px 24px 60px",
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: 20, padding: "6px 16px",
          fontSize: "0.75rem", fontWeight: 600, color: "#a5b4fc",
          marginBottom: 24,
        }}>
          ✦ Role-Based Attendance Management
        </div>

        <h1 style={{
          fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
          fontWeight: 800, lineHeight: 1.1,
          background: "linear-gradient(135deg, #f1f5f9 0%, #a5b4fc 60%, #c084fc 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 20, maxWidth: 720,
        }}>
          Attendance Tracking<br />Built for Every Role
        </h1>

        <p style={{
          fontSize: "1.1rem", color: "#94a3b8", maxWidth: 560, lineHeight: 1.7,
          marginBottom: 40,
        }}>
          A unified platform where Students, Trainers, Institutions, Programme Managers,
          and Monitoring Officers each get a purpose-built dashboard.
        </p>

        <SignedOut>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <SignInButton mode="modal">
              <button className="btn-primary" style={{ padding: "12px 32px", fontSize: "1rem" }}>
                Sign In to Dashboard →
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="btn-secondary" style={{ padding: "12px 32px", fontSize: "1rem" }}>
                Create Account
              </button>
            </SignUpButton>
          </div>
        </SignedOut>

        {/* Role cards grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16, maxWidth: 900, width: "100%", marginTop: 60,
        }}>
          {FEATURES.map((f) => (
            <div key={f.role} className="glass-card" style={{
              padding: "20px", textAlign: "left",
              transition: "transform 0.2s, border-color 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; }}
            >
              <div style={{ fontSize: "1.8rem", marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#f1f5f9", marginBottom: 6 }}>{f.role}</div>
              <div style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Test accounts hint */}
        <div className="glass-card" style={{ marginTop: 48, padding: "16px 24px", maxWidth: 520, width: "100%" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            🧪 Demo Accounts
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px", fontSize: "0.75rem", color: "#64748b" }}>
            {[
              ["student@skillbridge-app.dev", "Student"],
              ["trainer@skillbridge-app.dev", "Trainer"],
              ["institution@skillbridge-app.dev", "Institution"],
              ["manager@skillbridge-app.dev", "Prog. Manager"],
              ["officer@skillbridge-app.dev", "Mon. Officer"],
            ].map(([email, role]) => (
              <div key={email} style={{ padding: "4px 0" }}>
                <span style={{ color: "#94a3b8", fontWeight: 600 }}>{role}</span><br />
                <span style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>{email}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: "0.7rem", color: "#475569" }}>
            Password: <code style={{ color: "#a5b4fc" }}>SkillBr1dge#Dev2026!</code>
          </div>
        </div>
      </section>
    </div>
  );
}

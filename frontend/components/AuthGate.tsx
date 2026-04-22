"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Role, roleToPath } from "@/lib/roles";

type Props = {
  expectedRole: Role;
  children: ReactNode;
  returnTo?: string;
};

const ROLE_META: Record<Role, { label: string; icon: string; color: string }> = {
  student: { label: "Student", icon: "🎓", color: "#6366f1" },
  trainer: { label: "Trainer", icon: "🏋️", color: "#8b5cf6" },
  institution: { label: "Institution", icon: "🏛️", color: "#06b6d4" },
  programme_manager: { label: "Programme Manager", icon: "📊", color: "#f59e0b" },
  monitoring_officer: { label: "Monitoring Officer", icon: "🔍", color: "#10b981" },
};

const ROLE_NAV: Record<Role, { label: string; icon: string }[]> = {
  student: [
    { label: "My Sessions", icon: "📅" },
  ],
  trainer: [
    { label: "Batches", icon: "📦" },
    { label: "Sessions", icon: "📅" },
    { label: "Attendance", icon: "✅" },
    { label: "Invite Link", icon: "🔗" },
  ],
  institution: [
    { label: "Overview", icon: "🏠" },
    { label: "Trainers", icon: "👨‍🏫" },
    { label: "Batches", icon: "📦" },
  ],
  programme_manager: [
    { label: "Overview", icon: "📊" },
    { label: "Institutions", icon: "🏛️" },
  ],
  monitoring_officer: [
    { label: "Dashboard", icon: "🔍" },
  ],
};

export default function AuthGate({ expectedRole, children, returnTo }: Props) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !user) return;
    const role = user.publicMetadata.role as Role | undefined;
    if (!role) {
      router.replace(returnTo ? `/choose-role?returnTo=${encodeURIComponent(returnTo)}` : "/choose-role");
      return;
    }
    if (role !== expectedRole) {
      router.replace(roleToPath[role]);
    }
  }, [expectedRole, isLoaded, returnTo, router, user]);

  const roleMeta = ROLE_META[expectedRole];
  const navItems = ROLE_NAV[expectedRole];
  const userName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";

  return (
    <>
      <SignedOut>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-card" style={{ padding: "40px", textAlign: "center", maxWidth: 380, width: "100%" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔒</div>
            <h2 style={{ fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>Access Restricted</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: 24 }}>
              Please sign in to access your dashboard.
            </p>
            <SignInButton mode="modal">
              <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Logo */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem", fontWeight: 800, color: "white", flexShrink: 0,
              }}>S</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.2 }}>SkillBridge</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Attendance</div>
              </div>
            </div>
            <div className="accent-bar" style={{ marginBottom: 16 }} />

            {/* User info */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <UserButton appearance={{ elements: { avatarBox: { width: 32, height: 32 } } }} />
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {userName}
                </div>
                <span className="badge badge-role" style={{ marginTop: 2 }}>
                  {roleMeta.icon} {roleMeta.label}
                </span>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1 }}>
            <div className="section-title">Navigation</div>
            {navItems.map((item) => (
              <div key={item.label} className="nav-link">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: "auto" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center" }}>
              SkillBridge v1.0 · Dev Mode
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="main-content fade-in">
          {children}
        </main>
      </SignedIn>
    </>
  );
}

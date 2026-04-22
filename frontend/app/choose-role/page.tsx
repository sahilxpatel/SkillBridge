"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { Role, roleToPath } from "@/lib/roles";

const roles: { label: string; value: Role }[] = [
  { label: "Student", value: "student" },
  { label: "Trainer", value: "trainer" },
  { label: "Institution", value: "institution" },
  { label: "Programme Manager", value: "programme_manager" },
  { label: "Monitoring Officer", value: "monitoring_officer" }
];

export default function ChooseRolePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);
  const [error, setError] = useState("");

  const setRole = async (role: Role) => {
    try {
      setError("");
      setLoadingRole(role);
      const res = await fetch("/api/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });

      if (!res.ok) {
        throw new Error("Failed to set role");
      }

      await user?.reload();
      const returnTo = searchParams.get("returnTo");
      if (returnTo && returnTo.startsWith("/")) {
        router.replace(returnTo);
      } else {
        router.replace(roleToPath[role]);
      }
    } catch {
      setError("Could not update role. Please try again.");
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded shadow p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-3">Choose Your Role</h1>
        <p className="text-sm text-slate-600 mb-6">
          Select your role to continue to your dashboard.
        </p>

        <SignedOut>
          <SignInButton mode="modal">
            <button className="px-4 py-2 rounded bg-slate-900 text-white">Sign In</button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <div className="grid gap-2">
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => setRole(role.value)}
                disabled={loadingRole !== null}
                className="px-4 py-2 rounded border border-slate-300 text-left hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingRole === role.value ? "Saving..." : role.label}
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </SignedIn>
      </div>
    </main>
  );
}

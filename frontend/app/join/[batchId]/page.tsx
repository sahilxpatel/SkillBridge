"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import AuthGate from "@/components/AuthGate";
import { useApiClient } from "@/hooks/useApiClient";
import { Role } from "@/lib/roles";

export default function JoinBatchPage() {
  const api = useApiClient();
  const { user, isLoaded } = useUser();
  const params = useParams<{ batchId: string }>();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Joining batch...");
  const hasJoinedRef = useRef(false);
  const token = searchParams.get("token");
  const returnTo = `/join/${params.batchId}${token ? `?token=${token}` : ""}`;

  useEffect(() => {
    const join = async () => {
      if (!isLoaded || !user) return;
      const role = user.publicMetadata.role as Role | undefined;
      if (role !== "student") return;
      if (hasJoinedRef.current) return;
      if (!token) {
        setMessage("Missing invite token");
        return;
      }

      hasJoinedRef.current = true;
      await api.post(`/api/batches/${params.batchId}/join`, { token });
      setMessage("Joined batch successfully");
    };
    join().catch((e) => setMessage(e?.response?.data?.message || "Failed to join batch"));
  }, [api, isLoaded, params.batchId, searchParams, token, user]);

  return (
    <AuthGate expectedRole="student" returnTo={returnTo}>
      <div className="bg-white p-6 rounded shadow">
        <p>{message}</p>
      </div>
    </AuthGate>
  );
}

"use client";

import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";

export const useApiClient = () => {
  const { getToken } = useAuth();

  const authHeaders = async () => {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  };

  return {
    get: async (url: string) => api.get(url, { headers: await authHeaders() }),
    post: async (url: string, data?: unknown) =>
      api.post(url, data, { headers: await authHeaders() })
  };
};

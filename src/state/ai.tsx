"use client";

import { useCallback, useEffect, useState } from "react";
import type { Tags } from "@/lib/tagging";
import { useAuth } from "./auth";

export interface AIStatus {
  configured: boolean;
  /** Tags allowed this month; null means no per-person limit. */
  limit: number | null;
  used: number;
}

const OFF: AIStatus = { configured: false, limit: null, used: 0 };

/** AI tagging for the signed-in person: whether it's on and what's left this month. */
export function useAI() {
  const { user } = useAuth();
  const [status, setStatus] = useState<AIStatus>(OFF);

  const refresh = useCallback(async () => {
    if (!user) return setStatus(OFF);
    try {
      const res = await fetch("/api/tag", { cache: "no-store" });
      setStatus(res.ok ? { ...OFF, ...((await res.json()) as Partial<AIStatus>) } : OFF);
    } catch {
      setStatus(OFF);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const left = status.limit === null ? null : Math.max(0, status.limit - status.used);
  const canTag = status.configured && (left === null || left > 0);

  const requestTags = useCallback(
    async (image: string): Promise<{ tags: Tags; costUsd: number } | { error: string }> => {
      if (!user) return { error: "Sign in to use AI tagging." };
      try {
        const res = await fetch("/api/tag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image }),
        });
        const json = (await res.json()) as { tags?: Tags; costUsd?: number; error?: string };
        if (!res.ok || !json.tags) return { error: json.error ?? "Tagging failed." };
        return { tags: json.tags, costUsd: json.costUsd ?? 0 };
      } catch {
        return { error: "Couldn’t reach the server." };
      }
    },
    [user],
  );

  return { status, left, canTag, refresh, requestTags };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { Tags } from "@/lib/tagging";

export interface OwnerStatus {
  available: boolean;
  owner: boolean;
  ai: { configured: boolean; capUsd: number | null; spentUsd: number | null };
}

const OFFLINE: OwnerStatus = { available: false, owner: false, ai: { configured: false, capUsd: null, spentUsd: null } };

/** Owner session and AI budget status from the server. Absent server routes read as "not available". */
export function useOwner() {
  const [status, setStatus] = useState<OwnerStatus>(OFFLINE);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/owner", { cache: "no-store" });
      setStatus(res.ok ? ((await res.json()) as OwnerStatus) : OFFLINE);
    } catch {
      setStatus(OFFLINE);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unlock = useCallback(async (passphrase: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      const json = (await res.json()) as OwnerStatus & { error?: string };
      if (!res.ok) return json.error ?? "Couldn’t unlock.";
      setStatus(json);
      return null;
    } catch {
      return "Couldn’t reach the server.";
    }
  }, []);

  const lock = useCallback(async () => {
    await fetch("/api/owner", { method: "DELETE" }).catch(() => undefined);
    await refresh();
  }, [refresh]);

  return { status, loaded, refresh, unlock, lock, canTag: status.owner && status.ai.configured };
}

export async function requestTags(image: string): Promise<{ tags: Tags; costUsd: number } | { error: string }> {
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
}

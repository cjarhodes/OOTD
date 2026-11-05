"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Tags } from "@/lib/tagging";

export interface OwnerStatus {
  available: boolean;
  owner: boolean;
  ai: { configured: boolean; capUsd: number | null; spentUsd: number | null };
  cloud: { configured: boolean };
}

const OFFLINE: OwnerStatus = {
  available: false,
  owner: false,
  ai: { configured: false, capUsd: null, spentUsd: null },
  cloud: { configured: false },
};

type OwnerContext = ReturnType<typeof useOwnerState>;
const Ctx = createContext<OwnerContext | null>(null);

/** One owner session for the whole app, so unlocking in Settings starts cloud backup everywhere. */
export function OwnerProvider({ children }: { children: ReactNode }) {
  const value = useOwnerState();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOwner(): OwnerContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOwner must be used inside OwnerProvider");
  return ctx;
}

/** Owner session, AI budget and cloud status from the server. Absent server routes read as "not available". */
function useOwnerState() {
  const [status, setStatus] = useState<OwnerStatus>(OFFLINE);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/owner", { cache: "no-store" });
      setStatus(res.ok ? { ...OFFLINE, ...((await res.json()) as Partial<OwnerStatus>) } : OFFLINE);
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
      setStatus({ ...OFFLINE, ...json });
      return null;
    } catch {
      return "Couldn’t reach the server.";
    }
  }, []);

  const lock = useCallback(async () => {
    await fetch("/api/owner", { method: "DELETE" }).catch(() => undefined);
    await refresh();
  }, [refresh]);

  return useMemo(
    () => ({ status, loaded, refresh, unlock, lock, canTag: status.owner && status.ai.configured }),
    [status, loaded, refresh, unlock, lock],
  );
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

"use client";

import { useState } from "react";
import { deleteAccountCopy } from "@/lib/db";
import { useAuth } from "@/state/auth";
import { useWardrobe } from "@/state/wardrobe";

/**
 * Delete the account and everything in it, from the server and this device.
 * Asks for the email address as confirmation and offers a copy first.
 */
export function DeleteAccount({ onExport }: { onExport: () => void }) {
  const auth = useAuth();
  const { setMode, personalCount } = useWardrobe();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const user = auth.user;

  if (state === "done") {
    return (
      <p className="setting-note" role="status">
        Your account and everything in it are deleted, here and on our side. You’re back on the sample wardrobe.
      </p>
    );
  }
  if (!user) return null;

  const matches = typed.trim().toLowerCase() === (user.email ?? "").toLowerCase();

  async function remove() {
    if (!user || !matches) return;
    setState("working");
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: typed.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "That didn’t work. Nothing was deleted.");
      // The server copy is gone; now this device's copy, then sign out here.
      setMode("sample");
      await auth.signOut();
      await deleteAccountCopy(user.id).catch(() => undefined);
      setState("done");
    } catch (e) {
      setState("idle");
      setError((e as Error).message);
    }
  }

  if (!open) {
    return (
      <button type="button" className="text-link danger-link" onClick={() => setOpen(true)}>
        Delete my account and data
      </button>
    );
  }

  return (
    <div className="delete-account" role="group" aria-labelledby="delete-title">
      <p id="delete-title" className="setting-note">
        <strong>Delete your account?</strong> This removes your wardrobe{personalCount ? ` (${personalCount} pieces)` : ""}, every photo, your
        history and your sign-in, from our side and from this device. It can’t be undone. Signing in again with the same email starts an empty
        account.
      </p>
      {personalCount > 0 && (
        <button type="button" className="text-link" onClick={onExport}>
          Download a copy first
        </button>
      )}
      <label className="field" htmlFor="delete-confirm">
        <span className="label">Type {user.email} to confirm</span>
        <input
          id="delete-confirm"
          className="input"
          type="email"
          autoComplete="off"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={state === "working"}
        />
      </label>
      {error && (
        <p className="banner" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="button" className="btn danger" disabled={!matches || state === "working"} onClick={() => void remove()}>
          {state === "working" ? "Deleting…" : "Delete everything"}
        </button>
        <button
          type="button"
          className="btn quiet"
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError(null);
          }}
          disabled={state === "working"}
        >
          Keep my account
        </button>
      </div>
    </div>
  );
}

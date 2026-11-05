"use client";

import { useState } from "react";
import { useAuth } from "@/state/auth";

/** Email a sign-in link. New addresses get an account automatically. */
export function SignIn({ title = "Sign in to keep your wardrobe", compact = false }: { title?: string; compact?: boolean }) {
  const { configured, sendLink } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!configured) {
    return <p className="setting-note">Accounts aren’t set up on this copy of OOTD, so only the sample wardrobe is available.</p>;
  }

  if (sentTo) {
    return (
      <div className="signin" role="status">
        {!compact && <h2 className="setting-title">Check your email</h2>}
        <p>
          We sent a sign-in link to <strong>{sentTo}</strong>. Open it on this device and you’ll be signed in here.
        </p>
        <p className="setting-note">
          On iPhone, the link opens in Safari. If you use OOTD from your Home Screen, request the link from Safari instead, then add OOTD to your Home
          Screen again once you’re signed in.
        </p>
        <button type="button" className="text-link" onClick={() => setSentTo(null)}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form
      className="signin"
      onSubmit={async (e) => {
        e.preventDefault();
        setSending(true);
        setError(null);
        const err = await sendLink(email);
        setSending(false);
        if (err) setError(err);
        else setSentTo(email.trim());
      }}
    >
      {!compact && <h2 className="setting-title">{title}</h2>}
      <p className="setting-note">
        Your pieces, photos and history are saved to your account, so they’re on every device you sign in on. No password: we email you a link.
      </p>
      <div className="setting-row">
        <input
          id="signin-email"
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          required
        />
        <button type="submit" className="btn" disabled={sending || email.trim().length < 5}>
          {sending ? "Sending…" : "Email me a link"}
        </button>
      </div>
      {error && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

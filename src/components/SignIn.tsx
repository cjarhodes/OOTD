"use client";

import { useState } from "react";
import { useAuth } from "@/state/auth";
import { useWardrobe } from "@/state/wardrobe";

/** Email a sign-in link and code. New addresses get an account automatically. */
export function SignIn({ title = "Sign in to keep your wardrobe", compact = false }: { title?: string; compact?: boolean }) {
  const { configured, ready, sendLink, verifyCode } = useAuth();
  const { setMode } = useWardrobe();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (ready && !configured) {
    return <p className="setting-note">Accounts aren’t set up on this copy of OOTD, so only the sample wardrobe is available.</p>;
  }

  if (sentTo) {
    return (
      <form
        className="signin"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const err = await verifyCode(sentTo, code);
          setBusy(false);
          if (err) setError(err);
          // Signed in: show your own wardrobe from here on.
          else setMode("personal");
        }}
      >
        {!compact && <h2 className="setting-title">Check your email</h2>}
        <p>
          We sent a sign-in link and a 6-digit code to <strong>{sentTo}</strong>. Tap the link, or enter the code here.
        </p>
        <div className="setting-row">
          <input
            id="signin-code"
            className="input code-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            aria-label="Sign-in code"
          />
          <button type="submit" className="btn" disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Sign in"}
          </button>
        </div>
        {error && (
          <p className="hint" role="alert">
            {error}
          </p>
        )}
        <p className="setting-note">
          The link signs in whichever browser opens it. If your email app opens links in its own browser, or you use OOTD from your Home Screen,
          enter the code here instead.{" "}
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setSentTo(null);
              setCode("");
              setError(null);
            }}
          >
            Use a different email
          </button>
        </p>
      </form>
    );
  }

  return (
    <form
      className="signin"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const err = await sendLink(email);
        setBusy(false);
        if (err) setError(err);
        else setSentTo(email.trim());
      }}
    >
      {!compact && <h2 className="setting-title">{title}</h2>}
      <p className="setting-note">
        Your pieces, photos and history are saved to your account, so they’re on every device you sign in on. No password: we email you a link and a
        code.
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
        <button type="submit" className="btn" disabled={busy || email.trim().length < 5}>
          {busy ? "Sending…" : "Email me a link"}
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

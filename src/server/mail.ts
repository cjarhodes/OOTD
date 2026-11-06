/**
 * Sign-in email through Resend's HTTP API (no SDK). RESEND_API_KEY is the
 * key; OOTD_EMAIL_FROM is the sender, which must be on a domain verified in
 * Resend. Without a verified domain, Resend's test sender only delivers to
 * the Resend account's own address, which is enough to try it out.
 */
export function mailConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.RESEND_API_KEY);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function signInEmail(link: string, code: string) {
  const subject = `${code} is your OOTD sign-in code`;
  const text = `Sign in to OOTD\n\nOpen this link on the device you're signing in on:\n${link}\n\nOr enter this code in OOTD: ${code}\n\nThe link and code work once, for 15 minutes. If you didn't ask to sign in, ignore this email.`;
  const html = `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1a1a19;max-width:480px">
<p style="font-family:Georgia,serif;font-style:italic;font-size:28px;margin:0 0 16px">OOTD.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#1a1a19;color:#fbfbf9;padding:12px 20px;border-radius:999px;text-decoration:none">Sign in to OOTD</a></p>
<p>Or enter this code in OOTD:</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:600;margin:4px 0 16px">${escapeHtml(code)}</p>
<p style="color:#6d6b66;font-size:13px">The link and code work once, for 15 minutes. If you didn't ask to sign in, you can ignore this email.</p>
</div>`;
  return { subject, text, html };
}

export async function sendSignInEmail(to: string, link: string, code: string, env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const { subject, text, html } = signInEmail(link, code);
  if (!mailConfigured(env)) {
    // Local development and end-to-end tests only: print the link instead of sending it.
    if (env.NODE_ENV !== "production" || env.OOTD_FAKE_BLOB_DIR) {
      console.info(`[ootd] sign-in for ${to}: ${link} (code ${code})`);
      return true;
    }
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.OOTD_EMAIL_FROM || "OOTD <onboarding@resend.dev>", to: [to], subject, text, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

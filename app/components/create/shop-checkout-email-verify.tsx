"use client";

import { useState } from "react";

/** Email → send code → enter code. Used on live shop cart / order forms. */
export function ShopCheckoutEmailVerify({
  subdomain,
  email,
  onEmailChange,
  sessionKey,
  verifiedToken,
  onVerified,
  required = true,
}: {
  subdomain: string;
  email: string;
  onEmailChange: (email: string) => void;
  sessionKey?: string;
  verifiedToken: string | null;
  onVerified: (token: string | null) => void;
  required?: boolean;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const confirmed = Boolean(verifiedToken);

  async function sendCode() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    onVerified(null);
    try {
      const res = await fetch(
        `/api/public/sites/${encodeURIComponent(subdomain)}/checkout/email/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            sessionKey: sessionKey || undefined,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Could not send code.");
        return;
      }
      setMsg(typeof data.message === "string" ? data.message : "Code sent. Check your inbox.");
      setCode("");
    } catch {
      setErr("Network error while sending the code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/public/sites/${encodeURIComponent(subdomain)}/checkout/email/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            code: code.trim(),
            sessionKey: sessionKey || undefined,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Could not verify code.");
        onVerified(null);
        return;
      }
      const token =
        typeof data.emailVerificationToken === "string" ? data.emailVerificationToken : null;
      if (!token) {
        setErr("Verification response was incomplete.");
        return;
      }
      onVerified(token);
      setMsg("Email confirmed.");
    } catch {
      setErr("Network error while verifying.");
      onVerified(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-black/10 bg-black/[0.02] p-2">
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
        Confirm email
      </p>
      <input
        type="email"
        required={required}
        maxLength={254}
        placeholder="Your email (we send a code)"
        value={email}
        onChange={(e) => {
          onEmailChange(e.target.value);
          onVerified(null);
          setMsg(null);
        }}
        className="w-full rounded-lg border px-2 py-1.5 text-xs"
        autoComplete="email"
      />
      {!confirmed ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !email.trim().includes("@")}
            onClick={() => void sendCode()}
            className="rounded-full border border-black/20 px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
          >
            {busy ? "…" : "Send code"}
          </button>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs font-mono tracking-widest"
            autoComplete="one-time-code"
          />
          <button
            type="button"
            disabled={busy || code.trim().length !== 6}
            onClick={() => void verifyCode()}
            className="rounded-full bg-black px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      ) : (
        <p className="text-[11px] font-semibold text-emerald-800">Email confirmed ✓</p>
      )}
      {msg && !err ? <p className="text-[10px] opacity-70">{msg}</p> : null}
      {err ? <p className="text-[11px]" style={{ color: "#8B1E1E" }}>{err}</p> : null}
      <p className="text-[9px] opacity-50">
        Code goes to the inbox you enter (including your Kebu login email if that is what you use).
      </p>
    </div>
  );
}

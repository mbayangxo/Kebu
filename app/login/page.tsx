"use client";
export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import Link from "next/link";
import { KebuMark } from "@/app/components/kebu-mark";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { KEBU } from "@/lib/kebu-brand";
import { safeAuthNextPath } from "@/lib/auth/safe-next";
import { postAuthDestination } from "@/lib/navigation/kebu-workspace";
import { authCallbackUrl, isEmailNotConfirmed } from "@/lib/auth/email-confirm";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailConfirmPending, setEmailConfirmPending] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const searchParams = useSearchParams();
  const supabase = createClient();
  const nextPath = safeAuthNextPath(searchParams.get("next"));
  const confirmed = searchParams.get("confirmed") === "1";
  const callbackError = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setEmailConfirmPending(false);
    setResendStatus("idle");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (isEmailNotConfirmed(error.message)) {
        setEmailConfirmPending(true);
        setError(
          "Confirm your email first. Open the link we sent when you signed up, then sign in here."
        );
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    // Confirm cookies landed before navigation — soft client routing can race and show guest UI.
    if (!data.session) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Signed in, but the browser did not keep the session. Disable blockers and try again.");
        setLoading(false);
        return;
      }
    }

    const dest = postAuthDestination(searchParams.get("next"));
    window.location.assign(dest);
  }

  async function handleResendConfirmation() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email above, then tap resend confirmation.");
      return;
    }
    setResendStatus("sending");
    setError("");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: trimmed,
      options: { emailRedirectTo: authCallbackUrl(nextPath) },
    });
    if (error) {
      setResendStatus("idle");
      setError(error.message);
      return;
    }
    setEmailConfirmPending(true);
    setResendStatus("sent");
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="text-center mb-10">
        <Link href="/" className="inline-flex flex-col items-center gap-3">
          <KebuMark size={64} />
          <span
            className="text-3xl font-bold uppercase tracking-[0.16em]"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
          >
            Kebu
          </span>
        </Link>
        <p className="mt-3 text-sm" style={{ color: KEBU.muted }}>
          Africa is the opportunity
        </p>
      </div>

      <div className="rounded-2xl p-8 bg-white" style={{ border: `1px solid ${KEBU.border}`, boxShadow: "0 16px 40px rgba(255,85,0,0.08)" }}>
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
          Welcome back
        </h1>
        <p className="text-sm mb-8" style={{ color: KEBU.muted }}>
          Sign in to your sites, business, and opportunities
        </p>

        {confirmed && (
          <div
            className="rounded-xl px-4 py-3 text-sm mb-6"
            style={{ background: "rgba(255,85,0,0.1)", color: KEBU.black }}
          >
            Email confirmed. You can sign in now.
          </div>
        )}

        {callbackError === "confirm_failed" && (
          <div className="rounded-xl px-4 py-3 text-sm mb-6" style={{ background: KEBU.errorBg, color: KEBU.errorText }}>
            That confirmation link expired or was already used. Resend a new link below.
          </div>
        )}

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm mb-6"
            style={{
              background: emailConfirmPending ? "rgba(255,85,0,0.1)" : KEBU.errorBg,
              color: emailConfirmPending ? KEBU.black : KEBU.errorText,
            }}
          >
            {error}
          </div>
        )}

        {emailConfirmPending && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => void handleResendConfirmation()}
              disabled={resendStatus === "sending" || !email.trim()}
              className="w-full font-semibold py-3 rounded-xl text-sm transition-all hover:brightness-105 disabled:opacity-60"
              style={{ border: `1px solid ${KEBU.border}`, color: KEBU.black, background: KEBU.bright }}
            >
              {resendStatus === "sending"
                ? "Sending…"
                : resendStatus === "sent"
                  ? "Confirmation email sent — check your inbox"
                  : "Resend confirmation email"}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: KEBU.black }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-xl px-4 py-3 text-sm bg-white"
              style={{ border: `1px solid ${KEBU.border}`, color: KEBU.black }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: KEBU.black }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl px-4 py-3 text-sm bg-white"
              style={{ border: `1px solid ${KEBU.border}`, color: KEBU.black }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full font-bold py-3.5 rounded-xl transition-all hover:brightness-110 disabled:opacity-60"
            style={{ background: KEBU.orange, color: KEBU.white }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: KEBU.muted }}>
          New here?{" "}
          <Link href="/signup" className="font-semibold" style={{ color: KEBU.orange }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: KEBU.bright }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 80% 0%, rgba(255,85,0,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 0% 100%, rgba(225,6,0,0.1), transparent 50%)`,
        }}
        aria-hidden
      />
      <Suspense fallback={<div className="text-sm" style={{ color: KEBU.muted }}>Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

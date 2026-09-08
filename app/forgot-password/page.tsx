"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KebuMark } from "@/app/components/kebu-mark";
import { createClient } from "@/lib/supabase/client";
import { KEBU } from "@/lib/kebu-brand";
import { authCallbackUrl } from "@/lib/auth/email-confirm";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const supabase = createClient();
  const linkExpired = searchParams.get("error") === "link_expired";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const trimmed = email.trim();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: authCallbackUrl("/reset-password"),
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    // Always show success — do not reveal whether the email exists.
    setSent(true);
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
      </div>

      <div
        className="rounded-2xl p-8 bg-white"
        style={{ border: `1px solid ${KEBU.border}`, boxShadow: "0 16px 40px rgba(255,85,0,0.08)" }}
      >
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
          Forgot password
        </h1>
        <p className="text-sm mb-8" style={{ color: KEBU.muted }}>
          Enter your email. If an account exists, we send a link to choose a new password.
        </p>

        {linkExpired ? (
          <div className="rounded-xl px-4 py-3 text-sm mb-6" style={{ background: KEBU.errorBg, color: KEBU.errorText }}>
            That reset link expired or was already used. Request a new one below.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl px-4 py-3 text-sm mb-6" style={{ background: KEBU.errorBg, color: KEBU.errorText }}>
            {error}
          </div>
        ) : null}

        {sent ? (
          <div
            className="rounded-xl px-4 py-3 text-sm mb-6"
            style={{ background: "rgba(255,85,0,0.1)", color: KEBU.black }}
            role="status"
          >
            Check your inbox for a reset link. It may take a minute. Then open the link and set a new password.
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: KEBU.black }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
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
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm mt-6" style={{ color: KEBU.muted }}>
          <Link href="/login" className="font-semibold" style={{ color: KEBU.orange }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
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
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}

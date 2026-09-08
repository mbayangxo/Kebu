"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KebuMark } from "@/app/components/kebu-mark";
import { createClient } from "@/lib/supabase/client";
import { KEBU } from "@/lib/kebu-brand";
import { isValidNewPassword, NEW_PASSWORD_HINT } from "@/lib/auth/password-rules";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) {
        setHasSession(Boolean(session));
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase.auth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidNewPassword(password)) {
      setError(NEW_PASSWORD_HINT);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match. Check both fields and try again.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    window.setTimeout(() => {
      router.replace("/login?reset=1");
    }, 1200);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: KEBU.bright }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 80% 0%, rgba(255,85,0,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 0% 100%, rgba(225,6,0,0.1), transparent 50%)`,
        }}
        aria-hidden
      />
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
            Choose a new password
          </h1>
          <p className="text-sm mb-8" style={{ color: KEBU.muted }}>
            {NEW_PASSWORD_HINT}
          </p>

          {checking ? (
            <p className="text-sm" style={{ color: KEBU.muted }}>
              Checking your reset link…
            </p>
          ) : !hasSession ? (
            <div>
              <div
                className="rounded-xl px-4 py-3 text-sm mb-6"
                style={{ background: KEBU.errorBg, color: KEBU.errorText }}
              >
                This page needs a valid reset link from your email. Request a new one.
              </div>
              <Link
                href="/forgot-password"
                className="inline-flex w-full justify-center font-bold py-3.5 rounded-xl"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                Forgot password
              </Link>
            </div>
          ) : done ? (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: "rgba(0,200,81,0.12)", color: KEBU.black }}
              role="status"
            >
              Password updated. Taking you to sign in…
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
              {error ? (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{ background: KEBU.errorBg, color: KEBU.errorText }}
                >
                  {error}
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: KEBU.black }}>
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white"
                  style={{ border: `1px solid ${KEBU.border}`, color: KEBU.black }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: KEBU.black }}>
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
                {loading ? "Saving…" : "Save new password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

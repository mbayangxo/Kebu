"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { KebuMark } from "@/app/components/kebu-mark";
import { createClient } from "@/lib/supabase/client";
import { KEBU } from "@/lib/kebu-brand";
import { browserSupabaseMisconfigMessage, supabaseKeyRole } from "@/lib/supabase/key-role-browser";
import { authCallbackUrl } from "@/lib/auth/email-confirm";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const msg = browserSupabaseMisconfigMessage(
      supabaseKeyRole(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    );
    if (msg) setError(msg);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Check both fields and try again.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: authCallbackUrl("/onboarding"),
      },
    });
    if (error) {
      const msg =
        error.message.includes("secret API key in browser")
          ? "Browser still has the wrong Supabase key from an old deploy. In Vercel: set NEXT_PUBLIC_SUPABASE_ANON_KEY to the anon public key (not service_role), then Redeploy and check “Clear build cache”."
          : error.message;
      setError(msg);
      setLoading(false);
      return;
    }

    if (data.user && data.user.identities?.length === 0) {
      setError("An account with this email already exists. Sign in instead.");
      setLoading(false);
      return;
    }

    setNeedsEmailConfirm(!data.session);
    setSuccess(true);
    setLoading(false);
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
          <p className="mt-3 text-sm" style={{ color: KEBU.muted }}>
            Africa is the opportunity
          </p>
        </div>

        <div className="rounded-2xl p-8 bg-white" style={{ border: `1px solid ${KEBU.border}`, boxShadow: "0 16px 40px rgba(255,85,0,0.08)" }}>
          {success ? (
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center text-2xl"
                style={{ background: "rgba(255,85,0,0.12)", color: KEBU.orange }}
                aria-hidden
              >
                ✓
              </div>
              <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
                Thanks for creating your account
              </h1>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: KEBU.muted }}>
                {needsEmailConfirm
                  ? `We sent a confirmation link to ${email}. After you confirm, you can sign in and finish your profile.`
                  : "Your account is ready. You can now sign in and start building."}
              </p>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center font-bold py-3.5 rounded-xl transition-all hover:brightness-110"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                Sign in
              </Link>
            </div>
          ) : (
            <>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
            Create your account
          </h1>
          <p className="text-sm mb-8" style={{ color: KEBU.muted }}>
            Free to start. Build your site, Kebu ID, and opportunity path.
          </p>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm mb-6" style={{ background: KEBU.errorBg, color: KEBU.errorText }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: KEBU.black }}>
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full rounded-xl px-4 py-3 text-sm bg-white"
                style={{ border: `1px solid ${KEBU.border}`, color: KEBU.black }}
              />
            </div>

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
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Type the same password again"
                className="w-full rounded-xl px-4 py-3 text-sm bg-white"
                style={{
                  border: `1px solid ${
                    confirmPassword && confirmPassword !== password ? KEBU.red : KEBU.border
                  }`,
                  color: KEBU.black,
                }}
                aria-invalid={Boolean(confirmPassword && confirmPassword !== password)}
              />
              {confirmPassword && confirmPassword !== password ? (
                <p className="text-xs mt-2" style={{ color: KEBU.red }} role="status">
                  Passwords do not match yet.
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading || (confirmPassword.length > 0 && password !== confirmPassword)}
              className="w-full font-bold py-3.5 rounded-xl transition-all hover:brightness-110 disabled:opacity-60"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-xs text-center mt-4 leading-relaxed" style={{ color: KEBU.faint }}>
            By creating an account you agree to our terms. Your data is never sold.
          </p>

          <p className="text-center text-sm mt-4" style={{ color: KEBU.muted }}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold" style={{ color: KEBU.orange }}>
              Sign in
            </Link>
          </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

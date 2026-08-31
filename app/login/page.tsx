"use client";
export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import Link from "next/link";
import { KebuMark } from "@/app/components/kebu-mark";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { KEBU } from "@/lib/kebu-brand";
import { safeAuthNextPath } from "@/lib/auth/safe-next";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const nextPath = safeAuthNextPath(searchParams.get("next"));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(nextPath);
      router.refresh();
    }
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

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm mb-6" style={{ background: KEBU.errorBg, color: KEBU.errorText }}>
            {error}
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

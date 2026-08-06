"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlkebulanLion } from "@/app/components/panther-motif";

type Business = {
  id: string;
  public_kebu_id: string;
  legal_name: string;
  trading_name: string | null;
  country_code: string;
  category: string;
  description: string;
  lifecycle_status: string;
  verification_level: number;
  updated_at: string;
};

export default function BusinessListPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/businesses", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/business");
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load businesses.");
        return;
      }
      setBusinesses(Array.isArray(data.businesses) ? data.businesses : []);
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", color: "#0F0D33" }}>
      <header className="sticky top-0 z-40" style={{ background: "#0F0D33" }}>
        <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #009E40, #00C851)" }} />
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white text-sm">
            <AlkebulanLion size={28} />
            <span className="font-bold tracking-[0.12em]">KEBU ID</span>
          </Link>
          <Link
            href="/business/register"
            className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
            style={{ background: "#00C851", color: "#0F0D33" }}
          >
            Register a Business
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          Your businesses
        </h1>
        <p className="text-sm mb-8" style={{ color: "#6B5B45" }}>
          Each business has a permanent Kebu ID — separate from your personal account eligibility.
        </p>

        {error && (
          <div role="alert" className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
            {error}{" "}
            <button type="button" className="underline font-semibold" onClick={() => void load()}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: "#6B5B45" }}>
            Loading…
          </p>
        ) : businesses.length === 0 ? (
          <div className="rounded-2xl px-6 py-12 text-center" style={{ border: "1px dashed #DDE0F0", background: "#fff" }}>
            <p className="font-semibold mb-2">No businesses yet</p>
            <p className="text-sm mb-6" style={{ color: "#6B5B45" }}>
              Register a draft business to receive your first Kebu ID.
            </p>
            <Link href="/business/register" className="inline-block rounded-full px-6 py-3 text-sm font-bold" style={{ background: "#0F0D33", color: "#fff" }}>
              Register a Business
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {businesses.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/business/${b.id}`}
                  className="block rounded-2xl px-5 py-4"
                  style={{ background: "#fff", border: "1px solid #DDE0F0" }}
                >
                  <p className="font-semibold">{b.legal_name}</p>
                  <p className="text-xs mt-1 font-mono" style={{ color: "#009E40" }}>
                    {b.public_kebu_id}
                  </p>
                  <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: "#8A8578" }}>
                    {b.country_code} · {b.category} · level {b.verification_level} · {b.lifecycle_status}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  created_at: string;
  updated_at: string;
};

export default function BusinessDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${id}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/business/${id}`);
        return;
      }
      if (res.status === 404) {
        setError("Business not found — or you do not have access.");
        setBusiness(null);
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load business.");
        return;
      }
      setBusiness(data.business);
      setRole(data.membership?.role ?? null);
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

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
          <Link href="/business" className="flex items-center gap-2 text-white text-sm">
            <AlkebulanLion size={28} />
            <span className="font-bold tracking-[0.12em]">← Businesses</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        {loading ? (
          <p className="text-sm" style={{ color: "#6B5B45" }}>
            Loading business…
          </p>
        ) : error || !business ? (
          <div role="alert" className="rounded-xl p-4" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
            <p className="mb-3">{error ?? "Unavailable"}</p>
            <button type="button" className="underline font-semibold" onClick={() => void load()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "#009E40" }}>
              Business dashboard · draft
            </p>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
              {business.legal_name}
            </h1>
            {business.trading_name && (
              <p className="text-sm mb-4" style={{ color: "#6B5B45" }}>
                Trading as {business.trading_name}
              </p>
            )}

            <div
              className="rounded-2xl p-5 mb-6"
              style={{ background: "#0F0D33", color: "#FAFAF8" }}
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 mb-2">Kebu ID</p>
              <p className="font-mono text-lg sm:text-xl text-[#00C851]">{business.public_kebu_id}</p>
              <p className="text-xs text-white/40 mt-3">
                Level {business.verification_level} · {business.lifecycle_status}
                {role ? ` · your role: ${role}` : ""}
              </p>
            </div>

            <dl className="grid sm:grid-cols-2 gap-4 rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
              <div>
                <dt className="text-[10px] uppercase tracking-wider" style={{ color: "#8A8578" }}>
                  Country
                </dt>
                <dd className="font-semibold mt-1">{business.country_code}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider" style={{ color: "#8A8578" }}>
                  Category
                </dt>
                <dd className="font-semibold mt-1">{business.category}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-wider" style={{ color: "#8A8578" }}>
                  Description
                </dt>
                <dd className="mt-1 text-sm" style={{ color: "#6B5B45", lineHeight: 1.6 }}>
                  {business.description}
                </dd>
              </div>
            </dl>

            <p className="text-xs mt-6" style={{ color: "#8A8578" }}>
              Registration, team invites, stores, and payments are not part of this slice.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

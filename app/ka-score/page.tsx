"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { KebuWordmark } from "@/app/components/kebu-mark";
import { KEBU } from "@/lib/kebu-brand";

type BusinessRow = {
  id: string;
  legal_name: string;
  public_kebu_id: string;
};

type Readiness = {
  score_value: number;
  score_band: string;
  confidence_level: string;
  explanation: { summary?: string; note?: string };
  missing_items: string[];
  helping_factors: string[];
  limiting_factors: string[];
};

export default function KaScorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBusiness = useCallback(async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${id}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/ka-score");
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load business score.");
        setReadiness(null);
        return;
      }
      setReadiness(data.readiness ?? null);
    } catch {
      setError("Network error.");
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/businesses", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          router.replace("/login?next=/ka-score");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError(typeof data.error === "string" ? data.error : "Could not load businesses.");
          return;
        }
        const list = Array.isArray(data.businesses) ? data.businesses : [];
        if (!cancelled) {
          setBusinesses(list);
          if (list[0]?.id) setSelectedId(list[0].id);
        }
      } catch {
        if (!cancelled) setError("Network error.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadBusiness, router]);

  useEffect(() => {
    if (selectedId) void loadBusiness(selectedId);
  }, [selectedId, loadBusiness]);

  return (
    <div className="min-h-screen" style={{ background: KEBU.bright, color: KEBU.black }}>
      <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: "rgba(255,251,247,0.95)" }}>
        <div
          className="h-[3px] w-full"
          style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})` }}
        />
        <div
          className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${KEBU.border}` }}
        >
          <Link href="/">
            <KebuWordmark size={28} dark />
          </Link>
          <Link
            href="/business"
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: KEBU.orange }}
          >
            Businesses
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-16">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3"
          style={{ color: KEBU.orange }}
        >
          Kebu Score · Business Readiness
        </p>
        <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
          Your business readiness
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: KEBU.muted }}>
          This is your real <strong>Business Readiness</strong> score from Supabase — tied to your Kebu ID business.
          It is calculated on the server from verified profile and registration data. Full Kebu Score (orders, fulfillment,
          trade) comes after more business activity is connected.
        </p>

        {loading ? (
          <p className="text-sm" style={{ color: KEBU.faint }}>
            Loading…
          </p>
        ) : businesses.length === 0 ? (
          <div
            className="rounded-2xl p-6 bg-white"
            style={{ border: `1px solid ${KEBU.border}` }}
          >
            <p className="text-sm mb-4" style={{ color: KEBU.muted }}>
              No Kebu ID business yet. Create one to get a readiness score.
            </p>
            <Link
              href="/business/register"
              className="inline-flex rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wider"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              Register your business
            </Link>
          </div>
        ) : (
          <>
            {businesses.length > 1 ? (
              <label className="block text-xs uppercase tracking-wider mb-6" style={{ color: KEBU.muted }}>
                Business
                <select
                  className="mt-2 w-full rounded-lg px-3 py-2 text-sm bg-white"
                  style={{ color: KEBU.black, border: `1px solid ${KEBU.border}` }}
                  value={selectedId ?? ""}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.legal_name} · {b.public_kebu_id}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {error ? (
              <p role="alert" className="text-sm mb-4" style={{ color: KEBU.red }}>
                {error}
              </p>
            ) : null}

            {readiness ? (
              <div
                className="rounded-2xl p-8 bg-white"
                style={{
                  border: `1px solid ${KEBU.border}`,
                  boxShadow: "0 12px 32px rgba(255,85,0,0.08)",
                }}
              >
                <p className="text-6xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.orange }}>
                  {readiness.score_value}
                </p>
                <p className="text-xs uppercase tracking-wider mb-4" style={{ color: KEBU.orange }}>
                  {readiness.score_band.replace(/_/g, " ")} · {readiness.confidence_level} confidence
                </p>
                <p className="text-sm mb-4" style={{ color: KEBU.muted }}>
                  {readiness.explanation?.summary}
                </p>
                {readiness.helping_factors?.length > 0 ? (
                  <div className="mb-4">
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider mb-2"
                      style={{ color: KEBU.faint }}
                    >
                      Helping
                    </p>
                    <ul className="text-sm space-y-1" style={{ color: KEBU.muted }}>
                      {readiness.helping_factors.map((f) => (
                        <li key={f}>+ {f}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {readiness.missing_items?.length > 0 ? (
                  <div className="mb-6">
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider mb-2"
                      style={{ color: KEBU.faint }}
                    >
                      Next actions
                    </p>
                    <ul className="text-sm space-y-1" style={{ color: KEBU.muted }}>
                      {readiness.missing_items.map((f) => (
                        <li key={f}>→ {f}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <Link
                  href={`/business/${selectedId}`}
                  className="text-sm font-semibold underline"
                  style={{ color: KEBU.orange }}
                >
                  Open business dashboard →
                </Link>
              </div>
            ) : (
              <p className="text-sm" style={{ color: KEBU.faint }}>
                No readiness score yet for this business.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

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
    <AppShell
      title="Kebu Business"
      actions={
        <Link
          href="/business/register"
          className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
          style={{ background: KEBU.orange, color: KEBU.white }}
        >
          Register a business
        </Link>
      }
    >
      <main className="max-w-3xl mx-auto px-5 py-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] mb-2" style={{ color: KEBU.orange }}>
          Kebu Business
        </p>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          Your businesses
        </h1>
        <p className="text-sm mb-6" style={{ color: KEBU.muted }}>
          Kebu ID, registration, readiness, and trade — separate from your personal Kebu profile. Builder, Create, and
          Alkebulan B2B live here.
        </p>

        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {[
            { label: "Kebu Builder", href: "/create", body: "Websites and stores" },
            { label: "Kebu Create", href: "/studio", body: "Apps, graphics, social assets" },
            { label: "Alkebulan", href: "/b2b", body: "B2B listings & trade partners" },
            { label: "My Account", href: "/account", body: "Everything you are doing on Kebu" },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl px-4 py-4 transition-all hover:-translate-y-px"
              style={{ background: KEBU.card, border: `1px solid ${KEBU.border}`, borderLeft: `4px solid ${KEBU.orange}` }}
            >
              <p className="font-bold text-sm">{card.label}</p>
              <p className="text-xs mt-1" style={{ color: KEBU.muted }}>
                {card.body}
              </p>
            </Link>
          ))}
        </div>

        <Link href="/account" className="text-xs font-bold underline mb-8 inline-block" style={{ color: KEBU.orange }}>
          ← My Account
        </Link>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl px-4 py-3 text-sm"
            style={{ background: KEBU.errorBg, color: KEBU.errorText }}
          >
            {error}{" "}
            <button type="button" className="underline font-semibold" onClick={() => void load()}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: KEBU.muted }}>
            Loading…
          </p>
        ) : businesses.length === 0 ? (
          <div
            className="rounded-2xl px-6 py-12 text-center"
            style={{ border: `1px dashed ${KEBU.border}`, background: KEBU.card }}
          >
            <p className="font-semibold mb-2">No businesses yet</p>
            <p className="text-sm mb-6" style={{ color: KEBU.muted }}>
              Register a draft business to receive your first Kebu ID.
            </p>
            <Link
              href="/business/register"
              className="inline-block rounded-full px-6 py-3 text-sm font-bold"
              style={{ background: KEBU.black, color: KEBU.white }}
            >
              Register a business
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {businesses.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/business/${b.id}`}
                  className="block rounded-2xl px-5 py-4 transition-all hover:-translate-y-px"
                  style={{ background: KEBU.card, border: `1px solid ${KEBU.border}`, borderLeft: `4px solid ${KEBU.orange}` }}
                >
                  <p className="font-semibold">{b.legal_name}</p>
                  <p className="text-xs mt-1 font-mono font-bold" style={{ color: KEBU.orange }}>
                    {b.public_kebu_id}
                  </p>
                  <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: KEBU.faint }}>
                    {b.country_code} · {b.category} · level {b.verification_level} · {b.lifecycle_status}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}

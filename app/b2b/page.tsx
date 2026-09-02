"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

type Listing = {
  business_id: string;
  headline: string;
  about: string;
  logo_url: string;
  cover_url: string;
  categories: string[];
  min_order_note: string;
  contact_email: string | null;
  contact_phone: string | null;
  business: {
    public_kebu_id: string;
    legal_name: string;
    trading_name: string | null;
    country_code: string;
    region: string | null;
    category: string;
  } | null;
};

export default function B2bDirectoryPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/b2b/directory", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not load B2B directory.");
        setLoading(false);
        return;
      }
      setListings(data.listings ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <AppShell title="Alkebulan">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
          Alkebulan · B2B on Kebu Business
        </p>
        <h1 className="font-display text-3xl font-bold mb-2">Find suppliers & partners</h1>
        <p className="text-sm text-muted mb-8 max-w-2xl">
          List your business and discover other Kebu businesses — not the public web. Customer-facing shops and sites
          live in Kebu Builder with your own domain.
        </p>

        {loading ? <p className="text-muted">Loading…</p> : null}
        {error ? (
          <div className="rounded-xl p-4 text-sm" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
            {error}
            {error.includes("Create a Kebu business") ? (
              <Link href="/business/register" className="block mt-2 font-bold underline">
                Create your business →
              </Link>
            ) : null}
          </div>
        ) : null}

        {!loading && !error && listings.length === 0 ? (
          <p className="text-muted">No published B2B profiles yet. Be the first — add yours on your business dashboard.</p>
        ) : null}

        <div className="grid sm:grid-cols-2 gap-4">
          {listings.map((item) => (
            <article key={item.business_id} className="rounded-2xl border border-border bg-white overflow-hidden">
              {item.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.cover_url} alt="" className="h-28 w-full object-cover" />
              ) : (
                <div className="h-28 bg-gradient-to-r from-deep-green to-gold/80" />
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  {item.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : null}
                  <div>
                    <p className="font-semibold">{item.business?.legal_name ?? "Business"}</p>
                    <p className="text-[10px] font-mono text-muted">{item.business?.public_kebu_id}</p>
                  </div>
                </div>
                <p className="font-medium text-sm">{item.headline}</p>
                <p className="text-xs text-muted line-clamp-3">{item.about}</p>
                {item.min_order_note ? (
                  <p className="text-xs font-semibold" style={{ color: KEBU.orange }}>
                    {item.min_order_note}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-2">
                  {item.contact_email ? (
                    <a href={`mailto:${item.contact_email}`} className="text-xs font-bold underline">
                      Email
                    </a>
                  ) : null}
                  {item.contact_phone ? (
                    <a
                      href={`https://wa.me/${item.contact_phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold underline"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

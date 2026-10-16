"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";

type Listing = { publicId: string; title: string; employmentType: string; locationType: string; location: string; employerName: string };

const fieldStyle = { borderColor: KEBU.borders.default } as const;

export function LigueyDiscoverClient() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/public/liguey/listings");
      const body = await res.json().catch(() => ({ listings: [] }));
      setListings(body.listings ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-[760px] px-4 py-4 sm:px-6">
      <header className="border-b pb-4" style={fieldStyle}>
        <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">Kebu Liguey</p>
        <h1 className="mt-1 text-[26px] tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>Open work</h1>
        <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>Real listings published by Kebu businesses — nothing here is invented.</p>
      </header>

      <section className="mt-6 space-y-2">
        {loading ? (
          <p className="text-[10px]" style={{ color: KEBU.faint }}>Loading…</p>
        ) : listings.length === 0 ? (
          <p className="text-[10px]" style={{ color: KEBU.faint }}>No open listings right now. Check back soon.</p>
        ) : (
          listings.map((listing) => (
            <Link key={listing.publicId} href={`/j/${listing.publicId}`} className="block rounded-[12px] border p-3 hover:bg-black/[.02]" style={fieldStyle}>
              <p className="text-[12px] font-black">{listing.title}</p>
              <p className="mt-0.5 text-[9px]" style={{ color: KEBU.faint }}>
                {listing.employerName} · {listing.employmentType.replaceAll("_", " ")} · {listing.locationType}{listing.location ? ` · ${listing.location}` : ""}
              </p>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

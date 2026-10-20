"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";
import { LanguageBar } from "@/app/components/language-bar";
import { useLocale } from "@/app/components/locale-context";
import { ligueyT, employmentTypeLabel, locationTypeLabel, type LigueyKey } from "@/lib/liguey/liguey-i18n";

type Listing = { publicId: string; title: string; employmentType: string; locationType: string; location: string; payLabel: string; photoUrl: string; employerName: string };

const fieldStyle = { borderColor: KEBU.borders.default } as const;

export function LigueyDiscoverClient() {
  const { lang } = useLocale();
  const t = (key: LigueyKey) => ligueyT(lang, key);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/public/liguey/listings");
        const body = await res.json().catch(() => ({ listings: [] }));
        if (!res.ok) { setError(body.error ?? "Could not load open roles."); return; }
        setListings(body.listings ?? []);
      } catch {
        setError("Could not load open roles. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-[760px] px-4 py-4 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4" style={fieldStyle}>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">{t("brand")}</p>
          <h1 className="mt-1 text-[26px] tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>{t("discover_title")}</h1>
          <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>{t("discover_intro")}</p>
        </div>
        <LanguageBar variant="builder" />
      </header>

      {error ? <div className="mt-4 rounded-[10px] border px-3 py-2 text-[10px]" style={{ borderColor: "#FFB3B3", color: "#B00020", background: "#FFF3F3" }}>{error}</div> : null}

      <section className="mt-6 space-y-2">
        {loading ? (
          <p className="text-[10px]" style={{ color: KEBU.faint }}>{t("discover_loading")}</p>
        ) : listings.length === 0 ? (
          <p className="text-[10px]" style={{ color: KEBU.faint }}>{t("discover_empty")}</p>
        ) : (
          listings.map((listing) => (
            <Link key={listing.publicId} href={`/j/${listing.publicId}`} className="flex items-center gap-3 rounded-[12px] border p-3 hover:bg-black/[.02]" style={fieldStyle}>
              {listing.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.photoUrl} alt="" className="h-11 w-11 shrink-0 rounded-[8px] object-cover" />
              ) : null}
              <div className="min-w-0">
                <p className="text-[12px] font-black">{listing.title}</p>
                <p className="mt-0.5 text-[9px]" style={{ color: KEBU.faint }}>
                  {listing.employerName} · {employmentTypeLabel(listing.employmentType, lang)} · {locationTypeLabel(listing.locationType, lang)}{listing.location ? ` · ${listing.location}` : ""}{listing.payLabel ? ` · ${listing.payLabel}` : ""}
                </p>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

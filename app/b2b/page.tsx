"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { Skeleton } from "@/app/components/kebu-skeleton";
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

const COUNTRY_FLAGS: Record<string, string> = {
  SN: "🇸🇳", CI: "🇨🇮", NG: "🇳🇬", GH: "🇬🇭", KE: "🇰🇪",
  ML: "🇲🇱", BF: "🇧🇫", GN: "🇬🇳", CM: "🇨🇲", TZ: "🇹🇿",
  ZA: "🇿🇦", ET: "🇪🇹", MA: "🇲🇦", TG: "🇹🇬", BJ: "🇧🇯",
};

const COUNTRY_NAMES: Record<string, string> = {
  SN: "Senegal", CI: "Côte d'Ivoire", NG: "Nigeria", GH: "Ghana", KE: "Kenya",
  ML: "Mali", BF: "Burkina Faso", GN: "Guinea", CM: "Cameroon", TZ: "Tanzania",
  ZA: "South Africa", ET: "Ethiopia", MA: "Morocco", TG: "Togo", BJ: "Benin",
};

function flagEmoji(code: string): string {
  return COUNTRY_FLAGS[code.toUpperCase()] ?? "🌍";
}

function countryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

function whatsAppHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

function ListingCard({ item }: { item: Listing }) {
  const biz = item.business;
  const name = biz?.trading_name || biz?.legal_name || "Business";
  const hasWA = Boolean(item.contact_phone);
  const hasEmail = Boolean(item.contact_email);

  return (
    <article
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
    >
      {/* Cover */}
      {item.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.cover_url} alt="" className="h-28 w-full object-cover" />
      ) : (
        <div
          className="h-28 w-full"
          style={{ background: `linear-gradient(135deg, ${KEBU.black} 0%, ${KEBU.orange}80 100%)` }}
        />
      )}

      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          {item.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.logo_url}
              alt=""
              className="w-10 h-10 rounded-xl object-cover shrink-0"
              style={{ border: `1px solid ${KEBU.border}` }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-xs font-black text-white"
              style={{ background: KEBU.orange }}
            >
              {name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm truncate" style={{ color: KEBU.black }}>{name}</p>
            {biz && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs">{flagEmoji(biz.country_code)}</span>
                <span className="text-[10px]" style={{ color: KEBU.muted }}>
                  {countryName(biz.country_code)}
                  {biz.region ? ` · ${biz.region}` : ""}
                </span>
              </div>
            )}
          </div>
          {biz?.public_kebu_id && (
            <span
              className="shrink-0 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: `${KEBU.orange}12`, color: KEBU.orange }}
            >
              {biz.public_kebu_id}
            </span>
          )}
        </div>

        {/* Headline */}
        <p className="text-sm font-bold leading-snug" style={{ color: KEBU.black }}>{item.headline}</p>

        {/* About */}
        <p
          className="text-xs leading-relaxed flex-1"
          style={{ color: KEBU.muted, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {item.about}
        </p>

        {/* Categories */}
        {item.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.categories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: "rgba(10,10,10,0.06)", color: KEBU.muted }}
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Min order */}
        {item.min_order_note ? (
          <p className="text-[11px] font-bold" style={{ color: KEBU.orange }}>
            {item.min_order_note}
          </p>
        ) : null}

        {/* Contact — WhatsApp first */}
        <div className="flex gap-2 pt-1">
          {hasWA && (
            <a
              href={whatsAppHref(item.contact_phone!)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold"
              style={{ background: "#25D366", color: "white" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M11.987 0C5.373 0 0 5.373 0 11.987c0 2.099.548 4.065 1.504 5.773L0 24l6.422-1.687a11.944 11.944 0 005.565 1.373h.005C18.607 23.686 24 18.313 24 11.699 24 5.085 18.607 0 11.987 0zm0 21.786c-1.844 0-3.588-.494-5.094-1.355l-.366-.217-3.797.996.992-3.682-.239-.38a9.785 9.785 0 01-1.495-5.247c0-5.39 4.386-9.776 9.776-9.776 5.39 0 9.777 4.386 9.777 9.776.001 5.39-4.387 9.885-9.554 9.885z" />
              </svg>
              WhatsApp
            </a>
          )}
          {hasEmail && (
            <a
              href={`mailto:${item.contact_email}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold"
              style={{
                background: hasWA ? "transparent" : KEBU.orange,
                color: hasWA ? KEBU.muted : "white",
                border: hasWA ? `1px solid ${KEBU.border}` : "none",
              }}
            >
              Email
            </a>
          )}
          {!hasWA && !hasEmail && (
            <span className="text-xs" style={{ color: KEBU.faint }}>No contact listed</span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function B2bDirectoryPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");

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

  // Unique countries in the directory
  const countries = useMemo(() => {
    const codes = new Set<string>();
    for (const l of listings) {
      if (l.business?.country_code) codes.add(l.business.country_code.toUpperCase());
    }
    return Array.from(codes).sort();
  }, [listings]);

  // Filtered view
  const filtered = useMemo(() => {
    let out = listings;
    if (countryFilter !== "all") {
      out = out.filter((l) => l.business?.country_code?.toUpperCase() === countryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (l) =>
          (l.business?.trading_name ?? "").toLowerCase().includes(q) ||
          (l.business?.legal_name ?? "").toLowerCase().includes(q) ||
          l.headline.toLowerCase().includes(q) ||
          l.about.toLowerCase().includes(q) ||
          (l.categories ?? []).some((c) => c.toLowerCase().includes(q)),
      );
    }
    return out;
  }, [listings, countryFilter, search]);

  return (
    <AppShell title="Alkebulan">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-2" style={{ color: KEBU.orange }}>
          Alkebulan · B2B Directory
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
              Find African suppliers
            </h1>
            <p className="text-sm max-w-xl" style={{ color: KEBU.muted }}>
              Verified Kebu businesses. WhatsApp-first contact. Real companies, not the public web.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href="/business/register"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold"
              style={{ background: "transparent", color: KEBU.black, border: `1px solid ${KEBU.border}` }}
            >
              List your business
            </Link>
            <Link
              href="/business"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white"
              style={{ background: KEBU.orange }}
            >
              My businesses
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={KEBU.muted} strokeWidth="2" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search businesses, sectors, services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none"
            style={{ background: KEBU.white, border: `1px solid ${KEBU.border}`, color: KEBU.black }}
          />
        </div>

        {/* Country filter */}
        {countries.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => setCountryFilter("all")}
              className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: countryFilter === "all" ? KEBU.black : KEBU.white,
                color: countryFilter === "all" ? KEBU.white : KEBU.muted,
                border: `1px solid ${KEBU.border}`,
              }}
            >
              All countries
            </button>
            {countries.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setCountryFilter(code === countryFilter ? "all" : code)}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1"
                style={{
                  background: countryFilter === code ? KEBU.black : KEBU.white,
                  color: countryFilter === code ? KEBU.white : KEBU.muted,
                  border: `1px solid ${KEBU.border}`,
                }}
              >
                <span>{flagEmoji(code)}</span>
                {countryName(code)}
              </button>
            ))}
          </div>
        )}

        {/* Skeleton */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${KEBU.border}`, background: KEBU.white }}>
                <Skeleton height={112} radius={0} />
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton width={40} height={40} radius={8} style={{ flexShrink: 0 }} />
                    <div className="flex-1">
                      <Skeleton height={14} width="60%" style={{ marginBottom: 6 }} />
                      <Skeleton height={10} width="40%" />
                    </div>
                  </div>
                  <Skeleton height={13} width="80%" />
                  <Skeleton height={11} width="100%" />
                  <Skeleton height={11} width="70%" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Error */}
        {error ? (
          <div
            className="rounded-xl p-5"
            style={{ background: KEBU.errorBg, border: `1px solid rgba(139,30,30,0.15)` }}
          >
            <p className="text-sm font-bold mb-2" style={{ color: KEBU.errorText }}>{error}</p>
            {error.includes("Create a Kebu business") ? (
              <Link
                href="/business/register"
                className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                Register your business →
              </Link>
            ) : null}
          </div>
        ) : null}

        {/* Empty state */}
        {!loading && !error && listings.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: KEBU.white, border: `1px dashed ${KEBU.border}` }}
          >
            <p className="font-bold mb-2" style={{ color: KEBU.black }}>No listings yet</p>
            <p className="text-sm mb-5" style={{ color: KEBU.muted }}>
              Be the first African business in this directory. Add your profile from your business dashboard.
            </p>
            <Link
              href="/business/register"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: KEBU.orange }}
            >
              List your business
            </Link>
          </div>
        ) : null}

        {/* No search results */}
        {!loading && !error && listings.length > 0 && filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm" style={{ color: KEBU.muted }}>
              No results for &ldquo;{search}&rdquo;
              {countryFilter !== "all" ? ` in ${countryName(countryFilter)}` : ""}.
            </p>
            <button
              type="button"
              onClick={() => { setSearch(""); setCountryFilter("all"); }}
              className="mt-3 text-xs font-bold"
              style={{ color: KEBU.orange }}
            >
              Clear filters
            </button>
          </div>
        ) : null}

        {/* Results count */}
        {!loading && filtered.length > 0 && (search || countryFilter !== "all") ? (
          <p className="text-[11px] mb-4" style={{ color: KEBU.faint }}>
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </p>
        ) : null}

        {/* Grid */}
        {!loading && filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((item) => (
              <ListingCard key={item.business_id} item={item} />
            ))}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

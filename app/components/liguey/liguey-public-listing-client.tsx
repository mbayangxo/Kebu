"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";
import { LanguageBar } from "@/app/components/language-bar";
import { useLocale } from "@/app/components/locale-context";
import { ligueyT, employmentTypeLabel, locationTypeLabel, type LigueyKey } from "@/lib/liguey/liguey-i18n";

type Listing = {
  id: string; businessId: string; publicId: string; title: string; description: string; requirements: string;
  employmentType: string; locationType: string; location: string; employerName: string;
};

const fieldStyle = { borderColor: KEBU.borders.default } as const;

export function LigueyPublicListingClient({ publicId }: { publicId: string }) {
  const { lang } = useLocale();
  const t = (key: LigueyKey) => ligueyT(lang, key);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/public/liguey/listings/${encodeURIComponent(publicId)}`);
        const body = await res.json();
        if (!res.ok) { setNotFound(true); return; }
        setListing(body.listing);
      } finally {
        setLoading(false);
      }
    })();
  }, [publicId]);

  async function handleApply() {
    if (!listing) return;
    setSubmitting(true);
    setApplyError(null);
    setNeedsSignIn(false);
    try {
      const res = await fetch("/api/liguey/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, businessId: listing.businessId, coverNote }),
      });
      if (res.status === 401) { setNeedsSignIn(true); return; }
      const body = await res.json();
      if (!res.ok) { setApplyError(body.error ?? "Could not submit your application."); return; }
      setApplied(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-[680px] px-4 py-10 text-[11px]" style={{ color: KEBU.muted }}>{t("public_loading")}</div>;
  if (notFound || !listing) {
    return (
      <div className="mx-auto max-w-[680px] px-4 py-10 text-center">
        <p className="text-[13px] font-black">{t("public_not_found")}</p>
        <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>{t("public_not_found_hint")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[680px] px-4 py-4 sm:px-6">
      <div className="flex justify-end"><LanguageBar variant="builder" /></div>
      <p className="mt-2 text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">{listing.employerName}</p>
      <h1 className="mt-1 text-[26px] tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>{listing.title}</h1>
      <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>
        {employmentTypeLabel(listing.employmentType, lang)} · {locationTypeLabel(listing.locationType, lang)}{listing.location ? ` · ${listing.location}` : ""}
      </p>

      {listing.description ? <p className="mt-6 whitespace-pre-wrap text-[12px] leading-relaxed">{listing.description}</p> : null}
      {listing.requirements ? (
        <div className="mt-4">
          <p className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>{t("public_requirements_label")}</p>
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed">{listing.requirements}</p>
        </div>
      ) : null}

      <section className="mt-8 border-t pt-6" style={fieldStyle}>
        {applied ? (
          <p className="text-[12px] font-black" style={{ color: KEBU.orange }}>{t("public_applied")}</p>
        ) : needsSignIn ? (
          <div>
            <p className="text-[11px]" style={{ color: KEBU.muted }}>{t("public_sign_in_prompt")}</p>
            <Link href={`/login?next=/j/${encodeURIComponent(listing.publicId)}`} className="mt-2 inline-flex rounded-full bg-black px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white">{t("public_sign_in_cta")}</Link>
          </div>
        ) : (
          <div>
            {applyError ? <div className="mb-3 rounded-[10px] border px-3 py-2 text-[10px]" style={{ borderColor: "#FFB3B3", color: "#B00020", background: "#FFF3F3" }}>{applyError}</div> : null}
            <textarea value={coverNote} onChange={(e) => setCoverNote(e.target.value)} rows={4} maxLength={4000}
              placeholder={t("public_cover_note_placeholder")}
              className="w-full rounded-[10px] border px-3 py-2 text-[12px]" style={fieldStyle} />
            <button type="button" disabled={submitting} onClick={handleApply} className="mt-3 rounded-full bg-black px-5 py-2 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-50">
              {submitting ? t("public_applying") : t("public_apply")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

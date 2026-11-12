"use client";

import { useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { LanguageBar } from "@/app/components/language-bar";
import { useLocale } from "@/app/components/locale-context";
import { ligueyT, applicationStatusLabel, type LigueyKey } from "@/lib/liguey/liguey-i18n";

type Application = { id: string; listing_id: string; status: string; cover_note: string; created_at: string };
type Listing = { id: string; title: string; status: string };

const fieldStyle = { borderColor: KEBU.borders.default } as const;

export function LigueyApplicationsPanel({ initialApplications, initialListings }: { initialApplications: Application[]; initialListings: Listing[] }) {
  const { lang } = useLocale();
  const t = (key: LigueyKey) => ligueyT(lang, key);
  const [applications, setApplications] = useState(initialApplications);
  const [error, setError] = useState<string | null>(null);
  const listingById = new Map(initialListings.map((listing) => [listing.id, listing]));

  async function withdraw(applicationId: string) {
    setError(null);
    try {
      const res = await fetch("/api/liguey/applications", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error ?? "Could not withdraw this application."); return; }
      setApplications((prev) => prev.map((application) => (application.id === applicationId ? { ...application, status: "withdrawn" } : application)));
    } catch {
      setError("Could not withdraw this application. Retry when connected.");
    }
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-4 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4" style={fieldStyle}>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">{t("brand")}</p>
          <h1 className="mt-1 text-[26px] tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>{t("applications_title")}</h1>
        </div>
        <LanguageBar variant="builder" />
      </header>

      {error ? <div className="mt-4 rounded-[10px] border px-3 py-2 text-[10px]" style={{ borderColor: "#FFB3B3", color: "#B00020", background: "#FFF3F3" }}>{error}</div> : null}

      <section className="mt-6 space-y-2">
        {applications.map((application) => {
          const listing = listingById.get(application.listing_id);
          return (
            <div key={application.id} className="flex items-center gap-3 rounded-[12px] border p-3" style={fieldStyle}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-black">{listing?.title ?? "Listing"}</p>
                <p className="mt-0.5 text-[9px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{applicationStatusLabel(application.status, lang)}</p>
              </div>
              {application.status === "submitted" || application.status === "reviewed" ? (
                <button type="button" onClick={() => withdraw(application.id)} className="shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-black" style={fieldStyle}>{t("applications_withdraw")}</button>
              ) : null}
            </div>
          );
        })}
        {applications.length === 0 ? <p className="text-[10px]" style={{ color: KEBU.faint }}>{t("applications_empty")}</p> : null}
      </section>
    </div>
  );
}

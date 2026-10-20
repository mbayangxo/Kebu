"use client";

import { useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { LanguageBar } from "@/app/components/language-bar";
import { useLocale } from "@/app/components/locale-context";
import { ligueyT, employmentTypeLabel, locationTypeLabel, listingStatusLabel, applicationStatusLabel, type LigueyKey } from "@/lib/liguey/liguey-i18n";

type Listing = {
  id: string; public_id: string; title: string; description: string; requirements: string;
  employment_type: string; location_type: string; location: string; status: string;
};
type Application = { id: string; applicant_user_id: string; cover_note: string; status: string; decided_at: string | null; created_at: string };
type ApplicantProfile = { user_id: string; headline: string | null; skills: string[]; languages: string[] };
type EvidenceLink = { user_id: string; library_node_id: string; label: string | null };
type EvidenceNode = { id: string; title: string; kind: string };
type ApplicantInsight = { summary: string; strengths: string[]; questions_to_ask: string[]; caution: string };

const fieldStyle = { borderColor: KEBU.borders.default } as const;
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship", "apprenticeship", "gig"] as const;
const LOCATION_TYPES = ["onsite", "remote", "hybrid"] as const;

function StatusPill({ status, lang, kind }: { status: string; lang: string; kind: "listing" | "application" }) {
  const tone = status === "published" || status === "accepted" ? KEBU.orange : status === "closed" || status === "archived" || status === "declined" || status === "withdrawn" ? KEBU.faint : KEBU.muted;
  const label = kind === "listing" ? listingStatusLabel(status, lang) : applicationStatusLabel(status, lang);
  return <span className="rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wide" style={{ borderColor: tone, color: tone }}>{label}</span>;
}

export function LigueyEmployerPanel({ businessId, initialListings }: { businessId: string; initialListings: Listing[] }) {
  const { lang } = useLocale();
  const t = (key: LigueyKey) => ligueyT(lang, key);
  const [listings, setListings] = useState(initialListings);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applicationsByListing, setApplicationsByListing] = useState<Record<string, Application[]>>({});
  const [profilesByListing, setProfilesByListing] = useState<Record<string, ApplicantProfile[]>>({});
  const [evidenceByListing, setEvidenceByListing] = useState<Record<string, EvidenceLink[]>>({});
  const [evidenceNodesByListing, setEvidenceNodesByListing] = useState<Record<string, EvidenceNode[]>>({});
  const [insightByApplication, setInsightByApplication] = useState<Record<string, ApplicantInsight>>({});
  const [insightBusyApplicationId, setInsightBusyApplicationId] = useState<string | null>(null);
  const [insightErrorByApplication, setInsightErrorByApplication] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [employmentType, setEmploymentType] = useState<typeof EMPLOYMENT_TYPES[number]>("full_time");
  const [locationType, setLocationType] = useState<typeof LOCATION_TYPES[number]>("onsite");
  const [location, setLocation] = useState("");

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/liguey/employers/${businessId}/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, requirements, employmentType, locationType, location }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Could not create listing."); return; }
      setListings((prev) => [body.listing, ...prev]);
      setTitle(""); setDescription(""); setRequirements(""); setLocation("");
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(listingId: string, status: string) {
    setError(null);
    try {
      const res = await fetch(`/api/liguey/employers/${businessId}/listings/${listingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Could not update this listing."); return; }
      setListings((prev) => prev.map((listing) => (listing.id === listingId ? body.listing : listing)));
    } catch {
      setError("Could not update this listing. Retry when connected.");
    }
  }

  async function toggleExpand(listingId: string) {
    if (expandedId === listingId) { setExpandedId(null); return; }
    setExpandedId(listingId);
    if (!applicationsByListing[listingId]) {
      setError(null);
      try {
        const res = await fetch(`/api/liguey/employers/${businessId}/listings/${listingId}`);
        const body = await res.json();
        if (!res.ok) { setError(body.error ?? "Could not load applicants."); return; }
        setApplicationsByListing((prev) => ({ ...prev, [listingId]: body.applications }));
        setProfilesByListing((prev) => ({ ...prev, [listingId]: body.applicantProfiles ?? [] }));
        setEvidenceByListing((prev) => ({ ...prev, [listingId]: body.applicantEvidence ?? [] }));
        setEvidenceNodesByListing((prev) => ({ ...prev, [listingId]: body.evidenceNodes ?? [] }));
        const insights: Array<ApplicantInsight & { application_id: string }> = body.applicantInsights ?? [];
        setInsightByApplication((prev) => {
          const next = { ...prev };
          for (const insight of insights) next[insight.application_id] = insight;
          return next;
        });
      } catch {
        setError("Could not load applicants. Retry when connected.");
      }
    }
  }

  async function decide(listingId: string, applicationId: string, status: string) {
    setError(null);
    try {
      const res = await fetch(`/api/liguey/employers/${businessId}/listings/${listingId}/applications/${applicationId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Could not record this decision."); return; }
      setApplicationsByListing((prev) => ({
        ...prev,
        [listingId]: (prev[listingId] ?? []).map((application) => (application.id === applicationId ? { ...application, status } : application)),
      }));
    } catch {
      setError("Could not record this decision. Retry when connected.");
    }
  }

  async function askYande(listingId: string, applicationId: string) {
    if (insightBusyApplicationId) return;
    setInsightBusyApplicationId(applicationId);
    setInsightErrorByApplication((prev) => ({ ...prev, [applicationId]: "" }));
    try {
      const res = await fetch(`/api/liguey/employers/${businessId}/listings/${listingId}/applications/${applicationId}/insight`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) { setInsightErrorByApplication((prev) => ({ ...prev, [applicationId]: body.error ?? "Yande could not review this applicant." })); return; }
      setInsightByApplication((prev) => ({ ...prev, [applicationId]: body.insight }));
    } catch {
      setInsightErrorByApplication((prev) => ({ ...prev, [applicationId]: "Yande could not review this applicant. Retry when connected." }));
    } finally {
      setInsightBusyApplicationId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[840px] px-4 py-4 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4" style={fieldStyle}>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">{t("brand")}</p>
          <h1 className="mt-1 text-[26px] tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>{t("employer_title")}</h1>
        </div>
        <LanguageBar variant="builder" />
      </header>

      {error ? <div className="mt-4 rounded-[10px] border px-3 py-2 text-[10px]" style={{ borderColor: "#FFB3B3", color: "#B00020", background: "#FFF3F3" }}>{error}</div> : null}

      <section className="mt-6 rounded-[14px] border p-4" style={fieldStyle}>
        <p className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>{t("employer_new_listing")}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("employer_field_title")} maxLength={160} className="col-span-2 rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle} />
          <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value as typeof employmentType)} className="rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle}>
            {EMPLOYMENT_TYPES.map((value) => <option key={value} value={value}>{employmentTypeLabel(value, lang)}</option>)}
          </select>
          <select value={locationType} onChange={(e) => setLocationType(e.target.value as typeof locationType)} className="rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle}>
            {LOCATION_TYPES.map((value) => <option key={value} value={value}>{locationTypeLabel(value, lang)}</option>)}
          </select>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("employer_field_location")} className="col-span-2 rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("employer_field_description")} rows={2} className="col-span-2 rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle} />
          <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder={t("employer_field_requirements")} rows={2} className="col-span-2 rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle} />
        </div>
        <button type="button" disabled={creating || !title.trim()} onClick={handleCreate} className="mt-3 rounded-full bg-black px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-40">
          {creating ? t("employer_creating") : t("employer_create")}
        </button>
      </section>

      <section className="mt-6 space-y-2">
        {listings.map((listing) => (
          <div key={listing.id} className="rounded-[12px] border p-3" style={fieldStyle}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-black">{listing.title}</p>
                <p className="mt-0.5 text-[9px]" style={{ color: KEBU.faint }}>{employmentTypeLabel(listing.employment_type, lang)} · {locationTypeLabel(listing.location_type, lang)}{listing.location ? ` · ${listing.location}` : ""}</p>
              </div>
              <StatusPill status={listing.status} lang={lang} kind="listing" />
            </div>
            {listing.status === "published" ? (
              <p className="mt-1 text-[9px]">
                {t("employer_public_link_label")}: <a href={`/j/${listing.public_id}`} target="_blank" rel="noreferrer" className="underline" style={{ color: KEBU.orange }}>{`/j/${listing.public_id}`}</a>
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {listing.status === "draft" ? <button type="button" onClick={() => updateStatus(listing.id, "published")} className="rounded-full border px-3 py-1 text-[9px] font-black" style={fieldStyle}>{t("employer_publish")}</button> : null}
              {listing.status === "published" ? <button type="button" onClick={() => updateStatus(listing.id, "closed")} className="rounded-full border px-3 py-1 text-[9px] font-black" style={fieldStyle}>{t("employer_close")}</button> : null}
              {listing.status !== "archived" ? <button type="button" onClick={() => updateStatus(listing.id, "archived")} className="rounded-full border px-3 py-1 text-[9px] font-black" style={fieldStyle}>{t("employer_archive")}</button> : null}
              <button type="button" onClick={() => toggleExpand(listing.id)} className="rounded-full border px-3 py-1 text-[9px] font-black" style={{ ...fieldStyle, color: KEBU.orange }}>
                {expandedId === listing.id ? t("employer_hide_applicants") : t("employer_view_applicants")}
              </button>
            </div>
            {expandedId === listing.id ? (
              <div className="mt-3 space-y-2 border-t pt-3" style={fieldStyle}>
                {(applicationsByListing[listing.id] ?? []).length === 0 ? (
                  <p className="text-[9px]" style={{ color: KEBU.faint }}>{t("employer_no_applicants")}</p>
                ) : (
                  applicationsByListing[listing.id].map((application) => {
                    const profile = (profilesByListing[listing.id] ?? []).find((candidate) => candidate.user_id === application.applicant_user_id);
                    const links = (evidenceByListing[listing.id] ?? []).filter((link) => link.user_id === application.applicant_user_id);
                    const nodesById = new Map((evidenceNodesByListing[listing.id] ?? []).map((node) => [node.id, node]));
                    return (
                    <div key={application.id} className="rounded-[10px] border p-2" style={fieldStyle}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[10px] font-semibold">{application.cover_note || t("employer_no_cover_note")}</p>
                        <StatusPill status={application.status} lang={lang} kind="application" />
                      </div>
                      {profile ? (
                        <div className="mt-1.5 space-y-1">
                          {profile.headline ? <p className="text-[9px] font-semibold">{profile.headline}</p> : null}
                          {profile.skills.length ? <p className="text-[8px]" style={{ color: KEBU.faint }}>{t("employer_profile_skills")}: {profile.skills.join(", ")}</p> : null}
                          {profile.languages.length ? <p className="text-[8px]" style={{ color: KEBU.faint }}>{t("employer_profile_languages")}: {profile.languages.join(", ")}</p> : null}
                          {links.length ? (
                            <p className="text-[8px]" style={{ color: KEBU.faint }}>
                              {t("employer_profile_evidence")}: {links.map((link) => link.label || nodesById.get(link.library_node_id)?.title || "—").join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-1.5 text-[8px]" style={{ color: KEBU.faint }}>{t("employer_no_profile")}</p>
                      )}
                      {profile ? (
                        <div className="mt-1.5 border-t pt-1.5" style={fieldStyle}>
                          <button
                            type="button"
                            disabled={insightBusyApplicationId === application.id}
                            onClick={() => void askYande(listing.id, application.id)}
                            className="text-[8px] font-black uppercase tracking-wide disabled:opacity-50"
                            style={{ color: "#6B3FA0" }}
                          >
                            {insightBusyApplicationId === application.id
                              ? t("employer_yande_thinking")
                              : insightByApplication[application.id]
                                ? t("employer_yande_regenerate")
                                : t("employer_yande_ask")}
                          </button>
                          {insightErrorByApplication[application.id] ? (
                            <p className="mt-1 text-[8px]" style={{ color: "#B00020" }}>{insightErrorByApplication[application.id]}</p>
                          ) : null}
                          {insightByApplication[application.id] ? (
                            <div className="mt-1.5 rounded-[8px] p-2" style={{ background: "#F6F0FB" }}>
                              <p className="text-[8px] font-black uppercase tracking-wide" style={{ color: "#6B3FA0" }}>{t("employer_yande_label")}</p>
                              <p className="mt-1 text-[9px]">{insightByApplication[application.id].summary}</p>
                              {insightByApplication[application.id].strengths.length ? (
                                <ul className="mt-1 list-disc pl-3 text-[8px]" style={{ color: KEBU.muted }}>
                                  {insightByApplication[application.id].strengths.map((item, index) => <li key={index}>{item}</li>)}
                                </ul>
                              ) : null}
                              {insightByApplication[application.id].questions_to_ask.length ? (
                                <div className="mt-1">
                                  <p className="text-[8px] font-semibold">{t("employer_yande_questions")}</p>
                                  <ul className="list-disc pl-3 text-[8px]" style={{ color: KEBU.muted }}>
                                    {insightByApplication[application.id].questions_to_ask.map((item, index) => <li key={index}>{item}</li>)}
                                  </ul>
                                </div>
                              ) : null}
                              {insightByApplication[application.id].caution ? (
                                <p className="mt-1 text-[8px]" style={{ color: "#B06A00" }}>⚠ {insightByApplication[application.id].caution}</p>
                              ) : null}
                              <p className="mt-1.5 text-[7px]" style={{ color: KEBU.faint }}>{t("employer_yande_disclaimer")}</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {application.status === "submitted" || application.status === "reviewed" ? (
                        <div className="mt-1.5 flex gap-2">
                          <button type="button" onClick={() => decide(listing.id, application.id, "reviewed")} className="text-[8px] font-black uppercase" style={{ color: KEBU.muted }}>{t("employer_mark_reviewed")}</button>
                          <button type="button" onClick={() => decide(listing.id, application.id, "accepted")} className="text-[8px] font-black uppercase" style={{ color: KEBU.orange }}>{t("employer_accept")}</button>
                          <button type="button" onClick={() => decide(listing.id, application.id, "declined")} className="text-[8px] font-black uppercase" style={{ color: "#B00020" }}>{t("employer_decline")}</button>
                        </div>
                      ) : null}
                    </div>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
        ))}
        {listings.length === 0 ? <p className="text-[10px]" style={{ color: KEBU.faint }}>{t("employer_no_listings")}</p> : null}
      </section>
    </div>
  );
}

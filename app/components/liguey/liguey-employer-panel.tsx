"use client";

import { useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Listing = {
  id: string; public_id: string; title: string; description: string; requirements: string;
  employment_type: string; location_type: string; location: string; status: string;
};
type Application = { id: string; applicant_user_id: string; cover_note: string; status: string; decided_at: string | null; created_at: string };

const fieldStyle = { borderColor: KEBU.borders.default } as const;
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship", "apprenticeship", "gig"] as const;
const LOCATION_TYPES = ["onsite", "remote", "hybrid"] as const;

function StatusPill({ status }: { status: string }) {
  const tone = status === "published" ? KEBU.orange : status === "closed" || status === "archived" ? KEBU.faint : KEBU.muted;
  return <span className="rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wide" style={{ borderColor: tone, color: tone }}>{status.replaceAll("_", " ")}</span>;
}

export function LigueyEmployerPanel({ businessId, initialListings }: { businessId: string; initialListings: Listing[] }) {
  const [listings, setListings] = useState(initialListings);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applicationsByListing, setApplicationsByListing] = useState<Record<string, Application[]>>({});
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
    const res = await fetch(`/api/liguey/employers/${businessId}/listings/${listingId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    const body = await res.json();
    if (res.ok) setListings((prev) => prev.map((listing) => (listing.id === listingId ? body.listing : listing)));
  }

  async function toggleExpand(listingId: string) {
    if (expandedId === listingId) { setExpandedId(null); return; }
    setExpandedId(listingId);
    if (!applicationsByListing[listingId]) {
      const res = await fetch(`/api/liguey/employers/${businessId}/listings/${listingId}`);
      const body = await res.json();
      if (res.ok) setApplicationsByListing((prev) => ({ ...prev, [listingId]: body.applications }));
    }
  }

  async function decide(listingId: string, applicationId: string, status: string) {
    const res = await fetch(`/api/liguey/employers/${businessId}/listings/${listingId}/applications/${applicationId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setApplicationsByListing((prev) => ({
        ...prev,
        [listingId]: (prev[listingId] ?? []).map((application) => (application.id === applicationId ? { ...application, status } : application)),
      }));
    }
  }

  return (
    <div className="mx-auto max-w-[840px] px-4 py-4 sm:px-6">
      <header className="border-b pb-4" style={fieldStyle}>
        <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">Kebu Liguey</p>
        <h1 className="mt-1 text-[26px] tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>Listings and applicants</h1>
      </header>

      {error ? <div className="mt-4 rounded-[10px] border px-3 py-2 text-[10px]" style={{ borderColor: "#FFB3B3", color: "#B00020", background: "#FFF3F3" }}>{error}</div> : null}

      <section className="mt-6 rounded-[14px] border p-4" style={fieldStyle}>
        <p className="text-[9px] font-semibold uppercase tracking-[.1em]" style={{ color: KEBU.muted }}>New listing</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={160} className="col-span-2 rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle} />
          <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value as typeof employmentType)} className="rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle}>
            {EMPLOYMENT_TYPES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select>
          <select value={locationType} onChange={(e) => setLocationType(e.target.value as typeof locationType)} className="rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle}>
            {LOCATION_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (city, region)" className="col-span-2 rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2} className="col-span-2 rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle} />
          <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="Requirements" rows={2} className="col-span-2 rounded-[8px] border px-2 py-1.5 text-[11px]" style={fieldStyle} />
        </div>
        <button type="button" disabled={creating || !title.trim()} onClick={handleCreate} className="mt-3 rounded-full bg-black px-4 py-2 text-[10px] font-black uppercase tracking-wide text-white disabled:opacity-40">
          {creating ? "Creating…" : "Create draft listing"}
        </button>
      </section>

      <section className="mt-6 space-y-2">
        {listings.map((listing) => (
          <div key={listing.id} className="rounded-[12px] border p-3" style={fieldStyle}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-black">{listing.title}</p>
                <p className="mt-0.5 text-[9px]" style={{ color: KEBU.faint }}>{listing.employment_type.replaceAll("_", " ")} · {listing.location_type}{listing.location ? ` · ${listing.location}` : ""}</p>
              </div>
              <StatusPill status={listing.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {listing.status === "draft" ? <button type="button" onClick={() => updateStatus(listing.id, "published")} className="rounded-full border px-3 py-1 text-[9px] font-black" style={fieldStyle}>Publish</button> : null}
              {listing.status === "published" ? <button type="button" onClick={() => updateStatus(listing.id, "closed")} className="rounded-full border px-3 py-1 text-[9px] font-black" style={fieldStyle}>Close</button> : null}
              {listing.status !== "archived" ? <button type="button" onClick={() => updateStatus(listing.id, "archived")} className="rounded-full border px-3 py-1 text-[9px] font-black" style={fieldStyle}>Archive</button> : null}
              <button type="button" onClick={() => toggleExpand(listing.id)} className="rounded-full border px-3 py-1 text-[9px] font-black" style={{ ...fieldStyle, color: KEBU.orange }}>
                {expandedId === listing.id ? "Hide applicants" : "View applicants"}
              </button>
            </div>
            {expandedId === listing.id ? (
              <div className="mt-3 space-y-2 border-t pt-3" style={fieldStyle}>
                {(applicationsByListing[listing.id] ?? []).length === 0 ? (
                  <p className="text-[9px]" style={{ color: KEBU.faint }}>No applications yet.</p>
                ) : (
                  applicationsByListing[listing.id].map((application) => (
                    <div key={application.id} className="rounded-[10px] border p-2" style={fieldStyle}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[10px] font-semibold">{application.cover_note || "No cover note"}</p>
                        <StatusPill status={application.status} />
                      </div>
                      {application.status === "submitted" || application.status === "reviewed" ? (
                        <div className="mt-1.5 flex gap-2">
                          <button type="button" onClick={() => decide(listing.id, application.id, "reviewed")} className="text-[8px] font-black uppercase" style={{ color: KEBU.muted }}>Mark reviewed</button>
                          <button type="button" onClick={() => decide(listing.id, application.id, "accepted")} className="text-[8px] font-black uppercase" style={{ color: KEBU.orange }}>Accept</button>
                          <button type="button" onClick={() => decide(listing.id, application.id, "declined")} className="text-[8px] font-black uppercase" style={{ color: "#B00020" }}>Decline</button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ))}
        {listings.length === 0 ? <p className="text-[10px]" style={{ color: KEBU.faint }}>No listings yet.</p> : null}
      </section>
    </div>
  );
}

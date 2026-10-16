"use client";

import { useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Application = { id: string; listing_id: string; status: string; cover_note: string; created_at: string };
type Listing = { id: string; title: string; status: string };

const fieldStyle = { borderColor: KEBU.borders.default } as const;

export function LigueyApplicationsPanel({ initialApplications, initialListings }: { initialApplications: Application[]; initialListings: Listing[] }) {
  const [applications, setApplications] = useState(initialApplications);
  const listingById = new Map(initialListings.map((listing) => [listing.id, listing]));

  async function withdraw(applicationId: string) {
    const res = await fetch("/api/liguey/applications", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId }),
    });
    if (res.ok) setApplications((prev) => prev.map((application) => (application.id === applicationId ? { ...application, status: "withdrawn" } : application)));
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-4 sm:px-6">
      <header className="border-b pb-4" style={fieldStyle}>
        <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">Kebu Liguey</p>
        <h1 className="mt-1 text-[26px] tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>Your applications</h1>
      </header>

      <section className="mt-6 space-y-2">
        {applications.map((application) => {
          const listing = listingById.get(application.listing_id);
          return (
            <div key={application.id} className="flex items-center gap-3 rounded-[12px] border p-3" style={fieldStyle}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-black">{listing?.title ?? "Listing"}</p>
                <p className="mt-0.5 text-[9px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{application.status.replaceAll("_", " ")}</p>
              </div>
              {application.status === "submitted" || application.status === "reviewed" ? (
                <button type="button" onClick={() => withdraw(application.id)} className="shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-black" style={fieldStyle}>Withdraw</button>
              ) : null}
            </div>
          );
        })}
        {applications.length === 0 ? <p className="text-[10px]" style={{ color: KEBU.faint }}>You haven&apos;t applied to anything yet.</p> : null}
      </section>
    </div>
  );
}

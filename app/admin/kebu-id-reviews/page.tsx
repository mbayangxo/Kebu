"use client";

import { useCallback, useEffect, useState } from "react";

type PendingAfriId = {
  user_id: string;
  public_afrique_id: string;
  country_code: string;
  identity_type: string;
  eligibility_status: string;
  created_at: string;
};

type PendingDocumentReview = {
  id: string;
  public_kebu_id: string;
  legal_name: string;
  verification_level: number;
};

/**
 * Admin queue for AfriID eligibility review and Kebu ID document review —
 * the two gates verification levels 3 and 4 depend on
 * (lib/kebu-id/verification-level.ts). Did not exist before this slice;
 * previously these could only be reviewed by direct database access.
 */
export default function KebuIdReviewsPage() {
  const [afriIds, setAfriIds] = useState<PendingAfriId[]>([]);
  const [documentReviews, setDocumentReviews] = useState<PendingDocumentReview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/kebu-id-reviews", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Could not load review queue.");
      return;
    }
    setError(null);
    setAfriIds(json.pendingAfriIds ?? []);
    setDocumentReviews(json.pendingDocumentReviews ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function reviewAfriId(userId: string, decision: "verified" | "rejected") {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/afriid/${userId}/review`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not save review.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function reviewDocuments(businessId: string) {
    setBusyId(businessId);
    try {
      const res = await fetch(`/api/admin/kebu-id/${businessId}/review-documents`, {
        method: "PATCH",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not save review.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-white px-5 py-8 sm:px-10">
      <h1 className="mb-6 text-lg font-black">Kebu ID & AfriID review queue</h1>
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider">AfriID eligibility review</h2>
        {afriIds.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing pending.</p>
        ) : (
          <ul className="space-y-3">
            {afriIds.map((aid) => (
              <li key={aid.user_id} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <p className="text-sm font-semibold">{aid.public_afrique_id}</p>
                  <p className="text-xs text-neutral-500">
                    {aid.identity_type} · {aid.country_code} · {aid.eligibility_status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === aid.user_id}
                    onClick={() => void reviewAfriId(aid.user_id, "verified")}
                    className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === aid.user_id}
                    onClick={() => void reviewAfriId(aid.user_id, "rejected")}
                    className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider">Kebu ID document review (level 4)</h2>
        {documentReviews.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing pending.</p>
        ) : (
          <ul className="space-y-3">
            {documentReviews.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <p className="text-sm font-semibold">{b.legal_name}</p>
                  <p className="text-xs text-neutral-500">
                    {b.public_kebu_id} · currently level {b.verification_level}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === b.id}
                  onClick={() => void reviewDocuments(b.id)}
                  className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  Mark reviewed
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

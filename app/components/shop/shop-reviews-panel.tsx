"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Review = {
  id: string;
  productId: string;
  rating: number;
  title: string;
  body: string;
  reviewerName: string;
  status: string;
};

export function ShopReviewsPanel({ projectId }: { projectId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/reviews`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    else setError(typeof data.error === "string" ? data.error : "Could not load reviews.");
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(reviewId: string, status: "approved" | "rejected") {
    await fetch(`/api/projects/${projectId}/reviews`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, status }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" style={{ color: KEBU.black }}>
        Product reviews
      </h2>
      <p className="text-sm" style={{ color: KEBU.muted }}>
        Approve customer reviews before they show on your storefront.
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <ul className="space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-xl border p-3" style={{ borderColor: KEBU.border }}>
            <p className="text-sm font-semibold">
              {"★".repeat(r.rating)} {r.reviewerName} · {r.status}
            </p>
            {r.title ? <p className="text-sm mt-1">{r.title}</p> : null}
            {r.body ? <p className="text-xs mt-1 opacity-75">{r.body}</p> : null}
            {r.status === "pending" ? (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="text-[10px] font-bold uppercase px-3 py-1 rounded-full text-white"
                  style={{ background: KEBU.orange }}
                  onClick={() => void moderate(r.id, "approved")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="text-[10px] font-bold uppercase px-3 py-1 rounded-full"
                  style={{ border: `1px solid ${KEBU.border}` }}
                  onClick={() => void moderate(r.id, "rejected")}
                >
                  Reject
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

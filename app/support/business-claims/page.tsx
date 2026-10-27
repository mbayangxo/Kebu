"use client";

import { useCallback, useEffect, useState } from "react";

type Claim = {
  id: string;
  business_id: string;
  claimant_user_id: string;
  note: string;
  proof_file_name: string;
  proofDownloadUrl: string | null;
  status: "pending" | "approved" | "rejected";
  review_reason: string | null;
  created_at: string;
  businesses: { legal_name: string; public_kebu_id: string } | null;
};

export default function BusinessClaimsAdminPage() {
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/support/business-claims");
    if (res.status === 403 || res.status === 401) {
      setForbidden(true);
      return;
    }
    const body = await res.json();
    setClaims(body.claims ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(claimId: string, decision: "approved" | "rejected") {
    const reason = reasonById[claimId]?.trim();
    if (decision === "rejected" && !reason) {
      alert("A rejection needs a reason, for the claimant to see.");
      return;
    }
    setBusyId(claimId);
    const res = await fetch(`/api/support/business-claims/${claimId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reason: reason || undefined }),
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not record decision.");
      return;
    }
    await load();
  }

  if (forbidden) {
    return <main className="mx-auto max-w-2xl px-5 py-10 text-sm">Only Kebu platform admins can review business claims.</main>;
  }

  const pending = (claims ?? []).filter((c) => c.status === "pending");

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-2xl font-black">Business ownership claims</h1>
      <p className="mt-1 text-[11px] text-neutral-500">
        Approving on a business that already has an active member records the decision but does not transfer
        anything — handle membership changes there manually, deliberately, through that business&rsquo;s own team tools.
      </p>

      {claims === null ? <p className="mt-6 text-sm">Loading…</p> : null}
      {claims !== null && pending.length === 0 ? <p className="mt-6 text-sm">No pending claims.</p> : null}

      <div className="mt-6 space-y-4">
        {pending.map((claim) => (
          <div key={claim.id} className="rounded-[14px] border border-neutral-200 p-4">
            <p className="font-semibold">
              {claim.businesses?.legal_name ?? "Unknown business"}{" "}
              <span className="text-[11px] text-neutral-500">{claim.businesses?.public_kebu_id}</span>
            </p>
            <p className="mt-2 text-sm">{claim.note}</p>
            {claim.proofDownloadUrl ? (
              <a href={claim.proofDownloadUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-semibold text-blue-700 underline">
                View proof document ({claim.proof_file_name})
              </a>
            ) : null}
            <textarea
              value={reasonById[claim.id] ?? ""}
              onChange={(e) => setReasonById((prev) => ({ ...prev, [claim.id]: e.target.value }))}
              placeholder="Reason (required for rejection, optional for approval)"
              rows={2}
              className="mt-3 w-full rounded-[10px] border border-neutral-200 p-2 text-sm"
            />
            <div className="mt-2 flex gap-2">
              <button
                disabled={busyId === claim.id}
                onClick={() => decide(claim.id, "approved")}
                className="rounded-full bg-black px-4 py-1.5 text-sm font-semibold text-white"
              >
                Approve
              </button>
              <button
                disabled={busyId === claim.id}
                onClick={() => decide(claim.id, "rejected")}
                className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-semibold"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

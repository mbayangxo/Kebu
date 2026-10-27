"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

type Business = {
  id: string;
  legal_name: string;
  trading_name: string | null;
  public_kebu_id: string;
  country_code: string;
  category: string;
};

type Claim = {
  id: string;
  status: "pending" | "approved" | "rejected";
  note: string;
  review_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "error"; message: string }
  | { kind: "ready"; business: Business; claims: Claim[]; alreadyMember: boolean };

export default function ClaimBusinessPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/businesses/${params.id}/claim`);
    if (res.status === 404) {
      setState({ kind: "not-found" });
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setState({ kind: "error", message: body.error ?? "Could not load this business." });
      return;
    }
    const body = await res.json();
    setState({ kind: "ready", business: body.business, claims: body.claims, alreadyMember: body.alreadyMember });
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (state.kind === "ready" && state.alreadyMember) {
      router.replace(`/business/${params.id}`);
    }
  }, [state, params.id, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setSubmitError("Attach a proof document.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const form = new FormData();
    form.set("note", note);
    form.set("file", file);
    const res = await fetch(`/api/businesses/${params.id}/claim`, { method: "POST", body: form });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSubmitError(body.error ?? "Could not submit your claim.");
      return;
    }
    setNote("");
    setFile(null);
    await load();
  }

  return (
    <AppShell title="Claim business">
      <main className="mx-auto max-w-xl px-5 py-10">
        <Link href="/business" className="text-[11px] font-semibold" style={{ color: KEBU.muted }}>
          ← Back
        </Link>

        {state.kind === "loading" ? <p className="mt-6 text-sm">Loading…</p> : null}

        {state.kind === "not-found" ? (
          <div className="mt-6 rounded-[14px] border border-dashed p-8 text-center" style={{ borderColor: KEBU.border }}>
            <p className="font-semibold">This business doesn&rsquo;t exist, or you don&rsquo;t have a link to it.</p>
          </div>
        ) : null}

        {state.kind === "error" ? (
          <div className="mt-6 rounded-[14px] border p-8 text-center" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg }}>
            <p className="font-semibold" style={{ color: KEBU.status.errorText }}>
              {state.message}
            </p>
          </div>
        ) : null}

        {state.kind === "ready" ? (
          <>
            <h1 className="mt-4 text-2xl font-black">Claim {state.business.trading_name ?? state.business.legal_name}</h1>
            <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>
              {state.business.public_kebu_id} · {state.business.country_code} · {state.business.category}
            </p>

            {state.claims.length > 0 ? (
              <div className="mt-6 space-y-3">
                {state.claims.map((claim) => (
                  <div key={claim.id} className="rounded-[14px] border p-4" style={{ borderColor: KEBU.border }}>
                    <p className="text-sm font-semibold">
                      {claim.status === "pending" ? "Your claim is pending review." : null}
                      {claim.status === "approved" ? "Your claim was approved." : null}
                      {claim.status === "rejected" ? "Your claim was rejected." : null}
                    </p>
                    {claim.review_reason ? <p className="mt-1 text-sm">{claim.review_reason}</p> : null}
                    <p className="mt-1 text-[10px]" style={{ color: KEBU.faint }}>
                      Submitted {new Date(claim.created_at).toLocaleDateString()}
                      {claim.reviewed_at ? ` · reviewed ${new Date(claim.reviewed_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {state.claims.every((c) => c.status === "rejected") ? (
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>
                    Why is this your business?
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    minLength={10}
                    maxLength={2000}
                    required
                    className="mt-1 w-full rounded-[10px] border p-3 text-sm"
                    style={{ borderColor: KEBU.border }}
                    placeholder="Explain your relationship to this business and why the record should belong to you."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>
                    Proof document (PDF, JPEG, PNG, or WebP — up to 10 MB)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    required
                    className="mt-1 block w-full text-sm"
                  />
                </div>
                {submitError ? (
                  <p className="text-sm" style={{ color: KEBU.status.errorText }}>
                    {submitError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full px-5 py-2.5 text-sm font-black"
                  style={{ background: KEBU.black, color: KEBU.bright }}
                >
                  {submitting ? "Submitting…" : "Submit claim"}
                </button>
              </form>
            ) : null}
          </>
        ) : null}
      </main>
    </AppShell>
  );
}

"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

export default function PublicContractPage() {
  const { publicId: raw } = useParams<{ publicId: string }>();
  const publicId = (raw || "").trim().toLowerCase();
  const [contract, setContract] = useState<{
    title: string;
    counterpartyName: string;
    bodyText: string;
    status: string;
    acceptedName: string | null;
    businessName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!publicId) return;
    void (async () => {
      const res = await fetch(`/api/public/contracts/${encodeURIComponent(publicId)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Not found.");
        return;
      }
      setContract(json.contract);
    })();
  }, [publicId]);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    if (!publicId) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/public/contracts/${encodeURIComponent(publicId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptedName: name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(typeof json.error === "string" ? json.error : "Could not accept.");
        return;
      }
      setNote("Contract accepted. Thank you.");
      setContract((c) => (c ? { ...c, status: "accepted", acceptedName: name } : c));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-bold">Contract</h1>
        <p className="mt-3 text-sm text-red-700">{error}</p>
      </main>
    );
  }
  if (!contract) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <p className="text-sm opacity-70">Loading contract…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
        Contract · {contract.businessName}
      </p>
      <h1 className="mt-2 text-2xl font-bold">{contract.title}</h1>
      <p className="mt-1 text-sm opacity-70">
        For {contract.counterpartyName} · Status: {contract.status}
      </p>
      <pre
        className="mt-6 whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-relaxed"
        style={{ border: `1px solid ${KEBU.border}` }}
      >
        {contract.bodyText}
      </pre>

      {contract.status === "accepted" ? (
        <p className="mt-6 text-sm font-medium">
          Accepted by {contract.acceptedName || "counterparty"}.
        </p>
      ) : (
        <form className="mt-6 space-y-3" onSubmit={(e) => void accept(e)}>
          <p className="text-xs opacity-70">
            Type your full legal name to accept. This records acceptance on Kebu (not a notarized e-sign
            product yet).
          </p>
          <input
            required
            maxLength={120}
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
          />
          {note ? <p className="text-sm">{note}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
            style={{ background: KEBU.black }}
          >
            {busy ? "Saving…" : "Accept contract"}
          </button>
        </form>
      )}
    </main>
  );
}

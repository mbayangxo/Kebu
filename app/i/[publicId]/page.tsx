"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

export default function PublicInvoicePage() {
  const { publicId: raw } = useParams<{ publicId: string }>();
  const publicId = (raw || "").trim().toLowerCase();
  const [data, setData] = useState<{
    number: string;
    clientName: string;
    amountXof: number;
    status: string;
    dueAt: string | null;
    notes: string;
    businessName: string;
    lines: { description: string; quantity: number; unitAmountXof: number; lineTotal: number }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicId) return;
    void (async () => {
      const res = await fetch(`/api/public/invoices/${encodeURIComponent(publicId)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Not found.");
        return;
      }
      setData(json.invoice);
    })();
  }, [publicId]);

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-bold">Invoice</h1>
        <p className="mt-3 text-sm text-red-700">{error}</p>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <p className="text-sm opacity-70">Loading invoice…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12" style={{ background: KEBU.cream }}>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
        Invoice · {data.businessName}
      </p>
      <h1 className="mt-2 text-2xl font-bold">{data.number}</h1>
      <p className="mt-1 text-sm opacity-70">
        Bill to {data.clientName} · Status: {data.status}
        {data.dueAt ? ` · Due ${new Date(data.dueAt).toLocaleDateString()}` : ""}
      </p>
      <ul className="mt-6 space-y-2 rounded-2xl bg-white p-4" style={{ border: `1px solid ${KEBU.border}` }}>
        {data.lines.map((l, i) => (
          <li key={i} className="flex justify-between gap-2 text-sm">
            <span>
              {l.description} × {l.quantity}
            </span>
            <span className="tabular-nums">{l.lineTotal.toLocaleString()} XOF</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-right text-lg font-bold tabular-nums">
        Total {data.amountXof.toLocaleString()} XOF
      </p>
      {data.notes ? <p className="mt-4 text-sm opacity-80">{data.notes}</p> : null}
      <p className="mt-6 text-[11px] opacity-60">
        Payment is confirmed only by {data.businessName} on Kebu — this page does not mark the invoice paid.
      </p>
    </main>
  );
}

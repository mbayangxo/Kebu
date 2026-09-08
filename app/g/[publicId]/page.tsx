"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type GiftView = {
  orderNumber: string | null;
  status: string;
  recipientName: string;
  giftMessage: string;
  productName: string;
  quantity: number;
  priceLabel: string;
  storeName: string;
  createdAt: string;
  items: { product_name: string; quantity: number; price_label: string }[];
};

export default function PublicGiftPage() {
  const { publicId: raw } = useParams<{ publicId: string }>();
  const publicId = (raw || "").trim().toLowerCase();
  const [gift, setGift] = useState<GiftView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicId) return;
    void (async () => {
      const res = await fetch(`/api/public/gifts/${encodeURIComponent(publicId)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Not found.");
        return;
      }
      setGift(json.gift as GiftView);
    })();
  }, [publicId]);

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-bold">Gift</h1>
        <p className="mt-3 text-sm text-red-700">{error}</p>
      </main>
    );
  }

  if (!gift) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <p className="text-sm opacity-70">Loading gift…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12" style={{ background: KEBU.cream, color: KEBU.black }}>
      <div className="mx-auto max-w-lg">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
          A gift from {gift.storeName}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          For {gift.recipientName}
        </h1>
        {gift.giftMessage ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed opacity-90">
            {gift.giftMessage}
          </p>
        ) : (
          <p className="mt-4 text-sm opacity-70">Someone bought this for you on Kebu.</p>
        )}

        <section
          className="mt-8 rounded-2xl p-4"
          style={{ background: "#fff", border: `1px solid ${KEBU.border}` }}
        >
          <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.faint }}>
            Order
          </h2>
          {gift.items?.length > 1 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {gift.items.map((it, i) => (
                <li key={i}>
                  {it.quantity}× {it.product_name}
                  {it.price_label ? ` · ${it.price_label}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm font-semibold">
              {gift.quantity}× {gift.productName}
              {gift.priceLabel ? ` · ${gift.priceLabel}` : ""}
            </p>
          )}
          <p className="mt-3 text-xs opacity-60">
            Ref {gift.orderNumber || "—"} · Status: {gift.status}
          </p>
        </section>

        <p className="mt-8 text-[11px] opacity-50">
          The shop will contact you about delivery. This page does not show payment details.
        </p>
      </div>
    </main>
  );
}

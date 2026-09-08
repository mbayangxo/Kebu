"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type GiftCard = {
  id: string;
  code: string;
  balanceXof: number;
  initialBalanceXof: number;
  status: string;
};

export function ShopGiftCardsPanel({ projectId }: { projectId: string }) {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [amount, setAmount] = useState("5000");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/gift-cards`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setCards(Array.isArray(data.giftCards) ? data.giftCards : []);
    else setError(typeof data.error === "string" ? data.error : "Could not load gift cards.");
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/gift-cards`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialBalanceXof: Number(amount), note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not issue card.");
        return;
      }
      setNote("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(cardId: string, status: "active" | "disabled") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/gift-cards/${cardId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not update card.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" style={{ color: KEBU.black }}>
        Gift cards
      </h2>
      <p className="text-sm" style={{ color: KEBU.muted }}>
        Issue store credit codes. Customers enter the code at checkout — balance drops when the order saves.
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <form onSubmit={(e) => void issue(e)} className="space-y-2 rounded-2xl border p-4" style={{ borderColor: KEBU.border }}>
        <label className="block text-xs font-semibold">
          Amount (XOF)
          <input
            type="number"
            min={500}
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <input
          className="w-full rounded-lg px-2 py-1.5 text-sm"
          style={{ border: `1px solid ${KEBU.border}` }}
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full px-4 py-2 text-[10px] font-bold uppercase text-white disabled:opacity-50"
          style={{ background: KEBU.orange }}
        >
          Issue gift card
        </button>
      </form>
      <ul className="space-y-2">
        {cards.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: KEBU.border }}
          >
            <div>
              <span className="font-mono font-semibold">{c.code}</span>
              <span className="ml-2 opacity-70">
                {c.balanceXof.toLocaleString()} / {c.initialBalanceXof.toLocaleString()} XOF · {c.status}
              </span>
            </div>
            {c.status === "active" || c.status === "disabled" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void setStatus(c.id, c.status === "active" ? "disabled" : "active")}
                className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase disabled:opacity-50"
                style={{ border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
              >
                {c.status === "active" ? "Disable" : "Enable"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

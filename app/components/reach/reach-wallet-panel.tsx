"use client";

import { useEffect, useState } from "react";
import { REACH_TOPUP_MAX_CAURIS } from "@/lib/reach/auction";

/** Owner Reach credits wallet (S10b — platform credits, not card charge). */
export function ReachWalletPanel() {
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/reach/wallet", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load wallet.");
      return;
    }
    setBalance(Number(data.balanceCauris ?? 0));
    setNote(typeof data.honestNote === "string" ? data.honestNote : null);
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function topUp() {
    setBusy(true);
    try {
      const res = await fetch("/api/reach/wallet", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCauris: amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Top up failed.");
        return;
      }
      setBalance(Number(data.balanceCauris ?? 0));
      setNote(typeof data.note === "string" ? data.note : null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Reach wallet</p>
        <p className="font-display text-xl font-bold mt-1">
          {balance == null ? "…" : `${balance} Cauris`}
        </p>
        <p className="text-[11px] opacity-60 mt-1 leading-relaxed">
          Platform credits for board CPC. Not charged to Wave/card yet — ledgered so spend is real
          when someone clicks your placement.
        </p>
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {note ? <p className="text-[11px] opacity-70">{note}</p> : null}
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs font-semibold">
          Top up
          <input
            type="number"
            min={1}
            max={REACH_TOPUP_MAX_CAURIS}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 1)}
            className="mt-1 block w-28 rounded-lg border border-black/10 px-2 py-1.5"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void topUp()}
          className="rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          style={{ background: "#0F0D33" }}
        >
          {busy ? "Adding…" : "Add credits"}
        </button>
      </div>
    </section>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Affiliate = {
  code: string;
  affiliateName: string;
  commissionPercent: number | null;
  isActive: boolean;
  orders: number;
  revenuePaidXof: number;
  commissionOwedXof: number | null;
};

function formatXof(n: number): string {
  return `${Math.round(n).toLocaleString()} XOF`;
}

export function ShopAffiliatesPanel({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [affiliateName, setAffiliateName] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/affiliates`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load affiliate codes.");
        setRows([]);
        return;
      }
      setRows(Array.isArray(data.affiliates) ? data.affiliates : []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/affiliates`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          affiliateName,
          commissionPercent: commissionPercent.trim() ? Number(commissionPercent) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create affiliate code.");
        return;
      }
      setCode("");
      setAffiliateName("");
      setCommissionPercent("");
      setNote("Affiliate code saved. Share a link with ?aff=CODE — orders that use it are attributed here.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold" style={{ color: KEBU.black }}>
          Affiliates
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: KEBU.muted }}>
          Separate from discount codes — an affiliate code never changes the order price. It just attributes a
          sale to whoever drove it, so you can see real orders and revenue per affiliate here. Commission owed is
          bookkeeping only: Kebu does not send anyone money automatically — settle it yourself.
        </p>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Loading…
        </p>
      ) : null}
      {error ? <p className="text-sm" style={{ color: "#8B1E1E" }}>{error}</p> : null}
      {note ? (
        <p className="text-xs rounded-xl px-3 py-2" style={{ background: KEBU.cream }}>
          {note}
        </p>
      ) : null}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.code}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm"
            style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
          >
            <div>
              <p className="font-semibold tracking-wide">
                {r.code} · {r.affiliateName}
                {r.commissionPercent != null ? ` · ${r.commissionPercent}% commission` : ""}
              </p>
              <p className="text-[10px] opacity-60">
                {r.orders} order{r.orders === 1 ? "" : "s"} attributed · {formatXof(r.revenuePaidXof)} paid revenue
                {r.commissionOwedXof != null ? ` · ${formatXof(r.commissionOwedXof)} commission owed` : ""}
                {" · "}
                {r.isActive ? "active" : "off"}
              </p>
            </div>
          </li>
        ))}
        {!loading && rows.length === 0 ? (
          <p className="text-sm" style={{ color: KEBU.muted }}>
            No affiliate codes yet — create one below.
          </p>
        ) : null}
      </ul>

      <form onSubmit={(e) => void create(e)} className="space-y-2 rounded-2xl p-4" style={{ background: KEBU.cream }}>
        <p className="text-[10px] font-bold uppercase tracking-wider">New affiliate code</p>
        <input
          className="w-full rounded-lg px-3 py-2 text-sm bg-white"
          style={{ border: `1px solid ${KEBU.border}` }}
          placeholder="MARIE10"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
        />
        <input
          className="w-full rounded-lg px-3 py-2 text-sm bg-white"
          style={{ border: `1px solid ${KEBU.border}` }}
          placeholder="Affiliate name (e.g. Marie Diop)"
          value={affiliateName}
          onChange={(e) => setAffiliateName(e.target.value)}
          required
        />
        <label className="block text-[10px] uppercase tracking-wider">
          Commission % (optional, bookkeeping only)
          <input
            type="number"
            min={1}
            max={90}
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm bg-white"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(e.target.value)}
            placeholder="Leave blank to track orders only"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: KEBU.orange }}
        >
          {busy ? "Saving…" : "Create affiliate code"}
        </button>
      </form>
    </div>
  );
}

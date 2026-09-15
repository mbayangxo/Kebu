"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Discount = {
  id: string;
  code: string;
  percent_off: number;
  is_active: boolean;
  max_uses: number | null;
  uses_count: number;
  campaign_id: string | null;
  note: string | null;
  created_at: string;
};

type CampaignOpt = { id: string; subject: string; status: string };

export function ShopDiscountsPanel({
  projectId,
  businessId,
}: {
  projectId: string;
  businessId: string | null;
}) {
  const [rows, setRows] = useState<Discount[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [campaignId, setCampaignId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dRes, cRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/discounts`, { credentials: "include" }),
        businessId
          ? fetch(`/api/businesses/${businessId}/campaigns`, { credentials: "include" })
          : Promise.resolve(null),
      ]);
      const dData = await dRes.json().catch(() => ({}));
      if (!dRes.ok) {
        setError(typeof dData.error === "string" ? dData.error : "Could not load discounts.");
        setRows([]);
      } else {
        setRows(Array.isArray(dData.discounts) ? dData.discounts : []);
      }
      if (cRes) {
        const cData = await cRes.json().catch(() => ({}));
        if (cRes.ok && Array.isArray(cData.campaigns)) {
          setCampaigns(
            cData.campaigns.map((c: CampaignOpt) => ({
              id: c.id,
              subject: c.subject,
              status: c.status,
            })),
          );
        }
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId, businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/discounts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          percentOff: Number(percent),
          maxUses: maxUses.trim() ? Number(maxUses) : null,
          campaignId: campaignId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create code.");
        return;
      }
      setCode("");
      setPercent("10");
      setMaxUses("");
      setCampaignId("");
      setNote("Discount code saved. Customers can enter it on Place order.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, isActive: boolean) {
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/discounts/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold" style={{ color: KEBU.black }}>
          Discounts
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: KEBU.muted }}>
          Percent-off codes for Place order. Attach a draft email campaign so recovery / promo emails can mention
          the same code. Not a full Shopify coupon engine — one % off per order.
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
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm"
            style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
          >
            <div>
              <p className="font-semibold tracking-wide">
                {r.code} · {r.percent_off}% off
              </p>
              <p className="text-[10px] opacity-60">
                Used {r.uses_count}
                {r.max_uses != null ? ` / ${r.max_uses}` : ""} · {r.is_active ? "active" : "off"}
                {r.campaign_id ? " · linked to campaign" : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              className="text-[10px] font-bold uppercase underline"
              onClick={() => void toggle(r.id, !r.is_active)}
            >
              {r.is_active ? "Deactivate" : "Activate"}
            </button>
          </li>
        ))}
        {!loading && rows.length === 0 ? (
          <p className="text-sm" style={{ color: KEBU.muted }}>
            No codes yet — create one below.
          </p>
        ) : null}
      </ul>

      <form onSubmit={(e) => void create(e)} className="space-y-2 rounded-2xl p-4" style={{ background: KEBU.cream }}>
        <p className="text-[10px] font-bold uppercase tracking-wider">New code</p>
        <input
          className="w-full rounded-lg px-3 py-2 text-sm bg-white"
          style={{ border: `1px solid ${KEBU.border}` }}
          placeholder="WELCOME10"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[10px] uppercase tracking-wider">
            % off
            <input
              type="number"
              min={1}
              max={90}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm bg-white"
              style={{ border: `1px solid ${KEBU.border}` }}
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              required
            />
          </label>
          <label className="block text-[10px] uppercase tracking-wider">
            Max uses (optional)
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm bg-white"
              style={{ border: `1px solid ${KEBU.border}` }}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
            />
          </label>
        </div>
        {campaigns.length > 0 ? (
          <label className="block text-[10px] uppercase tracking-wider">
            Attach email campaign (optional)
            <select
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm bg-white"
              style={{ border: `1px solid ${KEBU.border}` }}
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">None</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.subject} ({c.status})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-[10px] opacity-60">
            Link a business email campaign later from Business → Email (draft campaigns appear here).
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: KEBU.orange }}
        >
          {busy ? "Saving…" : "Create discount"}
        </button>
      </form>
    </div>
  );
}

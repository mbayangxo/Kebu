"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudioWorldNav } from "@/app/components/studio/studio-world-nav";
import { KEBU } from "@/lib/kebu-brand";

type DeveloperAsset = {
  id: string;
  kind: "photo" | "font" | "pattern" | "texture";
  name: string;
  status: "draft" | "published" | "archived";
  acquireCount: number;
  priceCents: number;
};

type DeveloperProfile = { id: string; displayName: string; status: string } | null;

type PayoutSettings = {
  payoutMethod: "wave" | "orange_money" | null;
  payoutPhone: string | null;
  payoutAccountName: string | null;
  complete: boolean;
};

type PayoutRequest = {
  id: string;
  amountCents: number;
  currency: string;
  method: string;
  status: "requested" | "processing" | "paid" | "failed";
  requestedAt: string;
  processedAt: string | null;
  failureReason: string | null;
};

function formatXof(cents: number): string {
  return `${Math.round(cents).toLocaleString()} XOF`;
}

export default function StudioAssetSellPage() {
  const [profile, setProfile] = useState<DeveloperProfile>(null);
  const [items, setItems] = useState<DeveloperAsset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [kind, setKind] = useState<DeveloperAsset["kind"]>("pattern");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [priceXof, setPriceXof] = useState("");

  const [payout, setPayout] = useState<PayoutSettings | null>(null);
  const [liveDisbursement, setLiveDisbursement] = useState<{ wave: boolean; orange_money: boolean } | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<"wave" | "orange_money">("wave");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [payoutAccountName, setPayoutAccountName] = useState("");
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payouts, setPayouts] = useState<PayoutRequest[] | null>(null);
  const [requestAmount, setRequestAmount] = useState("");

  async function refresh() {
    const res = await fetch("/api/studio/creative-assets/developer", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setProfile(data.profile ?? null);
    setItems(Array.isArray(data.items) ? data.items : []);
    setLoaded(true);
  }

  async function refreshPayoutSettings() {
    const res = await fetch("/api/developer/payout-settings", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setPayout(data.settings ?? null);
    setLiveDisbursement(data.liveDisbursement ?? null);
    if (data.settings?.payoutMethod) setPayoutMethod(data.settings.payoutMethod);
    if (data.settings?.payoutPhone) setPayoutPhone(data.settings.payoutPhone);
    if (data.settings?.payoutAccountName) setPayoutAccountName(data.settings.payoutAccountName);
  }

  async function refreshPayouts() {
    const res = await fetch("/api/developer/payouts", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setPayouts(Array.isArray(data.items) ? data.items : []);
  }

  useEffect(() => {
    void refresh();
    void refreshPayoutSettings();
    void refreshPayouts();
  }, []);

  async function savePayoutSettings(event: React.FormEvent) {
    event.preventDefault();
    setPayoutBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/developer/payout-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: payoutMethod, phone: payoutPhone.trim(), accountName: payoutAccountName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not save payout settings.");
      setNote("Payout destination saved. You can now publish paid listings.");
      await refreshPayoutSettings();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save payout settings.");
    } finally {
      setPayoutBusy(false);
    }
  }

  async function requestPayout(event: React.FormEvent) {
    event.preventDefault();
    const amountCents = Math.round(Number(requestAmount) * 1);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError("Enter a payout amount greater than zero.");
      return;
    }
    setPayoutBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/developer/payouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents, currency: "XOF" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not request a payout.");
      setRequestAmount("");
      setNote("Payout requested — it'll show below once processed.");
      await refreshPayouts();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not request a payout.");
    } finally {
      setPayoutBusy(false);
    }
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const priceCents = priceXof.trim() ? Math.round(Number(priceXof) * 1) : 0;
      if (priceXof.trim() && (!Number.isFinite(priceCents) || priceCents <= 0)) {
        throw new Error("Price must be a positive XOF amount, or leave it blank for free.");
      }
      const res = await fetch("/api/studio/creative-assets/developer", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profile ? undefined : displayName.trim() || undefined,
          kind,
          name: name.trim(),
          description: description.trim() || undefined,
          fileUrl: fileUrl.trim(),
          previewUrl: previewUrl.trim() || undefined,
          priceCents,
          publish: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not publish this asset.");
      setName("");
      setDescription("");
      setFileUrl("");
      setPreviewUrl("");
      setPriceXof("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not publish this asset.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: DeveloperAsset["status"]) {
    setError(null);
    const res = await fetch(`/api/studio/creative-assets/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Could not update this listing.");
      return;
    }
    await refresh();
  }

  return (
    <div className="min-h-screen bg-[#FFFCF8] text-black">
      <StudioWorldNav />
      <main className="mx-auto max-w-[920px] px-4 py-7 sm:px-7 lg:px-10">
        <header className="mb-7 border-b pb-6" style={{ borderColor: KEBU.borders.default }}>
          <p className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: KEBU.orange }}>Sell on Kebu</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl">Publish a creative asset.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>
            Publish for free, or set a price once your payout destination is on file. <Link href="/studio/assets/marketplace" className="underline">Browse the marketplace</Link> to see what&apos;s already there.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Revenue split", value: "80 / 20", note: "You keep 80% of every sale" },
              { label: "Payout", value: "Wave / OM", note: "Set your payout destination below" },
              { label: "Audience", value: "Africa", note: "Côte d'Ivoire, Sénégal & beyond" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl p-4" style={{ background: "#fff", border: `1px solid ${KEBU.borders.default}` }}>
                <p className="text-2xl font-black" style={{ color: KEBU.black }}>{stat.value}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>{stat.label}</p>
                <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>{stat.note}</p>
              </div>
            ))}
          </div>
        </header>

        {error ? <div role="alert" className="mb-5 rounded-[16px] border px-4 py-3 text-xs font-semibold" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>{error}</div> : null}
        {note ? <div role="status" className="mb-5 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">{note}</div> : null}

        <section className="mb-10 rounded-[20px] border p-5" style={{ borderColor: KEBU.borders.default }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black">Payout settings</h2>
            <span className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wide" style={{ background: payout?.complete ? "#DEF7EC" : "#FDF2E8", color: payout?.complete ? "#03543F" : "#9A4A0B" }}>
              {payout?.complete ? "Ready to sell" : "Not set up"}
            </span>
          </div>
          {liveDisbursement && !liveDisbursement.wave && !liveDisbursement.orange_money ? (
            <p className="mb-4 rounded-[14px] border px-4 py-3 text-[11px]" style={{ borderColor: KEBU.borders.default, color: KEBU.muted }}>
              Automatic instant payouts aren&apos;t connected yet (Wave and Orange Money disbursement both require a merchant contract Kebu hasn&apos;t set up). Your payout destination is still saved for real, and requests you make below are recorded for a Kebu team member to send by hand until that connection is live.
            </p>
          ) : null}
          <form onSubmit={(e) => void savePayoutSettings(e)} className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>Method</span>
              <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as "wave" | "orange_money")} className="mt-2 min-h-11 w-full rounded-xl border px-3 text-sm" style={{ borderColor: KEBU.borders.default }}>
                <option value="wave">Wave</option>
                <option value="orange_money">Orange Money</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>Phone number</span>
              <input required value={payoutPhone} onChange={(e) => setPayoutPhone(e.target.value)} placeholder="+221 7X XXX XX XX" className="mt-2 min-h-11 w-full rounded-xl border px-3 text-sm" style={{ borderColor: KEBU.borders.default }} />
            </label>
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>Name on account</span>
              <input required value={payoutAccountName} onChange={(e) => setPayoutAccountName(e.target.value)} placeholder="As it appears on the account" className="mt-2 min-h-11 w-full rounded-xl border px-3 text-sm" style={{ borderColor: KEBU.borders.default }} />
            </label>
            <div className="sm:col-span-3">
              <button type="submit" disabled={payoutBusy || !payoutPhone.trim() || !payoutAccountName.trim()} className="min-h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-[.12em] text-white disabled:opacity-40" style={{ background: KEBU.black }}>
                {payoutBusy ? "Saving…" : "Save payout destination"}
              </button>
            </div>
          </form>

          {payout?.complete ? (
            <div className="mt-6 border-t pt-5" style={{ borderColor: KEBU.borders.default }}>
              <h3 className="mb-3 text-[11px] font-black uppercase tracking-wide">Request a payout</h3>
              <form onSubmit={(e) => void requestPayout(e)} className="flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>Amount (XOF)</span>
                  <input type="number" min={1} value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)} placeholder="5000" className="mt-2 min-h-11 w-40 rounded-xl border px-3 text-sm" style={{ borderColor: KEBU.borders.default }} />
                </label>
                <button type="submit" disabled={payoutBusy || !requestAmount.trim()} className="min-h-11 rounded-full px-5 text-[10px] font-black uppercase tracking-[.12em] text-white disabled:opacity-40" style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}>
                  Request payout
                </button>
              </form>

              {payouts && payouts.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {payouts.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-[11px]" style={{ borderColor: KEBU.borders.default }}>
                      <span>{formatXof(p.amountCents)} via {p.method === "wave" ? "Wave" : "Orange Money"}</span>
                      <span className="font-black uppercase tracking-wide" style={{ color: p.status === "paid" ? "#059669" : p.status === "failed" ? "#DC2626" : KEBU.muted }}>{p.status}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>

        {loaded && !profile ? (
          <div className="mb-6 rounded-[18px] border p-4" style={{ borderColor: KEBU.borders.default }}>
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>Your developer name</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Shown next to your listings" className="mt-2 min-h-11 w-full border-b bg-transparent text-sm font-semibold outline-none" style={{ borderColor: KEBU.borders.default }} />
            </label>
          </div>
        ) : null}

        <form onSubmit={(e) => void publish(e)} className="mb-10 space-y-4 rounded-[20px] border p-5" style={{ borderColor: KEBU.borders.default }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>Kind</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as DeveloperAsset["kind"])} className="mt-2 min-h-11 w-full rounded-xl border px-3 text-sm" style={{ borderColor: KEBU.borders.default }}>
                <option value="pattern">Pattern</option>
                <option value="texture">Texture</option>
                <option value="photo">Photo</option>
                <option value="font">Font</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>Name</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Kente stripe" className="mt-2 min-h-11 w-full rounded-xl border px-3 text-sm" style={{ borderColor: KEBU.borders.default }} />
            </label>
          </div>
          <label className="block">
            <span className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>Description (optional)</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-2 w-full rounded-xl border p-3 text-sm" style={{ borderColor: KEBU.borders.default }} />
          </label>
          <label className="block">
            <span className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>File URL</span>
            <input required type="url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://…" className="mt-2 min-h-11 w-full rounded-xl border px-3 text-sm" style={{ borderColor: KEBU.borders.default }} />
          </label>
          <label className="block">
            <span className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>Preview image URL (optional)</span>
            <input type="url" value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} placeholder="https://…" className="mt-2 min-h-11 w-full rounded-xl border px-3 text-sm" style={{ borderColor: KEBU.borders.default }} />
          </label>
          <label className="block">
            <span className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>Price in XOF (optional — leave blank for free)</span>
            <input
              type="number"
              min={1}
              value={priceXof}
              onChange={(e) => setPriceXof(e.target.value)}
              placeholder="0"
              disabled={!payout?.complete}
              className="mt-2 min-h-11 w-full rounded-xl border px-3 text-sm disabled:opacity-40"
              style={{ borderColor: KEBU.borders.default }}
            />
            {!payout?.complete ? (
              <span className="mt-1 block text-[10px]" style={{ color: KEBU.muted }}>Set up your payout destination above to publish a priced listing. Free listings don&apos;t need one.</span>
            ) : null}
          </label>
          <p className="rounded-[14px] border px-4 py-3 text-[11px]" style={{ borderColor: KEBU.borders.default, color: KEBU.muted }}>
            Buyers pay for a priced asset through a real Joko checkout — the same rail used for template purchases. Your payout is credited once a buyer completes payment and the webhook confirms it.
          </p>
          <button type="submit" disabled={busy || !name.trim() || !fileUrl.trim()} className="min-h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-[.12em] text-white disabled:opacity-40" style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}>
            {busy ? "Publishing…" : "Publish →"}
          </button>
        </form>

        <section>
          <h2 className="mb-3 text-sm font-black">Your listings</h2>
          {!loaded ? (
            <p className="text-sm" style={{ color: KEBU.muted }}>Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm" style={{ color: KEBU.muted }}>Nothing published yet.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 rounded-[16px] border px-4 py-3" style={{ borderColor: KEBU.borders.default }}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{item.name}</p>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: KEBU.muted }}>
                      {item.kind} · {item.status} · {item.priceCents > 0 ? formatXof(item.priceCents) : "Free"} · {item.acquireCount} added to libraries
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {item.status !== "published" ? (
                      <button type="button" onClick={() => void setStatus(item.id, "published")} className="rounded-full border px-3 py-1.5 text-[9px] font-black uppercase" style={{ borderColor: KEBU.borders.default }}>Publish</button>
                    ) : (
                      <button type="button" onClick={() => void setStatus(item.id, "draft")} className="rounded-full border px-3 py-1.5 text-[9px] font-black uppercase" style={{ borderColor: KEBU.borders.default }}>Unpublish</button>
                    )}
                    {item.status !== "archived" ? (
                      <button type="button" onClick={() => void setStatus(item.id, "archived")} className="rounded-full border px-3 py-1.5 text-[9px] font-black uppercase text-red-600" style={{ borderColor: KEBU.status.errorBorder }}>Archive</button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

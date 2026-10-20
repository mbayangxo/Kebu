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

export default function StudioAssetSellPage() {
  const [profile, setProfile] = useState<DeveloperProfile>(null);
  const [items, setItems] = useState<DeveloperAsset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [kind, setKind] = useState<DeveloperAsset["kind"]>("pattern");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  async function refresh() {
    const res = await fetch("/api/studio/creative-assets/developer", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setProfile(data.profile ?? null);
    setItems(Array.isArray(data.items) ? data.items : []);
    setLoaded(true);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
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
          publish: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not publish this asset.");
      setName("");
      setDescription("");
      setFileUrl("");
      setPreviewUrl("");
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
            Free to publish, free for everyone to use right now. <Link href="/studio/assets/marketplace" className="underline">Browse the marketplace</Link> to see what&apos;s already there.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Revenue split", value: "80 / 20", note: "You'll keep 80% of every sale" },
              { label: "Payout", value: "Wave / OM", note: "Wave & Orange Money, once paid listings launch" },
              { label: "Audience", value: "Africa", note: "Côte d'Ivoire, Sénégal & beyond" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl p-4" style={{ background: "#fff", border: `1px solid ${KEBU.borders.default}` }}>
                <p className="text-2xl font-black" style={{ color: KEBU.black }}>{stat.value}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>{stat.label}</p>
                <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>{stat.note}</p>
              </div>
            ))}
          </div>

          <p className="mt-3 max-w-2xl rounded-[14px] border px-4 py-3 text-[11px]" style={{ borderColor: KEBU.borders.default, color: KEBU.muted }}>
            That split and those payout rails are the plan for when paid listings launch — not live yet. Every asset published today is free to use, for everyone, including yours, and nothing above is a settings form you need to fill in right now. We&apos;ll tell developers before paid listings and real payouts go live.
          </p>
        </header>

        {error ? <div role="alert" className="mb-5 rounded-[16px] border px-4 py-3 text-xs font-semibold" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>{error}</div> : null}

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
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: KEBU.muted }}>{item.kind} · {item.status} · {item.acquireCount} added to libraries</p>
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

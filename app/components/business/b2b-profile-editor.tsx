"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type B2bForm = {
  headline: string;
  about: string;
  logoUrl: string;
  coverUrl: string;
  galleryUrls: string[];
  categories: string;
  minOrderNote: string;
  contactEmail: string;
  contactPhone: string;
  isPublished: boolean;
};

export function B2bProfileEditor({ businessId }: { businessId: string }) {
  const [form, setForm] = useState<B2bForm>({
    headline: "",
    about: "",
    logoUrl: "",
    coverUrl: "",
    galleryUrls: [],
    categories: "",
    minOrderNote: "",
    contactEmail: "",
    contactPhone: "",
    isPublished: false,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/businesses/${businessId}/b2b-profile`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.profile) {
      const p = data.profile;
      setForm({
        headline: p.headline ?? "",
        about: p.about ?? "",
        logoUrl: p.logoUrl ?? "",
        coverUrl: p.coverUrl ?? "",
        galleryUrls: p.galleryUrls ?? [],
        categories: (p.categories ?? []).join(", "),
        minOrderNote: p.minOrderNote ?? "",
        contactEmail: p.contactEmail ?? "",
        contactPhone: p.contactPhone ?? "",
        isPublished: Boolean(p.isPublished),
      });
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File, field: "logoUrl" | "coverUrl") {
    setBusy(true);
    setNote(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/businesses/${businessId}/b2b-profile/upload`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setNote(data.error ?? "Upload failed.");
      return;
    }
    setForm((f) => ({ ...f, [field]: data.url }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    const res = await fetch(`/api/businesses/${businessId}/b2b-profile`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: form.headline,
        about: form.about,
        logoUrl: form.logoUrl,
        coverUrl: form.coverUrl,
        galleryUrls: form.galleryUrls,
        categories: form.categories
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        minOrderNote: form.minOrderNote,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        isPublished: form.isPublished,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setNote(data.error ?? "Could not save.");
      return;
    }
    setNote(form.isPublished ? "B2B profile published to the trade directory." : "Draft saved.");
  }

  if (loading) return <p className="text-sm text-muted">Loading B2B profile…</p>;

  return (
    <form onSubmit={(e) => void save(e)} className="space-y-4 rounded-2xl border border-border bg-white p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: KEBU.orange }}>
          B2B trade profile
        </p>
        <p className="text-sm text-muted">
          Wholesale / supplier page — only visible to other businesses on Kebu. Your B2C customer site is separate in
          Builder.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl p-3 border border-border space-y-2">
          <p className="text-xs font-semibold">Logo — 512×512 PNG</p>
          {form.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logoUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : null}
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f, "logoUrl");
          }} />
          <button type="button" onClick={() => logoRef.current?.click()} className="text-xs font-bold underline">
            Upload logo
          </button>
        </div>
        <div className="rounded-xl p-3 border border-border space-y-2">
          <p className="text-xs font-semibold">Cover — 1200×400 px</p>
          {form.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.coverUrl} alt="" className="h-16 w-full rounded-lg object-cover" />
          ) : null}
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f, "coverUrl");
          }} />
          <button type="button" onClick={() => coverRef.current?.click()} className="text-xs font-bold underline">
            Upload cover
          </button>
        </div>
      </div>

      <label className="block text-sm">
        Headline
        <input
          className="mt-1 w-full rounded-xl border border-border px-3 py-2"
          value={form.headline}
          onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
          placeholder="Wholesale textiles — Dakar"
        />
      </label>
      <label className="block text-sm">
        About (what you sell to other businesses)
        <textarea
          className="mt-1 w-full rounded-xl border border-border px-3 py-2"
          rows={4}
          value={form.about}
          onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
        />
      </label>
      <label className="block text-sm">
        Categories (comma-separated)
        <input
          className="mt-1 w-full rounded-xl border border-border px-3 py-2"
          value={form.categories}
          onChange={(e) => setForm((f) => ({ ...f, categories: e.target.value }))}
          placeholder="fashion, export, MOQ 50 units"
        />
      </label>
      <label className="block text-sm">
        Minimum order note
        <input
          className="mt-1 w-full rounded-xl border border-border px-3 py-2"
          value={form.minOrderNote}
          onChange={(e) => setForm((f) => ({ ...f, minOrderNote: e.target.value }))}
          placeholder="From 50 pieces · CFA 500k minimum"
        />
      </label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          B2B email
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-border px-3 py-2"
            value={form.contactEmail}
            onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          B2B phone / WhatsApp
          <input
            className="mt-1 w-full rounded-xl border border-border px-3 py-2"
            value={form.contactPhone}
            onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isPublished}
          onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
        />
        Publish to B2B directory (other Kebu businesses only)
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-full px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        style={{ background: KEBU.orange }}
      >
        {busy ? "Saving…" : "Save B2B profile"}
      </button>
      {note ? <p className="text-sm" style={{ color: note.includes("Could") ? "#B42318" : "#009E40" }}>{note}</p> : null}
    </form>
  );
}

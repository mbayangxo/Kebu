"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";
import type { BrandDnaRow } from "@/lib/studio/brand-dna";
import { brandDnaCompleteness } from "@/lib/studio/brand-dna";
import { STUDIO_FONTS_CATALOG } from "@/lib/studio/fonts-catalog";

type Business = { id: string; trading_name: string | null; legal_name: string };

/** Brand DNA foundation — permanent creative identity for a Kebu business. */
export default function StudioBrandDnaPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState<string>("");
  const [dna, setDna] = useState<BrandDnaRow | null>(null);
  const [form, setForm] = useState({
    name: "Brand DNA",
    logoUrl: "",
    primaryColor: "#0F0D33",
    accentColor: "#E05A2B",
    backgroundColor: "#FAFAF8",
    textColor: "#0F0D33",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    tagline: "",
    photographyStyle: "",
    voiceTone: "",
    languages: "French, Wolof, English",
    customerNotes: "",
    productsNotes: "",
    visualRules: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const loadBusinesses = useCallback(async () => {
    const res = await fetch("/api/businesses", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.businesses)) {
      setBusinesses(data.businesses);
      if (!businessId && data.businesses[0]?.id) setBusinessId(data.businesses[0].id);
    }
  }, [businessId]);

  const loadDna = useCallback(async (bid: string) => {
    if (!bid) {
      setDna(null);
      return;
    }
    const res = await fetch(`/api/studio/brand-dna?businessId=${bid}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load Brand DNA.");
      return;
    }
    const row = (data.dna ?? data.kits?.[0] ?? null) as BrandDnaRow | null;
    setDna(row);
    if (row) {
      setForm({
        name: row.name,
        logoUrl: row.logo_url,
        primaryColor: row.primary_color,
        accentColor: row.accent_color,
        backgroundColor: row.background_color,
        textColor: row.text_color,
        fontDisplay: row.font_display,
        fontBody: row.font_body,
        tagline: row.tagline,
        photographyStyle: row.photography_style,
        voiceTone: row.voice_tone,
        languages: row.languages.join(", "),
        customerNotes: row.customer_notes,
        productsNotes: row.products_notes,
        visualRules: row.visual_rules,
      });
    }
  }, []);

  useEffect(() => {
    void loadBusinesses();
  }, [loadBusinesses]);

  useEffect(() => {
    if (businessId) void loadDna(businessId);
  }, [businessId, loadDna]);

  async function save() {
    if (!businessId) {
      setError("Pick a business so Brand DNA stays permanent for that Kebu ID.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const body = {
        id: dna?.id,
        businessId,
        name: form.name,
        logoUrl: form.logoUrl,
        primaryColor: form.primaryColor,
        accentColor: form.accentColor,
        backgroundColor: form.backgroundColor,
        textColor: form.textColor,
        fontDisplay: form.fontDisplay,
        fontBody: form.fontBody,
        tagline: form.tagline,
        photographyStyle: form.photographyStyle,
        voiceTone: form.voiceTone,
        languages: form.languages
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 12),
        customerNotes: form.customerNotes,
        productsNotes: form.productsNotes,
        visualRules: form.visualRules,
        approvedImagery: dna?.approved_imagery ?? [],
      };
      const res = await fetch("/api/studio/brand-dna", {
        method: dna?.id ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save.");
        return;
      }
      setDna(data.dna as BrandDnaRow);
      setNote("Brand DNA saved — Studio, Builder, and campaigns can read it.");
    } finally {
      setBusy(false);
    }
  }

  const completeness = dna ? brandDnaCompleteness(dna) : null;

  return (
    <AppShell title="Brand DNA">
      <main className="max-w-2xl mx-auto px-5 py-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: KEBU.orange }}>
          Kebu Studio
        </p>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          Brand DNA
        </h1>
        <p className="text-sm mb-6" style={{ color: KEBU.muted }}>
          Permanent creative identity for your business — colors, voice, photography, languages, rules.
          Creative Director campaigns use this so you stop re-explaining the brand.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          <Link href="/studio" className="text-xs font-bold underline" style={{ color: KEBU.orange }}>
            ← Studio
          </Link>
          <Link href="/studio/campaigns" className="text-xs font-bold underline" style={{ color: KEBU.orange }}>
            Campaigns →
          </Link>
        </div>

        {error ? (
          <p className="mb-4 text-sm" role="alert" style={{ color: KEBU.red }}>
            {error}
          </p>
        ) : null}
        {note ? (
          <p className="mb-4 text-sm" style={{ color: KEBU.orange }}>
            {note}
          </p>
        ) : null}

        <label className="block text-xs font-bold mb-4">
          Business (Kebu ID)
          <select
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: KEBU.border }}
          >
            <option value="">Select…</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.trading_name || b.legal_name}
              </option>
            ))}
          </select>
        </label>

        {completeness ? (
          <p className="text-xs mb-4 font-semibold">
            Completeness {completeness.score}%
            {completeness.missing.length
              ? ` · still add: ${completeness.missing.join(", ")}`
              : " · ready for Creative Director"}
          </p>
        ) : null}

        <div className="space-y-3 rounded-2xl p-5" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
          {(
            [
              ["name", "Name"],
              ["tagline", "Tagline"],
              ["logoUrl", "Logo URL"],
              ["voiceTone", "Voice / tone"],
              ["photographyStyle", "Photography style"],
              ["visualRules", "Visual rules"],
              ["customerNotes", "Customer"],
              ["productsNotes", "Products"],
              ["languages", "Languages (comma-separated)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-xs font-bold">
              {label}
              {key === "voiceTone" ||
              key === "photographyStyle" ||
              key === "visualRules" ||
              key === "customerNotes" ||
              key === "productsNotes" ? (
                <textarea
                  rows={2}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal"
                  style={{ borderColor: KEBU.border }}
                />
              ) : (
                <input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal"
                  style={{ borderColor: KEBU.border }}
                />
              )}
            </label>
          ))}

          <div className="grid grid-cols-2 gap-3">
            {(["primaryColor", "accentColor", "backgroundColor", "textColor"] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 text-xs font-bold">
                <input
                  type="color"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
                {key.replace("Color", "")}
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold">
              Display font
              <select
                value={form.fontDisplay}
                onChange={(e) => setForm((f) => ({ ...f, fontDisplay: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-2 py-2 text-sm font-normal"
              >
                {STUDIO_FONTS_CATALOG.map((f) => (
                  <option key={f.id} value={f.family}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold">
              Body font
              <select
                value={form.fontBody}
                onChange={(e) => setForm((f) => ({ ...f, fontBody: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-2 py-2 text-sm font-normal"
              >
                {STUDIO_FONTS_CATALOG.filter((f) => f.role !== "display" || f.family === "IBM Plex Sans").map(
                  (f) => (
                    <option key={f.id} value={f.family}>
                      {f.label}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="w-full rounded-full py-3 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
            style={{ background: KEBU.orange }}
          >
            {busy ? "Saving…" : dna ? "Update Brand DNA" : "Create Brand DNA"}
          </button>
        </div>
      </main>
    </AppShell>
  );
}

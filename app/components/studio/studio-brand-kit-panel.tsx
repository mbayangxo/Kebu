"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrandKitRow } from "@/lib/studio/brand-kit";
import { STUDIO_FONTS_CATALOG } from "@/lib/studio/fonts-catalog";

export function StudioBrandKitPanel({ businessId }: { businessId?: string | null }) {
  const [kits, setKits] = useState<BrandKitRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [form, setForm] = useState({
    name: "Brand kit",
    logoUrl: "",
    primaryColor: "#0F0D33",
    accentColor: "#E05A2B",
    backgroundColor: "#FAFAF8",
    textColor: "#0F0D33",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = businessId ? `?businessId=${businessId}` : "";
    const [kitRes, projRes] = await Promise.all([
      fetch(`/api/studio/brand-kit${q}`, { credentials: "include" }),
      fetch("/api/projects", { credentials: "include" }).catch(() => null),
    ]);
    const kitData = await kitRes.json().catch(() => ({}));
    setKits((kitData.kits ?? []) as BrandKitRow[]);
    if (projRes?.ok) {
      const projData = await projRes.json().catch(() => ({}));
      setProjects((projData.projects ?? []).map((p: { id: string; title: string }) => ({ id: p.id, title: p.title })));
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  function loadKit(kit: BrandKitRow) {
    setSelectedId(kit.id);
    setForm({
      name: kit.name,
      logoUrl: kit.logo_url,
      primaryColor: kit.primary_color,
      accentColor: kit.accent_color,
      backgroundColor: kit.background_color,
      textColor: kit.text_color,
      fontDisplay: kit.font_display,
      fontBody: kit.font_body,
    });
  }

  async function saveKit() {
    setBusy(true);
    setNote(null);
    try {
      const body = { ...form, businessId: businessId ?? null, id: selectedId ?? undefined };
      const res = await fetch("/api/studio/brand-kit", {
        method: selectedId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          selectedId
            ? {
                id: selectedId,
                name: form.name,
                logoUrl: form.logoUrl,
                primaryColor: form.primaryColor,
                accentColor: form.accentColor,
                backgroundColor: form.backgroundColor,
                textColor: form.textColor,
                fontDisplay: form.fontDisplay,
                fontBody: form.fontBody,
              }
            : {
                name: form.name,
                logoUrl: form.logoUrl,
                primaryColor: form.primaryColor,
                accentColor: form.accentColor,
                backgroundColor: form.backgroundColor,
                textColor: form.textColor,
                fontDisplay: form.fontDisplay,
                fontBody: form.fontBody,
                businessId: businessId ?? null,
              },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(data.error ?? "Could not save brand kit.");
        return;
      }
      if (data.kit) {
        setSelectedId(data.kit.id);
      }
      setNote("Brand kit saved.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function applyToBuilder() {
    if (!selectedId || !projectId) {
      setNote("Save a brand kit and choose a website project.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/studio/brand-kit/apply-to-project", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandKitId: selectedId, projectId }),
      });
      const data = await res.json().catch(() => ({}));
      setNote(res.ok ? (data.message ?? "Applied to Builder.") : (data.error ?? "Could not apply."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 space-y-4">
      <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Brand kit</p>
      {kits.length ? (
        <div className="flex flex-wrap gap-2">
          {kits.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => loadKit(k)}
              className="rounded-full px-3 py-1 text-xs border"
            >
              {k.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2 text-sm">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Kit name"
          className="rounded-lg border px-2 py-1.5"
        />
        <input
          value={form.logoUrl}
          onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
          placeholder="Logo URL"
          className="rounded-lg border px-2 py-1.5 sm:col-span-2"
        />
        {(["primaryColor", "accentColor", "backgroundColor", "textColor"] as const).map((key) => (
          <label key={key} className="flex items-center gap-2 text-xs">
            <input
              type="color"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
            {key}
          </label>
        ))}
        <label className="text-xs font-semibold sm:col-span-1">
          Display font
          <select
            value={form.fontDisplay}
            onChange={(e) => setForm((f) => ({ ...f, fontDisplay: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-2 py-1.5"
          >
            {STUDIO_FONTS_CATALOG.filter((f) => f.role === "display" || f.role === "body").map((f) => (
              <option key={f.id} value={f.family}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold sm:col-span-1">
          Body font
          <select
            value={form.fontBody}
            onChange={(e) => setForm((f) => ({ ...f, fontBody: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-2 py-1.5"
          >
            {STUDIO_FONTS_CATALOG.filter((f) => f.role === "body" || f.role === "mono").map((f) => (
              <option key={f.id} value={f.family}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void saveKit()}
        className="rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        style={{ background: "#0F0D33" }}
      >
        {busy ? "Saving…" : selectedId ? "Update brand kit" : "Create brand kit"}
      </button>
      <div className="border-t pt-3 space-y-2">
        <p className="text-xs font-bold">Send brand → Builder</p>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full rounded-lg border px-2 py-1.5 text-sm"
        >
          <option value="">Choose website…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !selectedId || !projectId}
          onClick={() => void applyToBuilder()}
          className="rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          style={{ background: "#E05A2B" }}
        >
          Apply to website
        </button>
      </div>
      {note ? <p className="text-xs opacity-80">{note}</p> : null}
    </div>
  );
}

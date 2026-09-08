"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  STUDIO_TEMPLATES,
  STUDIO_TEMPLATE_CATEGORIES,
  buildCanvasFromTemplate,
  filterStudioTemplates,
  studioTemplateAspect,
  type StudioTemplate,
  type StudioTemplateCategory,
} from "@/lib/studio/templates";
import { STUDIO_DESIGN_TYPES, type StudioDesignType } from "@/lib/studio/canvas-document";

function TemplatePreviewCard({
  template,
  selected,
  onSelect,
}: {
  template: StudioTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  const aspect = studioTemplateAspect(template.designType);
  const bg = template.preset?.backgroundColor ?? "#0F0D33";
  const accent = template.preset?.accentColor ?? "#E05A2B";
  const darkText = bg === "#FAFAF8" || bg === "#FFF7ED";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group text-left rounded-2xl border overflow-hidden transition-shadow hover:shadow-md ${
        selected ? "border-orange-500 ring-2 ring-orange-500/40" : "border-black/10 bg-white"
      }`}
    >
      <div
        className={`relative w-full flex items-end p-3 ${
          aspect === "story" ? "aspect-[9/14]" : aspect === "portrait" ? "aspect-[3/4]" : "aspect-square"
        }`}
        style={{ background: bg }}
      >
        <div className="w-full space-y-1.5">
          <p
            className="text-[9px] font-semibold uppercase tracking-wider opacity-70 truncate"
            style={{ color: darkText ? "#0F0D33" : "#fff" }}
          >
            {template.designType.replace(/_/g, " ")}
          </p>
          <p
            className="font-display text-sm font-bold leading-tight line-clamp-2"
            style={{ color: darkText ? "#0F0D33" : "#fff" }}
          >
            {template.preset?.headline ?? template.label}
          </p>
          {template.preset?.subheadline ? (
            <p
              className="text-[10px] leading-snug line-clamp-2 opacity-80"
              style={{ color: darkText ? "#0F0D33" : "#fff" }}
            >
              {template.preset.subheadline}
            </p>
          ) : null}
          <span
            className="inline-block mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold"
            style={{ background: accent, color: accent === "#FFFFFF" ? "#0F0D33" : "#fff" }}
          >
            {template.preset?.cta ?? "Open"}
          </span>
        </div>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold truncate">{template.label}</p>
        <p className="text-[11px] opacity-60 line-clamp-2">{template.description}</p>
        <p className="text-[10px] uppercase tracking-wider opacity-40">{template.category}</p>
      </div>
    </button>
  );
}

/**
 * Studio template discovery — browse, filter, preview, create on canvas.
 */
export function StudioTemplateGallery({
  businessName: businessNameProp = "",
  onCreated,
}: {
  businessName?: string;
  onCreated?: (designId: string) => void;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<StudioTemplateCategory | "all">("all");
  const [designType, setDesignType] = useState<StudioDesignType | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(STUDIO_TEMPLATES[0]?.id ?? null);
  const [businessName, setBusinessName] = useState(businessNameProp);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterStudioTemplates(STUDIO_TEMPLATES, { category, designType, query }),
    [category, designType, query],
  );

  const selected = filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null;

  async function useTemplate() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = buildCanvasFromTemplate(selected, businessName.trim() || "My business");
      const res = await fetch("/api/create/designs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || selected.label,
          designType: selected.designType,
          canvas,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create design.");
        return;
      }
      const id = data.design?.id as string;
      onCreated?.(id);
      router.push(`/studio/${id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates (sale, WhatsApp, flyer…)"
          className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
        />
        <select
          value={designType}
          onChange={(e) => setDesignType(e.target.value as StudioDesignType | "all")}
          className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
        >
          <option value="all">All sizes</option>
          {STUDIO_DESIGN_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {STUDIO_TEMPLATE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              category === c.id ? "text-white" : "border border-black/10 bg-white opacity-70"
            }`}
            style={category === c.id ? { background: "#E05A2B" } : undefined}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="text-xs opacity-60">
        {filtered.length} template{filtered.length === 1 ? "" : "s"}
        {query.trim() ? ` for “${query.trim()}”` : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center">
          <p className="font-semibold">No templates match</p>
          <p className="text-sm opacity-60 mt-1">Try another category or clear search.</p>
          <button
            type="button"
            className="mt-4 text-sm underline"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setDesignType("all");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <TemplatePreviewCard
              key={t.id}
              template={t}
              selected={selected?.id === t.id}
              onSelect={() => {
                setSelectedId(t.id);
                if (!title.trim()) setTitle(t.label);
              }}
            />
          ))}
        </div>
      )}

      {selected ? (
        <div className="rounded-3xl border border-black/10 bg-white p-5 space-y-4 sticky bottom-4 shadow-lg">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Use template</p>
            <p className="font-semibold mt-1">{selected.label}</p>
            <p className="text-xs opacity-60 mt-0.5">{selected.description}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              Design title
              <input
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={selected.label}
              />
            </label>
            <label className="block text-sm">
              Business name on design
              <input
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Atelier Baobab"
              />
            </label>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void useTemplate()}
            className="w-full rounded-full py-3 font-bold text-white disabled:opacity-50"
            style={{ background: "#0F0D33" }}
          >
            {busy ? "Creating…" : "Open in canvas editor"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

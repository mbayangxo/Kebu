"use client";

import { useMemo, useState } from "react";
import { BUILDER } from "@/lib/create/builder-ui";
import {
  BUILDER_SECTION_CATALOG,
  BUILDER_SECTION_CATEGORIES,
  type BuilderSectionCategory,
} from "@/lib/create/builder-section-catalog";

const SECTION_ICONS: Record<string, string> = {
  "announcement-bar": "📢",
  navigation: "☰",
  "editorial-hero": "🖼",
  hero: "⬛",
  split: "◧",
  marquee: "↔",
  footer: "▬",
  "category-tiles": "⊞",
  text: "T",
  "free-text": "✥",
  features: "✦",
  image: "□",
  gallery: "⊟",
  video: "▶",
  audio: "♫",
  products: "🛍",
  contact: "✉",
  whatsapp: "💬",
  joko: "💳",
  map: "📍",
  form: "📋",
  newsletter: "✉",
  "blog-list": "📝",
  "email-popup": "📩",
  testimonials: "❝",
  faq: "?",
  events: "📅",
  "before-after": "⇌",
  "hotspot-image": "⊕",
};

/** Shopify-style section picker — compact rows, icon + label + hint. */
export function AddSectionPicker({
  pageTitle,
  busy,
  onAdd,
}: {
  pageTitle: string;
  busy?: boolean;
  onAdd: (type: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<BuilderSectionCategory | "all">("all");
  const [adding, setAdding] = useState<string | null>(null);

  const options = useMemo(() => {
    if (category === "all") return BUILDER_SECTION_CATALOG;
    return BUILDER_SECTION_CATALOG.filter((o) => o.category === category);
  }, [category]);

  async function pick(type: string) {
    setAdding(type);
    try {
      await onAdd(type);
      setOpen(false);
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        disabled={busy || Boolean(adding)}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40"
        style={{ background: BUILDER.gradient, boxShadow: BUILDER.shadow }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{open ? "✕" : "+"}</span>
        {open ? "Close" : "Add section"}
      </button>
      <p className="truncate text-[10px] leading-tight" style={{ color: BUILDER.muted }}>
        Editing: <span style={{ color: BUILDER.ink, fontWeight: 600 }}>{pageTitle}</span>
      </p>

      {open && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: BUILDER.surface, border: `1px solid ${BUILDER.border}`, boxShadow: BUILDER.shadowSoft }}
          role="dialog"
          aria-label="Add a section"
        >
          {/* Category filter tabs */}
          <div
            className="flex gap-0 overflow-x-auto"
            style={{ borderBottom: `1px solid ${BUILDER.border}` }}
          >
            {[{ id: "all" as const, label: "All" }, ...BUILDER_SECTION_CATEGORIES].map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id as BuilderSectionCategory | "all")}
                  className="flex-shrink-0 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors"
                  style={{
                    borderBottom: active ? `2px solid ${BUILDER.orange}` : "2px solid transparent",
                    color: active ? BUILDER.orange : BUILDER.muted,
                    background: "transparent",
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Section list — compact rows */}
          <ul
            className="overflow-y-auto"
            style={{ maxHeight: 300 }}
          >
            {options.map((opt) => {
              const isAdding = adding === opt.type;
              const icon = SECTION_ICONS[opt.type] ?? "□";
              return (
                <li key={opt.type} style={{ borderBottom: `1px solid ${BUILDER.border}` }}>
                  <button
                    type="button"
                    disabled={Boolean(adding)}
                    onClick={() => void pick(opt.type)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors disabled:opacity-40"
                    style={{
                      background: isAdding ? `${BUILDER.orange}12` : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!adding) (e.currentTarget as HTMLButtonElement).style.background = `${BUILDER.orange}0A`;
                    }}
                    onMouseLeave={(e) => {
                      if (!adding) (e.currentTarget as HTMLButtonElement).style.background = isAdding ? `${BUILDER.orange}12` : "transparent";
                    }}
                  >
                    {/* Icon bubble */}
                    <span
                      className="flex-shrink-0 flex items-center justify-center rounded-md text-[10px] font-bold"
                      style={{
                        width: 26,
                        height: 26,
                        background: BUILDER.surfaceMuted,
                        border: `1px solid ${BUILDER.border}`,
                        color: BUILDER.ink,
                      }}
                    >
                      {icon}
                    </span>
                    {/* Label + hint */}
                    <span className="min-w-0 flex-1">
                      <span
                        className="block text-[11px] font-semibold leading-tight truncate"
                        style={{ color: BUILDER.ink }}
                      >
                        {isAdding ? "Adding…" : opt.label}
                      </span>
                      <span
                        className="block text-[10px] leading-snug truncate"
                        style={{ color: BUILDER.muted }}
                      >
                        {opt.description}
                      </span>
                    </span>
                    {/* Chevron */}
                    <span
                      className="flex-shrink-0 text-[10px] opacity-30"
                      style={{ color: BUILDER.ink }}
                    >
                      ›
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

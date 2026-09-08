"use client";

import { useMemo, useState } from "react";
import { BUILDER } from "@/lib/create/builder-ui";
import {
  BUILDER_SECTION_CATALOG,
  BUILDER_SECTION_CATEGORIES,
  type BuilderSectionCategory,
} from "@/lib/create/builder-section-catalog";

/** Shopify-style section picker — add blocks to make the page longer. */
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
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy || Boolean(adding)}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-50"
        style={{ background: BUILDER.gradient, boxShadow: BUILDER.shadow }}
      >
        {open ? "Close section menu" : "+ Add section"}
      </button>
      <p className="text-[11px] leading-relaxed" style={{ color: BUILDER.muted }}>
        Longer page → add sections. Shorter → remove a section below. Editing:{" "}
        <strong style={{ color: BUILDER.ink }}>{pageTitle}</strong>
      </p>

      {open ? (
        <div
          className="rounded-2xl p-3 space-y-3"
          style={{ background: BUILDER.surface, border: `1px solid ${BUILDER.border}`, boxShadow: BUILDER.shadowSoft }}
          role="dialog"
          aria-label="Add a section"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.orange }}>
            Choose a section (like Shopify)
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
              style={{
                background: category === "all" ? BUILDER.orange : BUILDER.surfaceMuted,
                color: category === "all" ? "#fff" : BUILDER.ink,
                border: `1px solid ${BUILDER.border}`,
              }}
            >
              All
            </button>
            {BUILDER_SECTION_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
                style={{
                  background: category === c.id ? BUILDER.orange : BUILDER.surfaceMuted,
                  color: category === c.id ? "#fff" : BUILDER.ink,
                  border: `1px solid ${BUILDER.border}`,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
          <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {options.map((opt) => (
              <li key={opt.type}>
                <button
                  type="button"
                  disabled={Boolean(adding)}
                  onClick={() => void pick(opt.type)}
                  className="flex w-full flex-col items-start rounded-xl px-3 py-2.5 text-left transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: BUILDER.surfaceMuted, border: `1px solid ${BUILDER.border}` }}
                >
                  <span className="text-xs font-bold" style={{ color: BUILDER.ink }}>
                    {adding === opt.type ? "Adding…" : opt.label}
                  </span>
                  <span className="text-[10px] leading-snug" style={{ color: BUILDER.muted }}>
                    {opt.description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

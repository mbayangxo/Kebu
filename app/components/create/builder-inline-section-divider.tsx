"use client";

import { useMemo, useState } from "react";
import { BUILDER } from "@/lib/create/builder-ui";
import {
  BUILDER_SECTION_CATALOG,
  BUILDER_SECTION_CATEGORIES,
  labelForSectionType,
  type BuilderSectionCategory,
} from "@/lib/create/builder-section-catalog";

/** Shopify-style "+ Add section" strip between horizontal page blocks. */
export function BuilderInlineSectionDivider({
  afterSectionId,
  selectedSectionId,
  onAdd,
  busy,
}: {
  /** Insert after this section; null = top of page. */
  afterSectionId: string | null;
  selectedSectionId?: string | null;
  onAdd: (type: string, afterSectionId: string | null) => void | Promise<void>;
  busy?: boolean;
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
      await onAdd(type, afterSectionId);
      setOpen(false);
    } finally {
      setAdding(null);
    }
  }

  return (
    <div
      className="group relative z-20 flex flex-col items-center py-1"
      data-insert-after={afterSectionId ?? "top"}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="pointer-events-none absolute inset-x-8 top-1/2 h-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: BUILDER.orange }}
        aria-hidden
      />
      {!open ? (
        <button
          type="button"
          disabled={busy || Boolean(adding)}
          onClick={() => setOpen(true)}
          className="relative rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70 transition-all hover:opacity-100 hover:shadow-md disabled:opacity-40"
          style={{
            background: "#fff",
            borderColor: BUILDER.orange,
            color: BUILDER.orange,
          }}
        >
          + Add section
        </button>
      ) : (
        <div
          className="relative w-full max-w-lg rounded-2xl p-3 shadow-lg"
          style={{ background: "#fff", border: `1px solid ${BUILDER.border}` }}
          role="dialog"
          aria-label="Add a section here"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.orange }}>
              {afterSectionId ? "Insert below" : "Insert at top"}
            </p>
            <button
              type="button"
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: BUILDER.muted }}
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
          <div className="mb-2 flex flex-wrap gap-1">
            <CategoryChip active={category === "all"} onClick={() => setCategory("all")} label="All" />
            {BUILDER_SECTION_CATEGORIES.map((c) => (
              <CategoryChip
                key={c.id}
                active={category === c.id}
                onClick={() => setCategory(c.id)}
                label={c.label}
              />
            ))}
          </div>
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {options.map((opt) => (
              <li key={opt.type}>
                <button
                  type="button"
                  disabled={Boolean(adding)}
                  onClick={() => void pick(opt.type)}
                  className="w-full rounded-lg px-2 py-2 text-left text-xs hover:bg-black/[0.04] disabled:opacity-50"
                >
                  <span className="font-semibold">{opt.label}</span>
                  <span className="mt-0.5 block text-[10px]" style={{ color: BUILDER.muted }}>
                    {opt.description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Section chrome label — shows type when selected in inline stack mode. */
export function BuilderSectionChromeLabel({
  sectionType,
  selected,
}: {
  sectionType: string;
  selected: boolean;
}) {
  if (!selected) return null;
  return (
    <div
      className="absolute left-2 top-2 z-40 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow"
      style={{ background: BUILDER.orange }}
    >
      {labelForSectionType(sectionType)}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
      style={{
        background: active ? BUILDER.orange : BUILDER.surfaceMuted,
        color: active ? "#fff" : BUILDER.ink,
        border: `1px solid ${BUILDER.border}`,
      }}
    >
      {label}
    </button>
  );
}

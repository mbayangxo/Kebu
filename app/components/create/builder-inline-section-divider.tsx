"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BUILDER } from "@/lib/create/builder-ui";
import {
  BUILDER_SECTION_CATALOG,
  BUILDER_SECTION_CATEGORIES,
  labelForSectionType,
  type BuilderSectionCategory,
} from "@/lib/create/builder-section-catalog";

/** Shopify-style "+" strip between horizontal page blocks. */
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
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    const q=query.trim().toLowerCase();
    return BUILDER_SECTION_CATALOG.filter((o)=>(category==="all"||o.category===category)&&(!q||o.label.toLowerCase().includes(q)||o.description.toLowerCase().includes(q)));
  }, [category,query]);

  useEffect(()=>{if(!open)return;const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false)};document.addEventListener("keydown",onKey);return()=>document.removeEventListener("keydown",onKey)},[open]);

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
          className="relative grid h-7 w-7 place-items-center rounded-full border text-base font-medium opacity-0 shadow-sm transition-all group-hover:opacity-100 focus:opacity-100 disabled:opacity-40"
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
          ref={dialogRef} className="relative w-full max-w-lg rounded-[12px] p-3 shadow-xl"
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
          <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search sections…" className="mb-2 h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-xs outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/10"/><div className="mb-2 flex flex-wrap gap-1">
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
          <ul className="max-h-56 space-y-0.5 overflow-y-auto">
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
          {options.length===0?<li className="px-2 py-5 text-center text-[11px]" style={{color:BUILDER.muted}}>No sections match that search.</li>:null}</ul>
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
      className="rounded-md px-2 py-1 text-[9px] font-semibold"
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

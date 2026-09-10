"use client";

import { useMemo, useState } from "react";
import { TemplatePreviewCard } from "@/app/components/create/template-preview-card";
import { TEMPLATE_CATEGORY_GROUPS, type TemplateCategoryGroupId } from "@/lib/create/template-catalog";
import type { GalleryTemplate } from "@/lib/create/template-gallery";
import { KEBU } from "@/lib/kebu-brand";

export function TemplateGallery({
  templates,
  featured,
  flagship,
  visualOnly = false,
  compact = false,
}: {
  templates: GalleryTemplate[];
  featured: GalleryTemplate[];
  flagship?: GalleryTemplate[];
  visualOnly?: boolean;
  /** Dense business-type grid — smaller cards, more columns. */
  compact?: boolean;
}) {
  const [filter, setFilter] = useState<TemplateCategoryGroupId | "featured" | "flagship" | "">(
    flagship?.length ? "flagship" : "",
  );
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    let list =
      filter === "flagship" && flagship?.length
        ? flagship
        : filter === "featured"
          ? featured
          : filter === ""
            ? [
                ...(flagship ?? []),
                ...templates.filter((t) => !(flagship ?? []).some((f) => f.slug === t.slug)),
              ]
            : templates.filter((t) => t.groupId === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.groupLabel.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.cardVisual?.keywords ?? []).some((k) => k.includes(q)),
      );
    }
    return list;
  }, [filter, templates, featured, flagship, query]);

  return (
    <div>
      <div
        className="sticky top-0 z-20 -mx-4 px-4 py-3 mb-4 backdrop-blur-md sm:static sm:mx-0 sm:px-0 sm:py-0 sm:mb-5"
        style={{ background: visualOnly ? "rgba(255,251,247,0.94)" : "transparent" }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or business type…"
          className="w-full max-w-sm rounded-full px-4 py-2 text-sm font-medium mb-3"
          style={{ border: `1px solid ${KEBU.border}`, background: KEBU.white }}
        />
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={filter === ""} onClick={() => setFilter("")} label={`All (${templates.length})`} />
          {flagship?.length ? (
            <FilterChip
              active={filter === "flagship"}
              onClick={() => setFilter("flagship")}
              label={`Flagship (${flagship.length})`}
              accent
            />
          ) : null}
          <FilterChip
            active={filter === "featured"}
            onClick={() => setFilter("featured")}
            label={`Featured (${featured.length})`}
            accent
          />
          {TEMPLATE_CATEGORY_GROUPS.filter((g) => templates.some((t) => t.groupId === g.id)).map((g) => (
            <FilterChip
              key={g.id}
              active={filter === g.id}
              onClick={() => setFilter(g.id)}
              label={`${g.label} (${templates.filter((t) => t.groupId === g.id).length})`}
            />
          ))}
        </div>
      </div>

      <ul
        className={
          compact || visualOnly
            ? "grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            : "grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
        }
      >
        {visible.map((t) => (
          <li key={t.slug}>
            <TemplatePreviewCard template={t} visualOnly={visualOnly} compact={compact || visualOnly} />
          </li>
        ))}
      </ul>

      {visible.length === 0 ? (
        <p className="text-sm py-12 text-center" style={{ color: KEBU.muted }}>
          No aesthetics in this filter. Try another business type.
        </p>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  accent = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all"
      style={{
        background: active ? (accent ? KEBU.orange : KEBU.black) : KEBU.white,
        color: active ? KEBU.white : KEBU.black,
        border: active ? "none" : `2px solid ${KEBU.black}`,
        boxShadow: active ? "2px 2px 0 rgba(10,10,10,1)" : "none",
      }}
    >
      {label}
    </button>
  );
}

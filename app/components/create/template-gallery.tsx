"use client";

import { useMemo, useState } from "react";
import { TemplatePreviewCard } from "@/app/components/create/template-preview-card";
import { TEMPLATE_CATEGORY_GROUPS, type TemplateCategoryGroupId } from "@/lib/create/template-catalog";
import type { GalleryTemplate } from "@/lib/create/template-gallery";
import { KEBU } from "@/lib/kebu-brand";

export function TemplateGallery({
  templates,
  featured,
  visualOnly = false,
}: {
  templates: GalleryTemplate[];
  featured: GalleryTemplate[];
  visualOnly?: boolean;
}) {
  const [filter, setFilter] = useState<TemplateCategoryGroupId | "featured" | "">("");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    let list = filter === "featured" ? featured : filter === "" ? templates : templates.filter((t) => t.groupId === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.groupLabel.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [filter, templates, featured, query]);

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-5 px-5 py-4 mb-6 backdrop-blur-md lg:static lg:mx-0 lg:px-0 lg:py-0 lg:mb-8" style={{ background: visualOnly ? "rgba(255,251,247,0.92)" : "transparent" }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates…"
          className="w-full max-w-md rounded-full px-5 py-2.5 text-sm font-medium mb-4"
          style={{ border: `2px solid ${KEBU.black}`, background: KEBU.white }}
        />
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === ""} onClick={() => setFilter("")} label={`All (${templates.length})`} />
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
          visualOnly
            ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            : "grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
        }
      >
        {visible.map((t) => (
          <li key={t.slug}>
            <TemplatePreviewCard template={t} visualOnly={visualOnly} />
          </li>
        ))}
      </ul>

      {visible.length === 0 ? (
        <p className="text-sm text-center py-16 font-semibold" style={{ color: KEBU.black }}>
          No templates match — try another filter.
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

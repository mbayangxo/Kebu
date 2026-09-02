"use client";

import { useMemo, useState } from "react";
import { TemplatePreviewCard } from "@/app/components/create/template-preview-card";
import { TEMPLATE_CATEGORY_GROUPS, type TemplateCategoryGroupId } from "@/lib/create/template-catalog";
import { galleryTemplateForSlug, type GalleryTemplate } from "@/lib/create/template-gallery";

type TemplateRow = { slug: string; name: string; category: string; description: string };

export function TemplatePickerGrid({
  templates,
  selectedSlug,
  onSelect,
  businessId,
  categoryFilter,
  onCategoryChange,
}: {
  templates: TemplateRow[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  businessId?: string;
  categoryFilter: TemplateCategoryGroupId | "";
  onCategoryChange: (id: TemplateCategoryGroupId | "") => void;
}) {
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);

  const galleryTemplates = useMemo(() => {
    return templates
      .map((t) => galleryTemplateForSlug(t.slug, businessId) ?? null)
      .filter((t): t is GalleryTemplate => Boolean(t));
  }, [templates, businessId]);

  const counts = useMemo(() => {
    const byGroup = new Map<TemplateCategoryGroupId, number>();
    for (const t of galleryTemplates) {
      byGroup.set(t.groupId, (byGroup.get(t.groupId) ?? 0) + 1);
    }
    return byGroup;
  }, [galleryTemplates]);

  const visible = useMemo(() => {
    if (!categoryFilter) return galleryTemplates;
    return galleryTemplates.filter((t) => t.groupId === categoryFilter);
  }, [galleryTemplates, categoryFilter]);

  const focusSlug = hoverSlug ?? selectedSlug;
  const focusTemplate = visible.find((t) => t.slug === focusSlug) ?? galleryTemplates.find((t) => t.slug === selectedSlug);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={categoryFilter === ""}
          onClick={() => onCategoryChange("")}
          label={`All (${galleryTemplates.length})`}
        />
        {TEMPLATE_CATEGORY_GROUPS.filter((g) => (counts.get(g.id) ?? 0) > 0).map((g) => (
          <FilterChip
            key={g.id}
            active={categoryFilter === g.id}
            onClick={() => onCategoryChange(g.id)}
            label={`${g.label} (${counts.get(g.id)})`}
          />
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <ul className="grid gap-5 sm:grid-cols-2">
          {visible.map((t) => (
            <li key={t.slug}>
              <TemplatePreviewCard
                template={t}
                selectionMode
                visualOnly
                selected={selectedSlug === t.slug}
                onSelect={() => onSelect(t.slug)}
                onHover={() => setHoverSlug(t.slug)}
                onHoverEnd={() => setHoverSlug(null)}
              />
            </li>
          ))}
        </ul>

        {focusTemplate ? (
          <aside
            className="hidden lg:block sticky top-6 rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(10,10,10,0.1)", boxShadow: "0 12px 40px rgba(255,85,0,0.1)" }}
          >
            <div className="relative aspect-[9/16] bg-[#f4f0eb] overflow-hidden">
              <iframe
                src={focusTemplate.previewPath}
                title={`${focusTemplate.name} selected preview`}
                className="absolute top-0 left-0 border-0 pointer-events-none origin-top-left"
                style={{ width: "1280px", height: "1680px", transform: "scale(0.248)" }}
                loading="lazy"
                tabIndex={-1}
              />
            </div>
            <div className="p-4 bg-white border-t-2 border-black">
              <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "#FF5500" }}>
                {focusTemplate.groupLabel}
              </p>
              <p className="font-black text-sm">{focusTemplate.name}</p>
              <button
                type="button"
                onClick={() => onSelect(focusTemplate.slug)}
                className="mt-4 w-full rounded-full py-2.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: selectedSlug === focusTemplate.slug ? "#0A0A0A" : "#FF5500",
                  color: "#fff",
                }}
              >
                {selectedSlug === focusTemplate.slug ? "Selected" : "Use this template"}
              </button>
            </div>
          </aside>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-center py-12 rounded-2xl" style={{ background: "#FFF8F2", color: "#5C5348" }}>
          No templates in this category.
        </p>
      ) : null}
    </div>
  );
}

function FilterChip({
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
      className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
      style={{
        background: active ? "#FF5500" : "#FFF8F2",
        color: active ? "#fff" : "#0A0A0A",
        border: active ? "none" : "1px solid rgba(10,10,10,0.08)",
      }}
    >
      {label}
    </button>
  );
}

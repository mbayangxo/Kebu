"use client";

import Link from "next/link";
import { groupTemplatesByCategory, type TemplateCategoryGroupId } from "@/lib/create/template-catalog";

type TemplateRow = {
  slug: string;
  name: string;
  category: string;
  description: string;
};

export function TemplateCatalogGrid({
  templates,
  selectedSlug,
  onSelect,
  categoryFilter,
  onCategoryChange,
  showDemoLinks = true,
}: {
  templates: TemplateRow[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  categoryFilter: TemplateCategoryGroupId | "";
  onCategoryChange: (id: TemplateCategoryGroupId | "") => void;
  showDemoLinks?: boolean;
}) {
  const groups = groupTemplatesByCategory(templates);
  const visibleGroups = categoryFilter ? groups.filter((g) => g.id === categoryFilter) : groups;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onCategoryChange("")}
          className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: categoryFilter === "" ? "#0A0A0A" : "#FFF8F2",
            color: categoryFilter === "" ? "#fff" : "#0A0A0A",
          }}
        >
          All ({templates.length})
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onCategoryChange(g.id)}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: categoryFilter === g.id ? "#FF5500" : "#FFF8F2",
              color: categoryFilter === g.id ? "#FFFFFF" : "#0A0A0A",
            }}
          >
            {g.label} ({g.templates.length})
          </button>
        ))}
      </div>

      {visibleGroups.map((group) => (
        <section key={group.id}>
          <div className="mb-3">
            <h3 className="text-sm font-bold">{group.label}</h3>
            <p className="text-xs mt-0.5" style={{ color: "#5C5348" }}>
              {group.description}
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {group.templates.map((t) => {
              const selected = selectedSlug === t.slug;
              return (
                <li key={t.slug}>
                  <button
                    type="button"
                    onClick={() => onSelect(t.slug)}
                    className="w-full rounded-2xl p-4 text-left transition"
                    style={{
                      background: selected ? "#FF5500" : "#fff",
                      color: selected ? "#fff" : "#0A0A0A",
                      border: `2px solid ${selected ? "#E10600" : "rgba(10,10,10,0.1)"}`,
                    }}
                  >
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p
                      className={`text-xs mt-1 leading-relaxed ${selected ? "text-white/70" : ""}`}
                      style={selected ? undefined : { color: "#5C5348" }}
                    >
                      {t.description}
                    </p>
                    {showDemoLinks ? (
                      <Link
                        href={`/create/demo/${t.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] underline mt-2 inline-block opacity-80"
                      >
                        Preview demo
                      </Link>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

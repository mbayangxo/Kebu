"use client";

import { SiteImageUpload } from "@/app/components/create/site-image-upload";

export type NavChildEdit = {
  label: string;
  href: string;
  iconUrl?: string;
};

export type NavLinkEdit = {
  label: string;
  href: string;
  iconUrl?: string;
  showLabel?: boolean;
  /** When true, hover shows child pages (Shopify-style dropdown). */
  multiNav?: boolean;
  children?: NavChildEdit[];
};

/** Map stored nav links into editor shape without stripping multi-nav. */
export function mapNavLinksForEditor(
  links: Array<{
    label?: string;
    href?: string;
    iconUrl?: string;
    showLabel?: boolean;
    multiNav?: boolean;
    children?: Array<{ label?: string; href?: string; iconUrl?: string }>;
  }>,
): NavLinkEdit[] {
  return links.map((l) => ({
    label: String(l.label ?? ""),
    href: String(l.href ?? ""),
    iconUrl: String(l.iconUrl ?? ""),
    showLabel: l.showLabel !== false,
    multiNav: Boolean(l.multiNav),
    children: Array.isArray(l.children)
      ? l.children.map((c) => ({
          label: String(c.label ?? ""),
          href: String(c.href ?? ""),
          iconUrl: String(c.iconUrl ?? ""),
        }))
      : [],
  }));
}

/** Reorder / edit site nav links — label, href, optional photo/icon, multi-nav children. */
export function NavLinksEditor({
  links,
  onChange,
  projectId,
  allowIcons = false,
  allowMultiNav = true,
  pages = [],
}: {
  links: NavLinkEdit[];
  onChange: (next: NavLinkEdit[]) => void;
  projectId?: string;
  /** May Lecor / flagship: upload photo or icon per link. */
  allowIcons?: boolean;
  /** Hover dropdowns under a top-level tab (Shopify-style). */
  allowMultiNav?: boolean;
  /** Available pages to pick from when setting child links. */
  pages?: Array<{ id: string; slug: string; title: string }>;
}) {
  function move(idx: number, dir: -1 | 1) {
    const next = [...links];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    const a = next[idx]!;
    next[idx] = next[j]!;
    next[j] = a;
    onChange(next);
  }

  function patchLink(idx: number, patch: Partial<NavLinkEdit>) {
    const next = [...links];
    next[idx] = { ...next[idx]!, ...patch };
    onChange(next);
  }

  function patchChild(idx: number, childIdx: number, patch: Partial<NavChildEdit>) {
    const link = links[idx]!;
    const children = [...(link.children ?? [])];
    children[childIdx] = { ...children[childIdx]!, ...patch };
    patchLink(idx, { children, multiNav: true });
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>
        Nav menu — reorder with ↑ ↓
      </p>
      {allowMultiNav ? (
        <p className="text-[9px] leading-relaxed opacity-70">
          Turn on multi-nav for a tab to nest pages under it. Visitors see those pages on hover.
        </p>
      ) : null}
      {allowIcons ? (
        <p className="text-[9px] leading-relaxed opacity-70">
          Optional: add a photo or icon instead of (or with) words. Logo in the upper bar always goes home.
        </p>
      ) : null}
      {links.map((link, idx) => (
        <div key={idx} className="space-y-1 rounded-lg p-2" style={{ border: "1px solid #EEE" }}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ border: "1px solid #DDE0F0" }}
              disabled={idx === 0}
              onClick={() => move(idx, -1)}
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ border: "1px solid #DDE0F0" }}
              disabled={idx === links.length - 1}
              onClick={() => move(idx, 1)}
              aria-label="Move down"
            >
              ↓
            </button>
            <span className="text-[9px] opacity-50">{idx + 1}</span>
            <button
              type="button"
              className="ml-auto text-[10px] font-bold uppercase text-red-600"
              onClick={() => onChange(links.filter((_, i) => i !== idx))}
            >
              Remove
            </button>
          </div>
          <input
            className="w-full text-xs rounded px-2 py-1"
            style={{ border: "1px solid #DDE0F0" }}
            value={link.label}
            placeholder="Label (Shop, Updates…)"
            onChange={(e) => patchLink(idx, { label: e.target.value })}
          />
          <input
            className="w-full text-xs rounded px-2 py-1"
            style={{ border: "1px solid #DDE0F0" }}
            value={link.href}
            placeholder="/page or https://…"
            onChange={(e) => patchLink(idx, { href: e.target.value })}
          />
          {allowMultiNav ? (
            <label className="flex items-center gap-2 text-[10px] font-semibold">
              <input
                type="checkbox"
                checked={Boolean(link.multiNav)}
                onChange={(e) => {
                  const on = e.target.checked;
                  patchLink(idx, {
                    multiNav: on,
                    children: on
                      ? (link.children?.length
                          ? link.children
                          : [{ label: "Sub-page", href: link.href || "/page", iconUrl: "" }])
                      : [],
                  });
                }}
              />
              Mega nav / dropdown
            </label>
          ) : null}
          {allowMultiNav && link.multiNav ? (
            <div className="ml-1 space-y-1.5 border-l-2 pl-2" style={{ borderColor: "#FF5500" }}>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ opacity: 0.6 }}>
                Sub-pages (shown in dropdown)
              </p>
              {(link.children ?? []).map((child, childIdx) => (
                <div key={childIdx} className="space-y-1 rounded-md p-1.5" style={{ background: "#FAFAF8", border: "1px solid #EEE" }}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] opacity-50">Item {childIdx + 1}</span>
                    <button
                      type="button"
                      className="text-[9px] font-bold uppercase text-red-600"
                      onClick={() => {
                        const children = (link.children ?? []).filter((_, i) => i !== childIdx);
                        patchLink(idx, { children });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  {/* Page picker — if pages available, show a select to link to an existing page */}
                  {pages.length > 0 ? (
                    <select
                      className="w-full text-xs rounded px-2 py-1"
                      style={{ border: "1px solid #DDE0F0" }}
                      value={child.href}
                      onChange={(e) => {
                        const slug = e.target.value;
                        const page = pages.find((pg) => `/${pg.slug}` === slug || pg.slug === slug);
                        patchChild(idx, childIdx, {
                          href: `/${slug.replace(/^\//, "")}`,
                          label: child.label || (page?.title ?? ""),
                        });
                      }}
                    >
                      <option value="">— Pick a page —</option>
                      {pages.map((pg) => (
                        <option key={pg.id} value={`/${pg.slug}`}>
                          {pg.title} (/{pg.slug})
                        </option>
                      ))}
                      <option value="__custom__">Custom URL…</option>
                    </select>
                  ) : null}
                  <input
                    className="w-full text-xs rounded px-2 py-1"
                    style={{ border: "1px solid #DDE0F0" }}
                    value={child.label}
                    placeholder="Display label"
                    onChange={(e) => patchChild(idx, childIdx, { label: e.target.value })}
                  />
                  {pages.length === 0 ? (
                    <input
                      className="w-full text-xs rounded px-2 py-1"
                      style={{ border: "1px solid #DDE0F0" }}
                      value={child.href}
                      placeholder="/page or https://…"
                      onChange={(e) => patchChild(idx, childIdx, { href: e.target.value })}
                    />
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                className="w-full rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider"
                style={{ border: "1px solid #DDE0F0" }}
                onClick={() =>
                  patchLink(idx, {
                    children: [
                      ...(link.children ?? []),
                      { label: "", href: pages[0] ? `/${pages[0].slug}` : "/page", iconUrl: "" },
                    ],
                  })
                }
              >
                + Add sub-page
              </button>
            </div>
          ) : null}
          {allowIcons && projectId ? (
            <>
              <SiteImageUpload
                projectId={projectId}
                kind="section"
                value={link.iconUrl ?? ""}
                onChange={(url) => patchLink(idx, { iconUrl: url })}
                label="Nav photo / icon (optional)"
              />
              <label className="flex items-center gap-2 text-[10px] font-semibold">
                <input
                  type="checkbox"
                  checked={link.showLabel !== false}
                  onChange={(e) => patchLink(idx, { showLabel: e.target.checked })}
                />
                Show word label with icon
              </label>
            </>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        className="w-full rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ border: "1px solid #DDE0F0" }}
        onClick={() =>
          onChange([
            ...links,
            {
              label: "New page",
              href: "/about",
              iconUrl: "",
              showLabel: true,
              multiNav: false,
              children: [],
            },
          ])
        }
      >
        + Add nav link
      </button>
    </div>
  );
}

"use client";

import { SiteImageUpload } from "@/app/components/create/site-image-upload";

export type NavLinkEdit = {
  label: string;
  href: string;
  iconUrl?: string;
  showLabel?: boolean;
};

/** Reorder / edit site nav links — label, href, optional photo/icon. */
export function NavLinksEditor({
  links,
  onChange,
  projectId,
  allowIcons = false,
}: {
  links: NavLinkEdit[];
  onChange: (next: NavLinkEdit[]) => void;
  projectId?: string;
  /** May Lecor / flagship: upload photo or icon per link. */
  allowIcons?: boolean;
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

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>
        Nav menu — reorder with ↑ ↓
      </p>
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
            onChange={(e) => {
              const next = [...links];
              next[idx] = { ...next[idx]!, label: e.target.value };
              onChange(next);
            }}
          />
          <input
            className="w-full text-xs rounded px-2 py-1"
            style={{ border: "1px solid #DDE0F0" }}
            value={link.href}
            placeholder="/page or https://…"
            onChange={(e) => {
              const next = [...links];
              next[idx] = { ...next[idx]!, href: e.target.value };
              onChange(next);
            }}
          />
          {allowIcons && projectId ? (
            <>
              <SiteImageUpload
                projectId={projectId}
                kind="section"
                value={link.iconUrl ?? ""}
                onChange={(url) => {
                  const next = [...links];
                  next[idx] = { ...next[idx]!, iconUrl: url };
                  onChange(next);
                }}
                label="Nav photo / icon (optional)"
              />
              <label className="flex items-center gap-2 text-[10px] font-semibold">
                <input
                  type="checkbox"
                  checked={link.showLabel !== false}
                  onChange={(e) => {
                    const next = [...links];
                    next[idx] = { ...next[idx]!, showLabel: e.target.checked };
                    onChange(next);
                  }}
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
          onChange([...links, { label: "New page", href: "/about", iconUrl: "", showLabel: true }])
        }
      >
        + Add nav link
      </button>
    </div>
  );
}

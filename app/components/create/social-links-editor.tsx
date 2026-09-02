"use client";

import { SectionPhotoField } from "@/app/components/create/section-photo-field";

export type SocialLinkEdit = { label: string; href: string; iconUrl: string };

/** Edit / reorder / delete social icons + rail colors for May Lecor. */
export function SocialLinksEditor({
  projectId,
  links,
  onChange,
  rail,
  onRailChange,
}: {
  projectId: string;
  links: SocialLinkEdit[];
  onChange: (next: SocialLinkEdit[]) => void;
  rail?: {
    visible: boolean;
    bgColor: string;
    leftPct: number;
    topPct: number;
    iconSize: number;
  };
  onRailChange?: (patch: Partial<{
    socialRailVisible: boolean;
    socialRailBg: string;
    socialRailLeftPct: number;
    socialRailTopPct: number;
    socialRailIconSize: number;
  }>) => void;
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
        Social icons — on the website (drag on preview)
      </p>
      {rail && onRailChange ? (
        <div className="space-y-1 rounded-lg p-2" style={{ border: "1px solid #EEE" }}>
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
            <input
              type="checkbox"
              checked={rail.visible}
              onChange={(e) => onRailChange({ socialRailVisible: e.target.checked })}
            />
            Show social rail on site
          </label>
          <label className="block text-[9px] uppercase tracking-wider">
            Rail background color
            <input
              className="mt-0.5 w-full text-xs rounded px-2 py-1"
              style={{ border: "1px solid #DDE0F0" }}
              value={rail.bgColor}
              placeholder="rgba(0,0,0,0.85) or #000"
              onChange={(e) => onRailChange({ socialRailBg: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-3 gap-1">
            <label className="text-[9px]">
              Left %
              <input
                type="number"
                className="mt-0.5 w-full text-xs rounded px-1 py-1"
                style={{ border: "1px solid #DDE0F0" }}
                value={rail.leftPct}
                onChange={(e) => onRailChange({ socialRailLeftPct: Number(e.target.value) })}
              />
            </label>
            <label className="text-[9px]">
              Top %
              <input
                type="number"
                className="mt-0.5 w-full text-xs rounded px-1 py-1"
                style={{ border: "1px solid #DDE0F0" }}
                value={rail.topPct}
                onChange={(e) => onRailChange({ socialRailTopPct: Number(e.target.value) })}
              />
            </label>
            <label className="text-[9px]">
              Icon px
              <input
                type="number"
                className="mt-0.5 w-full text-xs rounded px-1 py-1"
                style={{ border: "1px solid #DDE0F0" }}
                value={rail.iconSize}
                onChange={(e) => onRailChange({ socialRailIconSize: Number(e.target.value) })}
              />
            </label>
          </div>
          <p className="text-[9px] leading-relaxed opacity-60">
            Or drag the rail on the preview to place it anywhere on the site.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        className="w-full rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ border: "1px solid #DDE0F0" }}
        onClick={() =>
          onChange([
            ...links,
            { label: "Instagram", href: "https://instagram.com/", iconUrl: links[0]?.iconUrl ?? "" },
          ])
        }
      >
        + Add social link
      </button>

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
            <button
              type="button"
              className="ml-auto text-[10px] font-bold uppercase text-red-600"
              onClick={() => onChange(links.filter((_, i) => i !== idx))}
            >
              Delete
            </button>
          </div>
          <input
            className="w-full text-xs rounded px-2 py-1"
            style={{ border: "1px solid #DDE0F0" }}
            value={link.label}
            placeholder="Label (Spotify, Instagram…)"
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
            placeholder="https://…"
            onChange={(e) => {
              const next = [...links];
              next[idx] = { ...next[idx]!, href: e.target.value };
              onChange(next);
            }}
          />
          <SectionPhotoField
            projectId={projectId}
            label="Icon image"
            value={link.iconUrl}
            onChange={(url) => {
              const next = [...links];
              next[idx] = { ...next[idx]!, iconUrl: url };
              onChange(next);
            }}
          />
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= links.length || to >= links.length) return;
    const next = [...links];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="border-b border-black/[.07] pb-2">
        <p className="text-[11px] font-semibold text-black/75">Social links</p>
        <p className="mt-0.5 text-[9px] leading-relaxed text-black/40">Drag rows to reorder. Select the rail on the canvas to reposition it.</p>
      </div>
      {rail && onRailChange ? (
        <div className="space-y-2 border-b border-black/[.07] pb-3">
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
        <div
          key={`${link.label}-${idx}`}
          draggable
          onDragStart={() => setDraggedIndex(idx)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (draggedIndex !== null) reorder(draggedIndex, idx);
            setDraggedIndex(null);
          }}
          onDragEnd={() => setDraggedIndex(null)}
          className="space-y-2 border-b border-black/[.07] py-3 last:border-b-0"
          style={{ opacity: draggedIndex === idx ? 0.45 : 1 }}
        >
          <div className="flex items-center gap-2">
            <span className="cursor-grab text-[13px] text-black/25" aria-hidden>⠿</span>
            <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-black/65">{link.label || "Social link"}</span>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-[9px] font-semibold text-red-700 hover:bg-red-50"
              onClick={() => onChange(links.filter((_, i) => i !== idx))}
            >
              Remove
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

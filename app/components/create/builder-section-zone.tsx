"use client";

import type { ReactNode } from "react";

export type BuilderSectionZoneId = "top" | "middle" | "lower";

const ZONE_LABEL: Record<BuilderSectionZoneId, { label: string; subtitle: string }> = {
  top: { label: "Header", subtitle: "Brand & nav — every page" },
  middle: { label: "Template", subtitle: "Page sections" },
  lower: { label: "Footer", subtitle: "Bottom — every page" },
};

/**
 * Shopify-style flat section group.
 * Just a plain text group label + list of items, no bordered card.
 * Matches how Shopify's theme editor shows Header / Template / Footer groups.
 */
export function BuilderSectionZone({
  zone,
  count,
  children,
  emptyHint,
  open = true,
  onToggle,
}: {
  zone: BuilderSectionZoneId;
  count?: number;
  children: ReactNode;
  emptyHint?: ReactNode;
  open?: boolean;
  onToggle?: () => void;
}) {
  const { label, subtitle } = ZONE_LABEL[zone];
  return (
    <section aria-label={label}>
      <button
        type="button"
        className="flex w-full items-center justify-between px-2 py-2.5 text-left"
        onClick={onToggle}
        disabled={!onToggle}
        style={{
          background: open ? "#F0F0F0" : "transparent",
          borderRadius: 6,
        }}
      >
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#5C5C5C" }}>
            {label}
          </span>
          {typeof count === "number" ? (
            <span className="ml-2 text-[9px] tabular-nums" style={{ color: "#9C9C9C" }}>
              {count} section{count !== 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        {onToggle ? (
          <span className="text-[11px]" style={{ color: "#9C9C9C" }} aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="mt-1 space-y-0.5 px-1">
          {children}
          {emptyHint ? (
            <p className="px-1 pt-1 text-[11px] leading-relaxed" style={{ color: "#9C9C9C" }}>
              {emptyHint}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

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
        className="flex w-full items-center justify-between py-1.5 text-left"
        onClick={onToggle}
        disabled={!onToggle}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#8C8C8C" }}>
          {label}
          {typeof count === "number" ? (
            <span className="ml-1.5 font-normal text-[9px] tabular-nums" style={{ color: "#B0B0B0" }}>
              {count}
            </span>
          ) : null}
        </span>
        {onToggle ? (
          <span className="text-[10px]" style={{ color: "#C0C0C0" }} aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="space-y-0.5">
          {children}
          {emptyHint ? (
            <p className="pl-1 text-[11px] leading-relaxed" style={{ color: "#B0B0B0" }}>
              {emptyHint}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

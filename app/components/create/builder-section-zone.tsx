"use client";

import type { ReactNode } from "react";

export type BuilderSectionZoneId = "top" | "middle" | "lower";

const ZONE_LABEL: Record<BuilderSectionZoneId, { label: string; subtitle: string }> = {
  top: { label: "Header", subtitle: "Brand & nav" },
  middle: { label: "Template", subtitle: "Page sections" },
  lower: { label: "Footer", subtitle: "Bottom" },
};

/**
 * Shopify-style zone — always-expanded, flat label.
 * No collapsible toggle: sections are always visible.
 */
export function BuilderSectionZone({
  zone,
  count,
  children,
  emptyHint,
  footer,
}: {
  zone: BuilderSectionZoneId;
  count?: number;
  children: ReactNode;
  emptyHint?: ReactNode;
  /** Content rendered below the section list (e.g. + Add section button). */
  footer?: ReactNode;
}) {
  const { label, subtitle } = ZONE_LABEL[zone];
  return (
    <section aria-label={label}>
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#5C5C5C" }}>
            {label}
          </span>
          {subtitle ? (
            <span className="text-[9px]" style={{ color: "#B0B0B0" }}>
              {subtitle}
            </span>
          ) : null}
          {typeof count === "number" ? (
            <span className="text-[9px] tabular-nums" style={{ color: "#B0B0B0" }}>
              · {count}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-0.5 px-1">
        {children}
        {emptyHint ? (
          <p className="px-2 py-2 text-[11px] leading-relaxed" style={{ color: "#9C9C9C" }}>
            {emptyHint}
          </p>
        ) : null}
      </div>

      {footer ? <div className="mt-2 px-1">{footer}</div> : null}
    </section>
  );
}

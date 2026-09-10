"use client";

import type { ReactNode } from "react";
import { BUILDER } from "@/lib/create/builder-ui";

export type BuilderSectionZoneId = "top" | "middle" | "lower";

const ZONE_META: Record<
  BuilderSectionZoneId,
  { label: string; subtitle: string; accent: string }
> = {
  top: {
    label: "Header",
    subtitle: "Brand & menu — every page",
    accent: "#0F0D33",
  },
  middle: {
    label: "Template",
    subtitle: "Page sections — hero, text, photos…",
    accent: BUILDER.orange,
  },
  lower: {
    label: "Footer",
    subtitle: "Bottom bar — every page",
    accent: "#5C5678",
  },
};

/**
 * Shopify theme-editor group: Header / Template / Footer.
 * Collapsible — open one zone at a time from the parent.
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
  const meta = ZONE_META[zone];
  return (
    <section
      className="overflow-hidden rounded-xl"
      style={{
        border: `1px solid ${BUILDER.border}`,
        background: BUILDER.surface,
      }}
      aria-label={`${meta.label} — ${meta.subtitle}`}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 border-b px-3 py-2.5 text-left"
        style={{
          borderColor: BUILDER.border,
          borderLeft: `3px solid ${meta.accent}`,
          background: open ? BUILDER.surfaceMuted : "#fff",
        }}
        aria-expanded={open}
        onClick={onToggle}
        disabled={!onToggle}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: meta.accent }}>
            {meta.label}
          </p>
          <p className="truncate text-[11px] leading-snug" style={{ color: BUILDER.muted }}>
            {meta.subtitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {typeof count === "number" ? (
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
              style={{ background: "#fff", color: BUILDER.ink, border: `1px solid ${BUILDER.border}` }}
            >
              {count}
            </span>
          ) : null}
          {onToggle ? (
            <span className="text-[11px]" style={{ color: BUILDER.faint }} aria-hidden>
              {open ? "▾" : "▸"}
            </span>
          ) : null}
        </div>
      </button>
      {open ? (
        <div className="space-y-2 p-3">
          {children}
          {emptyHint ? (
            <p className="text-[11px] leading-relaxed" style={{ color: BUILDER.faint }}>
              {emptyHint}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

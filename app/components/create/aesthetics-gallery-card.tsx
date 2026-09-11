"use client";

import Link from "next/link";
import type { AestheticGalleryItem } from "@/lib/create/aesthetics-gallery";
import { AestheticCardVisual } from "@/app/components/create/aesthetic-card-visual";
import { KEBU } from "@/lib/kebu-brand";

/**
 * Shopify theme-store style tile: desktop frame + tablet + phone peeks.
 * Modern type (Jakarta) — not chunky display serifs.
 */
export function AestheticGalleryCard({ item }: { item: AestheticGalleryItem }) {
  const visual = item.cardVisual;

  return (
    <Link href={item.detailPath} className="group block">
      <div
        className="relative overflow-hidden rounded-lg bg-[#F6F6F7] transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md"
        style={{ border: "1px solid #E3E3E3" }}
      >
        <div className="relative aspect-[4/3] overflow-hidden px-3 pb-2 pt-3 sm:px-4 sm:pt-4">
          {/* Desktop frame */}
          <div
            className="relative mx-auto h-[78%] w-[78%] overflow-hidden rounded-md bg-white shadow-sm"
            style={{ border: "1px solid #D4D4D4" }}
          >
            <div className="flex h-4 items-center gap-1 border-b border-[#ECECEC] bg-[#FAFAFA] px-1.5">
              <span className="h-1 w-1 rounded-full bg-[#FF5F57]" />
              <span className="h-1 w-1 rounded-full bg-[#FEBC2E]" />
              <span className="h-1 w-1 rounded-full bg-[#28C840]" />
            </div>
            <div className="relative h-[calc(100%-1rem)] overflow-hidden">
              {visual ? (
                <AestheticCardVisual visual={visual} name={item.name} accent={item.accent} />
              ) : (
                <div className="absolute inset-0" style={{ background: item.previewGradient }} />
              )}
            </div>
          </div>

          {/* Tablet peek */}
          <div
            className="pointer-events-none absolute bottom-3 left-[6%] w-[18%] overflow-hidden rounded-[6px] bg-white shadow-md transition duration-300 group-hover:translate-y-[-2px]"
            style={{ aspectRatio: "3/4", border: "2px solid #1a1a1a" }}
            aria-hidden
          >
            <div className="absolute inset-[2px] overflow-hidden rounded-[3px]">
              {visual ? (
                <AestheticCardVisual visual={visual} name={item.name} accent={item.accent} />
              ) : (
                <div className="h-full w-full" style={{ background: item.previewGradient }} />
              )}
            </div>
          </div>

          {/* Phone peek */}
          <div
            className="pointer-events-none absolute bottom-2 right-[7%] w-[14%] overflow-hidden rounded-[8px] bg-white shadow-lg transition duration-300 group-hover:translate-y-[-3px]"
            style={{ aspectRatio: "9/16", border: "2px solid #111" }}
            aria-hidden
          >
            <div className="absolute inset-[2px] overflow-hidden rounded-[5px]">
              {visual ? (
                <AestheticCardVisual visual={visual} name={item.name} accent={item.accent} />
              ) : (
                <div className="h-full w-full" style={{ background: item.previewGradient }} />
              )}
            </div>
          </div>

          <span className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-md bg-[#1A1A1A] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-white opacity-0 shadow-lg transition group-hover:opacity-100">
            View aesthetic
          </span>
        </div>
      </div>

      <div className="mt-2.5 px-0.5">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{ color: KEBU.muted, fontFamily: "var(--font-jost), system-ui, sans-serif" }}
        >
          {item.typeLabel}
        </p>
        <h3
          className="mt-0.5 text-[15px] font-semibold leading-snug tracking-tight"
          style={{ color: KEBU.black, fontFamily: "var(--font-jost), system-ui, sans-serif" }}
        >
          {item.name}
        </h3>
        <p
          className="mt-0.5 text-[12px] font-normal leading-snug line-clamp-1"
          style={{ color: KEBU.muted, fontFamily: "var(--font-jost), system-ui, sans-serif" }}
        >
          {item.tagline}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: "#E8F5E9", color: "#2D6A4F" }}
          >
            Free to try
          </span>
          <span className="text-[12px] font-semibold tabular-nums" style={{ color: KEBU.muted }}>
            {item.priceLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

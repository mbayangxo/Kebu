"use client";

import Link from "next/link";
import type { AestheticGalleryItem } from "@/lib/create/aesthetics-gallery";
import { KEBU } from "@/lib/kebu-brand";

/**
 * Inspired Themes–style gallery tile:
 * browser chrome + finished-site preview + title under the card (not a tall marketing billboard).
 */
export function AestheticGalleryCard({ item }: { item: AestheticGalleryItem }) {
  return (
    <Link href={item.detailPath} className="group block">
      <div
        className="relative overflow-hidden rounded-xl bg-white shadow-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md"
        style={{ border: `1px solid ${KEBU.border}` }}
      >
        {/* Browser chrome */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5"
          style={{ background: "#F3F1EE", borderBottom: `1px solid ${KEBU.border}` }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF5F57]" aria-hidden />
          <span className="h-1.5 w-1.5 rounded-full bg-[#FEBC2E]" aria-hidden />
          <span className="h-1.5 w-1.5 rounded-full bg-[#28C840]" aria-hidden />
          <span
            className="ml-2 flex-1 truncate rounded-full px-2 py-0.5 text-[8px] font-medium"
            style={{ background: "#fff", color: KEBU.muted }}
          >
            {item.slug}.kebu.africa
          </span>
        </div>

        {/* Site preview plane */}
        <div className="relative aspect-[16/11] overflow-hidden">
          <div className="absolute inset-0" style={{ background: item.previewGradient }} aria-hidden />
          {item.previewImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.previewImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col justify-between p-4">
              <p
                className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {item.wordmark ?? item.name}
              </p>
              <p className="max-w-[80%] text-lg font-bold leading-tight text-white" style={{ fontFamily: "var(--font-fraunces)" }}>
                {item.tagline}
              </p>
            </div>
          )}

          {/* Phone peek — Inspired Themes device hint */}
          <div
            className="pointer-events-none absolute bottom-2 right-2 w-[28%] overflow-hidden rounded-[10px] border-2 border-white/90 shadow-lg transition duration-300 group-hover:translate-y-[-2px]"
            style={{ aspectRatio: "9/16", background: "#0A0A0A" }}
            aria-hidden
          >
            <div className="absolute inset-[3px] overflow-hidden rounded-[7px]" style={{ background: item.previewGradient }}>
              {item.previewImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewImage} alt="" className="h-full w-full object-cover object-top" />
              ) : null}
            </div>
          </div>

          <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
          <span className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-black opacity-0 shadow-lg transition group-hover:opacity-100">
            View demo
          </span>
        </div>
      </div>

      <div className="mt-2.5 px-0.5">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: KEBU.orange }}>
          {item.typeLabel}
        </p>
        <h3 className="text-sm font-bold leading-snug" style={{ fontFamily: "var(--font-fraunces)" }}>
          {item.name}
        </h3>
        <p className="mt-0.5 text-[11px] line-clamp-1" style={{ color: KEBU.muted }}>
          {item.tagline}
        </p>
      </div>
    </Link>
  );
}

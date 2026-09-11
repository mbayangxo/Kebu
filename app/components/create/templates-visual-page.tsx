"use client";

import Link from "next/link";
import { TemplateGallery } from "@/app/components/create/template-gallery";
import type { GalleryTemplate } from "@/lib/create/template-gallery";
import { KEBU } from "@/lib/kebu-brand";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";

export function TemplatesVisualPage({
  templates,
  featured,
  flagship,
}: {
  templates: GalleryTemplate[];
  featured: GalleryTemplate[];
  flagship: GalleryTemplate[];
}) {
  return (
    <div className="min-h-full" style={{ background: KEBU.bright }}>
      <div className="px-5 sm:px-8 lg:px-16 py-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-1" style={{ color: KEBU.orange }}>
              Templates
            </p>
            <h1
              className="text-2xl sm:text-3xl font-bold"
              style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
            >
              Pick a layout — filter by business type
            </h1>
            <p className="text-sm mt-1 max-w-xl" style={{ color: KEBU.muted }}>
              Compact grid with live-style previews. May Lecor scroll motion is the real site experience — open preview,
              then use it on your account.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/create/new?mode=blank"
              className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider border"
              style={{ borderColor: KEBU.border, color: KEBU.black }}
            >
              Blank
            </Link>
            <Link
              href={MY_SITES_HREF}
              className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              My sites
            </Link>
          </div>
        </div>

        <TemplateGallery templates={templates} featured={featured} flagship={flagship} visualOnly compact />
      </div>
    </div>
  );
}

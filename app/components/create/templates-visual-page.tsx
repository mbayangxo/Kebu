"use client";

import Link from "next/link";
import { TemplateGallery } from "@/app/components/create/template-gallery";
import type { GalleryTemplate } from "@/lib/create/template-gallery";
import { KEBU } from "@/lib/kebu-brand";

export function TemplatesVisualPage({
  templates,
  featured,
}: {
  templates: GalleryTemplate[];
  featured: GalleryTemplate[];
}) {
  return (
    <div className="min-h-full">
      <div className="relative overflow-hidden" style={{ background: KEBU.black }}>
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          aria-hidden
          style={{
            background: `radial-gradient(ellipse 80% 100% at 100% 0%, ${KEBU.orange}, transparent 50%), radial-gradient(ellipse 60% 80% at 0% 100%, ${KEBU.red}, transparent 45%)`,
          }}
        />
        <div className="relative max-w-7xl mx-auto px-5 lg:px-10 py-10 lg:py-14">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] mb-2" style={{ color: KEBU.orange }}>
            Kebu Builder · Templates
          </p>
          <h1
            className="text-3xl lg:text-5xl font-black text-white max-w-3xl leading-[1.05]"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Pick a site you can see — not a brochure.
          </h1>
          <p className="text-sm mt-4 max-w-2xl leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
            Every card is a <strong className="text-white">live mini-site</strong> with real layout and placeholder
            photos. Tap to preview full screen, then start — upload your images in the editor and publish.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/create/new?mode=blank"
              className="rounded-full px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider border-2 border-white/80 text-white"
            >
              Start blank
            </Link>
            <Link
              href="/create/sites"
              className="rounded-full px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              My sites
            </Link>
          </div>
        </div>
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})` }} />
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-10 py-10 lg:py-14">
        <div
          className="rounded-2xl px-5 py-4 mb-8 flex flex-wrap items-center gap-4"
          style={{ background: KEBU.white, border: `2px solid ${KEBU.black}`, boxShadow: "4px 4px 0 #0A0A0A" }}
        >
          {[
            { n: "1", t: "See the real layout" },
            { n: "2", t: "Upload your photos" },
            { n: "3", t: "Edit text & colors" },
            { n: "4", t: "Publish live" },
          ].map((step) => (
            <div key={step.n} className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
                style={{ background: KEBU.orange }}
              >
                {step.n}
              </span>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: KEBU.black }}>
                {step.t}
              </span>
            </div>
          ))}
        </div>

        <TemplateGallery templates={templates} featured={featured} visualOnly />
      </div>
    </div>
  );
}

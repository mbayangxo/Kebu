"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Full-bleed template demo — site chrome only (no second black Kebu nav bar).
 * Page chips + Use CTA float over the live theme background.
 */
export function DemoTemplateView({
  definition,
  slug,
  name,
  initialPageSlug,
}: {
  definition: WebsiteDefinition;
  slug: string;
  name: string;
  tagline?: string;
  initialPageSlug?: string;
}) {
  const pages = definition.pages.slice().sort((a, b) => {
    if (a.slug === "home") return -1;
    if (b.slug === "home") return 1;
    return a.slug.localeCompare(b.slug);
  });
  const start =
    initialPageSlug && pages.some((p) => p.slug === initialPageSlug)
      ? initialPageSlug
      : pages[0]?.slug ?? "home";
  const [pageSlug, setPageSlug] = useState(start);
  const isMaylecor = slug.includes("maylecor") || slug.includes("legally");
  const themeBg = definition.theme?.background || (isMaylecor ? "#FFE4F0" : "#0a0a12");
  const themeText = definition.theme?.text || "#fff";

  return (
    <div className="relative min-h-screen" style={{ background: themeBg, color: themeText }}>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex items-start justify-between gap-3 p-3 sm:p-4">
        <Link
          href="/create/aesthetics"
          className="pointer-events-auto rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md"
          style={{ background: "rgba(10,10,10,0.72)", color: "#fff" }}
        >
          ← Aesthetic Gallery
        </Link>
        <div className="pointer-events-auto flex max-w-[min(100%,42rem)] flex-wrap items-center justify-end gap-2">
          {pages.length > 1 ? (
            <div
              className="flex max-h-[40vh] max-w-[70vw] flex-wrap justify-end gap-1 overflow-y-auto rounded-2xl p-1 backdrop-blur-md"
              style={{ background: "rgba(10,10,10,0.55)" }}
              role="navigation"
              aria-label="Demo pages"
            >
              {pages.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => setPageSlug(p.slug)}
                  className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    background: pageSlug === p.slug ? "#FF5500" : "transparent",
                    color: "#fff",
                  }}
                >
                  {p.title}
                </button>
              ))}
            </div>
          ) : null}
          <Link
            href={`/create/new?template=${encodeURIComponent(slug)}`}
            className="rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-wider"
            style={{ background: "#FF5500", color: "#fff" }}
          >
            Use {name.split(" ")[0] ?? "this"} →
          </Link>
        </div>
      </div>

      <SiteRenderer
        definition={definition}
        mode="preview"
        pageSlug={pageSlug}
        siteBase={`/create/demo/${slug}`}
        editor={{
          onNavigatePage: (next) => {
            const exists = pages.some((p) => p.slug === next);
            setPageSlug(exists ? next : pages[0]?.slug ?? "home");
          },
        }}
      />
    </div>
  );
}

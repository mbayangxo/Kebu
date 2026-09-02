"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { CreateShell } from "@/app/components/create/create-shell";

export function DemoTemplateView({
  definition,
  slug,
  name,
  tagline,
}: {
  definition: WebsiteDefinition;
  slug: string;
  name: string;
  tagline: string;
}) {
  const pages = definition.pages.slice().sort((a, b) => a.slug.localeCompare(b.slug));
  const [pageSlug, setPageSlug] = useState(pages[0]?.slug ?? "home");

  return (
    <div className="min-h-screen" style={{ background: "#0a0a12" }}>
      <CreateShell
        step="preview"
        title="Template preview"
        backHref="/create/templates"
        actions={
          <Link
            href={`/create/new?template=${slug}`}
            className="rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-wider"
            style={{ background: "#FF5500", color: "#fff" }}
          >
            Start with this →
          </Link>
        }
      />

      <div
        className="border-b px-4 py-3 text-center sm:text-left sm:px-6"
        style={{ background: "#0A0A0A", borderColor: "rgba(255,85,0,0.3)", color: "#fff" }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: "#FF5500" }}>
          Live preview · real layout & placeholder photos
        </p>
        <h1 className="mt-1 text-lg font-bold">{name}</h1>
        {pages.length > 1 ? (
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            {pages.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => setPageSlug(p.slug)}
                className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  background: pageSlug === p.slug ? "#FF5500" : "#1A1A1A",
                  color: "#fff",
                }}
              >
                {p.title}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mx-auto max-w-[100vw] overflow-hidden">
        <SiteRenderer
          definition={definition}
          mode="preview"
          pageSlug={pageSlug}
          siteBase={`/create/demo/${slug}`}
        />
      </div>
    </div>
  );
}

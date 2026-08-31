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
        backHref="/create"
        actions={
          <Link
            href={`/create/new?template=${slug}`}
            className="rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: "#00C851", color: "#0F0D33" }}
          >
            Use this template
          </Link>
        }
      />

      <div
        className="border-b px-4 py-3 text-center sm:text-left sm:px-6"
        style={{ background: "#12102a", borderColor: "rgba(255,255,255,0.08)", color: "#fff" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em]" style={{ color: "#00C851" }}>
          Live demo · no database needed
        </p>
        <h1 className="mt-1 text-lg font-bold">{name}</h1>
        <p className="text-sm text-white/60">{tagline}</p>
        {pages.length > 1 ? (
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            {pages.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => setPageSlug(p.slug)}
                className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  background: pageSlug === p.slug ? "#00C851" : "#1C1A45",
                  color: pageSlug === p.slug ? "#0F0D33" : "#fff",
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

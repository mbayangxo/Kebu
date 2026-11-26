/**
 * S3 — the Builder's KCD render path: QA-only flag guard, and the shared Editor/Preview view
 * (same result as 3B's editor canvas; failures surfaced, never a silent fallback).
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { builderKcdView } from "@/lib/create/kcd-adapter";
import { builderRenderPath } from "@/lib/create/kcd-render-flag";
import { buildEditorPreviewDefinition } from "@/lib/create/editor-definition";
import { parseSiteChrome } from "@/lib/create/site-chrome";
import { rowsFromDefinition, TEMPLATES } from "./adapter-fixtures";

describe("render path flag (QA / local only)", () => {
  const qa = { NEXT_PUBLIC_SUPABASE_URL: "https://skqnxyaeimvbyrmdfzvk.supabase.co" };
  it("is the 3B path unless explicitly enabled", () => {
    expect(builderRenderPath("p1", {})).toBe("3b");
    expect(builderRenderPath("p1", { ...qa, KEBU_KCD_RENDER: "" })).toBe("3b");
  });
  it("enables all projects or listed ones", () => {
    expect(builderRenderPath("p1", { ...qa, KEBU_KCD_RENDER: "all" })).toBe("kcd");
    expect(builderRenderPath("p1", { ...qa, KEBU_KCD_RENDER: "p0, p1" })).toBe("kcd");
    expect(builderRenderPath("p2", { ...qa, KEBU_KCD_RENDER: "p0, p1" })).toBe("3b");
  });
  it("never applies to a production deployment or the production database", () => {
    expect(builderRenderPath("p1", { ...qa, KEBU_KCD_RENDER: "all", VERCEL_ENV: "production" })).toBe("3b");
    expect(builderRenderPath("p1", { KEBU_KCD_RENDER: "all", NEXT_PUBLIC_SUPABASE_URL: "https://tnygqgcqlnlsmjpygrca.supabase.co" })).toBe("3b");
    expect(builderRenderPath("p1", { KEBU_KCD_RENDER: "all", SUPABASE_URL: "https://tnygqgcqlnlsmjpygrca.supabase.co" })).toBe("3b");
  });
});

describe("Builder view — the Editor canvas and Preview page input", () => {
  const owners = ["musician-maylecor-ksendr", "agency-kdirection", "agency-dklns", "production-ndaoan-house", "entertainment-rect", "foundation-mayjor-good", "fashion-atelier"];
  it.each(owners)("%s: identical canvas markup to 3B's editor on every page and device", (slug) => {
    const t = TEMPLATES.find((x) => x.slug === slug)!;
    const rows = rowsFromDefinition(t.definition, 0xb1, "normalized");
    // What the editor holds: the API rows (extra columns included) and the parsed chrome.
    const chrome = rows.project.site_chrome ? parseSiteChrome(rows.project.site_chrome) : null;
    const pages = rows.pages.map((p) => ({ ...p, created_at: "x", updated_at: "y" }));
    const view = builderKcdView({ project: rows.project, siteChrome: chrome, pages, sections: rows.sections });
    if (!view.ok) throw new Error(view.error);
    const theirs = buildEditorPreviewDefinition(rows.project as never, pages as never, rows.sections as never, chrome);
    for (const page of theirs.pages) {
      for (const editDevice of ["desktop", "tablet", "mobile"] as const) {
        const html = (definition: typeof theirs) => renderToStaticMarkup(createElement(SiteRenderer, { definition, mode: "preview", pageSlug: page.slug, editor: { editDevice } }));
        expect(html(view.definition), `${page.slug} ${editDevice}`).toBe(html(theirs));
      }
    }
  });

  it("reports a failure instead of falling back", () => {
    const rows = rowsFromDefinition(TEMPLATES[0].definition, 0xb2, "normalized");
    rows.sections[0].id = "not-a-uuid";
    const view = builderKcdView({ project: rows.project, siteChrome: null, pages: rows.pages, sections: rows.sections });
    expect(view).toEqual({ ok: false, error: expect.stringContaining("not a UUID") });
  });
});

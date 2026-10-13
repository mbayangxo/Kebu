/**
 * S3 gate — byte-identical HTML: the KCD renderer boundary (kcdRenderDefinition → SiteRenderer)
 * produces exactly today's markup for every corpus site:
 *
 *   Editor / Preview   every page × editDevice Desktop/Tablet/Phone, vs SiteRenderer on 3B's
 *                      buildEditorPreviewDefinition (the Builder canvas)
 *   Published / Live   every page, live mode (all three devices in one DOM, per-device CSS plan), vs
 *                      SiteRenderer on 3B's published snapshot (buildSnapshotFromDb composition →
 *                      validateWebsiteDefinition → loadPublicDeployment's parse), for every site 3B can
 *                      publish, excluding the reported chrome-conflict state (it differs by design, see
 *                      site-chrome-parity.test.ts)
 *
 * Each case renders whole multi-page sites, so cases get an explicit time budget (30 s).
 * Catalog products merged into snapshots at publish (project_products) are a publish-time data
 * merge of kcd-1 publishing (S7), not rendering; the corpus has none.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEVICES } from "@/lib/creative-core";
import { canonicalSiteChrome, kcdRenderDefinition, rowsToDocument, type ProjectRows } from "@/lib/create/kcd-adapter";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { buildDefinitionFromProjectParts, buildEditorPreviewDefinition } from "@/lib/create/editor-definition";
import { CHROME_HEADER_ID, applySiteChromeToDefinition, parseSiteChrome } from "@/lib/create/site-chrome";
import { validateWebsiteDefinition, websiteDefinitionSchema, type WebsiteDefinition } from "@/lib/create/website-schema";
import { rowsCorpus } from "./adapter-fixtures";

type Parts = Parameters<typeof buildDefinitionFromProjectParts>;
const SHARD = Number(process.env.KCD_RENDER_SHARD ?? 0);
const SHARDS = Number(process.env.KCD_RENDER_SHARDS ?? 1);

const CORPUS = rowsCorpus().filter(({ rows }, i) => rows.pages.length > 0 && i % SHARDS === SHARD);

const editorHtml = (definition: WebsiteDefinition, pageSlug: string, editDevice: (typeof DEVICES)[number]) =>
  renderToStaticMarkup(createElement(SiteRenderer, { definition, mode: "preview", pageSlug, editor: { editDevice } }));
const liveHtml = (definition: WebsiteDefinition, pageSlug: string) =>
  renderToStaticMarkup(createElement(SiteRenderer, { definition, mode: "live", pageSlug, siteBase: "/sites/parity", projectId: "p" }));

/**
 * 3B's published definition as live renders it (buildSnapshotFromDb composition → schema parse, as
 * validateWebsiteDefinition and loadPublicDeployment do). 3B's go-live additionally refuses every
 * multi-page site with site chrome ("Duplicate section id: kebu-chrome-header" — a 3B defect, see
 * the characterization §12); those are compared against what 3B would have published. Null when the
 * snapshot is invalid for any other reason (adversarial mutations 3B cannot publish).
 */
function threeBLive(rows: ProjectRows): { definition: WebsiteDefinition; goLiveRefuses: boolean } | null {
  const base = buildDefinitionFromProjectParts(rows.project as Parts[0], rows.pages as Parts[1], rows.sections as Parts[2]);
  const snapshot = applySiteChromeToDefinition(
    { ...base, theme: (rows.project.theme ?? {}) as WebsiteDefinition["theme"], seo: (rows.project.seo ?? undefined) as WebsiteDefinition["seo"] },
    parseSiteChrome(rows.project.site_chrome),
  );
  const validated = validateWebsiteDefinition(snapshot);
  const goLiveRefuses = !validated.ok && validated.error === `Duplicate section id: ${CHROME_HEADER_ID}`;
  if (!validated.ok && !goLiveRefuses) return null;
  const stored = validated.ok ? validated.data : websiteDefinitionSchema.parse(snapshot);
  const live = websiteDefinitionSchema.safeParse(JSON.parse(JSON.stringify(stored)));
  return live.success ? { definition: live.data, goLiveRefuses } : null;
}

describe("byte-identical HTML — Editor/Preview (every page × Desktop/Tablet/Phone)", { timeout: 30_000 }, () => {
  it.each(CORPUS.map((c) => [c.name, c.rows] as const))("%s", (_name, rows) => {
    const view = kcdRenderDefinition(rowsToDocument(rows).document);
    const ours3b = buildEditorPreviewDefinition(rows.project as Parts[0], rows.pages as Parts[1], rows.sections as Parts[2], parseSiteChrome(rows.project.site_chrome));
    for (const page of ours3b.pages) {
      for (const device of DEVICES) {
        expect(editorHtml(view, page.slug, device), `${page.slug} ${device}`).toBe(editorHtml(ours3b, page.slug, device));
      }
    }
  });
});

describe("byte-identical HTML — Published/Live (every page)", { timeout: 30_000 }, () => {
  const counts = { compared: 0, goLiveRefuses: 0, normalized: 0 };
  it.each(CORPUS.map((c) => [c.name, c.rows] as const))("%s", (name, rows) => {
    const { document } = rowsToDocument(rows);
    const theirs = threeBLive(rows);
    if (!theirs || canonicalSiteChrome(document).conflict) return;
    const view = kcdRenderDefinition(document);
    for (const page of theirs.definition.pages) expect(liveHtml(view, page.slug), page.slug).toBe(liveHtml(theirs.definition, page.slug));
    counts.compared++;
    if (name.endsWith("(normalized)")) counts.normalized++;
    if (theirs.goLiveRefuses) counts.goLiveRefuses++;
  });
  it("compared every template as 3B stores it, and every other snapshot 3B's schema accepts", () => {
    if (SHARDS === 1) {
      expect(counts.normalized, "every schema-normalized template").toBe(126);
      expect(counts.compared).toBeGreaterThan(250);
      expect(counts.goLiveRefuses, "multi-page chrome sites 3B's go-live refuses").toBeGreaterThan(200);
    }
  });
});

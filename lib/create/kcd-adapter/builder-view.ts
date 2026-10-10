/**
 * The Builder's KCD render path (S3): the project's stored parts → document → the one render view.
 * Used by the Editor canvas and the Preview page alike, so both show the canonical result.
 * Failures are returned, not thrown, so the surface can show them — never a silent fallback to 3B.
 */
import type { KcdDocument } from "@/lib/creative-core";
import { resolveEditorTheme } from "@/lib/create/editor-definition";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { AdapterError } from "./errors";
import { kcdRenderDefinition, kcdLegacyRenderDefinition } from "./render-view";
import { tokensFromTheme } from "./legacy";
import { rowsToDocument, type PageRow, type SectionRow } from "./rows";

export interface BuilderParts {
  project: { id: string; title: string; theme?: unknown; seo?: unknown; document_schema_version?: string | null };
  /** The site chrome the Builder holds (stored value, or its parsed form); undefined when none is loaded. */
  siteChrome: unknown;
  pages: readonly PageRow[];
  sections: readonly SectionRow[];
}

export type BuilderView = { ok: true; definition: WebsiteDefinition; nativeDocument?: KcdDocument } | { ok: false; error: string };

export function builderKcdView({ project, siteChrome, pages, sections }: BuilderParts): BuilderView {
  try {
    const { document } = rowsToDocument({
      project: {
        id: project.id,
        title: project.title,
        theme: project.theme,
        seo: project.seo,
        document_schema_version: project.document_schema_version,
        ...(siteChrome == null ? {} : { site_chrome: siteChrome }),
      },
      pages: pages.map((page) => ({ ...page, device_layouts: page.device_layouts ?? null })),
      sections: sections.map((section) => ({ ...section })),
    });
    const native = Object.values(document.nodes).some((node) => !node.type.startsWith("legacy-section:"));
    return { ok: true, definition: native ? kcdLegacyRenderDefinition(document) : kcdRenderDefinition(document), ...(native ? { nativeDocument: document } : {}) };
  } catch (e) {
    const message = e instanceof AdapterError ? e.message : "Unexpected error while building the page.";
    return { ok: false, error: message };
  }
}

/** Validated coordinator documents are already canonical: adapting their rows again is a full-document write boundary. */
export function builderKcdDocumentView(
  document: KcdDocument,
  project: BuilderParts["project"],
  siteChrome: unknown,
  render: (document: KcdDocument) => WebsiteDefinition,
): BuilderView {
  try {
    const viewDocument = { ...document, tokens: { ...document.tokens, ...tokensFromTheme(resolveEditorTheme(project.theme)) }, title: project.title, meta: {
      ...document.meta, seo: project.seo, siteChrome,
    } };
    const definition = render(viewDocument);
    const native = Object.values(document.nodes).some((node) => !node.type.startsWith("legacy-section:"));
    return { ok: true, definition: { ...definition, theme: resolveEditorTheme(project.theme) }, ...(native ? { nativeDocument: viewDocument } : {}) };
  } catch (error) {
    return { ok: false, error: error instanceof AdapterError ? error.message : "Unexpected error while building the page." };
  }
}

"use client";

import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { SiteRenderer } from "@/app/components/create/site-renderer";

export type BuilderEditorState = {
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  onPatchSection: (sectionId: string, patch: Record<string, unknown>) => void;
  onMoveFreeTextBlock: (sectionId: string, blockId: string, x: number, y: number) => void;
};

/** Shopify-style canvas: click sections in preview, inline text edit, drag free-text blocks. */
export function BuilderEditablePreview({
  definition,
  pageSlug,
  siteBase,
  editor,
}: {
  definition: WebsiteDefinition;
  pageSlug: string;
  siteBase?: string;
  editor: BuilderEditorState;
}) {
  return (
    <div className="relative min-h-full">
      <p className="absolute top-2 left-2 z-20 rounded-full bg-black/70 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white pointer-events-none">
        Click any block to edit · drag text blocks to move
      </p>
      <SiteRenderer
        definition={definition}
        mode="preview"
        pageSlug={pageSlug}
        siteBase={siteBase}
        editor={{
          ...editor,
          inlineEdit: true,
        }}
      />
    </div>
  );
}

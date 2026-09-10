"use client";

import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import type { BuilderDevice } from "@/lib/create/builder-device";
import {
  KEBU_ASSET_DRAG_MIME,
  dropPercentFromClient,
  parseKebuDragAsset,
  type KebuDragAsset,
} from "@/lib/create/builder-media-drop";
import { AddSectionPicker } from "@/app/components/create/add-section-picker";
import { useDataMode } from "@/app/components/create/data-mode-provider";
import { useRef, useState } from "react";

export type BuilderEditorState = {
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  onPatchSection: (sectionId: string, patch: Record<string, unknown>) => void;
  onMoveFreeTextBlock: (sectionId: string, blockId: string, x: number, y: number) => void;
  /** Switch the builder preview to another site page (keeps you in the editor). */
  onNavigatePage?: (slug: string) => void;
  onDuplicateSection?: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onMoveSection?: (sectionId: string, direction: "up" | "down") => void;
  /** Add a section below — makes the page longer (Shopify-style). */
  onAddSection?: (type: string) => void | Promise<void>;
  /** B8: insert after section id on inline canvas stack (null = top). */
  onAddSectionAfter?: (type: string, afterSectionId: string | null) => void | Promise<void>;
};

/** Shopify-style canvas: click sections in preview, inline text edit, drag free-text / K-Direction photos. */
export function BuilderEditablePreview({
  definition,
  pageSlug,
  siteBase,
  projectId,
  device = "desktop",
  editor,
  onAssetDrop,
  pageTitle = "Home",
  /** When true, site fills the pane — no + Add section strip under the canvas. */
  canvasFill = false,
}: {
  definition: WebsiteDefinition;
  pageSlug: string;
  siteBase?: string;
  projectId?: string;
  device?: BuilderDevice;
  editor: BuilderEditorState;
  /** Drop from Media library onto the canvas. */
  onAssetDrop?: (asset: KebuDragAsset, drop: { leftPct: number; topPct: number }) => void;
  pageTitle?: string;
  canvasFill?: boolean;
}) {
  const { mode: dataMode } = useDataMode();
  const rootRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      ref={rootRef}
      className={canvasFill ? "relative flex min-h-full w-full flex-1 flex-col" : "relative min-h-full"}
      onDragOver={(e) => {
        if (!onAssetDrop) return;
        if (
          e.dataTransfer.types.includes(KEBU_ASSET_DRAG_MIME) ||
          e.dataTransfer.types.includes("text/uri-list")
        ) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!onAssetDrop || !rootRef.current) return;
        e.preventDefault();
        setDragOver(false);
        const asset =
          parseKebuDragAsset(e.dataTransfer.getData(KEBU_ASSET_DRAG_MIME)) ??
          (() => {
            const uri = e.dataTransfer.getData("text/uri-list")?.split("\n")[0]?.trim();
            return uri ? ({ url: uri, kind: "image" } as KebuDragAsset) : null;
          })();
        if (!asset) return;
        const drop = dropPercentFromClient(rootRef.current, e.clientX, e.clientY);
        onAssetDrop(asset, drop);
      }}
    >
      {dragOver ? (
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-lg border-2 border-dashed"
          style={{ borderColor: "#FF5500", background: "rgba(255,85,0,0.12)" }}
        >
          <span className="rounded-full bg-black/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Drop to add to site
          </span>
        </div>
      ) : null}
      <div className={canvasFill ? "min-h-full w-full flex-1" : undefined}>
        <SiteRenderer
          definition={definition}
          mode="preview"
          pageSlug={pageSlug}
          siteBase={siteBase}
          projectId={projectId}
          dataMode={dataMode}
          editor={{
            ...editor,
            inlineEdit: true,
            editDevice: device,
            onAddSectionAfter: editor.onAddSectionAfter,
          }}
        />
      </div>
      {editor.onAddSection && !editor.onAddSectionAfter && !canvasFill ? (
        <div className="border-t border-dashed border-black/15 bg-[#FAFAF8] px-4 py-6">
          <div className="mx-auto max-w-md">
            <AddSectionPicker
              pageTitle={pageTitle}
              onAdd={async (type) => {
                await editor.onAddSection?.(type);
              }}
            />
            <p className="mt-2 text-center text-[11px] text-black/45">
              Add a section to make the page longer. Select a section on the site, then Remove to shorten it.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

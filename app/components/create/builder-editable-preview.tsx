"use client";

import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import type { BuilderDevice } from "@/lib/create/builder-device";
import { labelBuilderDevice } from "@/lib/create/builder-device";
import {
  KEBU_ASSET_DRAG_MIME,
  dropPercentFromClient,
  parseKebuDragAsset,
  type KebuDragAsset,
} from "@/lib/create/builder-media-drop";
import { useRef, useState } from "react";

export type BuilderEditorState = {
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  onPatchSection: (sectionId: string, patch: Record<string, unknown>) => void;
  onMoveFreeTextBlock: (sectionId: string, blockId: string, x: number, y: number) => void;
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
}: {
  definition: WebsiteDefinition;
  pageSlug: string;
  siteBase?: string;
  projectId?: string;
  device?: BuilderDevice;
  editor: BuilderEditorState;
  /** Drop from Media library onto the canvas. */
  onAssetDrop?: (asset: KebuDragAsset, drop: { leftPct: number; topPct: number }) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      ref={rootRef}
      className="relative min-h-full"
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
      <p className="absolute top-2 left-2 z-20 rounded-full bg-black/70 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white pointer-events-none">
        {labelBuilderDevice(device)} · Media tab → drag photos here · reorder nav in Content
      </p>
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
      <SiteRenderer
        definition={definition}
        mode="preview"
        pageSlug={pageSlug}
        siteBase={siteBase}
        projectId={projectId}
        editor={{
          ...editor,
          inlineEdit: true,
          editDevice: device,
        }}
      />
    </div>
  );
}

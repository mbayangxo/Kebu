"use client";

import { useState } from "react";
import { STUDIO_CREATE_PRESETS } from "@/lib/studio/create-presets";
import { resizeCanvasDocument } from "@/lib/studio/editor-craft";
import type { CanvasDocument, StudioDesignType } from "@/lib/studio/canvas-document";

/** S14 — change artboard size / design format, scale layers. */
export function StudioResizeDialog({
  document: doc,
  onApply,
  onClose,
}: {
  document: CanvasDocument;
  onApply: (next: CanvasDocument, designType?: StudioDesignType) => void;
  onClose: () => void;
}) {
  const page = doc.pages[0]!;
  const [width, setWidth] = useState(page.width);
  const [height, setHeight] = useState(page.height);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Resize design</p>
            <p className="text-sm opacity-70 mt-1">Scales all pages and layers to the new artboard.</p>
          </div>
          <button type="button" className="text-sm underline opacity-60" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {STUDIO_CREATE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="rounded-xl border border-black/10 px-3 py-2 text-left text-xs hover:border-orange-400"
              onClick={() => {
                onApply(resizeCanvasDocument(doc, { designType: p.designType }), p.designType);
                onClose();
              }}
            >
              <span className="font-semibold">{p.label}</span>
              <span className="block opacity-50">
                {p.width}×{p.height}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-end border-t border-black/5 pt-3">
          <label className="text-xs font-semibold">
            W
            <input
              type="number"
              min={200}
              max={4096}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value) || 200)}
              className="mt-1 block w-24 rounded-lg border border-black/10 px-2 py-1.5"
            />
          </label>
          <label className="text-xs font-semibold">
            H
            <input
              type="number"
              min={200}
              max={4096}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value) || 200)}
              className="mt-1 block w-24 rounded-lg border border-black/10 px-2 py-1.5"
            />
          </label>
          <button
            type="button"
            className="rounded-full px-4 py-2 text-xs font-bold text-white"
            style={{ background: "#0F0D33" }}
            onClick={() => {
              onApply(resizeCanvasDocument(doc, { width, height }));
              onClose();
            }}
          >
            Apply custom
          </button>
        </div>
      </div>
    </div>
  );
}

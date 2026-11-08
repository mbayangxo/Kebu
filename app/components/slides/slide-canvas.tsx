"use client";

import { useCallback, useRef } from "react";
import { resizeCreativeBounds, type ResizeHandle } from "@/lib/creative-core/resize";
import type { Slide, SlideLayer } from "@/lib/slides/schema";
import { SlideStage, useStageScale } from "@/app/components/slides/slide-render";

const HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const HANDLE_CURSOR: Record<ResizeHandle, string> = {
  n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
  ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize",
};

type Props = {
  slide: Slide;
  deckWidth: number;
  deckHeight: number;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onPatchLayers: (patches: Record<string, Partial<SlideLayer>>) => void;
};

export function SlideCanvas({ slide, deckWidth, deckHeight, selectedIds, onSelect, onPatchLayers }: Props) {
  const { containerRef, scale } = useStageScale(deckWidth, deckHeight);
  const dragRef = useRef<{ kind: "move" | "resize" | "rotate"; layerId: string; startX: number; startY: number; starts: Record<string, SlideLayer>; handle?: ResizeHandle } | null>(null);

  const layersById = useCallback((ids: string[]) => {
    const out: Record<string, SlideLayer> = {};
    for (const layer of slide.layers) if (ids.includes(layer.id)) out[layer.id] = layer;
    return out;
  }, [slide.layers]);

  const onLayerPointerDown = useCallback((e: React.PointerEvent, layer: SlideLayer) => {
    e.stopPropagation();
    const nextSelection = e.shiftKey
      ? (selectedIds.includes(layer.id) ? selectedIds.filter((id) => id !== layer.id) : [...selectedIds, layer.id])
      : (selectedIds.includes(layer.id) ? selectedIds : [layer.id]);
    onSelect(nextSelection);
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { kind: "move", layerId: layer.id, startX: e.clientX, startY: e.clientY, starts: layersById(nextSelection) };
  }, [selectedIds, onSelect, layersById]);

  const onHandlePointerDown = useCallback((e: React.PointerEvent, layer: SlideLayer, handle: ResizeHandle) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { kind: "resize", layerId: layer.id, startX: e.clientX, startY: e.clientY, starts: { [layer.id]: layer }, handle };
  }, []);

  const onRotateHandlePointerDown = useCallback((e: React.PointerEvent, layer: SlideLayer) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { kind: "rotate", layerId: layer.id, startX: e.clientX, startY: e.clientY, starts: { [layer.id]: layer } };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || scale <= 0) return;
    const dxScreen = e.clientX - drag.startX;
    const dyScreen = e.clientY - drag.startY;
    const dx = dxScreen / scale;
    const dy = dyScreen / scale;

    if (drag.kind === "move") {
      const patches: Record<string, Partial<SlideLayer>> = {};
      for (const [id, start] of Object.entries(drag.starts)) {
        patches[id] = { x: start.x + dx, y: start.y + dy };
      }
      onPatchLayers(patches);
      return;
    }

    if (drag.kind === "resize" && drag.handle) {
      const start = drag.starts[drag.layerId]!;
      const next = resizeCreativeBounds(
        { x: start.x, y: start.y, width: start.width, height: start.height, rotation: start.rotation },
        drag.handle,
        { x: dx, y: dy },
        { keepRatio: false, minSize: 8, maxSize: 8000 },
      );
      onPatchLayers({ [drag.layerId]: next });
      return;
    }

    if (drag.kind === "rotate") {
      const start = drag.starts[drag.layerId]!;
      const centerX = start.x + start.width / 2;
      const centerY = start.y + start.height / 2;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pointerDeckX = (e.clientX - rect.left) / scale;
      const pointerDeckY = (e.clientY - rect.top) / scale;
      const angle = Math.atan2(pointerDeckY - centerY, pointerDeckX - centerX) * (180 / Math.PI) + 90;
      onPatchLayers({ [drag.layerId]: { rotation: Math.round(angle) } });
    }
  }, [scale, onPatchLayers, containerRef]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none overflow-hidden bg-black/5"
      onPointerDown={() => onSelect([])}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <SlideStage slide={slide} deckWidth={deckWidth} deckHeight={deckHeight} scale={scale} />
      {slide.layers.map((layer) => {
        const selected = selectedIds.includes(layer.id);
        const left = layer.x * scale;
        const top = layer.y * scale;
        const width = layer.width * scale;
        const height = layer.height * scale;
        return (
          <div key={layer.id} style={{ position: "absolute", left, top, width, height, transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined, cursor: "move" }}>
            <div
              data-testid={`layer-${layer.id}`}
              className="absolute inset-0"
              style={{ outline: selected ? "2px solid #FF6A00" : undefined, outlineOffset: 1 }}
              onPointerDown={(e) => onLayerPointerDown(e, layer)}
            />
            {selected && selectedIds.length === 1 ? (
              <>
                {HANDLES.map((handle) => (
                  <div
                    key={handle}
                    data-testid={`handle-${handle}`}
                    onPointerDown={(e) => onHandlePointerDown(e, layer, handle)}
                    className="absolute h-2.5 w-2.5 rounded-full border border-[#FF6A00] bg-white"
                    style={{
                      cursor: HANDLE_CURSOR[handle],
                      left: handle.includes("w") ? -5 : handle.includes("e") ? width - 5 : width / 2 - 5,
                      top: handle.includes("n") ? -5 : handle.includes("s") ? height - 5 : height / 2 - 5,
                    }}
                  />
                ))}
                <div
                  data-testid="handle-rotate"
                  onPointerDown={(e) => onRotateHandlePointerDown(e, layer)}
                  className="absolute h-2.5 w-2.5 cursor-grab rounded-full border border-[#FF6A00] bg-white"
                  style={{ left: width / 2 - 5, top: -24 }}
                />
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

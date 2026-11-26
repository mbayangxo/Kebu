"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Slide, SlideLayer } from "@/lib/slides/schema";

/** Tracks the rendered width of a container and returns the scale factor to fit a fixed deckWidth x deckHeight stage inside it. */
export function useStageScale(deckWidth: number, deckHeight: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      setScale(Math.min(w / deckWidth, h / deckHeight));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [deckWidth, deckHeight]);

  return { containerRef, scale };
}

export function layerToStyle(layer: SlideLayer): CSSProperties {
  const base: CSSProperties = {
    position: "absolute",
    left: layer.x,
    top: layer.y,
    width: layer.width,
    height: layer.height,
    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
    opacity: layer.opacity ?? 1,
  };
  if (layer.type === "rect" || layer.type === "ellipse") {
    return {
      ...base,
      background: layer.fill || "transparent",
      border: layer.strokeWidth ? `${layer.strokeWidth}px solid ${layer.stroke || "#000"}` : undefined,
      borderRadius: layer.type === "ellipse" ? "50%" : layer.cornerRadius ? `${layer.cornerRadius}px` : undefined,
    };
  }
  if (layer.type === "line") {
    return {
      ...base,
      height: Math.max(layer.height, layer.strokeWidth ?? 2),
      background: layer.stroke || "#111",
    };
  }
  if (layer.type === "image") {
    return base;
  }
  // text
  return {
    ...base,
    color: layer.color || "#111",
    fontSize: layer.fontSize ?? 24,
    fontFamily: layer.fontFamily || undefined,
    fontWeight: layer.fontWeight === "bold" ? 700 : 400,
    fontStyle: layer.fontStyle === "italic" ? "italic" : "normal",
    textAlign: layer.textAlign ?? "left",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflow: "hidden",
    lineHeight: 1.25,
  };
}

export function SlideLayerVisual({ layer }: { layer: SlideLayer }) {
  if (layer.type === "image") {
    return (
      <div style={layerToStyle(layer)}>
        {layer.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={layer.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black/5 text-[10px] text-black/30">No image</div>
        )}
      </div>
    );
  }
  if (layer.type === "text") {
    return <div style={layerToStyle(layer)}>{layer.text}</div>;
  }
  return <div style={layerToStyle(layer)} />;
}

/** Pure, read-only render of one slide at a fixed deckWidth x deckHeight -- shared by the editor canvas (as its background) and present mode. */
export function SlideStage({ slide, deckWidth, deckHeight, scale }: { slide: Slide; deckWidth: number; deckHeight: number; scale: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: deckWidth,
        height: deckHeight,
        background: slide.backgroundColor || "#fff",
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        overflow: "hidden",
      }}
      data-testid="slide-stage"
    >
      {slide.layers.map((layer) => (
        <SlideLayerVisual key={layer.id} layer={layer} />
      ))}
    </div>
  );
}

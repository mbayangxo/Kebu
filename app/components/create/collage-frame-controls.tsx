"use client";

import { useLayoutEffect, useState } from "react";

export type CollageFrameMetrics = { width: number; height: number; sourceWidth: number; sourceHeight: number };
export function measureCollageFrame(storageKey: string, device: string): CollageFrameMetrics | null {
  const doc = device === "desktop" ? document : document.querySelector<HTMLIFrameElement>(`iframe[title="${device} preview"]`)?.contentDocument;
  const source = doc?.querySelector<HTMLElement>(`[data-kebu-source="${CSS.escape(storageKey)}"]`);
  const frame = source?.querySelector<HTMLElement>("[data-kebu-layer]");
  if (!source || !frame || !source.offsetWidth || !source.offsetHeight) return null;
  const size = (element: HTMLElement) => {
    const css = element.ownerDocument.defaultView!.getComputedStyle(element);
    return { width: parseFloat(css.width), height: parseFloat(css.height) };
  };
  const visible = size(frame), original = size(source);
  if (![visible.width, visible.height, original.width, original.height].every(value => Number.isFinite(value) && value > 0)) return null;
  return { ...visible, sourceWidth: original.width, sourceHeight: original.height };
}

/** Measurements are unrotated logical scene pixels, including in a scaled device iframe. */
export function CollageFrameControls({ storageKey, device, sectionProps, onPatch }: {
  storageKey: string; device: string; sectionProps: Record<string, unknown>; onPatch: (patch: Record<string, unknown>) => void;
}) {
  const [metrics, setMetrics] = useState<CollageFrameMetrics | null>(null);
  useLayoutEffect(() => {
    const doc = device === "desktop" ? document : document.querySelector<HTMLIFrameElement>(`iframe[title="${device} preview"]`)?.contentDocument;
    const source = doc?.querySelector<HTMLElement>(`[data-kebu-source="${CSS.escape(storageKey)}"]`);
    if (!source) return;
    const update = () => setMetrics(measureCollageFrame(storageKey, device));
    update(); const observer = new ResizeObserver(update); observer.observe(source);
    const frame = source.querySelector<HTMLElement>("[data-kebu-layer]"); if (frame) observer.observe(frame);
    return () => observer.disconnect();
  }, [device, storageKey, sectionProps]);
  const map = (name: string) => sectionProps[name] as Record<string, unknown> | undefined ?? {};
  const ratio = (width: number, height: number) => ({ layerFrameAspectRatio: { ...map("layerFrameAspectRatio"), [storageKey]: Math.max(.02, Math.min(50, width / height)) } });
  const resize = (axis: "width" | "height", value: number) => {
    const current = measureCollageFrame(storageKey, device);
    if (!current || !Number.isFinite(value) || value < 8 || value > 10000) return;
    if (Math.abs(current[axis] - value) < .6) return current[axis];
    const width = axis === "width" ? value : current.width, height = axis === "height" ? value : current.height;
    if (axis === "width") {
      const scales = map("layerWidthScale"), old = typeof scales[storageKey] === "number" ? scales[storageKey] as number : 1;
      const boundedWidth = Math.max(height * .02, Math.min(height * 50, width));
      const next = Math.max(.15, Math.min(3, old * boundedWidth / current.width));
      const actualWidth = current.width * next / old;
      onPatch({ layerWidthScale: { ...scales, [storageKey]: next }, ...ratio(actualWidth, height) });
      return actualWidth;
    } else {
      const actualHeight = Math.max(width / 50, Math.min(width / .02, height));
      onPatch(ratio(width, actualHeight)); return actualHeight;
    }
  };
  const explicit = typeof map("layerFrameAspectRatio")[storageKey] === "number";
  if (!metrics) return null;
  return <div className="space-y-2">
    <p className="text-[10px] text-black/60">Corners keep proportions. Side handles resize the frame. Alt keeps its center.</p>
    <div className="grid grid-cols-2 gap-2">
      {(["width", "height"] as const).map(axis => <label key={axis} className="text-[11px] font-semibold text-black/65">{axis === "width" ? "Frame width" : "Frame height"} (px)
        <input key={`${storageKey}:${device}:${metrics?.[axis]}`} aria-label={`Frame ${axis} in pixels`} disabled={!metrics} type="number" min="8" max="10000" step="1"
          className="mt-1 w-full rounded-md border border-black/15 bg-white px-2 py-1.5 text-xs" defaultValue={metrics ? Math.round(metrics[axis]) : ""}
          onBlur={event => {
            const input = event.currentTarget;
            if (!input.value || !input.checkValidity()) { input.reportValidity(); input.value = String(Math.round(metrics[axis])); return; }
            const actual = resize(axis, Number(input.value));
            if (actual !== undefined) input.value = String(Math.round(actual));
          }}
          onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
      </label>)}
    </div>
    <label className="block text-[11px] font-semibold text-black/65">Image fit
      <select aria-label="Image fit" disabled={!metrics} value={explicit ? String(map("layerFrameFit")[storageKey] ?? "cover") : "original"}
        className="mt-1 w-full rounded-md border border-black/15 bg-white px-2 py-1.5 text-xs"
        onChange={event => { const current = measureCollageFrame(storageKey, device); if (current) onPatch({ ...ratio(current.sourceWidth, current.sourceHeight), layerFrameFit: { ...map("layerFrameFit"), [storageKey]: event.currentTarget.value } }); }}>
        {!explicit ? <option value="original" disabled>Original appearance</option> : null}
        <option value="cover">Fill frame (crop)</option><option value="contain">Fit whole image</option><option value="fill">Stretch to frame</option>
      </select>
    </label>
  </div>;
}

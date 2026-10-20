"use client";
import { useState } from "react";
import { cutoutScrollOffset } from "@/lib/create/maylecor-cutout-motion";

type Travel = { x: number; y: number };
const slots = [["cutoutLeft", "Left image"], ["cutoutRight", "Right image"], ["cutoutAccent", "Accent image"], ["heroPhoto", "Story photo"], ["macbook", "Background image"], ["cutoutSparkle", "Sticker"], ["titleLogo", "Title"]] as const;

/** Saved scroll travel, in pixels across the section's complete pinned scene. */
export function CollageScrollInspector({ value, onChange, onNavigationChange }: { value: Record<string, unknown>; onChange: (layerScroll: Record<string, Travel>) => void; onNavigationChange?: (visible: boolean) => void }) {
  const extras = (Array.isArray(value.extraCutouts) ? value.extraCutouts : []) as { id: string; src?: string; alt?: string; parallaxRole?: string }[];
  const layers = [...slots.filter(([id]) => id === "titleLogo" || Boolean(value[id])).map(([id, label]) => ({ id, label: String(label), scrollKey: id })), ...extras.filter(item => item.src).map((item, index) => ({ id: item.id, label: item.alt || `Cutout ${index + 1}`, scrollKey: item.parallaxRole === "city" ? "macbook" : item.parallaxRole === "figure" ? "cutoutAccent" : item.id }))];
  const [chosen, setChosen] = useState("");
  const layer = layers.find(item => item.id === chosen) ?? layers[0];
  if (!layer) return null;
  const saved = (value.layerScroll ?? {}) as Record<string, Travel>;
  const defaults = cutoutScrollOffset(layer.scrollKey, 1);
  const travel = saved[layer.id] ?? { x: defaults.x, y: defaults.y };
  const patch = (next: Travel) => onChange({ ...saved, [layer.id]: next });
  return <details className="rounded-lg border border-black/15 p-3"><summary className="cursor-pointer text-xs font-bold">Scroll-driven cutout movement</summary><div className="mt-3 space-y-3">
    {onNavigationChange ? <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={value.showNavigation !== false} onChange={event => onNavigationChange(event.target.checked)} />Show navigation on this scene</label> : null}
    <p className="text-xs">Cutouts move as the visitor scrolls through this scene. Enable motion and parallax to preview it. Reduced-motion visitors keep a still layout.</p>
    <label className="block text-xs">Moving layer<select aria-label="Moving layer" className="mt-1 w-full rounded border p-2" value={layer.id} onChange={event => setChosen(event.target.value)}>{layers.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <div className="flex flex-wrap gap-2">{([['Left',-160,0],['Right',160,0],['Up',0,-160],['Down',0,160],['Still',0,0]] as const).map(([label,x,y]) => <button type="button" className="rounded border px-2 py-1 text-xs" key={label} onClick={() => patch({ x, y })}>{label}</button>)}</div>
    {([['x','Horizontal travel (px)'],['y','Vertical travel (px)']] as const).map(([axis,label]) => <label key={axis} className="block text-xs">{label}<input aria-label={label} type="number" className="mt-1 w-full rounded border p-2" min={-600} max={600} value={travel[axis]} onChange={event => patch({ ...travel, [axis]: Math.max(-600, Math.min(600, Number(event.target.value))) })} /></label>)}
    <button type="button" className="text-xs underline" onClick={() => { const next = { ...saved }; delete next[layer.id]; onChange(next); }}>Reset this layer’s movement</button>
  </div></details>;
}

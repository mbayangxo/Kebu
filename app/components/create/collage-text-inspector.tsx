"use client";
import { useState } from "react";
import { COLLAGE_TEXT_FONTS, type CollageText } from "@/lib/create/collage-text";

export function CollageTextInspector({ value, onChange }: { value: unknown; onChange: (layers: CollageText[]) => void }) {
  const layers = (Array.isArray(value) ? value : []) as CollageText[];
  const [selected, setSelected] = useState("");
  const texts = layers.filter(layer => layer.kind === "text");
  const layer = texts.find(item => item.id === selected) ?? texts[0];
  const patch = (next: Partial<CollageText>) => layer && onChange(layers.map(item => item.id === layer.id ? { ...item, ...next } : item));
  return <details className="rounded-lg border border-black/15 p-3"><summary className="cursor-pointer text-xs font-bold">Scene text</summary><div className="mt-3 space-y-3 text-xs">
    <p>Layer independent headings and notes over the collage. Phone and tablet edits use the selected device layout.</p>
    <button type="button" className="min-h-11 rounded border px-3 disabled:opacity-40" disabled={layers.length >= 12} onClick={() => { const id = `text-${crypto.randomUUID().slice(0, 8)}`; onChange([...layers, { id, kind: "text", src: "", text: "Your story", leftPct: 10, topPct: 25, widthPct: 60, fontSize: 96, fontFamily: "editorial", textColor: "#e9006b", outlineColor: "#ffffff", outlineWidth: 4, zIndex: 20 }]); setSelected(id); }}>Add scene text</button>
    {layer ? <>
      <label className="block">Text layer<select aria-label="Text layer" className="mt-1 w-full rounded border p-2" value={layer.id} onChange={e => setSelected(e.target.value)}>{texts.map(item => <option key={item.id} value={item.id}>{item.text?.slice(0, 40) || "Text"}</option>)}</select></label>
      <label className="block">Text<textarea aria-label="Scene text content" className="mt-1 w-full rounded border p-2" value={layer.text ?? ""} maxLength={2000} onChange={e => patch({ text: e.target.value })} /></label>
      <label className="block">Typeface<select aria-label="Scene text typeface" className="mt-1 w-full rounded border p-2" value={layer.fontFamily ?? "editorial"} onChange={e => patch({ fontFamily: e.target.value as CollageText["fontFamily"] })}>{Object.keys(COLLAGE_TEXT_FONTS).map(font => <option key={font} value={font}>{font}</option>)}</select></label>
      {([['fontSize','Text size',12,240],['leftPct','Text left (%)',-20,110],['topPct','Text top (%)',-20,110],['widthPct','Text width (%)',4,80],['rotate','Text rotation',-45,45],['outlineWidth','Text outline width',0,12],['zIndex','Text stacking order',1,80]] as const).map(([key,label,min,max]) => <label className="block" key={key}>{label}<input aria-label={label} className="mt-1 w-full rounded border p-2" type="number" min={min} max={max} value={layer[key] ?? (key==='rotate'||key==='outlineWidth'?0:min)} onChange={e => patch({ [key]: Math.max(min, Math.min(max, Number(e.target.value))) })} /></label>)}
      {([['textColor','Text color'],['outlineColor','Text outline color']] as const).map(([key,label]) => <label className="block" key={key}>{label}<input aria-label={label} type="color" value={layer[key] ?? '#ffffff'} onChange={e => patch({ [key]: e.target.value })} /></label>)}
      <label className="block">Alignment<select aria-label="Scene text alignment" value={layer.textAlign ?? 'left'} onChange={e=>patch({textAlign:e.target.value as CollageText['textAlign']})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
      <button type="button" className="min-h-11 underline" onClick={() => onChange(layers.filter(item => item.id !== layer.id))}>Remove scene text</button>
    </> : <p>No text layers yet.</p>}
  </div></details>;
}

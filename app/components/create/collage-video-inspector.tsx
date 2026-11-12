"use client";
import { useState } from "react";
import { collageVideosSchema, collageVideoSchema, type CollageVideo } from "@/lib/create/collage-video";
import { SiteMediaUpload } from "./site-media-upload";

export function CollageVideoInspector({ value, projectId, onChange }: { value: unknown; projectId: string; onChange: (layers: CollageVideo[]) => void }) {
  const parsed = collageVideosSchema.safeParse(value ?? []);
  const [chosen,setChosen] = useState("");
  const [error,setError] = useState("");
  if (!parsed.success) return <p role="alert">Saved video layers need review. Your stored settings have been preserved.</p>;
  const layers=parsed.data, layer=layers.find(item=>item.id===chosen) ?? layers[0];
  function commit(next: CollageVideo[]) {
    const result=collageVideosSchema.safeParse(next);
    if (!result.success) {setError(result.error.issues[0]?.message ?? "These settings could not be saved.");return;}
    setError("");onChange(result.data);
  }
  function patch(next: Partial<CollageVideo>) { if (layer) commit(layers.map(item=>item.id===layer.id?{...item,...next}:item)); }
  const field="mt-1 w-full rounded border border-black/20 bg-white p-2 text-xs text-black";
  return <details className="rounded-lg border border-black/15 p-3"><summary className="cursor-pointer text-xs font-bold">Video layers</summary><div className="mt-3 space-y-3">
    <p className="text-xs">Place real video within the collage. It moves with this scene, independently of the photographs. Use direct MP4/WebM files; YouTube/Vimeo embeds use the Video section.</p>
    <button type="button" disabled={layers.length>=6} className="min-h-11 rounded border px-3 text-xs disabled:opacity-40" onClick={()=>{const item=collageVideoSchema.parse({id:`video-${crypto.randomUUID().slice(0,8)}`});commit([...layers,item]);setChosen(item.id);}}>Add video layer</button>
    {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
    {layer ? <>
      <label className="block text-xs">Video layer<select aria-label="Video layer" className={field} value={layer.id} onChange={event=>setChosen(event.target.value)}>{layers.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className="block text-xs">Video label<input aria-label="Video label" className={field} maxLength={120} defaultValue={layer.label} key={`${layer.id}-label`} onBlur={event=>patch({label:event.target.value})} /></label>
      <SiteMediaUpload key={layer.id} projectId={projectId} kind="video" label="Scene video file" value={layer.src} onChange={src=>patch({src})} showPreview={false} />
      {([['src','Video file address'],['poster','Video poster address'],['captionsSrc','Video captions address'],['href','Video page link']] as const).map(([key,label])=><label key={`${layer.id}-${key}-${layer[key]}`} className="block text-xs">{label}<input aria-label={label} className={field} defaultValue={layer[key]} onBlur={event=>patch({[key]:event.target.value})} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}} /></label>)}
      <label className="block text-xs">Video link label<input aria-label="Video link label" className={field} defaultValue={layer.linkLabel} key={`${layer.id}-link-label`} maxLength={80} onBlur={event=>patch({linkLabel:event.target.value})} /></label>
      <label className="block text-xs">Playback<select aria-label="Video playback" className={field} value={layer.mode} onChange={event=>patch({mode:event.target.value as CollageVideo['mode']})}><option value="controls">Visitor presses play</option><option value="loop">Silent looping video</option><option value="scrub">Frames follow scrolling</option></select></label>
      <p className="text-xs">Looping and scroll-driven video are muted. Reduced-motion visitors get a still frame with manual controls. Looping video pauses outside the viewport. Upload captions for spoken video.</p>
      <label className="block text-xs">Video frame shape<select aria-label="Video frame shape" className={field} value={layer.frameShape??'rectangle'} onChange={event=>patch({frameShape:event.target.value as CollageVideo['frameShape']})}><option value="rectangle">Rectangle</option><option value="oval">Oval</option><option value="torn">Torn paper</option><option value="ticket">Ticket</option></select></label>
      <p className="text-xs">Shaped frames apply to automatic playback. Manual playback keeps a rectangular frame so all video controls remain accessible.</p>
      <label className="block text-xs">Video frame width<input aria-label="Video frame width" className={field} type="number" min={0} max={20} value={layer.frameWidth??0} onChange={event=>patch({frameWidth:Math.max(0,Math.min(20,Number(event.target.value)))})} /></label>
      <label className="block text-xs">Video frame color<input aria-label="Video frame color" type="color" value={layer.frameColor??'#ffffff'} onChange={event=>patch({frameColor:event.target.value})} /></label>
      <label className="block text-xs">Captions language<input aria-label="Video captions language" className={field} defaultValue={layer.captionsLanguage} key={`${layer.id}-language`} onBlur={event=>patch({captionsLanguage:event.target.value})} /></label>
      {([['leftPct','Video left (%)',-20,110,1],['topPct','Video top (%)',-20,110,1],['widthPct','Video width (%)',10,100,1],['aspectRatio','Video aspect ratio',0.3,4,0.01],['radius','Video corner radius',0,200,1],['zIndex','Video stacking order',1,80,1],['travelX','Video horizontal travel (px)',-1000,1000,1],['travelY','Video vertical travel (px)',-1000,1000,1],['rotate','Video scroll rotation',-180,180,1],['endScale','Video end scale',0.2,3,0.05]] as const).map(([key,label,min,max,step])=><label key={key} className="block text-xs">{label}<input aria-label={label} className={field} type="number" min={min} max={max} step={step} value={layer[key]} onChange={event=>patch({[key]:Math.max(min,Math.min(max,Number(event.target.value)))})} /></label>)}
      <label className="block text-xs">Video scroll starts (%)<input aria-label="Video scroll starts" className={field} type="number" min={0} max={Math.round(layer.scrollEnd*100)-1} value={Math.round(layer.scrollStart*100)} onChange={event=>patch({scrollStart:Math.max(0,Math.min(layer.scrollEnd-0.01,Number(event.target.value)/100))})} /></label>
      <label className="block text-xs">Video scroll ends (%)<input aria-label="Video scroll ends" className={field} type="number" min={Math.round(layer.scrollStart*100)+1} max={100} value={Math.round(layer.scrollEnd*100)} onChange={event=>patch({scrollEnd:Math.min(1,Math.max(layer.scrollStart+0.01,Number(event.target.value)/100))})} /></label>
      <button type="button" className="min-h-11 px-3 text-xs underline" onClick={()=>commit(layers.filter(item=>item.id!==layer.id))}>Remove video layer</button>
    </> : <p className="text-xs">No video layers yet. Add one to choose your own file.</p>}
  </div></details>;
}

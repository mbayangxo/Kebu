"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrandKitRow } from "@/lib/studio/brand-kit";
import type { CanvasDocument } from "@/lib/studio/canvas-document";
import { applyAestheticToCanvas, applyBrandKitToCanvas } from "@/lib/studio/brand-apply";
import { STUDIO_FONTS_CATALOG } from "@/lib/studio/fonts-catalog";

type AestheticChip={id:string;name:string;tagline:string;accent:string;background:string};

export function StudioBrandApplyPanel({document:doc,pageId,businessId,onApply,readOnly}:{document:CanvasDocument;pageId:string;businessId?:string|null;onApply:(next:CanvasDocument)=>void;readOnly?:boolean}) {
 const [kits,setKits]=useState<BrandKitRow[]>([]); const [aesthetics,setAesthetics]=useState<AestheticChip[]>([]);
 const [note,setNote]=useState<string|null>(null); const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{setError(null);const q=businessId?`?businessId=${businessId}`:"";try{const [kr,fr]=await Promise.all([fetch(`/api/studio/brand-kit${q}`,{credentials:"include"}),fetch("/api/studio/fonts",{credentials:"include"})]);const kd=await kr.json().catch(()=>({}));const fd=await fr.json().catch(()=>({}));if(!kr.ok){setError(typeof kd.error==="string"?kd.error:"Could not load brand system.");return}setKits(kd.kits??[]);if(fr.ok)setAesthetics(fd.aesthetics??[])}catch{setError("Brand styles are unavailable offline. Your current design is still editable.")}},[businessId]);
 useEffect(()=>{void load()},[load]);
 function applyKit(k:BrandKitRow){if(readOnly)return;setBusy(true);onApply(applyBrandKitToCanvas(doc,k,pageId));setNote(`Applied ${k.name}. Every layer remains editable.`);setBusy(false)}
 function applyLook(a:AestheticChip){if(readOnly)return;setBusy(true);onApply(applyAestheticToCanvas(doc,a.id,pageId));setNote(`Applied ${a.name} look.`);setBusy(false)}
 return <div className="space-y-5 text-xs">
  <div><p className="text-[10px] font-black uppercase tracking-[.18em]">Brand</p><p className="mt-1 text-[9px] text-black/45">{businessId?"Business Kebu brand system":"Personal Kebu styles"} · editable, never flattened</p></div>
  {error?<div className="rounded-xl bg-red-50 p-2.5 text-[10px] text-red-800">{error}<button onClick={()=>void load()} className="ml-2 underline">Retry</button></div>:null}
  <section><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wider text-black/45">Brand kits</p><a href="/studio/brand" className="text-[9px] font-bold underline">Manage DNA</a></div>
  {kits.length===0?<div className="rounded-xl border border-dashed border-black/15 p-3"><p className="font-bold">No brand kit in this space</p><p className="mt-1 text-[9px] text-black/45">Save colors, typography, logo and creative rules once, then reuse them everywhere.</p></div>:<div className="space-y-2">{kits.map(k=><button key={k.id} disabled={busy||readOnly} onClick={()=>applyKit(k)} className="w-full rounded-xl border border-black/10 bg-white p-3 text-left hover:border-orange-400 disabled:opacity-40"><div className="flex items-center justify-between"><span className="font-bold">{k.name}</span><div className="flex -space-x-1">{[k.primary_color,k.accent_color,k.background_color,k.text_color].map((c,i)=><span key={i} className="h-4 w-4 rounded-full border border-white" style={{background:c}}/>)}</div></div><div className="mt-2 flex gap-2 text-[9px] text-black/45"><span style={{fontFamily:k.font_display}}>Heading</span><span>·</span><span style={{fontFamily:k.font_body}}>Body</span></div></button>)}</div>}</section>
  <section><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-black/45">Looks</p><div className="grid grid-cols-2 gap-2">{aesthetics.map(a=><button key={a.id} disabled={busy||readOnly} onClick={()=>applyLook(a)} className="overflow-hidden rounded-xl border border-black/10 text-left disabled:opacity-40"><div className="h-12" style={{background:`linear-gradient(135deg,${a.background},${a.accent})`}}/><div className="p-2"><p className="text-[10px] font-bold">{a.name}</p><p className="truncate text-[8px] text-black/40">{a.tagline}</p></div></button>)}</div></section>
  <section><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-black/45">Type system</p><div className="grid grid-cols-2 gap-1.5">{STUDIO_FONTS_CATALOG.slice(0,8).map(f=><div key={f.id} className="rounded-lg bg-black/[.035] px-2 py-2" style={{fontFamily:f.stack}}><span className="font-semibold">{f.label}</span></div>)}</div></section>
  {note?<p className="rounded-xl bg-orange-50 p-2.5 text-[10px] font-semibold text-orange-800">{note}</p>:null}
 </div>
}
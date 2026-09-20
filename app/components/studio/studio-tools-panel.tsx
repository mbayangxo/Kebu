"use client";
import{GalaxyPanelHeader}from"@/app/components/galaxy/editor-primitives";import{StudioIcon}from"@/app/components/studio/studio-icons";
const TOOLS=[
 {id:"brand",name:"Brand",desc:"Apply your Kebu brand system",icon:"brand",action:"brand"},
 {id:"uploads",name:"Media",desc:"Reuse images, video and audio",icon:"uploads",action:"uploads"},
 {id:"text",name:"Quick text",desc:"Add an editable text layer",icon:"elements",action:"text"},
 {id:"shape",name:"Shapes",desc:"Open searchable elements",icon:"elements",action:"elements"},
 {id:"layers",name:"Arrange",desc:"Open layer order and locking",icon:"layers",action:"layers"},
 {id:"themes",name:"Themes",desc:"Browse complete editable directions",icon:"themes",href:"/studio/templates"},
] as const;
export function StudioToolsPanel({onAction,readOnly}:{onAction:(action:"brand"|"uploads"|"text"|"elements"|"layers")=>void;readOnly?:boolean}){
 return <div className="space-y-3"><GalaxyPanelHeader eyebrow="Studio" title="Tools" description="Useful capabilities, without leaving your canvas."/><div className="grid grid-cols-2 gap-2">{TOOLS.map(t=>t.href?<a key={t.id} href={t.href} className="rounded-xl border border-black/10 bg-white p-3 hover:border-orange-400"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-[10px] font-black text-white"><StudioIcon name={t.icon as any} className="h-4 w-4"/></span><p className="mt-2 text-[10px] font-bold">{t.name}</p><p className="mt-0.5 text-[8px] leading-snug text-black/40">{t.desc}</p></a>:<button key={t.id} type="button" disabled={readOnly&&t.action==="text"} onClick={()=>onAction(t.action)} className="rounded-xl border border-black/10 bg-white p-3 text-left hover:border-orange-400 disabled:opacity-40"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFF2E8] text-[10px] font-black">{t.glyph}</span><p className="mt-2 text-[10px] font-bold">{t.name}</p><p className="mt-0.5 text-[8px] leading-snug text-black/40">{t.desc}</p></button>)}</div><p className="text-[9px] leading-relaxed text-black/35">Tools use the current Personal or Business Kebu space. More integrations can plug into this surface without changing the canvas model.</p></div>
}
"use client";
import { useEffect, useState } from "react";
import { GalaxyPanelHeader, GalaxyStatus } from "@/app/components/galaxy/editor-primitives";

type Provider = "instagram"|"tiktok"|"youtube"|"whatsapp"|"maps"|"analytics"|"custom";
type Row = { id:string; provider:Provider; label:string; status:string; public_config:Record<string,unknown>; updated_at:string };
const PROVIDERS: Array<{id:Provider;label:string;hint:string;field:string;placeholder:string}> = [
 {id:"instagram",label:"Instagram",hint:"Use for social grids and profile links.",field:"handle",placeholder:"@yourbrand"},
 {id:"tiktok",label:"TikTok",hint:"Use for TikTok links and future feed extensions.",field:"handle",placeholder:"@yourbrand"},
 {id:"youtube",label:"YouTube",hint:"Use channel/video content in site extensions.",field:"url",placeholder:"https://youtube.com/@..."},
 {id:"whatsapp",label:"WhatsApp",hint:"Power chat and order actions.",field:"number",placeholder:"+221..."},
 {id:"maps",label:"Maps",hint:"Use a public place or map URL.",field:"url",placeholder:"https://maps.google.com/..."},
 {id:"analytics",label:"Analytics",hint:"Connect a public measurement identifier.",field:"measurementId",placeholder:"Measurement ID"},
 {id:"custom",label:"Custom",hint:"Save a public endpoint or account reference.",field:"value",placeholder:"Public URL or identifier"},
];

export function BuilderConnectionsPanel({projectId}:{projectId:string}) {
 const [rows,setRows]=useState<Row[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 async function load(){setLoading(true);setError(null);const res=await fetch(`/api/projects/${projectId}/connections`,{credentials:"include"});const data=await res.json().catch(()=>({}));if(!res.ok){setError(data.error||"Could not load connections.");setLoading(false);return;}setRows(data.connections??[]);const next:Record<string,string>={};for(const row of data.connections??[]){const p=PROVIDERS.find(x=>x.id===row.provider);if(p)next[row.provider]=String(row.public_config?.[p.field]??"");}setDrafts(next);setLoading(false);}
 useEffect(()=>{void load()},[projectId]);
 async function save(p:typeof PROVIDERS[number]){setError(null);const value=(drafts[p.id]??"").trim();const res=await fetch(`/api/projects/${projectId}/connections`,{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider:p.id,label:p.label,status:"configured",publicConfig:{[p.field]:value}})});const data=await res.json().catch(()=>({}));if(!res.ok){setError(data.error||"Could not save connection.");return;}await load();}
 async function remove(p:Provider){await fetch(`/api/projects/${projectId}/connections`,{method:"DELETE",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider:p})});setDrafts(d=>({...d,[p]:""}));await load();}
 return <div><GalaxyPanelHeader eyebrow="Connect" title="Connections" description="Connect outside services to this site. Public account details live here; private OAuth/API secrets never do."/>
 <div className="px-3">{loading?<GalaxyStatus tone="neutral">Loading connections…</GalaxyStatus>:null}{error?<GalaxyStatus tone="error">{error}</GalaxyStatus>:null}
 {PROVIDERS.map(p=>{const connected=rows.some(r=>r.provider===p.id);return <section key={p.id} className="border-b border-black/[.07] py-3">
   <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="text-[11px] font-semibold text-black">{p.label}</p><p className="mt-0.5 text-[9px] text-black/40">{p.hint}</p></div><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${connected?"bg-emerald-50 text-emerald-700":"bg-black/[.04] text-black/40"}`}>{connected?"Configured":"Not set"}</span></div>
   <div className="mt-2 flex gap-2"><input className="min-h-9 min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-2.5 text-xs outline-none focus:border-[#FF6A00]" value={drafts[p.id]??""} placeholder={p.placeholder} onChange={e=>setDrafts(d=>({...d,[p.id]:e.target.value}))}/><button type="button" className="rounded-lg bg-black px-3 text-[9px] font-semibold text-white" onClick={()=>void save(p)}>Save</button>{connected?<button type="button" className="rounded-lg px-2 text-[9px] font-semibold text-red-700 hover:bg-red-50" onClick={()=>void remove(p.id)}>Remove</button>:null}</div>
 </section>})}
 </div></div>;
}

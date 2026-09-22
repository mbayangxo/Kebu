"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AccountWorkspaceContext } from "@/lib/account/workspace-context";
import type { WorkItemRow } from "@/lib/work/items";
import { KEBU } from "@/lib/kebu-brand";

export function LibraryDocumentsPanel() {
  const [items,setItems]=useState<WorkItemRow[]>([]);
  const [workspace,setWorkspace]=useState<AccountWorkspaceContext|null>(null);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [creating,setCreating]=useState(false);
  const [title,setTitle]=useState("");
  const [body,setBody]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);

  const load=useCallback(async(context?:AccountWorkspaceContext|null)=>{
    const params=new URLSearchParams({kind:"doc"});
    if(context?.activeBusinessId) params.set("businessId",context.activeBusinessId);
    else params.set("personal","1");
    const res=await fetch("/api/work/items?"+params.toString(),{credentials:"include"});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){setError(data.error||"Could not load documents.");return;}
    setItems(Array.isArray(data.items)?data.items:[]);
  },[]);

  useEffect(()=>{
    let cancelled=false;
    fetch("/api/me/workspace",{credentials:"include"})
      .then(res=>res.ok?res.json():null)
      .then(data=>{if(cancelled)return;const context=data?.context??null;setWorkspace(context);void load(context)})
      .catch(()=>void load(null));
    return()=>{cancelled=true};
  },[load]);

  const selected=useMemo(()=>items.find(item=>item.id===selectedId)??null,[items,selectedId]);

  async function createDoc(){
    if(!title.trim()||busy)return;
    setBusy(true);setError(null);
    const res=await fetch("/api/work/items",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"doc",title:title.trim(),body,status:"draft",businessId:workspace?.activeBusinessId??null})});
    const data=await res.json().catch(()=>({}));
    setBusy(false);
    if(!res.ok||!data.item){setError(data.error||"Could not create document.");return;}
    setItems(current=>[data.item,...current]);setSelectedId(data.item.id);setTitle("");setBody("");setCreating(false);
  }

  async function patchDoc(id:string,patch:Record<string,unknown>){
    const res=await fetch("/api/work/items",{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,...patch})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){setError(data.error||"Could not save document.");return;}
    if(data.item)setItems(current=>current.map(item=>item.id===id?data.item:item));
  }

  async function removeDoc(id:string){
    const res=await fetch("/api/work/items?id="+encodeURIComponent(id),{method:"DELETE",credentials:"include"});
    if(!res.ok){setError("Could not delete document.");return;}
    setItems(current=>current.filter(item=>item.id!==id));setSelectedId(current=>current===id?null:current);
  }

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3" style={{borderColor:KEBU.border}}>
      <div><p className="text-[12px] font-semibold">Documents</p><p className="mt-0.5 text-[9px] text-black/35">Notes and working documents live inside Library.</p></div>
      <button type="button" onClick={()=>setCreating(true)} className="rounded-full bg-black px-4 py-2 text-[9px] font-semibold text-white">+ New document</button>
    </div>
    {error?<div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[9px] text-red-700">{error}</div>:null}
    {creating?<div className="grid gap-2 border-b py-4 lg:grid-cols-[260px_1fr_auto]" style={{borderColor:KEBU.border}}><input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Document title" className="min-h-10 rounded-lg border px-3 text-[10px]" style={{borderColor:KEBU.border}}/><textarea value={body} onChange={e=>setBody(e.target.value)} rows={2} placeholder="Start writing…" className="rounded-lg border px-3 py-2 text-[10px]" style={{borderColor:KEBU.border}}/><div className="flex gap-2"><button onClick={()=>void createDoc()} disabled={!title.trim()||busy} className="rounded-full bg-black px-3 py-2 text-[8px] font-semibold text-white disabled:opacity-40">{busy?"Saving…":"Create"}</button><button onClick={()=>setCreating(false)} className="rounded-full border px-3 py-2 text-[8px]" style={{borderColor:KEBU.border}}>Cancel</button></div></div>:null}

    <div className="mt-3 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section className="border-y" style={{borderColor:KEBU.border}}>
        {items.map(item=><button key={item.id} onClick={()=>setSelectedId(item.id)} className="block w-full border-b px-1 py-3 text-left transition hover:pl-2" style={{borderColor:KEBU.border,background:selectedId===item.id?"#FFF3EC":"transparent"}}><p className="truncate text-[10px] font-semibold">{item.title}</p><p className="mt-0.5 text-[8px] text-black/35">{new Date(item.updated_at).toLocaleString()}</p></button>)}
        {!items.length?<p className="py-8 text-center text-[9px] text-black/35">No documents yet.</p>:null}
      </section>
      <section className="min-h-[420px]">
        {selected?<div>
          <div className="flex items-center justify-between border-b pb-3" style={{borderColor:KEBU.border}}><div><p className="text-[9px] text-black/35">Document</p><h2 className="mt-1 text-[18px] font-semibold">{selected.title}</h2></div><button onClick={()=>void removeDoc(selected.id)} className="text-[8px] font-semibold text-red-600">Delete</button></div>
          <textarea key={selected.id} defaultValue={selected.body} onBlur={e=>{if(e.target.value!==selected.body)void patchDoc(selected.id,{body:e.target.value})}} rows={18} className="mt-3 w-full resize-y rounded-[12px] border bg-white px-4 py-4 text-[11px] leading-6 outline-none focus:border-black/30" style={{borderColor:KEBU.border}}/>
        </div>:<div className="flex min-h-[420px] items-center justify-center text-center"><div><p className="text-[11px] font-semibold">Select a document</p><p className="mt-1 text-[9px] text-black/35">Your editor opens here.</p></div></div>}
      </section>
    </div>
  </div>;
}

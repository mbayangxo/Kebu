"use client";

import { GalaxyEmptyState, GalaxyPanelHeader, GalaxyStatus } from "@/app/components/galaxy/editor-primitives";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushStagedStudioAssets, listStagedStudioAssets, stageStudioAsset } from "@/lib/studio/asset-offline-outbox";
import { markRecentAsset, readRecentAssets } from "@/lib/studio/recent-assets";
import { cacheAssetBlob, cacheAssetLibrary, readCachedAssetLibrary, reconcileAssetCache, resolveCachedAssetUrl } from "@/lib/studio/asset-offline-cache";

type UploadRow = {
  id: string;
  kind: "image" | "video" | "audio";
  url: string;
  file_name: string | null;
  created_at: string;
  tags?: string[]; folder?: string|null; favorite?: boolean;
};

/** S16 — reusable uploads for the current user. */
export function StudioUploadsLibrary({
  onPickImage,
  onPickVideo,
  readOnly,
  designId,
  onDropAsset,
  approvedAssetIds=[],
}: {
  onPickImage: (url: string) => void;
  onPickVideo: (url: string) => void;
  readOnly?: boolean;
  designId?: string;
  onDropAsset?: (asset: UploadRow) => void;
  approvedAssetIds?: string[];
}) {
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [favoritesOnly,setFavoritesOnly]=useState(false);
  const [recentOnly,setRecentOnly]=useState(false);
  const [approvedOnly,setApprovedOnly]=useState(false);
  const scopeKey=designId?`design:${designId}`:"personal";
  const [offlineIds,setOfflineIds]=useState<Set<string>>(new Set());
  const [kind, setKind] = useState<"all" | UploadRow["kind"]>("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const [visibleCount,setVisibleCount]=useState(60);

  const load = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) { const cached=await readCachedAssetLibrary().catch(()=>[]);setUploads(cached as UploadRow[]);setError(cached.length?"Offline · showing cached workspace assets.":"Offline · no cached workspace assets yet."); return; }
    const res = await fetch("/api/studio/uploads", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load library.");
      return;
    }
    await flushStagedStudioAssets(scopeKey).catch(()=>[]);
    const rows=Array.isArray(data.uploads) ? data.uploads : [];
    setUploads(rows);setError(null);void cacheAssetLibrary(rows);void reconcileAssetCache(new Set(rows.map((x:UploadRow)=>x.id)));
  }, [scopeKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => uploads.filter((item) => {
    if (kind !== "all" && item.kind !== kind) return false;
    if(favoritesOnly&&!item.favorite)return false;
    if(recentOnly&&!new Set(readRecentAssets(scopeKey).map(x=>x.id)).has(item.id))return false;
    if(approvedOnly&&!approvedAssetIds.includes(item.id))return false;
    const q = query.trim().toLowerCase();
    return !q || [item.file_name,item.folder,...(item.tags??[])].filter(Boolean).join(" ").toLowerCase().includes(q);
  }), [uploads, query, kind, favoritesOnly, recentOnly, approvedOnly, approvedAssetIds, scopeKey]);

  async function toggleOffline(u:UploadRow){if(offlineIds.has(u.id)){setOfflineIds(ids=>{const n=new Set(ids);n.delete(u.id);return n});return}try{await cacheAssetBlob(u);setOfflineIds(ids=>new Set(ids).add(u.id))}catch(e){setError(e instanceof Error?e.message:"Could not cache asset.")}}
  async function pickResolved(u:UploadRow){markRecentAsset(u.id,scopeKey);const url=await resolveCachedAssetUrl(u).catch(()=>u.url);if(u.kind==="image")onPickImage(url);if(u.kind==="video")onPickVideo(url)}

  async function upload(file: File | null) {
    if (!file || readOnly) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) { const pending=await stageStudioAsset(scopeKey,file,designId);setError(`Offline · staged ${pending.name}. It will upload after reconnect.`); return; }
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      if (designId) body.append("designId", designId);
      const res = await fetch("/api/studio/upload", { method: "POST", credentials: "include", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Upload failed.");
        return;
      }
      await load();
      if (data.kind === "image") onPickImage(data.url as string);
      if (data.kind === "video") onPickVideo(data.url as string);
    } catch {
      setError("You appear to be offline. Existing library items remain available after they have loaded, but new media needs a connection.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function patchAsset(id:string,patch:{favorite?:boolean;folder?:string|null;tags?:string[]}){if(!navigator.onLine){setError("Reconnect before changing shared asset metadata.");return}setBusy(true);try{const res=await fetch("/api/studio/uploads",{method:"PATCH",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({id,...patch})});const data=await res.json().catch(()=>({}));if(!res.ok){setError(data.error??"Could not update asset.");return}setUploads(rows=>rows.map(x=>x.id===id?{...x,...data.asset}:x))}finally{setBusy(false)}}

  async function remove(id: string) {
    if (typeof navigator !== "undefined" && !navigator.onLine) { setError("Reconnect before changing the shared media library."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/uploads?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Remove failed.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <GalaxyPanelHeader eyebrow="Studio" title="Media" description="Upload once, reuse everywhere in this Kebu space." />
      <div className="flex items-center justify-between gap-2">
        <div><p className="text-[10px] font-black uppercase tracking-[.18em]">Uploads</p><p className="text-[9px] text-black/40">Current Kebu space</p></div>
        {!readOnly ? <><input ref={fileRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac" onChange={(e)=>void upload(e.target.files?.[0]??null)}/><button type="button" disabled={busy} onClick={()=>fileRef.current?.click()} className="rounded-lg bg-black px-2.5 py-1.5 text-[10px] font-black text-white disabled:opacity-40">{busy?"Uploading…":"Upload +"}</button></>:null}
      </div>
      <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search uploads" className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs"/>
      <div className="flex gap-1 overflow-x-auto"><button type="button" onClick={()=>setRecentOnly(v=>!v)} className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${recentOnly?"bg-black text-white":"bg-black/[.04] text-black/55"}`}>Recent</button><button type="button" onClick={()=>setApprovedOnly(v=>!v)} className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${approvedOnly?"bg-black text-white":"bg-black/[.04] text-black/55"}`}>Approved</button><button type="button" onClick={()=>setFavoritesOnly(v=>!v)} className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${favoritesOnly?"bg-orange-600 text-white":"bg-black/[.04] text-black/55"}`}>★ Saved</button>{(["all","image","video","audio"] as const).map((value)=><button key={value} type="button" onClick={()=>setKind(value)} className={`rounded-full px-2.5 py-1 text-[9px] font-bold capitalize ${kind===value?"bg-black text-white":"bg-black/[.04] text-black/55"}`}>{value}</button>)}</div>
      {error ? <GalaxyStatus tone={error.startsWith("Offline")?"neutral":"error"}>{error}</GalaxyStatus> : null}
      {filtered.length === 0 ? <GalaxyEmptyState title={uploads.length?"No matching media":"Your media library is empty"} detail={uploads.length?"Try another search or filter.":"Upload once, then reuse it across projects in this Kebu space."}/> :
      <ul className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto pr-1">{filtered.slice(0,visibleCount).map((u)=><li draggable={u.kind!=="audio"} onDragStart={(e)=>{if(u.kind==="audio")return;e.dataTransfer.effectAllowed="copy";e.dataTransfer.setData("application/x-kebu-studio-asset",JSON.stringify(u));onDropAsset?.(u)}} key={u.id} className="group overflow-hidden rounded-xl border border-black/10 bg-white">
        <button type="button" disabled={readOnly || u.kind==="audio"} className="w-full text-left disabled:opacity-60" onClick={()=>void pickResolved(u)}>
          {u.kind==="image"?<img src={u.url} alt="" className="h-20 w-full object-cover"/>:u.kind==="video"?<div className="flex h-20 items-center justify-center bg-black text-[10px] font-black text-white">▶ VIDEO</div>:<div className="flex h-20 items-center justify-center bg-[#FFF2E8] text-[10px] font-black">♫ AUDIO</div>}
          <div className="flex items-center gap-1 px-2 py-1.5"><p className="min-w-0 flex-1 truncate text-[9px] font-semibold">{u.file_name||u.kind}</p><span aria-hidden className="text-xs">{u.favorite?"★":"☆"}</span></div>{u.tags?.length?<p className="truncate px-2 pb-1 text-[8px] text-black/35">{u.tags.join(" · ")}</p>:null}
        </button>
        {!readOnly ? (
          <>
            <button type="button" disabled={busy} onClick={()=>void remove(u.id)} className="w-full border-t border-black/5 py-1 text-[9px] text-black/35 hover:text-red-700">Remove from library</button>
            <div className="flex gap-1 border-t border-black/5 p-1">
              <button type="button" onClick={()=>void toggleOffline(u)} className="rounded px-1 text-[8px] text-black/45">{offlineIds.has(u.id)?"✓ Offline":"↓ Offline"}</button>
              <button type="button" onClick={()=>{const folder=prompt("Folder name",u.folder??"");if(folder!==null)void patchAsset(u.id,{folder:folder.trim()||null})}} className="flex-1 rounded py-1 text-[8px] text-black/45 hover:bg-black/[.03]">{u.folder||"Folder"}</button>
              <button type="button" onClick={()=>{const tags=prompt("Tags, separated by commas",(u.tags??[]).join(", "));if(tags!==null)void patchAsset(u.id,{tags:tags.split(",").map(x=>x.trim()).filter(Boolean)})}} className="flex-1 rounded py-1 text-[8px] text-black/45 hover:bg-black/[.03]">Tags</button>
            </div>
          </>
        ) : null}
      </li>)}{filtered.length>visibleCount?<li className="col-span-2"><button type="button" onClick={()=>setVisibleCount(v=>v+60)} className="w-full rounded-xl border border-black/10 py-2 text-[10px] font-bold">Show more</button></li>:null}</ul>}
    </div>
  );
}

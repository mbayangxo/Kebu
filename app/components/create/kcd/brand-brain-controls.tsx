"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";
import type { KcdDocument, NodeId, Op } from "@/lib/creative-core";
import { BUILDER } from "@/lib/create/builder-ui";
import { brandBrainRecordSchema, type BrandBrainRecord } from "@/lib/create/brand-brain";
import { brandBrainApplication } from "@/lib/create/brand-brain-application";
import {brandBrainBindingResponseSchema,brandBrainBindingSchema,type BrandBrainBinding} from "@/lib/create/brand-brain-binding";

const responseSchema = z.object({ profiles: z.array(brandBrainRecordSchema).max(100), unavailable: z.array(z.object({ id: z.string().uuid(), name: z.string() })).optional() });
const style = { color: BUILDER.ink, background: BUILDER.surface, borderColor: BUILDER.border };
const button = "rounded-lg border px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-40";
async function readProfiles(signal?: AbortSignal, id?: string) {
  const response = await fetch(`/api/studio/brand-brain${id ? `?id=${encodeURIComponent(id)}` : ""}`, { credentials: "include", signal });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Could not load saved profiles. Retry.");
  const parsed = responseSchema.safeParse(data);
  if (!parsed.success) throw new Error("Saved profile data is incompatible. Reload profiles or review Brand Brain.");
  return parsed.data;
}

export function KcdBrandBrainControls({ document, selectedId, disabled, submit }: { document: KcdDocument; selectedId: NodeId; disabled: boolean; submit: (label: string, ops: Op[]) => Promise<unknown> }) {
  const [open, setOpen] = useState(false), [retry, setRetry] = useState(0);
  const [profiles, setProfiles] = useState<BrandBrainRecord[]>([]), [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false), [error, setError] = useState<string | null>(null), [status, setStatus] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(0), [busy, setBusy] = useState(false);
  const [palette, setPalette] = useState(true), [motion, setMotion] = useState(false);
  const [binding,setBinding]=useState<BrandBrainBinding|null>(null),[bindingError,setBindingError]=useState<string|null>(null);
  const [uncertain,setUncertain]=useState(false),[action,setAction]=useState<"attach"|"apply"|null>(null);
  const running = useRef(false), mounted = useRef(true);
  const latest = useRef(document);
  useLayoutEffect(() => { latest.current = document; }, [document]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const data = await readProfiles(controller.signal);
        let attached:string|null=null;
        try{
          const response=await fetch(`/api/projects/${document.id}/brand-brain`,{credentials:"include",signal:controller.signal}),body=await response.json().catch(()=>null);
          if(!response.ok)throw new Error(typeof body?.error==="string"?body.error:"Could not load site attachment. Retry.");
          const parsed=brandBrainBindingResponseSchema.safeParse(body);
          if(!parsed.success||parsed.data.binding.projectId!==document.id)throw new Error("Site attachment data is incompatible. Reload before changing it.");
          if(controller.signal.aborted)return;
          setBinding(parsed.data.binding);setUncertain(false);
          setBindingError(parsed.data.unavailable?"The attached profile is unavailable or incompatible. Choose another profile or detach it.":null);
          attached=parsed.data.record?parsed.data.binding.profileId:null;
          if(parsed.data.record)data.profiles=[parsed.data.record,...data.profiles.filter(profile=>profile.id!==parsed.data.record!.id)];
        }catch(failure){if(controller.signal.aborted)return;setBinding(null);setBindingError(failure instanceof Error?failure.message:"Could not load site attachment.");}
        const requested=attached??new URL(window.location.href).searchParams.get("brain");
        if (requested && !data.profiles.some(profile => profile.id === requested)) {
          const deep = await readProfiles(controller.signal, requested);
          data.profiles = [...deep.profiles, ...data.profiles];
        }
        if (controller.signal.aborted) return;
        setProfiles(data.profiles); setUnavailable(data.unavailable?.length ?? 0);
        setSelected(current=>requested&&data.profiles.some(profile=>profile.id===requested)?requested:data.profiles.some(profile=>profile.id===current)?current:"");
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load saved profiles."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [open, retry, document.id]);
  const record = profiles.find(profile => profile.id === selected);
  async function attach(profileId:string|null){
    if(!binding||running.current||uncertain||disabled)return;
    running.current=true;setBusy(true);setAction("attach");setBindingError(null);setStatus(null);
    try{
      const response=await fetch(`/api/projects/${document.id}/brand-brain`,{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({profileId,expectedRevision:binding.revision})}),body=await response.json().catch(()=>null);
      if(!mounted.current)return;
      if(!response.ok)throw new Error(typeof body?.error==="string"?body.error:"Attachment could not be confirmed. Reload before retrying.");
      const parsed=brandBrainBindingSchema.safeParse(body?.binding);
      if(!parsed.success||parsed.data.projectId!==document.id||parsed.data.profileId!==profileId||parsed.data.revision!==binding.revision+1)throw new Error("Attachment acknowledgement was invalid. Reload before retrying.");
      setBinding(parsed.data);
      if(!profileId){setSelected("");const url=new URL(window.location.href);url.searchParams.delete("brain");window.history.replaceState(window.history.state,"",url);}
      setStatus(profileId?"Profile attached to this site. Apply colors or motion when ready.":"Profile detached. Existing site edits are kept.");
    }catch(failure){if(mounted.current){setUncertain(true);setBindingError(failure instanceof Error?failure.message:"Attachment could not be confirmed. Reload before retrying.");}}
    finally{running.current=false;if(mounted.current){setBusy(false);setAction(null);}}
  }
  async function apply() {
    if (!record || running.current || disabled) return;
    running.current = true; setBusy(true); setAction("apply"); setError(null); setStatus(null);
    try {
      const fresh = (await readProfiles(undefined, record.id)).profiles.find(profile => profile.id === record.id);
      if (!mounted.current) return;
      if (latest.current !== document) throw new Error("The draft changed while checking this profile. Review your selection and apply again.");
      if (!fresh) throw new Error("This profile is unavailable. Reload profiles.");
      if (fresh.revision !== record.revision) { setProfiles(previous => previous.map(profile => profile.id === fresh.id ? fresh : profile)); throw new Error("This profile changed. Review the refreshed colors and motion before applying again."); }
      const result = brandBrainApplication(document, selectedId, fresh, { palette, motion });
      if (result.ops.length) await submit(`Apply Brand Brain v${fresh.revision}`, result.ops);
      if (mounted.current) setStatus(result.ops.length ? `Applied to ${result.count} element${result.count === 1 ? "" : "s"} in this draft. Use Builder Undo to reverse; check the draft save status.` : "This selection already matches the chosen settings.");
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : "Could not apply Brand Brain."); }
    finally { running.current = false; if (mounted.current) {setBusy(false);setAction(null);} }
  }
  return <details className="border-t pt-3" style={{ borderColor: BUILDER.border }} open={open} onToggle={event => { const next = event.currentTarget.open; if (next && !open) { setLoading(true); setError(null); } setOpen(next); }}>
    <summary className="cursor-pointer text-[12px] font-semibold">Brand Brain · saved direction</summary>
    <section aria-label="Apply Brand Brain" className="mt-3 space-y-3 text-[12px]">
      <p style={{ color: BUILDER.muted }}>Apply shared colors to this element and its children. Device layouts and text formatting stay as authored.</p>
      {loading ? <p role="status">Loading saved profiles…</p> : null}
      {error ? <p role="alert" className="text-red-700">{error}</p> : null}
      {bindingError?<p role="alert" className="text-red-700">{bindingError}</p>:null}
      {binding?<p>Site direction: {binding.profileId?`${profiles.find(profile=>profile.id===binding.profileId)?.profile.brand.name??"Unavailable profile"} · attached`:"No attached profile"}.</p>:null}
      <button type="button" className={button} style={style} disabled={loading || busy} onClick={() => { setStatus(null); setLoading(true); setError(null); setRetry(value => value + 1); }}>Reload profiles</button>
      {!loading && !error && !profiles.length ? <p>No saved profiles yet. <a href="/studio/brand" target="_blank" rel="noopener noreferrer" className="underline">Create Brand Brain</a></p> : null}
      {unavailable ? <p>{unavailable} incompatible profile{unavailable === 1 ? "" : "s"}. <a href="/studio/brand/legacy" target="_blank" rel="noopener noreferrer" className="underline">Review original Brand DNA</a></p> : null}
      {profiles.length ? <fieldset disabled={disabled || busy || loading} className="min-w-0 space-y-3">
        <label className="block">Saved Brand Brain<select className="mt-1 w-full rounded-lg border p-2 text-[12px]" style={style} value={selected} onChange={event => { const id = event.target.value; setSelected(id); setStatus(null); setError(null); const url = new URL(window.location.href); if (id) url.searchParams.set("brain", id); else url.searchParams.delete("brain"); window.history.replaceState(window.history.state, "", url); }}>
          <option value="">Choose a profile</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.profile.brand.name} · v{profile.revision}</option>)}
        </select></label>
        {record ? <><div aria-label="Saved palette" className="flex gap-2">{[record.profile.brand.primaryColor, record.profile.brand.accentColor, record.profile.brand.backgroundColor, record.profile.brand.textColor].map((color, index) => <span key={index} title={color} className="h-6 w-6 rounded border" style={{ background: color, borderColor: BUILDER.border }} />)}</div><p>Motion: {record.profile.motion.enabled ? `${record.profile.motion.entrance}, ${record.profile.motion.interaction}; ≤${record.profile.motion.maxDuration}ms / ${record.profile.motion.maxDistance}px` : "disabled (applying clears effects)"}.</p></> : null}
        <label className="flex items-center gap-2"><input type="checkbox" checked={palette} onChange={event => setPalette(event.target.checked)} />Apply palette colors</label>
        <button type="button" className={button} style={style} disabled={!binding||uncertain||!record||binding.profileId===selected} onClick={()=>void attach(selected)}>{action==="attach"?"Saving attachment…":"Attach profile to site"}</button>
        <label className="flex items-center gap-2"><input type="checkbox" checked={motion} onChange={event => setMotion(event.target.checked)} />Apply motion direction</label>
        <button type="button" className={button} style={style} disabled={!record || (!palette && !motion)} onClick={() => void apply()}>{action==="apply" ? "Applying…" : "Apply to selected subtree"}</button>
      </fieldset> : null}
      {binding?.profileId?<button type="button" className={button} style={style} disabled={disabled||busy||loading||uncertain} onClick={()=>void attach(null)}>Detach site profile</button>:null}
      {status ? <p role="status">{status}</p> : null}
    </section>
  </details>;
}

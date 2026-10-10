"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { KEBU } from "@/lib/kebu-brand";
import { STUDIO_FONTS_CATALOG } from "@/lib/studio/fonts-catalog";
import { BrandBrainAssets } from "./brand-brain-assets";
import { brandBrainRecordSchema, brandBrainSchema, compileBrandBrain, newBrandBrain, type BrandBrain, type BrandBrainRecord } from "@/lib/create/brand-brain";

const inputClass="mt-1 w-full rounded-lg border px-3 py-2 text-[12px] font-normal focus-visible:outline-2 focus-visible:outline-offset-2";
const buttonClass="rounded-lg border px-3 py-2 text-[12px] font-semibold disabled:opacity-50";
const style={borderColor:KEBU.border,background:KEBU.white,color:KEBU.black};
type Business={id:string;legal_name:string;trading_name:string|null};
function Field({label,value,onChange,choices,max=1000,type="text"}:{label:string;value:string|number;onChange:(value:string)=>void;choices?:readonly string[];max?:number;type?:string}) {
  return <label className="block text-[12px] font-semibold">{label}{choices?<select className={inputClass} style={style} value={value} onChange={event=>onChange(event.target.value)}>{choices.map(choice=><option key={choice} value={choice}>{choice}</option>)}</select>:type==="textarea"?<textarea className={inputClass} style={style} rows={2} maxLength={max} value={value} onChange={event=>onChange(event.target.value)}/>:<input className={type==="color"?"mt-1 h-9 w-full rounded-lg border p-1":inputClass} style={style} type={type} maxLength={max} value={value} onChange={event=>onChange(event.target.value)}/>}</label>;
}
export function BrandBrainEditor() {
  const [records,setRecords]=useState<BrandBrainRecord[]>([]),[businesses,setBusinesses]=useState<Business[]>([]);
  const [draft,setDraft]=useState<BrandBrain>(()=>newBrandBrain()),[saved,setSaved]=useState<BrandBrainRecord|null>(null),[id,setId]=useState("");
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[note,setNote]=useState<string|null>(null);
  const [uncertain,setUncertain]=useState(false),[loadAttempt,setLoadAttempt]=useState(0),[businessError,setBusinessError]=useState(false);
  const [unavailable,setUnavailable]=useState<string[]>([]);
  const [reloading,setReloading]=useState(false);
  const [uploading,setUploading]=useState(false);
  const dirty=JSON.stringify(draft)!==JSON.stringify(saved?.profile??newBrandBrain());
  useEffect(()=>{
    const controller=new AbortController();
    async function load() {
      try {
        const response=await fetch("/api/studio/brand-brain",{credentials:"include",signal:controller.signal}),body=await response.json();
        if(!response.ok)throw new Error(body.error??"Could not load profiles.");
        const rows=z.array(brandBrainRecordSchema).parse(body.profiles),selectedId=new URL(window.location.href).searchParams.get("profile");
        let selected=rows.find(row=>row.id===selectedId)??(selectedId?null:rows[0]??null);
        if(selectedId&&!selected&&z.string().uuid().safeParse(selectedId).success){
          const lookup=await fetch(`/api/studio/brand-brain?id=${selectedId}`,{credentials:"include",signal:controller.signal}),lookupBody=await lookup.json();
          if(lookup.ok){selected=brandBrainRecordSchema.parse(lookupBody.profiles?.[0]);rows.unshift(selected);}
          else if(lookup.status!==404)throw new Error(lookupBody.error??"Could not load the selected profile.");
        }
        setUnavailable(Array.isArray(body.unavailable)?body.unavailable.map((record:{name:string})=>record.name):[]);
        setRecords(rows);setSaved(selected);setDraft(selected?.profile??newBrandBrain());setId(selected?.id??crypto.randomUUID());setError(null);setLoading(false);
      } catch(cause){if(!controller.signal.aborted){setError(cause instanceof Error?cause.message:"Could not load profiles.");setLoading(false);}}
    }
    async function loadBusinesses() {
      try {
        const response=await fetch("/api/businesses",{credentials:"include",signal:controller.signal}),body=await response.json();
        if(!response.ok||!Array.isArray(body.businesses))throw new Error("Business list unavailable");
        setBusinesses(body.businesses);setBusinessError(false);
      } catch{if(!controller.signal.aborted)setBusinessError(true);}
    }
    void load();void loadBusinesses();return()=>controller.abort();
  },[loadAttempt]);
  useEffect(()=>{
    if(!dirty&&!uploading)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    const warnLink=(event:MouseEvent)=>{
      if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>("a[href]"):null;
      if(!link||link.target==="_blank"||link.hasAttribute("download")||link.getAttribute("href")?.startsWith("#"))return;
      // Full external navigation already invokes beforeunload; do not prompt twice.
      if(new URL(link.href).origin!==window.location.origin||link.href===window.location.href)return;
      if(!window.confirm("Leave this page and discard unsaved Brand Brain changes?")){event.preventDefault();event.stopPropagation();}
    };
    window.addEventListener("beforeunload",warn);document.addEventListener("click",warnLink,true);
    return()=>{window.removeEventListener("beforeunload",warn);document.removeEventListener("click",warnLink,true);};
  },[dirty,uploading]);
  function remember(profileId:string){const url=new URL(window.location.href);url.searchParams.set("profile",profileId);window.history.replaceState(null,"",url);}
  function choose(next:BrandBrainRecord|null){
    if(dirty&&!window.confirm("Discard unsaved Brand Brain changes?"))return;
    const nextId=next?.id??crypto.randomUUID();setSaved(next);setDraft(next?.profile??newBrandBrain());setId(nextId);setUncertain(false);setError(null);setNote(null);remember(nextId);
  }
  async function reloadSaved(){
    if(dirty&&!window.confirm("Reload the saved profile and discard this draft?"))return;
    setBusy(true);setReloading(true);setNote(null);
    try {
      const response=await fetch(`/api/studio/brand-brain?id=${id}`,{credentials:"include"}),body=await response.json();
      if(response.status===404&&!saved){setUncertain(false);setError(null);setNote("No saved profile exists yet. Your draft is kept; you can save it.");return;}
      if(!response.ok)throw new Error(body.error??"Could not reload the saved profile.");
      const record=brandBrainRecordSchema.parse(body.profiles?.[0]);
      setSaved(record);setDraft(record.profile);setRecords(rows=>[record,...rows.filter(row=>row.id!==record.id)]);setUncertain(false);setError(null);setNote("Saved profile reloaded.");
    } catch(cause){setError(cause instanceof Error?cause.message:"Could not reload. Your draft is kept.");}finally{setBusy(false);setReloading(false);}
  }
  async function save(){
    const checked=brandBrainSchema.safeParse(draft);
    if(!checked.success){const issue=checked.error.issues[0];setError(`${issue.path.join(" → ")}: ${issue.message}`);return;}
    setBusy(true);setError(null);setNote(null);
    let confirmedRejection=false;
    try {
      const response=await fetch("/api/studio/brand-brain",{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,expectedRevision:saved?.revision??0,profile:checked.data})}),body=await response.json();
      if(!response.ok){confirmedRejection=response.status<500&&response.status!==409;throw new Error(body.error??"Could not save. Your draft is kept.");}
      const record=brandBrainRecordSchema.parse(body.record);if(record.id!==id)throw new Error("Save acknowledgement did not match this profile.");
      setSaved(record);setDraft(record.profile);setRecords(rows=>[record,...rows.filter(row=>row.id!==record.id)]);setNote(`Brand Brain saved · version ${record.revision}.`);remember(record.id);
    } catch(cause){setError(cause instanceof Error?cause.message:"Save could not be confirmed. Your draft is kept.");if(!confirmedRejection)setUncertain(true);}finally{setBusy(false);}
  }
  const changeBrand=(key:keyof BrandBrain["brand"],value:unknown)=>setDraft(p=>({...p,brand:{...p.brand,[key]:value}}));
  const direction=brandBrainSchema.safeParse(draft).success?compileBrandBrain(draft):null;
  if(loading)return <p role="status" className="text-sm">Loading Brand Brain…</p>;
  if(!id)return <div><p role="alert">{error}</p><button type="button" className={buttonClass} onClick={()=>{setLoading(true);setLoadAttempt(n=>n+1);}}>Retry loading profiles</button></div>;
  return <section aria-label="Brand Brain editor" className="space-y-4">
    <div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-[12px] font-semibold">Saved profiles<select className={inputClass} style={style} value={saved?.id??""} disabled={busy||uploading} onChange={event=>choose(records.find(row=>row.id===event.target.value)??null)}><option value="">New profile</option>{records.map(record=><option key={record.id} value={record.id}>{record.profile.brand.name} · v{record.revision}</option>)}</select></label><button type="button" className={buttonClass} style={style} disabled={busy||uploading} onClick={()=>choose(null)}>New profile</button></div>
    {error&&<p role="alert" className="text-[12px]" style={{color:KEBU.red}}>{error}</p>}{note&&<p role="status" className="text-[12px]">{note}</p>}
    {businessError&&<p className="text-[12px]">Business choices could not load. Existing associations are preserved; you can still save an independent profile.</p>}
    {unavailable.length>0&&<p role="status" className="text-[12px]">Unsupported existing profiles: {unavailable.join(", ")}. Correct their settings in the original Brand DNA editor; their data is unchanged.</p>}
    <fieldset disabled={busy||uploading} className="space-y-3">
      <details open className="rounded-xl border p-3" style={style}><summary className="cursor-pointer text-sm font-semibold">Brand DNA · identity and voice</summary><div className="mt-3 space-y-3">
        <label className="block text-[12px] font-semibold">Business (optional)<select className={inputClass} style={style} disabled={businessError} value={draft.brand.businessId??""} onChange={event=>changeBrand("businessId",event.target.value||null)}><option value="">Independent brand</option>{draft.brand.businessId&&!businesses.some(b=>b.id===draft.brand.businessId)&&<option value={draft.brand.businessId}>Current business</option>}{businesses.map(b=><option key={b.id} value={b.id}>{b.trading_name||b.legal_name}</option>)}</select></label>
        {([['name','Brand name',120],['tagline','Tagline',200],['logoUrl','Logo address',500],['voiceTone','Voice and tone',400],['photographyStyle','Brand photography',400],['visualRules','Brand rules',1000],['customerNotes','Audience',1000],['productsNotes','Products and offers',1000]] as const).map(([key,label,max])=><Field key={key} label={label} max={max} type={max>=400&&key!=='logoUrl'?'textarea':'text'} value={draft.brand[key]} onChange={value=>changeBrand(key,value)}/>)}
        <Field label="Languages (comma-separated)" value={draft.brand.languages.join(",")} onChange={value=>changeBrand("languages",value?value.split(","):[])}/>
        <div className="grid gap-3 sm:grid-cols-2">{([['primaryColor','Primary color'],['accentColor','Accent color'],['backgroundColor','Background color'],['textColor','Text color']] as const).map(([key,label])=><Field key={key} label={label} type="color" value={draft.brand[key]} onChange={value=>changeBrand(key,value)}/>)}{([['fontDisplay','Display font'],['fontBody','Body font']] as const).map(([key,label])=><Field key={key} label={label} choices={STUDIO_FONTS_CATALOG.map(font=>font.family)} value={draft.brand[key]} onChange={value=>changeBrand(key,value)}/>)}</div>
        <BrandBrainAssets key={id} images={draft.brand.approvedImagery} onChange={images=>changeBrand("approvedImagery",images)} onUploading={setUploading}/>
      </div></details>
      <details className="rounded-xl border p-3" style={style}><summary className="cursor-pointer text-sm font-semibold">Creative DNA · composition and hierarchy</summary><div className="mt-3 space-y-3">
        {([['composition','Composition',['balanced','editorial','expressive']],['density','Content density',['airy','balanced','dense']]] as const).map(([key,label,choices])=><Field key={key} label={label} choices={choices} value={draft.creative[key]} onChange={value=>setDraft(p=>({...p,creative:{...p.creative,[key]:value}}))}/>)}
        {([['hierarchy','What should stand out first?'],['photography','Creative photography direction'],['rules','Creative rules']] as const).map(([key,label])=><Field key={key} label={label} type="textarea" value={draft.creative[key]} onChange={value=>setDraft(p=>({...p,creative:{...p.creative,[key]:value}}))}/>)}
      </div></details>
      <details className="rounded-xl border p-3" style={style}><summary className="cursor-pointer text-sm font-semibold">Taste DNA · references and exclusions</summary><div className="mt-3 space-y-3">
        {([['likes','Directions you like'],['dislikes','Directions you dislike'],['exclusions','Never use']] as const).map(([key,label])=><Field key={key} label={label} type="textarea" value={draft.taste[key]} onChange={value=>setDraft(p=>({...p,taste:{...p.taste,[key]:value}}))}/>)}
        <p className="text-[11px]">References are saved with your explanation, not automatically analysed.</p>
        {draft.taste.references.map((reference,index)=><fieldset key={index} className="space-y-2 border-t pt-2"><legend className="text-[12px]">Reference {index+1}</legend>{([['label','Reference label',120],['url','Reference HTTPS address',500],['reason','Why you like this reference',400]] as const).map(([key,label,max])=><Field key={key} label={`${label} ${index+1}`} max={max} value={reference[key]} onChange={value=>setDraft(p=>({...p,taste:{...p.taste,references:p.taste.references.map((r,i)=>i===index?{...r,[key]:value}:r)}}))}/>)}<button type="button" className={buttonClass} onClick={()=>setDraft(p=>({...p,taste:{...p.taste,references:p.taste.references.filter((_,i)=>i!==index)}}))}>Remove reference {index+1}</button></fieldset>)}
        <button type="button" className={buttonClass} disabled={draft.taste.references.length>=12} onClick={()=>setDraft(p=>({...p,taste:{...p.taste,references:[...p.taste.references,{label:"",url:"",reason:""}]}}))}>Add reference</button>
      </div></details>
      <details className="rounded-xl border p-3" style={style}><summary className="cursor-pointer text-sm font-semibold">Motion DNA · movement limits</summary><div className="mt-3 space-y-3">
        <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={draft.motion.enabled} onChange={event=>setDraft(p=>({...p,motion:{...p.motion,enabled:event.target.checked}}))}/>Allow motion in this direction</label>
        {([['entrance','Entrance style',['fade','rise','slide-left','slide-right','zoom']],['interaction','Interaction style',['none','lift','grow','dim']]] as const).map(([key,label,choices])=><Field key={key} label={label} choices={choices} value={draft.motion[key]} onChange={value=>setDraft(p=>({...p,motion:{...p.motion,[key]:value}}))}/>)}
        {([['maxDuration','Maximum duration (ms)'],['maxDistance','Maximum movement (px)']] as const).map(([key,label])=><Field key={key} label={label} type="number" value={draft.motion[key]} onChange={value=>setDraft(p=>({...p,motion:{...p.motion,[key]:Number(value)}}))}/>)}
        <Field label="Motion notes" type="textarea" value={draft.motion.notes} onChange={value=>setDraft(p=>({...p,motion:{...p.motion,notes:value}}))}/>
        <p className="text-[11px]">Reduced-motion preferences always take priority. Saving direction does not animate your site.</p>
      </div></details>
    </fieldset>
    <div className="flex flex-wrap items-center gap-2"><button type="button" className={`${buttonClass} text-white`} style={{background:KEBU.orange}} disabled={busy||uploading||uncertain||(!dirty&&!!saved)} onClick={()=>void save()}>{busy&&!reloading?'Saving…':'Save Brand Brain'}</button><button type="button" className={buttonClass} style={style} disabled={busy||uploading} onClick={()=>void reloadSaved()}>{reloading?'Reloading saved profile…':'Reload saved profile'}</button><span role="status" className="text-[11px]">{dirty?'Unsaved changes':saved?`Saved · version ${saved.revision}`:'New profile'}</span></div>
    {direction&&<details className="border-t pt-3"><summary className="cursor-pointer text-[12px] font-semibold">Direction summary</summary><p className="mt-2 text-[12px]">{direction.profile.creative.composition} composition · {direction.profile.creative.density} density · {direction.constraints.fonts.join(' / ')} · {direction.constraints.motion.enabled?`${direction.constraints.motion.entrance}, up to ${direction.constraints.motion.maxDuration} ms`:'No motion'}. Attach this saved profile in Builder and explicitly apply its colors or motion. AI generation is a later phase.</p></details>}
  </section>;
}

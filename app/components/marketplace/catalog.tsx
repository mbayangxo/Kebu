"use client";
import Link from "next/link";
import { useRef,useState } from "react";
import { type DeveloperApp,type Install } from "@/lib/marketplace/model";
import { mainButton,altButton,Notice,request,useLoad } from "./shared";

type CatalogApp = Pick<DeveloperApp,"id"|"name"|"revision"> & Partial<DeveloperApp>;
type Catalog={apps:DeveloperApp[];unavailable?:CatalogApp[];installs:Install[];signedIn:boolean};
export function DeveloperCatalog(){
  const loaded=useLoad<Catalog>("/api/app-store");
  const [selected,setSelected]=useState<string>();
  const [consent,setConsent]=useState(false);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const lock=useRef(false);
  async function act(app:CatalogApp,action:"add"|"remove"){
    if(lock.current)return;lock.current=true;setBusy(true);setMessage("");
    try{
      await request("/api/app-store",{id:app.id,revision:app.revision,action,consent:consent?"launcher-only-v1":undefined});
      const next=await request<Catalog>("/api/app-store");
      loaded.setValue(next);setSelected(undefined);setConsent(false);
      setMessage(action==="add"?"Added to My Apps.":"Removed from My Apps. Your separate developer account is unchanged.");
    }catch(e){setMessage(e instanceof Error?e.message:"Could not save.");}
    finally{lock.current=false;setBusy(false);}
  }
  const all=[...(loaded.value?.apps??[]),...(loaded.value?.unavailable??[])];
  const installs=new Map(loaded.value?.installs.map(i=>[i.app_id,i])??[]);
  function card(app:CatalogApp){
    const installed=installs.get(app.id);
    const available=app.status==="published"&&app.pricing==="free";
    const current=installed?.revision===app.revision;
    return <article key={app.id} className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-black/10 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#5c5348]">{available?"Developer app · Free to add":"Unavailable"}</p>
      <h3 className="break-words text-xl font-bold">{app.name}</h3><p className="text-sm">{app.tagline}</p>
      {!available&&<p className="text-sm">This app has been withdrawn or suspended.</p>}
      {installed&&available&&!current&&<p className="text-sm">This app changed. Review it again before opening.</p>}
      <div className="mt-auto flex flex-wrap gap-2">
        {available&&installed&&current&&<Link className={mainButton} href={"/app-store/open/"+app.id}>Open {app.name}</Link>}
        {available&&<button disabled={busy} className={altButton} aria-expanded={selected===app.id} aria-controls={"app-details-"+app.id} onClick={()=>{setConsent(false);setSelected(selected===app.id?undefined:app.id);}}>View details</button>}
        {installed&&<button disabled={busy} className={altButton} onClick={()=>void act(app,"remove")}>Remove {app.name}</button>}
      </div>
      {selected===app.id&&available&&<section id={"app-details-"+app.id} className="space-y-3 border-t pt-3">
        <p className="whitespace-pre-wrap text-sm">{app.description}</p>
        <p className="break-all text-sm"><strong>Opens:</strong> {app.launch_url}</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <a className="underline" href={app.privacy_url??undefined} target="_blank" rel="noopener noreferrer">Privacy policy</a>
          <a className="underline" href={app.support_url??undefined} target="_blank" rel="noopener noreferrer">Support</a>
        </div>
        <p className="text-sm text-[#5c5348]">This adds a launcher to your KEBU account. It opens a separate app in a new tab. KEBU shares no account token, wallet, contacts or files. The app may require its own account.</p>
        {loaded.value?.signedIn?(!installed||!current)&&<>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 size-4"/>
            I understand how this app opens and what access it receives.</label>
          <button className={mainButton} disabled={busy||!consent} onClick={()=>void act(app,"add")}>Add {app.name}</button>
        </>:<Link className={mainButton} href="/login?next=/app-store">Sign in to add</Link>}
      </section>}
    </article>;
  }
  return <div className="space-y-6">
    <Notice message={message||loaded.error}/>
    {loaded.loading?<p role="status">Loading developer apps…</p>:<>
      {installs.size>0&&<section className="space-y-3"><h2 className="text-2xl" style={{fontFamily:"var(--font-fraunces)"}}>My developer apps</h2>
        <div className="grid gap-4 sm:grid-cols-2">{all.filter(a=>installs.has(a.id)).map(card)}</div></section>}
      <section className="space-y-3"><h2 className="text-2xl" style={{fontFamily:"var(--font-fraunces)"}}>Developer apps</h2>
        {loaded.value?.apps.filter(a=>!installs.has(a.id)).length?<div className="grid gap-4 sm:grid-cols-2">{loaded.value.apps.filter(a=>!installs.has(a.id)).map(card)}</div>
          :!loaded.error&&<p className="text-sm text-[#5c5348]">No new approved apps are listed right now.</p>}
      </section>
    </>}
    <Link href="/dev/apps" className="text-sm font-semibold underline">Publish your own app</Link>
  </div>;
}

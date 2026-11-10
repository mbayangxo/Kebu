"use client";
import { useRef,useState,type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { categories,type DeveloperApp,type AppReview } from "@/lib/marketplace/model";
import { mainButton,altButton,field,Notice,request,useLoad } from "./shared";

type Loaded={app:DeveloperApp;reviews:AppReview[]};
export function DeveloperEditor({id}:{id?:string}){
  const router=useRouter();
  const loaded=useLoad<Loaded|{apps:DeveloperApp[]}>(id?"/api/dev/apps/"+id:"/api/dev/apps");
  const app=id&&loaded.value&&"app" in loaded.value?loaded.value.app:undefined;
  const reviews=id&&loaded.value&&"reviews" in loaded.value?loaded.value.reviews:[];
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const locked=useRef(false);
  const editable=!app||["draft","rejected"].includes(app.status);
  async function run(fn:()=>Promise<void>){
    if(locked.current)return;
    locked.current=true;setBusy(true);setMessage("");
    try{await fn();}catch(e){setMessage(e instanceof Error?e.message:"Could not save.");}
    finally{locked.current=false;setBusy(false);}
  }
  function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const body=Object.fromEntries(form);
    void run(async()=>{
      const result=await request<{app:DeveloperApp}>(id?"/api/dev/apps/"+id:"/api/dev/apps",
        {...body,price_xof:body.price_xof?Number(body.price_xof):null,revision:app?.revision,expectedStatus:app?.status},id?"PATCH":"POST");
      if(!id){router.push("/dev/apps/"+result.app.id);return;}
      loaded.setValue({app:result.app,reviews});setMessage("Draft saved.");
    });
  }
  async function transition(action:string){
    if(!app)return;
    const result=await request<{app:DeveloperApp}>("/api/dev/apps/"+app.id,{action,revision:app.revision,expectedStatus:app.status},"PATCH");
    loaded.setValue({app:result.app,reviews});
    setMessage(action==="submit"?"Submitted to Kebu for review.":"Withdrawn. Existing installs cannot open this app until it is reviewed again.");
  }
  return <AppShell title={app?.name??"Developer app"}>
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-7">
      <Link href="/dev/apps" className="text-sm underline">← Developer apps</Link>
      <header><p className="text-xs uppercase tracking-widest text-[#8c3000]">Build for KEBU</p>
        <h1 className="mt-2 text-4xl" style={{fontFamily:"var(--font-fraunces)"}}>{id?"Your app":"Create an app"}</h1>
        <p className="mt-2 text-sm text-[#5c5348]">Publish an already-hosted app. Account holders choose whether to add it to their KEBU.</p></header>
      <Notice message={message||loaded.error}/>
      {loaded.loading?<p role="status">Loading developer app…</p>:id&&!app?<p>App not found. <button className="underline" onClick={()=>location.reload()}>Retry</button></p>:<>
        {app&&<div className="rounded-xl border bg-white p-4 text-sm"><strong>Status: {app.status}</strong> · Revision {app.revision}</div>}
        <form key={app?.id??"new"} onSubmit={save} className="grid gap-4 rounded-[20px] border border-black/10 bg-white p-5">
          <fieldset disabled={!editable||busy} className="grid min-w-0 gap-4 disabled:opacity-70">
            <legend className="mb-3 text-xl font-semibold">App details</legend>
            <label className="grid gap-1 text-sm">App name<input name="name" className={field} required minLength={2} maxLength={60} defaultValue={app?.name}/></label>
            <label className="grid gap-1 text-sm">Short description<input name="tagline" className={field} maxLength={160} defaultValue={app?.tagline??""}/></label>
            <label className="grid gap-1 text-sm">Category<select name="category" className={field} defaultValue={app?.category??"business_tool"}>{categories.map(c=><option key={c} value={c}>{c.replaceAll("_"," ")}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Description<textarea name="description" className={field+" min-h-28"} maxLength={4000} defaultValue={app?.description}/></label>
            <label className="grid gap-1 text-sm">Launch URL<input name="launch_url" type="url" className={field} placeholder="https://your-app.example" defaultValue={app?.launch_url??""}/></label>
            <label className="grid gap-1 text-sm">Privacy policy URL<input name="privacy_url" type="url" className={field} defaultValue={app?.privacy_url??""}/></label>
            <label className="grid gap-1 text-sm">Support URL<input name="support_url" type="url" className={field} defaultValue={app?.support_url??""}/></label>
            <p className="text-sm text-[#5c5348]">Use public HTTPS pages with no query parameters, fragments or login secrets. Describe what your app does and any separate account it requires.</p>
            <label className="grid gap-1 text-sm">Pricing<select name="pricing" className={field} defaultValue={app?.pricing??"free"}>
              <option value="free">Free to add</option><option value="paid">Paid — draft only</option><option value="recurring">Subscription — draft only</option>
            </select></label>
            <label className="grid gap-1 text-sm">Price in XOF (paid drafts only)<input name="price_xof" type="number" min={1} step={1} className={field} defaultValue={app?.price_xof??""}/></label>
            <p className="text-sm text-[#5c5348]">Only free apps can be submitted today. KEBU does not provide paid-app checkout yet.</p>
            <button className={mainButton+" w-fit"}>{busy?"Saving…":id?"Save draft":"Create draft"}</button>
          </fieldset>
        </form>
        {app&&<section className="flex flex-wrap gap-3" aria-label="Publishing actions">
          {editable&&<button disabled={busy} className={mainButton} onClick={()=>void run(()=>transition("submit"))}>Submit for review</button>}
          {["review","published"].includes(app.status)&&<button disabled={busy} className={altButton} onClick={()=>void run(()=>transition("withdraw"))}>Withdraw to edit</button>}
          {app.status==="suspended"&&<p className="text-sm">This app is suspended. Contact KEBU support; staff must return it for revision.</p>}
          <Link href="/app-store" className={altButton}>View App Store</Link>
        </section>}
        {reviews.length>0&&<section className="space-y-3"><h2 className="text-xl font-semibold">Review history</h2>
          {reviews.map(r=><article key={r.id} className="rounded-xl border bg-white p-4 text-sm">
            <p className="font-semibold">{r.decision} · Revision {r.revision}</p><p className="mt-2 whitespace-pre-wrap">{r.note}</p>
          </article>)}</section>}
      </>}
    </main>
  </AppShell>;
}

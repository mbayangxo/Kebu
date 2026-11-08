"use client";
import Link from "next/link";
import { useRef,useState,type FormEvent } from "react";
import { type DeveloperApp } from "@/lib/marketplace/model";
import { useLoad,request,Notice,field,mainButton,altButton } from "@/app/components/marketplace/shared";

export default function AppReviews(){
  const loaded=useLoad<{apps:(DeveloperApp&{owner_id:string})[]}>("/api/admin/app-reviews");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const lock=useRef(false);
  function decide(event:FormEvent<HTMLFormElement>,app:DeveloperApp){
    event.preventDefault();if(lock.current)return;
    const data=new FormData(event.currentTarget);
    lock.current=true;setBusy(true);setMessage("");
    void request("/api/admin/app-reviews",{id:app.id,revision:app.revision,decision:data.get("decision"),note:data.get("note")})
      .then(()=>request<{apps:(DeveloperApp&{owner_id:string})[]}>("/api/admin/app-reviews")).then(next=>{loaded.setValue(next);setMessage("Review decision saved.");})
      .catch(e=>setMessage(e.message)).finally(()=>{lock.current=false;setBusy(false);});
  }
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
    <Link href="/admin/record" className="text-sm underline">← Kebu Record</Link>
    <h1 className="text-4xl" style={{fontFamily:"var(--font-fraunces)"}}>App reviews</h1>
    <p className="text-sm">Visit the submitted pages before approving. Check app ownership, functionality, privacy, support and misleading claims. Approval applies to this exact revision.</p>
    <Notice message={message||loaded.error}/>
    {loaded.loading?<p role="status">Loading review queue…</p>:loaded.value?.apps.length?loaded.value.apps.map(app=><article className="space-y-4 rounded-[20px] border bg-white p-5" key={app.id+"-"+app.revision+"-"+app.status}>
      <p className="text-xs uppercase">{app.status} · Revision {app.revision}</p>
      <h2 className="text-2xl font-bold">{app.name}</h2><p className="break-all text-xs">Developer account: {app.owner_id}</p><p className="whitespace-pre-wrap text-sm">{app.description}</p>
      <div className="grid gap-2 text-sm">{[["Launch",app.launch_url],["Privacy",app.privacy_url],["Support",app.support_url]].map(([label,url])=><p className="break-all" key={label}><strong>{label}: </strong><a href={url??undefined} rel="noopener noreferrer" target="_blank" className="underline">{url}</a></p>)}</div>
      <form onSubmit={event=>decide(event,app)} className="grid max-w-xl gap-3">
        <label className="grid gap-1 text-sm">Decision<select name="decision" className={field}>
          {app.status==="review"?<><option value="rejected">Return for revision</option><option value="published">Approve and publish</option></>:app.status==="published"?<option value="suspended">Suspend app</option>:<option value="rejected">Return to developer for revision</option>}
        </select></label>
        <label className="grid gap-1 text-sm">Review note (shared with the developer)<textarea name="note" className={field} required minLength={5} maxLength={1000}/></label>
        <button disabled={busy} className={mainButton+" w-fit"}>Save decision for {app.name}</button>
      </form>
    </article>):!loaded.error&&<p>No apps are awaiting review or currently published.</p>}
    <button className={altButton} onClick={()=>location.reload()}>Refresh queue</button>
  </main>;
}

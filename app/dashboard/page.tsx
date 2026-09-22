"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { Skeleton } from "@/app/components/kebu-skeleton";
import { displayFirstName } from "@/lib/account/user-profile";
import type { HomeSummary } from "@/lib/account/home-summary";
import type { WorkItemRow } from "@/lib/work/items";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import { useKebuAccountContext } from "@/app/hooks/use-kebu-account-context";

const QUICK:Array<{label:string;href:string;icon:KebuIconName}>=[
  {label:"Create",href:"/studio/new",icon:"create"},
  {label:"Build a site",href:"/create/new",icon:"builder"},
  {label:"Studio",href:"/studio",icon:"studio"},
  {label:"Search",href:"/search",icon:"search"},
  {label:"Spaces",href:"/spaces",icon:"spaces"},
  {label:"Opportunity",href:"/opportunity",icon:"opportunity"},
  {label:"Library",href:"/library",icon:"library"},
  {label:"More",href:"/settings",icon:"more"},
];

function formatWhen(value:string|null){
  if(!value)return "";
  const date=new Date(value);
  const today=new Date();
  if(date.toDateString()===today.toDateString())return date.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  return date.toLocaleDateString([],{month:"short",day:"numeric"});
}

export default function KebuHomePage(){
  const router=useRouter();
  const {context}=useKebuAccountContext();
  const [summary,setSummary]=useState<HomeSummary|null>(null);
  const [tasks,setTasks]=useState<WorkItemRow[]>([]);
  const [events,setEvents]=useState<WorkItemRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);setError(null);
    try{
      const homeRes=await fetch("/api/me/home",{credentials:"include"});
      const homeData=await homeRes.json().catch(()=>({})) as {summary?:HomeSummary;error?:string};
      if(homeRes.status===401){router.replace("/login?next=/dashboard");return;}
      if(!homeRes.ok||!homeData.summary){setError(homeData.error??"Could not load Kebu.");return;}
      if(!homeData.summary.setup?.onboardingComplete){router.replace("/welcome?next=/dashboard");return;}
      setSummary(homeData.summary);

      const wsRes=await fetch("/api/me/workspace",{credentials:"include"});
      const wsData=await wsRes.json().catch(()=>({}));
      const businessId=wsRes.ok?wsData.context?.activeBusinessId:null;
      const base=new URLSearchParams();
      if(businessId)base.set("businessId",businessId);else base.set("personal","1");
      const taskParams=new URLSearchParams(base);taskParams.set("kind","task");
      const eventParams=new URLSearchParams(base);eventParams.set("kind","event");
      const [taskRes,eventRes]=await Promise.all([
        fetch("/api/work/items?"+taskParams.toString(),{credentials:"include"}),
        fetch("/api/work/items?"+eventParams.toString(),{credentials:"include"}),
      ]);
      const [taskData,eventData]=await Promise.all([taskRes.json().catch(()=>({})),eventRes.json().catch(()=>({}))]);
      if(taskRes.ok)setTasks(Array.isArray(taskData.items)?taskData.items:[]);
      if(eventRes.ok)setEvents(Array.isArray(eventData.items)?eventData.items:[]);
    }catch{setError("Network error. Retry.");}
    finally{setLoading(false);}
  },[router]);

  useEffect(()=>{void load()},[load]);

  const first=displayFirstName(summary?.profile.name,summary?.profile.email);
  const activeName=context?.mode==="business"&&context.activeBusiness?.name?context.activeBusiness.name:null;
  const activeSpace=activeName??"Kebu";
  const recent=useMemo(()=>{
    if(!summary)return [];
    const sites=summary.sites.map(site=>({id:"site-"+site.id,title:site.title,kind:site.projectType==="store"?"Store":"Site",href:site.projectType==="store"?"/shop/"+site.id:"/my-sites/"+site.id}));
    const businesses=summary.businesses.map(b=>({id:"biz-"+b.id,title:b.name,kind:"Business",href:"/business/"+b.id}));
    return [...sites,...businesses].slice(0,6);
  },[summary]);
  const hasWork=recent.length>0 || Boolean(summary?.updates.length) || tasks.length>0 || events.length>0;

  return <AppShell title="Home">
    <div className="min-h-[calc(100vh-48px)] bg-[#FFFCF8] text-black">
      <div className="mx-auto max-w-[1540px] px-3 py-3 sm:px-5">
        {loading?<div className="space-y-3"><Skeleton height={180}/><Skeleton height={90}/><Skeleton height={300}/></div>:error?<div className="rounded-[16px] border p-6" style={{borderColor:KEBU.status.errorBorder,background:KEBU.status.errorBg}}><p className="font-semibold">{error}</p><button onClick={()=>void load()} className="mt-3 rounded-full bg-black px-4 py-2 text-[10px] font-semibold text-white">Retry</button></div>:summary?<>
          <section className="relative overflow-hidden rounded-[18px] bg-black text-white">
            <div className="absolute inset-0" style={{background:"radial-gradient(circle at 20% 45%,rgba(255,106,0,.72),transparent 24%),radial-gradient(circle at 82% 25%,rgba(255,177,143,.22),transparent 22%),linear-gradient(105deg,#130807,#45160e 52%,#111214)"}}/>
            <div className="absolute -left-10 top-[-70px] h-[280px] w-[280px] rotate-[32deg] rounded-[42%] border-[42px] border-[#FF5A1F]/60"/>
            <div className="relative grid min-h-[178px] items-center lg:grid-cols-[1fr_350px]">
              <div className="p-5 sm:p-7">
                <div className="flex items-center gap-2"><p className="text-[8px] font-semibold uppercase tracking-[.16em] text-white/42">{activeName??"Kebu"}</p><span className="rounded-full bg-white/10 px-2 py-1 text-[7px] text-white/45">{activeSpace} space</span></div>
                <h1 className="mt-2 text-[36px] leading-[.95] tracking-[-.045em] sm:text-[48px]" style={{fontFamily:"var(--font-fraunces)"}}>Good evening, {first}.</h1>
                <p className="mt-2 max-w-lg text-[11px] leading-relaxed text-white/60">Pick up what matters, create something new, or go somewhere else in Kebu.</p>
              </div>
              <div className="hidden h-full border-l border-white/10 p-5 lg:flex lg:flex-col lg:justify-between">
                <p className="max-w-[210px] text-[26px] leading-[1.02]" style={{fontFamily:"var(--font-fraunces)"}}>Ideas become real when the tools get out of the way.</p>
                <Link href="/opportunity" className="text-[9px] font-semibold text-[#FFB09A]">Explore what’s possible →</Link>
              </div>
            </div>
          </section>

          <section className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {QUICK.map((item,index)=><Link key={item.label} href={item.href} className="group flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-[12px] border bg-white px-2 text-center transition hover:-translate-y-0.5" style={{borderColor:KEBU.border,background:index===0?"#FFF0E8":"white"}}><KebuIcon name={item.icon} size={18} style={{color:index===0?KEBU.orange:KEBU.black}}/><span className="text-[8px] font-semibold">{item.label}</span></Link>)}
          </section>

          {!hasWork?<section className="mt-3 rounded-[14px] border border-dashed bg-white px-5 py-8 text-center" style={{borderColor:KEBU.border}}><p className="text-[11px] font-semibold">Nothing is filled with demo activity.</p><p className="mt-1 text-[9px] text-black/35">Your real work will appear here automatically as you create, save, join spaces, or schedule things.</p></section>:null}

          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
            <main className="min-w-0 space-y-3">
              <section className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}>
                <div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold">Recent work</p><p className="mt-0.5 text-[8px] text-black/35">Sites, businesses and creative work you can reopen.</p></div><Link href="/library" className="text-[8px] text-black/35">See all →</Link></div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {recent.map((item,index)=><Link key={item.id} href={item.href} className="min-w-[175px] overflow-hidden rounded-[12px] border bg-white" style={{borderColor:KEBU.border}}><div className="h-[78px]" style={{background:index%3===0?"linear-gradient(135deg,#1a0906,#ff6a00)":index%3===1?"linear-gradient(135deg,#161719,#a84935)":"linear-gradient(135deg,#ecd7c9,#35120d)"}}/><div className="p-2.5"><p className="truncate text-[9px] font-semibold">{item.title}</p><p className="mt-0.5 text-[8px] text-black/35">{item.kind}</p></div></Link>)}
                  {!recent.length?<Link href="/studio/new" className="flex min-h-[120px] min-w-[220px] items-center justify-center rounded-[12px] border border-dashed text-[9px] text-black/40" style={{borderColor:KEBU.border}}>Create your first project →</Link>:null}
                </div>
              </section>

              <section className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}>
                  <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-[11px] font-semibold"><span aria-hidden />Needs your attention</p><Link href="/work" className="text-[8px] text-black/35">Work →</Link></div>
                  <div className="mt-2">
                    {summary.updates.slice(0,5).map(item=><Link key={item.id} href={item.href} className="flex items-center gap-2 border-t py-2.5" style={{borderColor:KEBU.border}}><span className="h-1.5 w-1.5 rounded-full bg-[#FF6A00]"/><span className="min-w-0 flex-1"><span className="block truncate text-[9px] font-semibold">{item.title}</span><span className="block truncate text-[8px] text-black/35">{item.body}</span></span><span className="text-black/20">→</span></Link>)}
                  </div>
                </div>
                <div className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}>
                  <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-semibold">Your spaces</p><div className="flex items-center gap-2"><Link href="/business/register" className="rounded-lg px-5 py-2.5 text-[8px] font-semibold" style={{background:"#FFF0E8",color:KEBU.orange}}>+ New space</Link><Link href="/spaces" className="text-[8px] text-black/35">Open Spaces →</Link></div></div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {summary.businesses.slice(0,4).map((business,index)=><Link key={business.id} href={"/business/"+business.id} className="min-h-[76px] rounded-[10px] p-3 text-white" style={{background:index%2?"linear-gradient(135deg,#171719,#85301f)":"linear-gradient(135deg,#250c08,#ff6a00)"}}><p className="truncate text-[9px] font-semibold">{business.name}</p><p className="mt-1 text-[8px] text-white/45">{business.role}</p></Link>)}
                    {!summary.businesses.length?<Link href="/business/register" className="col-span-2 flex min-h-[76px] items-center justify-center rounded-[10px] border border-dashed text-[8px] text-black/35" style={{borderColor:KEBU.border}}>Create a business space when you need one</Link>:null}
                  </div>
                </div>
              </section>

              <section className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  ["Businesses",summary.businesses.length,"/business"],
                  ["Sites",summary.stats.sitesTotal,"/my-sites"],
                  ["Designs",summary.stats.createDesigns,"/studio"],
                  ["Products",summary.stats.storeProducts,"/shop"],
                  ["Opportunities",summary.opportunities.count,summary.opportunities.exploreHref],
                ].map(([label,value,href])=><Link key={String(label)} href={String(href)} className="rounded-[12px] border bg-white p-3" style={{borderColor:KEBU.border}}><p className="text-[20px]" style={{fontFamily:"var(--font-fraunces)"}}>{String(value)}</p><p className="mt-1 text-[8px] text-black/35">{String(label)}</p></Link>)}
              </section>
            </main>

            <aside className="space-y-3">
              <section className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}>
                <div className="flex items-center justify-between"><p className="text-[11px] font-semibold">Your tasks</p><Link href="/tasks" className="text-[8px] text-black/35">See all →</Link></div>
                <div className="mt-2">{tasks.filter(item=>item.status!=="done").slice(0,5).map(item=><Link key={item.id} href="/tasks" className="flex items-center gap-2 border-t py-2.5" style={{borderColor:KEBU.border}}><span className="h-3.5 w-3.5 rounded-full border border-black/30"/><span className="min-w-0 flex-1 truncate text-[8px]">{item.title}</span><span className="text-[7px] text-black/35">{formatWhen(item.due_at)}</span></Link>)}{!tasks.some(item=>item.status!=="done")?<p className="py-4 text-[8px] text-black/35">Nothing due right now.</p>:null}</div>
              </section>

              <section className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}>
                <div className="flex items-center justify-between"><p className="text-[11px] font-semibold">Next event</p><Link href="/calendar" className="text-[8px] text-black/35">Calendar →</Link></div>
                {events[0]?<Link href="/calendar" className="mt-3 block rounded-[11px] bg-[#F7EFEA] p-3"><p className="text-[9px] font-semibold">{events[0].title}</p><p className="mt-1 text-[8px] text-black/40">{formatWhen(events[0].start_at)}</p></Link>:<p className="py-4 text-[8px] text-black/35">No upcoming event.</p>}
              </section>

              <section className="relative overflow-hidden rounded-[14px] bg-black p-4 text-white">
                <div className="absolute -right-12 -top-12 h-32 w-32 rotate-[28deg] rounded-[40%] bg-[#FF5A1F]"/>
                <div className="relative"><div className="flex items-center gap-2"><span className="text-[20px]" style={{fontFamily:"var(--font-fraunces)"}}>EVA</span><span className="text-[7px] uppercase text-[#FF8A67]">beta</span></div><p className="mt-2 max-w-[190px] text-[9px] leading-relaxed text-white/48">Your communication and thinking partner across Kebu.</p><Link href="/email" className="mt-4 inline-flex rounded-full bg-white px-3 py-2 text-[8px] font-semibold text-black">Open EVA →</Link></div>
              </section>
            </aside>
          </div>
        </>:null}
      </div>
    </div>
  </AppShell>;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

const TABS=[
  {href:"/opportunity",label:"For you",exact:true},
  {href:"/opportunity/listings",label:"Opportunities",exact:false},
  {href:"/opportunity/countries",label:"Places",exact:false},
  {href:"/opportunity/cards",label:"Saved",exact:false},
  {href:"/opportunity/research",label:"Research",exact:false},
] as const;

export function OpportunityOsShell({
  title,
  eyebrow="Opportunity",
  headline,
  subhead,
  children,
  heroVisual,
}:{
  title:string;
  eyebrow?:string;
  headline:string;
  subhead?:string;
  children:React.ReactNode;
  heroVisual?:React.ReactNode;
}){
  const pathname=usePathname();
  return <AppShell title={title}>
    <div className="min-h-[calc(100vh-48px)] bg-[#FFFCF8]">
      <section className="relative overflow-hidden bg-[#0B0D0F] text-white">
        <div className="absolute inset-0" aria-hidden style={{background:"radial-gradient(circle at 18% 45%,rgba(255,106,0,.55),transparent 26%),radial-gradient(circle at 86% 22%,rgba(255,170,130,.20),transparent 20%),linear-gradient(110deg,#150806,#2b1514 46%,#10141a)"}}/>
        <div className="absolute -left-16 -top-24 h-[360px] w-[360px] rotate-[34deg] rounded-[44%] border-[55px] border-[#FF5A1F]/40" aria-hidden/>
        <div className="relative mx-auto max-w-[1500px] px-4 pb-5 pt-4 sm:px-6 lg:px-8">
          <nav className="flex gap-2 overflow-x-auto border-b border-white/10 pb-3">
            {TABS.map(tab=>{
              const active=tab.exact?pathname===tab.href:pathname.startsWith(tab.href);
              return <Link key={tab.href} href={tab.href} className="shrink-0 rounded-full px-3 py-2 text-[8px] font-semibold" style={{background:active?"#FFB09A":"rgba(255,255,255,.055)",color:active?"#190806":"rgba(255,255,255,.58)"}}>{tab.label}</Link>;
            })}
          </nav>
          <div className="grid min-h-[210px] items-center gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[.16em] text-[#FFB09A]">{eyebrow}</p>
              <h1 className="mt-2 max-w-[780px] text-[38px] leading-[.95] tracking-[-.045em] sm:text-[52px]" style={{fontFamily:"var(--font-fraunces)"}}>{headline}</h1>
              {subhead?<p className="mt-3 max-w-[680px] text-[10px] leading-relaxed text-white/55">{subhead}</p>:null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/opportunity/listings" className="rounded-full bg-white px-4 py-2 text-[8px] font-semibold text-black">Browse opportunities</Link>
                <Link href="/opportunity/countries" className="rounded-full border border-white/20 px-4 py-2 text-[8px] font-semibold text-white/70">Explore places</Link>
              </div>
            </div>
            <div className="hidden lg:block">{heroVisual??<p className="max-w-[220px] text-[28px] leading-[1.02] text-white/75" style={{fontFamily:"var(--font-fraunces)"}}>Find the opening.<br/><span className="italic text-[#FFB09A]">Then move.</span></p>}</div>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">{children}</div>
    </div>
  </AppShell>;
}

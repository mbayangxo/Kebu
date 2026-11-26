"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import type { SearchResult } from "@/lib/search/types";

type SearchMode = "all" | "sites" | "business" | "designs" | "opportunities";
type Payload = { results: SearchResult[]; pages: SearchResult[]; mode?: SearchMode; opportunityAccess?: boolean };
const MODES: Array<{ id: SearchMode; label: string }> = [
  { id: "all", label: "All" },
  { id: "sites", label: "Sites" },
  { id: "business", label: "My businesses" },
  { id: "designs", label: "My designs" },
  { id: "opportunities", label: "Opportunities" },
];
const groups: Array<{ kind: SearchResult["kind"]; label: string }> = [
  { kind: "business", label: "Businesses" }, { kind: "opportunity", label: "Opportunities" },
  { kind: "site", label: "Sites & stores" }, { kind: "design", label: "Designs" },
];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Payload>({ results: [], pages: [] });
  const [mode, setMode] = useState<SearchMode>("all");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      abort.current?.abort();
      const controller = new AbortController(); abort.current = controller;
      setLoading(true); setFailed(false);
      try {
        const r = await fetch(`/api/me/search?q=${encodeURIComponent(q)}&mode=${encodeURIComponent(mode)}`, { credentials: "include", signal: controller.signal });
        if (!r.ok) throw new Error("search");
        setData(await r.json());
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, q ? 180 : 0);
    return () => clearTimeout(timer);
  }, [q, mode]);

  return <AppShell title="Search">
    <main className="min-h-[calc(100vh-60px)]" style={{ background: KEBU.bright, color: KEBU.black }}>
      <section className="relative overflow-hidden border-b" style={{ borderColor: KEBU.border }}>
        <div className="absolute inset-0" aria-hidden style={{ background: "linear-gradient(105deg,rgba(45,12,7,.88),rgba(20,12,15,.55) 45%,rgba(255,106,0,.14)),radial-gradient(circle at 18% 45%,rgba(255,106,0,.35),transparent 28%),linear-gradient(180deg,#5a2a1f,#2c1e2a)" }} />
        <div className="relative mx-auto max-w-[1500px] px-4 py-8 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1040px] text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/60">Kebu Search</p>
            <h1 className="mt-2 text-[42px] leading-[.95] tracking-[-.045em] sm:text-[56px]" style={{ fontFamily: "var(--font-fraunces)" }}>Search a bigger tomorrow.</h1>
            <p className="mt-2 text-[12px] text-white/68">Find people, opportunities, solutions and work across your Kebu.</p>
            <div className="mx-auto mt-5 flex max-w-[900px] items-center gap-3 rounded-full bg-white px-4 py-2 text-black shadow-[0_12px_40px_rgba(0,0,0,.18)]">
              <KebuIcon name="search" size={20} style={{ color: KEBU.orange }} />
              <input autoFocus value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search anything… people, sites, opportunities, designs…" aria-label="Search Kebu" className="min-h-10 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-black/35" />
              {q ? <button onClick={()=>setQ("")} className="text-[9px] font-semibold text-black/40">Clear</button> : null}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">→</span>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {MODES.map((item) => (
                <button key={item.id} type="button" onClick={() => setMode(item.id)} className="rounded-full border px-3 py-2 text-[9px] font-semibold" style={{ borderColor: mode === item.id ? "white" : "rgba(255,255,255,.28)", background: mode === item.id ? "white" : "rgba(0,0,0,.18)", color: mode === item.id ? KEBU.black : "rgba(255,255,255,.82)" }}>{item.label}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8">
        {failed ? <section className="rounded-[14px] border p-5" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg }}><p className="font-semibold">Search could not load.</p><p className="mt-1 text-[10px]" style={{color: KEBU.status.errorText}}>Check your connection and try again.</p></section> : null}

        {!failed && !q ? (
          <>
            <div className="grid gap-3 lg:grid-cols-3">
              <Link href="/opportunity" className="relative min-h-[175px] overflow-hidden rounded-[14px] bg-black p-4 text-white">
                <div className="absolute inset-0" style={{background:"radial-gradient(circle at 80% 20%,rgba(255,106,0,.55),transparent 28%),linear-gradient(135deg,#09120f,#0d0d0d)"}} />
                <div className="relative"><p className="text-[8px] font-semibold uppercase tracking-[.14em] text-emerald-300">Featured challenge</p><p className="mt-3 text-[24px] leading-[1.02]" style={{fontFamily:"var(--font-fraunces)"}}>Turn a problem into an opportunity.</p><p className="mt-2 text-[9px] text-white/55">Explore challenges, grants and work already inside Kebu.</p><span className="mt-5 inline-flex rounded-full border border-white/35 px-3 py-2 text-[8px] font-semibold">View opportunities →</span></div>
              </Link>
              <Link href="/people" className="relative min-h-[175px] overflow-hidden rounded-[14px] bg-[#FFF3EA] p-4">
                <p className="text-[8px] font-semibold uppercase tracking-[.14em] text-black/35">People</p><p className="mt-3 text-[24px] leading-[1.02]" style={{fontFamily:"var(--font-fraunces)"}}>Find people already building.</p><p className="mt-2 text-[9px] text-black/45">Your Kebu network, collaborators and people connected to your worlds.</p><span className="mt-5 inline-flex rounded-full border px-3 py-2 text-[8px] font-semibold" style={{borderColor:KEBU.border}}>Explore people →</span>
              </Link>
              <Link href="/studio" className="relative min-h-[175px] overflow-hidden rounded-[14px] p-4 text-white" style={{background:"linear-gradient(135deg,#3c0d09,#ff6a00,#150606)"}}>
                <p className="text-[8px] font-semibold uppercase tracking-[.14em] text-white/55">In the spotlight</p><p className="mt-3 text-[24px] leading-[1.02]" style={{fontFamily:"var(--font-fraunces)"}}>Create from what you discover.</p><p className="mt-2 text-[9px] text-white/60">Move a result into Studio, Library, Mail or a business world.</p><span className="mt-5 inline-flex rounded-full bg-white px-3 py-2 text-[8px] font-semibold text-black">Open Studio →</span>
              </Link>
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-[.9fr_1fr_1fr_1fr]">
              <section className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}><div className="flex items-center justify-between"><p className="text-[11px] font-semibold">Trending searches</p><span className="text-[8px] text-black/30">Ideas</span></div><div className="mt-2 space-y-0">{["creative grants","business registration","build a website","music distribution","remote work","fashion suppliers","scholarships"].map((term,index)=><button key={term} type="button" onClick={()=>setQ(term)} className="flex w-full items-center gap-2 border-t py-2.5 text-left text-[9px]" style={{borderColor:KEBU.border}}><span className="w-4 text-black/30">{index+1}</span><span>{term}</span></button>)}</div></section>
              <section className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}><div className="flex items-center justify-between"><p className="text-[11px] font-semibold">Opportunities for you</p><Link href="/opportunity" className="text-[8px] text-black/35">See all →</Link></div><div className="mt-2">{data.results.filter((x)=>x.kind==="opportunity").slice(0,5).map((item)=><Result key={item.id} item={item}/>)}</div>{!data.results.some((x)=>x.kind==="opportunity")?<p className="border-t py-4 text-[9px] text-black/35" style={{borderColor:KEBU.border}}>Search or open Opportunity to see matched opportunities.</p>:null}</section>
              <section className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}><div className="flex items-center justify-between"><p className="text-[11px] font-semibold">Your Kebu</p><span className="text-[8px] text-black/30">Recent</span></div><div className="mt-2">{data.pages.slice(0,5).map((item)=><Result key={item.id} item={item}/>)}</div></section>
              <section className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}><div className="flex items-center justify-between"><p className="text-[11px] font-semibold">Explore by topic</p><span className="text-black/25">→</span></div><div className="mt-3 grid grid-cols-2 gap-2">{["Business","Education","Creative","Technology","Culture","Community"].map((topic)=><button key={topic} onClick={()=>setQ(topic)} className="min-h-[68px] rounded-[10px] bg-[#F3EEE9] px-3 text-left text-[9px] font-semibold">{topic}</button>)}</div></section>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_280px]">
              <div className="rounded-[14px] border bg-white p-4" style={{borderColor:KEBU.border}}><p className="text-[12px] font-semibold">Don’t just search. Build.</p><p className="mt-1 text-[9px] text-black/40">Turn what you find into a design, document, plan or saved item.</p><div className="mt-3 flex flex-wrap gap-2"><Link href="/studio" className="rounded-full border px-3 py-2 text-[8px] font-semibold" style={{borderColor:KEBU.border}}>Create in Studio</Link><Link href="/library" className="rounded-full border px-3 py-2 text-[8px] font-semibold" style={{borderColor:KEBU.border}}>Save to Library</Link></div></div>
              <div className="rounded-[14px] border bg-white p-4" style={{borderColor:KEBU.border}}><p className="text-[12px] font-semibold">Search with purpose</p><p className="mt-1 text-[9px] text-black/40">Discover · Connect · Create · Grow.</p></div>
              <div className="rounded-[14px] bg-black p-4 text-white"><p className="text-[22px] leading-[1.02]" style={{fontFamily:"var(--font-fraunces)"}}>More talent.<br/>More solutions.</p><p className="mt-2 text-[9px] text-white/45">A bigger Kebu starts with what people can find.</p></div>
            </div>
          </>
        ) : null}

        {!failed && q ? <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_260px]">
          <aside className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}><p className="text-[11px] font-semibold">Filter</p><div className="mt-2 space-y-1">{MODES.map((item)=><button key={item.id} type="button" onClick={()=>setMode(item.id)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-[9px]" style={{background:mode===item.id?"#FFF0E7":"transparent"}}><span>{item.label}</span>{mode===item.id?<span style={{color:KEBU.orange}}>●</span>:null}</button>)}</div></aside>
          <section className="min-w-0">
            {loading ? <p className="py-10 text-center text-[10px] text-black/40">Searching Kebu…</p> : null}
            {!loading && data.results.length === 0 && data.pages.length === 0 ? <div className="rounded-[14px] border border-dashed p-10 text-center" style={{borderColor:KEBU.border}}><p className="font-semibold">No results for “{q}”</p><p className="mt-1 text-[10px] text-black/40">Kebu only shows records that actually exist in the current index.</p></div> : null}
            {data.pages.length ? <section className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}><Heading>Pages & actions</Heading>{data.pages.map((item)=><Result key={item.id} item={item}/>)}</section> : null}
            <div className="mt-3 space-y-3">{groups.map((g)=>{const items=data.results.filter((x)=>x.kind===g.kind);return items.length?<section key={g.kind} className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}><Heading>{g.label}</Heading>{items.map((x)=><Result key={x.id} item={x}/>)}</section>:null})}</div>
          </section>
          <aside className="space-y-3"><div className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}><p className="text-[11px] font-semibold">Explore with Kebu</p>{["Create from this","Save to Library","Search opportunities","Find related people"].map((label)=><div key={label} className="border-t py-3 text-[9px]" style={{borderColor:KEBU.border}}>{label}</div>)}</div><div className="rounded-[14px] bg-[#FFF0E7] p-4"><p className="text-[20px]" style={{fontFamily:"var(--font-fraunces)"}}>Keep exploring.</p><p className="mt-1 text-[9px] text-black/42">Search connects the worlds you already use.</p></div></aside>
        </div> : null}
      </div>
    </main>
  </AppShell>;
}
function Heading({children}:{children:ReactNode}) { return <h2 className="mb-3 text-xs font-black uppercase tracking-[.16em]" style={{color: KEBU.muted}}>{children}</h2>; }
function Result({item}:{item:SearchResult}) {
  return <Link href={item.href} className="group flex min-h-16 items-center gap-3 border-b py-3 transition hover:pl-1" style={{borderColor: KEBU.borders.default}}>
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{background: KEBU.cream, color: item.accent ?? KEBU.black}}><KebuIcon name={item.kind==="opportunity"?"opportunity":item.kind==="design"?"studio":item.kind==="business"?"spaces":item.kind==="site"?"builder":"arrowRight"} size={19}/></span>
    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.label}</span>{item.sublabel?<span className="block truncate text-xs" style={{color:KEBU.muted}}>{item.sublabel}</span>:null}{item.sourceName?<span className="mt-1 block truncate text-[9px]" style={{color:KEBU.faint}}>Source: {item.sourceName}</span>:null}{item.trustLabel?<span className="mt-1 block text-[9px] font-bold uppercase tracking-wider" style={{color: item.trustLabel==="verified"?KEBU.status.successText:KEBU.faint}}>{item.trustLabel.replaceAll("_"," ")}</span>:null}</span>
    <KebuIcon name="arrowRight" size={16} style={{color:KEBU.faint}}/>
  </Link>;
}

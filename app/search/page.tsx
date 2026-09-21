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

  return <AppShell title="Search" immersive>
    <main className="min-h-[calc(100vh-60px)] px-4 py-8 sm:px-8 lg:px-12" style={{ background: KEBU.bright, color: KEBU.black }}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 max-w-3xl">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[.22em]" style={{ color: KEBU.orange }}>Kebu Search</p>
          <h1 className="text-4xl font-semibold tracking-[-.04em] sm:text-6xl" style={{ fontFamily: "var(--font-fraunces)" }}>Find what matters.</h1>
          <p className="mt-3 max-w-xl text-sm" style={{ color: KEBU.muted }}>Search your Kebu and the trusted Kebu corpus. Results are real records, not generated answers.</p>
        </header>

        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {MODES.map((item) => (
            <button key={item.id} type="button" onClick={() => setMode(item.id)} className="shrink-0 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-wide" style={{ borderColor: mode === item.id ? KEBU.black : KEBU.borders.default, background: mode === item.id ? KEBU.black : KEBU.white, color: mode === item.id ? KEBU.white : KEBU.muted }}>{item.label}</button>
          ))}
        </div>
        <div className="sticky top-16 z-20 mb-8 flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm" style={{ borderColor: KEBU.borders.strong }}>
          <KebuIcon name="search" size={22} style={{ color: loading ? KEBU.orange : KEBU.black }} />
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search businesses, opportunities, sites, designs…" aria-label="Search Kebu" className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none sm:text-lg" />
          {q && <button onClick={()=>setQ("")} className="text-xs font-bold" style={{ color: KEBU.muted }}>Clear</button>}
        </div>

        {failed ? <section className="rounded-2xl border p-6" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg }}><p className="font-semibold">Search could not load.</p><p className="mt-1 text-sm" style={{color: KEBU.status.errorText}}>Check your connection and try again.</p></section> : null}

        {!failed && !q ? <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-[.14em]" style={{color: KEBU.muted}}>Go somewhere</p>
          <div className="grid gap-2 sm:grid-cols-2">{data.pages.map(p=><Result key={p.id} item={p}/>)}</div>
        </section> : null}

        {!failed && q && !loading && data.results.length === 0 && data.pages.length === 0 ? <section className="rounded-2xl border border-dashed bg-white p-10 text-center" style={{borderColor: KEBU.borders.default}}><KebuIcon name="search" size={28} className="mx-auto mb-3" style={{color: KEBU.faint}}/><p className="font-semibold">No results for “{q}”</p><p className="mt-1 text-sm" style={{color: KEBU.muted}}>Kebu only shows records that actually exist in the current index.</p></section> : null}

        {!failed && q ? <div className="space-y-8">
          {data.pages.length ? <section><Heading>Pages & actions</Heading><div className="grid gap-2 sm:grid-cols-2">{data.pages.map(p=><Result key={p.id} item={p}/>)}</div></section> : null}
          {groups.map(g=>{const items=data.results.filter(x=>x.kind===g.kind);return items.length?<section key={g.kind}><Heading>{g.label}</Heading><div className="grid gap-2 sm:grid-cols-2">{items.map(x=><Result key={x.id} item={x}/>)}</div></section>:null})}
        </div> : null}
      </div>
    </main>
  </AppShell>;
}

function Heading({children}:{children:ReactNode}) { return <h2 className="mb-3 text-xs font-black uppercase tracking-[.16em]" style={{color: KEBU.muted}}>{children}</h2>; }
function Result({item}:{item:SearchResult}) {
  return <Link href={item.href} className="group flex min-h-20 items-center gap-3 rounded-2xl border bg-white p-4 transition hover:-translate-y-px hover:shadow-sm" style={{borderColor: KEBU.borders.default}}>
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{background: KEBU.cream, color: item.accent ?? KEBU.black}}><KebuIcon name={item.kind==="opportunity"?"opportunity":item.kind==="design"?"studio":item.kind==="business"?"spaces":item.kind==="site"?"builder":"arrowRight"} size={19}/></span>
    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.label}</span>{item.sublabel?<span className="block truncate text-xs" style={{color:KEBU.muted}}>{item.sublabel}</span>:null}{item.sourceName?<span className="mt-1 block truncate text-[9px]" style={{color:KEBU.faint}}>Source: {item.sourceName}</span>:null}{item.trustLabel?<span className="mt-1 block text-[9px] font-bold uppercase tracking-wider" style={{color: item.trustLabel==="verified"?KEBU.status.successText:KEBU.faint}}>{item.trustLabel.replaceAll("_"," ")}</span>:null}</span>
    <KebuIcon name="arrowRight" size={16} style={{color:KEBU.faint}}/>
  </Link>;
}

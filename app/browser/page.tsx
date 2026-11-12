"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";

type Tab = {
  id: string;
  title: string;
  url: string;
  position: number;
  pinned: boolean;
  journey_id: string | null;
  last_opened_at: string;
};
type Bookmark = { id: string; title: string; url: string; journey_id: string | null; created_at: string };
type HistoryEntry = { id: string; title: string; url: string; visited_at: string };
type Journey = { id: string; name: string; updated_at: string };
type ReaderPage = { title: string; text: string; finalUrl: string };

function normalizedDestination(input: string): { type: "url" | "search"; value: string } {
  const raw = input.trim();
  if (!raw) return { type: "search", value: "" };
  if (/^https?:\/\//i.test(raw)) return { type: "url", value: raw };
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw) && !raw.includes(" ")) {
    return { type: "url", value: "https://" + raw };
  }
  return { type: "search", value: raw };
}

export default function BrowserPage() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [page, setPage] = useState<ReaderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [readerLoading, setReaderLoading] = useState(false);
  const [privateMode, setPrivateMode] = useState(false);
  const [sidePanel, setSidePanel] = useState<"bookmarks" | "history" | "journeys" | null>(null);
  const [journeyName, setJourneyName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeId) ?? null, [activeId, tabs]);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/browser/state", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(data.error || "Could not load Browser."); return; }
    const nextTabs = Array.isArray(data.tabs) ? data.tabs as Tab[] : [];
    setTabs(nextTabs);
    setBookmarks(Array.isArray(data.bookmarks) ? data.bookmarks : []);
    setHistory(Array.isArray(data.history) ? data.history : []);
    setJourneys(Array.isArray(data.journeys) ? data.journeys : []);
    setActiveId((current) => current && nextTabs.some((tab) => tab.id === current) ? current : nextTabs[0]?.id ?? null);
  }, []);

  useEffect(() => { void loadState(); }, [loadState]);
  useEffect(() => { setAddress(activeTab?.url || ""); }, [activeTab?.url]);

  async function stateAction(body: Record<string, unknown>) {
    const res = await fetch("/api/browser/state", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Browser action failed.");
    return data;
  }

  async function newTab(url = "", title = "New tab") {
    try {
      if (privateMode) {
        const temp: Tab = {
          id: "private-" + crypto.randomUUID(),
          title,
          url,
          position: tabs.length,
          pinned: false,
          journey_id: null,
          last_opened_at: new Date().toISOString(),
        };
        setTabs((current) => [...current, temp]);
        setActiveId(temp.id);
        setPage(null);
        return;
      }
      const data = await stateAction({ action: "new_tab", url, title });
      setTabs((current) => [...current, data.tab]);
      setActiveId(data.tab.id);
      setPage(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create tab."); }
  }

  async function updateTab(tabId: string, patch: Partial<Pick<Tab, "url" | "title" | "position">>) {
    setTabs((current) => current.map((tab) => tab.id === tabId ? { ...tab, ...patch } : tab));
    if (tabId.startsWith("private-")) return;
    try { await stateAction({ action: "update_tab", id: tabId, ...patch }); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save tab."); }
  }

  async function closeTab(tabId: string) {
    const next = tabs.filter((tab) => tab.id !== tabId);
    setTabs(next);
    if (activeId === tabId) {
      setActiveId(next[0]?.id ?? null);
      setPage(null);
    }
    if (tabId.startsWith("private-")) return;
    try { await stateAction({ action: "close_tab", id: tabId }); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not close tab."); }
  }

  async function navigate(raw: string) {
    const target = normalizedDestination(raw);
    if (target.type === "search") {
      window.location.href = "/search?q=" + encodeURIComponent(target.value);
      return;
    }
    if (!activeTab) {
      await newTab(target.value, target.value);
      return;
    }

    setReaderLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/browser/reader?url=" + encodeURIComponent(target.value), { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not open that page.");
      const reader = data as ReaderPage;
      setPage(reader);
      setAddress(reader.finalUrl);
      await updateTab(activeTab.id, { url: reader.finalUrl, title: reader.title || new URL(reader.finalUrl).hostname });
      if (!privateMode && !activeTab.id.startsWith("private-")) {
        const historyData = await stateAction({
          action: "history",
          url: reader.finalUrl,
          title: reader.title || new URL(reader.finalUrl).hostname,
          tabId: activeTab.id,
        });
        if (historyData.entry) setHistory((current) => [historyData.entry, ...current].slice(0, 100));
      }
    } catch (e) {
      setPage(null);
      setError(e instanceof Error ? e.message : "Could not open that page.");
    } finally {
      setReaderLoading(false);
    }
  }

  async function bookmarkActive() {
    if (!activeTab?.url || privateMode) return;
    try {
      const data = await stateAction({ action: "bookmark", url: activeTab.url, title: activeTab.title || activeTab.url, journeyId: activeTab.journey_id });
      if (data.bookmark) setBookmarks((current) => [data.bookmark, ...current.filter((item) => item.url !== data.bookmark.url)]);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save bookmark."); }
  }

  async function createJourney() {
    if (!journeyName.trim() || privateMode) return;
    try {
      const data = await stateAction({ action: "journey", name: journeyName.trim() });
      if (data.journey) setJourneys((current) => [data.journey, ...current]);
      setJourneyName("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create journey."); }
  }

  return (
    <AppShell title="Browser" immersive>
      <div className="min-h-screen bg-[#EDE9E3] p-0 sm:p-2">
        <div className="mx-auto grid min-h-screen max-w-[1680px] overflow-hidden bg-white shadow-[0_18px_70px_rgba(10,10,10,.10)] sm:min-h-[calc(100vh-16px)] sm:grid-cols-[64px_minmax(0,1fr)] sm:rounded-[18px] sm:border" style={{ borderColor: KEBU.borders.default }}>
          <aside className="hidden flex-col items-center border-r bg-[#090A0C] py-3 text-white sm:flex" style={{borderColor:"rgba(255,255,255,.08)"}}>
            <Link href="/dashboard" className="mb-4 text-[22px] font-black tracking-[-.08em]"><span className="text-[#FF6A00]">K</span></Link>
            <nav className="flex flex-1 flex-col items-center gap-2">
              {[[ "/browser","⌂"],["/search","✦"],["/my-sites","▣"],["/shop","□"],["/email","✉"],["/people","◉"],["/calendar","▦"]].map(([href,icon],index)=><Link key={href} href={href} className="flex h-9 w-9 items-center justify-center rounded-[9px] text-[14px] transition" style={{background:index===0?"#5A170C":"transparent",color:index===0?"#FFB09A":"rgba(255,255,255,.7)"}}>{icon}</Link>)}
            </nav>
            <Link href="/account" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[10px]">ME</Link>
          </aside>
          <div className="flex min-w-0 flex-col">
          <header className="border-b bg-[#F7F4EF]" style={{ borderColor: KEBU.borders.default }}>
            <div className="flex items-end gap-1 overflow-x-auto px-2 pt-2">
              {tabs.map((tab) => (
                <div key={tab.id} className="flex h-9 min-w-[150px] max-w-[220px] items-center gap-2 rounded-t-xl border border-b-0 px-2.5" style={{ borderColor: KEBU.borders.default, background: activeId === tab.id ? "white" : "rgba(255,255,255,.45)" }}>
                  <button type="button" onClick={() => { setActiveId(tab.id); setPage(null); }} className="min-w-0 flex-1 truncate text-left text-[10px] font-bold">{tab.title || "New tab"}</button>
                  <button type="button" aria-label="Close tab" onClick={() => void closeTab(tab.id)} className="text-xs text-black/35 hover:text-black">×</button>
                </div>
              ))}
              <button type="button" onClick={() => void newTab()} className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-black/[.05]" aria-label="New tab"><KebuIcon name="create" size={15} /></button>
            </div>

            <div className="flex items-center gap-2 border-t px-2.5 py-2.5" style={{ borderColor: KEBU.borders.subtle }}>
              <button type="button" onClick={() => activeTab?.url && void navigate(activeTab.url)} aria-label="Reload" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/[.04]">↻</button>
              <form className="flex min-w-0 flex-1 items-center gap-2 rounded-full border bg-white px-3" style={{ borderColor: KEBU.borders.strong }} onSubmit={(event) => { event.preventDefault(); void navigate(address); }}>
                <KebuIcon name="search" size={15} style={{ color: KEBU.muted }} />
                <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Search Kebu or enter a web address" className="min-h-9 min-w-0 flex-1 bg-transparent text-xs outline-none" />
                {privateMode ? <span className="rounded-full bg-black px-2 py-1 text-[8px] font-black uppercase tracking-wide text-white">Private</span> : null}
              </form>
              <button type="button" disabled={!activeTab?.url || privateMode} onClick={() => void bookmarkActive()} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/[.04] disabled:opacity-25" aria-label="Bookmark">☆</button>
              <button type="button" onClick={() => setPrivateMode((value) => !value)} className="hidden rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wide sm:block" style={{ borderColor: privateMode ? KEBU.black : KEBU.borders.default, background: privateMode ? KEBU.black : "white", color: privateMode ? "white" : KEBU.muted }}>Private</button>
              <button type="button" onClick={() => setSidePanel(sidePanel ? null : "bookmarks")} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/[.04]" aria-label="Browser library"><KebuIcon name="library" size={16} /></button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <main className="min-w-0 flex-1 overflow-y-auto">
              {readerLoading ? (
                <div className="flex min-h-[500px] items-center justify-center"><p className="text-xs font-bold" style={{ color: KEBU.muted }}>Opening page securely…</p></div>
              ) : page ? (
                <article className="mx-auto max-w-[900px] px-5 py-8 sm:px-10 sm:py-12">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-5" style={{ borderColor: KEBU.borders.default }}>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Reader view</p>
                      <h1 className="mt-2 text-3xl font-black tracking-[-.035em] sm:text-4xl" style={{ fontFamily: "var(--font-fraunces)" }}>{page.title || new URL(page.finalUrl).hostname}</h1>
                      <p className="mt-2 break-all text-[9px]" style={{ color: KEBU.muted }}>{page.finalUrl}</p>
                    </div>
                    <a href={page.finalUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-black px-4 py-2.5 text-[9px] font-black uppercase tracking-wide text-white">Open original ↗</a>
                  </div>
                  <div className="mt-6 whitespace-pre-wrap text-[14px] leading-8 text-black/80">{page.text}</div>
                  <div className="sticky bottom-4 mt-10 flex flex-wrap justify-center gap-2 rounded-full border bg-white/95 p-2 shadow-xl backdrop-blur" style={{ borderColor: KEBU.borders.default }}>
                    <Link href={"/search?q=" + encodeURIComponent(page.title || page.finalUrl)} className="rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-wide hover:bg-black/[.04]">Search related</Link>
                    <Link href="/opportunity/research" className="rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-wide hover:bg-black/[.04]">Save to research</Link>
                    <Link href="/email" className="rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-wide hover:bg-black/[.04]">Share by Mail</Link>
                    <Link href="/docs" className="rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-wide hover:bg-black/[.04]">Use in Docs</Link>
                  </div>
                </article>
              ) : (
                <div className="mx-auto flex min-h-[560px] max-w-[760px] flex-col justify-center px-5 py-10">
                  <div className="mx-auto w-full max-w-[680px]">
                    <form className="flex items-center gap-2 border-b-2 border-black px-1 py-2" onSubmit={(event) => { event.preventDefault(); void navigate(address); }}>
                      <KebuIcon name="search" size={19} style={{ color: KEBU.orange }} />
                      <input autoFocus value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Search or enter a web address" className="min-h-12 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-black/25" />
                      <button type="submit" className="rounded-full bg-black px-4 py-2 text-[9px] font-semibold text-white">Go</button>
                    </form>
                    <div className="mt-6 grid border-t sm:grid-cols-2" style={{borderColor:KEBU.borders.default}}>
                      {[["/search","Search Kebu"],["/opportunity","Opportunity"],["/email","Mail"],["/rooms","Rooms"]].map(([href,label])=>(
                        <Link key={href} href={href} className="flex items-center justify-between border-b py-3 text-[10px] font-semibold sm:px-3" style={{borderColor:KEBU.borders.default}}>
                          <span>{label}</span><span className="text-black/25">→</span>
                        </Link>
                      ))}
                    </div>
                    <p className="mt-5 text-center text-[9px] leading-relaxed text-black/30">Journeys, history and bookmarks stay in the Browser library. Private mode does not add new history.</p>
                  </div>
                </div>
              )}
            </main>

            <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l bg-[#FFFCF8] p-4 lg:block" style={{ borderColor: KEBU.borders.default }}>
              {!sidePanel ? <div className="space-y-4">
                <section className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-[12px] text-white">✦</span><div><p className="text-[10px] font-semibold">Ask Yande</p><p className="text-[8px] text-black/35">Search, summarize, create, plan.</p></div></div>{["Summarize this page","Compare what I’m viewing","Save this to Kebu","Translate this page","Extract key points"].map((label)=><button key={label} type="button" className="mt-2 flex w-full items-center justify-between rounded-full border px-3 py-2 text-left text-[8px]" style={{borderColor:KEBU.border}}><span>{label}</span><span className="text-black/25">›</span></button>)}</section>
                <section className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}><div className="flex items-center justify-between"><p className="text-[10px] font-semibold">Saved to Kebu</p><button type="button" onClick={()=>setSidePanel("bookmarks")} className="text-[8px] text-black/35">See all →</button></div>{bookmarks.slice(0,3).map((item)=><button key={item.id} type="button" onClick={()=>void navigate(item.url)} className="block w-full border-t py-2.5 text-left" style={{borderColor:KEBU.border}}><p className="truncate text-[9px] font-semibold">{item.title}</p><p className="truncate text-[8px] text-black/35">{item.url}</p></button>)}{!bookmarks.length?<p className="py-3 text-[8px] text-black/35">Saved pages will appear here.</p>:null}</section>
                <section className="rounded-[14px] border bg-white p-3.5" style={{borderColor:KEBU.border}}><div className="flex items-center justify-between"><p className="text-[10px] font-semibold">Tabs</p><button type="button" onClick={()=>void newTab()} className="text-[16px] text-black/30">+</button></div>{tabs.slice(0,5).map((tab)=><button key={tab.id} onClick={()=>{setActiveId(tab.id);setPage(null)}} className="flex w-full items-center gap-2 border-t py-2.5 text-left" style={{borderColor:KEBU.border}}><span className="flex h-6 w-6 items-center justify-center rounded bg-black/[.04] text-[8px]">K</span><span className="min-w-0 flex-1 truncate text-[8px]">{tab.title||"New tab"}</span></button>)}</section>
              </div> : null}
              {sidePanel ? <>
                <div className="flex gap-1">
                  {(["bookmarks","history","journeys"] as const).map((item) => <button key={item} type="button" onClick={() => setSidePanel(item)} className="rounded-full px-3 py-2 text-[8px] font-black uppercase tracking-wide" style={{ background: sidePanel === item ? KEBU.black : "white", color: sidePanel === item ? "white" : KEBU.muted, border: "1px solid " + KEBU.borders.default }}>{item}</button>)}
                </div>

                {sidePanel === "bookmarks" ? <div className="mt-4 space-y-2">{bookmarks.map((item) => <button key={item.id} type="button" onClick={() => void navigate(item.url)} className="w-full border-b py-3 text-left" style={{ borderColor: KEBU.borders.default }}><p className="truncate text-[10px] font-black">{item.title}</p><p className="mt-1 truncate text-[8px]" style={{ color: KEBU.muted }}>{item.url}</p></button>)}{!bookmarks.length ? <p className="text-[10px]" style={{ color: KEBU.muted }}>No bookmarks yet.</p> : null}</div> : null}

                {sidePanel === "history" ? <div className="mt-4 space-y-2">{privateMode ? <p className="text-[10px]" style={{ color: KEBU.muted }}>Private mode does not write new history.</p> : history.map((item) => <button key={item.id} type="button" onClick={() => void navigate(item.url)} className="w-full border-b py-3 text-left" style={{ borderColor: KEBU.borders.default }}><p className="truncate text-[10px] font-black">{item.title || item.url}</p><p className="mt-1 truncate text-[8px]" style={{ color: KEBU.muted }}>{new Date(item.visited_at).toLocaleString()}</p></button>)}</div> : null}

                {sidePanel === "journeys" ? <div className="mt-4">
                  <div className="flex gap-1.5"><input value={journeyName} onChange={(event) => setJourneyName(event.target.value)} placeholder="New journey" disabled={privateMode} className="min-h-9 min-w-0 flex-1 rounded-xl border bg-white px-3 text-[10px] font-bold outline-none" style={{ borderColor: KEBU.borders.default }} /><button type="button" onClick={() => void createJourney()} disabled={!journeyName.trim() || privateMode} className="rounded-xl bg-black px-3 text-[9px] font-black text-white disabled:opacity-30">Add</button></div>
                  <div className="mt-3 space-y-2">{journeys.map((journey) => <div key={journey.id} className="border-b py-3" style={{ borderColor: KEBU.borders.default }}><p className="text-[10px] font-black">{journey.name}</p><p className="mt-1 text-[8px]" style={{ color: KEBU.muted }}>A focused collection for tabs and bookmarks.</p></div>)}</div>
                </div> : null}
              </> : null}
            </aside>
          </div>
          </div>
        </div>
      </div>
      {error ? <div className="fixed bottom-20 left-1/2 z-[100] max-w-[90vw] -translate-x-1/2 rounded-full bg-red-700 px-4 py-2 text-[10px] font-bold text-white shadow-xl">{error}</div> : null}
    </AppShell>
  );
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { GenerationTarget, GenerationBrief } from "@/lib/generation/contracts";
import type { GenerationView } from "@/lib/generation/api";
const control = "w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm";
const button = "rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold disabled:opacity-40";
const labels: Record<string, string> = { queued: "Queued", planning: "Preparing direction", generating: "Building editable content", checking: "Checking layouts", reviewing: "Reviewing the rendered design", repairing: "Repairing presentation", awaiting_approval: "Choose your direction", ready: "Ready to review", needs_attention: "Needs your input", needs_rebase: "Your saved work changed", cancelled: "Cancelled", accepted: "Saved to your draft" };
export function GenerationWorkbench({ kind, targetId }: { kind: GenerationTarget; targetId: string }) {
  const [runs, setRuns] = useState<GenerationView[]>([]), [activeId, setActiveId] = useState(""), [configured, setConfigured] = useState(false), [loaded, setLoaded] = useState(false);
  const [prompt, setPrompt] = useState(""), [direction, setDirection] = useState(""), [mode, setMode] = useState<GenerationBrief["mode"]>("generate"), [output, setOutput] = useState<GenerationBrief["output"]>(kind === "builder" ? "website" : "social"), [preserveText, setPreserveText] = useState(false), [maxRepairs, setMaxRepairs] = useState(1), [pageLimit, setPageLimit] = useState(3);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [page, setPage] = useState(""), [previewWidth, setPreviewWidth] = useState(768), [basedOn, setBasedOn] = useState<string | undefined>();
  const pending = useRef(false), requestKey = useRef<string | null>(null), mounted = useRef(true);
  const active = runs.find(run => run.id === activeId) ?? null;
  const endpoint = `/api/generation/${kind}/${targetId}`;
  const editor = kind === "builder" ? `/create/${targetId}` : `/studio/${targetId}`;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const remember = useCallback((run: GenerationView) => {
    if (run.target_kind !== kind || run.target_id !== targetId) throw new Error("The returned request belongs to another document.");
    if (mounted.current) setRuns(current => {
      const previous = current.find(item => item.id === run.id);
      if (previous && (previous.revision > run.revision || (previous.revision === run.revision && previous.updated_at > run.updated_at))) return current;
      return [run, ...current.filter(item => item.id !== run.id)].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12);
    });
  }, [kind, targetId]);
  useEffect(() => {
    const abort = new AbortController();
    fetch(endpoint, { credentials: "include", signal: abort.signal }).then(async response => {
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Could not load your requests.");
      if (!abort.signal.aborted) { setRuns(body.runs); setActiveId(body.runs[0]?.id ?? ""); setConfigured(body.configured); setLoaded(true); }
    }).catch(reason => { if (!abort.signal.aborted) setError(reason.message); });
    return () => abort.abort();
  }, [endpoint]);
  const pollingId = active && ["queued", "working"].includes(active.state) ? active.id : null;
  useEffect(() => {
    if (!pollingId) return;
    let cancelled = false, inFlight = false;
    const tick = async () => {
      if (inFlight) return; inFlight = true;
      try {
        const response = await fetch(`/api/generation/runs/${pollingId}`, { credentials: "include" });
        const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Status is unavailable. Reload before requesting again.");
        if (cancelled) return; remember(body.run);
        if (["queued", "working"].includes(body.run.state)) {
          const advance = await fetch(`/api/generation/runs/${pollingId}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "advance" }) });
          if (!advance.ok) throw new Error("Could not resume this request. Reload its saved status.");
        }
      } catch (reason) { if (!cancelled) setError(reason instanceof Error ? reason.message : "Status is unavailable."); }
      finally { inFlight = false; }
    };
    const timer = setInterval(() => void tick(), 2500); void tick();
    return () => { cancelled = true; clearInterval(timer); };
  }, [pollingId, remember]);
  async function start() {
    if (pending.current || !configured) return;
    pending.current = true; setBusy(true); setError("");
    requestKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch(endpoint, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: requestKey.current, brief: { prompt, direction, output, mode, preserveText, pageLimit, maxRepairs: mode === "inspect" ? 0 : maxRepairs }, ...(basedOn ? { basedOnRunId: basedOn } : {}) }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "The request was not confirmed. Retry with this same brief.");
      remember(body.run); setActiveId(body.run.id); setPage(""); requestKey.current = null;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The request was not confirmed."); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  async function action(name: "approve" | "cancel" | "accept") {
    if (!active || pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/generation/runs/${active.id}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, ...(name !== "cancel" ? { revision: active.revision } : {}), ...(name === "approve" ? { direction: active.data.direction } : {}) }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Action unconfirmed. Reload status before retrying.");
      if (body.run) remember(body.run);
      else {
        const refreshed = await fetch(`/api/generation/runs/${active.id}`, { credentials: "include" });
        const saved = await refreshed.json(); if (!refreshed.ok) throw new Error("Save receipt is unconfirmed. Reload status."); remember(saved.run);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The action was not confirmed."); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  function updateBrief(change: () => void) { change(); requestKey.current = null; }
  return <main className="min-h-screen bg-[#111214] px-4 py-8 text-white sm:px-8">
    <div className="mx-auto max-w-6xl space-y-8">
      <nav className="flex flex-wrap items-center justify-between gap-4"><Link href={editor} className="text-sm text-white/70">← Back to {kind === "builder" ? "Builder" : "Studio"}</Link><span className="text-xs uppercase tracking-[.2em] text-white/50">Kebu · Yande</span></nav>
      <header className="max-w-2xl space-y-3"><h1 className="text-3xl font-semibold sm:text-4xl">Create, check, refine.</h1><p className="text-sm leading-6 text-white/65">Build an editable {kind === "builder" ? "website" : "design"}, inspect every page, and review repairs before changing your saved draft. A full generation can replace pages and artwork; review every page before acceptance. Publishing is a separate action.</p></header>
      {error ? <p role="alert" className="rounded-xl border border-red-400/40 bg-red-950/40 p-4 text-sm">{error}</p> : null}
      {loaded && !configured ? <p role="status" className="rounded-xl border border-white/15 p-4 text-sm text-white/70">Generation and browser review are not enabled in this environment. Your existing document is still editable.</p> : null}
      <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section aria-label="Creative brief" className="space-y-4">
          <h2 className="text-lg font-semibold">Your brief</h2>
          <label className="block space-y-2 text-sm"><span>What are we making?</span><textarea className={`${control} min-h-36`} maxLength={12000} value={prompt} onChange={event => updateBrief(() => setPrompt(event.target.value))} placeholder="Describe the audience, content, style and result you want." /></label>
          <label className="block space-y-2 text-sm"><span>Visual direction</span><textarea className={control} maxLength={4000} value={direction} onChange={event => updateBrief(() => setDirection(event.target.value))} placeholder="Colors, typography, composition, motion, references…" /></label>
          {kind === "studio" ? <label className="block space-y-2 text-sm"><span>Format</span><select className={control} value={output} onChange={event => updateBrief(() => setOutput(event.target.value as GenerationBrief["output"]))}>{["slides", "carousel", "portfolio", "document", "ebook", "ad", "sticker", "quote", "social", "other"].map(item => <option key={item} value={item}>{({ ebook: "E-book", ad: "Static ad", social: "Social post" } as Record<string, string>)[item] ?? item[0].toUpperCase() + item.slice(1)}</option>)}</select></label> : null}
          <label className="block space-y-2 text-sm"><span>Task</span><select className={control} value={mode} onChange={event => updateBrief(() => setMode(event.target.value as GenerationBrief["mode"]))}><option value="generate">Generate a candidate</option><option value="revise">Revise my content</option><option value="inspect">Inspect saved work only</option></select></label>
          {mode !== "inspect" ? <label className="block space-y-2 text-sm"><span>Maximum pages</span><input className={control} type="number" min={1} max={kind === "builder" ? 12 : 20} value={pageLimit} onChange={event => updateBrief(() => setPageLimit(Math.max(1, Math.min(kind === "builder" ? 12 : 20, Number(event.target.value) || 1))))} /></label> : null}
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={preserveText} onChange={event => updateBrief(() => setPreserveText(event.target.checked))} />Keep my existing wording</label>
          {mode !== "inspect" ? <label className="block space-y-2 text-sm"><span>Automatic presentation repairs</span><select className={control} value={maxRepairs} onChange={event => updateBrief(() => setMaxRepairs(Number(event.target.value)))}><option value={0}>None</option><option value={1}>At most one</option><option value={2}>At most two</option></select></label> : null}
          <p className="text-xs leading-5 text-white/55">Uses your saved media. {kind === "studio" ? "Current Studio documents support up to 20 pages. " : "Save Site direction in Builder before starting. "}At most {mode === "inspect" ? 10 : 2 + Math.ceil(pageLimit / 2) * (1 + maxRepairs) + maxRepairs} AI attempts; each provider attempt uses allowance, including failed attempts. Review generated wording and claims before accepting.</p>
          {basedOn ? <p className="text-xs text-white/65">Using the selected candidate as a revision reference. <button type="button" className="underline" onClick={() => updateBrief(() => setBasedOn(undefined))}>Clear reference</button></p> : null}
          <button type="button" className={`${button} bg-white text-black`} disabled={!loaded || !configured || busy || prompt.trim().length < 8} onClick={() => void start()}>{busy ? "Confirming…" : "Start request"}</button>
          <section aria-label="Saved requests" className="space-y-2 border-t border-white/10 pt-5"><h2 className="text-sm font-semibold">Saved requests</h2>{runs.map(run => <button key={run.id} type="button" aria-pressed={run.id === activeId} className={`${button} block w-full text-left`} onClick={() => { setActiveId(run.id); setPage(""); }}><span className="block truncate">{run.data.brief.prompt}</span><span className="text-xs text-white/50">{labels[run.state] ?? run.state}</span></button>)}</section>
        </section>
        <section aria-label="Generation review" className="min-w-0 space-y-5">
          {!active ? <div className="rounded-2xl border border-white/10 p-8 text-sm text-white/55">Your approved direction, preview, and check results will appear here.</div> : <>
            <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" aria-live="polite" className="font-semibold">{active.state === "working" || active.state === "queued" ? labels[active.phase] : labels[active.state]}</p><span className="text-xs text-white/55">{active.data.calls}/{active.data.maxCalls} AI attempts</span></div>
            {active.data.error ? <p className="rounded-xl border border-amber-400/30 p-4 text-sm text-amber-100">{active.data.error}</p> : null}
            {active.data.direction ? <article className="space-y-3 rounded-2xl border border-white/15 p-5"><h2 className="font-semibold">Proposed direction</h2><p>{active.data.direction.summary}</p><p className="text-sm text-white/65">{active.data.direction.composition}</p><p className="text-sm text-white/65">{active.data.direction.typography}</p><p className="text-sm text-white/65">{active.data.direction.motion}</p><div className="flex gap-2">{active.data.direction.palette.map(color => <span key={color} title={color} className="h-7 w-7 rounded-full border border-white/20" style={{ background: color }} />)}</div>{active.data.direction.contentReview.map((item, index) => <p key={index} className="text-xs text-white/60">Review: {item}</p>)}{active.state === "awaiting_approval" ? <button className={button} type="button" disabled={busy} onClick={() => void action("approve")}>Approve direction and generate</button> : null}</article> : null}
            {active.data.hasCandidate ? <>
              <div className="flex flex-wrap gap-3"><label className="text-xs">Preview width<select className={control} value={previewWidth} onChange={event => setPreviewWidth(Number(event.target.value))}><option value={390}>Phone</option><option value={768}>Tablet</option><option value={1280}>Desktop</option></select></label><label className="text-xs">Page<select className={control} value={page} onChange={event => setPage(event.target.value)}><option value="">First page</option>{active.data.pages?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
              <div className="overflow-auto rounded-xl border border-white/15 bg-white"><iframe title="Private candidate preview" key={`${active.id}-${active.revision}-${page}`} src={`/generation/preview/${active.id}${page ? `?page=${encodeURIComponent(page)}` : ""}`} style={{ width: previewWidth, height: 600, border: 0 }} /></div>
            </> : null}
            {active.data.report ? <article className="space-y-3 rounded-2xl border border-white/15 p-5"><h2 className="font-semibold">Quality checks · {active.data.report.status}</h2><p className="text-xs text-white/60">{active.data.report.viewports.join(" / ")}px · visual review: {active.data.report.visualReview}</p><ul className="space-y-2 text-sm">{active.data.report.issues.map((issue, index) => <li key={index}>{issue.message}{issue.viewport ? ` (${issue.viewport}px)` : ""}</li>)}</ul><details><summary className="cursor-pointer text-xs text-white/60">Executed checks</summary><p className="mt-2 text-xs text-white/60">{active.data.report.checks.join(", ")}</p></details></article> : null}
            {active.data.previousReports.length ? <details className="rounded-xl border border-white/15 p-4 text-sm"><summary className="cursor-pointer">Previous inspection reports ({active.data.previousReports.length})</summary>{active.data.previousReports.map((report, index) => <div key={index} className="mt-3"><p>Before repair {index + 1} · {report.status}</p><ul>{report.issues.map((issue, item) => <li key={item}>{issue.message}</li>)}</ul></div>)}</details> : null}
            <div className="flex flex-wrap gap-3">
              {active.state === "ready" && active.data.brief.mode !== "inspect" ? <button className={`${button} bg-white text-black`} type="button" disabled={busy} onClick={() => { if (window.confirm("Apply this reviewed candidate to the saved draft? Review its wording and claims first. A version of your previous work is retained.")) void action("accept"); }}>Accept into saved draft</button> : null}
              {active.data.hasCandidate && !["working", "queued", "cancelled"].includes(active.state) ? <button className={button} type="button" onClick={() => { setBasedOn(active.id); setMode("revise"); setPrompt(""); requestKey.current = null; }}>Request a revision</button> : null}
              {["queued", "working", "awaiting_approval"].includes(active.state) ? <button className={button} type="button" disabled={busy} onClick={() => void action("cancel")}>Cancel request</button> : null}
              {active.state === "accepted" ? <Link className={button} href={editor}>Open editable draft</Link> : null}
            </div>
            <p className="text-xs text-white/50">Accepting changes the saved draft. It does not publish or deploy it. If another editor changed the document, acceptance stops and keeps that newer work.</p>
          </>}
        </section>
      </div>
    </div>
  </main>;
}

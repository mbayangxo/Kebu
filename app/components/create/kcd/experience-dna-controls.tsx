"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BUILDER_PANEL as BUILDER } from "@/lib/create/builder-panel-appearance";
import { experienceSaveSchema, experienceRecordSchema, newExperienceDna, type ExperienceDna, type ExperienceRecord } from "@/lib/create/experience-dna";

const style = { color: BUILDER.ink, background: BUILDER.surface, borderColor: BUILDER.border };
const input = "mt-1 w-full min-w-0 rounded-lg border p-2 text-[12px]";
const button = "rounded-lg border px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-40";

export function ExperienceDnaControls({ projectId, disabled }: { projectId: string; disabled: boolean }) {
  const prefix = useId();
  const [open, setOpen] = useState(false), [retry, setRetry] = useState(0);
  const [record, setRecord] = useState<ExperienceRecord | null>(null), [draft, setDraft] = useState<ExperienceDna>(newExperienceDna);
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<string | null>(null), [status, setStatus] = useState<string | null>(null);
  const mounted = useRef(true), running = useRef(false);
  const loadedRequest = useRef(-1);
  const dirty = JSON.stringify(draft) !== JSON.stringify(record?.dna ?? newExperienceDna());
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!open || loadedRequest.current === retry) return;
    const controller = new AbortController();
    setLoading(true); setError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/experience-dna`, { credentials: "include", signal: controller.signal });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : "Could not load site direction. Retry.");
        const parsed = experienceRecordSchema.safeParse(body?.record);
        if (!parsed.success || parsed.data.projectId !== projectId) throw new Error("Saved direction is incompatible. Its data has been kept.");
        if (!controller.signal.aborted) { loadedRequest.current = retry; setRecord(parsed.data); setDraft(parsed.data.dna ?? newExperienceDna()); setUncertain(false); }
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load direction."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  // Reopening the accordion must retain the draft, not fetch over it.
  }, [projectId, retry, open]);
  useEffect(() => {
    if (!dirty && !saving) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download") || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const next = new URL(link.href, location.href), current = new URL(location.href);
      if (next.pathname === current.pathname && next.search === current.search) return;
      if (!window.confirm("Leave without saving site direction?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty, saving]);
  function change(next: ExperienceDna) { setDraft(next); setStatus(null); setError(null); }
  async function save() {
    if (!record || running.current || uncertain || disabled || loading) return;
    const parsed = experienceSaveSchema.safeParse({ expectedRevision: record.revision, dna: draft });
    if (!parsed.success) { setError(`Check ${parsed.error.issues[0]?.path.join(" · ") || "site direction"}: ${parsed.error.issues[0]?.message}`); return; }
    running.current = true; setSaving(true); setError(null); setStatus(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/experience-dna`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const body = await response.json().catch(() => null);
      if (!mounted.current) return;
      if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : "Save could not be confirmed. Reload before retrying.");
      const saved = experienceRecordSchema.safeParse(body?.record);
      if (!saved.success || saved.data.projectId !== projectId || saved.data.revision !== record.revision + 1 || JSON.stringify(saved.data.dna) !== JSON.stringify(parsed.data.dna)) throw new Error("Save acknowledgement was invalid. Reload before retrying.");
      setRecord(saved.data); setDraft(saved.data.dna!); setStatus(`Site direction saved · v${saved.data.revision}. Your site pages and elements are unchanged.`);
    } catch (failure) { if (mounted.current) { setUncertain(true); setError(failure instanceof Error ? failure.message : "Save could not be confirmed. Reload before retrying."); } }
    finally { running.current = false; if (mounted.current) setSaving(false); }
  }
  function move<T>(items: T[], index: number): T[] { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; }
  return <details className="border-b p-3 text-[12px]" style={style} open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-semibold">Site direction · Experience DNA</summary>
    <section aria-label="Site direction" className="mt-3 min-w-0 space-y-3">
      <p style={{ color: BUILDER.muted }}>Describe the experience you want visitors to have. References are your observations; saving this brief keeps the site as it is.</p>
      <p role="status" aria-live="polite">{loading ? "Loading site direction…" : saving ? "Saving site direction…" : uncertain ? "Save unconfirmed · reload required" : dirty ? "Unsaved site direction" : record?.revision ? `Saved direction · v${record.revision}` : record ? "No saved site direction yet" : "Direction not loaded"}</p>
      {error ? <p role="alert" className="text-red-700">{error}</p> : null}
      {status ? <p role="status" aria-live="polite">{status}</p> : null}
      <div className="flex flex-wrap gap-2"><button type="button" className={button} style={style} disabled={!record || !dirty || saving || loading || uncertain || disabled} onClick={() => void save()}>Save site direction</button>
        <button type="button" className={button} style={style} disabled={saving || loading} onClick={() => { if (dirty && !window.confirm("Discard unsaved site direction and reload the saved version?")) return; setStatus(null); setRetry(value => value + 1); }}>Reload site direction</button></div>
      {record ? <fieldset disabled={saving || loading || disabled} className="min-w-0 space-y-3">
        <legend className="sr-only">Experience DNA brief</legend>
        {([ ["goal", "Site goal", 1500], ["audience", "Audience", 1500], ["visitorAction", "Main visitor action", 500], ["experience", "Desired experience", 1500] ] as const).map(([key, label, max]) => <div key={key}><label htmlFor={`${prefix}-${key}`} className="block">{label}</label><textarea id={`${prefix}-${key}`} className={input} style={style} rows={key === "visitorAction" ? 2 : 3} maxLength={max} value={draft[key]} onChange={event => change({ ...draft, [key]: event.target.value })} /></div>)}
        <details className="border-t pt-3" style={{ borderColor: BUILDER.border }}><summary className="cursor-pointer font-semibold">Reference observations · {draft.references.length}/12</summary>
          <p className="my-2" style={{ color: BUILDER.muted }}>Add what you noticed and want to learn from. Reference pages are not fetched or analysed automatically.</p>
          <ol className="space-y-3">{draft.references.map((reference, index) => <li key={index} className="min-w-0 border-t pt-2" style={{ borderColor: BUILDER.border }}>
            <label className="block">Reference {index + 1} label<input className={input} style={style} maxLength={120} value={reference.label} onChange={event => change({ ...draft, references: draft.references.map((entry, i) => i === index ? { ...entry, label: event.target.value } : entry) })} /></label>
            <label className="mt-2 block">Reference {index + 1} address<input className={input} style={style} maxLength={500} type="url" value={reference.url} onChange={event => change({ ...draft, references: draft.references.map((entry, i) => i === index ? { ...entry, url: event.target.value } : entry) })} /></label>
            <div className="mt-2"><label htmlFor={`${prefix}-reference-${index}`} className="block">Reference {index + 1} observations</label><textarea id={`${prefix}-reference-${index}`} className={input} style={style} rows={3} maxLength={1500} value={reference.observations} onChange={event => change({ ...draft, references: draft.references.map((entry, i) => i === index ? { ...entry, observations: event.target.value } : entry) })} /></div>
            <div className="mt-2 flex flex-wrap gap-2"><button type="button" className={button} style={style} disabled={index === 0} onClick={() => change({ ...draft, references: move(draft.references, index) })}>Move reference {index + 1} up</button><button type="button" className={button} style={style} onClick={() => change({ ...draft, references: draft.references.filter((_, i) => i !== index) })}>Remove reference {index + 1}</button></div>
          </li>)}</ol><button type="button" className={`${button} mt-2`} style={style} disabled={draft.references.length >= 12} onClick={() => change({ ...draft, references: [...draft.references, { url: "", label: "", observations: "" }] })}>Add reference observation</button>
        </details>
        <details className="border-t pt-3" style={{ borderColor: BUILDER.border }}><summary className="cursor-pointer font-semibold">Desired pages · {draft.pages.length}/12</summary>
          <p className="my-2" style={{ color: BUILDER.muted }}>Plan the pages and their purpose. This list does not create or remove actual site pages.</p>
          <ol className="space-y-3">{draft.pages.map((page, index) => <li key={index} className="min-w-0 border-t pt-2" style={{ borderColor: BUILDER.border }}>
            {([ ["title", "title", 120], ["slug", "address", 60], ["purpose", "purpose", 1000] ] as const).map(([key, label, max]) => <label key={key} className="mt-2 block">Desired page {index + 1} {label}<input className={input} style={style} maxLength={max} value={page[key]} onChange={event => change({ ...draft, pages: draft.pages.map((entry, i) => i === index ? { ...entry, [key]: event.target.value } : entry) })} /></label>)}
            <div className="mt-2 flex flex-wrap gap-2"><button type="button" className={button} style={style} disabled={index === 0} onClick={() => change({ ...draft, pages: move(draft.pages, index) })}>Move desired page {index + 1} up</button><button type="button" className={button} style={style} disabled={draft.pages.length === 1 || page.slug === "home"} onClick={() => change({ ...draft, pages: draft.pages.filter((_, i) => i !== index) })}>Remove desired page {index + 1}</button></div>
          </li>)}</ol><button type="button" className={`${button} mt-2`} style={style} disabled={draft.pages.length >= 12} onClick={() => change({ ...draft, pages: [...draft.pages, { slug: "", title: "", purpose: "" }] })}>Add desired page</button>
        </details>
      </fieldset> : null}
    </section>
  </details>;
}

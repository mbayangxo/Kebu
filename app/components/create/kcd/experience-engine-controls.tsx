"use client";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { canonicalStringify, type KcdDocument, type NodeId, type Transaction } from "@/lib/creative-core";
import { documentVersions, planInputSchema, referenceInputSchema, referenceReviewInputSchema, type ExperienceScope, type ReferenceAnalysis } from "@/lib/create/experience-engine";
import { experienceProposalResponseSchema, experienceProposalSchema, type ExperienceProposal } from "@/lib/create/experience-proposal";
import { BUILDER } from "@/lib/create/builder-ui";
import { ExperienceReferenceReview } from "./experience-reference-review";
const Preview = dynamic(() => import("./experience-plan-preview").then(module => module.ExperiencePlanPreview));
const control = "mt-1 w-full min-w-0 rounded-lg border p-2 text-[12px]";
const button = "rounded-lg border px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-40";
type Props = { document: KcdDocument; pageId: string; selectedId: string | null; disabled: boolean; submit: (transaction: Transaction) => Promise<void> };
export function ExperienceEngineControls(props: Props) {
  const { document: native, pageId, selectedId, disabled, submit } = props, prefix = useId();
  const [open, setOpen] = useState(false), [loaded, setLoaded] = useState(false), [configured, setConfigured] = useState(false), [proposals, setProposals] = useState<ExperienceProposal[]>([]);
  const [busy, setBusy] = useState<string | null>(null), [uncertain, setUncertain] = useState(false), [error, setError] = useState<string | null>(null), [status, setStatus] = useState<string | null>(null);
  const [label, setLabel] = useState(""), [excerpt, setExcerpt] = useState(""), [selectedRefs, setSelectedRefs] = useState<string[]>([]), [scope, setScope] = useState<"page" | "section" | "site">("page"), [replace, setReplace] = useState(false);
  const [planId, setPlanId] = useState(""), [confirming, setConfirming] = useState(false), [editing, setEditing] = useState<{ id: string; analysis: ReferenceAnalysis } | null>(null);
  const mounted = useRef(true), running = useRef(false), attempted = useRef(false), controller = useRef<AbortController | null>(null), latest = useRef(props);
  useLayoutEffect(() => { latest.current = props; });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  const reload = useCallback(async () => {
    if (running.current) return;
    running.current = true; setBusy("Loading proposals…"); setError(null); setStatus(null);
    const abort = new AbortController(); controller.current = abort;
    try {
      const response = await fetch(`/api/projects/${native.id}/experience-engine`, { credentials: "include", signal: abort.signal }), body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not load saved proposals.");
      const result = experienceProposalResponseSchema.parse(body);
      if (result.proposals.some(proposal => proposal.projectId !== native.id)) throw new Error("Saved proposals belong to another site.");
      if (!mounted.current) return;
      setProposals(result.proposals); setConfigured(result.configured); setLoaded(true); setUncertain(false); setConfirming(false);
    } catch (failure) { if (mounted.current && !abort.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load proposals. Retry."); }
    finally { running.current = false; if (mounted.current) setBusy(null); }
  }, [native.id]);
  useEffect(() => { if (open && !attempted.current) { attempted.current = true; void Promise.resolve().then(reload); } }, [open, reload]);
  const dirty = Boolean(label || excerpt || editing);
  useEffect(() => {
    if (!dirty && !busy) return;
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const navigate = (event: MouseEvent) => { const link = (event.target as Element)?.closest?.("a[href]") as HTMLAnchorElement | null; if (!link || link.target === "_blank" || link.hasAttribute("download") || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; const target = new URL(link.href, location.href); if (target.pathname === location.pathname && target.search === location.search) return; if (!window.confirm("Leave with unsaved reference edits or an unconfirmed request?")) { event.preventDefault(); event.stopPropagation(); } };
    window.addEventListener("beforeunload", leave); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", leave); document.removeEventListener("click", navigate, true); };
  }, [dirty, busy]);
  const references = proposals.filter((proposal): proposal is Extract<ExperienceProposal, { kind: "reference" }> => proposal.kind === "reference");
  const plans = proposals.filter((proposal): proposal is Extract<ExperienceProposal, { kind: "plan" }> => proposal.kind === "plan");
  const plan = plans.find(proposal => proposal.id === planId) ?? null;
  const stale = Boolean(plan && canonicalStringify(plan.source.versions) !== canonicalStringify(documentVersions(native)));
  const blocked = disabled || Boolean(busy) || !loaded || uncertain;
  async function request(input: unknown) {
    if (running.current || latest.current.disabled || uncertain || !loaded) return;
    const parsed = referenceInputSchema.or(referenceReviewInputSchema).or(planInputSchema).safeParse(input);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the request."); return; }
    if (parsed.data.kind !== "review" && !configured) return;
    running.current = true; setBusy(parsed.data.kind === "review" ? "Saving reviewed observations…" : "Generating a reviewable proposal…"); setError(null); setStatus(null);
    const abort = new AbortController(); controller.current = abort;
    try {
      const response = await fetch(`/api/projects/${native.id}/experience-engine`, { method: "POST", credentials: "include", signal: abort.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) }), body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Proposal could not be confirmed. Reload before requesting again.");
      const saved = experienceProposalSchema.parse(body?.proposal), requested = parsed.data;
      if (saved.projectId !== native.id || requested.kind === "reference" && (saved.kind !== "reference" || saved.excerpt !== requested.excerpt || saved.label !== requested.label) || requested.kind === "review" && (saved.kind !== "reference" || saved.reviewedFrom !== requested.proposalId || canonicalStringify(saved.analysis) !== canonicalStringify(requested.analysis)) || requested.kind === "plan" && (saved.kind !== "plan" || canonicalStringify(saved.scope) !== canonicalStringify(requested.scope) || canonicalStringify(saved.analysisIds) !== canonicalStringify(requested.analysisIds))) throw new Error("Proposal acknowledgement was incompatible. Reload before requesting again.");
      if (!mounted.current) return;
      setProposals(current => [saved, ...current.filter(item => item.id !== saved.id)].slice(0, 24));
      if (saved.kind === "plan") { setPlanId(saved.id); setConfirming(false); }
      else { setSelectedRefs(current => [...current.filter(id => id !== saved.reviewedFrom).slice(0, 11), saved.id]); if (requested.kind === "reference") { setLabel(""); setExcerpt(""); } else setEditing(null); }
      setStatus("Proposal saved for review. Your site is unchanged.");
    } catch (failure) { if (mounted.current) { setUncertain(true); setError(abort.signal.aborted ? "Request canceled. Source text is kept. Reload proposals before requesting again; an attempt may have used one allowance." : failure instanceof Error ? failure.message : "Proposal not confirmed. Reload before requesting again."); } }
    finally { running.current = false; if (mounted.current) setBusy(null); }
  }
  function generationScope(): ExperienceScope | null {
    if (scope === "site") return { kind: "site", replace: true };
    if (scope === "page") return { kind: "page", pageId, replace };
    const node = selectedId ? native.nodes[selectedId as NodeId] : null;
    if (!node || node.type !== "section" || node.parentId !== null) { setError("Select a native root section before generating this scope."); return null; }
    return { kind: "section", nodeId: node.id, replace };
  }
  async function apply() {
    if (!plan || blocked || stale || running.current || !confirming) return;
    running.current = true; setBusy("Saving reviewed plan…"); setError(null); setStatus(null); setConfirming(false);
    try { await submit(plan.transaction); if (mounted.current) setStatus("Reviewed plan saved. Undo restores the previous content; publishing is separate."); }
    catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : "Apply was not confirmed. Resolve the native save state before continuing."); }
    finally { running.current = false; if (mounted.current) setBusy(null); }
  }
  return <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="min-w-0 border-b p-3 text-[12px]" style={{ color: BUILDER.ink, background: BUILDER.surface, borderColor: BUILDER.border }}>
    <summary className="cursor-pointer font-semibold">Yande · experience engine</summary>
    <section aria-label="Experience engine" className="mt-3 min-w-0 space-y-3">
      <p>Review source evidence and an original native plan before changing your site.</p>
      <p role="status" aria-live="polite">{busy ?? status ?? (uncertain ? "Request unconfirmed · reload required" : loaded ? "Saved proposals loaded" : "Proposals not loaded")}</p>
      {error ? <p role="alert" className="text-red-700 break-words">{error}</p> : null}
      <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={Boolean(busy)} onClick={() => void reload()}>Reload proposals</button>{busy && !busy.startsWith("Saving reviewed plan") ? <button type="button" className={button} onClick={() => controller.current?.abort()}>Cancel request</button> : null}</div>
      {loaded && !configured ? <p>AI generation is not configured. Saved direction, proposals and site content are kept; reviewed observations can still be edited.</p> : null}
      <p className="text-[11px]" style={{ color: BUILDER.muted }}>Each model request reserves one AI allowance, including failed or canceled attempts. Editing observations uses none.</p>
      <div><label htmlFor={`${prefix}-label`} className="block">Reference name</label><input id={`${prefix}-label`} className={control} value={label} maxLength={120} disabled={Boolean(busy)} onChange={event => setLabel(event.target.value)} /></div>
      <div><label htmlFor={`${prefix}-excerpt`} className="block">Source excerpt</label><textarea id={`${prefix}-excerpt`} className={control} rows={4} value={excerpt} maxLength={16000} disabled={Boolean(busy)} onChange={event => setExcerpt(event.target.value)} /><p className="mt-1 text-[11px]">Paste source text you can review. URLs and screenshots are not fetched or inspected.</p></div>
      <button type="button" className={button} disabled={blocked || !configured || !label.trim() || !excerpt.trim()} onClick={() => void request({ kind: "reference", label, excerpt })}>Analyze reference</button>
      <details><summary className="cursor-pointer font-medium">Reference review · {references.length}</summary>{references.length ? <ul className="mt-2 space-y-2">{references.map(proposal => <ExperienceReferenceReview key={proposal.id} proposal={proposal} selected={selectedRefs.includes(proposal.id)} disabled={blocked} draft={editing?.id === proposal.id ? editing.analysis : null} onSelect={() => { if (!selectedRefs.includes(proposal.id) && selectedRefs.length >= 12) { setError("Select at most 12 references for a plan."); return; } setSelectedRefs(current => current.includes(proposal.id) ? current.filter(id => id !== proposal.id) : [...current, proposal.id]); }} onEdit={() => { if (editing && !window.confirm("Discard the current observation edits?")) return; setEditing({ id: proposal.id, analysis: structuredClone(proposal.analysis) }); }} onChange={analysis => setEditing({ id: proposal.id, analysis })} onSave={() => editing && void request({ kind: "review", proposalId: editing.id, analysis: editing.analysis })} onCancel={() => { if (window.confirm("Discard unsaved observation edits?")) setEditing(null); }} />)}</ul> : <p className="mt-2">No saved reference analysis yet. Supply an excerpt to begin.</p>}</details>
      <div><label htmlFor={`${prefix}-scope`} className="block">Plan scope</label><select id={`${prefix}-scope`} className={control} value={scope} disabled={blocked} onChange={event => { setScope(event.target.value as typeof scope); setConfirming(false); }}><option value="page">Current page</option><option value="section">Selected section</option><option value="site">Whole site</option></select></div>
      {scope !== "site" ? <label className="flex items-start gap-2"><input type="checkbox" checked={replace} disabled={blocked} onChange={event => setReplace(event.target.checked)} />Replace content in this scope</label> : <p>Whole-site plans replace site content and may add or remove pages. Review every change before applying.</p>}
      <button type="button" className={button} disabled={blocked || !configured || Boolean(editing)} onClick={() => { const selected = generationScope(); if (selected) void request({ kind: "plan", scope: selected, analysisIds: selectedRefs.filter(id => references.some(reference => reference.id === id)) }); }}>Generate site plan</button>
      <div><label htmlFor={`${prefix}-plan`} className="block">Saved site plan</label><select id={`${prefix}-plan`} className={control} value={planId} disabled={Boolean(busy)} onChange={event => { setPlanId(event.target.value); setConfirming(false); }}><option value="">Choose a saved plan</option>{plans.map(item => <option key={item.id} value={item.id}>{new Date(item.createdAt).toLocaleString()} · {item.scope.kind}</option>)}</select></div>
      {plan ? <div className="min-w-0 space-y-2">
        <p>{plan.plan.summary}</p><p>{plan.scope.replace ? "Replaces" : "Adds to"} {plan.scope.kind} · direction v{plan.source.dnaRevision} · {plan.model}</p>
        {plan.plan.warnings.map((warning, i) => <p key={i}>Review: {warning}</p>)}
        {stale ? <p role="alert">The site changed. Generate and review a fresh plan.</p> : null}
        {plan.plan.pages.map((page, i) => <details key={i}><summary className="cursor-pointer">{page.title} · {page.nodes.length} elements</summary><p className="mt-2">/{page.slug} · {page.purpose}</p><ol className="mt-2 space-y-2">{page.nodes.map((node, j) => <li key={j} className="min-w-0"><p>{j + 1}. {node.type} · {node.parent === null ? "page root" : `inside element ${node.parent + 1}`}</p><p>{node.rationale}</p><pre className="mt-1 whitespace-pre-wrap break-all text-[11px]">{JSON.stringify({ props: node.props, overrides: node.overrides, a11y: node.a11y }, null, 2)}</pre></li>)}</ol></details>)}
        <p>{plan.transaction.ops.filter(op => op.op === "removeNode").length} root removals · {plan.transaction.ops.filter(op => op.op === "removePage").length} page removals · {plan.transaction.ops.filter(op => op.op === "insertPage").length} page additions</p>
        <button type="button" className={button} disabled={blocked || stale} onClick={() => setConfirming(true)}>Apply reviewed plan</button>
        {confirming ? <div role="dialog" aria-label="Confirm reviewed plan" className="space-y-2 rounded-lg border p-2"><p>Apply this exact {plan.scope.kind} plan as one editable change? {plan.scope.replace ? "Existing content in this scope is replaced." : "Content is added."} Undo restores the previous content.</p><div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={blocked || stale} onClick={() => void apply()}>Confirm apply</button><button type="button" className={button} onClick={() => setConfirming(false)}>Cancel apply</button></div></div> : null}
        {!stale ? <Preview document={native} transaction={plan.transaction} /> : null}
      </div> : plans.length === 0 && loaded ? <p>No saved site plan yet. Save Site direction, then request a plan.</p> : null}
    </section>
  </details>;
}

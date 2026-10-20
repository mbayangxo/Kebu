"use client";
import { useId } from "react";
import type { ExperienceProposal } from "@/lib/create/experience-proposal";
import type { ReferenceAnalysis } from "@/lib/create/experience-engine";
type Reference = Extract<ExperienceProposal, { kind: "reference" }>;
export function ExperienceReferenceReview({ proposal, selected, disabled, draft, onSelect, onEdit, onChange, onSave, onCancel }: { proposal: Reference; selected: boolean; disabled: boolean; draft: ReferenceAnalysis | null; onSelect: () => void; onEdit: () => void; onChange: (analysis: ReferenceAnalysis) => void; onSave: () => void; onCancel: () => void }) {
  const prefix = useId();
  return <li className="min-w-0 space-y-2 border-t py-2">
    <label className="flex items-start gap-2"><input type="checkbox" checked={selected} disabled={disabled} onChange={onSelect} /><span>{proposal.label} · {proposal.reviewedFrom ? "owner reviewed" : "model proposal"}</span></label>
    <details><summary className="cursor-pointer">Source excerpt</summary><p className="mt-2 whitespace-pre-wrap break-words">{proposal.excerpt}</p></details>
    <ol className="space-y-2">{(draft ?? proposal.analysis).observations.map((item, index) => <li key={index}>
      <blockquote className="border-l-2 pl-2">“{item.evidence}”</blockquote><p className="mt-1 text-[11px]">{item.inference ? "Inference" : "Direct observation"}</p>
      {draft ? <div><label htmlFor={`${prefix}-${index}`} className="block">Observation {index + 1}</label><textarea id={`${prefix}-${index}`} className="mt-1 w-full min-w-0 rounded-lg border p-2" rows={3} maxLength={600} value={item.observation} disabled={disabled} onChange={event => onChange({ ...draft, observations: draft.observations.map((row, i) => i === index ? { ...row, observation: event.target.value } : row) })} /></div> : <p>{item.observation}</p>}
    </li>)}</ol>
    {proposal.analysis.uncertainties.length ? <div><p className="font-medium">Uncertain or missing</p><ul className="list-disc pl-4">{proposal.analysis.uncertainties.map((item, i) => <li key={i}>{item}</li>)}</ul></div> : null}
    {draft ? <><p className="text-[11px]">The source quote and classification stay attached. Your changes save as a new reviewed version.</p><div className="flex flex-wrap gap-2"><button type="button" className="rounded-lg border px-2.5 py-1.5 disabled:opacity-40" disabled={disabled} onClick={onSave}>Save reviewed observations</button><button type="button" className="rounded-lg border px-2.5 py-1.5" disabled={disabled} onClick={onCancel}>Cancel observation edits</button></div></> : <button type="button" className="rounded-lg border px-2.5 py-1.5 disabled:opacity-40" disabled={disabled} onClick={onEdit}>Edit observations</button>}
  </li>;
}

"use client";
import Link from "next/link";
import type { SiteFormSectionProps } from "@/lib/create/site-forms";

export function SiteFormInspector({ projectId, value, onChange }: { projectId: string; value: Record<string, unknown>; onChange: (patch: Record<string, unknown>) => void }) {
  const fields = (Array.isArray(value.fields) ? value.fields : []) as SiteFormSectionProps["fields"];
  return <div className="space-y-3">
    <Link className="inline-flex min-h-11 items-center rounded-lg border px-3 text-xs font-bold" href={`/create/${projectId}/messages`} target="_blank" rel="noopener noreferrer">Open contact inbox ↗</Link>
    <p className="text-xs leading-relaxed">Published form messages are saved privately in this site’s contact inbox. Reply there using Kebu Mail or your business email app.</p>
    {value.notifyEmail ? <p role="status" className="text-xs">Email forwarding is not connected. Read messages in your contact inbox.</p> : null}
    {([['heading','Form heading',160],['subheading','Form introduction',240],['buttonLabel','Send button label',40],['successMessage','Confirmation message',160]] as const).map(([key,label,max]) => <label className="block text-xs" key={key}>{label}<input className="mt-1 w-full rounded border px-3 py-2" aria-label={label} maxLength={max} value={String(value[key] ?? "")} onChange={event => onChange({ [key]: event.target.value })} /></label>)}
    {fields.map((field,index) => <label className="flex items-center gap-2 text-xs" key={field.id}><input type="checkbox" checked={field.required} onChange={event => onChange({ fields: fields.map((item,at) => at === index ? { ...item, required: event.target.checked } : item) })} />Require {field.label.toLowerCase()}</label>)}
  </div>;
}

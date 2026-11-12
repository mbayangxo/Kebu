"use client";
import { useState } from "react";
import { creativeWorldLinkSchema, creativeWorldSchema, defaultCreativeWorld, worldGroups, type CreativeWorld } from "@/lib/create/creative-world";
import { SectionPhotoField } from "./section-photo-field";
import { SiteMediaUpload } from "./site-media-upload";

export function CreativeWorldInspector({ value, projectId, onChange }: { value?: unknown; projectId: string; onChange: (world: CreativeWorld) => void }) {
  const parsed = creativeWorldSchema.safeParse(value ?? defaultCreativeWorld());
  if (!parsed.success) return <p role="alert">These saved world settings need review. Your content has been preserved.</p>;
  const world = parsed.data;
  const field = "w-full rounded border border-black/20 bg-white px-2 py-2 text-xs text-black";
  const patch = (next: Partial<CreativeWorld>) => onChange({ ...world, ...next });
  const card = (index: number, next: Partial<CreativeWorld["cards"][number]>) => patch({ cards: world.cards.map((item, at) => at === index ? { ...item, ...next } : item) });
  return <div className="space-y-4">
    {([['brand','Brand'],['heading','Opening headline'],['intro','Introduction'],['eyebrow','Eyebrow'],['footer','Footer line']] as const).map(([key, label]) => <label key={key} className="block text-xs">{label}<input className={field} aria-label={label} value={world[key]} maxLength={key === "intro" ? 1000 : key === "brand" ? 80 : 160} onChange={event => patch({ [key]: event.target.value })} /></label>)}
    <div className="flex gap-3">{([['background','Background'],['foreground','Text'],['accent','Accent']] as const).map(([key,label]) => <label key={key} className="text-xs">{label}<input className="block h-10 w-14" type="color" aria-label={`${label} color`} value={world[key]} onChange={event => patch({ [key]: event.target.value })} /></label>)}</div>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={world.motion} onChange={event => patch({ motion: event.target.checked })} />Enable motion</label>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={world.dropMode} onChange={event => patch({ dropMode: event.target.checked })} />Drop mode</label>
    {world.dropMode ? <><label className="block text-xs">Drop headline<input className={field} aria-label="Drop headline" maxLength={160} value={world.dropHeading} onChange={event => patch({ dropHeading: event.target.value })} /></label><label className="block text-xs">Drop accent<input type="color" aria-label="Drop accent" value={world.dropAccent} onChange={event => patch({ dropAccent: event.target.value })} /></label></> : null}
    <details><summary>Directional panels</summary><div className="space-y-3">{world.zones.map((zone, index) => <fieldset key={zone.id} className="space-y-2 border p-2"><legend>{zone.id}</legend>{([['label','Menu label'],['heading','Panel heading'],['body','Panel text']] as const).map(([key,label]) => <label key={key} className="block text-xs">{label}<input className={field} aria-label={`${zone.id} ${label}`} maxLength={key === "label" ? 40 : key === "heading" ? 160 : 1000} value={zone[key]} onChange={event => patch({ zones: world.zones.map((item, at) => at === index ? { ...item, [key]: event.target.value } : item) })} /></label>)}</fieldset>)}</div></details>
    <details><summary>Film and music</summary><div className="space-y-2"><SiteMediaUpload projectId={projectId} kind="video" value={world.video} onChange={video => patch({ video })} label="Campaign film" /><SiteMediaUpload projectId={projectId} kind="audio" value={world.audio} onChange={audio => patch({ audio })} label="Music" /></div><p className="text-xs">Music starts only when a visitor presses play. Playing music uses the drop accent.</p></details>
    <h3 className="text-xs font-bold">Work and artist cards</h3>
    {world.cards.map((item, index) => <fieldset key={item.id} className="space-y-2 rounded border p-2"><legend>{item.title || `Card ${index + 1}`}</legend>
      <label className="block text-xs">Card title<input className={field} aria-label={`Card ${index + 1} title`} maxLength={120} value={item.title} onChange={event => card(index, { title: event.target.value })} /></label>
      <label className="block text-xs">Description<textarea className={field} aria-label={`Card ${index + 1} description`} maxLength={1000} value={item.body} onChange={event => card(index, { body: event.target.value })} /></label>
      <SectionPhotoField projectId={projectId} label={`Card ${index + 1} photo`} value={item.image} onChange={image => card(index, { image })} />
      <WorldLinkField className={field} label={`Card ${index + 1} link`} value={item.href} onCommit={href => card(index, { href })} />
      <label className="block text-xs">Direction<select className={field} aria-label={`Card ${index + 1} direction`} value={item.group} onChange={event => card(index, { group: event.target.value as typeof item.group })}>{worldGroups.map(group => <option key={group}>{group}</option>)}</select></label>
      <label className="block text-xs">Portfolio view<select className={field} aria-label={`Card ${index + 1} portfolio view`} value={item.kind} onChange={event => card(index, { kind: event.target.value as typeof item.kind })}>{["work","person","campaign","film"].map(kind => <option key={kind}>{kind}</option>)}</select></label>
      <div className="grid grid-cols-3 gap-2">{([['x','Horizontal'],['y','Vertical'],['rotation','Rotation']] as const).map(([key,label]) => <label className="text-xs" key={key}>{label}<input className={field} type="number" min={key === "rotation" ? -25 : -20} max={key === "rotation" ? 25 : 20} aria-label={`Card ${index + 1} ${label}`} value={item[key]} onChange={event => card(index, { [key]: Math.max(key === "rotation" ? -25 : -20, Math.min(key === "rotation" ? 25 : 20, Number(event.target.value))) })} /></label>)}</div>
      <div className="flex gap-3"><button type="button" disabled={index === 0} onClick={() => { const cards = [...world.cards]; [cards[index-1],cards[index]] = [cards[index],cards[index-1]]; patch({ cards }); }}>Move earlier</button><button type="button" onClick={() => patch({ cards: world.cards.filter(candidate => candidate.id !== item.id) })}>Remove card</button></div>
    </fieldset>)}
    <button type="button" disabled={world.cards.length >= 40} className={field} onClick={() => patch({ cards: [...world.cards, { id: `card-${crypto.randomUUID()}`, title: "New project", body: "", image: "", href: "", group: "world", kind: "work", x: 0, y: 0, rotation: 0 }] })}>Add work or artist card</button>
  </div>;
}


function WorldLinkField({ value, label, className, onCommit }: { value: string; label: string; className: string; onCommit: (value: string) => void }) {
  const [error, setError] = useState("");
  return <label className="block text-xs">Link<input key={value} className={className} aria-label={label} aria-invalid={Boolean(error)} defaultValue={value} maxLength={300} onBlur={event => {
    const parsed = creativeWorldLinkSchema.safeParse(event.target.value);
    if (parsed.success) { setError(""); onCommit(parsed.data); }
    else setError("Use a page slug, an HTTP link, an email link or a phone link. This link has not been saved.");
  }} />{error ? <span role="alert">{error}</span> : null}</label>;
}

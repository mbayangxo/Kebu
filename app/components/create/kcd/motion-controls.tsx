"use client";

import { useId, useState } from "react";
import { defaultNativeMotion, nativeMotionEnabled, nativeMotionSchema, nativeInteractionSchema, type Device, type KcdNode, type NativeMotion, type Op } from "@/lib/creative-core";
import { BUILDER_PANEL as BUILDER } from "@/lib/create/builder-panel-appearance";

const style = { borderColor: BUILDER.border, background: BUILDER.surface, color: BUILDER.ink, colorScheme: BUILDER.colorScheme };
const field = "w-full rounded-lg border px-2.5 py-2 text-[12px]";
function NumberField({ label, value, min, max, onCommit }: { label: string; value: number; min: number; max: number; onCommit: (n: number) => void }) {
  const id = useId(), [draft, setDraft] = useState(String(value));
  const commit = () => { if (draft !== String(value)) onCommit(draft.trim() ? Number(draft) : NaN); };
  return <label htmlFor={id} className="block space-y-1 text-[12px]">{label}<input id={id} type="number" min={min} max={max} className={field} style={style} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } }} /></label>;
}

export function KcdMotionControls({ node, device, submit }: { node: KcdNode; device: Device; submit: (label: string, ops: () => Op[]) => void }) {
  const [status, setStatus] = useState("");
  const parsed = nativeMotionSchema.safeParse(node.motion), interactionParsed = nativeInteractionSchema.safeParse(node.interaction);
  const motion = parsed.success ? parsed.data : undefined, interaction = interactionParsed.success ? interactionParsed.data : undefined;
  const unsupported = (node.motion !== undefined && !motion) || (node.interaction !== undefined && !interaction);
  const save = (next: NativeMotion | null) => submit("Change animation", () => [{ op: "setMotion", id: node.id, value: next }]);
  const change = (key: keyof NativeMotion, value: unknown) => save({ ...(motion ?? defaultNativeMotion), [key]: value });
  const replay = () => {
    const preview = device === "desktop" ? window.document : window.document.querySelector<HTMLIFrameElement>(`iframe[title="${device} preview"]`)?.contentDocument;
    const host = preview?.querySelector<HTMLElement>(`[data-kcd-motion-for="${node.id}"]`), view = preview?.defaultView;
    if (!host || !view || !host.getClientRects().length) { setStatus("Select a visible element in the canvas to replay."); return; }
    if (view.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStatus("Reduced motion is enabled. The animation stays still."); return; }
    if (!motion || !nativeMotionEnabled(motion, device)) { setStatus("Enable animation on this device to replay."); return; }
    if (typeof host.animate !== "function") { setStatus("Animation playback is unavailable in this browser."); return; }
    if (host.dataset.kcdMotionReady !== "true") { setStatus("Animation is getting ready. Try replay again."); return; }
    host.dispatchEvent(new Event("kcd-motion-replay")); setStatus("Replaying on the canvas. Your saved settings are unchanged.");
  };
  const easingOptions = ["linear", "ease", "ease-in", "ease-out", "ease-in-out"];
  return <details className="border-t pt-3" style={{ borderColor: BUILDER.border }}><summary className="cursor-pointer text-[12px] font-semibold">Motion</summary><div className="space-y-3 pt-3">
    {unsupported ? <p role="alert" className="text-[12px]">These saved animation settings are unsupported. Their content is preserved.</p> : null}
    <label className="block space-y-1 text-[12px]">Entrance animation<select className={field} style={style} value={motion?.preset ?? "none"} disabled={unsupported} onChange={e => e.target.value === "none" ? save(null) : change("preset", e.target.value)}><option value="none">None</option>{[["fade", "Fade"], ["rise", "Rise"], ["slide-left", "Slide left"], ["slide-right", "Slide right"], ["zoom", "Zoom"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    {motion ? <>
      <label className="block space-y-1 text-[12px]">Start animation<select className={field} style={style} value={motion.trigger} onChange={e => change("trigger", e.target.value)}><option value="enter">When entering view</option><option value="load">When page loads</option></select></label>
      <div className="grid grid-cols-2 gap-2"><NumberField key={`duration:${motion.duration}`} label="Duration (ms)" value={motion.duration} min={50} max={5000} onCommit={v => change("duration",v)} /><NumberField key={`delay:${motion.delay}`} label="Delay (ms)" value={motion.delay} min={0} max={5000} onCommit={v => change("delay",v)} /></div>
      {["rise","slide-left","slide-right"].includes(motion.preset) ? <NumberField key={`distance:${motion.distance}`} label="Distance (px)" value={motion.distance} min={0} max={200} onCommit={v => change("distance",v)} /> : null}
      <label className="block space-y-1 text-[12px]">Animation easing<select className={field} style={style} value={motion.easing} onChange={e => change("easing",e.target.value)}>{easingOptions.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
      <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={nativeMotionEnabled(motion,device)} onChange={e => device === "desktop" ? change("enabled",e.target.checked) : save({ ...motion, devices: { ...motion.devices, [device]: { enabled: e.target.checked } } })} />Animate on {device === "mobile" ? "phone" : device}</label>
      {device !== "desktop" ? motion.devices?.[device] ? <button type="button" className="text-[11px] underline" onClick={() => { const devices = { ...motion.devices }; delete devices[device]; save({ ...motion, devices }); }}>Use desktop animation setting</button> : <p className="text-[11px]" style={{ color: BUILDER.muted }}>Animation enablement is inherited from desktop.</p> : null}
      <button type="button" className="rounded-lg border px-2.5 py-1.5 text-[12px] font-medium" style={style} onClick={replay}>Replay animation</button>
    </> : null}
    <label className="block space-y-1 text-[12px]">Hover and link focus<select className={field} style={style} value={interaction?.effect ?? "none"} disabled={unsupported} onChange={e => submit("Change interaction", () => [{ op: "setInteraction", id: node.id, value: e.target.value === "none" ? null : { version: 1, effect: e.target.value, duration: interaction?.duration ?? 180, easing: interaction?.easing ?? "ease-out" } }])}><option value="none">None</option><option value="lift">Lift</option><option value="grow">Grow</option><option value="dim">Dim</option></select></label>
    {interaction ? <><NumberField key={`interaction:${interaction.duration}`} label="Interaction duration (ms)" value={interaction.duration} min={50} max={1000} onCommit={v => submit("Change interaction", () => [{ op: "setInteraction", id: node.id, value: { ...interaction, duration: v } }])} /><label className="block space-y-1 text-[12px]">Interaction easing<select className={field} style={style} value={interaction.easing} onChange={e => submit("Change interaction", () => [{ op: "setInteraction", id: node.id, value: { ...interaction, easing: e.target.value } }])}>{easingOptions.map(v => <option key={v} value={v}>{v}</option>)}</select></label></> : null}
    <p className="text-[11px]" style={{ color: BUILDER.muted }}>Timing and effects are shared across devices. Reduced-motion preferences are respected. Link focus uses your existing links.</p>

    {status ? <p role="status" className="text-[11px]">{status}</p> : null}
  </div></details>;
}

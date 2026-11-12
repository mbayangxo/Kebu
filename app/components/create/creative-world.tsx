/* eslint-disable @next/next/no-img-element -- Uploaded portfolio media retains its authored dimensions. */
"use client";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { creativeWorldSchema, defaultCreativeWorld, wallModes, type CreativeWorld as World } from "@/lib/create/creative-world";
import { resolveCutoutHref } from "@/lib/create/cutout-links";
import "./creative-world.css";

const directions = { artists: "↑", releases: "→", world: "↓", videos: "←" };

/** Reusable gallery layouts. Every brand/content/media choice is saved section data. */
export function CreativeWorld({ value, layout, siteBase = "" }: { value?: unknown; layout: "campaign-wall" | "directional-world"; siteBase?: string }) {
  const parsed = creativeWorldSchema.safeParse(value ?? defaultCreativeWorld());
  const world = parsed.success ? parsed.data : defaultCreativeWorld();
  const [active, setActive] = useState<string>("home");
  const [mode, setMode] = useState<(typeof wallModes)[number]>("wall");
  const [selected, setSelected] = useState<World["cards"][number] | null>(null);
  const [playing, setPlaying] = useState(false);
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const dragCleanup = useRef<(() => void) | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null), previousFocus = useRef<HTMLElement | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const uid = useId();
  const zone = world.zones.find(item => item.id === active);
  const accent = world.dropMode || playing ? world.dropAccent : world.accent;
  const cards = layout === "directional-world"
    ? world.cards.filter(card => active === "home" || card.group === active)
    : world.cards.filter(card => mode === "people" ? card.kind === "person" : mode === "campaigns" ? card.kind === "campaign" : mode === "film" ? card.kind === "film" : true);

  useEffect(() => {
    if (!selected || !dialog.current) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = dialog.current;
    element.showModal();
    return () => { element.close(); previousFocus.current?.focus(); };
  }, [selected]);

  useEffect(() => () => dragCleanup.current?.(), []);

  function move(id: string) { setActive(id); requestAnimationFrame(() => heading.current?.focus()); }
  function swipe(x: number, y: number) {
    if (!start.current) return;
    const dx = x - start.current.x, dy = y - start.current.y;
    start.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 70) return;
    move(Math.abs(dx) > Math.abs(dy) ? dx < 0 ? "releases" : "videos" : dy < 0 ? "artists" : "world");
  }
  const close = () => { dialog.current?.close(); setSelected(null); };

  if (!parsed.success) return <section role="alert">Saved creative world settings could not be displayed. Please review them in the editor.</section>;

  return <section className={`creative-world ${layout} ${world.motion ? "creative-world-motion" : ""}`} style={{ background: world.background, color: world.foreground, "--world-accent": accent } as CSSProperties} aria-label={`${world.brand} creative world`}>
    <header className="world-header"><a href={siteBase || "/"} className="world-brand">{world.brand}</a>
      {world.dropMode ? <span className="world-drop">DROP MODE</span> : null}
      {layout === "campaign-wall" ? <nav aria-label="Portfolio views">{wallModes.map(item => <button key={item} aria-pressed={mode === item} onClick={() => setMode(item)}>{item}</button>)}</nav> : <nav aria-label="Directional navigation">{world.zones.map(item => <button key={item.id} aria-pressed={active === item.id} onClick={() => move(item.id)}>{directions[item.id]} {item.label}</button>)}</nav>}
    </header>
      {world.audio ? <audio aria-label={`${world.brand} music`} src={world.audio} controls preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setPlaying(false)} /> : null}
    <div key={active} className={`world-stage world-stage-${active}`} onTouchStart={event => { if (layout === "directional-world") start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchCancel={() => { start.current = null; }} onTouchEnd={event => { if (layout === "directional-world" && event.changedTouches[0]) swipe(event.changedTouches[0].clientX, event.changedTouches[0].clientY); }}>
      {layout === "directional-world" && active !== "home" ? <button className="world-back" onClick={() => move("home")}>↖ Back to centre</button> : null}
      {layout === "campaign-wall" && mode === "film" && world.video ? <video className="world-film" src={world.video} controls playsInline preload="metadata" aria-label={`${world.brand} campaign film`} /> : null}
      <div key={layout === "directional-world" ? active : mode} className="world-intro">
        <p className="world-eyebrow">{zone ? `${directions[zone.id]} ${zone.label}` : world.eyebrow}</p>
        <h1 ref={heading} tabIndex={-1}>{zone?.heading || (world.dropMode && world.dropHeading ? world.dropHeading : world.heading)}</h1>
        {(zone?.body || world.intro) ? <p className="world-description">{zone?.body || world.intro}</p> : null}
      </div>
      <div className={`world-work world-work-${mode}`} aria-live="polite">
        {cards.map((card, index) => <article key={card.id} className="world-card" style={{ "--card-angle": `${card.rotation}deg`, "--card-x": `${offsets[card.id]?.x ?? card.x}%`, "--card-y": `${offsets[card.id]?.y ?? card.y}%`, "--card-delay": `${Math.min(index, 10) * 45}ms` } as CSSProperties}>
          <button aria-label={`Open ${card.title}`} onClick={() => setSelected(card)}>
            {card.image ? <img src={card.image} alt={card.title} loading="lazy" /> : <span className="world-card-type">{card.title}</span>}
            <span className="world-card-number">{String(index + 1).padStart(2, "0")}</span><strong>{card.title}</strong>
          </button>
          {mode === "chaos" && layout === "campaign-wall" ? <button className="world-move" aria-label={`Move ${card.title}`} onPointerDown={event => {
            if (event.button !== 0) return;
            dragCleanup.current?.();
            const button = event.currentTarget, origin = { x: event.clientX, y: event.clientY }, base = offsets[card.id] ?? { x: card.x, y: card.y };
            const rect = button.closest(".world-work")!.getBoundingClientRect();
            button.setPointerCapture(event.pointerId);
            const update = (next: PointerEvent) => setOffsets(previous => ({ ...previous, [card.id]: { x: Math.max(-20, Math.min(20, base.x + (next.clientX - origin.x) / Math.max(1, rect.width) * 100)), y: Math.max(-20, Math.min(20, base.y + (next.clientY - origin.y) / Math.max(1, rect.height) * 100)) } }));
            const finish = () => { button.removeEventListener("pointermove", update); button.removeEventListener("pointerup", finish); button.removeEventListener("pointercancel", finish); };
            dragCleanup.current = finish;
            button.addEventListener("pointermove", update); button.addEventListener("pointerup", finish); button.addEventListener("pointercancel", finish);
          }} onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
            event.preventDefault(); const base = offsets[card.id] ?? { x: card.x, y: card.y };
            setOffsets(previous => ({ ...previous, [card.id]: { x: Math.max(-20, Math.min(20, base.x + (event.key === "ArrowRight" ? 2 : event.key === "ArrowLeft" ? -2 : 0))), y: Math.max(-20, Math.min(20, base.y + (event.key === "ArrowDown" ? 2 : event.key === "ArrowUp" ? -2 : 0))) } }));
          }}>↔ Move</button> : null}
        </article>)}
        {!cards.length && !(mode === "film" && world.video) ? <p className="world-empty">No {zone?.label.toLowerCase() || (mode === "wall" ? "work" : mode)} added yet.</p> : null}
      </div>
    </div>
    <footer className="world-footer"><span>{world.brand}</span><span>{world.footer}</span></footer>
    {selected ? <dialog ref={dialog} className="world-dialog" aria-labelledby={`${uid}-title`} onCancel={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <button onClick={close} aria-label="Close project">✕ Close</button>
      {selected.image ? <img src={selected.image} alt="" /> : null}
      <h2 id={`${uid}-title`}>{selected.title}</h2><p>{selected.body}</p>
      {selected.href ? <a href={resolveCutoutHref(selected.href, siteBase)}>Explore project ↗</a> : null}
    </dialog> : null}
  </section>;
}

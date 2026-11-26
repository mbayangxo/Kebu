"use client";

import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { alignSpatialBox, snapSpatialBox, gestureBox, isSpatialLocked, resolveNode, PILOT_DEFINITIONS, type Device, type KcdDocument, type NodeId, type SpatialBox, type SpatialTargets, type SpatialGuide, type SpatialAlignment } from "@/lib/creative-core";

import { measureSpatialElement, spatialPointerBasis } from "@/lib/create/kcd-spatial-measure";

type View = { target: HTMLElement; parent: HTMLElement; box: SpatialBox; scaleX: number; scaleY: number; container: { width: number; height: number }; delta: (x: number, y: number) => { x: number; y: number } };
/** Ephemeral pointer preview; the canonical document changes only once, on release. */
export function KcdSpatialControls({ document: doc, rootId, selectedId, device, onChange }: {
  document: KcdDocument; rootId: NodeId; selectedId: string | null | undefined; device: Device;
  onChange: (id: string, box: SpatialBox) => Promise<unknown>;
}) {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapping, setSnapping] = useState(true);
  const [pending, setPending] = useState(false);
  const gesture = useRef<{ pointerId: number; startX: number; startY: number; view: View; resize: boolean; next: SpatialBox; targets: SpatialTargets; restore: () => void } | null>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const guideHost = useRef<HTMLDivElement>(null);
  const ghostHost = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = selectedId ? doc.nodes[selectedId as NodeId] : undefined;
    if (!node?.parentId || isSpatialLocked(doc, node.id)) return;
    const root = window.document.querySelector(`[data-kcd-root-id="${rootId}"]`);
    const target = root?.querySelector<HTMLElement>(`[data-kcd-node-id="${node.id}"]`);
    const parent = target?.parentElement?.closest<HTMLElement>("[data-kcd-canvas-for]");
    if (!target || !parent) return;
    const parentNode = doc.nodes[node.parentId];
    const parentDefinition = PILOT_DEFINITIONS.find(definition => definition.type === parentNode?.type);
    const parentProps = parentNode ? resolveNode(parentNode, device, parentDefinition) : {};
    const measure = () => {
      if (gesture.current) return;
      const measured = measureSpatialElement(target, parent);
      const basis = spatialPointerBasis(parent);
      setView({ target, parent, ...basis, container: { ...measured.container, height: Math.max(measured.container.height, parentProps.canvasHeight === undefined ? 600 : Number(parentProps.canvasHeight)) }, box: measured.box });
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(target); observer.observe(parent);
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape" && gesture.current) { event.preventDefault(); gesture.current.restore(); gesture.current = null; } };
    window.addEventListener("keydown", escape); window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("keydown", escape); window.removeEventListener("resize", measure); gesture.current?.restore(); gesture.current = null; };
  }, [doc, rootId, selectedId, device]);
  const node = selectedId ? doc.nodes[selectedId as NodeId] : undefined;
  if (!node?.parentId || isSpatialLocked(doc, node.id) || !view || !view.target.isConnected || view.target.dataset.kcdNodeId !== selectedId || view.target.closest("[data-kcd-root-id]")?.getAttribute("data-kcd-root-id") !== rootId) return null;
  const paint = (box: SpatialBox, guides: SpatialGuide[] = []) => {
    guideHost.current?.replaceChildren(...guides.map(guide => {
      const line = window.document.createElement("div");
      line.dataset.kcdGuideAxis = guide.axis; line.dataset.kcdGuidePosition = String(guide.position);
      Object.assign(line.style, { position: "absolute", pointerEvents: "none", ...(guide.axis === "x" ? { left: `${guide.position - box.x}px`, top: `${-box.y}px`, height: `${view.container.height}px`, borderLeft: "1px dashed #00C851" } : { top: `${guide.position - box.y}px`, left: `${-box.x}px`, width: `${view.container.width}px`, borderTop: "1px dashed #00C851" }) });
      return line;
    }));
    if (overlay.current) Object.assign(overlay.current.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.elementWidth}px`, height: `${box.elementHeight}px` });
  };
  const commit = async (box: SpatialBox) => {
    setError(null); setPending(true);
    try { await onChange(node.id, { ...box, ...((resolveNode(node, device, PILOT_DEFINITIONS.find(definition => definition.type === node.type)).constraintX || resolveNode(node, device, PILOT_DEFINITIONS.find(definition => definition.type === node.type)).constraintY) ? { referenceWidth: view.container.width, referenceHeight: view.container.height } : {}) }); } catch (cause) { setError(cause instanceof Error ? cause.message : "The layout edit could not be saved."); }
    finally { setPending(false); }
  };
  const cancel = () => { gesture.current?.restore(); gesture.current = null; };
  const start = (event: ReactPointerEvent<HTMLButtonElement>, resize: boolean) => {
    event.stopPropagation(); event.preventDefault();
    if (pending || event.button !== 0) return;
    // The drag ghost never mutates React-owned geometry, including during incoming saves.
    const ghost = view.target.cloneNode(true) as HTMLElement;
    for (const element of [ghost, ...ghost.querySelectorAll<HTMLElement>("*")]) {
      element.removeAttribute("id"); element.removeAttribute("data-kcd-node-id"); element.removeAttribute("data-kcd-canvas-for"); element.removeAttribute("data-kcd-link-for");
    }
    ghost.setAttribute("aria-hidden", "true"); ghost.inert = true;
    Object.assign(ghost.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", boxSizing: "border-box", pointerEvents: "none" });
    ghostHost.current?.replaceChildren(ghost);
    const opacity = view.target.style.getPropertyValue("opacity");
    view.target.style.setProperty("opacity", "0.35");
    const overlayStyle = overlay.current?.style.cssText;
    const restore = () => { if (opacity) view.target.style.setProperty("opacity", opacity); else view.target.style.removeProperty("opacity"); ghostHost.current?.replaceChildren(); guideHost.current?.replaceChildren(); if (overlay.current && overlayStyle !== undefined) overlay.current.style.cssText = overlayStyle; };
    const targets: SpatialTargets = { x: [0, view.container.width / 2, view.container.width], y: [0, view.container.height / 2, view.container.height] };
    for (const sibling of Object.values(doc.nodes)) {
      if (sibling.id === node.id || sibling.parentId !== node.parentId || sibling.pageId !== node.pageId) continue;
      const element = view.parent.querySelector<HTMLElement>(`[data-kcd-node-id="${sibling.id}"]`);
      if (!element || !element.getClientRects().length || getComputedStyle(element).display === "none") continue;
      const { box } = measureSpatialElement(element, view.parent);
      (targets.x as number[]).push(box.x, box.x + box.elementWidth / 2, box.x + box.elementWidth);
      (targets.y as number[]).push(box.y, box.y + box.elementHeight / 2, box.y + box.elementHeight);
    }
    gesture.current = { targets, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, view, resize, next: view.box, restore };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const delta = active.view.delta(event.clientX - active.startX, event.clientY - active.startY);
    active.next = gestureBox(active.view.box, delta.x, delta.y, active.resize);
    const result = snapping && !event.altKey ? snapSpatialBox(active.next, active.targets, active.resize, { x: 6 / active.view.scaleX, y: 6 / active.view.scaleY }) : { box: active.next, guides: [] };
    active.next = result.box;
    paint(active.next, result.guides);
  };
  const end = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    move(event); const box = active.next;
    cancel(); event.currentTarget.releasePointerCapture(event.pointerId);
    if (event.clientX !== active.startX || event.clientY !== active.startY) void commit(box);
  };
  const keys = (event: KeyboardEvent<HTMLButtonElement>, resize: boolean) => {
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); cancel(); return; }
    if (pending || gesture.current || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault(); const step = event.shiftKey ? 10 : 1;
    void commit(gestureBox(view.box, event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0, event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0, resize));
  };
  const control = (resize: boolean) => <button type="button" aria-label={resize ? "Resize selected element" : "Move selected element"} title={`${resize ? "Resize" : "Move"}: drag or use arrow keys; Shift for 10px; Escape cancels`} disabled={pending}
    style={{ position: "absolute", ...(resize ? { right: -8, bottom: -8 } : { left: 0, top: -28 }), pointerEvents: "auto", touchAction: "none", background: "#fff", color: "#111", border: "2px solid #00C851", borderRadius: 4, padding: resize ? "4px 7px" : "2px 8px", fontSize: 12, cursor: resize ? "nwse-resize" : "move" }}
    onClick={event => event.stopPropagation()} onPointerDown={event => start(event, resize)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onLostPointerCapture={cancel} onKeyDown={event => keys(event, resize)}>{resize ? "↘" : "Move"}</button>;
  return createPortal(<div ref={overlay} data-kcd-spatial-controls style={{ position: "absolute", left: view.box.x, top: view.box.y, width: view.box.elementWidth, height: view.box.elementHeight, zIndex: 1001, pointerEvents: "none", outline: "2px solid #00C851" }}>
    <div ref={ghostHost} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
    <div ref={guideHost} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
    {control(false)}{control(true)}
    <details style={{ position: "absolute", left: 58, top: -28, zIndex: 2, width: "max-content", whiteSpace: "nowrap", pointerEvents: "auto", fontSize: 12, color: "#111" }} onClick={event => event.stopPropagation()} onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") event.currentTarget.removeAttribute("open"); }}>
      <summary style={{ background: "white", border: "1px solid #00C851", borderRadius: 4, padding: "3px 6px", cursor: "pointer" }}>Align</summary>
      <div role="group" aria-label="Align to container" style={{ position: "absolute", background: "white", border: "1px solid #00C851", borderRadius: 4, padding: 6, width: 180, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
        {([["left", "Left"], ["center-x", "Centre"], ["right", "Right"], ["top", "Top"], ["center-y", "Middle"], ["bottom", "Bottom"]] as const).map(([alignment, label]) => <button key={alignment} type="button" aria-label={`Align ${label.toLowerCase()} to container`} disabled={pending} style={{ padding: 4, border: "1px solid #ddd", borderRadius: 3 }} onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); void commit(alignSpatialBox(view.box, view.container, alignment as SpatialAlignment)); }}>{label}</button>)}
      </div>
    </details>
    <label title="Snap to edges and centres; hold Alt to bypass" style={{ position: "absolute", left: 120, top: -28, width: "max-content", whiteSpace: "nowrap", pointerEvents: "auto", background: "white", borderRadius: 4, padding: "3px 4px", fontSize: 12, color: "#111", display: "flex", gap: 4 }} onClick={event => event.stopPropagation()}><input type="checkbox" aria-label="Snap to edges and centres" checked={snapping} disabled={pending} onChange={event => setSnapping(event.target.checked)} />Snap</label>
    {error ? <p role="alert" style={{ position: "absolute", top: "100%", background: "white", color: "#8b1e1e", fontSize: 12 }}>{error}</p> : null}
  </div>, view.parent);
}

"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { SocialLinkIcon } from "./social-link-icon";
import { socialDestination, type SocialLink } from "@/lib/create/social-links";
export type SocialLinkItem = SocialLink;
export type SocialRailStyle = { visible?: boolean; bgColor?: string; leftPct?: number; topPct?: number; iconSize?: number };
type Patch = (next: Record<string, unknown>) => void;

/** Contained in the site; one committed operation per completed gesture. */
export function EditableSocialRail({ links, style, editing, onPatch, onSelect, siteBase }: {
  links: SocialLinkItem[]; style?: SocialRailStyle; editing?: boolean; onPatch?: Patch;
  onSelect?: (inspect?: boolean) => void; siteBase?: string;
}) {
  const cancelDrag = useRef<(() => void) | null>(null), suppressClick = useRef(false);
  useEffect(() => () => cancelDrag.current?.(), []);
  const items = links.flatMap(link => {
    const href = socialDestination(String(link.href ?? ""));
    return editing || href ? [{ ...link, href: href ?? "" }] : [];
  });
  if (style?.visible === false || !items.length) return null;
  const leftPct = clamp(style?.leftPct ?? 0, 0, 92), topPct = clamp(style?.topPct ?? 12, 0, 85);
  const iconSize = clamp(style?.iconSize ?? 40, 20, 72);
  const minWidth = Math.max(44, iconSize) + 20;
  const estimatedHeight = 28 + items.length * (editing ? iconSize : Math.max(44, iconSize)) + Math.max(0, items.length - 1) * 12 + (editing ? 24 : siteBase ? 28 : 0);
  const railStyle: CSSProperties = {
    position: "absolute", left: `min(${leftPct}%, max(0px, calc(100% - ${minWidth}px)))`, top: `min(${topPct}%, max(0px, calc(100% - min(76%, ${estimatedHeight}px))))`, minWidth, zIndex: 30,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "14px 10px",
    borderRadius: 12, background: style?.bgColor?.trim() || "rgba(0,0,0,0.85)", color: "white",
    maxHeight: "76%", overflowY: "auto", touchAction: editing ? "none" : undefined,
    cursor: editing ? "grab" : undefined, boxShadow: editing ? "0 0 0 2px #FF5500" : "0 8px 24px rgba(0,0,0,0.25)",
  };
  function startDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!editing || !onPatch || event.button !== 0) return;
    const element = event.currentTarget, root = element.offsetParent as HTMLElement | null;
    if (!root) return;
    event.preventDefault(); event.stopPropagation(); cancelDrag.current?.(); suppressClick.current = false;
    element.focus({ preventScroll: true }); onSelect?.(false);
    const view = element.ownerDocument.defaultView!;
    const rect = root.getBoundingClientRect(), limits = railLimits(element), pointerId = event.pointerId, x = event.clientX, y = event.clientY;
    let left = leftPct, top = topPct, moved = false;
    element.setPointerCapture(pointerId);
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      moved ||= Math.hypot(e.clientX - x, e.clientY - y) > 3;
      if (!moved) return;
      left = Math.round(clamp(leftPct + (e.clientX - x) / Math.max(1, rect.width) * 100, 0, limits.left) * 10) / 10;
      top = Math.round(clamp(topPct + (e.clientY - y) / Math.max(1, rect.height) * 100, 0, limits.top) * 10) / 10;
      element.style.left = `${left}%`; element.style.top = `${top}%`;
    };
    const stop = (commit: boolean) => {
      view.removeEventListener("pointermove", move); view.removeEventListener("pointerup", up); view.removeEventListener("pointercancel", cancel); element.removeEventListener("lostpointercapture", cancel);
      if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
      cancelDrag.current = null; suppressClick.current = moved;
      element.style.left = String(railStyle.left); element.style.top = String(railStyle.top);
      if (commit && moved && (left !== leftPct || top !== topPct)) onPatch!({ socialRailLeftPct: left, socialRailTopPct: top });
    };
    const up = (e: PointerEvent) => { if (e.pointerId === pointerId) stop(true); };
    const cancel = (e: PointerEvent) => { if (e.pointerId === pointerId) stop(false); };
    cancelDrag.current = () => stop(false);
    view.addEventListener("pointermove", move); view.addEventListener("pointerup", up); view.addEventListener("pointercancel", cancel); element.addEventListener("lostpointercapture", cancel);
  }
  return <aside data-kebu-social-rail style={railStyle} aria-label={editing ? "Edit social links" : "Social links"}
    onPointerDown={startDrag} role={editing ? "button" : undefined} tabIndex={editing ? 0 : undefined}
    onClick={event => { if (editing) { event.stopPropagation(); if (!suppressClick.current || event.detail === 0) onSelect?.(true); suppressClick.current = false; } }}
    onKeyDown={event => {
      if (!editing) return;
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onSelect?.(true); }
      if (event.key === "Escape") cancelDrag.current?.();
      if (onPatch && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault(); event.stopPropagation(); const step = event.shiftKey ? 5 : 1, limits = railLimits(event.currentTarget);
        onPatch({ socialRailLeftPct: clamp(leftPct + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0), 0, limits.left), socialRailTopPct: clamp(topPct + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0), 0, limits.top) });
      }
    }}>
    {editing ? <span className="text-[8px] font-bold uppercase tracking-wider text-white/80">{items.some(link => !link.href) ? "Set links" : "Drag"}</span> : null}
    {items.map((link, index) => editing ? <span key={`${link.label}-${index}`} title={`${link.label}${link.href ? "" : ": Link not set"}`} aria-label={`${link.label}${link.href ? "" : ": Link not set"}`} style={{ opacity: link.href ? 1 : .6 }}><SocialLinkIcon link={link} size={iconSize} /></span>
      : <a key={`${link.label}-${index}`} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label} title={link.label} style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><SocialLinkIcon link={link} size={iconSize} /></a>)}
    {siteBase && !editing ? <a href={siteBase} className="mt-2 text-[9px] uppercase tracking-widest text-white/70 hover:text-white">Home</a> : null}
  </aside>;
}
function railLimits(element: HTMLElement) {
  const root = (element.offsetParent as HTMLElement | null)?.getBoundingClientRect(), rect = element.getBoundingClientRect();
  return { left: root ? Math.min(92, Math.max(0, (root.width - rect.width) / Math.max(1, root.width) * 100)) : 92, top: root ? Math.min(85, Math.max(0, (root.height - rect.height) / Math.max(1, root.height) * 100)) : 85 };
}
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min)); }
export function socialRailStyleFromProps(props: Record<string, unknown>): SocialRailStyle {
  return {
    visible: props.socialRailVisible !== false,
    bgColor: typeof props.socialRailBg === "string" ? props.socialRailBg : undefined,
    leftPct: typeof props.socialRailLeftPct === "number" ? props.socialRailLeftPct : undefined,
    topPct: typeof props.socialRailTopPct === "number" ? props.socialRailTopPct : undefined,
    iconSize: typeof props.socialRailIconSize === "number" ? props.socialRailIconSize : undefined,
  };
}

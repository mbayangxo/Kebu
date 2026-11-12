"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { nativeInteractionFrame, nativeMotionEnabled, nativeMotionFrames, type Device, type NativeInteraction, type NativeMotion } from "@/lib/creative-core";

/** Visible SSR content; animation owns separate wrappers, never authored transforms. */
export function KcdNativeMotion({ id, motion, interaction, device, runtime, children }: {
  id: string; motion?: NativeMotion; interaction?: NativeInteraction; device: Device; runtime: boolean; children: ReactNode;
}) {
  const entrance = useRef<HTMLDivElement>(null), effect = useRef<HTMLDivElement>(null);
  const playbackDevice = runtime ? undefined : device;
  useEffect(() => {
    const host = entrance.current, body = effect.current, view = host?.ownerDocument.defaultView;
    if (!host || !body || !view) return;
    const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = view.matchMedia("(hover: hover) and (pointer: fine)");
    let animation: Animation | undefined, hoverAnimation: Animation | undefined, observer: IntersectionObserver | undefined;
    let hovered = false, focused = false, played = false;
    const currentDevice = (): Device => runtime ? view.innerWidth <= 640 ? "mobile" : view.innerWidth <= 1024 ? "tablet" : "desktop" : playbackDevice!;
    let activeDevice = currentDevice();
    const cancel = () => { animation?.cancel(); animation = undefined; hoverAnimation?.cancel(); hoverAnimation = undefined; observer?.disconnect(); observer = undefined; host.dataset.kcdMotionState = "idle"; };
    const eligible = () => !reduced.matches && typeof host.animate === "function" && (!motion || nativeMotionEnabled(motion, activeDevice));
    const play = () => {
      if (!motion || !eligible() || !host.getClientRects().length) return;
      animation?.cancel(); observer?.disconnect(); observer = undefined;
      animation = host.animate(nativeMotionFrames(motion), { duration: motion.duration, delay: motion.delay, easing: motion.easing, fill: "none" });
      host.dataset.kcdMotionState = "playing";
      animation.onfinish = () => { host.dataset.kcdMotionState = "idle"; animation = undefined; };
    };
    const arm = () => {
      if (!runtime || !motion || !eligible() || played) return;
      if (motion.trigger === "load") { played = true; play(); }
      else if (typeof view.IntersectionObserver === "function") {
        observer = new view.IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { played = true; play(); } }, { threshold: 0.1 });
        observer.observe(host);
      }
    };
    const interact = () => {
      if (!runtime || !interaction || reduced.matches || typeof body.animate !== "function") { hoverAnimation?.cancel(); hoverAnimation = undefined; return; }
      if (!hovered && !focused) {
        if (hoverAnimation && hoverAnimation.playbackRate > 0) { const returning = hoverAnimation; returning.reverse(); returning.onfinish = () => { returning.cancel(); if (hoverAnimation === returning) hoverAnimation = undefined; }; }
        return;
      }
      if (hoverAnimation) { if (hoverAnimation.playbackRate < 0) { hoverAnimation.onfinish = null; hoverAnimation.reverse(); } return; }
      hoverAnimation = body.animate([{ opacity: 1, transform: "none" }, nativeInteractionFrame(interaction)], { duration: interaction.duration, easing: interaction.easing, fill: "forwards" });
    };
    // Listen at the canonical element so an enclosing link can receive keyboard focus.
    const target = host.closest<HTMLElement>("[data-kcd-node-id]") ?? host;
    const link = target.closest<HTMLAnchorElement>("a[href]");
    const interactionTarget = link ?? target;
    const enter = () => { if (fine.matches) { hovered = true; interact(); } };
    const leave = () => { hovered = false; interact(); };
    const focus = () => { focused = !!interactionTarget.ownerDocument.activeElement?.closest("a[href]") && interactionTarget.contains(interactionTarget.ownerDocument.activeElement); interact(); };
    const blur = (event: FocusEvent) => { if (!interactionTarget.contains(event.relatedTarget as Node | null)) { focused = false; interact(); } };
    const preference = () => { cancel(); hovered = false; focused = false; if (!reduced.matches) { arm(); focus(); } };
    const resize = () => { const next = currentDevice(); if (next !== activeDevice) { activeDevice = next; cancel(); played = false; arm(); } };
    host.addEventListener("kcd-motion-replay", play);
    interactionTarget.addEventListener("pointerenter", enter); interactionTarget.addEventListener("pointerleave", leave);
    interactionTarget.addEventListener("focusin", focus); interactionTarget.addEventListener("focusout", blur);
    reduced.addEventListener("change", preference); fine.addEventListener("change", preference); view.addEventListener("resize", resize);
    host.dataset.kcdMotionReady = "true";
    arm();
    return () => {
      delete host.dataset.kcdMotionReady;
      cancel(); host.removeEventListener("kcd-motion-replay", play);
      interactionTarget.removeEventListener("pointerenter", enter); interactionTarget.removeEventListener("pointerleave", leave);
      interactionTarget.removeEventListener("focusin", focus); interactionTarget.removeEventListener("focusout", blur);
      reduced.removeEventListener("change", preference); fine.removeEventListener("change", preference); view.removeEventListener("resize", resize);
    };
  }, [id, motion, interaction, playbackDevice, runtime]);
  return <div ref={entrance} data-kcd-motion-for={id} data-kcd-motion-state="idle" style={{ width: "100%", height: "100%" }}><div ref={effect} data-kcd-interaction-for={id} style={{ width: "100%", height: "100%" }}>{children}</div></div>;
}

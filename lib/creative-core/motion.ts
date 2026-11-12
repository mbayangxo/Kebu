import { z } from "zod";
import type { Device, KcdNode } from "./model";

export const motionEasing = z.enum(["linear", "ease", "ease-in", "ease-out", "ease-in-out"]);
const enabledOverride = z.strictObject({ enabled: z.boolean() });
export const nativeMotionSchema = z.strictObject({
  version: z.literal(1), preset: z.enum(["fade", "rise", "slide-left", "slide-right", "zoom"]),
  trigger: z.enum(["load", "enter"]), duration: z.number().int().min(50).max(5000),
  delay: z.number().int().min(0).max(5000), distance: z.number().finite().min(0).max(200),
  easing: motionEasing, enabled: z.boolean(),
  devices: z.strictObject({ tablet: enabledOverride.optional(), mobile: enabledOverride.optional() }).optional(),
});
export const nativeInteractionSchema = z.strictObject({
  version: z.literal(1), effect: z.enum(["lift", "grow", "dim"]), duration: z.number().int().min(50).max(1000),
  easing: motionEasing,
});
export type NativeMotion = z.infer<typeof nativeMotionSchema>;
export type NativeInteraction = z.infer<typeof nativeInteractionSchema>;
export const defaultNativeMotion: NativeMotion = { version: 1, preset: "fade", trigger: "enter", duration: 500, delay: 0, distance: 24, easing: "ease-out", enabled: true };
export function nativeMotionEnabled(motion: NativeMotion, device: Device): boolean {
  return device === "desktop" ? motion.enabled : motion.devices?.[device]?.enabled ?? motion.enabled;
}
/** Renderer-agnostic frames; no DOM, libraries, scripts or arbitrary CSS payloads. */
export function nativeMotionFrames(motion: NativeMotion) {
  const start = motion.preset === "rise" ? `translateY(${motion.distance}px)` : motion.preset === "slide-left" ? `translateX(${motion.distance}px)` : motion.preset === "slide-right" ? `translateX(${-motion.distance}px)` : motion.preset === "zoom" ? "scale(0.9)" : "none";
  return [{ opacity: 0, transform: start }, { opacity: 1, transform: "none" }];
}
export function nativeInteractionFrame(interaction: NativeInteraction) {
  return { opacity: interaction.effect === "dim" ? .75 : 1, transform: interaction.effect === "lift" ? "translateY(-4px)" : interaction.effect === "grow" ? "scale(1.04)" : "none" };
}
export function validateNativeMotion(node: KcdNode): { ok: true; props: Record<string, unknown> } | { ok: false; error: string } {
  for (const [name, schema] of [["motion", nativeMotionSchema], ["interaction", nativeInteractionSchema]] as const) {
    if (node[name] === undefined) continue;
    const parsed = schema.safeParse(node[name]);
    if (!parsed.success) {
      const key = String(parsed.error.issues[0]?.path[0] ?? "");
      const details: Record<string, string> = { duration: `duration must be a whole number from 50 to ${name === "motion" ? 5000 : 1000} milliseconds.`, delay: "delay must be a whole number from 0 to 5000 milliseconds.", distance: "distance must be from 0 to 200 pixels.", version: "this saved effect version is unsupported.", devices: "choose valid tablet and phone animation settings." };
      return { ok: false, error: `Invalid ${name}: ${details[key] ?? "choose a supported effect and settings."}` };
    }
  }
  return { ok: true, props: node.props };
}

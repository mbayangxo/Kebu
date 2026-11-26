import { z } from "zod";
import type { PropertyDescriptor } from "./registry";

/** Bounded built-in styles only: no arbitrary CSS, external masks or shader scripts. */
export const visualEffectProps = {
  mask: z.enum(["none", "ellipse", "diamond", "arch"]).optional(),
  opacity: z.number().finite().min(0.1).max(1).optional(),
  blur: z.number().finite().min(0).max(20).optional(),
  brightness: z.number().finite().min(0.25).max(2).optional(),
  saturation: z.number().finite().min(0).max(2).optional(),
  shadow: z.enum(["none", "soft", "strong"]).optional(),
};
export const visualEffectProperties: readonly PropertyDescriptor[] = [
  { key: "mask", label: "Mask shape", control: "select", capability: "mask", overridable: true, group: "style", options: [
    { value: "none", label: "None" }, { value: "ellipse", label: "Ellipse" }, { value: "diamond", label: "Diamond" }, { value: "arch", label: "Arch" },
  ] },
  ...([["opacity", "Opacity (0.1–1)"], ["blur", "Blur (px)"], ["brightness", "Brightness (0.25–2)"], ["saturation", "Saturation (0–2)"]] as const).map(([key, label]) => ({ key, label, control: "number" as const, capability: "effects" as const, overridable: true, group: "style" as const })),
  { key: "shadow", label: "Shadow", control: "select", capability: "effects", overridable: true, group: "style", options: [{ value: "none", label: "None" }, { value: "soft", label: "Soft" }, { value: "strong", label: "Strong" }] },
];
export const visualEffectKeys = Object.keys(visualEffectProps);
/** Values reach here only after the native strict schema has validated the whole element. */
export function visualEffectStyle(props: Record<string, unknown>) {
  return {
    clipPath: props.mask === "ellipse" ? "ellipse(50% 50% at 50% 50%)" : props.mask === "diamond" ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" : props.mask === "arch" ? "inset(0 round 50% 50% 0 0)" : "none",
    opacity: Number(props.opacity ?? 1),
    filter: `blur(${props.blur ?? 0}px) brightness(${props.brightness ?? 1}) saturate(${props.saturation ?? 1})`,
    boxShadow: props.shadow === "soft" ? "0 4px 16px #00000026" : props.shadow === "strong" ? "0 8px 24px #0000004d" : "none",
  };
}

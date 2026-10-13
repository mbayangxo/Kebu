import { z } from "zod";
import type { KcdDocument, NodeId } from "./model";
import type { PropertyDescriptor } from "./registry";

export const constraintSchema = z.strictObject({ mode: z.enum(["start", "center", "end", "stretch", "proportional"]), reference: z.number().finite().min(16).max(10000) });
export type SpatialConstraint = z.infer<typeof constraintSchema>;
export const spatialProps = {
  position: z.enum(["flow", "absolute"]).optional(),
  x: z.number().finite().min(-10000).max(10000).optional(),
  y: z.number().finite().min(-10000).max(10000).optional(),
  elementWidth: z.number().finite().min(16).max(10000).optional(),
  elementHeight: z.number().finite().min(16).max(10000).optional(),
  layer: z.number().int().min(0).max(1000).optional(),
  constraintX: constraintSchema.optional(),
  constraintY: constraintSchema.optional(),
  rotation: z.number().finite().min(-360).max(360).optional(),
  scaleX: z.number().finite().min(0.1).max(10).optional(),
  scaleY: z.number().finite().min(0.1).max(10).optional(),
};
export const canvasHeightSchema = z.number().finite().min(16).max(10000).optional();
export const spatialProperties: readonly PropertyDescriptor[] = [
  { key: "position", label: "Position", control: "select", capability: "layout.positioned", overridable: true, group: "layout", options: [{ value: "flow", label: "Flow with content" }, { value: "absolute", label: "Free position" }] },
  ...([["x", "Horizontal position (px)"], ["y", "Vertical position (px)"], ["elementWidth", "Element width (px)"], ["elementHeight", "Element height (px)"], ["layer", "Layer depth"]] as const).map(([key, label]) => ({ key, label, control: "number" as const, capability: "layout.positioned" as const, overridable: true, group: "layout" as const })),
  ...([["constraintX", "Horizontal constraint"], ["constraintY", "Vertical constraint"]] as const).map(([key, label]) => ({ key, label, control: "select" as const, capability: "layout.positioned" as const, overridable: true, group: "layout" as const, options: [
    { value: "start", label: key === "constraintX" ? "Left" : "Top" }, { value: "center", label: "Centre" }, { value: "end", label: key === "constraintX" ? "Right" : "Bottom" }, { value: "stretch", label: "Both edges (stretch)" }, { value: "proportional", label: "Proportional" },
  ] })),
  ...([["rotation", "Rotation (degrees)"], ["scaleX", "Horizontal scale"], ["scaleY", "Vertical scale"]] as const).map(([key, label]) => ({ key, label, control: "number" as const, capability: "layout.positioned" as const, overridable: true, group: "style" as const })),
];
export const canvasHeightProperty: PropertyDescriptor = { key: "canvasHeight", label: "Canvas minimum height (px)", control: "number", capability: "layout.positioned", overridable: true, group: "layout" };

/** Locks are editor guards, including all descendants of a locked container. */
export function isSpatialLocked(doc: KcdDocument, id: NodeId): boolean {
  const seen = new Set<NodeId>();
  let node = doc.nodes[id];
  while (node && !seen.has(node.id)) {
    if (node.locked) return true;
    seen.add(node.id);
    if (!node.parentId) return false;
    node = doc.nodes[node.parentId];
  }
  return Boolean(node); // malformed cycles fail closed
}

export interface SpatialBox { x: number; y: number; elementWidth: number; elementHeight: number }
/** Resolve constraints in layout units, independently from visual transforms. */
export function constrainedAxis(position: number, size: number, container: number, constraint?: SpatialConstraint): { position: number; size: number } {
  if (![position, size, container].every(Number.isFinite) || (constraint && !constraintSchema.safeParse(constraint).success)) throw new Error("Invalid constraint geometry.");
  const delta = container - (constraint?.reference ?? container);
  switch (constraint?.mode) {
    case "center": return { position: position + delta / 2, size };
    case "end": return { position: position + delta, size };
    case "stretch": return { position, size: Math.max(16, Math.min(10000, size + delta)) };
    case "proportional": return { position: position * container / constraint.reference, size: Math.max(16, Math.min(10000, size * container / constraint.reference)) };
    default: return { position, size };
  }
}

/** CSS uses percentages of the containing canvas, so constraints work before hydration. */
export function constraintAxisCss(position: number, size: number | undefined, constraint?: SpatialConstraint): { position: string; size: string } {
  const fixed = { position: `${position}px`, size: size === undefined ? "auto" : `${size}px` };
  if (!constraint || constraint.mode === "start") return fixed;
  if (!constraintSchema.safeParse(constraint).success || !Number.isFinite(position) || (size !== undefined && !Number.isFinite(size))) throw new Error("Invalid constraint geometry.");
  const clamped = (value: string) => `clamp(16px, ${value}, 10000px)`;
  switch (constraint.mode) {
    case "center": return { ...fixed, position: `calc(50% + ${position - constraint.reference / 2}px)` };
    case "end": return { ...fixed, position: `calc(100% + ${position - constraint.reference}px)` };
    case "stretch": return { position: fixed.position, size: size === undefined ? "auto" : clamped(`calc(100% + ${size - constraint.reference}px)`) };
    case "proportional": return { position: `${100 * position / constraint.reference}%`, size: size === undefined ? "auto" : clamped(`${100 * size / constraint.reference}%`) };
  }
}
export function gestureBox(start: SpatialBox, dx: number, dy: number, resize: boolean): SpatialBox {
  if (![start.x, start.y, start.elementWidth, start.elementHeight, dx, dy].every(Number.isFinite)) throw new Error("Invalid gesture coordinates.");
  const coordinate = (n: number) => Math.round(Math.max(-10000, Math.min(10000, n)));
  const size = (n: number) => Math.round(Math.max(16, Math.min(10000, n)));
  return resize ? { ...start, elementWidth: size(start.elementWidth + dx), elementHeight: size(start.elementHeight + dy) }
    : { ...start, x: coordinate(start.x + dx), y: coordinate(start.y + dy) };
}

export type SpatialAlignment = "left" | "center-x" | "right" | "top" | "center-y" | "bottom";
export interface SpatialTargets { x: readonly number[]; y: readonly number[] }
export interface SpatialGuide { axis: "x" | "y"; position: number }
const boundedCoordinate = (value: number) => Math.round(Math.max(-10000, Math.min(10000, value)));
export function alignSpatialBox(box: SpatialBox, container: { width: number; height: number }, alignment: SpatialAlignment): SpatialBox {
  if (![box.x, box.y, box.elementWidth, box.elementHeight, container.width, container.height].every(Number.isFinite)) throw new Error("Invalid alignment geometry.");
  switch (alignment) {
    case "left": return { ...box, x: 0 };
    case "center-x": return { ...box, x: boundedCoordinate((container.width - box.elementWidth) / 2) };
    case "right": return { ...box, x: boundedCoordinate(container.width - box.elementWidth) };
    case "top": return { ...box, y: 0 };
    case "center-y": return { ...box, y: boundedCoordinate((container.height - box.elementHeight) / 2) };
    case "bottom": return { ...box, y: boundedCoordinate(container.height - box.elementHeight) };
    default: throw new Error("Unsupported alignment.");
  }
}

/** Nearest valid snap wins; sorted targets make equal-distance ties stable across reloads. */
export function snapSpatialBox(box: SpatialBox, targets: SpatialTargets, resize: boolean, tolerance = { x: 6, y: 6 }): { box: SpatialBox; guides: SpatialGuide[] } {
  if (![box.x, box.y, box.elementWidth, box.elementHeight, tolerance.x, tolerance.y].every(Number.isFinite) || tolerance.x < 0 || tolerance.y < 0) throw new Error("Invalid snapping geometry.");
  const next = { ...box }, guides: SpatialGuide[] = [];
  for (const axis of ["x", "y"] as const) {
    const size = axis === "x" ? "elementWidth" : "elementHeight";
    const anchors = resize ? [box[axis] + box[size]] : [box[axis], box[axis] + box[size] / 2, box[axis] + box[size]];
    let best: { distance: number; delta: number; target: number } | undefined;
    for (const target of [...new Set(targets[axis].filter(Number.isFinite))].sort((a, b) => a - b)) for (const anchor of anchors) {
      const delta = target - anchor, distance = Math.abs(delta);
      const result = resize ? box[size] + delta : box[axis] + delta;
      if (distance > tolerance[axis] || result < (resize ? 16 : -10000) || result > 10000 || (best && distance >= best.distance)) continue;
      best = { distance, delta, target };
    }
    if (best) {
      if (resize) next[size] = Math.round(box[size] + best.delta); else next[axis] = Math.round(box[axis] + best.delta);
      guides.push({ axis, position: best.target });
    }
  }
  return { box: next, guides };
}

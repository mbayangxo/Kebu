import type { CanvasLayer } from "@/lib/studio/canvas-document";

export const STUDIO_BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "soft-light",
] as const;

export type StudioBlendMode = (typeof STUDIO_BLEND_MODES)[number];

export type StudioFillLike = Pick<
  CanvasLayer,
  "fill" | "fillType" | "gradientFrom" | "gradientTo" | "gradientAngle"
>;

export function studioLayerFillCss(layer: StudioFillLike): string {
  if (layer.fillType !== "linear_gradient") return layer.fill ?? "#E05A2B";
  const from = layer.gradientFrom ?? layer.fill ?? "#FF6A00";
  const to = layer.gradientTo ?? "#FF1F1F";
  const angle = Number.isFinite(layer.gradientAngle) ? layer.gradientAngle ?? 135 : 135;
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}

export function studioCanvasCompositeOperation(
  mode: StudioBlendMode | null | undefined,
): GlobalCompositeOperation {
  if (!mode || mode === "normal") return "source-over";
  return mode as GlobalCompositeOperation;
}

export function applyStudioCanvasFill(
  ctx: CanvasRenderingContext2D,
  layer: StudioFillLike,
  bounds: { x: number; y: number; width: number; height: number },
): void {
  if (layer.fillType !== "linear_gradient") {
    ctx.fillStyle = layer.fill ?? "#E05A2B";
    return;
  }

  const angle = ((layer.gradientAngle ?? 135) * Math.PI) / 180;
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const radius = Math.max(1, Math.sqrt(bounds.width ** 2 + bounds.height ** 2) / 2);
  const dx = Math.cos(angle) * radius;
  const dy = Math.sin(angle) * radius;
  const gradient = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  gradient.addColorStop(0, layer.gradientFrom ?? layer.fill ?? "#FF6A00");
  gradient.addColorStop(1, layer.gradientTo ?? "#FF1F1F");
  ctx.fillStyle = gradient;
}

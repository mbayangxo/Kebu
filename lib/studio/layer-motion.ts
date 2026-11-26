import type { CanvasLayer } from "@/lib/studio/canvas-document";

export type StudioLayerMotion = {
  opacityMultiplier: number;
  translateX: number;
  translateY: number;
  scale: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value: number) {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

export function layerMotionAtTime(layer: CanvasLayer, localTimeMs: number): StudioLayerMotion {
  const preset = layer.animationPreset ?? "none";
  if (preset === "none") {
    return { opacityMultiplier: 1, translateX: 0, translateY: 0, scale: 1 };
  }

  const delay = layer.animationDelayMs ?? 0;
  const duration = Math.max(100, layer.animationDurationMs ?? 600);
  const raw = (localTimeMs - delay) / duration;
  const p = easeOutCubic(raw);

  if (preset === "fade") {
    return { opacityMultiplier: p, translateX: 0, translateY: 0, scale: 1 };
  }
  if (preset === "fade_up") {
    return { opacityMultiplier: p, translateX: 0, translateY: (1 - p) * 36, scale: 1 };
  }
  if (preset === "slide_left") {
    return { opacityMultiplier: p, translateX: (1 - p) * -56, translateY: 0, scale: 1 };
  }
  if (preset === "slide_right") {
    return { opacityMultiplier: p, translateX: (1 - p) * 56, translateY: 0, scale: 1 };
  }
  if (preset === "scale") {
    return { opacityMultiplier: p, translateX: 0, translateY: 0, scale: 0.82 + p * 0.18 };
  }

  // pop: slightly overshoots around 75% then settles to 1.
  const overshoot = raw <= 0
    ? 0.78
    : raw >= 1
      ? 1
      : raw < 0.75
        ? 0.78 + (raw / 0.75) * 0.30
        : 1.08 - ((raw - 0.75) / 0.25) * 0.08;

  return {
    opacityMultiplier: clamp01(raw * 2),
    translateX: 0,
    translateY: 0,
    scale: overshoot,
  };
}

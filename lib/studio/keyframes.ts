/**
 * Studio V2 — keyframes, transforms, transitions, audio-reactive animation.
 */
import {
  everyNthBeat,
  newCompositionId,
  studioCompositionSchema,
  type CompositionClip,
  type StudioComposition,
} from "@/lib/studio/composition";
import { energyAtTimeMs } from "@/lib/studio/music-analysis";

export type KeyframeProperty = "opacity" | "x" | "y" | "scale" | "volume" | "rotation";

function ease(t: number, easing: string): number {
  const u = Math.max(0, Math.min(1, t));
  switch (easing) {
    case "ease_in":
      return u * u;
    case "ease_out":
      return 1 - (1 - u) * (1 - u);
    case "ease_in_out":
      return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    default:
      return u;
  }
}

export function interpolateKeyframes(
  keyframes: StudioComposition["keyframes"],
  clipId: string,
  property: KeyframeProperty,
  localMs: number,
  fallback: number,
): number {
  const pts = keyframes
    .filter((k) => k.clipId === clipId && k.property === property)
    .sort((a, b) => a.timeMs - b.timeMs);
  if (!pts.length) return fallback;
  if (localMs <= pts[0]!.timeMs) return pts[0]!.value;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (localMs <= b.timeMs) {
      const span = Math.max(1, b.timeMs - a.timeMs);
      const t = ease((localMs - a.timeMs) / span, b.easing);
      return a.value + (b.value - a.value) * t;
    }
  }
  return pts[pts.length - 1]!.value;
}

export type ClipTransformAtTime = {
  opacity: number;
  volume: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

/** Resolve clip transform at absolute time (base + V2 keyframes). */
export function clipTransformAtTime(
  c: StudioComposition,
  clip: CompositionClip,
  timeMs: number,
): ClipTransformAtTime {
  if (timeMs < clip.startMs || timeMs >= clip.startMs + clip.durationMs) {
    return { opacity: 0, volume: 0, x: clip.x, y: clip.y, scale: clip.scale, rotation: clip.rotation };
  }
  const local = timeMs - clip.startMs;
  let opacity = interpolateKeyframes(c.keyframes, clip.id, "opacity", local, clip.opacity);
  let volume = interpolateKeyframes(c.keyframes, clip.id, "volume", local, clip.volume);
  if (clip.fadeInMs > 0 && local < clip.fadeInMs) {
    const f = local / clip.fadeInMs;
    opacity *= f;
    volume *= f;
  }
  if (clip.fadeOutMs > 0 && local > clip.durationMs - clip.fadeOutMs) {
    const f = (clip.startMs + clip.durationMs - timeMs) / clip.fadeOutMs;
    opacity *= f;
    volume *= f;
  }
  return {
    opacity: Math.max(0, Math.min(1, opacity)),
    volume: Math.max(0, Math.min(2, volume)),
    x: interpolateKeyframes(c.keyframes, clip.id, "x", local, clip.x),
    y: interpolateKeyframes(c.keyframes, clip.id, "y", local, clip.y),
    scale: interpolateKeyframes(c.keyframes, clip.id, "scale", local, clip.scale),
    rotation: interpolateKeyframes(c.keyframes, clip.id, "rotation", local, clip.rotation),
  };
}

export function upsertKeyframe(
  c: StudioComposition,
  opts: {
    clipId: string;
    property: KeyframeProperty;
    timeMs: number;
    value: number;
    easing?: "linear" | "ease_in" | "ease_out" | "ease_in_out";
  },
): StudioComposition | { error: string } {
  if (!c.clips.some((cl) => cl.id === opts.clipId)) return { error: "Clip not found." };
  const timeMs = Math.max(0, Math.round(opts.timeMs));
  const existing = c.keyframes.findIndex(
    (k) => k.clipId === opts.clipId && k.property === opts.property && k.timeMs === timeMs,
  );
  const row = {
    id: existing >= 0 ? c.keyframes[existing]!.id : newCompositionId("kf"),
    clipId: opts.clipId,
    property: opts.property,
    timeMs,
    value: opts.value,
    easing: opts.easing ?? ("linear" as const),
  };
  const keyframes =
    existing >= 0
      ? c.keyframes.map((k, i) => (i === existing ? row : k))
      : [...c.keyframes, row];
  return studioCompositionSchema.parse({ ...c, keyframes: keyframes.slice(0, 2000) });
}

export function addTransition(
  c: StudioComposition,
  opts: {
    fromClipId: string;
    toClipId: string;
    kind?: "cut" | "fade" | "dissolve" | "slide";
    durationMs?: number;
  },
): StudioComposition | { error: string } {
  if (!c.clips.some((cl) => cl.id === opts.fromClipId) || !c.clips.some((cl) => cl.id === opts.toClipId)) {
    return { error: "Clips not found." };
  }
  const row = {
    id: newCompositionId("tx"),
    fromClipId: opts.fromClipId,
    toClipId: opts.toClipId,
    kind: opts.kind ?? ("fade" as const),
    durationMs: Math.max(0, Math.min(5000, opts.durationMs ?? 400)),
  };
  const without = c.transitions.filter(
    (t) => !(t.fromClipId === opts.fromClipId && t.toClipId === opts.toClipId),
  );
  return studioCompositionSchema.parse({
    ...c,
    transitions: [...without, row].slice(0, 200),
  });
}

/** Transition opacity blend factor for toClip when overlapping fromClip. */
export function transitionOpacityBoost(
  c: StudioComposition,
  toClipId: string,
  timeMs: number,
): number {
  const tx = c.transitions.find((t) => t.toClipId === toClipId && t.kind !== "cut");
  if (!tx || tx.durationMs <= 0) return 1;
  const from = c.clips.find((cl) => cl.id === tx.fromClipId);
  const to = c.clips.find((cl) => cl.id === toClipId);
  if (!from || !to) return 1;
  const overlapStart = to.startMs;
  const local = timeMs - overlapStart;
  if (local < 0 || local > tx.durationMs) return 1;
  return ease(local / tx.durationMs, "ease_in_out");
}

export type AudioReactivePreset = "pulse_scale" | "beat_flash" | "energy_opacity";

/**
 * Bake Audio Reactive animation onto a clip as keyframes (V2).
 * Uses music energy / beats already on the composition.
 */
export function applyAudioReactivePreset(
  c: StudioComposition,
  clipId: string,
  preset: AudioReactivePreset,
): StudioComposition | { error: string } {
  const clip = c.clips.find((cl) => cl.id === clipId);
  if (!clip) return { error: "Clip not found." };
  const music = c.music;
  if (!music?.beatsMs?.length && !music?.energyMs?.length) {
    return { error: "Add a soundtrack with beats first." };
  }

  let next = {
    ...c,
    keyframes: c.keyframes.filter((k) => k.clipId !== clipId),
  };

  const end = clip.durationMs;
  if (preset === "pulse_scale" || preset === "beat_flash") {
    const beats = (music.beatsMs ?? []).filter((b) => b >= 0 && b <= end);
    for (const b of beats) {
      const local = b;
      if (preset === "pulse_scale") {
        const up = upsertKeyframe(next, {
          clipId,
          property: "scale",
          timeMs: local,
          value: 1.08,
          easing: "ease_out",
        });
        if ("error" in up) continue;
        next = up;
        const down = upsertKeyframe(next, {
          clipId,
          property: "scale",
          timeMs: Math.min(end, local + 120),
          value: 1,
          easing: "ease_in",
        });
        if (!("error" in down)) next = down;
      } else {
        const flash = upsertKeyframe(next, {
          clipId,
          property: "opacity",
          timeMs: local,
          value: 1,
          easing: "linear",
        });
        if ("error" in flash) continue;
        next = flash;
        const dim = upsertKeyframe(next, {
          clipId,
          property: "opacity",
          timeMs: Math.min(end, local + 80),
          value: 0.75,
          easing: "ease_out",
        });
        if (!("error" in dim)) next = dim;
      }
    }
  } else if (preset === "energy_opacity") {
    const times = music.energyMs?.length
      ? music.energyMs
      : everyNthBeat(music.beatsMs ?? [], 1);
    for (const t of times) {
      if (t > end) break;
      const e =
        music.energyMs?.length && music.energyValues?.length
          ? energyAtTimeMs(music.energyMs, music.energyValues, t)
          : 0.7;
      const row = upsertKeyframe(next, {
        clipId,
        property: "opacity",
        timeMs: t,
        value: 0.45 + e * 0.55,
        easing: "linear",
      });
      if (!("error" in row)) next = row;
    }
  }

  return studioCompositionSchema.parse(next);
}

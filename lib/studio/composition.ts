/**
 * Kebu Studio composition engine contract (video / audio / captions).
 *
 * Architecture law: Quick Edit · Smart Edit · Full Timeline all mutate THIS model.
 * Do not invent a second “toy” timeline format.
 *
 * Live today: page-based design timeline + soundtrack beats (see timeline.ts / music-analysis).
 * Multi-track composition fields are reserved for V1+ slices — parse-tolerant, not fake UI.
 */

import { z } from "zod";

export const STUDIO_EDIT_MODES = ["quick_edit", "smart_edit", "full_timeline"] as const;
export type StudioEditMode = (typeof STUDIO_EDIT_MODES)[number];

export const COMPOSITION_TRACK_KINDS = [
  "video",
  "audio",
  "caption",
  "overlay",
  "music",
] as const;
export type CompositionTrackKind = (typeof COMPOSITION_TRACK_KINDS)[number];

export const musicSectionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.enum(["intro", "verse", "chorus", "bridge", "outro", "break", "other"]),
  startMs: z.number().int().min(0).max(600_000),
  endMs: z.number().int().min(0).max(600_000),
});

export type MusicSection = z.infer<typeof musicSectionSchema>;

/** Extended music analysis — beats live; sections reserved until detection ships. */
export const compositionMusicAnalysisSchema = z.object({
  bpm: z.number().min(40).max(220).nullable(),
  beatsMs: z.array(z.number().int().min(0).max(600_000)).max(2000).default([]),
  downbeatsMs: z.array(z.number().int().min(0).max(600_000)).max(500).default([]),
  sections: z.array(musicSectionSchema).max(64).default([]),
  confidence: z.number().min(0).max(1).optional().nullable(),
  method: z.string().trim().max(40).optional().nullable(),
});

export const compositionClipSchema = z.object({
  id: z.string().trim().min(1).max(40),
  trackId: z.string().trim().min(1).max(40),
  name: z.string().trim().max(120).default("Clip"),
  /** Source media URL (video/audio/image) */
  sourceUrl: z.union([z.literal(""), z.string().trim().url().max(500)]).optional(),
  /** Timeline placement */
  startMs: z.number().int().min(0).max(600_000),
  durationMs: z.number().int().min(50).max(600_000),
  /** Source in-point */
  sourceInMs: z.number().int().min(0).max(600_000).default(0),
  speed: z.number().min(0.1).max(8).default(1),
  volume: z.number().min(0).max(2).default(1),
  opacity: z.number().min(0).max(1).default(1),
  /** Optional link to storyboard scene */
  sceneId: z.string().trim().max(40).nullable().optional(),
});

export type CompositionClip = z.infer<typeof compositionClipSchema>;

export const compositionTrackSchema = z.object({
  id: z.string().trim().min(1).max(40),
  kind: z.enum(COMPOSITION_TRACK_KINDS),
  name: z.string().trim().max(80).default("Track"),
  muted: z.boolean().default(false),
  locked: z.boolean().default(false),
  order: z.number().int().min(0).max(64).default(0),
});

export type CompositionTrack = z.infer<typeof compositionTrackSchema>;

export const storyboardSceneSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().max(120),
  intent: z.string().trim().max(500).optional().nullable(),
  durationMs: z.number().int().min(200).max(120_000).default(3000),
  order: z.number().int().min(0).max(200).default(0),
});

export type StoryboardScene = z.infer<typeof storyboardSceneSchema>;

export const keyframeSchema = z.object({
  id: z.string().trim().min(1).max(40),
  clipId: z.string().trim().min(1).max(40),
  property: z.enum(["opacity", "x", "y", "scale", "volume", "rotation"]),
  timeMs: z.number().int().min(0).max(600_000),
  value: z.number(),
  easing: z.enum(["linear", "ease_in", "ease_out", "ease_in_out"]).default("linear"),
});

export const transitionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  fromClipId: z.string().trim().min(1).max(40),
  toClipId: z.string().trim().min(1).max(40),
  kind: z.enum(["cut", "fade", "dissolve", "slide"]).default("cut"),
  durationMs: z.number().int().min(0).max(5000).default(0),
});

export const compositionAssetSchema = z.object({
  id: z.string().trim().min(1).max(40),
  kind: z.enum(["video", "audio", "image"]),
  url: z.string().trim().url().max(500),
  fileName: z.string().trim().max(200).optional().nullable(),
  durationMs: z.number().int().min(0).max(600_000).optional().nullable(),
  width: z.number().int().min(0).max(8192).optional().nullable(),
  height: z.number().int().min(0).max(8192).optional().nullable(),
});

export type CompositionAsset = z.infer<typeof compositionAssetSchema>;

/**
 * Full composition document (Phase 1+).
 */
export const studioCompositionSchema = z.object({
  version: z.literal(1),
  editMode: z.enum(STUDIO_EDIT_MODES).default("smart_edit"),
  width: z.number().int().min(200).max(4096),
  height: z.number().int().min(200).max(4096),
  frameRate: z.number().min(8).max(60).default(30),
  tracks: z.array(compositionTrackSchema).max(32).default([]),
  clips: z.array(compositionClipSchema).max(200).default([]),
  keyframes: z.array(keyframeSchema).max(2000).default([]),
  transitions: z.array(transitionSchema).max(200).default([]),
  storyboard: z.array(storyboardSceneSchema).max(100).default([]),
  assets: z.array(compositionAssetSchema).max(100).default([]),
  music: compositionMusicAnalysisSchema.nullable().optional(),
  markers: z
    .array(
      z.object({
        id: z.string().max(40),
        timeMs: z.number().int().min(0).max(600_000),
        label: z.string().max(80).optional(),
      }),
    )
    .max(200)
    .default([]),
});

export type StudioComposition = z.infer<typeof studioCompositionSchema>;

export function newCompositionId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function parseStudioComposition(raw: unknown): StudioComposition {
  const parsed = studioCompositionSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  /* Tolerate missing assets from older drafts */
  if (raw && typeof raw === "object" && (raw as { version?: number }).version === 1) {
    const withAssets = { ...(raw as object), assets: (raw as { assets?: unknown }).assets ?? [] };
    const again = studioCompositionSchema.safeParse(withAssets);
    if (again.success) return again.data;
  }
  throw new Error("Invalid video composition.");
}

/** Empty composition sized for a common social format — Phase 1: V1, V2, A1, Music. */
export function emptyStudioComposition(opts: {
  width: number;
  height: number;
  editMode?: StudioEditMode;
}): StudioComposition {
  const tracks = [
    {
      id: newCompositionId("tr"),
      kind: "video" as const,
      name: "V1",
      muted: false,
      locked: false,
      order: 0,
    },
    {
      id: newCompositionId("tr"),
      kind: "video" as const,
      name: "V2",
      muted: false,
      locked: false,
      order: 1,
    },
    {
      id: newCompositionId("tr"),
      kind: "audio" as const,
      name: "A1",
      muted: false,
      locked: false,
      order: 2,
    },
    {
      id: newCompositionId("tr"),
      kind: "music" as const,
      name: "Music",
      muted: false,
      locked: false,
      order: 3,
    },
  ];
  return studioCompositionSchema.parse({
    version: 1,
    editMode: opts.editMode ?? "full_timeline",
    width: opts.width,
    height: opts.height,
    frameRate: 30,
    tracks,
    clips: [],
    keyframes: [],
    transitions: [],
    storyboard: [],
    assets: [],
    music: null,
    markers: [],
  });
}

export function compositionDurationMs(c: StudioComposition): number {
  if (!c.clips.length) return 5000;
  return Math.max(1000, ...c.clips.map((cl) => cl.startMs + cl.durationMs));
}

export function addAssetToComposition(
  c: StudioComposition,
  asset: CompositionAsset,
): StudioComposition {
  if (c.assets.some((a) => a.id === asset.id || a.url === asset.url)) return c;
  return { ...c, assets: [...c.assets, asset].slice(0, 100) };
}

/** Place media on the first matching unlocked track at end (or playhead). */
export function addClipFromAsset(
  c: StudioComposition,
  assetId: string,
  opts?: { trackId?: string; atMs?: number },
): StudioComposition | { error: string } {
  const asset = c.assets.find((a) => a.id === assetId);
  if (!asset) return { error: "Asset not in project." };

  const kindPrefer =
    asset.kind === "video" || asset.kind === "image"
      ? ("video" as const)
      : asset.kind === "audio"
        ? ("audio" as const)
        : ("music" as const);

  const track =
    (opts?.trackId ? c.tracks.find((t) => t.id === opts.trackId) : null) ??
    c.tracks
      .filter((t) => !t.locked && (t.kind === kindPrefer || (kindPrefer === "audio" && t.kind === "music")))
      .sort((a, b) => a.order - b.order)[0];

  if (!track) return { error: "No unlocked track for this media." };

  const onTrack = c.clips.filter((cl) => cl.trackId === track.id);
  const end = onTrack.reduce((m, cl) => Math.max(m, cl.startMs + cl.durationMs), 0);
  const durationMs = Math.max(
    500,
    Math.min(60_000, asset.durationMs && asset.durationMs > 0 ? asset.durationMs : asset.kind === "image" ? 3000 : 5000),
  );
  const startMs = Math.max(0, opts?.atMs ?? end);

  const clip = {
    id: newCompositionId("cl"),
    trackId: track.id,
    name: (asset.fileName || asset.kind).slice(0, 120),
    sourceUrl: asset.url,
    startMs,
    durationMs,
    sourceInMs: 0,
    speed: 1,
    volume: 1,
    opacity: 1,
    sceneId: null,
  };

  return studioCompositionSchema.parse({
    ...c,
    clips: [...c.clips, clip],
  });
}

export function updateClip(
  c: StudioComposition,
  clipId: string,
  patch: Partial<CompositionClip>,
): StudioComposition | { error: string } {
  const idx = c.clips.findIndex((cl) => cl.id === clipId);
  if (idx < 0) return { error: "Clip not found." };
  const next = [...c.clips];
  next[idx] = { ...next[idx]!, ...patch, id: clipId };
  return studioCompositionSchema.parse({ ...c, clips: next });
}

export function deleteClip(c: StudioComposition, clipId: string): StudioComposition {
  return {
    ...c,
    clips: c.clips.filter((cl) => cl.id !== clipId),
    keyframes: c.keyframes.filter((k) => k.clipId !== clipId),
    transitions: c.transitions.filter((t) => t.fromClipId !== clipId && t.toClipId !== clipId),
  };
}

/** Split clip at absolute timeline time (must be inside clip). */
export function splitClipAt(
  c: StudioComposition,
  clipId: string,
  atMs: number,
): StudioComposition | { error: string } {
  const clip = c.clips.find((cl) => cl.id === clipId);
  if (!clip) return { error: "Clip not found." };
  if (atMs <= clip.startMs + 100 || atMs >= clip.startMs + clip.durationMs - 100) {
    return { error: "Playhead must be inside the clip (with margin)." };
  }
  const offset = atMs - clip.startMs;
  const left = { ...clip, durationMs: offset };
  const right = {
    ...clip,
    id: newCompositionId("cl"),
    startMs: atMs,
    durationMs: clip.durationMs - offset,
    sourceInMs: clip.sourceInMs + Math.round(offset * clip.speed),
  };
  return studioCompositionSchema.parse({
    ...c,
    clips: [...c.clips.filter((cl) => cl.id !== clipId), left, right],
  });
}

export const VIDEO_ASPECT_PRESETS = [
  { id: "9:16", label: "9:16 · TikTok / Reels / Shorts", width: 1080, height: 1920 },
  { id: "1:1", label: "1:1 · Square", width: 1080, height: 1080 },
  { id: "16:9", label: "16:9 · YouTube", width: 1920, height: 1080 },
  { id: "4:5", label: "4:5 · Portrait social", width: 1080, height: 1350 },
] as const;

/** Compile storyboard scene order into sequential video-clip placeholders (no media yet). */
export function compileStoryboardToClips(
  composition: StudioComposition,
  videoTrackId: string,
): StudioComposition {
  let t = 0;
  const scenes = [...composition.storyboard].sort((a, b) => a.order - b.order);
  const clips = scenes.map((scene) => {
    const clip = {
      id: newCompositionId("cl"),
      trackId: videoTrackId,
      name: scene.name,
      startMs: t,
      durationMs: scene.durationMs,
      sourceInMs: 0,
      speed: 1,
      volume: 1,
      opacity: 1,
      sceneId: scene.id,
    };
    t += scene.durationMs;
    return clip;
  });
  return { ...composition, clips: [...composition.clips.filter((c) => c.trackId !== videoTrackId), ...clips] };
}

/** Snap time to beat grid — shared by Quick Edit + Full Timeline. */
export function snapCompositionTimeToBeats(
  timeMs: number,
  beatsMs: number[],
  thresholdMs = 80,
): number {
  if (!beatsMs.length) return timeMs;
  let best = beatsMs[0]!;
  let dist = Math.abs(timeMs - best);
  for (const b of beatsMs) {
    const d = Math.abs(timeMs - b);
    if (d < dist) {
      dist = d;
      best = b;
    }
  }
  return dist <= thresholdMs ? best : timeMs;
}

/** Every Nth beat (e.g. transitions on every 4th beat). */
export function everyNthBeat(beatsMs: number[], n: number): number[] {
  const step = Math.max(1, Math.floor(n));
  return beatsMs.filter((_, i) => i % step === 0);
}

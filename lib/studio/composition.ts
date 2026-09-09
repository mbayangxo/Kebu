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

export const STUDIO_EDIT_MODES = ["quick_edit", "smart_edit", "full_timeline", "storyboard"] as const;
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

/** Extended music analysis — beats + waveform + energy (V1 Audio Reactive foundation). */
export const compositionMusicAnalysisSchema = z.object({
  bpm: z.number().min(40).max(220).nullable(),
  beatsMs: z.array(z.number().int().min(0).max(600_000)).max(2000).default([]),
  downbeatsMs: z.array(z.number().int().min(0).max(600_000)).max(500).default([]),
  sections: z.array(musicSectionSchema).max(64).default([]),
  confidence: z.number().min(0).max(1).optional().nullable(),
  method: z.string().trim().max(40).optional().nullable(),
  soundtrackUrl: z.union([z.literal(""), z.string().trim().url().max(500)]).optional().nullable(),
  fileName: z.string().trim().max(200).optional().nullable(),
  durationMs: z.number().int().min(0).max(600_000).optional().nullable(),
  peaks: z.array(z.number().min(0).max(1)).max(512).default([]),
  energyMs: z.array(z.number().int().min(0).max(600_000)).max(256).default([]),
  energyValues: z.array(z.number().min(0).max(1)).max(256).default([]),
  analyzedAt: z.string().trim().max(40).optional().nullable(),
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
  /** V1 fades (ms) — ramp volume/opacity at clip edges */
  fadeInMs: z.number().int().min(0).max(10_000).default(0),
  fadeOutMs: z.number().int().min(0).max(10_000).default(0),
  /** V2 transform — keyframes override when present */
  x: z.number().min(-4000).max(4000).default(0),
  y: z.number().min(-4000).max(4000).default(0),
  scale: z.number().min(0.05).max(8).default(1),
  rotation: z.number().min(-360).max(360).default(0),
  /** Optional link to storyboard scene */
  sceneId: z.string().trim().max(40).nullable().optional(),
  /** Caption track text (V7) */
  captionText: z.string().trim().max(500).nullable().optional(),
  /** Chroma key (pro color path) */
  chromaEnabled: z.boolean().optional().default(false),
  chromaColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .default("#00FF00"),
  chromaSimilarity: z.number().min(0.05).max(1).optional().default(0.4),
  /** Basic color grade */
  brightness: z.number().min(-1).max(1).optional().default(0),
  contrast: z.number().min(-1).max(1).optional().default(0),
  saturation: z.number().min(-1).max(1).optional().default(0),
  /** Nested sequence — another studio_video_projects id */
  nestedProjectId: z.string().uuid().nullable().optional(),
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
  snapToBeats: z.boolean().default(true),
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

/** Empty composition sized for a common social format — multi creative tracks. */
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
      kind: "overlay" as const,
      name: "Graphics",
      muted: false,
      locked: false,
      order: 2,
    },
    {
      id: newCompositionId("tr"),
      kind: "caption" as const,
      name: "Text",
      muted: false,
      locked: false,
      order: 3,
    },
    {
      id: newCompositionId("tr"),
      kind: "audio" as const,
      name: "Voice",
      muted: false,
      locked: false,
      order: 4,
    },
    {
      id: newCompositionId("tr"),
      kind: "music" as const,
      name: "Music",
      muted: false,
      locked: false,
      order: 5,
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
    snapToBeats: true,
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
    fadeInMs: 0,
    fadeOutMs: 0,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
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
      fadeInMs: 0,
      fadeOutMs: 0,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      sceneId: scene.id,
    };
    t += scene.durationMs;
    return clip;
  });
  return { ...composition, clips: [...composition.clips.filter((c) => c.trackId !== videoTrackId), ...clips] };
}

export function addStoryboardScene(
  c: StudioComposition,
  opts?: { name?: string; durationMs?: number; intent?: string },
): StudioComposition {
  const order = c.storyboard.length;
  const scene = storyboardSceneSchema.parse({
    id: newCompositionId("sc"),
    name: (opts?.name ?? `Scene ${order + 1}`).slice(0, 120),
    intent: opts?.intent ?? null,
    durationMs: opts?.durationMs ?? 3000,
    order,
  });
  return {
    ...c,
    storyboard: [...c.storyboard, scene].slice(0, 100),
    editMode: "storyboard",
  };
}

export function removeStoryboardScene(c: StudioComposition, sceneId: string): StudioComposition {
  const next = c.storyboard
    .filter((s) => s.id !== sceneId)
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({ ...s, order: i }));
  return { ...c, storyboard: next };
}

export function updateStoryboardScene(
  c: StudioComposition,
  sceneId: string,
  patch: Partial<Pick<StoryboardScene, "name" | "durationMs" | "intent">>,
): StudioComposition {
  return {
    ...c,
    storyboard: c.storyboard.map((s) =>
      s.id === sceneId
        ? storyboardSceneSchema.parse({
            ...s,
            ...patch,
            name: patch.name !== undefined ? patch.name.slice(0, 120) : s.name,
            durationMs: patch.durationMs ?? s.durationMs,
          })
        : s,
    ),
  };
}

/** Primary video track for storyboard compile (first video track). */
export function primaryVideoTrackId(c: StudioComposition): string | null {
  return c.tracks.find((t) => t.kind === "video")?.id ?? null;
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

export function addMarker(
  c: StudioComposition,
  timeMs: number,
  label?: string,
): StudioComposition {
  const marker = {
    id: newCompositionId("mk"),
    timeMs: Math.max(0, Math.min(600_000, Math.round(timeMs))),
    label: (label ?? "Marker").slice(0, 80),
  };
  return studioCompositionSchema.parse({
    ...c,
    markers: [...c.markers, marker].slice(0, 200),
  });
}

export function deleteMarker(c: StudioComposition, markerId: string): StudioComposition {
  return { ...c, markers: c.markers.filter((m) => m.id !== markerId) };
}

/** Attach analyzed soundtrack to composition + Music track clip. */
export function attachSoundtrack(
  c: StudioComposition,
  opts: {
    url: string;
    fileName?: string;
    analysis: {
      durationMs: number;
      bpm: number;
      beatsMs: number[];
      confidence: number;
      method?: string;
      peaks?: number[];
      energyMs?: number[];
      energyValues?: number[];
    };
  },
): StudioComposition {
  const musicTrack = c.tracks.find((t) => t.kind === "music");
  let next: StudioComposition = {
    ...c,
    music: {
      bpm: opts.analysis.bpm,
      beatsMs: opts.analysis.beatsMs,
      downbeatsMs: opts.analysis.beatsMs.filter((_, i) => i % 4 === 0),
      sections: c.music?.sections ?? [],
      confidence: opts.analysis.confidence,
      method: opts.analysis.method ?? "energy_onset",
      soundtrackUrl: opts.url,
      fileName: opts.fileName ?? null,
      durationMs: opts.analysis.durationMs,
      peaks: opts.analysis.peaks ?? [],
      energyMs: opts.analysis.energyMs ?? [],
      energyValues: opts.analysis.energyValues ?? [],
      analyzedAt: new Date().toISOString(),
    },
    snapToBeats: true,
  };

  const asset: CompositionAsset = {
    id: newCompositionId("as"),
    kind: "audio",
    url: opts.url,
    fileName: opts.fileName ?? "soundtrack",
    durationMs: opts.analysis.durationMs,
  };
  next = addAssetToComposition(next, asset);

  if (musicTrack) {
    const withoutOldMusic = {
      ...next,
      clips: next.clips.filter((cl) => cl.trackId !== musicTrack.id),
    };
    const placed = addClipFromAsset(withoutOldMusic, asset.id, { trackId: musicTrack.id, atMs: 0 });
    if (!("error" in placed)) next = placed;
  }
  return studioCompositionSchema.parse(next);
}

/** Opacity after V1 fades at absolute timeline time. */
export function clipOpacityAtTime(clip: CompositionClip, timeMs: number): number {
  if (timeMs < clip.startMs || timeMs >= clip.startMs + clip.durationMs) return 0;
  const local = timeMs - clip.startMs;
  let mul = 1;
  if (clip.fadeInMs > 0 && local < clip.fadeInMs) mul = local / clip.fadeInMs;
  if (clip.fadeOutMs > 0 && local > clip.durationMs - clip.fadeOutMs) {
    mul = Math.min(mul, (clip.startMs + clip.durationMs - timeMs) / clip.fadeOutMs);
  }
  return Math.max(0, Math.min(1, clip.opacity * mul));
}

/** Volume after V1 fades. */
export function clipVolumeAtTime(clip: CompositionClip, timeMs: number): number {
  if (timeMs < clip.startMs || timeMs >= clip.startMs + clip.durationMs) return 0;
  const local = timeMs - clip.startMs;
  let mul = 1;
  if (clip.fadeInMs > 0 && local < clip.fadeInMs) mul = local / clip.fadeInMs;
  if (clip.fadeOutMs > 0 && local > clip.durationMs - clip.fadeOutMs) {
    mul = Math.min(mul, (clip.startMs + clip.durationMs - timeMs) / clip.fadeOutMs);
  }
  return Math.max(0, Math.min(2, clip.volume * mul));
}

export function maybeSnapTime(c: StudioComposition, timeMs: number, thresholdMs = 90): number {
  if (!c.snapToBeats || !c.music?.beatsMs?.length) return timeMs;
  return snapCompositionTimeToBeats(timeMs, c.music.beatsMs, thresholdMs);
}

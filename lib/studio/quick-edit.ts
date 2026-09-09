/**
 * Quick Edit montage — CapCut beginner path on the same composition schema.
 * Multi-clip import → sequential trim → optional beat-aligned cuts.
 */
import {
  addClipFromAsset,
  compositionDurationMs,
  everyNthBeat,
  newCompositionId,
  studioCompositionSchema,
  type StudioComposition,
} from "@/lib/studio/composition";

export type QuickEditOptions = {
  /** Asset ids already on the composition (video/image preferred). */
  assetIds: string[];
  /** Max duration per clip before beat snap (ms). */
  clipDurationMs?: number;
  /** Align cut points to soundtrack beats when music analysis exists. */
  beatAligned?: boolean;
  /** When beat-aligned, cut on every Nth beat (default 4). */
  everyNthBeat?: number;
  /** Clear existing video-track clips before placing montage. */
  replaceVideoTrack?: boolean;
};

export function pickMontageAssets(c: StudioComposition, assetIds: string[]) {
  const wanted = new Set(assetIds);
  return c.assets.filter(
    (a) => wanted.has(a.id) && (a.kind === "video" || a.kind === "image"),
  );
}

/**
 * Build a Quick Edit montage onto the primary video track.
 * Mutates the shared StudioComposition (not a toy format).
 */
export function buildQuickEditMontage(
  c: StudioComposition,
  opts: QuickEditOptions,
): StudioComposition | { error: string } {
  const assets = pickMontageAssets(c, opts.assetIds);
  if (!assets.length) {
    return { error: "Pick at least one video or image asset for Quick Edit." };
  }

  const videoTrack = c.tracks
    .filter((t) => t.kind === "video" && !t.locked)
    .sort((a, b) => a.order - b.order)[0];
  if (!videoTrack) return { error: "No unlocked video track." };

  const clipDurationMs = Math.max(500, Math.min(30_000, opts.clipDurationMs ?? 2500));
  const beatAligned = Boolean(opts.beatAligned && c.music?.beatsMs?.length);
  const nth = Math.max(1, opts.everyNthBeat ?? 4);

  let clips = opts.replaceVideoTrack !== false
    ? c.clips.filter((cl) => cl.trackId !== videoTrack.id)
    : [...c.clips];

  let cursor = opts.replaceVideoTrack !== false
    ? 0
    : clips.filter((cl) => cl.trackId === videoTrack.id).reduce((m, cl) => Math.max(m, cl.startMs + cl.durationMs), 0);

  const beatCuts = beatAligned ? everyNthBeat(c.music!.beatsMs, nth) : [];

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]!;
    let durationMs = Math.min(
      clipDurationMs,
      asset.durationMs && asset.durationMs > 0 ? asset.durationMs : clipDurationMs,
    );

    if (beatAligned && beatCuts.length >= 2) {
      const startBeat = beatCuts[Math.min(i, beatCuts.length - 2)]!;
      const endBeat = beatCuts[Math.min(i + 1, beatCuts.length - 1)]!;
      const beatDur = Math.max(400, endBeat - startBeat);
      durationMs = Math.min(durationMs, beatDur);
      cursor = i === 0 && opts.replaceVideoTrack !== false ? startBeat : cursor;
    }

    const placed = addClipFromAsset(
      { ...c, clips },
      asset.id,
      { trackId: videoTrack.id, atMs: cursor },
    );
    if ("error" in placed) return placed;

    const last = placed.clips[placed.clips.length - 1]!;
    const trimmed = {
      ...last,
      durationMs,
      name: `QE · ${(asset.fileName || asset.kind).slice(0, 100)}`,
    };
    clips = [...placed.clips.slice(0, -1), trimmed];
    cursor = trimmed.startMs + trimmed.durationMs;
  }

  return studioCompositionSchema.parse({
    ...c,
    editMode: "quick_edit",
    clips,
  });
}

/** Suggest clip count / duration for the wizard UI. */
export function quickEditSummary(c: StudioComposition, assetIds: string[], clipDurationMs = 2500) {
  const assets = pickMontageAssets(c, assetIds);
  const totalMs = assets.length * clipDurationMs;
  return {
    clipCount: assets.length,
    estimatedDurationMs: totalMs,
    estimatedDurationLabel: `${(totalMs / 1000).toFixed(1)}s`,
    hasBeats: Boolean(c.music?.beatsMs?.length),
    projectDurationMs: compositionDurationMs(c),
  };
}

export function newCaptionClipId(): string {
  return newCompositionId("cap");
}

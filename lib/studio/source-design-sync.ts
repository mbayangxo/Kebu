import type { CanvasDocument } from "@/lib/studio/canvas-document";
import { designDocumentToComposition } from "@/lib/studio/design-to-composition";
import { studioCompositionSchema, type CompositionClip, type StudioComposition } from "@/lib/studio/composition";

const DESIGN_SCENE_INTENT = "Editable Kebu design scene";

function trackKindForClip(composition: StudioComposition, clip: CompositionClip) {
  return composition.tracks.find((track) => track.id === clip.trackId)?.kind ?? null;
}

function pickCurrentTrack(
  current: StudioComposition,
  fresh: StudioComposition,
  freshClip: CompositionClip,
): string | null {
  const kind = trackKindForClip(fresh, freshClip);
  if (!kind) return null;
  return current.tracks
    .filter((track) => track.kind === kind && !track.locked)
    .sort((a, b) => a.order - b.order)[0]?.id ??
    current.tracks
      .filter((track) => track.kind === kind)
      .sort((a, b) => a.order - b.order)[0]?.id ??
    null;
}

export type SourceDesignSyncSummary = {
  updated: number;
  added: number;
  removed: number;
  scenes: number;
};

/**
 * Refresh semantic design-linked clips from their source design without flattening the video.
 *
 * Video-specific timeline timing, transforms, keyframes, transitions, audio, markers, grades,
 * and unrelated clips stay intact. Source-owned semantic layer payload, media, layer dimensions,
 * and scene structure refresh from the design.
 */
export function syncSourceDesignIntoComposition(
  current: StudioComposition,
  source: CanvasDocument,
): { composition: StudioComposition; summary: SourceDesignSyncSummary } {
  const fresh = designDocumentToComposition(source);

  const freshByLayer = new Map(
    fresh.clips
      .filter((clip) => clip.sourceDesignLayerId)
      .map((clip) => [clip.sourceDesignLayerId!, clip]),
  );

  const existingLinked = current.clips.filter((clip) => clip.sourceDesignLayerId);
  const currentByLayer = new Map(existingLinked.map((clip) => [clip.sourceDesignLayerId!, clip]));

  let updated = 0;
  let added = 0;

  const keptOrUpdated: CompositionClip[] = [];
  for (const clip of current.clips) {
    if (!clip.sourceDesignLayerId) {
      keptOrUpdated.push(clip);
      continue;
    }
    const freshClip = freshByLayer.get(clip.sourceDesignLayerId);
    if (!freshClip) continue;

    updated += 1;
    keptOrUpdated.push({
      ...clip,
      name: freshClip.name,
      sourceUrl: freshClip.sourceUrl,
      sourceDesignPageId: freshClip.sourceDesignPageId ?? null,
      sourceDesignLayerId: freshClip.sourceDesignLayerId ?? null,
      designWidth: freshClip.designWidth,
      designHeight: freshClip.designHeight,
      designLayer: freshClip.designLayer,
    });
  }

  const addedClips: CompositionClip[] = [];
  for (const freshClip of fresh.clips) {
    if (!freshClip.sourceDesignLayerId || currentByLayer.has(freshClip.sourceDesignLayerId)) continue;
    const trackId = pickCurrentTrack(current, fresh, freshClip);
    if (!trackId) continue;
    added += 1;
    addedClips.push({
      ...freshClip,
      trackId,
    });
  }

  const liveClipIds = new Set([...keptOrUpdated, ...addedClips].map((clip) => clip.id));
  const preservedStoryboard = current.storyboard.filter((scene) => scene.intent !== DESIGN_SCENE_INTENT);
  const freshStoryboard = fresh.storyboard.map((scene, index) => ({
    ...scene,
    order: preservedStoryboard.length + index,
  }));
  const storyboard = [
    ...preservedStoryboard.map((scene, index) => ({ ...scene, order: index })),
    ...freshStoryboard,
  ];

  const composition = studioCompositionSchema.parse({
    ...current,
    clips: [...keptOrUpdated, ...addedClips],
    keyframes: current.keyframes.filter((keyframe) => liveClipIds.has(keyframe.clipId)),
    transitions: current.transitions.filter(
      (transition) => liveClipIds.has(transition.fromClipId) && liveClipIds.has(transition.toClipId),
    ),
    storyboard,
  });

  return {
    composition,
    summary: {
      updated,
      added,
      removed: Math.max(0, existingLinked.length - updated),
      scenes: freshStoryboard.length,
    },
  };
}

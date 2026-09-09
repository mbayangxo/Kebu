/**
 * Caption track helpers + auto-caption segment → composition clips.
 * ASR itself lives in the API (honest provider); this only builds the timeline.
 */
import {
  newCompositionId,
  studioCompositionSchema,
  type StudioComposition,
} from "@/lib/studio/composition";

export type CaptionSegment = {
  startMs: number;
  endMs: number;
  text: string;
};

export const captionSegmentSchema = {
  maxText: 500,
  maxSegments: 200,
};

export function normalizeCaptionSegments(raw: CaptionSegment[]): CaptionSegment[] {
  return raw
    .map((s) => ({
      startMs: Math.max(0, Math.round(s.startMs)),
      endMs: Math.max(0, Math.round(s.endMs)),
      text: s.text.trim().slice(0, captionSegmentSchema.maxText),
    }))
    .filter((s) => s.text.length > 0 && s.endMs > s.startMs)
    .slice(0, captionSegmentSchema.maxSegments)
    .sort((a, b) => a.startMs - b.startMs);
}

export function primaryCaptionTrackId(c: StudioComposition): string | null {
  return c.tracks.find((t) => t.kind === "caption" && !t.locked)?.id ?? null;
}

/** Replace caption-track clips with segments (keeps other tracks). */
export function applyCaptionSegments(
  c: StudioComposition,
  segments: CaptionSegment[],
): StudioComposition | { error: string } {
  const trackId = primaryCaptionTrackId(c);
  if (!trackId) return { error: "No caption track on this project." };

  const cleaned = normalizeCaptionSegments(segments);
  if (!cleaned.length) return { error: "No caption segments to apply." };

  const other = c.clips.filter((cl) => cl.trackId !== trackId);
  const captionClips = cleaned.map((s) => ({
    id: newCompositionId("cap"),
    trackId,
    name: s.text.slice(0, 40),
    sourceUrl: "" as const,
    startMs: s.startMs,
    durationMs: Math.max(200, s.endMs - s.startMs),
    sourceInMs: 0,
    speed: 1,
    volume: 0,
    opacity: 1,
    fadeInMs: 0,
    fadeOutMs: 0,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    sceneId: null,
    captionText: s.text,
  }));

  return studioCompositionSchema.parse({
    ...c,
    clips: [...other, ...captionClips],
  });
}

/** Rough timing from plain transcript when ASR timestamps are missing. */
export function segmentsFromPlainTranscript(
  text: string,
  totalDurationMs: number,
): CaptionSegment[] {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 80);
  if (!sentences.length) return [];
  const slice = Math.max(1200, Math.floor(totalDurationMs / sentences.length));
  return sentences.map((s, i) => ({
    startMs: i * slice,
    endMs: Math.min(totalDurationMs, (i + 1) * slice),
    text: s,
  }));
}

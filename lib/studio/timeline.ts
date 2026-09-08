import type { CanvasDocument, CanvasPage } from "@/lib/studio/canvas-document";

export type TimelineClip = {
  pageId: string;
  name: string;
  startMs: number;
  durationMs: number;
  endMs: number;
};

export function pageDurationMs(page: CanvasPage): number {
  const d = page.durationMs ?? 2000;
  return Math.max(500, Math.min(30_000, d));
}

/** Build sequential page clips for the design timeline. */
export function buildTimelineClips(doc: CanvasDocument): TimelineClip[] {
  let t = 0;
  const clips: TimelineClip[] = [];
  for (const page of doc.pages) {
    const durationMs = pageDurationMs(page);
    clips.push({
      pageId: page.id,
      name: page.name || "Page",
      startMs: t,
      durationMs,
      endMs: t + durationMs,
    });
    t += durationMs;
  }
  return clips;
}

export function timelineTotalMs(doc: CanvasDocument): number {
  return buildTimelineClips(doc).reduce((sum, c) => sum + c.durationMs, 0);
}

export function clipAtTime(doc: CanvasDocument, timeMs: number): TimelineClip | null {
  const clips = buildTimelineClips(doc);
  if (!clips.length) return null;
  const t = Math.max(0, Math.min(timeMs, clips[clips.length - 1]!.endMs - 1));
  return clips.find((c) => t >= c.startMs && t < c.endMs) ?? clips[clips.length - 1]!;
}

/** Time within the active page clip (0 … durationMs). */
export function pageLocalTimeMs(doc: CanvasDocument, globalTimeMs: number): {
  clip: TimelineClip;
  localMs: number;
} | null {
  const clip = clipAtTime(doc, globalTimeMs);
  if (!clip) return null;
  return {
    clip,
    localMs: Math.max(0, globalTimeMs - clip.startMs),
  };
}

/** Source video time (seconds) for a video layer at page-local time. */
export function videoSourceTimeSec(
  layer: { trimStartMs?: number; trimDurationMs?: number | null },
  pageLocalMs: number,
): number {
  const trimStart = Math.max(0, layer.trimStartMs ?? 0);
  const trimDur = layer.trimDurationMs;
  let local = pageLocalMs;
  if (typeof trimDur === "number" && trimDur > 0) {
    local = Math.min(local, trimDur);
  }
  return (trimStart + local) / 1000;
}

export function formatTimelineClock(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m}:${rem.toFixed(1).padStart(4, "0")}`;
}

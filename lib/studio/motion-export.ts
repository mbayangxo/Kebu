import type { CanvasDocument } from "@/lib/studio/canvas-document";
import { exportCanvasToPngDataUrlAsync, getPage } from "@/lib/studio/canvas-document";
import {
  buildTimelineClips,
  pageLocalTimeMs,
  timelineTotalMs,
} from "@/lib/studio/timeline";

export type MotionExportOptions = {
  /** Fallback when pages lack durationMs (legacy S8a) */
  secondsPerPage?: number;
  scale?: number;
  fps?: number;
};

export function estimateMotionDurationSeconds(
  pageCount: number,
  secondsPerPage = 2,
): number {
  return Math.max(1, pageCount) * Math.max(0.5, Math.min(8, secondsPerPage));
}

export function estimateTimelineDurationSeconds(doc: CanvasDocument): number {
  return timelineTotalMs(doc) / 1000;
}

/**
 * S8b timeline export: frame-by-frame along page durations,
 * seeking video layers to the correct source time each frame.
 */
export async function exportCanvasMotionToWebmBlob(
  doc: CanvasDocument,
  opts: MotionExportOptions = {},
): Promise<{ blob: Blob; mime: string } | { error: string }> {
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
    return { error: "Motion export needs a browser with MediaRecorder." };
  }

  const scale = Math.max(0.25, Math.min(1, opts.scale ?? 0.5));
  const fps = Math.max(8, Math.min(30, opts.fps ?? 15));

  // Apply legacy uniform duration if caller passes secondsPerPage and pages use defaults
  let working = doc;
  if (opts.secondsPerPage != null) {
    const ms = Math.round(Math.max(0.5, Math.min(8, opts.secondsPerPage)) * 1000);
    working = {
      ...doc,
      pages: doc.pages.map((p) => ({ ...p, durationMs: p.durationMs ?? ms })),
    };
  }

  const clips = buildTimelineClips(working);
  if (!clips.length) return { error: "No pages to export." };

  const totalMs = timelineTotalMs(working);
  if (totalMs < 200) return { error: "Timeline too short." };

  const first = getPage(working, clips[0]!.pageId);
  const width = Math.round(first.width * scale);
  const height = Math.round(first.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { error: "Could not create canvas." };

  const stream = canvas.captureStream(fps);
  const mimeCandidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
  if (!mime) {
    return { error: "This browser cannot record WebM. Try Chrome or Edge." };
  }

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime.split(";")[0] }));
    recorder.onerror = () => reject(new Error("Recording failed."));
  });

  recorder.start(200);

  const videoCache = new Map<string, HTMLVideoElement>();
  const frameInterval = 1000 / fps;
  const frameCount = Math.max(1, Math.ceil((totalMs / 1000) * fps));

  for (let i = 0; i < frameCount; i++) {
    const globalMs = Math.min(totalMs - 1, (i / fps) * 1000);
    const at = pageLocalTimeMs(working, globalMs);
    if (!at) break;

    const dataUrl = await exportCanvasToPngDataUrlAsync(working, scale, at.clip.pageId, {
      pageLocalTimeMs: at.localMs,
      videoCache,
    });
    if (!dataUrl) {
      recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
      return { error: `Could not render frame at ${Math.round(globalMs)}ms.` };
    }
    const img = await loadDataUrlImage(dataUrl);
    if (!img) {
      recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
      return { error: "Could not load rendered frame." };
    }
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    await sleep(frameInterval);
  }

  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());

  try {
    const blob = await finished;
    if (!blob.size) return { error: "Recording produced an empty file." };
    return { blob, mime: blob.type || "video/webm" };
  } catch {
    return { error: "Recording failed." };
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function loadDataUrlImage(dataUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

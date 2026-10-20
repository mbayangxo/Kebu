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

  const videoCache = new Map<string, HTMLVideoElement>();
  const releaseVideos = () => videoCache.forEach(video => { video.pause(); video.removeAttribute("src"); video.load(); });
  const initialUrl = await exportCanvasToPngDataUrlAsync(working, scale, clips[0]!.pageId, { pageLocalTimeMs: 0, videoCache });
  const initialImage = initialUrl ? await loadDataUrlImage(initialUrl) : null;
  if (!initialImage) { releaseVideos(); return { error: "Could not render the first timeline frame." }; }
  ctx.drawImage(initialImage, 0, 0, width, height);

  let soundtrack: Awaited<ReturnType<typeof prepareSoundtrack>> = null;
  try { soundtrack = await prepareSoundtrack(working.soundtrack?.url); } catch {
    releaseVideos();
    return { error: "Could not load the soundtrack for export. No file was exported." };
  }
  let stream: MediaStream;
  try { stream = canvas.captureStream(fps); } catch {
    soundtrack?.element.pause(); await soundtrack?.context.close().catch(() => undefined); releaseVideos();
    return { error: "This browser cannot capture a video timeline." };
  }
  const captureTrack = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
  if (soundtrack) for (const track of soundtrack.destination.stream.getAudioTracks()) stream.addTrack(track);
  const mimeCandidates = soundtrack
    ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
  if (!mime) {
    stream.getTracks().forEach(track => track.stop());
    soundtrack?.element.pause(); await soundtrack?.context.close().catch(() => undefined);
    releaseVideos();
    return { error: "This browser cannot record WebM. Try Chrome or Edge." };
  }

  let recorder: MediaRecorder | undefined;
  try {
    const chunks: BlobPart[] = [];
    const activeRecorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
    recorder = activeRecorder;
    activeRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const finished = new Promise<Blob>((resolve, reject) => {
      activeRecorder.onstop = () => resolve(new Blob(chunks, { type: mime.split(";")[0] }));
      activeRecorder.onerror = () => reject(new Error("Recording failed."));
    });

    void finished.catch(() => undefined);
    if (soundtrack) await soundtrack.element.play();
    activeRecorder.start(200);
    const startedAt = performance.now();

    const frameInterval = 1000 / fps;
    const frameCount = Math.max(1, Math.ceil((totalMs / 1000) * fps));

    for (let i = 0; i < frameCount; i++) {
      const elapsedMs = performance.now() - startedAt;
      if (elapsedMs >= totalMs) break;
      const globalMs = Math.min(totalMs - 1, elapsedMs);
      const at = pageLocalTimeMs(working, globalMs);
      if (!at) break;

      const currentPage = getPage(working, at.clip.pageId);
      const transitionKind = currentPage.transitionKind ?? "cut";
      const transitionDurationMs = Math.max(0, currentPage.transitionDurationMs ?? 400);
      const clipIndex = clips.findIndex((clip) => clip.pageId === at.clip.pageId);
      const transitionProgress =
        clipIndex > 0 && transitionKind !== "cut" && transitionDurationMs > 0 && at.localMs < transitionDurationMs
          ? Math.max(0, Math.min(1, at.localMs / transitionDurationMs))
          : null;

      const dataUrl = await exportCanvasToPngDataUrlAsync(working, scale, at.clip.pageId, {
        pageLocalTimeMs: at.localMs,
        videoCache,
      });
      if (!dataUrl) {
        throw new Error(`Could not render frame at ${Math.round(globalMs)}ms.`);
      }
      const img = await loadDataUrlImage(dataUrl);
      if (!img) {
        throw new Error("Could not load rendered frame.");
      }

      ctx.clearRect(0, 0, width, height);

      if (transitionProgress != null) {
        const previousClip = clips[clipIndex - 1]!;
        const previousUrl = await exportCanvasToPngDataUrlAsync(working, scale, previousClip.pageId, {
          pageLocalTimeMs: Math.max(0, previousClip.durationMs - 1),
          videoCache,
        });
        const previous = previousUrl ? await loadDataUrlImage(previousUrl) : null;
        if (previous) {
          if (transitionKind === "slide") {
            ctx.globalAlpha = 1;
            ctx.drawImage(previous, -width * transitionProgress, 0, width, height);
            ctx.drawImage(img, width * (1 - transitionProgress), 0, width, height);
          } else {
            ctx.globalAlpha = 1 - transitionProgress;
            ctx.drawImage(previous, 0, 0, width, height);
            ctx.globalAlpha = transitionProgress;
            ctx.drawImage(img, 0, 0, width, height);
            ctx.globalAlpha = 1;
          }
        } else {
          ctx.drawImage(img, 0, 0, width, height);
        }
      } else {
        ctx.drawImage(img, 0, 0, width, height);
      }
      captureTrack?.requestFrame?.();
      await sleep(Math.max(0, startedAt + (i + 1) * frameInterval - performance.now()));
    }

    if (activeRecorder.state !== "inactive") activeRecorder.stop();
      const blob = await finished;
      if (!blob.size) return { error: "Recording produced an empty file." };
      return { blob, mime: blob.type || "video/webm" };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Recording failed." };
  } finally {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    soundtrack?.element.pause();
    stream.getTracks().forEach(track => track.stop());
    await soundtrack?.context.close().catch(() => undefined);
    releaseVideos();
  }
}

/** A single destination track exists only when a real soundtrack loaded successfully. */
async function prepareSoundtrack(url?: string) {
  if (!url) return null;
  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) throw new Error("Audio export is unsupported.");
  const context = new AudioCtor();
  const element = new Audio(); element.crossOrigin = "anonymous"; element.preload = "auto";
  try {
    await context.resume();
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error("Soundtrack loading timed out.")), 15000);
      const finish = (error?: Error) => {
        clearTimeout(timer); element.oncanplay = null; element.onerror = null;
        if (error) reject(error); else resolve();
      };
      element.oncanplay = () => finish(); element.onerror = () => finish(new Error("Soundtrack could not load."));
      element.src = url; element.load();
    });
    const destination = context.createMediaStreamDestination();
    const source = context.createMediaElementSource(element); source.connect(destination);
    return { context, element, destination };
  } catch (cause) {
    element.pause(); await context.close().catch(() => undefined); throw cause;
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

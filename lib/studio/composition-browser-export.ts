import { effectiveClipVolume } from "@/lib/studio/audio-engine";
import {
  compositionDurationMs,
  type CompositionClip,
  type StudioComposition,
} from "@/lib/studio/composition";
import { applyStudioCanvasFill, studioCanvasCompositeOperation } from "@/lib/studio/layer-paint";
import {
  clipTransformAtTime,
  transitionOpacityBoost,
} from "@/lib/studio/keyframes";

type PreparedVisual =
  | { kind: "image"; element: HTMLImageElement }
  | { kind: "video"; element: HTMLVideoElement };

type PreparedAudio = {
  element: HTMLMediaElement;
  gain: GainNode;
};

export type StudioCompositionExportProgress = {
  frame: number;
  totalFrames: number;
  elapsedMs: number;
  durationMs: number;
};

export type StudioCompositionExportResult =
  | { blob: Blob; mime: string; durationMs: number }
  | { error: string };

function assetKindForClip(composition: StudioComposition, clip: CompositionClip) {
  const asset = composition.assets.find((item) => item.url === clip.sourceUrl);
  return asset?.kind ?? null;
}

function trackKindForClip(composition: StudioComposition, clip: CompositionClip) {
  return composition.tracks.find((track) => track.id === clip.trackId)?.kind ?? null;
}

function mediaFilter(layer: NonNullable<CompositionClip["designLayer"]>) {
  const brightness = 1 + (layer.brightness ?? 0);
  const contrast = 1 + (layer.contrast ?? 0);
  const saturation = 1 + (layer.saturation ?? 0);
  const grayscale = Math.max(0, Math.min(1, layer.grayscale ?? 0));
  const blur = Math.max(0, layer.blur ?? 0);
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) grayscale(${grayscale}) blur(${blur}px)`;
}

function mediaDimensions(media: PreparedVisual) {
  return media.kind === "image"
    ? { width: media.element.naturalWidth, height: media.element.naturalHeight }
    : { width: media.element.videoWidth, height: media.element.videoHeight };
}

function waitForImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image media for export."));
    img.src = url;
  });
}

function waitForVideo(url: string) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = false;
    video.playsInline = true;
    const ok = () => {
      cleanup();
      resolve(video);
    };
    const fail = () => {
      cleanup();
      reject(new Error("Could not load video media for export."));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", ok);
      video.removeEventListener("error", fail);
    };
    video.addEventListener("loadedmetadata", ok);
    video.addEventListener("error", fail);
    video.src = url;
    video.load();
  });
}

async function prepareVisuals(
  composition: StudioComposition,
  resolveMediaUrl: (url: string) => string,
) {
  const result = new Map<string, PreparedVisual>();
  const urls = [...new Set(composition.clips.map((clip) => clip.sourceUrl).filter(Boolean) as string[])];

  await Promise.all(urls.map(async (url) => {
    const clip = composition.clips.find((item) => item.sourceUrl === url);
    if (!clip) return;
    const kind = assetKindForClip(composition, clip);
    const designType = clip.designLayer?.type;
    try {
      if (kind === "image" || designType === "image") {
        result.set(url, { kind: "image", element: await waitForImage(resolveMediaUrl(url)) });
      } else if (kind === "video" || designType === "video" || trackKindForClip(composition, clip) === "video") {
        result.set(url, { kind: "video", element: await waitForVideo(resolveMediaUrl(url)) });
      }
    } catch {
      // Keep export honest: missing media is detected during render and surfaced.
    }
  }));

  return result;
}

function drawSemanticLayer(
  ctx: CanvasRenderingContext2D,
  composition: StudioComposition,
  clip: CompositionClip,
  timeMs: number,
  media: PreparedVisual | undefined,
) {
  const layer = clip.designLayer;
  if (!layer) return;
  const xf = clipTransformAtTime(composition, clip, timeMs);
  const transition = transitionOpacityBoost(composition, clip.id, timeMs);
  const width = Math.max(1, clip.designWidth ?? 200);
  const height = Math.max(1, clip.designHeight ?? Math.max(48, layer.fontSize ?? 48));
  const opacity = Math.max(0, Math.min(1, xf.opacity * transition));
  if (opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = studioCanvasCompositeOperation(undefined);
  ctx.translate(xf.x, xf.y);
  ctx.rotate((xf.rotation * Math.PI) / 180);
  ctx.scale(xf.scale, xf.scale);

  if (layer.shadowBlur) {
    ctx.shadowBlur = layer.shadowBlur;
    ctx.shadowOffsetX = layer.shadowX ?? 0;
    ctx.shadowOffsetY = layer.shadowY ?? 0;
    ctx.shadowColor = layer.shadowColor ?? "#00000055";
  }

  if (layer.type === "text") {
    const fontSize = layer.fontSize ?? 48;
    ctx.fillStyle = layer.color ?? "#FFFFFF";
    ctx.font = `${layer.fontStyle ?? "normal"} ${layer.fontWeight ?? "400"} ${fontSize}px ${layer.fontFamily ?? "sans-serif"}`;
    ctx.textAlign = layer.textAlign ?? "left";
    ctx.textBaseline = "top";
    const x = layer.textAlign === "center" ? width / 2 : layer.textAlign === "right" ? width : 0;
    const lineHeight = fontSize * (layer.lineHeight ?? 1.2);
    const lines = (layer.text ?? "").split(/\n/).slice(0, 40);
    lines.forEach((line, index) => ctx.fillText(line, x, index * lineHeight, width));
  } else if ((layer.type === "image" || layer.type === "video") && media) {
    ctx.filter = mediaFilter(layer);
    ctx.save();
    if (layer.flipX || layer.flipY) {
      ctx.translate(layer.flipX ? width : 0, layer.flipY ? height : 0);
      ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
    }
    const cropW = Math.max(0.05, Math.min(1, layer.cropW ?? 1));
    const cropH = Math.max(0.05, Math.min(1, layer.cropH ?? 1));
    const cropX = Math.max(0, Math.min(1 - cropW, layer.cropX ?? 0));
    const cropY = Math.max(0, Math.min(1 - cropH, layer.cropY ?? 0));
    const source = media.element;
    const { width: sourceWidth, height: sourceHeight } = mediaDimensions(media);
    ctx.drawImage(
      source,
      cropX * sourceWidth,
      cropY * sourceHeight,
      cropW * sourceWidth,
      cropH * sourceHeight,
      0,
      0,
      width,
      height,
    );
    ctx.restore();
    ctx.filter = "none";
  } else if (layer.type === "ellipse") {
    applyStudioCanvasFill(ctx, layer, { x: 0, y: 0, width, height });
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if ((layer.strokeWidth ?? 0) > 0) {
      ctx.lineWidth = layer.strokeWidth ?? 1;
      ctx.strokeStyle = layer.stroke ?? "#111111";
      ctx.stroke();
    }
  } else if (layer.type === "line") {
    ctx.strokeStyle = layer.stroke ?? layer.fill ?? "#FFFFFF";
    ctx.lineWidth = Math.max(1, layer.strokeWidth ?? 2);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  } else {
    applyStudioCanvasFill(ctx, layer, { x: 0, y: 0, width, height });
    const radius = Math.min(width / 2, height / 2, layer.cornerRadius ?? 0);
    if (radius > 0 && "roundRect" in ctx) {
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, radius);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, width, height);
    }
    if ((layer.strokeWidth ?? 0) > 0) {
      ctx.lineWidth = layer.strokeWidth ?? 1;
      ctx.strokeStyle = layer.stroke ?? "#111111";
      ctx.strokeRect(0, 0, width, height);
    }
    if (layer.type === "icon") {
      ctx.shadowBlur = 0;
      ctx.fillStyle = layer.color ?? "#FFFFFF";
      ctx.font = `700 ${layer.fontSize ?? Math.min(width, height)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(layer.text || "★", width / 2, height / 2, width);
    }
  }
  ctx.restore();
}

function seekVideo(video: HTMLVideoElement, seconds: number) {
  return new Promise<void>((resolve) => {
    const target = Math.max(0, Math.min(Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.02) : seconds, seconds));
    if (Math.abs(video.currentTime - target) < 0.04) {
      resolve();
      return;
    }
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done, { once: true });
    try {
      video.currentTime = target;
      window.setTimeout(done, 350);
    } catch {
      resolve();
    }
  });
}

async function drawFrame(
  ctx: CanvasRenderingContext2D,
  composition: StudioComposition,
  timeMs: number,
  visuals: Map<string, PreparedVisual>,
) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, composition.width, composition.height);
  ctx.restore();

  const orderedTracks = [...composition.tracks].sort((a, b) => a.order - b.order);
  const solo = orderedTracks.some((track) => track.solo);
  const trackOrder = new Map(orderedTracks.map((track, index) => [track.id, index]));

  const active = composition.clips
    .filter((clip) => timeMs >= clip.startMs && timeMs < clip.startMs + clip.durationMs)
    .filter((clip) => {
      const track = composition.tracks.find((item) => item.id === clip.trackId);
      return track && !track.muted && (!solo || track.solo);
    })
    .sort((a, b) => (trackOrder.get(a.trackId) ?? 0) - (trackOrder.get(b.trackId) ?? 0));

  for (const clip of active) {
    if (clip.designLayer) {
      const media = clip.sourceUrl ? visuals.get(clip.sourceUrl) : undefined;
      if (media?.kind === "video") {
        const local = (timeMs - clip.startMs) * clip.speed + clip.sourceInMs;
        await seekVideo(media.element, local / 1000);
      }
      drawSemanticLayer(ctx, composition, clip, timeMs, media);
      continue;
    }

    const media = clip.sourceUrl ? visuals.get(clip.sourceUrl) : undefined;
    if (!media) continue;
    if (media.kind === "video") {
      const local = (timeMs - clip.startMs) * clip.speed + clip.sourceInMs;
      await seekVideo(media.element, local / 1000);
    }
    const xf = clipTransformAtTime(composition, clip, timeMs);
    const opacity = Math.max(0, Math.min(1, xf.opacity * transitionOpacityBoost(composition, clip.id, timeMs)));
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(composition.width / 2 + xf.x, composition.height / 2 + xf.y);
    ctx.rotate((xf.rotation * Math.PI) / 180);
    ctx.scale(xf.scale, xf.scale);
    const source = media.element;
    const { width: sw, height: sh } = mediaDimensions(media);
    const ratio = Math.min(composition.width / Math.max(1, sw), composition.height / Math.max(1, sh));
    const width = sw * ratio;
    const height = sh * ratio;
    ctx.drawImage(source, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  const captionTrack = composition.tracks.find((track) => track.kind === "caption");
  if (captionTrack && !captionTrack.muted && (!solo || captionTrack.solo)) {
    const caption = active.find((clip) => clip.trackId === captionTrack.id && clip.captionText);
    if (caption?.captionText) {
      const size = Math.max(28, Math.round(composition.width * 0.035));
      ctx.save();
      ctx.font = `700 ${size}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      const maxWidth = composition.width * 0.86;
      const y = composition.height * 0.92;
      const metrics = ctx.measureText(caption.captionText);
      const bgWidth = Math.min(maxWidth, metrics.width + 48);
      ctx.fillStyle = "rgba(0,0,0,.72)";
      ctx.fillRect((composition.width - bgWidth) / 2, y - size - 28, bgWidth, size + 34);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(caption.captionText, composition.width / 2, y, maxWidth);
      ctx.restore();
    }
  }
}

async function prepareAudioGraph(
  composition: StudioComposition,
  visuals: Map<string, PreparedVisual>,
  resolveMediaUrl: (url: string) => string,
) {
  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;

  const context = new AudioCtor();
  await context.resume();
  const destination = context.createMediaStreamDestination();
  const clips = new Map<string, PreparedAudio>();

  for (const clip of composition.clips) {
    if (!clip.sourceUrl) continue;
    const track = composition.tracks.find((item) => item.id === clip.trackId);
    const assetKind = assetKindForClip(composition, clip);
    const audible = track?.kind === "audio" || track?.kind === "music" || (track?.kind === "video" && assetKind === "video");
    if (!audible) continue;

    let element: HTMLMediaElement;
    const prepared = visuals.get(clip.sourceUrl);
    if (prepared?.kind === "video") {
      element = prepared.element;
    } else {
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";
      audio.src = resolveMediaUrl(clip.sourceUrl);
      element = audio;
    }

    try {
      const source = context.createMediaElementSource(element);
      const gain = context.createGain();
      source.connect(gain);
      gain.connect(destination);
      clips.set(clip.id, { element, gain });
    } catch {
      // A media element can only have one MediaElementSource. Skip duplicates safely.
    }
  }

  return { context, destination, clips };
}

function syncAudioAtTime(
  composition: StudioComposition,
  audio: Awaited<ReturnType<typeof prepareAudioGraph>>,
  timeMs: number,
  playing: boolean,
) {
  if (!audio) return;
  const solo = composition.tracks.some((track) => track.solo);

  for (const clip of composition.clips) {
    const prepared = audio.clips.get(clip.id);
    if (!prepared) continue;
    const track = composition.tracks.find((item) => item.id === clip.trackId);
    const active = Boolean(
      track &&
      !track.muted &&
      (!solo || track.solo) &&
      timeMs >= clip.startMs &&
      timeMs < clip.startMs + clip.durationMs,
    );

    if (!active) {
      prepared.element.pause();
      prepared.gain.gain.value = 0;
      continue;
    }

    const localMs = (timeMs - clip.startMs) * clip.speed + clip.sourceInMs;
    const xf = clipTransformAtTime(composition, clip, timeMs);
    prepared.gain.gain.value = Math.max(0, Math.min(2, effectiveClipVolume(composition, clip.id) * xf.volume));
    prepared.element.playbackRate = Math.max(0.1, Math.min(8, clip.speed));
    if (Math.abs(prepared.element.currentTime * 1000 - localMs) > 160) {
      try { prepared.element.currentTime = localMs / 1000; } catch { /* still loading */ }
    }
    if (playing) void prepared.element.play().catch(() => undefined);
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Browser-side composition export.
 *
 * This records the same StudioComposition used by Quick Edit, Storyboard, and Full Timeline.
 * It is intentionally real-time so browser media decoding, semantic layers, music, and clip
 * audio all share one clock without a separate fake export model.
 */
export async function exportStudioComposition(
  composition: StudioComposition,
  opts: {
    scale?: number;
    fps?: number;
    onProgress?: (progress: StudioCompositionExportProgress) => void;
    /** Map canonical remote URLs to cached blob/object URLs for true offline export. */
    resolveMediaUrl?: (url: string) => string;
  } = {},
): Promise<StudioCompositionExportResult> {
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
    return { error: "Video export needs a browser with MediaRecorder support." };
  }

  const durationMs = compositionDurationMs(composition);
  const fps = Math.max(8, Math.min(30, opts.fps ?? 24));
  const scale = Math.max(0.2, Math.min(1, opts.scale ?? 0.5));
  const width = Math.max(2, Math.round(composition.width * scale));
  const height = Math.max(2, Math.round(composition.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const scaled = canvas.getContext("2d");
  if (!scaled) return { error: "Could not initialize the export canvas." };

  const frameCanvas = document.createElement("canvas");
  frameCanvas.width = composition.width;
  frameCanvas.height = composition.height;
  const ctx = frameCanvas.getContext("2d");
  if (!ctx) return { error: "Could not initialize the composition renderer." };

  const resolveMediaUrl = opts.resolveMediaUrl ?? ((url: string) => url);
  const visuals = await prepareVisuals(composition, resolveMediaUrl);
  const requiredVisualUrls = composition.clips
    .filter((clip) => clip.sourceUrl && (clip.designLayer?.type === "image" || clip.designLayer?.type === "video" || ["video","overlay"].includes(trackKindForClip(composition, clip) ?? "")))
    .map((clip) => clip.sourceUrl as string);
  const missing = [...new Set(requiredVisualUrls)].filter((url) => !visuals.has(url));
  if (missing.length) return { error: "One or more media files could not be loaded for export." };

  const stream = canvas.captureStream(fps);
  const audio = await prepareAudioGraph(composition, visuals, resolveMediaUrl);
  if (audio) {
    for (const track of audio.destination.stream.getAudioTracks()) stream.addTrack(track);
  }

  const mimeCandidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const mime = mimeCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
  if (!mime) {
    await audio?.context.close().catch(() => undefined);
    return { error: "This browser cannot encode Studio video yet. Try current Chrome or Edge." };
  }

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: Math.max(1_500_000, Math.round(width * height * fps * 0.12)),
  });
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    recorder.onerror = () => reject(new Error("Studio video recording failed."));
  });

  const frameMs = 1000 / fps;
  const totalFrames = Math.max(1, Math.ceil(durationMs / frameMs));
  recorder.start(250);

  try {
    for (let frame = 0; frame < totalFrames; frame += 1) {
      const timeMs = Math.min(durationMs - 1, Math.round(frame * frameMs));
      syncAudioAtTime(composition, audio, timeMs, true);
      await drawFrame(ctx, composition, timeMs, visuals);
      scaled.clearRect(0, 0, width, height);
      scaled.drawImage(frameCanvas, 0, 0, width, height);
      opts.onProgress?.({ frame: frame + 1, totalFrames, elapsedMs: timeMs, durationMs });
      await sleep(frameMs);
    }
  } catch {
    recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
    for (const entry of audio?.clips.values() ?? []) entry.element.pause();
    await audio?.context.close().catch(() => undefined);
    return { error: "Studio could not render this composition. Check that its media is still available." };
  }

  for (const entry of audio?.clips.values() ?? []) entry.element.pause();
  recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  await audio?.context.close().catch(() => undefined);

  try {
    const blob = await finished;
    if (!blob.size) return { error: "Video export produced an empty file." };
    return { blob, mime: blob.type || "video/webm", durationMs };
  } catch {
    return { error: "Studio could not finalize the video file." };
  }
}

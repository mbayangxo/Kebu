"use client";
import { useEffect, useRef, useState } from "react";
import { collageVideoClip, collageVideoProgress, collageVideoTransform, type CollageVideo } from "@/lib/create/collage-video";
import { resolveCutoutHref, cutoutHrefToPageSlug } from "@/lib/create/cutout-links";

/** Shared editor/preview/visitor media. Scroll scrubbing never starts audio. */
export function CollageVideoLayer({ layer, progress, motionEnabled, editing, siteBase = "", onNavigatePage }: {
  layer: CollageVideo; progress: number; motionEnabled: boolean; editing: boolean; siteBase?: string; onNavigatePage?: (slug: string) => void;
}) {
  const frame = useRef<HTMLElement>(null), video = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false), [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false), [userPaused, setUserPaused] = useState(false);
  const [blocked, setBlocked] = useState(false), [retry, setRetry] = useState(0);
  const [scrubUnavailable, setScrubUnavailable] = useState(false);
  const enabled = motionEnabled && !editing;
  const position = collageVideoProgress(layer, progress, enabled);
  const desired = useRef(position);
  const requestedTime = useRef<number | null>(null);
  useEffect(() => { desired.current = position; }, [position]);
  function seekToProgress() {
    const element = video.current;
    if (!element || !Number.isFinite(element.duration) || element.duration <= 0 || element.seeking || !element.seekable.length || element.seekable.end(element.seekable.length-1) <= 0) return;
    const time = desired.current * Math.max(0, element.duration-0.02);
    // Browsers may round a seek to a decoded frame. Compare requests, not decoded time,
    // or seeked would repeatedly seek the same target forever. Queue only the newest progress.
    if (requestedTime.current === null || Math.abs(requestedTime.current-time) > 0.01) {
      requestedTime.current = time; element.currentTime = time;
    }
  }
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => setVisible(entries[0]?.isIntersecting ?? false));
    observer.observe(element); return () => observer.disconnect();
  }, [layer.src]);
  useEffect(() => {
    const element = video.current;
    if (!element || layer.mode === "controls") return;
    let active = true;
    if (layer.mode === "loop" && enabled && visible && !userPaused) {
      element.play().catch(error => { if (active && error?.name !== "AbortError") setBlocked(true); });
    } else element.pause();
    return () => { active = false; };
  }, [layer.mode, enabled, visible, userPaused, retry]);
  useEffect(() => { if (layer.mode === "scrub" && enabled && visible) seekToProgress(); }, [layer.mode, enabled, visible, position]);
  if (!layer.src) return editing ? <p role="status" className="absolute left-4 top-24 z-20 rounded bg-white p-3 text-sm text-black">Choose a video in Video layers.</p> : null;
  return <figure ref={frame} data-collage-video={layer.id} className="absolute m-0" style={{ left:`${layer.leftPct}%`, top:`${layer.topPct}%`, width:`${layer.widthPct}%`, zIndex:layer.zIndex, transform:collageVideoTransform(layer,progress,enabled) }}>
    <div data-video-frame={layer.frameShape??'rectangle'} className="relative overflow-hidden bg-black" style={{borderRadius:layer.radius,aspectRatio:layer.aspectRatio,clipPath:layer.mode!=='controls'&&enabled&&!blocked&&!scrubUnavailable?collageVideoClip(layer.frameShape):undefined,border:`${layer.frameWidth??0}px solid ${layer.frameColor??'#ffffff'}`}}>
      <video key={`${layer.src}:${retry}`} ref={video} aria-label={layer.label} src={layer.src} poster={layer.poster || undefined}
        className="h-full w-full object-cover" playsInline controls={layer.mode === "controls" || !enabled || blocked || scrubUnavailable}
        muted={layer.mode !== "controls"} loop={layer.mode === "loop"} preload={visible || editing ? "metadata" : "none"}
        onCanPlay={() => { const element=video.current; if (layer.mode === "scrub" && element) { setScrubUnavailable(!Number.isFinite(element.duration) || !element.seekable.length || element.seekable.end(element.seekable.length-1)<=0); if (enabled) seekToProgress(); } }}
        onError={() => setFailed(true)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onLoadedMetadata={() => { requestedTime.current=null; if (layer.mode === "scrub" && enabled) seekToProgress(); }}
        onSeeked={() => { if (layer.mode === "scrub" && enabled) seekToProgress(); }}>
        {layer.captionsSrc ? <track kind="captions" src={layer.captionsSrc} srcLang={layer.captionsLanguage} label={layer.captionsLanguage} /> : null}
      </video>
      {layer.mode === "loop" && enabled && !failed ? <button type="button" className="absolute left-1/2 top-3 min-h-11 -translate-x-1/2 rounded-full bg-white px-4 text-xs text-black" onClick={() => {
        const element=video.current; if (!element) return;
        if (playing) { setUserPaused(true); element.pause(); }
        else { setUserPaused(false); element.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true)); }
      }}>{playing ? "Pause video" : "Play video"}</button> : null}
      {failed ? <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 p-4 text-center text-sm text-white">Video could not be loaded.<button type="button" className="min-h-11 rounded border px-4" onClick={() => {setFailed(false);setBlocked(false);setScrubUnavailable(false);setRetry(value=>value+1);}}>Retry video</button></div> : null}
    </div>
    {scrubUnavailable && layer.mode === "scrub" ? <p role="status" className="rounded bg-white p-2 text-xs text-black">This video cannot follow scrolling. Upload a video file to Kebu or use the play controls.</p> : null}
    {layer.href ? <figcaption><a className="mt-2 inline-flex min-h-11 items-center rounded bg-white px-4 text-sm text-black underline focus-visible:outline-2" href={resolveCutoutHref(layer.href,siteBase)} onClick={event => {
      const slug=cutoutHrefToPageSlug(layer.href);if (slug && onNavigatePage) {event.preventDefault();onNavigatePage(slug);}
    }}>{layer.linkLabel}</a></figcaption> : null}
  </figure>;
}

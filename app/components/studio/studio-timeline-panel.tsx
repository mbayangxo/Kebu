"use client";

import { useRef, useState } from "react";
import type { CanvasDocument, CanvasSoundtrack } from "@/lib/studio/canvas-document";
import { updatePage } from "@/lib/studio/canvas-document";
import {
  analyzeMusicFromUrl,
  snapTimeToBeat,
} from "@/lib/studio/music-analysis";
import {
  buildTimelineClips,
  formatTimelineClock,
  timelineTotalMs,
} from "@/lib/studio/timeline";

/**
 * Page timeline + soundtrack beat grid (S8c-lite).
 * Multi-track keyframe effects = later.
 */
export function StudioTimelinePanel({
  designId,
  document: doc,
  onChange,
  activePageId,
  onActivePageChange,
  playheadMs,
  onPlayheadChange,
  playing,
  onPlayingChange,
  readOnly = false,
}: {
  designId?: string;
  document: CanvasDocument;
  onChange: (next: CanvasDocument) => void;
  activePageId: string;
  onActivePageChange: (pageId: string) => void;
  playheadMs: number;
  onPlayheadChange: (ms: number) => void;
  playing: boolean;
  onPlayingChange: (v: boolean) => void;
  readOnly?: boolean;
}) {
  const clips = buildTimelineClips(doc);
  const total = Math.max(1, timelineTotalMs(doc));
  const playheadPct = Math.min(100, (playheadMs / total) * 100);
  const soundtrack = doc.soundtrack ?? null;
  const audioRef = useRef<HTMLInputElement>(null);
  const [musicBusy, setMusicBusy] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);

  function setPageDuration(pageId: string, seconds: number) {
    if (readOnly) return;
    const ms = Math.round(Math.max(0.5, Math.min(30, seconds)) * 1000);
    onChange(updatePage(doc, pageId, { durationMs: ms }));
  }

  function setPlayhead(ms: number, fromUser = true) {
    let next = ms;
    if (fromUser && soundtrack?.snapToBeats && soundtrack.beatsMs.length) {
      const snapped = snapTimeToBeat(ms, soundtrack.beatsMs, 90);
      if (snapped.snapped) next = snapped.timeMs;
    }
    onPlayheadChange(Math.max(0, Math.min(next, total)));
    onPlayingChange(false);
    const clip = clips.find((c) => next >= c.startMs && next < c.endMs);
    if (clip) onActivePageChange(clip.pageId);
  }

  async function onAudioPicked(file: File | null) {
    if (!file || readOnly) return;
    setMusicBusy(true);
    setMusicError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      if (designId) form.set("designId", designId);
      const up = await fetch("/api/studio/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await up.json().catch(() => ({}));
      if (!up.ok || typeof data.url !== "string") {
        setMusicError(typeof data.error === "string" ? data.error : "Upload failed.");
        return;
      }
      const analysis = await analyzeMusicFromUrl(data.url);
      if ("error" in analysis) {
        setMusicError(analysis.error);
        return;
      }
      const track: CanvasSoundtrack = {
        url: data.url,
        fileName: file.name.slice(0, 200),
        durationMs: analysis.durationMs,
        bpm: analysis.bpm,
        beatsMs: analysis.beatsMs,
        snapToBeats: true,
        confidence: analysis.confidence,
        analyzedAt: new Date().toISOString(),
      };
      onChange({ ...doc, soundtrack: track });
    } finally {
      setMusicBusy(false);
      if (audioRef.current) audioRef.current.value = "";
    }
  }

  const beats = soundtrack?.beatsMs ?? [];

  return (
    <div className="shrink-0 border-t border-black/10 bg-[#1a1828] text-white px-3 py-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Timeline</span>
        <button
          type="button"
          className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-white/10 hover:bg-white/20"
          onClick={() => onPlayingChange(!playing)}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <span className="text-[11px] font-mono opacity-70">
          {formatTimelineClock(playheadMs)} / {formatTimelineClock(total)}
        </span>
        {soundtrack?.bpm != null ? (
          <span className="text-[10px] font-semibold text-emerald-300/90">
            {soundtrack.bpm} BPM · {beats.length} beats
            {soundtrack.confidence != null
              ? ` · ${Math.round(soundtrack.confidence * 100)}% conf`
              : ""}
          </span>
        ) : null}
        <span className="text-[10px] opacity-40 ml-auto hidden lg:inline">
          Music beat grid · page clips — not full DAW multi-track yet
        </span>
      </div>

      <div className="relative h-14 rounded-lg bg-black/40 overflow-hidden">
        <div className="absolute inset-0 flex">
          {clips.map((c) => {
            const widthPct = (c.durationMs / total) * 100;
            const active = c.pageId === activePageId;
            return (
              <button
                key={c.pageId}
                type="button"
                title={`${c.name} · ${(c.durationMs / 1000).toFixed(1)}s`}
                onClick={() => {
                  onActivePageChange(c.pageId);
                  setPlayhead(c.startMs);
                }}
                className={`h-full border-r border-white/10 px-1 text-left truncate text-[10px] font-semibold ${
                  active ? "bg-orange-600/80" : "bg-white/10 hover:bg-white/20"
                }`}
                style={{ width: `${widthPct}%`, minWidth: 48 }}
              >
                {c.name}
                <span className="block opacity-70 font-normal">{(c.durationMs / 1000).toFixed(1)}s</span>
              </button>
            );
          })}
        </div>
        {/* Beat grid markers */}
        {beats.map((b) => {
          if (b > total) return null;
          const left = (b / total) * 100;
          return (
            <div
              key={b}
              className="absolute top-0 bottom-0 w-px bg-sky-400/50 pointer-events-none z-[5]"
              style={{ left: `${left}%` }}
              title={`Beat ${formatTimelineClock(b)}`}
            />
          );
        })}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 pointer-events-none z-10"
          style={{ left: `${playheadPct}%` }}
        />
        <input
          type="range"
          min={0}
          max={total}
          step={10}
          value={Math.min(playheadMs, total)}
          onChange={(e) => setPlayhead(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          aria-label="Scrub timeline"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!readOnly ? (
          <label className="flex items-center gap-2 text-[11px] opacity-80">
            Active page duration (s)
            <input
              type="number"
              min={0.5}
              max={30}
              step={0.5}
              value={((doc.pages.find((p) => p.id === activePageId)?.durationMs ?? 2000) / 1000).toFixed(1)}
              onChange={(e) => setPageDuration(activePageId, Number(e.target.value) || 2)}
              className="w-16 rounded border border-white/20 bg-black/30 px-1.5 py-0.5 text-xs"
            />
          </label>
        ) : null}

        {!readOnly ? (
          <>
            <input
              ref={audioRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,.mp3,.wav,.ogg,.m4a"
              className="hidden"
              onChange={(e) => void onAudioPicked(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={musicBusy}
              className="rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-sky-600/80 hover:bg-sky-500 disabled:opacity-50"
              onClick={() => audioRef.current?.click()}
            >
              {musicBusy ? "Analyzing…" : soundtrack ? "Replace music" : "Add music + beats"}
            </button>
            {soundtrack ? (
              <>
                <label className="flex items-center gap-1.5 text-[11px] opacity-80">
                  <input
                    type="checkbox"
                    checked={soundtrack.snapToBeats}
                    onChange={(e) =>
                      onChange({
                        ...doc,
                        soundtrack: { ...soundtrack, snapToBeats: e.target.checked },
                      })
                    }
                  />
                  Snap scrub to beats
                </label>
                <button
                  type="button"
                  className="text-[11px] underline opacity-60"
                  onClick={() => onChange({ ...doc, soundtrack: null })}
                >
                  Remove music
                </button>
              </>
            ) : null}
          </>
        ) : null}
        {musicError ? <p className="text-[11px] text-red-300 w-full">{musicError}</p> : null}
        {soundtrack?.fileName ? (
          <p className="text-[10px] opacity-50 truncate max-w-[200px]">{soundtrack.fileName}</p>
        ) : null}
      </div>
    </div>
  );
}

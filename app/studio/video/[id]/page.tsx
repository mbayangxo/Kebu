"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  addAssetToComposition,
  addClipFromAsset,
  compositionDurationMs,
  deleteClip,
  newCompositionId,
  splitClipAt,
  updateClip,
  type CompositionAsset,
  type CompositionClip,
  type StudioComposition,
} from "@/lib/studio/composition";

const HISTORY_CAP = 40;

type SaveState = "idle" | "saving" | "saved" | "error";

/** Phase 1: multi-track video editor — upload · place · trim · move · split · autosave. */
export default function StudioVideoEditorPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [title, setTitle] = useState("");
  const [comp, setComp] = useState<StudioComposition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pxPerSec, setPxPerSec] = useState(60);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [history, setHistory] = useState<StudioComposition[]>([]);
  const [future, setFuture] = useState<StudioComposition[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compRef = useRef<StudioComposition | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studio/video/${projectId}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Project not found.");
      return;
    }
    setTitle(data.project.title);
    setComp(data.project.composition);
    compRef.current = data.project.composition;
    setHistory([]);
    setFuture([]);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(
    async (next: StudioComposition, nextTitle?: string) => {
      setSaveState("saving");
      const res = await fetch(`/api/studio/video/${projectId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          composition: next,
          title: nextTitle ?? title,
        }),
      });
      if (res.ok) {
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1600);
      } else {
        setSaveState("error");
      }
    },
    [projectId, title],
  );

  function applyComp(next: StudioComposition, recordHistory = true) {
    if (recordHistory && compRef.current) {
      setHistory((h) => [...h.slice(-(HISTORY_CAP - 1)), compRef.current!]);
      setFuture([]);
    }
    compRef.current = next;
    setComp(next);
  }

  useEffect(() => {
    if (!comp) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void persist(comp);
    }, 1200);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [comp, persist]);

  useEffect(() => {
    if (!playing || !comp) return;
    const total = compositionDurationMs(comp);
    const id = window.setInterval(() => {
      setPlayheadMs((prev) => {
        const next = prev + 100;
        if (next >= total) {
          setPlaying(false);
          return total;
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [playing, comp]);

  /** Sync preview video to active clip under playhead on V1. */
  useEffect(() => {
    if (!comp) return;
    const v1 = comp.tracks.find((t) => t.kind === "video" && t.order === 0) ?? comp.tracks.find((t) => t.kind === "video");
    if (!v1) return;
    const clip = comp.clips.find(
      (c) => c.trackId === v1.id && playheadMs >= c.startMs && playheadMs < c.startMs + c.durationMs,
    );
    const el = videoPreviewRef.current;
    if (!el) return;
    if (!clip?.sourceUrl) {
      el.removeAttribute("src");
      el.load();
      return;
    }
    if (el.src !== clip.sourceUrl) {
      el.src = clip.sourceUrl;
    }
    const local = (playheadMs - clip.startMs) * clip.speed + clip.sourceInMs;
    try {
      if (Math.abs(el.currentTime * 1000 - local) > 200) {
        el.currentTime = local / 1000;
      }
    } catch {
      /* not ready */
    }
    if (playing) void el.play().catch(() => undefined);
    else el.pause();
  }, [comp, playheadMs, playing]);

  async function onUpload(file: File | null) {
    if (!file || !comp) return;
    setUploadBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/studio/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== "string") {
        setError(typeof data.error === "string" ? data.error : "Upload failed.");
        return;
      }
      const kind = (data.kind === "video" || data.kind === "audio" ? data.kind : "image") as
        | "video"
        | "audio"
        | "image";
      const asset: CompositionAsset = {
        id: newCompositionId("as"),
        kind,
        url: data.url,
        fileName: file.name.slice(0, 200),
        durationMs: kind === "image" ? 3000 : null,
      };
      let next = addAssetToComposition(comp, asset);
      const placed = addClipFromAsset(next, asset.id, { atMs: playheadMs });
      if (!("error" in placed)) next = placed;
      applyComp(next);
    } finally {
      setUploadBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function placeAsset(assetId: string) {
    if (!comp) return;
    const placed = addClipFromAsset(comp, assetId, { atMs: playheadMs });
    if ("error" in placed) {
      setError(placed.error);
      return;
    }
    applyComp(placed);
  }

  function undo() {
    setHistory((h) => {
      if (!h.length || !compRef.current) return h;
      const prev = h[h.length - 1]!;
      setFuture((f) => [compRef.current!, ...f].slice(0, HISTORY_CAP));
      compRef.current = prev;
      setComp(prev);
      return h.slice(0, -1);
    });
  }

  function redo() {
    setFuture((f) => {
      if (!f.length || !compRef.current) return f;
      const next = f[0]!;
      setHistory((h) => [...h, compRef.current!].slice(-HISTORY_CAP));
      compRef.current = next;
      setComp(next);
      return f.slice(1);
    });
  }

  if (error && !comp) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-red-700">{error}</p>
        <Link href="/studio" className="underline text-sm">
          Back to Studio
        </Link>
      </div>
    );
  }

  if (!comp) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading video…</div>;
  }

  const totalMs = compositionDurationMs(comp);
  const selected = comp.clips.find((c) => c.id === selectedClipId) ?? null;
  const tracks = [...comp.tracks].sort((a, b) => a.order - b.order);
  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "Autosave on";

  return (
    <div className="min-h-screen flex flex-col bg-[#14121f] text-white">
      <header className="shrink-0 border-b border-white/10 px-3 py-2 flex flex-wrap items-center gap-2">
        <Link href="/studio" className="text-xs underline opacity-60">
          ← Studio
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => comp && void persist(comp, title)}
          className="bg-transparent font-display font-bold text-sm min-w-[140px] flex-1 border-b border-transparent focus:border-orange-500 outline-none"
        />
        <span className="text-[10px] uppercase tracking-wider opacity-50">{saveLabel}</span>
        <button
          type="button"
          disabled={!history.length}
          onClick={undo}
          className="rounded-lg px-2 py-1 text-xs bg-white/10 disabled:opacity-30"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={!future.length}
          onClick={redo}
          className="rounded-lg px-2 py-1 text-xs bg-white/10 disabled:opacity-30"
        >
          Redo
        </button>
        <button
          type="button"
          onClick={() => void persist(comp)}
          className="rounded-full px-3 py-1.5 text-xs font-bold text-white"
          style={{ background: "#E05A2B" }}
        >
          Save now
        </button>
      </header>

      {error ? <p className="px-3 py-1 text-xs text-red-300 bg-red-950/40">{error}</p> : null}

      <div className="flex flex-1 min-h-0">
        {/* Left: media */}
        <aside className="w-[200px] shrink-0 border-r border-white/10 flex flex-col bg-[#1a1828]">
          <div className="p-2 border-b border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Media</p>
            <input
              ref={fileRef}
              type="file"
              accept="video/*,audio/*,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={uploadBusy}
              onClick={() => fileRef.current?.click()}
              className="mt-2 w-full rounded-lg py-2 text-xs font-bold bg-orange-600 disabled:opacity-50"
            >
              {uploadBusy ? "Uploading…" : "Upload"}
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto p-2 space-y-1">
            {comp.assets.length === 0 ? (
              <li className="text-[11px] opacity-40 p-2 leading-relaxed">
                Upload video, audio, or images. They save with the project.
              </li>
            ) : (
              comp.assets.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => placeAsset(a.id)}
                    className="w-full text-left rounded-lg px-2 py-1.5 text-[11px] hover:bg-white/10 border border-white/5"
                    title="Add to timeline at playhead"
                  >
                    <span className="font-semibold truncate block">{a.fileName || a.kind}</span>
                    <span className="opacity-40 uppercase text-[9px]">{a.kind}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        {/* Center: preview */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0c0b14]">
          <div className="flex-1 flex items-center justify-center p-4 min-h-[200px]">
            <div
              className="relative bg-black rounded-lg overflow-hidden shadow-2xl border border-white/10"
              style={{
                width: Math.min(360, (comp.width / comp.height) * 280),
                aspectRatio: `${comp.width} / ${comp.height}`,
              }}
            >
              <video
                ref={videoPreviewRef}
                className="absolute inset-0 w-full h-full object-contain"
                playsInline
                muted={false}
              />
              {!comp.clips.some((c) => c.sourceUrl) ? (
                <p className="absolute inset-0 flex items-center justify-center text-xs opacity-40 px-4 text-center">
                  Upload media and add clips to preview
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10">
            <button
              type="button"
              className="rounded-lg px-3 py-1 text-xs font-bold bg-white/15"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <span className="text-[11px] font-mono opacity-60">
              {(playheadMs / 1000).toFixed(1)}s / {(totalMs / 1000).toFixed(1)}s
            </span>
            <label className="text-[10px] opacity-50 ml-auto flex items-center gap-1">
              Zoom
              <input
                type="range"
                min={20}
                max={160}
                value={pxPerSec}
                onChange={(e) => setPxPerSec(Number(e.target.value))}
              />
            </label>
          </div>
        </main>

        {/* Right: inspector */}
        <aside className="w-[220px] shrink-0 border-l border-white/10 bg-[#1a1828] p-3 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400 mb-2">Inspector</p>
          {!selected ? (
            <p className="text-[11px] opacity-40 leading-relaxed">Select a clip on the timeline.</p>
          ) : (
            <ClipInspector
              clip={selected}
              onChange={(patch) => {
                const next = updateClip(comp, selected.id, patch);
                if (!("error" in next)) applyComp(next);
              }}
              onDelete={() => {
                applyComp(deleteClip(comp, selected.id));
                setSelectedClipId(null);
              }}
              onSplit={() => {
                const next = splitClipAt(comp, selected.id, playheadMs);
                if ("error" in next) setError(next.error);
                else applyComp(next);
              }}
            />
          )}
        </aside>
      </div>

      {/* Timeline */}
      <div className="shrink-0 border-t border-white/10 bg-[#12101c] px-2 py-2 space-y-1 max-h-[280px] overflow-auto">
        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400 px-1">Timeline</p>
        <div className="relative" style={{ minWidth: (totalMs / 1000) * pxPerSec + 80 }}>
          {/* Ruler */}
          <div className="h-5 ml-14 relative border-b border-white/10 mb-1">
            {Array.from({ length: Math.ceil(totalMs / 1000) + 1 }).map((_, i) => (
              <span
                key={i}
                className="absolute text-[9px] opacity-40 font-mono"
                style={{ left: i * pxPerSec }}
              >
                {i}s
              </span>
            ))}
          </div>
          {tracks.map((track) => (
            <div key={track.id} className="flex items-stretch gap-1 mb-1">
              <div className="w-14 shrink-0 text-[10px] font-semibold opacity-60 flex items-center px-1">
                {track.name}
              </div>
              <div
                className="relative h-10 flex-1 rounded bg-black/40 border border-white/5"
                style={{ width: (totalMs / 1000) * pxPerSec }}
                onClick={() => setSelectedClipId(null)}
              >
                {comp.clips
                  .filter((c) => c.trackId === track.id)
                  .map((clip) => (
                    <TimelineClipBlock
                      key={clip.id}
                      clip={clip}
                      pxPerSec={pxPerSec}
                      selected={clip.id === selectedClipId}
                      locked={track.locked}
                      onSelect={() => setSelectedClipId(clip.id)}
                      onMove={(startMs) => {
                        const next = updateClip(comp, clip.id, { startMs: Math.max(0, startMs) });
                        if (!("error" in next)) applyComp(next);
                      }}
                      onTrim={(durationMs) => {
                        const next = updateClip(comp, clip.id, {
                          durationMs: Math.max(200, durationMs),
                        });
                        if (!("error" in next)) applyComp(next);
                      }}
                    />
                  ))}
              </div>
            </div>
          ))}
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 pointer-events-none z-20"
            style={{ left: 56 + (playheadMs / 1000) * pxPerSec }}
          />
          <input
            type="range"
            min={0}
            max={totalMs}
            step={50}
            value={Math.min(playheadMs, totalMs)}
            onChange={(e) => {
              setPlaying(false);
              setPlayheadMs(Number(e.target.value));
            }}
            className="w-full mt-1 ml-14 opacity-70"
            aria-label="Scrub playhead"
          />
        </div>
      </div>
    </div>
  );
}

function TimelineClipBlock({
  clip,
  pxPerSec,
  selected,
  locked,
  onSelect,
  onMove,
  onTrim,
}: {
  clip: CompositionClip;
  pxPerSec: number;
  selected: boolean;
  locked: boolean;
  onSelect: () => void;
  onMove: (startMs: number) => void;
  onTrim: (durationMs: number) => void;
}) {
  const drag = useRef<{ mode: "move" | "trim"; originX: number; startMs: number; durationMs: number } | null>(
    null,
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={(e) => {
        if (locked || e.button !== 0) return;
        e.stopPropagation();
        onSelect();
        const mode = (e.target as HTMLElement).dataset.handle === "trim" ? "trim" : "move";
        drag.current = {
          mode,
          originX: e.clientX,
          startMs: clip.startMs,
          durationMs: clip.durationMs,
        };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.originX;
        const dMs = Math.round((dx / pxPerSec) * 1000);
        if (drag.current.mode === "move") {
          onMove(drag.current.startMs + dMs);
        } else {
          onTrim(drag.current.durationMs + dMs);
        }
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      className={`absolute top-1 bottom-1 rounded px-1 text-[10px] font-semibold truncate cursor-grab active:cursor-grabbing ${
        selected ? "ring-2 ring-orange-400 bg-orange-600/90" : "bg-sky-700/80 hover:bg-sky-600/90"
      }`}
      style={{
        left: (clip.startMs / 1000) * pxPerSec,
        width: Math.max(12, (clip.durationMs / 1000) * pxPerSec),
      }}
      title={clip.name}
    >
      {clip.name}
      <span
        data-handle="trim"
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/30"
      />
    </div>
  );
}

function ClipInspector({
  clip,
  onChange,
  onDelete,
  onSplit,
}: {
  clip: CompositionClip;
  onChange: (patch: Partial<CompositionClip>) => void;
  onDelete: () => void;
  onSplit: () => void;
}) {
  return (
    <div className="space-y-2 text-xs">
      <p className="font-semibold truncate">{clip.name}</p>
      <label className="block opacity-80">
        Start (ms)
        <input
          type="number"
          className="mt-0.5 w-full rounded bg-black/40 border border-white/10 px-2 py-1"
          value={clip.startMs}
          onChange={(e) => onChange({ startMs: Math.max(0, Number(e.target.value) || 0) })}
        />
      </label>
      <label className="block opacity-80">
        Duration (ms)
        <input
          type="number"
          className="mt-0.5 w-full rounded bg-black/40 border border-white/10 px-2 py-1"
          value={clip.durationMs}
          onChange={(e) => onChange({ durationMs: Math.max(200, Number(e.target.value) || 200) })}
        />
      </label>
      <label className="block opacity-80">
        Source in (ms)
        <input
          type="number"
          className="mt-0.5 w-full rounded bg-black/40 border border-white/10 px-2 py-1"
          value={clip.sourceInMs}
          onChange={(e) => onChange({ sourceInMs: Math.max(0, Number(e.target.value) || 0) })}
        />
      </label>
      <label className="block opacity-80">
        Volume
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={clip.volume}
          onChange={(e) => onChange({ volume: Number(e.target.value) })}
          className="w-full"
        />
      </label>
      <label className="block opacity-80">
        Opacity
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={clip.opacity}
          onChange={(e) => onChange({ opacity: Number(e.target.value) })}
          className="w-full"
        />
      </label>
      <label className="block opacity-80">
        Speed
        <input
          type="number"
          min={0.25}
          max={4}
          step={0.25}
          className="mt-0.5 w-full rounded bg-black/40 border border-white/10 px-2 py-1"
          value={clip.speed}
          onChange={(e) => onChange({ speed: Math.max(0.25, Number(e.target.value) || 1) })}
        />
      </label>
      <button
        type="button"
        onClick={onSplit}
        className="w-full rounded-lg py-1.5 font-bold bg-white/10"
      >
        Split at playhead
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="w-full rounded-lg py-1.5 font-bold text-red-300 border border-red-400/30"
      >
        Delete clip
      </button>
    </div>
  );
}

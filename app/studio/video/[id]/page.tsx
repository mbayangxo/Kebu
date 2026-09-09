"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  addAssetToComposition,
  addClipFromAsset,
  addMarker,
  addStoryboardScene,
  attachSoundtrack,
  compileStoryboardToClips,
  compositionDurationMs,
  deleteClip,
  deleteMarker,
  maybeSnapTime,
  newCompositionId,
  primaryVideoTrackId,
  removeStoryboardScene,
  splitClipAt,
  updateClip,
  updateStoryboardScene,
  type CompositionAsset,
  type CompositionClip,
  type StudioComposition,
} from "@/lib/studio/composition";
import { buildQuickEditMontage, quickEditSummary } from "@/lib/studio/quick-edit";
import { nestProjectAsClip } from "@/lib/studio/nested-sequence";
import { cssFilterFromGrade } from "@/lib/studio/clip-color";
import { analyzeMusicFromUrl } from "@/lib/studio/music-analysis";
import {
  addTransition,
  applyAudioReactivePreset,
  clipTransformAtTime,
  upsertKeyframe,
  type AudioReactivePreset,
} from "@/lib/studio/keyframes";
import { applyAiMusicCommand } from "@/lib/studio/ai-music-edit";

const HISTORY_CAP = 40;

type SaveState = "idle" | "saving" | "saved" | "error";

/** Full Timeline: multi-track + music-aware V1 → keyframes V2 → AI music edit V3. */
export default function StudioVideoEditorPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [title, setTitle] = useState("");
  const [comp, setComp] = useState<StudioComposition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pxPerSec, setPxPerSec] = useState(60);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [musicBusy, setMusicBusy] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("cut every 4 beats");
  const [aiBusy, setAiBusy] = useState(false);
  const [qeSelected, setQeSelected] = useState<string[]>([]);
  const [qeBeatAligned, setQeBeatAligned] = useState(true);
  const [qeClipSec, setQeClipSec] = useState(2.5);
  const [captionText, setCaptionText] = useState("");
  const [captionBusy, setCaptionBusy] = useState(false);
  const [otherProjects, setOtherProjects] = useState<{ id: string; title: string }[]>([]);
  const [history, setHistory] = useState<StudioComposition[]>([]);
  const [future, setFuture] = useState<StudioComposition[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const musicRef = useRef<HTMLInputElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compRef = useRef<StudioComposition | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const soundtrackRef = useRef<HTMLAudioElement>(null);

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

  useEffect(() => {
    void fetch("/api/studio/video", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d.projects) ? d.projects : [];
        setOtherProjects(
          list
            .filter((p: { id: string }) => p.id !== projectId)
            .map((p: { id: string; title: string }) => ({ id: p.id, title: p.title })),
        );
      })
      .catch(() => undefined);
  }, [projectId]);

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

  useEffect(() => {
    if (!comp) return;
    const v1 =
      comp.tracks.find((t) => t.kind === "video" && t.order === 0) ??
      comp.tracks.find((t) => t.kind === "video");
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
    if (el.src !== clip.sourceUrl) el.src = clip.sourceUrl;
    const local = (playheadMs - clip.startMs) * clip.speed + clip.sourceInMs;
    const xf = clipTransformAtTime(comp, clip, playheadMs);
    el.style.opacity = String(xf.opacity);
    el.style.transform = `translate(${xf.x}px, ${xf.y}px) scale(${xf.scale}) rotate(${xf.rotation}deg)`;
    el.volume = Math.min(1, xf.volume);
    el.playbackRate = Math.max(0.1, Math.min(8, clip.speed));
    el.style.filter = cssFilterFromGrade({
      brightness: clip.brightness ?? 0,
      contrast: clip.contrast ?? 0,
      saturation: clip.saturation ?? 0,
    });
    try {
      if (Math.abs(el.currentTime * 1000 - local) > 200) el.currentTime = local / 1000;
    } catch {
      /* not ready */
    }
    if (playing) void el.play().catch(() => undefined);
    else el.pause();
  }, [comp, playheadMs, playing]);

  useEffect(() => {
    const audio = soundtrackRef.current;
    const url = comp?.music?.soundtrackUrl;
    if (!audio || !url) return;
    if (audio.src !== url) audio.src = url;
    try {
      if (Math.abs(audio.currentTime * 1000 - playheadMs) > 180) {
        audio.currentTime = playheadMs / 1000;
      }
    } catch {
      /* ignore */
    }
    if (playing) void audio.play().catch(() => undefined);
    else audio.pause();
  }, [comp?.music?.soundtrackUrl, playheadMs, playing]);

  function setPlayhead(ms: number, fromUser = true) {
    if (!comp) return;
    let next = Math.max(0, Math.min(ms, compositionDurationMs(comp)));
    if (fromUser) next = maybeSnapTime(comp, next);
    setPlaying(false);
    setPlayheadMs(next);
  }

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

  async function onSoundtrack(file: File | null) {
    if (!file || !comp) return;
    setMusicBusy(true);
    setError(null);
    setNote(null);
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
        setError(typeof data.error === "string" ? data.error : "Soundtrack upload failed.");
        return;
      }
      const analysis = await analyzeMusicFromUrl(data.url);
      if ("error" in analysis) {
        setError(analysis.error);
        return;
      }
      const next = attachSoundtrack(comp, {
        url: data.url,
        fileName: file.name,
        analysis,
      });
      applyComp(next);
      setNote(
        `Soundtrack · ${analysis.bpm} BPM · ${analysis.beatsMs.length} beats · energy curve ready (Audio Reactive foundation).`,
      );
    } finally {
      setMusicBusy(false);
      if (musicRef.current) musicRef.current.value = "";
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

  function addScene() {
    if (!comp) return;
    applyComp(addStoryboardScene(comp));
    setNote("Storyboard scene added. Compile to place clips on the video track.");
  }

  function compileStoryboard() {
    if (!comp) return;
    const trackId = primaryVideoTrackId(comp);
    if (!trackId) {
      setError("No video track in this composition.");
      return;
    }
    if (!comp.storyboard.length) {
      setError("Add at least one storyboard scene first.");
      return;
    }
    applyComp(compileStoryboardToClips(comp, trackId));
    setNote(`Compiled ${comp.storyboard.length} scene(s) onto the video track.`);
  }

  function runQuickEdit() {
    if (!comp) return;
    const next = buildQuickEditMontage(comp, {
      assetIds: qeSelected.length ? qeSelected : comp.assets.map((a) => a.id),
      clipDurationMs: Math.round(qeClipSec * 1000),
      beatAligned: qeBeatAligned,
      everyNthBeat: 4,
      replaceVideoTrack: true,
    });
    if ("error" in next) {
      setError(next.error);
      return;
    }
    applyComp(next);
    const summary = quickEditSummary(next, qeSelected.length ? qeSelected : next.assets.map((a) => a.id), Math.round(qeClipSec * 1000));
    setNote(`Quick Edit montage · ${summary.clipCount} clips · ~${summary.estimatedDurationLabel}`);
  }

  async function applyCaptions(opts: { whisper?: boolean } = {}) {
    if (!comp) return;
    setCaptionBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/video/${projectId}/captions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          opts.whisper
            ? { useWhisper: true }
            : { transcript: captionText.trim() },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Captions failed.");
        return;
      }
      if (data.project?.composition) {
        applyComp(data.project.composition);
      } else {
        await load();
      }
      setNote(`Captions applied · ${data.captionCount ?? "?"} lines (${data.source ?? "transcript"})`);
    } finally {
      setCaptionBusy(false);
    }
  }

  async function nestOtherProject(nestedId: string) {
    if (!comp) return;
    const res = await fetch(`/api/studio/video/${nestedId}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load nested project.");
      return;
    }
    const next = nestProjectAsClip(comp, {
      nestedProjectId: nestedId,
      nestedTitle: data.project.title ?? "Sequence",
      nestedComposition: data.project.composition,
      atMs: playheadMs,
    });
    if ("error" in next) {
      setError(next.error);
      return;
    }
    applyComp(next);
    setNote(`Nested sequence “${data.project.title}” placed on timeline.`);
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

  function runAiEdit() {
    if (!comp) return;
    setAiBusy(true);
    setError(null);
    const result = applyAiMusicCommand(comp, aiPrompt, {
      clipId: selectedClipId ?? undefined,
    });
    setAiBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    applyComp(result.composition);
    setNote(result.summary);
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
  const peaks = comp.music?.peaks ?? [];
  const beats = comp.music?.beatsMs ?? [];
  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : "Autosave on";

  return (
    <div className="min-h-screen flex flex-col bg-[#14121f] text-white">
      <audio ref={soundtrackRef} preload="auto" className="hidden" />
      <header className="shrink-0 border-b border-white/10 px-3 py-2 flex flex-wrap items-center gap-2">
        <Link href="/studio" className="text-xs underline opacity-60">
          ← Studio
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => void persist(comp, title)}
          className="bg-transparent font-display font-bold text-sm min-w-[140px] flex-1 border-b border-transparent focus:border-orange-500 outline-none"
        />
        <span className="text-[10px] uppercase tracking-wider opacity-50">{saveLabel}</span>
        {comp.music?.bpm ? (
          <span className="text-[10px] font-mono text-emerald-300/90">
            {comp.music.bpm} BPM
            {comp.music.confidence != null ? ` · ${Math.round(comp.music.confidence * 100)}%` : ""}
          </span>
        ) : null}
        <button type="button" disabled={!history.length} onClick={undo} className="rounded-lg px-2 py-1 text-xs bg-white/10 disabled:opacity-30">
          Undo
        </button>
        <button type="button" disabled={!future.length} onClick={redo} className="rounded-lg px-2 py-1 text-xs bg-white/10 disabled:opacity-30">
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
      {note ? <p className="px-3 py-1 text-xs text-emerald-200/90 bg-emerald-950/30">{note}</p> : null}

      <div className="flex flex-1 min-h-0">
        <aside className="w-[200px] shrink-0 border-r border-white/10 flex flex-col bg-[#1a1828]">
          <div className="p-2 border-b border-white/10 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Media</p>
            <input
              ref={fileRef}
              type="file"
              accept="video/*,audio/*,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
            />
            <input
              ref={musicRef}
              type="file"
              accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/*"
              className="hidden"
              onChange={(e) => void onSoundtrack(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={uploadBusy}
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg py-2 text-xs font-bold bg-orange-600 disabled:opacity-50"
            >
              {uploadBusy ? "Uploading…" : "Upload clip"}
            </button>
            <button
              type="button"
              disabled={musicBusy}
              onClick={() => musicRef.current?.click()}
              className="w-full rounded-lg py-2 text-xs font-bold bg-emerald-700 disabled:opacity-50"
            >
              {musicBusy ? "Analyzing…" : "Soundtrack"}
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto p-2 space-y-1">
            {comp.assets.length === 0 ? (
              <li className="text-[11px] opacity-40 p-2 leading-relaxed">
                Upload clips, then a soundtrack for BPM, waveform, and Audio Reactive.
              </li>
            ) : (
              comp.assets.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => placeAsset(a.id)}
                    className="w-full text-left rounded-lg px-2 py-1.5 text-[11px] hover:bg-white/10 border border-white/5"
                  >
                    <span className="font-semibold truncate block">{a.fileName || a.kind}</span>
                    <span className="opacity-40 uppercase text-[9px]">{a.kind}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="p-2 border-t border-white/10 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Quick Edit</p>
            <p className="text-[10px] opacity-50 leading-relaxed">
              Montage wizard: pick clips → auto-arrange → optional beat cuts.
            </p>
            <ul className="max-h-28 overflow-y-auto space-y-1">
              {comp.assets.filter((a) => a.kind === "video" || a.kind === "image").map((a) => {
                const on = qeSelected.includes(a.id) || qeSelected.length === 0;
                return (
                  <li key={a.id}>
                    <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={qeSelected.includes(a.id)}
                        onChange={(e) => {
                          setQeSelected((prev) =>
                            e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id),
                          );
                        }}
                      />
                      <span className={on ? "opacity-90" : "opacity-40"}>{a.fileName || a.kind}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <label className="flex items-center gap-1 text-[10px] opacity-70">
              Clip sec
              <input
                type="number"
                min={0.5}
                max={15}
                step={0.5}
                value={qeClipSec}
                onChange={(e) => setQeClipSec(Number(e.target.value) || 2.5)}
                className="w-14 rounded bg-black/40 border border-white/10 px-1 py-0.5"
              />
            </label>
            <label className="flex items-center gap-1 text-[10px] opacity-70">
              <input
                type="checkbox"
                checked={qeBeatAligned}
                onChange={(e) => setQeBeatAligned(e.target.checked)}
              />
              Beat-aligned cuts
            </label>
            <button
              type="button"
              onClick={runQuickEdit}
              className="w-full rounded-lg py-1.5 text-[11px] font-bold bg-sky-700"
            >
              Build montage
            </button>
          </div>

          <div className="p-2 border-t border-white/10 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Captions</p>
            <textarea
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              rows={3}
              placeholder="Paste transcript…"
              className="w-full rounded-lg bg-black/40 border border-white/10 px-2 py-1.5 text-[11px]"
            />
            <button
              type="button"
              disabled={captionBusy || !captionText.trim()}
              onClick={() => void applyCaptions()}
              className="w-full rounded-lg py-1.5 text-[11px] font-bold bg-white/10 disabled:opacity-40"
            >
              {captionBusy ? "…" : "Apply transcript"}
            </button>
            <button
              type="button"
              disabled={captionBusy}
              onClick={() => void applyCaptions({ whisper: true })}
              className="w-full rounded-lg py-1.5 text-[11px] font-bold bg-teal-800 disabled:opacity-40"
              title="Requires OPENAI_API_KEY on the server"
            >
              Auto (Whisper)
            </button>
          </div>

          <div className="p-2 border-t border-white/10 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Nested sequence</p>
            {otherProjects.length === 0 ? (
              <p className="text-[10px] opacity-40">Create another video project to nest it here.</p>
            ) : (
              <select
                className="w-full rounded-lg bg-black/40 border border-white/10 px-2 py-1.5 text-[11px]"
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) void nestOtherProject(id);
                  e.target.value = "";
                }}
              >
                <option value="">Insert project…</option>
                {otherProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="p-2 border-t border-white/10 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Storyboard</p>
            <p className="text-[10px] opacity-50 leading-relaxed">
              CapCut-path V2: outline scenes, then compile to the video track.
            </p>
            <button
              type="button"
              onClick={addScene}
              className="w-full rounded-lg py-1.5 text-[11px] font-bold bg-white/10 hover:bg-white/15"
            >
              Add scene
            </button>
            <ul className="max-h-36 overflow-y-auto space-y-1">
              {[...comp.storyboard]
                .sort((a, b) => a.order - b.order)
                .map((s) => (
                  <li key={s.id} className="rounded-lg border border-white/10 p-1.5 space-y-1">
                    <input
                      value={s.name}
                      onChange={(e) => applyComp(updateStoryboardScene(comp, s.id, { name: e.target.value }))}
                      className="w-full rounded bg-black/40 border border-white/10 px-1.5 py-1 text-[11px]"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0.5}
                        max={60}
                        step={0.5}
                        value={s.durationMs / 1000}
                        onChange={(e) =>
                          applyComp(
                            updateStoryboardScene(comp, s.id, {
                              durationMs: Math.round((Number(e.target.value) || 3) * 1000),
                            }),
                          )
                        }
                        className="w-16 rounded bg-black/40 border border-white/10 px-1 py-0.5 text-[10px]"
                      />
                      <span className="text-[9px] opacity-40">sec</span>
                      <button
                        type="button"
                        className="ml-auto text-[10px] text-red-400 underline"
                        onClick={() => applyComp(removeStoryboardScene(comp, s.id))}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
            <button
              type="button"
              onClick={compileStoryboard}
              className="w-full rounded-lg py-1.5 text-[11px] font-bold bg-orange-600 disabled:opacity-50"
              disabled={!comp.storyboard.length}
            >
              Compile to timeline
            </button>
          </div>
          <div className="p-2 border-t border-white/10 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">AI music edit</p>
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full rounded-lg bg-black/40 border border-white/10 px-2 py-1.5 text-[11px]"
              placeholder="cut every 4 beats"
            />
            <button
              type="button"
              disabled={aiBusy}
              onClick={runAiEdit}
              className="w-full rounded-lg py-1.5 text-[11px] font-bold bg-violet-700 disabled:opacity-50"
            >
              {aiBusy ? "…" : "Apply"}
            </button>
          </div>
        </aside>

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
                className="absolute inset-0 w-full h-full object-contain transition-opacity"
                playsInline
              />
              {(() => {
                const capTrack = comp.tracks.find((t) => t.kind === "caption");
                if (!capTrack) return null;
                const cap = comp.clips.find(
                  (c) =>
                    c.trackId === capTrack.id &&
                    c.captionText &&
                    playheadMs >= c.startMs &&
                    playheadMs < c.startMs + c.durationMs,
                );
                if (!cap?.captionText) return null;
                return (
                  <p className="absolute bottom-3 left-2 right-2 text-center text-[11px] font-bold px-2 py-1 rounded bg-black/70 text-white leading-snug">
                    {cap.captionText}
                  </p>
                );
              })()}
              {!comp.clips.some((c) => c.sourceUrl) ? (
                <p className="absolute inset-0 flex items-center justify-center text-xs opacity-40 px-4 text-center">
                  Upload media and add clips to preview
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-white/10">
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
            <label className="flex items-center gap-1 text-[10px] opacity-70">
              <input
                type="checkbox"
                checked={comp.snapToBeats}
                onChange={(e) => applyComp({ ...comp, snapToBeats: e.target.checked })}
              />
              Snap to beats
            </label>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-[10px] font-bold bg-white/10"
              onClick={() => {
                applyComp(addMarker(comp, playheadMs, "Marker"));
                setNote(`Marker at ${(playheadMs / 1000).toFixed(1)}s`);
              }}
            >
              + Marker
            </button>
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

        <aside className="w-[240px] shrink-0 border-l border-white/10 bg-[#1a1828] p-3 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400 mb-2">Inspector</p>
          {!selected ? (
            <div className="space-y-2 text-[11px] opacity-50 leading-relaxed">
              <p>Select a clip. Soundtrack · markers · snaps live on the timeline.</p>
              {comp.music?.sections?.length ? (
                <ul className="space-y-1 opacity-80">
                  {comp.music.sections.slice(0, 8).map((s) => (
                    <li key={s.id}>
                      {s.label} · {(s.startMs / 1000).toFixed(1)}–{(s.endMs / 1000).toFixed(1)}s
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <ClipInspector
              clip={selected}
              playheadLocalMs={Math.max(0, playheadMs - selected.startMs)}
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
              onKeyframe={(property, value) => {
                const row = upsertKeyframe(comp, {
                  clipId: selected.id,
                  property,
                  timeMs: Math.max(0, playheadMs - selected.startMs),
                  value,
                });
                if ("error" in row) setError(row.error);
                else {
                  applyComp(row);
                  setNote(`Keyframe ${property} @ playhead`);
                }
              }}
              onReactive={(preset) => {
                const row = applyAudioReactivePreset(comp, selected.id, preset);
                if ("error" in row) setError(row.error);
                else {
                  applyComp(row);
                  setNote(`Audio Reactive: ${preset.replace(/_/g, " ")}`);
                }
              }}
              onFadeTransition={() => {
                const sameTrack = comp.clips
                  .filter((c) => c.trackId === selected.trackId)
                  .sort((a, b) => a.startMs - b.startMs);
                const idx = sameTrack.findIndex((c) => c.id === selected.id);
                const nextClip = sameTrack[idx + 1];
                if (!nextClip) {
                  setError("Need a following clip on the same track for a transition.");
                  return;
                }
                const row = addTransition(comp, {
                  fromClipId: selected.id,
                  toClipId: nextClip.id,
                  kind: "fade",
                  durationMs: 400,
                });
                if ("error" in row) setError(row.error);
                else {
                  applyComp(row);
                  setNote("Fade transition to next clip");
                }
              }}
            />
          )}
        </aside>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-[#12101c] px-2 py-2 space-y-1 max-h-[320px] overflow-auto">
        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400 px-1">
          Timeline · multi-track · music-aware
        </p>
        <div className="relative" style={{ minWidth: (totalMs / 1000) * pxPerSec + 80 }}>
          <div className="h-5 ml-14 relative border-b border-white/10 mb-1">
            {Array.from({ length: Math.ceil(totalMs / 1000) + 1 }).map((_, i) => (
              <span key={i} className="absolute text-[9px] opacity-40 font-mono" style={{ left: i * pxPerSec }}>
                {i}s
              </span>
            ))}
            {beats.map((b) => (
              <span
                key={`b-${b}`}
                className="absolute top-0 bottom-0 w-px bg-emerald-400/40"
                style={{ left: (b / 1000) * pxPerSec }}
              />
            ))}
            {comp.markers.map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.label ?? "Marker"}
                onClick={() => setPlayhead(m.timeMs, false)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  applyComp(deleteMarker(comp, m.id));
                }}
                className="absolute top-0 h-full w-0.5 bg-amber-400 z-10"
                style={{ left: (m.timeMs / 1000) * pxPerSec }}
              />
            ))}
          </div>

          {peaks.length ? (
            <div className="ml-14 h-8 mb-1 flex items-end gap-px opacity-70" style={{ width: (totalMs / 1000) * pxPerSec }}>
              {peaks.map((p, i) => (
                <span
                  key={i}
                  className="flex-1 bg-emerald-500/50 rounded-t-sm min-w-[1px]"
                  style={{ height: `${Math.max(8, p * 100)}%` }}
                />
              ))}
            </div>
          ) : null}

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
                        const snapped = maybeSnapTime(comp, Math.max(0, startMs));
                        const next = updateClip(comp, clip.id, { startMs: snapped });
                        if (!("error" in next)) applyComp(next);
                      }}
                      onTrim={(durationMs) => {
                        const end = maybeSnapTime(comp, clip.startMs + Math.max(200, durationMs));
                        const next = updateClip(comp, clip.id, {
                          durationMs: Math.max(200, end - clip.startMs),
                        });
                        if (!("error" in next)) applyComp(next);
                      }}
                    />
                  ))}
              </div>
            </div>
          ))}

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
            onChange={(e) => setPlayhead(Number(e.target.value))}
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
        if (drag.current.mode === "move") onMove(drag.current.startMs + dMs);
        else onTrim(drag.current.durationMs + dMs);
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
      {(clip.fadeInMs > 0 || clip.fadeOutMs > 0) && (
        <span className="absolute inset-y-0 left-0 w-1 bg-white/40 rounded-l" />
      )}
      <span data-handle="trim" className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/30" />
    </div>
  );
}

function ClipInspector({
  clip,
  playheadLocalMs,
  onChange,
  onDelete,
  onSplit,
  onKeyframe,
  onReactive,
  onFadeTransition,
}: {
  clip: CompositionClip;
  playheadLocalMs: number;
  onChange: (patch: Partial<CompositionClip>) => void;
  onDelete: () => void;
  onSplit: () => void;
  onKeyframe: (property: "opacity" | "scale" | "x" | "y" | "rotation" | "volume", value: number) => void;
  onReactive: (preset: AudioReactivePreset) => void;
  onFadeTransition: () => void;
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
      <div className="grid grid-cols-2 gap-2">
        <label className="block opacity-80">
          Fade in
          <input
            type="number"
            min={0}
            className="mt-0.5 w-full rounded bg-black/40 border border-white/10 px-2 py-1"
            value={clip.fadeInMs}
            onChange={(e) => onChange({ fadeInMs: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <label className="block opacity-80">
          Fade out
          <input
            type="number"
            min={0}
            className="mt-0.5 w-full rounded bg-black/40 border border-white/10 px-2 py-1"
            value={clip.fadeOutMs}
            onChange={(e) => onChange({ fadeOutMs: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
      </div>
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
        Scale
        <input
          type="number"
          min={0.1}
          max={4}
          step={0.05}
          className="mt-0.5 w-full rounded bg-black/40 border border-white/10 px-2 py-1"
          value={clip.scale}
          onChange={(e) => onChange({ scale: Math.max(0.1, Number(e.target.value) || 1) })}
        />
      </label>
      <label className="block opacity-80">
        Speed
        <div className="flex flex-wrap gap-1 mt-1 mb-1">
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ speed: s })}
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                Math.abs(clip.speed - s) < 0.01 ? "bg-orange-600" : "bg-white/10"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
        <input
          type="range"
          min={0.25}
          max={4}
          step={0.05}
          className="w-full"
          value={clip.speed}
          onChange={(e) => onChange({ speed: Math.max(0.25, Number(e.target.value) || 1) })}
        />
        <span className="text-[10px] opacity-50">{clip.speed.toFixed(2)}× playback</span>
      </label>

      {clip.nestedProjectId ? (
        <p className="text-[10px] text-sky-300/90 leading-relaxed">
          Nested sequence · {clip.nestedProjectId.slice(0, 8)}…
        </p>
      ) : null}

      <label className="block opacity-80">
        Caption text
        <textarea
          className="mt-0.5 w-full rounded bg-black/40 border border-white/10 px-2 py-1 text-[11px]"
          rows={2}
          value={clip.captionText ?? ""}
          onChange={(e) => onChange({ captionText: e.target.value.slice(0, 500) || null })}
          placeholder="On-screen caption for this clip"
        />
      </label>

      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90 pt-1">Color</p>
      <label className="block opacity-80">
        Brightness
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          className="w-full"
          value={clip.brightness ?? 0}
          onChange={(e) => onChange({ brightness: Number(e.target.value) })}
        />
      </label>
      <label className="block opacity-80">
        Contrast
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          className="w-full"
          value={clip.contrast ?? 0}
          onChange={(e) => onChange({ contrast: Number(e.target.value) })}
        />
      </label>
      <label className="block opacity-80">
        Saturation
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          className="w-full"
          value={clip.saturation ?? 0}
          onChange={(e) => onChange({ saturation: Number(e.target.value) })}
        />
      </label>

      <p className="text-[10px] font-bold uppercase tracking-wider text-lime-300/90 pt-1">Chroma key</p>
      <label className="flex items-center gap-2 text-[11px] opacity-80">
        <input
          type="checkbox"
          checked={Boolean(clip.chromaEnabled)}
          onChange={(e) => onChange({ chromaEnabled: e.target.checked })}
        />
        Enable (preview uses key color; full canvas keying in export later)
      </label>
      <label className="block opacity-80">
        Key color
        <input
          type="color"
          className="mt-0.5 w-full h-8 rounded border border-white/10 bg-transparent"
          value={clip.chromaColor ?? "#00FF00"}
          onChange={(e) => onChange({ chromaColor: e.target.value })}
        />
      </label>
      <label className="block opacity-80">
        Similarity
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          className="w-full"
          value={clip.chromaSimilarity ?? 0.4}
          onChange={(e) => onChange({ chromaSimilarity: Number(e.target.value) })}
        />
      </label>

      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300 pt-1">V2 keyframes</p>
      <button
        type="button"
        onClick={() => onKeyframe("scale", clip.scale)}
        className="w-full rounded-lg py-1.5 font-bold bg-violet-800/80"
      >
        Keyframe scale @ {playheadLocalMs}ms
      </button>
      <button
        type="button"
        onClick={() => onKeyframe("opacity", clip.opacity)}
        className="w-full rounded-lg py-1.5 font-bold bg-violet-800/80"
      >
        Keyframe opacity @ playhead
      </button>
      <button type="button" onClick={onFadeTransition} className="w-full rounded-lg py-1.5 font-bold bg-white/10">
        Fade → next clip
      </button>
      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 pt-1">Audio Reactive</p>
      {(
        [
          ["pulse_scale", "Pulse scale"],
          ["beat_flash", "Beat flash"],
          ["energy_opacity", "Energy opacity"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onReactive(id)}
          className="w-full rounded-lg py-1.5 font-bold bg-emerald-900/80"
        >
          {label}
        </button>
      ))}

      <button type="button" onClick={onSplit} className="w-full rounded-lg py-1.5 font-bold bg-white/10">
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

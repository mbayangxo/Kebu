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
import { downsamplePeaks, normalizeClipVolume, duckMusicUnderVoice, cutClipsOnBeats, fitSequenceToDuration, setTrackMix, setMasterVolume, effectiveClipVolume } from "@/lib/studio/audio-engine";
import { deleteClips, moveClips, rippleDeleteClip, linkClips, unlinkClips, linkedClipIds, trimClipEdge, slipClip, setTrackState } from "@/lib/studio/timeline-operations";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { exportStudioComposition } from "@/lib/studio/composition-browser-export";
import {
  cacheRemoteStudioMedia,
  getCachedStudioVideoMedia,
  getStudioVideoOfflineDraft,
  putStudioVideoOfflineDraft,
  pruneStudioVideoMediaCache,
  studioOfflineMediaKey,
  studioVideoOfflineSupported,
} from "@/lib/studio/video-offline-drafts";

const HISTORY_CAP = 40;

type SaveState = "idle" | "saving" | "saved" | "offline" | "conflict" | "error";

/** Full Timeline: multi-track + music-aware V1 → keyframes V2 → AI music edit V3. */
export default function StudioVideoEditorPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [title, setTitle] = useState("");
  const [comp, setComp] = useState<StudioComposition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);
  const [conflictServer, setConflictServer] = useState<{ composition: StudioComposition; title: string; updatedAt: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [sourceDesignId, setSourceDesignId] = useState<string | null>(null);
  const [sourceRefreshBusy, setSourceRefreshBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [offlineCacheBusy, setOfflineCacheBusy] = useState(false);
  const [offlineMediaUrls, setOfflineMediaUrls] = useState<Record<string, string>>({});
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pxPerSec, setPxPerSec] = useState(60);
  const [rippleEditing, setRippleEditing] = useState(false);
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
  const timelineGestureBaseline = useRef<StudioComposition | null>(null);
  const offlineObjectUrls = useRef<string[]>([]);

  const replaceOfflineObjectUrls = useCallback((next: Record<string, string>) => {
    for (const url of offlineObjectUrls.current) URL.revokeObjectURL(url);
    offlineObjectUrls.current = Object.values(next).filter((url) => url.startsWith("blob:"));
    setOfflineMediaUrls(next);
  }, []);

  const hydrateOfflineMedia = useCallback(async (uid: string, composition: StudioComposition) => {
    if (!studioVideoOfflineSupported()) return;
    const canonical = [...new Set([
      ...composition.assets.map((asset) => asset.url),
      ...composition.clips.map((clip) => clip.sourceUrl).filter((url): url is string => Boolean(url)),
      ...(composition.music?.soundtrackUrl ? [composition.music.soundtrackUrl] : []),
    ])];
    const pairs = await Promise.all(canonical.map(async (url) => {
      const cached = await getCachedStudioVideoMedia(studioOfflineMediaKey(uid, projectId, url)).catch(() => null);
      return cached ? [url, URL.createObjectURL(cached.blob)] as const : null;
    }));
    replaceOfflineObjectUrls(Object.fromEntries(pairs.filter((pair): pair is readonly [string, string] => Boolean(pair))));
  }, [projectId, replaceOfflineObjectUrls]);

  useEffect(() => () => {
    for (const url of offlineObjectUrls.current) URL.revokeObjectURL(url);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/studio/video/${projectId}`, { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Project not found.");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const nextUserId = sessionData.session?.user.id ?? null;
      const serverComposition = data.project.composition as StudioComposition;
      const nextUpdatedAt = typeof data.project.updated_at === "string" ? data.project.updated_at : null;
      const nextBusinessId = typeof data.project.business_id === "string" ? data.project.business_id : null;
      const nextSourceDesignId = typeof data.project.source_design_id === "string" ? data.project.source_design_id : null;
      let initialComposition = serverComposition;
      let initialTitle = data.project.title as string;
      let hasDirtyLocal = false;

      if (nextUserId && studioVideoOfflineSupported()) {
        const local = await getStudioVideoOfflineDraft(nextUserId, projectId).catch(() => null);
        if (local?.dirty) {
          initialComposition = local.composition;
          initialTitle = local.title;
          hasDirtyLocal = true;
        }
      }

      setUserId(nextUserId);
      setBusinessId(nextBusinessId);
      setSourceDesignId(nextSourceDesignId);
      setTitle(initialTitle);
      setComp(initialComposition);
      setServerUpdatedAt(nextUpdatedAt);
      compRef.current = initialComposition;
      setHistory([]);
      setFuture([]);
      setSaveState(hasDirtyLocal ? "offline" : "idle");
      setError(null);
      if (nextUserId) void hydrateOfflineMedia(nextUserId, initialComposition);
    } catch {
      if (!studioVideoOfflineSupported()) {
        setError("You are offline and this video is not available locally yet.");
        return;
      }
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const offlineUserId = sessionData.session?.user.id ?? null;
        if (!offlineUserId) {
          setError("Reconnect to verify your Kebu account before opening an offline Studio video.");
          return;
        }
        const local = await getStudioVideoOfflineDraft(offlineUserId, projectId);
        if (!local) {
          setError("You are offline and this video has not been saved on this device yet.");
          return;
        }
        setUserId(offlineUserId);
        setBusinessId(local.businessId);
        setSourceDesignId(local.sourceDesignId ?? null);
        setTitle(local.title);
        setComp(local.composition);
        compRef.current = local.composition;
        setServerUpdatedAt(local.serverUpdatedAt);
        setHistory([]);
        setFuture([]);
        setSaveState("offline");
        setError(null);
        void hydrateOfflineMedia(offlineUserId, local.composition);
      } catch {
        setError("Could not open the offline Studio video draft.");
      }
    }
  }, [projectId, hydrateOfflineMedia]);

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

  const loadConflictSnapshot = useCallback(async () => {
    try {
      const latestRes = await fetch(`/api/studio/video/${projectId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const latest = await latestRes.json().catch(() => ({}));
      if (!latestRes.ok || !latest.project?.composition || typeof latest.project.updated_at !== "string") {
        setError("A newer Studio video exists, but Kebu could not load it for comparison.");
        return;
      }
      setConflictServer({
        composition: latest.project.composition as StudioComposition,
        title: typeof latest.project.title === "string" ? latest.project.title : title,
        updatedAt: latest.project.updated_at,
      });
    } catch {
      setError("A newer Studio video exists, but Kebu could not load it while offline.");
    }
  }, [projectId, title]);

  const persist = useCallback(
    async (next: StudioComposition, nextTitle?: string) => {
      const effectiveTitle = nextTitle ?? title;
      const savedAt = new Date().toISOString();
      if (userId && studioVideoOfflineSupported()) {
        await putStudioVideoOfflineDraft({
          userId,
          projectId,
          title: effectiveTitle,
          composition: next,
          businessId,
          sourceDesignId,
          serverUpdatedAt,
          savedAt,
          dirty: true,
        }).catch(() => undefined);
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSaveState("offline");
        return;
      }
      setSaveState("saving");
      try {
        const res = await fetch(`/api/studio/video/${projectId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            composition: next,
            title: effectiveTitle,
            expectedUpdatedAt: serverUpdatedAt ?? undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 409 && data.code === "studio_video_version_conflict") {
          setSaveState("conflict");
          setError("This video changed in another tab or device. Your local draft is safe. Choose which version to keep.");
          void loadConflictSnapshot();
          return;
        }
        if (!res.ok || !data.project) {
          setSaveState("error");
          setError(typeof data.error === "string" ? data.error : "Could not save video project.");
          return;
        }
        const nextUpdatedAt = typeof data.project.updated_at === "string" ? data.project.updated_at : serverUpdatedAt;
        setServerUpdatedAt(nextUpdatedAt);
        if (userId && studioVideoOfflineSupported()) {
          await putStudioVideoOfflineDraft({
            userId,
            projectId,
            title: effectiveTitle,
            composition: next,
            businessId,
            sourceDesignId,
            serverUpdatedAt: nextUpdatedAt,
            savedAt: new Date().toISOString(),
            dirty: false,
          }).catch(() => undefined);
        }
        setSaveState("saved");
        setError(null);
        setTimeout(() => setSaveState("idle"), 1600);
      } catch {
        setSaveState("offline");
      }
    },
    [projectId, title, serverUpdatedAt, userId, businessId, sourceDesignId, loadConflictSnapshot],
  );

  async function useServerConflictVersion() {
    if (!conflictServer) return;
    const server = conflictServer;
    compRef.current = server.composition;
    setComp(server.composition);
    setTitle(server.title);
    setServerUpdatedAt(server.updatedAt);
    setHistory([]);
    setFuture([]);
    setSelectedClipId(null);
    setSelectedClipIds([]);
    setConflictServer(null);
    setSaveState("saved");
    setError(null);
    if (userId && studioVideoOfflineSupported()) {
      await putStudioVideoOfflineDraft({
        userId,
        projectId,
        title: server.title,
        composition: server.composition,
        businessId,
        sourceDesignId,
        serverUpdatedAt: server.updatedAt,
        savedAt: new Date().toISOString(),
        dirty: false,
      }).catch(() => undefined);
    }
    if (userId) void hydrateOfflineMedia(userId, server.composition);
    setTimeout(() => setSaveState("idle"), 1600);
  }

  async function keepLocalConflictVersion() {
    if (!conflictServer || !compRef.current) return;
    const local = compRef.current;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/studio/video/${projectId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          composition: local,
          title,
          expectedUpdatedAt: conflictServer.updatedAt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.project?.updated_at) {
        setSaveState("conflict");
        setError(typeof data.error === "string" ? data.error : "Could not resolve the Studio video conflict.");
        if (res.status === 409) void loadConflictSnapshot();
        return;
      }
      const nextUpdatedAt = data.project.updated_at as string;
      setServerUpdatedAt(nextUpdatedAt);
      setConflictServer(null);
      setSaveState("saved");
      setError(null);
      if (userId && studioVideoOfflineSupported()) {
        await putStudioVideoOfflineDraft({
          userId,
          projectId,
          title,
          composition: local,
          businessId,
          sourceDesignId,
          serverUpdatedAt: nextUpdatedAt,
          savedAt: new Date().toISOString(),
          dirty: false,
        }).catch(() => undefined);
      }
      setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      setSaveState("conflict");
      setError("Reconnect to resolve this Studio video conflict. Your local draft remains on this device.");
    }
  }

  function applyComp(next: StudioComposition, recordHistory = true) {
    if (recordHistory && compRef.current) {
      setHistory((h) => [...h.slice(-(HISTORY_CAP - 1)), compRef.current!]);
      setFuture([]);
    }
    compRef.current = next;
    setComp(next);
  }

  function beginTimelineGesture() {
    if (!timelineGestureBaseline.current && compRef.current) {
      timelineGestureBaseline.current = compRef.current;
    }
  }

  function applyTimelineGesture(next: StudioComposition) {
    compRef.current = next;
    setComp(next);
  }

  function commitTimelineGesture() {
    const baseline = timelineGestureBaseline.current;
    timelineGestureBaseline.current = null;
    if (!baseline || !compRef.current || baseline === compRef.current) return;
    setHistory((h) => [...h.slice(-(HISTORY_CAP - 1)), baseline]);
    setFuture([]);
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
    function onOnline() {
      if (!compRef.current || saveState === "conflict") return;
      void persist(compRef.current);
    }
    function onOffline() {
      setSaveState("offline");
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (!navigator.onLine) setSaveState("offline");
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [persist, saveState]);


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
    const resolvedClipUrl = offlineMediaUrls[clip.sourceUrl] ?? clip.sourceUrl;
    if (el.src !== resolvedClipUrl) el.src = resolvedClipUrl;
    const local = (playheadMs - clip.startMs) * clip.speed + clip.sourceInMs;
    const xf = clipTransformAtTime(comp, clip, playheadMs);
    el.style.opacity = String(xf.opacity);
    el.style.transform = `translate(${xf.x}px, ${xf.y}px) scale(${xf.scale}) rotate(${xf.rotation}deg)`;
    el.volume = Math.min(1, effectiveClipVolume(comp,clip.id) * xf.volume);
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
  }, [comp, playheadMs, playing, offlineMediaUrls]);

  useEffect(() => {
    const audio = soundtrackRef.current;
    const url = comp?.music?.soundtrackUrl;
    if (!audio || !url) return;
    const resolvedUrl = offlineMediaUrls[url] ?? url;
    if (audio.src !== resolvedUrl) audio.src = resolvedUrl;
    try {
      if (Math.abs(audio.currentTime * 1000 - playheadMs) > 180) {
        audio.currentTime = playheadMs / 1000;
      }
    } catch {
      /* ignore */
    }
    if (playing) void audio.play().catch(() => undefined);
    else audio.pause();
  }, [comp?.music?.soundtrackUrl, playheadMs, playing, offlineMediaUrls]);

  useEffect(() => {
    function onTimelineKey(e: KeyboardEvent) {
      const target=e.target as HTMLElement|null;
      if(target?.closest("input,textarea,select,[contenteditable=true]")||!compRef.current)return;
      const current=compRef.current, ids=selectedClipIds.length?selectedClipIds:(selectedClipId?[selectedClipId]:[]);
      if((e.key==="Delete"||e.key==="Backspace")&&ids.length){e.preventDefault();const next=deleteClips(current,ids);if("error"in next)setError(next.error);else{applyComp(next);setSelectedClipId(null);setSelectedClipIds([])}}
      if((e.key==="ArrowLeft"||e.key==="ArrowRight")&&ids.length){e.preventDefault();const next=moveClips(current,ids,(e.key==="ArrowLeft"?-1:1)*(e.shiftKey?1000:100));if("error"in next)setError(next.error);else applyComp(next)}
      if(e.key.toLowerCase()==="s"&&selectedClipId){e.preventDefault();const next=splitClipAt(current,selectedClipId,playheadMs);if("error"in next)setError(next.error);else applyComp(next)}
    }
    window.addEventListener("keydown",onTimelineKey);return()=>window.removeEventListener("keydown",onTimelineKey);
  },[selectedClipId,selectedClipIds,playheadMs]);

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
        provider: "upload",
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

  async function refreshLinkedDesign() {
    if (!sourceDesignId || !comp || sourceRefreshBusy) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setNote("Reconnect before refreshing the linked design. Your current video remains available offline.");
      return;
    }

    setSourceRefreshBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/video/${projectId}/refresh-source-design`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedUpdatedAt: serverUpdatedAt ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data.code === "studio_video_version_conflict") {
        setSaveState("conflict");
        setError(data.error || "This video changed somewhere else. Choose which version to keep before refreshing the linked design.");
        void loadConflictSnapshot();
        return;
      }
      if (!res.ok || !data.project?.composition) {
        setError(typeof data.error === "string" ? data.error : "Could not refresh the linked design.");
        return;
      }

      const next = data.project.composition as StudioComposition;
      applyComp(next);
      const nextUpdatedAt = typeof data.project.updated_at === "string" ? data.project.updated_at : serverUpdatedAt;
      setServerUpdatedAt(nextUpdatedAt);
      setSaveState("saved");

      if (userId && studioVideoOfflineSupported()) {
        await putStudioVideoOfflineDraft({
          userId,
          projectId,
          title,
          composition: next,
          businessId,
          sourceDesignId,
          serverUpdatedAt: nextUpdatedAt,
          savedAt: new Date().toISOString(),
          dirty: false,
        }).catch(() => undefined);
      }

      const summary = data.summary as { updated?: number; added?: number; removed?: number; scenes?: number } | undefined;
      setNote(
        `Linked design refreshed · ${summary?.updated ?? 0} updated · ${summary?.added ?? 0} added · ${summary?.removed ?? 0} removed · ${summary?.scenes ?? 0} scenes.`,
      );
      setTimeout(() => setSaveState("idle"), 1600);
    } finally {
      setSourceRefreshBusy(false);
    }
  }

  async function cacheProjectOffline() {
    if (!comp || !userId || offlineCacheBusy) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setNote("Reconnect once to cache this project's media for offline editing.");
      return;
    }

    setOfflineCacheBusy(true);
    setError(null);
    const canonical = [...new Set([
      ...comp.assets.map((asset) => asset.url),
      ...comp.clips.map((clip) => clip.sourceUrl).filter((url): url is string => Boolean(url)),
      ...(comp.music?.soundtrackUrl ? [comp.music.soundtrackUrl] : []),
    ])];

    let cached = 0;
    let skipped = 0;
    for (const url of canonical) {
      try {
        await cacheRemoteStudioMedia(userId, projectId, url);
        cached += 1;
      } catch {
        skipped += 1;
      }
    }

    const pruned = await pruneStudioVideoMediaCache(userId, projectId).catch(() => ({ removed: 0, bytesRemaining: 0 }));
    await hydrateOfflineMedia(userId, comp);
    setOfflineCacheBusy(false);
    setNote(
      skipped
        ? `Offline cache updated · ${cached} media saved · ${skipped} could not be cached (large or unavailable)${pruned.removed ? ` · ${pruned.removed} older cached file${pruned.removed === 1 ? "" : "s"} pruned` : ""}.`
        : `Available offline · ${cached} media file${cached === 1 ? "" : "s"} cached on this device${pruned.removed ? ` · ${pruned.removed} older cached file${pruned.removed === 1 ? "" : "s"} pruned` : ""}.`,
    );
  }

  async function exportVideo() {
    if (!comp || exportBusy) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setNote("Offline export works only when every media file used by this video is already available to the browser. Reconnect if export cannot load media.");
    }

    setExportBusy(true);
    setExportProgress(0);
    setError(null);
    setPlaying(false);
    try {
      const result = await exportStudioComposition(comp, {
        scale: 0.5,
        fps: Math.min(24, comp.frameRate),
        onProgress(progress) {
          setExportProgress(Math.round((progress.frame / progress.totalFrames) * 100));
        },
        resolveMediaUrl(url) {
          return offlineMediaUrls[url] ?? url;
        },
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }

      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = (title.trim() || "kebu-studio-video").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 100) + ".webm";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setNote(`Video exported · ${(result.durationMs / 1000).toFixed(1)}s · includes timeline visuals and available audio.`);
    } finally {
      setExportBusy(false);
      setExportProgress(0);
    }
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
        <p className="text-sm" style={{ color: "#8B1E1E" }}>{error}</p>
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
  const previewWidth = Math.min(360, (comp.width / comp.height) * 280);
  const previewScale = previewWidth / comp.width;
  const selected = comp.clips.find((c) => c.id === selectedClipId) ?? null;
  const tracks = [...comp.tracks].sort((a, b) => a.order - b.order);
  const peaks = downsamplePeaks(comp.music?.peaks ?? [], 240);
  const beats = comp.music?.beatsMs ?? [];
  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "offline"
          ? "Offline — changes not synced"
          : saveState === "conflict"
            ? "Sync conflict — choose a version"
            : saveState === "error"
              ? "Save failed"
              : "Autosave on";

  return (
    <div className="min-h-screen flex flex-col bg-[#101010] text-white selection:bg-[#FF6A00]/30">
      <audio ref={soundtrackRef} preload="auto" className="hidden" />
      <header className="shrink-0 border-b border-white/[.08] bg-[#151515] px-3 py-2 flex flex-wrap items-center gap-2">
        <Link href="/studio" className="rounded-md px-2 py-1 text-[10px] text-white/50 hover:bg-white/[.06] hover:text-white">
          ← Studio
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => void persist(comp, title)}
          className="bg-transparent font-display font-bold text-sm min-w-[140px] flex-1 border-b border-transparent focus:border-orange-500 outline-none"
        />
        <span className="text-[10px] uppercase tracking-wider opacity-50">{saveLabel}</span>
        {sourceDesignId ? (
          <div className="flex items-center gap-1">
            <Link
              href={`/studio/${sourceDesignId}`}
              className="rounded-md border border-white/10 px-2 py-1 text-[9px] font-bold text-white/60 hover:bg-white/[.06] hover:text-white"
              title="Open the editable source design"
            >
              Source design
            </Link>
            <button
              type="button"
              disabled={sourceRefreshBusy || saveState === "conflict"}
              onClick={() => void refreshLinkedDesign()}
              className="rounded-md border border-orange-400/25 bg-orange-500/10 px-2 py-1 text-[9px] font-bold text-orange-200 disabled:opacity-40"
              title="Refresh semantic design layers without flattening or replacing video-specific timing and motion"
            >
              {sourceRefreshBusy ? "Refreshing…" : "Refresh design"}
            </button>
          </div>
        ) : null}
        {comp.music?.bpm ? (
          <span className="text-[10px] font-mono text-emerald-300/90">
            {comp.music.bpm} BPM
            {comp.music.confidence != null ? ` · ${Math.round(comp.music.confidence * 100)}%` : ""}
          </span>
        ) : null}
        <label className="flex items-center gap-1 text-[10px] opacity-70">Master<input aria-label="Master volume" type="range" min="0" max="2" step=".05" value={comp.masterVolume} onChange={e=>applyComp(setMasterVolume(comp,Number(e.target.value)))}/></label><button type="button" onClick={()=>applyComp(duckMusicUnderVoice(comp))} className="rounded-lg px-2 py-1 text-xs bg-white/10">Duck music</button><button type="button" disabled={!history.length} onClick={undo} className="rounded-lg px-2 py-1 text-xs bg-white/10 disabled:opacity-30">
          Undo
        </button>
        <button type="button" disabled={!future.length} onClick={redo} className="rounded-lg px-2 py-1 text-xs bg-white/10 disabled:opacity-30">
          Redo
        </button>
        <button
          type="button"
          disabled={offlineCacheBusy || !userId}
          onClick={() => void cacheProjectOffline()}
          className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-bold text-white/70 disabled:opacity-40"
          title="Cache project media on this device for low-bandwidth and offline editing"
        >
          {offlineCacheBusy ? "Caching…" : Object.keys(offlineMediaUrls).length ? `Offline · ${Object.keys(offlineMediaUrls).length}` : "Make offline"}
        </button>
        <button
          type="button"
          disabled={exportBusy || saveState === "conflict"}
          onClick={() => void exportVideo()}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
          title="Record the current Studio composition to WebM with timeline media and available audio"
        >
          {exportBusy ? `Exporting ${exportProgress}%` : "Export video"}
        </button>
        <button
          type="button"
          disabled={saveState === "conflict"}
          onClick={() => void persist(comp)}
          className="rounded-full px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
          style={{ background: "#E05A2B" }}
        >
          Save now
        </button>
      </header>

      {conflictServer ? (
        <div className="flex flex-col gap-2 border-b border-amber-300/20 bg-amber-950/40 px-3 py-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-amber-200">Studio sync conflict</p>
            <p className="mt-0.5 text-[10px] text-amber-100/70">A newer server version exists. Kebu kept your local composition offline, so nothing has to be silently overwritten.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => void useServerConflictVersion()} className="rounded-full border border-white/15 px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-white">Use server version</button>
            <button type="button" onClick={() => void keepLocalConflictVersion()} className="rounded-full bg-[#FF6A00] px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-white">Keep my version</button>
          </div>
        </div>
      ) : null}
      {error ? <p className="px-3 py-1 text-xs text-red-300 bg-red-950/40">{error}</p> : null}
      {note ? <p className="px-3 py-1 text-xs text-emerald-200/90 bg-emerald-950/30">{note}</p> : null}

      <div className="flex flex-1 min-h-0">
        <aside className="hidden w-[220px] shrink-0 border-r border-white/[.08] bg-[#151515] lg:flex lg:flex-col">
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

        <main className="flex-1 flex flex-col min-w-0 bg-[#0d0d0d]">
          <div className="flex-1 flex items-center justify-center p-4 min-h-[200px]">
            <div
              className="relative bg-black rounded-lg overflow-hidden shadow-2xl border border-white/10"
              style={{
                width: previewWidth,
                aspectRatio: `${comp.width} / ${comp.height}`,
              }}
            >
              <video ref={videoPreviewRef} className="absolute inset-0 w-full h-full object-contain transition-opacity" playsInline />
              {comp.clips
                .filter((clip) => clip.designLayer && playheadMs >= clip.startMs && playheadMs < clip.startMs + clip.durationMs)
                .map((clip) => (
                  <SemanticDesignVideoLayer
                    key={clip.id}
                    composition={comp}
                    clip={clip}
                    playheadMs={playheadMs}
                    previewScale={previewScale}
                    resolveMediaUrl={(url) => offlineMediaUrls[url] ?? url}
                  />
                ))}
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
              className="grid h-8 w-8 place-items-center rounded-full bg-white text-black text-[10px] font-bold"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? "Ⅱ" : "▶"}
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
              Magnetic snap
            </label>
            <label className="flex items-center gap-1 text-[10px] opacity-70"><input type="checkbox" checked={rippleEditing} onChange={(e)=>setRippleEditing(e.target.checked)}/>Ripple edit</label>
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

        <aside className="hidden w-[280px] shrink-0 border-l border-white/[.08] bg-[#151515] p-3 overflow-y-auto xl:block">
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
              onAudioAction={(action)=>{const next=action==="normalize"?normalizeClipVolume(comp,selected.id):cutClipsOnBeats(comp,selected.id,action==="downbeats");if("error"in next)setError(next.error);else applyComp(next)}}
              onDelete={() => {
                const track=comp.tracks.find(t=>t.id===selected.trackId); if(track?.locked){setError("Track is locked.");return;}
                applyComp(deleteClip(comp, selected.id)); setSelectedClipId(null);
              }}
              onRippleDelete={() => { const next=rippleDeleteClip(comp,selected.id); if("error" in next)setError(next.error); else {applyComp(next);setSelectedClipId(null);} }}
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

      <div className="shrink-0 border-t border-white/[.08] bg-[#111] px-2 py-2 space-y-1 max-h-[42vh] overflow-auto">
        <div className="flex items-center gap-2 px-1"><p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Timeline · multi-track · music-aware</p><span className="text-[9px] opacity-40">S split · ⌫ delete · ←/→ nudge · Shift 1s · Alt-drag slip</span><div className="ml-auto flex gap-1"><button type="button" disabled={!selectedClipIds.length} onClick={()=>{const n=fitSequenceToDuration(comp,selectedClipIds,15000);if("error"in n)setError(n.error);else applyComp(n)}} className="rounded bg-white/10 px-2 py-1 text-[9px] disabled:opacity-30">Fit 15s</button><button type="button" disabled={selectedClipIds.length<2} onClick={()=>{const n=linkClips(comp,selectedClipIds);if("error"in n)setError(n.error);else applyComp(n)}} className="rounded bg-white/10 px-2 py-1 text-[9px] disabled:opacity-30">Link</button><button type="button" disabled={!selectedClipIds.length} onClick={()=>{const n=unlinkClips(comp,selectedClipIds);if("error"in n)setError(n.error);else applyComp(n)}} className="rounded bg-white/10 px-2 py-1 text-[9px] disabled:opacity-30">Unlink</button></div></div>
        <div className="relative" style={{ minWidth: (totalMs / 1000) * pxPerSec + 80 }}>
          <div className="h-5 ml-14 relative border-b border-white/10 mb-1">
            {Array.from({ length: Math.min(600, Math.ceil(totalMs / Math.max(1000, Math.ceil(totalMs / 600 / 1000) * 1000)) + 1) }).map((_, i) => (
              <span key={i} className="absolute text-[9px] opacity-40 font-mono" style={{ left: i * pxPerSec * Math.max(1, Math.ceil(totalMs / 600 / 1000)) }}>
                {i * Math.max(1, Math.ceil(totalMs / 600 / 1000))}s
              </span>
            ))}
            {beats.filter((_,i)=>beats.length<=1200||i%Math.ceil(beats.length/1200)===0).map((b) => (
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
              <div className="w-14 shrink-0 text-[9px] font-semibold flex items-center gap-0.5 px-0.5"><span className="min-w-0 flex-1 truncate opacity-60">{track.name}</span>{track.kind==="audio"||track.kind==="music"?<><input aria-label={`${track.name} volume`} className="w-10" type="range" min="0" max="2" step=".1" value={track.volume} onChange={e=>applyComp(setTrackMix(comp,track.id,{volume:Number(e.target.value)}))}/><button type="button" title={track.solo?"Unsolo":"Solo"} onClick={()=>applyComp(setTrackMix(comp,track.id,{solo:!track.solo}))} className={track.solo?"text-emerald-300":"opacity-40"}>S</button></>:null}<button type="button" title={track.muted?"Unmute":"Mute"} onClick={()=>applyComp(setTrackMix(comp,track.id,{muted:!track.muted}))} className={track.muted?"text-amber-300":"opacity-40"}>{track.muted?"M":"m"}</button><button type="button" title={track.locked?"Unlock":"Lock"} onClick={()=>applyComp(setTrackState(comp,track.id,{locked:!track.locked}))} className={track.locked?"text-orange-300":"opacity-40"}>{track.locked?"L":"l"}</button></div>
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
                      selected={selectedClipIds.includes(clip.id) || clip.id === selectedClipId}
                      locked={track.locked}
                      onSelect={(additive) => {setSelectedClipId(clip.id);setSelectedClipIds(prev=>additive?(prev.includes(clip.id)?prev.filter(id=>id!==clip.id):[...prev,clip.id]):linkedClipIds(comp,clip.id));}}
                      onGestureStart={beginTimelineGesture}
                      onGestureEnd={commitTimelineGesture}
                      onMove={(startMs) => {const current=compRef.current??comp;const currentClip=current.clips.find(x=>x.id===clip.id)??clip;const ids=selectedClipIds.includes(clip.id)?selectedClipIds:linkedClipIds(current,clip.id);const next=moveClips(current,ids,startMs-currentClip.startMs);if(!("error" in next))applyTimelineGesture(next);}}
                      onTrim={(edge,deltaMs) => {const current=compRef.current??comp;const next=trimClipEdge(current,clip.id,edge,deltaMs,{ripple:rippleEditing});if(!("error" in next))applyTimelineGesture(next);}}
                      onSlip={(deltaMs)=>{const current=compRef.current??comp;const next=slipClip(current,clip.id,deltaMs);if(!("error" in next))applyTimelineGesture(next);}}
                      compKeyframes={comp.keyframes.filter(k=>k.clipId===clip.id).map(k=>k.timeMs)}
                      wavePeaks={downsamplePeaks(comp.assets.find(a=>a.url===clip.sourceUrl)?.peaks??[],48)}
                    />
                  ))}
              </div>
            </div>
          ))}

          <div
            className="absolute top-0 bottom-0 w-px bg-[#FF6A00] pointer-events-none z-20 shadow-[0_0_0_1px_rgba(255,106,0,.08)]"
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

function semanticMediaFilter(layer: NonNullable<CompositionClip["designLayer"]>) {
  const brightness = 1 + (layer.brightness ?? 0);
  const contrast = 1 + (layer.contrast ?? 0);
  const saturation = 1 + (layer.saturation ?? 0);
  const grayscale = Math.max(0, Math.min(1, layer.grayscale ?? 0));
  const blur = Math.max(0, layer.blur ?? 0);
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) grayscale(${grayscale}) blur(${blur}px)`;
}

function SemanticDesignVideoLayer({
  composition,
  clip,
  playheadMs,
  previewScale,
  resolveMediaUrl,
}: {
  composition: StudioComposition;
  clip: CompositionClip;
  playheadMs: number;
  previewScale: number;
  resolveMediaUrl: (url: string) => string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const layer = clip.designLayer!;
  const xf = clipTransformAtTime(composition, clip, playheadMs);
  const width = Math.max(1, clip.designWidth ?? 200) * previewScale;
  const height = Math.max(1, clip.designHeight ?? (layer.fontSize ?? 48) * 1.4) * previewScale;
  const cropW = Math.max(0.05, Math.min(1, layer.cropW ?? 1));
  const cropH = Math.max(0.05, Math.min(1, layer.cropH ?? 1));
  const cropX = Math.max(0, Math.min(1 - cropW, layer.cropX ?? 0));
  const cropY = Math.max(0, Math.min(1 - cropH, layer.cropY ?? 0));

  useEffect(() => {
    if (layer.type !== "video" || !videoRef.current) return;
    const video = videoRef.current;
    const localMs = Math.max(0, (playheadMs - clip.startMs) * clip.speed + clip.sourceInMs);
    const apply = () => {
      const target = localMs / 1000;
      if (Math.abs(video.currentTime - target) > 0.12) {
        try { video.currentTime = target; } catch { /* media can still be loading */ }
      }
    };
    if (video.readyState >= 1) apply();
    else video.addEventListener("loadedmetadata", apply, { once: true });
  }, [clip.sourceInMs, clip.speed, clip.startMs, layer.type, playheadMs]);

  const outer: React.CSSProperties = {
    position: "absolute",
    left: xf.x * previewScale,
    top: xf.y * previewScale,
    width,
    height,
    opacity: xf.opacity,
    transform: `scale(${xf.scale}) rotate(${xf.rotation}deg)`,
    transformOrigin: "top left",
    overflow: "hidden",
    borderRadius: layer.type === "ellipse" ? 9999 : (layer.cornerRadius ?? 0) * previewScale,
    boxShadow: layer.shadowBlur
      ? `${(layer.shadowX ?? 0) * previewScale}px ${(layer.shadowY ?? 0) * previewScale}px ${layer.shadowBlur * previewScale}px ${layer.shadowColor ?? "#00000055"}`
      : undefined,
    pointerEvents: "none",
  };

  if (layer.type === "text") {
    return (
      <div
        style={{
          ...outer,
          color: layer.color ?? "#FFFFFF",
          fontFamily: layer.fontFamily,
          fontWeight: layer.fontWeight,
          fontStyle: layer.fontStyle,
          fontSize: Math.max(5, (layer.fontSize ?? 48) * previewScale),
          lineHeight: layer.lineHeight ?? 1.2,
          letterSpacing: layer.letterSpacing != null ? layer.letterSpacing * previewScale : undefined,
          textAlign: layer.textAlign,
          textDecoration: layer.textDecoration === "none" ? undefined : layer.textDecoration,
          textTransform: layer.textTransform === "none" ? undefined : layer.textTransform,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {layer.text}
      </div>
    );
  }

  if (layer.type === "image" && layer.imageUrl) {
    return (
      <div style={outer}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveMediaUrl(layer.imageUrl)}
          alt=""
          style={{
            width: `${100 / cropW}%`,
            height: `${100 / cropH}%`,
            maxWidth: "none",
            marginLeft: `${(-cropX / cropW) * 100}%`,
            marginTop: `${(-cropY / cropH) * 100}%`,
            objectFit: "fill",
            transform: `scale(${layer.flipX ? -1 : 1}, ${layer.flipY ? -1 : 1})`,
            filter: semanticMediaFilter(layer),
          }}
        />
      </div>
    );
  }

  if (layer.type === "video" && layer.videoUrl) {
    return (
      <div style={outer}>
        <video
          ref={videoRef}
          src={resolveMediaUrl(layer.videoUrl)}
          muted
          playsInline
          preload="metadata"
          style={{
            width: "100%",
            height: "100%",
            objectFit: layer.objectFit ?? "cover",
            transform: `scale(${layer.flipX ? -1 : 1}, ${layer.flipY ? -1 : 1})`,
            filter: semanticMediaFilter(layer),
          }}
        />
      </div>
    );
  }

  if (layer.type === "ellipse") {
    return <div style={{ ...outer, background: layer.fill ?? "transparent", border: layer.strokeWidth ? `${layer.strokeWidth * previewScale}px solid ${layer.stroke ?? "#111111"}` : undefined }} />;
  }

  if (layer.type === "line") {
    return (
      <div style={{ ...outer, overflow: "visible" }}>
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            height: Math.max(1, (layer.strokeWidth ?? 2) * previewScale),
            transform: "translateY(-50%)",
            background: layer.stroke ?? layer.fill ?? "#FFFFFF",
          }}
        />
        {layer.text === "→" ? <span style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-55%)", color: layer.stroke ?? layer.fill ?? "#FFFFFF", fontSize: Math.max(8, 22 * previewScale) }}>›</span> : null}
      </div>
    );
  }

  if (layer.type === "icon") {
    return <div style={{ ...outer, display: "flex", alignItems: "center", justifyContent: "center", color: layer.color ?? "#FFFFFF", fontSize: Math.max(8, (layer.fontSize ?? 48) * previewScale), fontWeight: 700 }}>{layer.text || "★"}</div>;
  }

  if (layer.type === "frame") {
    return <div style={{ ...outer, border: `${Math.max(1, (layer.strokeWidth ?? 4) * previewScale)}px solid ${layer.stroke ?? "#FFFFFF"}`, background: layer.fill ?? "transparent" }} />;
  }

  return <div style={{ ...outer, background: layer.fill ?? "transparent", border: layer.strokeWidth ? `${layer.strokeWidth * previewScale}px solid ${layer.stroke ?? "#111111"}` : undefined }} />;
}

function TimelineClipBlock({
  clip,
  pxPerSec,
  selected,
  locked,
  onSelect,
  onGestureStart,
  onGestureEnd,
  onMove,
  onTrim,
  onSlip,
  compKeyframes,
  wavePeaks,
}: {
  clip: CompositionClip;
  pxPerSec: number;
  selected: boolean;
  locked: boolean;
  onSelect: (additive: boolean) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
  onMove: (startMs: number) => void;
  onTrim: (edge: "left"|"right", deltaMs: number) => void;
  onSlip: (deltaMs:number)=>void;
  compKeyframes?: number[];
  wavePeaks?: number[];
}) {
  const drag = useRef<{ mode: "move" | "trim-left" | "trim-right" | "slip"; originX: number; startMs: number; durationMs: number } | null>(
    null,
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.metaKey || e.ctrlKey || e.shiftKey);
      }}
      onPointerDown={(e) => {
        if (locked || e.button !== 0) return;
        e.stopPropagation();
        onSelect(e.metaKey || e.ctrlKey || e.shiftKey);
        onGestureStart();
        const handle=(e.target as HTMLElement).dataset.handle; const mode=e.altKey?"slip":handle==="trim-left"?"trim-left":handle==="trim-right"?"trim-right":"move";
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
        if(drag.current.mode==="move")onMove(drag.current.startMs+dMs);else if(drag.current.mode==="slip")onSlip(dMs);else onTrim(drag.current.mode==="trim-left"?"left":"right",dMs);
      }}
      onPointerUp={() => {
        if (drag.current) onGestureEnd();
        drag.current = null;
      }}
      onPointerCancel={() => {
        if (drag.current) onGestureEnd();
        drag.current = null;
      }}
      aria-pressed={selected}
      className={`group absolute top-1 bottom-1 rounded-[5px] px-2 text-[9px] font-semibold truncate cursor-grab outline-none transition-[background,box-shadow] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[#FF6A00] ${selected ? "bg-[#3a3a3a] ring-1 ring-[#FF6A00] shadow-[inset_3px_0_0_#FF6A00]" : "bg-[#292929] ring-1 ring-white/[.08] hover:bg-[#333]"}` }
      style={{
        left: (clip.startMs / 1000) * pxPerSec,
        width: Math.max(12, (clip.durationMs / 1000) * pxPerSec),
      }}
      title={clip.name}
    >
      {clip.name}
      {wavePeaks?.length?<span className="absolute inset-x-2 bottom-1 flex h-2 items-end gap-px opacity-45 pointer-events-none">{wavePeaks.map((p,i)=><i key={i} className="flex-1 bg-white min-w-px" style={{height:`${Math.max(15,p*100)}%`}}/>)}</span>:null}
      {compKeyframes?.map((time)=><span key={time} title={`Keyframe ${time}ms`} className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rotate-45 bg-yellow-200" style={{left:`${Math.max(2,Math.min(96,(time/clip.durationMs)*100))}%`}}/>)}
      {(clip.fadeInMs > 0 || clip.fadeOutMs > 0) && (
        <span className="absolute inset-y-0 left-0 w-1 bg-white/40 rounded-l" />
      )}
      <span data-handle="trim-left" aria-label="Trim clip start" className="absolute left-0 top-1 bottom-1 w-2 cursor-ew-resize rounded-l opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 bg-white/35" /><span data-handle="trim-right" aria-label="Trim clip end" className="absolute right-0 top-1 bottom-1 w-2 cursor-ew-resize rounded-r opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 bg-white/35" />
    </div>
  );
}

function ClipInspector({
  clip,
  playheadLocalMs,
  onChange,
  onDelete,
  onRippleDelete,
  onAudioAction,
  onSplit,
  onKeyframe,
  onReactive,
  onFadeTransition,
}: {
  clip: CompositionClip;
  playheadLocalMs: number;
  onChange: (patch: Partial<CompositionClip>) => void;
  onDelete: () => void;
  onRippleDelete: () => void;
  onAudioAction: (action:"normalize"|"beats"|"downbeats")=>void;
  onSplit: () => void;
  onKeyframe: (property: "opacity" | "scale" | "x" | "y" | "rotation" | "volume", value: number) => void;
  onReactive: (preset: AudioReactivePreset) => void;
  onFadeTransition: () => void;
}) {
  return (
    <div className="space-y-2 text-xs">
      <p className="font-semibold truncate">{clip.name}</p>
      {clip.designLayer ? <div className="rounded-xl border border-orange-400/20 bg-orange-400/5 p-2 space-y-2"><p className="text-[10px] font-bold uppercase tracking-wider text-orange-300">Editable design layer</p><p className="text-[10px] opacity-50">Linked to {clip.sourceDesignLayerId?.slice(0,12) ?? "design layer"} · remains semantic in Video.</p>{clip.designLayer.type==="text"?<label className="block opacity-80">Text<textarea rows={3} className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={clip.designLayer.text??""} onChange={e=>onChange({designLayer:{...clip.designLayer!,text:e.target.value.slice(0,500)}})}/></label>:null}<div className="grid grid-cols-2 gap-2"><label className="block opacity-80">X<input type="number" className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={clip.x} onChange={e=>onChange({x:Number(e.target.value)||0})}/></label><label className="block opacity-80">Y<input type="number" className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={clip.y} onChange={e=>onChange({y:Number(e.target.value)||0})}/></label><label className="block opacity-80">Width<input type="number" min={1} className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={clip.designWidth??1} onChange={e=>onChange({designWidth:Math.max(1,Number(e.target.value)||1)})}/></label><label className="block opacity-80">Height<input type="number" min={1} className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={clip.designHeight??1} onChange={e=>onChange({designHeight:Math.max(1,Number(e.target.value)||1)})}/></label></div>{clip.designLayer.fill!==undefined?<label className="block opacity-80">Fill<input type="text" className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={clip.designLayer.fill??""} onChange={e=>onChange({designLayer:{...clip.designLayer!,fill:e.target.value.slice(0,40)}})}/></label>:null}{clip.designLayer.color!==undefined?<label className="block opacity-80">Text color<input type="text" className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-1" value={clip.designLayer.color??""} onChange={e=>onChange({designLayer:{...clip.designLayer!,color:e.target.value.slice(0,40)}})}/></label>:null}</div>:null}
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

"use client";

import Link from "next/link";
import { StudioSaveQueue, validStudioSaveReceipt } from "@/lib/studio/save-queue";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StudioCanvasEditor } from "@/app/components/studio/studio-canvas-editor";
import { StudioBrandKitPanel } from "@/app/components/studio/studio-brand-kit-panel";
import { StudioSharePanel } from "@/app/components/studio/studio-share-panel";
import { StudioVersionHistoryPanel } from "@/app/components/studio/studio-version-history-panel";
import { StudioCommentsPanel } from "@/app/components/studio/studio-comments-panel";
import { StudioReachPromote } from "@/app/components/studio/studio-reach-promote";
import { StudioResizeDialog } from "@/app/components/studio/studio-resize-dialog";
import { StudioTimelinePanel } from "@/app/components/studio/studio-timeline-panel";
import { StudioCoachPanel } from "@/app/components/studio/studio-coach-panel";
import {
  downloadBlob,
  downloadPngDataUrl,
  exportCanvasToPngDataUrlAsync,
  parseCanvasDocument,
  type CanvasDocument,
  type StudioDesignType,
} from "@/lib/studio/canvas-document";
import {
  downloadStudioExport,
  exportCanvasPagesPdfBlob,
  exportCanvasPagesZipBlob,
} from "@/lib/studio/export-pack";
import {
  estimateTimelineDurationSeconds,
  exportCanvasMotionToWebmBlob,
} from "@/lib/studio/motion-export";
import { clipAtTime, pageLocalTimeMs, studioNeedsTimeline } from "@/lib/studio/timeline";
import { resizeCanvasDocument } from "@/lib/studio/editor-craft";
import type { StudioDesignAccess } from "@/lib/studio/design-access";
import { studioRoleLabel } from "@/lib/studio/design-access";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  cacheRemoteStudioDesignMedia,
  getCachedStudioDesignMedia,
  getStudioOfflineDraft,
  pruneStudioDesignMediaCache,
  putStudioOfflineDraft,
  studioDesignOfflineMediaKey,
  studioOfflineSupported,
} from "@/lib/studio/offline-drafts";

type Design = {
  id: string;
  title: string;
  design_type: string;
  business_id: string | null;
  canvas: unknown;
  updated_at: string;
};

const HISTORY_CAP = 40;

export default function StudioEditorPage() {
  const params = useParams<{ id: string }>();
  const designId = params.id;
  const [design, setDesign] = useState<Design | null>(null);
  const [access, setAccess] = useState<StudioDesignAccess | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [doc, setDoc] = useState<CanvasDocument | null>(null);
  const [activePageId, setActivePageId] = useState<string>("");
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "offline" | "error">("idle");
  const [syncState, setSyncState] = useState<"online" | "offline" | "syncing" | "conflict">("online");
  const [conflictServer, setConflictServer] = useState<{ doc: CanvasDocument; updatedAt: string; designType: StudioDesignType } | null>(null);
  const saveQueue = useMemo(() => new StudioSaveQueue(designId), [designId]);
  const cacheQueue = useMemo(() => new StudioSaveQueue(designId + ":offline"), [designId]);
  const [, setServerRevision] = useState<string | null>(null);
  const setServerUpdatedAt = useCallback((revision: string | null) => {
    saveQueue.reset(revision);
    setServerRevision(revision);
  }, [saveQueue]);
  useEffect(() => () => { saveQueue.cancel(); cacheQueue.cancel(); }, [saveQueue, cacheQueue]);
  const [error, setError] = useState<string | null>(null);
  const [exportProjectId, setExportProjectId] = useState("");
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showResize, setShowResize] = useState(false);
  const [showCoach, setShowCoach] = useState(true);
  const [packBusy, setPackBusy] = useState(false);
  const [motionBusy, setMotionBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [variantBusy, setVariantBusy] = useState(false);
  const [secondsPerPage, setSecondsPerPage] = useState(2);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [timelineOverride, setTimelineOverride] = useState<boolean | null>(null);
  const soundtrackAudioRef = useRef<HTMLAudioElement | null>(null);
  const [history, setHistory] = useState<CanvasDocument[]>([]);
  const [future, setFuture] = useState<CanvasDocument[]>([]);
  const [offlineMediaUrls, setOfflineMediaUrls] = useState<Record<string, string>>({});
  const offlineObjectUrls = useRef<string[]>([]);
  const dragBaseline = useRef<CanvasDocument | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docRef = useRef<CanvasDocument | null>(null);
  const lastSavedDocRef = useRef<CanvasDocument | null>(null);

  const canEdit = access?.canEdit === true;

  const replaceOfflineObjectUrls = useCallback((next: Record<string, string>) => {
    for (const url of offlineObjectUrls.current) URL.revokeObjectURL(url);
    offlineObjectUrls.current = Object.values(next).filter((url) => url.startsWith("blob:"));
    setOfflineMediaUrls(next);
  }, []);

  const mediaUrlsForDocument = useCallback((canvas: CanvasDocument) => {
    const urls = new Set<string>();
    for (const canvasPage of canvas.pages) {
      for (const layer of canvasPage.layers) {
        if (layer.imageUrl) urls.add(layer.imageUrl);
        if (layer.videoUrl) urls.add(layer.videoUrl);
        if (layer.frameMediaUrl) urls.add(layer.frameMediaUrl);
      }
    }
    if (canvas.soundtrack?.url) urls.add(canvas.soundtrack.url);
    return [...urls];
  }, []);

  const hydrateOfflineMedia = useCallback(async (uid: string, canvas: CanvasDocument, cacheMissing = false) => {
    if (!studioOfflineSupported()) return;
    const urls = mediaUrlsForDocument(canvas);
    const rows = await Promise.all(urls.map(async (url) => {
      const key = studioDesignOfflineMediaKey(uid, designId, url);
      let cached = await getCachedStudioDesignMedia(key).catch(() => null);
      if (!cached && cacheMissing && typeof navigator !== "undefined" && navigator.onLine) {
        try {
          await cacheRemoteStudioDesignMedia(uid, designId, url);
          cached = await getCachedStudioDesignMedia(key);
        } catch {
          cached = null;
        }
      }
      return cached ? [url, URL.createObjectURL(cached.blob)] as const : null;
    }));
    replaceOfflineObjectUrls(Object.fromEntries(rows.filter((row): row is readonly [string, string] => Boolean(row))));
    if (cacheMissing) await pruneStudioDesignMediaCache(uid, designId).catch(() => undefined);
  }, [designId, mediaUrlsForDocument, replaceOfflineObjectUrls]);

  const resolveMediaUrl = useCallback((url: string) => offlineMediaUrls[url] ?? url, [offlineMediaUrls]);

  const documentWithResolvedMedia = useCallback((canvas: CanvasDocument): CanvasDocument => ({
    ...canvas,
    soundtrack: canvas.soundtrack ? { ...canvas.soundtrack, url: resolveMediaUrl(canvas.soundtrack.url) } : canvas.soundtrack,
    pages: canvas.pages.map((canvasPage) => ({
      ...canvasPage,
      layers: canvasPage.layers.map((layer) => ({
        ...layer,
        imageUrl: layer.imageUrl ? resolveMediaUrl(layer.imageUrl) : layer.imageUrl,
        videoUrl: layer.videoUrl ? resolveMediaUrl(layer.videoUrl) : layer.videoUrl,
        frameMediaUrl: layer.frameMediaUrl ? resolveMediaUrl(layer.frameMediaUrl) : layer.frameMediaUrl,
      })),
    })),
  }), [resolveMediaUrl]);

  const load = useCallback(async () => {
    const isCurrent = saveQueue.current();
    setError(null);
    try {
      const res = await fetch(`/api/create/designs/${designId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!isCurrent()) return;
      if (!res.ok) {
        setError(data.error ?? "Design not found.");
        return;
      }

      const d = data.design as Design;
      const nextUserId = typeof data.userId === "string" ? data.userId : null;
      const serverDoc = parseCanvasDocument(d.canvas, d.design_type as StudioDesignType);
      let initialDoc = serverDoc;
      let initialDesignType = d.design_type as StudioDesignType;
      let baseRevision: string | null = d.updated_at ?? null;
      let recoveredConflict = false;

      if (nextUserId && studioOfflineSupported()) {
        const local = await getStudioOfflineDraft(nextUserId, designId).catch(() => null);
        if (local?.dirty) {
          initialDoc = local.canvas;
          initialDesignType = local.designType;
          baseRevision = local.serverUpdatedAt;
          recoveredConflict = local.serverUpdatedAt !== d.updated_at;
          setSyncState(recoveredConflict ? "conflict" : "offline");
        } else {
          setSyncState("online");
        }
      }

      if (!isCurrent()) return;
      setDesign({ ...d, design_type: initialDesignType });
      setServerUpdatedAt(baseRevision);
      lastSavedDocRef.current = serverDoc;
      if (recoveredConflict) {
        saveQueue.pause();
        setConflictServer({ doc: serverDoc, updatedAt: d.updated_at, designType: d.design_type as StudioDesignType });
        setError("Your recovered draft and the server version differ. Choose which version to keep.");
      }
      if (data.access) setAccess(data.access as StudioDesignAccess);
      setUserId(nextUserId);
      setDoc(initialDoc);
      docRef.current = initialDoc;
      setActivePageId(initialDoc.pages[0]?.id ?? "");
      setSelectedLayerIds([]);
      setHistory([]);
      setFuture([]);
      if (nextUserId) void hydrateOfflineMedia(nextUserId, initialDoc, true);
    } catch {
      if (!isCurrent()) return;
      if (!studioOfflineSupported()) {
        setError("You are offline and this design is not available locally yet.");
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const offlineUserId = sessionData.session?.user.id ?? null;
        if (!offlineUserId) {
          setError("Reconnect to verify your Kebu account before opening an offline Studio draft.");
          return;
        }
        const local = await getStudioOfflineDraft(offlineUserId, designId);
        if (!local) {
          setError("You are offline and this design has not been saved on this device yet.");
          return;
        }

        if (!isCurrent()) return;
        setUserId(offlineUserId);
        const offlineRole = local.accessRole ?? "viewer";
        setAccess({
          role: offlineRole,
          canEdit: offlineRole === "owner" || offlineRole === "editor",
          canDelete: false,
          canShare: false,
        } as StudioDesignAccess);
        setDesign({
          id: designId,
          title: local.designTitle || "Offline Studio design",
          design_type: local.designType,
          business_id: local.businessId ?? null,
          canvas: local.canvas,
          updated_at: local.serverUpdatedAt ?? local.savedAt,
        });
        setServerUpdatedAt(local.serverUpdatedAt);
        setDoc(local.canvas);
        docRef.current = local.canvas;
        setActivePageId(local.canvas.pages[0]?.id ?? "");
        setSelectedLayerIds([]);
        setHistory([]);
        setFuture([]);
        setSyncState("offline");
        void hydrateOfflineMedia(offlineUserId, local.canvas, false);
      } catch {
        setError("Could not open the offline Studio draft.");
      }
    }
  }, [designId, hydrateOfflineMedia, setServerUpdatedAt, saveQueue]);

  useEffect(() => {
    return () => {
      for (const url of offlineObjectUrls.current) URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    void load();
    void fetch("/api/projects", { credentials: "include" })
      .then((r) => r.json())
      .then((d) =>
        setProjects((d.projects ?? []).map((p: { id: string; title: string }) => ({ id: p.id, title: p.title }))),
      )
      .catch(() => undefined);
  }, [load]);

  /** Keep active page valid after undo/redo or page delete. */
  useEffect(() => {
    if (!doc?.pages.length) return;
    if (!doc.pages.some((p) => p.id === activePageId)) {
      setActivePageId(doc.pages[0]!.id);
      setSelectedLayerIds([]);
    }
  }, [doc, activePageId]);

  const draftTypeRef = useRef<StudioDesignType>("poster");
  const loadedDesignType = design?.design_type;
  useEffect(() => { if (loadedDesignType) draftTypeRef.current = loadedDesignType as StudioDesignType; }, [loadedDesignType]);

  const persist = useCallback(
    async (canvas: CanvasDocument, designType?: StudioDesignType) => {
      if (!canEdit || canvas !== docRef.current) return;
      if (designType) draftTypeRef.current = designType;
      const requestType = draftTypeRef.current;
      const isCurrent = saveQueue.current();
      const writeLatestDraft = async (acknowledged?: CanvasDocument) => {
        if (!userId || !studioOfflineSupported()) return false;
        let written = false;
        try {
          await cacheQueue.run(async cacheContext => {
            while (isCurrent() && cacheContext.active()) {
              const snapshot = docRef.current ?? canvas, snapshotType = draftTypeRef.current;
              await putStudioOfflineDraft({
                userId, designId, designTitle: design?.title ?? "Studio design",
                canvas: snapshot, designType: snapshotType,
                businessId: design?.business_id ?? null, accessRole: access?.role ?? null,
                serverUpdatedAt: saveQueue.getRevision(), savedAt: new Date().toISOString(),
                dirty: snapshot !== acknowledged || snapshotType !== requestType,
              });
              if (docRef.current === snapshot && draftTypeRef.current === snapshotType) { written = true; return; }
            }
          });
          return written;
        } catch { return false; }
      };
      const localSaved = await writeLatestDraft();
      if (!isCurrent()) return;
      return saveQueue.run(async context => {
        if (!context.active() || context.blocked()) return;
        if (docRef.current !== canvas || draftTypeRef.current !== requestType) return;
        if (!navigator.onLine) {
          setSaveState(localSaved ? "offline" : "error");
          setSyncState(localSaved ? "offline" : "online");
          if (!localSaved) setError("Could not save this draft on your device. Keep this tab open and reconnect.");
          return;
        }
        if (!context.revision()) {
          setSaveState("error"); setError("Reconnect and load the server version before syncing this draft."); return;
        }
        setSaveState("saving"); setSyncState("syncing");
        try {
          const res = await fetch(`/api/create/designs/${designId}`, {
            method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ canvas, designType: requestType, expectedUpdatedAt: context.revision() }),
          });
          const data = await res.json().catch(() => ({}));
          if (!context.active()) return;
          if (res.status === 409 && data.code === "studio_version_conflict") {
            context.conflict(); setSaveState("error"); setSyncState("conflict");
            const latestRes = await fetch(`/api/create/designs/${designId}`, { credentials: "include", cache: "no-store" });
            const latest = await latestRes.json().catch(() => ({}));
            if (context.active() && latestRes.ok && validStudioSaveReceipt(latest.design, designId) && latest.design.canvas) {
              setConflictServer({ doc: parseCanvasDocument(latest.design.canvas, latest.design.design_type as StudioDesignType), updatedAt: latest.design.updated_at, designType: latest.design.design_type as StudioDesignType });
            }
            return;
          }
          if (!res.ok || !validStudioSaveReceipt(data.design, designId)) {
            context.conflict(); setSaveState("error"); setSyncState("online");
            setError(typeof data.error === "string" ? data.error : "Could not confirm this save. Reload before retrying; your draft is kept."); return;
          }
          const revision = data.design.updated_at;
          context.acknowledge(revision); setServerRevision(revision);
          lastSavedDocRef.current = canvas;
          const cached = await writeLatestDraft(canvas);
          if (!context.active()) return;
          const dirty = docRef.current !== canvas || draftTypeRef.current !== requestType;
          setDesign(current => current ? { ...current, ...(!dirty ? { design_type: requestType } : {}), updated_at: revision } : current);
          if (!context.active()) return;
          setSyncState("online"); setSaveState(dirty ? "pending" : "saved");
          setError(dirty && !cached ? "New edits could not be cached on this device. Keep this tab open until they sync." : null);
          if (!dirty) setTimeout(() => {
            if (context.active() && docRef.current === canvas && context.revision() === revision) setSaveState("idle");
          }, 1800);
        } catch {
          if (!context.active()) return;
          setSaveState(localSaved ? "offline" : "error"); setSyncState(localSaved ? "offline" : "online");
          if (!localSaved) setError("Save failed and the local draft could not be stored. Keep this tab open and reconnect.");
        }
      });
    },
    [designId, canEdit, design?.business_id, design?.title, access?.role, userId, saveQueue, cacheQueue],
  );

  async function changeVersion(action: { label: string } | { versionId: string }) {
    const snapshot = docRef.current;
    if (!canEdit || !snapshot || !navigator.onLine || saveQueue.isBlocked()) {
      throw new Error("Save and resolve any sync conflict before using history.");
    }
    if (snapshot !== lastSavedDocRef.current) await persist(snapshot);
    if (docRef.current !== snapshot || lastSavedDocRef.current !== snapshot || saveQueue.isBlocked()) {
      throw new Error("Your latest changes are not saved yet. Save the draft before using history.");
    }
    await saveQueue.run(async context => {
      if (!context.active() || context.blocked() || docRef.current !== snapshot) {
        throw new Error("The draft changed. Save it before using history.");
      }
      const restoring = "versionId" in action;
      const response = await fetch(`/api/create/designs/${designId}/versions${restoring ? "/restore" : ""}`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...action, expectedUpdatedAt: context.revision() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!context.active()) return;
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not update history.");
      if (!restoring) {
        if (typeof data.versionId !== "string") throw new Error("Could not confirm the named version.");
        return;
      }
      if (!validStudioSaveReceipt(data.design, designId) || !data.design.canvas) {
        context.conflict();
        throw new Error("Could not confirm the restored version. Reload before retrying.");
      }
      const next = parseCanvasDocument(data.design.canvas, data.design.design_type as StudioDesignType);
      if (docRef.current !== snapshot) {
        context.conflict(); setSyncState("conflict");
        setConflictServer({ doc: next, updatedAt: data.design.updated_at, designType: data.design.design_type });
        throw new Error("The saved version was restored, but your newer local edits were kept. Choose which version to keep.");
      }
      context.acknowledge(data.design.updated_at); setServerRevision(data.design.updated_at);
      docRef.current = next; lastSavedDocRef.current = next;
      setDoc(next); setDesign(current => current ? { ...current, ...data.design } : current);
      setHistory([]); setFuture([]); setSelectedLayerIds([]); setActivePageId(next.pages[0]?.id ?? "");
      setSaveState("saved"); setError(null);
      if (userId && studioOfflineSupported()) {
        await cacheQueue.run(async cacheContext => {
          if (!cacheContext.active() || !context.active()) return;
          const latest = docRef.current ?? next;
          await putStudioOfflineDraft({
            userId, designId, designTitle: data.design.title, canvas: latest, designType: draftTypeRef.current,
            businessId: data.design.business_id, accessRole: access?.role ?? null,
            serverUpdatedAt: context.revision(), savedAt: new Date().toISOString(), dirty: latest !== next,
          });
        }).catch(() => setError("The restored version could not be cached on this device."));
      }
    });
  }

  async function acceptServerConflictVersion() {
    if (!conflictServer || !design) return;
    const next = conflictServer.doc;
    draftTypeRef.current = conflictServer.designType;
    setServerUpdatedAt(conflictServer.updatedAt);
    setDesign((current) => current ? { ...current, canvas: next, design_type: conflictServer.designType, updated_at: conflictServer.updatedAt } : current);
    docRef.current = next;
    lastSavedDocRef.current = next;
    setDoc(next);
    setActivePageId(next.pages[0]?.id ?? "");
    setSelectedLayerIds([]);
    setHistory([]);
    setFuture([]);
    setConflictServer(null);
    setSyncState("online");
    setSaveState("saved");
    if (userId && studioOfflineSupported()) {
      await cacheQueue.run(async context => {
        let stable = false;
        while (!stable && context.active()) {
          const snapshot = docRef.current ?? next, snapshotType = draftTypeRef.current;
          await putStudioOfflineDraft({
            userId, designId, designTitle: design.title, canvas: snapshot, designType: snapshotType,
            businessId: design.business_id, accessRole: access?.role ?? null,
            serverUpdatedAt: saveQueue.getRevision(), savedAt: new Date().toISOString(),
            dirty: snapshot !== next || snapshotType !== conflictServer.designType,
          });
          stable = docRef.current === snapshot && draftTypeRef.current === snapshotType;
        }
      }).catch(() => setError("The selected version could not be cached on this device."));
    }
  }

  async function acceptLocalConflictVersion() {
    if (!conflictServer || !docRef.current || !design || !canEdit) return;
    setServerUpdatedAt(conflictServer.updatedAt);
    setConflictServer(null);
    await persist(docRef.current, draftTypeRef.current);
  }

  function applyDoc(next: CanvasDocument, recordHistory: boolean) {
    if (!canEdit) return;
    if (recordHistory && docRef.current) {
      const previous = docRef.current;
      setHistory((h) => [...h.slice(-(HISTORY_CAP - 1)), previous]);
      setFuture([]);
    }
    docRef.current = next;
    setSaveState(current => saveQueue.isBlocked() ? current : "pending");
    setDoc(next);
  }

  function onChangeDoc(next: CanvasDocument, opts?: { ephemeral?: boolean }) {
    if (!canEdit) return;
    if (opts?.ephemeral) {
      setSaveState(current => saveQueue.isBlocked() ? current : "pending");
      if (!dragBaseline.current && docRef.current) {
        dragBaseline.current = docRef.current;
      }
      docRef.current = next;
      setDoc(next);
      return;
    }
    if (dragBaseline.current) {
      const baseline = dragBaseline.current;
      setHistory((h) => [...h.slice(-(HISTORY_CAP - 1)), baseline]);
      setFuture([]);
      dragBaseline.current = null;
      docRef.current = next;
      setDoc(next);
      return;
    }
    applyDoc(next, true);
  }

  function undo() {
    const current = docRef.current, previous = history[history.length - 1];
    if (!canEdit || !current || !previous) return;
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [current, ...f].slice(0, HISTORY_CAP));
    dragBaseline.current = null;
    setSaveState(current => saveQueue.isBlocked() ? current : "pending");
    docRef.current = previous;
    setDoc(previous);
  }

  function redo() {
    const current = docRef.current, next = future[0];
    if (!canEdit || !current || !next) return;
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, current].slice(-HISTORY_CAP));
    dragBaseline.current = null;
    setSaveState(current => saveQueue.isBlocked() ? current : "pending");
    docRef.current = next;
    setDoc(next);
  }

  /** Autosave ~1.2s after edits */
  useEffect(() => {
    if (!doc || !canEdit || doc === lastSavedDocRef.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      if (doc !== lastSavedDocRef.current) void persist(doc);
    }, 1200);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [doc, persist, canEdit]);

  useEffect(() => {
    function onOnline() {
      if (!docRef.current || !canEdit || saveQueue.isBlocked()) return;
      setSyncState("syncing");
      void persist(docRef.current);
    }
    function onOffline() {
      setSyncState(current => current === "conflict" ? current : "offline");
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (!navigator.onLine) setSyncState("offline");
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [canEdit, persist, saveQueue]);

  /** Timeline playhead advances while playing */
  useEffect(() => {
    if (!timelinePlaying || !doc) return;
    const total = Math.max(1, doc.pages.reduce((s, p) => s + (p.durationMs ?? 2000), 0));
    const id = window.setInterval(() => {
      setPlayheadMs((prev) => {
        const next = prev + 100;
        if (next >= total) {
          setTimelinePlaying(false);
          return total - 1;
        }
        const clip = clipAtTime(doc, next);
        if (clip) setActivePageId(clip.pageId);
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [timelinePlaying, doc]);

  /** Keep soundtrack audio in sync with playhead (S8c-lite). */
  useEffect(() => {
    const canonicalUrl = doc?.soundtrack?.url;
    const url = canonicalUrl ? resolveMediaUrl(canonicalUrl) : undefined;
    if (!url) {
      soundtrackAudioRef.current?.pause();
      return;
    }
    let audio = soundtrackAudioRef.current;
    if (!audio || audio.src !== url) {
      audio?.pause();
      audio = new Audio(url);
      audio.preload = "auto";
      soundtrackAudioRef.current = audio;
    }
    const targetSec = playheadMs / 1000;
    if (Math.abs(audio.currentTime - targetSec) > 0.25) {
      try {
        audio.currentTime = targetSec;
      } catch {
        /* not seekable yet */
      }
    }
    if (timelinePlaying) {
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [doc?.soundtrack?.url, playheadMs, timelinePlaying, doc, resolveMediaUrl]);

  useEffect(() => {
    return () => {
      soundtrackAudioRef.current?.pause();
      soundtrackAudioRef.current = null;
    };
  }, []);

  async function downloadPng() {
    if (!doc || !design) return;
    setExportNote("Rendering PNG…");
    const dataUrl = await exportCanvasToPngDataUrlAsync(documentWithResolvedMedia(doc), 1, activePageId || undefined);
    if (!dataUrl) {
      setExportNote("Could not render PNG.");
      return;
    }
    downloadPngDataUrl(dataUrl, design.title || "kebu-studio");
    setExportNote("PNG downloaded.");
  }

  async function downloadZip() {
    if (!doc || !design) return;
    setPackBusy(true);
    setExportNote("Building ZIP of all pages…");
    try {
      const result = await exportCanvasPagesZipBlob(documentWithResolvedMedia(doc), 1);
      if ("error" in result) {
        setExportNote(result.error);
        return;
      }
      downloadStudioExport(result.blob, `${design.title || "kebu-studio"}-pages.zip`);
      setExportNote("ZIP downloaded (one PNG per page).");
    } finally {
      setPackBusy(false);
    }
  }

  async function downloadPdf() {
    if (!doc || !design) return;
    setPackBusy(true);
    setExportNote("Building PDF…");
    try {
      const result = await exportCanvasPagesPdfBlob(documentWithResolvedMedia(doc), 0.75);
      if ("error" in result) {
        setExportNote(result.error);
        return;
      }
      downloadStudioExport(result.blob, `${design.title || "kebu-studio"}.pdf`);
      setExportNote("PDF downloaded (one page per artboard).");
    } finally {
      setPackBusy(false);
    }
  }

  function applyResize(next: CanvasDocument, designType?: StudioDesignType) {
    if (!canEdit) return;
    onChangeDoc(next);
    void persist(next, designType);
    setExportNote(
      designType
        ? `Resized to ${designType.replace(/_/g, " ")} (${next.width}×${next.height}).`
        : `Resized to ${next.width}×${next.height}.`,
    );
  }

  async function downloadMotion() {
    if (!doc || !design) return;
    setMotionBusy(true);
    const secs = estimateTimelineDurationSeconds(doc);
    setExportNote(`Recording timeline (~${secs.toFixed(1)}s) with video seek…`);
    try {
      const result = await exportCanvasMotionToWebmBlob(documentWithResolvedMedia(doc), {
        scale: 0.5,
        fps: 15,
      });
      if ("error" in result) {
        setExportNote(result.error);
        return;
      }
      downloadBlob(result.blob, `${design.title || "kebu-studio"}-timeline.webm`);
      setExportNote(
        "Timeline WebM downloaded — pages play by duration; video layers seek frame-by-frame.",
      );
    } finally {
      setMotionBusy(false);
    }
  }


  async function createVariant(designType: StudioDesignType) {
    if (!doc || !design || !canEdit || variantBusy) return;
    setVariantBusy(true);
    setExportNote("Creating editable variant…");
    try {
      const canvas = resizeCanvasDocument(doc, { designType });
      const res = await fetch("/api/create/designs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: (design.title || "Studio design") + " · " + designType.replace(/_/g, " "),
          designType,
          businessId: design.business_id,
          canvas,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.design?.id) {
        setExportNote(data.error ?? "Could not create variant.");
        return;
      }
      window.location.assign("/studio/" + data.design.id);
    } catch {
      setExportNote("Could not create variant. Your original design was not changed.");
    } finally {
      setVariantBusy(false);
    }
  }

  async function turnDesignIntoVideo() {
    if (!doc || !design || !canEdit || videoBusy) return;
    setVideoBusy(true);
    setExportNote("Preparing design pages for video…");
    try {
      if (!doc.pages.length) {
        setExportNote("This design has no page to send to video.");
        return;
      }

      const sourceImages: Array<{ url: string; name: string; durationMs: number; pageId: string }> = [];
      for (let index = 0; index < doc.pages.length; index += 1) {
        const page = doc.pages[index]!;
        setExportNote("Preparing page " + (index + 1) + " of " + doc.pages.length + "…");

        const exportDoc = documentWithResolvedMedia(doc);
        let imageDataUrl = await exportCanvasToPngDataUrlAsync(exportDoc, 1, page.id);
        if (!imageDataUrl) {
          setExportNote("Could not render page " + (index + 1) + ".");
          return;
        }
        let blob = await fetch(imageDataUrl).then((response) => response.blob());
        if (blob.size > 5 * 1024 * 1024) {
          imageDataUrl = await exportCanvasToPngDataUrlAsync(exportDoc, 0.7, page.id);
          if (!imageDataUrl) {
            setExportNote("Could not prepare a smaller snapshot for page " + (index + 1) + ".");
            return;
          }
          blob = await fetch(imageDataUrl).then((response) => response.blob());
        }
        if (blob.size > 5 * 1024 * 1024) {
          setExportNote("Page " + (index + 1) + " is too large to turn into video. Reduce large images and try again.");
          return;
        }

        const uploadForm = new FormData();
        uploadForm.set("designId", designId);
        uploadForm.set(
          "file",
          new File(
            [blob],
            (design.title || "studio-design").slice(0, 64) + "-page-" + (index + 1) + ".png",
            { type: "image/png" },
          ),
        );
        const upload = await fetch("/api/studio/upload", {
          method: "POST",
          credentials: "include",
          body: uploadForm,
        });
        const uploadData = await upload.json().catch(() => ({}));
        if (!upload.ok || typeof uploadData.url !== "string") {
          setExportNote(uploadData.error ?? "Could not store page " + (index + 1) + ".");
          return;
        }

        sourceImages.push({
          url: uploadData.url,
          name: page.name || "Page " + (index + 1),
          durationMs: page.durationMs ?? 3000,
          pageId: page.id,
        });
      }

      const firstPage = doc.pages[0]!;
      const ratio = firstPage.width / firstPage.height;
      const presetId =
        ratio > 1.35 ? "16:9" : ratio < 0.68 ? "9:16" : ratio > 0.92 && ratio < 1.08 ? "1:1" : "4:5";
      const created = await fetch("/api/studio/video", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: (design.title || "Studio design") + " video",
          presetId,
          sourceDesignId: designId,
          sourceImages,
        }),
      });
      const createdData = await created.json().catch(() => ({}));
      if (!created.ok || !createdData.project?.id) {
        setExportNote(createdData.error ?? "Could not create the video project.");
        return;
      }

      setExportNote(
        sourceImages.length === 1
          ? "Video project created from this design."
          : "Video storyboard created from all " + sourceImages.length + " design pages.",
      );
      window.location.assign("/studio/video/" + createdData.project.id);
    } finally {
      setVideoBusy(false);
    }
  }

  async function sendToShop() {
    if (!doc || !exportProjectId) {
      setExportNote("Choose a shop project first.");
      return;
    }
    if (!canEdit) {
      setExportNote("View-only — ask the owner for edit access to send to Shop.");
      return;
    }
    setExportNote("Rendering…");
    const imageDataUrl = await exportCanvasToPngDataUrlAsync(doc, 0.5, activePageId || undefined);
    if (!imageDataUrl) {
      setExportNote("Could not render PNG.");
      return;
    }
    const res = await fetch(`/api/create/designs/${designId}/export-to-product`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: exportProjectId,
        productName: design?.title ?? "Studio design",
        imageDataUrl,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setExportNote(
      res.ok
        ? `Product ready — open Shop to set price. ${data.shopPath ?? ""}`
        : (data.error ?? "Export failed."),
    );
  }

  if (error && (!doc || !design || !access)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p role="alert">{error}</p>
        <button type="button" onClick={() => void load()} className="rounded-lg border px-4 py-2">Retry</button>
      </div>
    );
  }

  if (!doc || !design || !access) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0B0B0C] text-white/45">Loading…</div>;
  }

  const timelineVisible = timelineOverride ?? studioNeedsTimeline(doc);

  const saveLabel = !canEdit
    ? studioRoleLabel(access.role)
    : syncState === "conflict"
      ? "Sync conflict · local draft kept"
      : saveState === "error"
        ? "Save failed"
        : syncState === "offline"
        ? "Offline · changes not synced"
        : syncState === "syncing"
          ? "Syncing…"
          : saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Saved"
              : saveState === "pending"
                ? "Unsaved changes"
                : "Autosave on";

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0C] text-white">
      <header className="relative z-50 shrink-0 border-b border-white/10 bg-[#0B0B0C]">
        <div className="flex h-14 items-center gap-4 px-3 sm:px-5">
          <Link href="/dashboard" className="shrink-0 text-[9px] font-semibold text-white/55 no-underline">← Kebu</Link><span className="text-white/15">|</span><Link href="/studio" className="shrink-0 text-[11px] font-semibold text-white no-underline">Studio</Link>
          <span className="text-[10px] text-white/45">Design</span>
          <nav aria-label="Studio navigation" className="ml-auto flex items-center gap-4 text-[11px] text-white/70">
            <Link href="/studio">Projects</Link><Link href="/studio/templates">Templates</Link>
          </nav>
        </div>
        <div role="group" aria-label="Studio commands" className="flex min-h-12 min-w-0 items-center gap-2 border-t border-white/[.06] px-3 py-2 sm:px-5">
          <Link href="/studio" className="hidden shrink-0 rounded-[8px] bg-[#FF6A00] px-3 py-2 text-[11px] font-semibold text-white sm:block">+ Create new</Link>
          <h1 className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white">{design.title}</h1>
          <span className="hidden shrink-0 rounded-[8px] border border-white/10 bg-white/[.035] px-3 py-2 text-[10px] text-white/65 xl:block">{doc.width} × {doc.height}</span>
          <span role="status" className="max-w-[110px] shrink-0 text-[10px] leading-tight text-white/70">{saveLabel}</span>
          <button type="button" onClick={() => setShowBrandKit((v)=>!v)} className="hidden shrink-0 rounded-[8px] border border-white/10 bg-white/[.035] px-3 py-2 text-[11px] font-semibold text-white/70 lg:block">Brand</button>
          {canEdit ? <button type="button" onClick={()=>setShowResize(true)} className="hidden shrink-0 rounded-[8px] border border-white/10 bg-white/[.035] px-3 py-2 text-[11px] font-semibold text-white/70 lg:block">Resize</button> : null}
          <select aria-label="Create editable size variant" disabled={!canEdit || variantBusy || syncState==="conflict"} defaultValue="" onChange={(e)=>{const value=e.target.value as StudioDesignType;if(value)void createVariant(value);e.currentTarget.value=""}} className="hidden max-w-[110px] shrink-0 rounded-[8px] border border-white/10 bg-[#171719] px-3 py-2 text-[11px] font-semibold text-white/70 xl:block"><option value="">{variantBusy?"Creating…":"Variant"}</option><option value="instagram_post">Instagram post</option><option value="instagram_story">Instagram story</option><option value="whatsapp_status">WhatsApp status</option><option value="facebook_post">Facebook post</option><option value="flyer">Flyer</option><option value="poster">Poster</option><option value="banner">Banner</option><option value="business_card">Business card</option></select><details className="relative"><summary className="cursor-pointer list-none rounded-[8px] border border-white/10 bg-white/[.035] px-3 py-2 text-[9px] font-semibold text-white/70">More</summary><div className="absolute right-0 top-11 z-50 w-[190px] rounded-[12px] border border-white/10 bg-[#171719] p-2 shadow-2xl">
            <button type="button" onClick={()=>setShowBrandKit(v=>!v)} className="block w-full rounded-lg px-3 py-2 text-left text-[11px] text-white/80 hover:bg-white/[.06] lg:hidden">Brand</button>
            {canEdit ? <button type="button" onClick={()=>setShowResize(true)} className="block w-full rounded-lg px-3 py-2 text-left text-[11px] text-white/80 hover:bg-white/[.06] lg:hidden">Resize</button> : null}
            <label className="block px-3 py-2 text-[11px] text-white/80 xl:hidden">Size variant<select aria-label="Create editable size variant" disabled={!canEdit || variantBusy || syncState==="conflict"} defaultValue="" onChange={e=>{const value=e.target.value as StudioDesignType;if(value)void createVariant(value);e.currentTarget.value=""}} className="mt-1 w-full rounded border border-white/20 bg-[#171719] p-2"><option value="">{variantBusy?"Creating…":"Choose size"}</option>{(["instagram_post","instagram_story","whatsapp_status","facebook_post","flyer","poster","banner","business_card"] as const).map(value=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}</select></label>
            <button type="button" onClick={()=>{setShowShare(v=>!v);setShowVersions(false);setShowComments(false)}} className="block w-full rounded-lg px-3 py-2 text-left text-[11px] text-white/80 sm:hidden">Share</button>
            <button type="button" onClick={()=>{setTimelineOverride(!timelineVisible);if(timelineVisible){setTimelinePlaying(false);setPlayheadMs(0)}}} className="block w-full rounded-lg px-3 py-2 text-left text-[11px] text-white/80 hover:bg-white/[.06]">{timelineVisible ? "Hide timeline" : "Show timeline"}</button>
            <button type="button" onClick={()=>void downloadPng()} className="block w-full rounded-lg px-3 py-2 text-left text-[9px] text-white/70 hover:bg-white/[.06]">Download PNG</button>
            <button type="button" disabled={packBusy} onClick={()=>void downloadPdf()} className="block w-full rounded-lg px-3 py-2 text-left text-[9px] text-white/70 hover:bg-white/[.06]">Export PDF</button>
            <button type="button" disabled={packBusy} onClick={()=>void downloadZip()} className="block w-full rounded-lg px-3 py-2 text-left text-[9px] text-white/70 hover:bg-white/[.06]">Download pages ZIP</button>
            <button type="button" disabled={motionBusy} onClick={()=>void downloadMotion()} className="block w-full rounded-lg px-3 py-2 text-left text-[9px] text-white/70 hover:bg-white/[.06]">Export timeline</button>
            {canEdit ? <button type="button" disabled={videoBusy || syncState==="conflict"} onClick={()=>void turnDesignIntoVideo()} className="block w-full rounded-lg px-3 py-2 text-left text-[9px] text-white/70 hover:bg-white/[.06]">Turn into video</button> : null}
            <button type="button" onClick={()=>{setShowVersions((v)=>!v);setShowShare(false);setShowComments(false)}} className="block w-full rounded-lg px-3 py-2 text-left text-[9px] text-white/70 hover:bg-white/[.06]">Versions</button>
            <button type="button" onClick={()=>{setShowComments((v)=>!v);setShowShare(false);setShowVersions(false)}} className="block w-full rounded-lg px-3 py-2 text-left text-[9px] text-white/70 hover:bg-white/[.06]">Comments</button>
          </div></details>
          <button type="button" onClick={()=>{setShowShare((v)=>!v);setShowVersions(false);setShowComments(false)}} className="hidden shrink-0 rounded-[8px] border border-white/15 px-3 py-2 text-[11px] font-semibold text-white sm:block">Share</button>
          {canEdit ? <button type="button" onClick={()=>doc&&void persist(doc)} className="shrink-0 rounded-[8px] bg-[#FF6A00] px-3 py-2 text-[11px] font-semibold text-white">Save draft</button> : null}
        </div>      </header>

      {error ? <div role="alert" className="border-b border-red-400/25 bg-red-950/40 px-4 py-3 text-xs text-red-100">{error}</div> : null}
      {syncState === "conflict" ? (
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black">This design changed somewhere else.</p>
              <p className="text-[10px] opacity-70">
                Your local work is still on this device. Choose which version should become the current Studio design.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!conflictServer}
                onClick={() => void acceptServerConflictVersion()}
                className="rounded-full border border-amber-400 bg-white px-3 py-2 text-[10px] font-black disabled:opacity-40"
              >
                Use server version
              </button>
              <button
                type="button"
                disabled={!conflictServer || !canEdit}
                onClick={() => void acceptLocalConflictVersion()}
                className="rounded-full bg-black px-3 py-2 text-[10px] font-black text-white disabled:opacity-40"
              >
                Keep my version
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showBrandKit ? (
        <div className="px-4 py-3 border-b bg-white shrink-0">
          <StudioBrandKitPanel businessId={design.business_id} />
        </div>
      ) : null}

      {showResize && canEdit ? (
        <StudioResizeDialog
          document={doc}
          onApply={applyResize}
          onClose={() => setShowResize(false)}
        />
      ) : null}

      {showCoach ? (
        <StudioCoachPanel coach={doc.coach} onDismiss={() => setShowCoach(false)} />
      ) : doc.coach?.mode === "teach_me" && (doc.coach.lessons?.length ?? 0) > 0 ? (
        <button
          type="button"
          className="text-[11px] px-4 py-1.5 border-b bg-white text-left w-full underline opacity-70"
          onClick={() => setShowCoach(true)}
        >
          Show Teach me lessons
        </button>
      ) : null}

      {showVersions ? (
        <div className="px-4 py-3 border-b bg-white shrink-0 max-w-xl">
          <StudioVersionHistoryPanel
            designId={designId}
            canEdit={canEdit}
            onSaveVersion={label => changeVersion({ label })}
            onRestoreVersion={versionId => changeVersion({ versionId })}
          />
        </div>
      ) : null}

      {showComments ? (
        <div className="px-4 py-3 border-b bg-white shrink-0 max-w-xl">
          <StudioCommentsPanel
            designId={designId}
            userId={userId}
            isOwner={access?.role === "owner"}
          />
        </div>
      ) : null}

      {showShare ? (
        <div className="px-4 py-3 border-b bg-white space-y-4 shrink-0">
          <StudioSharePanel designId={designId} access={access} />
          {access.role === "owner" ? (
            <StudioReachPromote
              designId={designId}
              designTitle={design.title}
              projects={projects}
            />
          ) : null}
          {canEdit && access.role === "owner" ? (
            <div className="space-y-2 border-t border-black/5 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Send → Shop</p>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={exportProjectId}
                  onChange={(e) => setExportProjectId(e.target.value)}
                  className="rounded-lg border px-2 py-1.5 text-sm min-w-[200px]"
                >
                  <option value="">Choose shop…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void sendToShop()}
                  className="rounded-full px-4 py-2 text-xs font-bold text-white"
                  style={{ background: "#E05A2B" }}
                >
                  Create / update product image
                </button>
              </div>
              {exportNote ? <p className="text-xs opacity-80">{exportNote}</p> : null}
            </div>
          ) : null}
        </div>
      ) : exportNote && !showShare ? (
        <p className="px-4 py-1 text-[11px] bg-white border-b opacity-70">{exportNote}</p>
      ) : null}

      <StudioCanvasEditor
        designId={designId}
        document={doc}
        onChange={onChangeDoc}
        activePageId={activePageId || doc.pages[0]!.id}
        onActivePageChange={setActivePageId}
        selectedLayerIds={selectedLayerIds}
        onSelectLayers={setSelectedLayerIds}
        onUndo={undo}
        onRedo={redo}
        canUndo={canEdit && history.length > 0}
        canRedo={canEdit && future.length > 0}
        readOnly={!canEdit}
        liveCursorsUserId={userId}
        liveCursorsLabel={access?.role === "owner" ? "Owner" : access?.role === "editor" ? "Editor" : "Viewer"}
        businessId={design.business_id}
        previewLocalMs={pageLocalTimeMs(doc, playheadMs)?.localMs ?? 0}
        timelineVisible={timelineVisible}
        resolveMediaUrl={resolveMediaUrl}
      />
      {timelineVisible ? <StudioTimelinePanel
        designId={designId}
        document={doc}
        onChange={(next) => onChangeDoc(next)}
        activePageId={activePageId || doc.pages[0]!.id}
        onActivePageChange={setActivePageId}
        playheadMs={playheadMs}
        onPlayheadChange={setPlayheadMs}
        playing={timelinePlaying}
        onPlayingChange={setTimelinePlaying}
        readOnly={!canEdit}
      /> : null}
    </div>
  );
}

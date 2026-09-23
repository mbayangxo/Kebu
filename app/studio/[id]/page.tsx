"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  downloadJpegDataUrl,
  downloadPngDataUrl,
  exportCanvasToJpegDataUrlAsync,
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
import { clipAtTime, pageLocalTimeMs } from "@/lib/studio/timeline";
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
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "offline" | "error">("idle");
  const [syncState, setSyncState] = useState<"online" | "offline" | "syncing" | "conflict">("online");
  const [conflictServer, setConflictServer] = useState<{ doc: CanvasDocument; updatedAt: string } | null>(null);
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportProjectId, setExportProjectId] = useState("");
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showResize, setShowResize] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [packBusy, setPackBusy] = useState(false);
  const [motionBusy, setMotionBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [variantBusy, setVariantBusy] = useState(false);
  const [secondsPerPage, setSecondsPerPage] = useState(2);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const soundtrackAudioRef = useRef<HTMLAudioElement | null>(null);
  const [history, setHistory] = useState<CanvasDocument[]>([]);
  const [future, setFuture] = useState<CanvasDocument[]>([]);
  const [offlineMediaUrls, setOfflineMediaUrls] = useState<Record<string, string>>({});
  const offlineObjectUrls = useRef<string[]>([]);
  const skipHistory = useRef(false);
  const dragBaseline = useRef<CanvasDocument | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docRef = useRef<CanvasDocument | null>(null);

  const canEdit = access?.canEdit !== false;

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
    setError(null);
    try {
      const res = await fetch(`/api/create/designs/${designId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Design not found.");
        return;
      }

      const d = data.design as Design;
      const nextUserId = typeof data.userId === "string" ? data.userId : null;
      const serverDoc = parseCanvasDocument(d.canvas, d.design_type as StudioDesignType);
      let initialDoc = serverDoc;
      let initialDesignType = d.design_type as StudioDesignType;

      if (nextUserId && studioOfflineSupported()) {
        const local = await getStudioOfflineDraft(nextUserId, designId).catch(() => null);
        if (local?.dirty) {
          initialDoc = local.canvas;
          initialDesignType = local.designType;
          setSyncState("offline");
        } else {
          setSyncState("online");
        }
      }

      setDesign({ ...d, design_type: initialDesignType });
      setServerUpdatedAt(d.updated_at ?? null);
      if (data.access) setAccess(data.access as StudioDesignAccess);
      setUserId(nextUserId);
      skipHistory.current = true;
      setDoc(initialDoc);
      docRef.current = initialDoc;
      setActivePageId(initialDoc.pages[0]?.id ?? "");
      setSelectedLayerIds([]);
      setHistory([]);
      setFuture([]);
      if (nextUserId) void hydrateOfflineMedia(nextUserId, initialDoc, true);
    } catch {
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
        skipHistory.current = true;
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
  }, [designId, hydrateOfflineMedia]);

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

  const persist = useCallback(
    async (canvas: CanvasDocument, designType?: StudioDesignType) => {
      if (!canEdit) return;
      const effectiveType = designType ?? (design?.design_type as StudioDesignType | undefined) ?? "poster";
      const savedAt = new Date().toISOString();

      if (userId && studioOfflineSupported()) {
        await putStudioOfflineDraft({
          userId,
          designId,
          designTitle: design?.title ?? "Studio design",
          canvas,
          designType: effectiveType,
          businessId: design?.business_id ?? null,
          accessRole: access?.role ?? null,
          serverUpdatedAt,
          savedAt,
          dirty: true,
        }).catch(() => undefined);
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSaveState("offline");
        setSyncState("offline");
        return;
      }

      setSaveState("saving");
      setSyncState("syncing");
      try {
        const body: {
          canvas: CanvasDocument;
          designType?: StudioDesignType;
          expectedUpdatedAt?: string;
        } = { canvas };
        if (designType) body.designType = designType;
        if (serverUpdatedAt) body.expectedUpdatedAt = serverUpdatedAt;

        const res = await fetch(`/api/create/designs/${designId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 409 && data.code === "studio_version_conflict") {
          setSaveState("error");
          setSyncState("conflict");
          try {
            const latestRes = await fetch("/api/create/designs/" + designId, {
              credentials: "include",
              cache: "no-store",
            });
            const latest = await latestRes.json().catch(() => ({}));
            if (latestRes.ok && latest.design?.canvas && typeof latest.design.updated_at === "string") {
              setConflictServer({
                doc: parseCanvasDocument(latest.design.canvas, latest.design.design_type as StudioDesignType),
                updatedAt: latest.design.updated_at,
              });
            }
          } catch {
            setConflictServer(null);
          }
          return;
        }
        if (!res.ok || !data.design) {
          setSaveState("error");
          setSyncState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online");
          return;
        }

        const nextUpdatedAt = typeof data.design.updated_at === "string" ? data.design.updated_at : new Date().toISOString();
        setServerUpdatedAt(nextUpdatedAt);
        if (designType) {
          setDesign((current) => current ? { ...current, design_type: designType, updated_at: nextUpdatedAt } : current);
        } else {
          setDesign((current) => current ? { ...current, updated_at: nextUpdatedAt } : current);
        }

        if (userId && studioOfflineSupported()) {
          await putStudioOfflineDraft({
            userId,
            designId,
            designTitle: design?.title ?? "Studio design",
            canvas,
            designType: effectiveType,
            businessId: design?.business_id ?? null,
            accessRole: access?.role ?? null,
            serverUpdatedAt: nextUpdatedAt,
            savedAt: new Date().toISOString(),
            dirty: false,
          }).catch(() => undefined);
        }

        setSyncState("online");
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1800);
      } catch {
        setSaveState("offline");
        setSyncState("offline");
      }
    },
    [designId, canEdit, design?.business_id, design?.design_type, design?.title, access?.role, serverUpdatedAt, userId],
  );

  async function acceptServerConflictVersion() {
    if (!conflictServer || !design) return;
    const next = conflictServer.doc;
    setServerUpdatedAt(conflictServer.updatedAt);
    setDesign((current) => current ? { ...current, canvas: next, updated_at: conflictServer.updatedAt } : current);
    skipHistory.current = true;
    docRef.current = next;
    setDoc(next);
    setActivePageId(next.pages[0]?.id ?? "");
    setSelectedLayerIds([]);
    setHistory([]);
    setFuture([]);
    setConflictServer(null);
    setSyncState("online");
    setSaveState("saved");
    if (userId && studioOfflineSupported()) {
      await putStudioOfflineDraft({
        userId,
        designId,
        designTitle: design.title,
        canvas: next,
        designType: design.design_type as StudioDesignType,
        businessId: design.business_id,
        accessRole: access?.role ?? null,
        serverUpdatedAt: conflictServer.updatedAt,
        savedAt: new Date().toISOString(),
        dirty: false,
      }).catch(() => undefined);
    }
  }

  async function acceptLocalConflictVersion() {
    if (!conflictServer || !docRef.current || !design || !canEdit) return;
    setSaveState("saving");
    setSyncState("syncing");
    const local = docRef.current;
    try {
      const res = await fetch("/api/create/designs/" + designId, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvas: local,
          expectedUpdatedAt: conflictServer.updatedAt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.design?.updated_at) {
        setSaveState("error");
        setSyncState("conflict");
        setError(data.error ?? "Could not resolve the Studio sync conflict.");
        return;
      }
      const nextUpdatedAt = data.design.updated_at as string;
      setServerUpdatedAt(nextUpdatedAt);
      setDesign((current) => current ? { ...current, updated_at: nextUpdatedAt } : current);
      setConflictServer(null);
      setSyncState("online");
      setSaveState("saved");
      if (userId && studioOfflineSupported()) {
        await putStudioOfflineDraft({
          userId,
          designId,
          designTitle: design.title,
          canvas: local,
          designType: design.design_type as StudioDesignType,
          businessId: design.business_id,
          accessRole: access?.role ?? null,
          serverUpdatedAt: nextUpdatedAt,
          savedAt: new Date().toISOString(),
          dirty: false,
        }).catch(() => undefined);
      }
    } catch {
      setSaveState("error");
      setSyncState("offline");
    }
  }

  function applyDoc(next: CanvasDocument, recordHistory: boolean) {
    if (!canEdit) return;
    if (recordHistory && docRef.current) {
      setHistory((h) => [...h.slice(-(HISTORY_CAP - 1)), docRef.current!]);
      setFuture([]);
    }
    docRef.current = next;
    setDoc(next);
  }

  function onChangeDoc(next: CanvasDocument, opts?: { ephemeral?: boolean }) {
    if (!canEdit) return;
    if (skipHistory.current) {
      skipHistory.current = false;
      docRef.current = next;
      setDoc(next);
      return;
    }
    if (opts?.ephemeral) {
      if (!dragBaseline.current && docRef.current) {
        dragBaseline.current = docRef.current;
      }
      docRef.current = next;
      setDoc(next);
      return;
    }
    if (dragBaseline.current) {
      setHistory((h) => [...h.slice(-(HISTORY_CAP - 1)), dragBaseline.current!]);
      setFuture([]);
      dragBaseline.current = null;
      docRef.current = next;
      setDoc(next);
      return;
    }
    applyDoc(next, true);
  }

  function undo() {
    if (!canEdit) return;
    setHistory((h) => {
      if (!h.length || !docRef.current) return h;
      const prev = h[h.length - 1]!;
      setFuture((f) => [docRef.current!, ...f].slice(0, HISTORY_CAP));
      skipHistory.current = true;
      docRef.current = prev;
      setDoc(prev);
      return h.slice(0, -1);
    });
  }

  function redo() {
    if (!canEdit) return;
    setFuture((f) => {
      if (!f.length || !docRef.current) return f;
      const next = f[0]!;
      setHistory((h) => [...h, docRef.current!].slice(-HISTORY_CAP));
      skipHistory.current = true;
      docRef.current = next;
      setDoc(next);
      return f.slice(1);
    });
  }

  /** Autosave ~1.2s after edits */
  useEffect(() => {
    if (!doc || !canEdit) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void persist(doc);
    }, 1200);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [doc, persist, canEdit]);

  useEffect(() => {
    function onOnline() {
      if (!docRef.current || !canEdit || syncState === "conflict") return;
      setSyncState("syncing");
      void persist(docRef.current);
    }
    function onOffline() {
      setSyncState("offline");
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (!navigator.onLine) setSyncState("offline");
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [canEdit, persist, syncState]);

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

  async function downloadTransparentPng() {
    if (!doc || !design) return;
    setExportNote("Rendering transparent PNG…");
    const dataUrl = await exportCanvasToPngDataUrlAsync(
      documentWithResolvedMedia(doc),
      1,
      activePageId || undefined,
      { transparentBackground: true },
    );
    if (!dataUrl) {
      setExportNote("Could not render transparent PNG.");
      return;
    }
    downloadPngDataUrl(dataUrl, `${design.title || "kebu-studio"}-transparent`);
    setExportNote("Transparent PNG downloaded with a real alpha channel.");
  }

  async function downloadJpeg() {
    if (!doc || !design) return;
    setExportNote("Rendering JPEG…");
    const dataUrl = await exportCanvasToJpegDataUrlAsync(
      documentWithResolvedMedia(doc),
      1,
      activePageId || undefined,
    );
    if (!dataUrl) {
      setExportNote("Could not render JPEG.");
      return;
    }
    downloadJpegDataUrl(dataUrl, design.title || "kebu-studio");
    setExportNote("JPEG downloaded.");
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

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0B0B0C] px-4 text-center">
        <p className="text-sm font-semibold text-white/70" role="alert">{error}</p>
        <div className="flex gap-3">
          <Link href="/studio" className="rounded-full border border-white/10 px-4 py-2 text-[11px] font-black text-white/60 hover:bg-white/[.05]">
            ← Back to Studio
          </Link>
          <button type="button" onClick={() => void load()} className="rounded-full px-4 py-2 text-[11px] font-black text-white" style={{ background: "#FF5500" }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!doc || !design || !access) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0B0B0C] text-white/45">Loading…</div>;
  }

  const saveLabel = !canEdit
    ? studioRoleLabel(access.role)
    : syncState === "conflict"
      ? "Sync conflict · local draft kept"
      : syncState === "offline"
        ? "Offline · saved on this device"
        : syncState === "syncing"
          ? "Syncing…"
          : saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Saved"
              : saveState === "error"
                ? "Save failed"
                : "Autosave on";

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0C] text-white">
      {/* Single-row header — canvas fills full height below */}
      <header className="shrink-0 z-30 border-b border-white/10 bg-[#0B0B0C]">
        <div className="flex h-14 items-center gap-2 overflow-x-auto px-3 sm:px-4">
          <Link href="/studio" className="shrink-0 text-xl font-black tracking-[-.06em] no-underline">
            <span className="text-[#FF6A00]">K</span>EBU
          </Link>
          <Link
            href="/studio"
            className="hidden shrink-0 items-center rounded-lg px-2 py-1.5 text-[9px] font-black uppercase tracking-wide text-white/45 hover:bg-white/[.05] sm:flex"
          >
            ← Projects
          </Link>
          <h1 className="min-w-0 max-w-[120px] truncate text-[12px] font-black tracking-[-.02em] text-white sm:max-w-[200px] lg:max-w-xs">
            {design.title}
          </h1>
          <div className="flex-1" />
          <span className="hidden text-[9px] font-bold uppercase tracking-[.12em] text-white/40 sm:block">
            {saveLabel}
          </span>
          <button
            type="button"
            onClick={() => setShowBrandKit((v) => !v)}
            className={`rounded-lg border px-3 py-1.5 text-[9px] font-black transition-colors ${showBrandKit ? "border-orange-500/40 bg-orange-500/10 text-orange-400" : "border-white/10 bg-white/[.04] text-white/70 hover:bg-white/[.08]"}`}
          >
            Brand
          </button>
          <button
            type="button"
            onClick={() => void downloadPng()}
            className="hidden rounded-lg border border-white/10 bg-white/[.04] px-3 py-1.5 text-[9px] font-black text-white/70 hover:bg-white/[.08] sm:block"
          >
            PNG
          </button>
          <button
            type="button"
            onClick={() => {
              setShowVersions((v) => !v);
              if (!showVersions) { setShowShare(false); setShowComments(false); }
            }}
            className={`hidden rounded-lg border px-3 py-1.5 text-[9px] font-black transition-colors lg:block ${showVersions ? "border-orange-500/40 bg-orange-500/10 text-orange-400" : "border-white/10 bg-white/[.04] text-white/70 hover:bg-white/[.08]"}`}
          >
            Versions
          </button>
          <button
            type="button"
            onClick={() => {
              setShowComments((v) => !v);
              if (!showComments) { setShowShare(false); setShowVersions(false); }
            }}
            className={`hidden rounded-lg border px-3 py-1.5 text-[9px] font-black transition-colors lg:block ${showComments ? "border-orange-500/40 bg-orange-500/10 text-orange-400" : "border-white/10 bg-white/[.04] text-white/70 hover:bg-white/[.08]"}`}
          >
            Comments
          </button>
          {/* ••• overflow menu */}
          <div className="relative">
            <button
              type="button"
              aria-label="More options"
              aria-expanded={showMoreMenu}
              onClick={() => setShowMoreMenu((v) => !v)}
              className={`rounded-lg border px-3 py-1.5 text-[9px] font-black transition-colors ${showMoreMenu ? "border-white/20 bg-white/[.08] text-white" : "border-white/10 bg-white/[.04] text-white/70 hover:bg-white/[.08]"}`}
            >
              •••
            </button>
            {showMoreMenu ? (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-white/10 bg-[#131315] py-1 shadow-2xl">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => { setShowResize(true); setShowMoreMenu(false); }}
                      className="flex w-full items-center px-4 py-2.5 text-[11px] font-semibold text-white/70 hover:bg-white/[.05] hover:text-white"
                    >
                      Resize artboard
                    </button>
                  ) : null}
                  {canEdit ? (
                    <div className="border-t border-white/[.06] px-4 py-2">
                      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-white/30">Variant</p>
                      <select
                        aria-label="Create editable size variant"
                        disabled={variantBusy || syncState === "conflict"}
                        defaultValue=""
                        onChange={(e) => {
                          const value = e.target.value as StudioDesignType;
                          if (value) void createVariant(value);
                          e.currentTarget.value = "";
                          setShowMoreMenu(false);
                        }}
                        className="w-full rounded-lg border border-white/10 bg-[#0B0B0C] px-3 py-1.5 text-[9px] font-black text-white/70 disabled:opacity-50"
                      >
                        <option value="">{variantBusy ? "Creating…" : "Choose size…"}</option>
                        <option value="instagram_post">Instagram post</option>
                        <option value="instagram_story">Instagram story</option>
                        <option value="whatsapp_status">WhatsApp status</option>
                        <option value="facebook_post">Facebook post</option>
                        <option value="flyer">Flyer</option>
                        <option value="poster">Poster</option>
                        <option value="banner">Banner</option>
                        <option value="business_card">Business card</option>
                      </select>
                    </div>
                  ) : null}
                  <div className="border-t border-white/[.06] pt-1">
                    <button
                      type="button"
                      onClick={() => { void downloadPng(); setShowMoreMenu(false); }}
                      className="flex w-full items-center px-4 py-2.5 text-[11px] font-semibold text-white/70 hover:bg-white/[.05] hover:text-white sm:hidden"
                    >
                      Download PNG
                    </button>
                    <button
                      type="button"
                      onClick={() => { void downloadJpeg(); setShowMoreMenu(false); }}
                      className="flex w-full items-center px-4 py-2.5 text-[11px] font-semibold text-white/70 hover:bg-white/[.05] hover:text-white"
                    >
                      Download JPEG
                    </button>
                    <button
                      type="button"
                      onClick={() => { void downloadTransparentPng(); setShowMoreMenu(false); }}
                      className="flex w-full items-center px-4 py-2.5 text-[11px] font-semibold text-white/70 hover:bg-white/[.05] hover:text-white"
                    >
                      Download transparent PNG
                    </button>
                    <button
                      type="button"
                      disabled={packBusy}
                      onClick={() => { void downloadPdf(); setShowMoreMenu(false); }}
                      className="flex w-full items-center px-4 py-2.5 text-[11px] font-semibold text-white/70 hover:bg-white/[.05] hover:text-white disabled:opacity-50"
                    >
                      {packBusy ? "Exporting…" : "Download PDF"}
                    </button>
                    <button
                      type="button"
                      disabled={packBusy}
                      onClick={() => { void downloadZip(); setShowMoreMenu(false); }}
                      className="flex w-full items-center px-4 py-2.5 text-[11px] font-semibold text-white/70 hover:bg-white/[.05] hover:text-white disabled:opacity-50"
                    >
                      Download ZIP (all pages)
                    </button>
                    <button
                      type="button"
                      disabled={motionBusy}
                      onClick={() => { void downloadMotion(); setShowMoreMenu(false); }}
                      className="flex w-full items-center px-4 py-2.5 text-[11px] font-semibold text-white/70 hover:bg-white/[.05] hover:text-white disabled:opacity-50"
                    >
                      {motionBusy ? "Recording…" : "Export timeline"}
                    </button>
                    {canEdit ? (
                      <button
                        type="button"
                        disabled={videoBusy || syncState === "conflict"}
                        onClick={() => { void turnDesignIntoVideo(); setShowMoreMenu(false); }}
                        className="flex w-full items-center px-4 py-2.5 text-[11px] font-semibold text-white/70 hover:bg-white/[.05] hover:text-white disabled:opacity-50"
                      >
                        {videoBusy ? "Preparing video…" : "Turn into video"}
                      </button>
                    ) : null}
                  </div>
                  <div className="border-t border-white/[.06] px-4 py-2.5">
                    <label className="flex items-center justify-between text-[9px] font-semibold text-white/35" title="Applies to pages without a custom duration">
                      Default s/page
                      <input
                        type="number"
                        min={0.5}
                        max={8}
                        step={0.5}
                        value={secondsPerPage}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 2;
                          setSecondsPerPage(v);
                          if (doc && canEdit) {
                            const ms = Math.round(v * 1000);
                            onChangeDoc({
                              ...doc,
                              pages: doc.pages.map((p) =>
                                p.durationMs == null || p.durationMs === 2000 ? { ...p, durationMs: ms } : p,
                              ),
                            });
                          }
                        }}
                        className="w-14 rounded border border-white/10 bg-[#0B0B0C] px-1 py-0.5 text-[9px] text-white"
                      />
                    </label>
                  </div>
                  <div className="border-t border-white/[.06] pt-1 lg:hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setShowVersions((v) => !v);
                        if (!showVersions) { setShowShare(false); setShowComments(false); }
                        setShowMoreMenu(false);
                      }}
                      className="flex w-full items-center px-4 py-2.5 text-[11px] font-semibold text-white/70 hover:bg-white/[.05] hover:text-white"
                    >
                      Versions
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowComments((v) => !v);
                        if (!showComments) { setShowShare(false); setShowVersions(false); }
                        setShowMoreMenu(false);
                      }}
                      className="flex w-full items-center px-4 py-2.5 text-[11px] font-semibold text-white/70 hover:bg-white/[.05] hover:text-white"
                    >
                      Comments
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowShare((v) => !v);
              if (!showShare) { setShowVersions(false); setShowComments(false); }
            }}
            className={`rounded-xl border px-4 py-2 text-[10px] font-black transition-colors ${showShare ? "border-orange-500/40 bg-orange-500/10 text-orange-400" : "border-white/10 bg-white/[.05] text-white hover:bg-white/[.08]"}`}
          >
            Share
          </button>
          {canEdit ? (
            <button
              type="button"
              onClick={() => doc && void persist(doc)}
              className="rounded-xl px-4 py-2 text-[10px] font-black text-white"
              style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}
            >
              Save
            </button>
          ) : null}
        </div>
      </header>

      {/* Conflict banner — inline because it requires an explicit action */}
      {syncState === "conflict" ? (
        <div className="shrink-0 border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
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

      {/* Coach: small dismissible hint strip — starts hidden, only shows if user enables it */}
      {showCoach ? (
        <StudioCoachPanel coach={doc.coach} onDismiss={() => setShowCoach(false)} />
      ) : doc.coach?.mode === "teach_me" && (doc.coach.lessons?.length ?? 0) > 0 ? (
        <button
          type="button"
          className="shrink-0 w-full border-b border-white/[.06] px-4 py-1.5 text-left text-[11px] text-white/40 underline"
          onClick={() => setShowCoach(true)}
        >
          Show Teach me lessons
        </button>
      ) : null}

      {/* Export note strip */}
      {exportNote && !showShare ? (
        <p className="shrink-0 border-b border-white/[.06] px-4 py-1 text-[11px] text-white/50">{exportNote}</p>
      ) : null}

      {/* Resize dialog — modal, doesn't push canvas */}
      {showResize && canEdit ? (
        <StudioResizeDialog
          document={doc}
          onApply={applyResize}
          onClose={() => setShowResize(false)}
        />
      ) : null}

      {/* Right-side overlay drawers — float over canvas, don't push it down */}
      {showBrandKit ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowBrandKit(false)} />
          <div className="fixed bottom-0 right-0 top-14 z-50 w-80 overflow-y-auto border-l border-white/10 bg-[#131315] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-white/60">Brand Kit</span>
              <button type="button" onClick={() => setShowBrandKit(false)} className="text-lg leading-none text-white/40 hover:text-white">×</button>
            </div>
            <div className="px-4 py-3">
              <StudioBrandKitPanel businessId={design.business_id} />
            </div>
          </div>
        </>
      ) : null}

      {showVersions ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowVersions(false)} />
          <div className="fixed bottom-0 right-0 top-14 z-50 w-80 overflow-y-auto border-l border-white/10 bg-[#131315] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-white/60">Version history</span>
              <button type="button" onClick={() => setShowVersions(false)} className="text-lg leading-none text-white/40 hover:text-white">×</button>
            </div>
            <div className="px-4 py-3">
              <StudioVersionHistoryPanel
                designId={designId}
                canEdit={canEdit}
                onRestored={() => { void load(); }}
              />
            </div>
          </div>
        </>
      ) : null}

      {showComments ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowComments(false)} />
          <div className="fixed bottom-0 right-0 top-14 z-50 w-80 overflow-y-auto border-l border-white/10 bg-[#131315] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-white/60">Comments</span>
              <button type="button" onClick={() => setShowComments(false)} className="text-lg leading-none text-white/40 hover:text-white">×</button>
            </div>
            <div className="px-4 py-3">
              <StudioCommentsPanel
                designId={designId}
                userId={userId}
                isOwner={access?.role === "owner"}
              />
            </div>
          </div>
        </>
      ) : null}

      {showShare ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowShare(false)} />
          <div className="fixed bottom-0 right-0 top-14 z-50 w-96 overflow-y-auto border-l border-white/10 bg-[#131315] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-white/60">Share</span>
              <button type="button" onClick={() => setShowShare(false)} className="text-lg leading-none text-white/40 hover:text-white">×</button>
            </div>
            <div className="space-y-4 px-4 py-3">
              <StudioSharePanel designId={designId} access={access} />
              {access.role === "owner" ? (
                <StudioReachPromote
                  designId={designId}
                  designTitle={design.title}
                  projects={projects}
                />
              ) : null}
              {canEdit && access.role === "owner" ? (
                <div className="space-y-2 border-t border-white/[.06] pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Send → Shop</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={exportProjectId}
                      onChange={(e) => setExportProjectId(e.target.value)}
                      className="min-w-[200px] rounded-lg border border-white/10 bg-[#0B0B0C] px-2 py-1.5 text-sm text-white"
                    >
                      <option value="">Choose shop…</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
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
                  {exportNote ? <p className="text-xs text-white/60">{exportNote}</p> : null}
                </div>
              ) : null}
            </div>
          </div>
        </>
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
        resolveMediaUrl={resolveMediaUrl}
      />
      <StudioTimelinePanel
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
      />
    </div>
  );
}

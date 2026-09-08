"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { StudioCanvasEditor } from "@/app/components/studio/studio-canvas-editor";
import { StudioBrandKitPanel } from "@/app/components/studio/studio-brand-kit-panel";
import { StudioSharePanel } from "@/app/components/studio/studio-share-panel";
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
import { clipAtTime, pageLocalTimeMs } from "@/lib/studio/timeline";
import type { StudioDesignAccess } from "@/lib/studio/design-access";
import { studioRoleLabel } from "@/lib/studio/design-access";

type Design = {
  id: string;
  title: string;
  design_type: string;
  business_id: string | null;
  canvas: unknown;
};

const HISTORY_CAP = 40;

export default function StudioEditorPage() {
  const params = useParams<{ id: string }>();
  const designId = params.id;
  const [design, setDesign] = useState<Design | null>(null);
  const [access, setAccess] = useState<StudioDesignAccess | null>(null);
  const [doc, setDoc] = useState<CanvasDocument | null>(null);
  const [activePageId, setActivePageId] = useState<string>("");
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [exportProjectId, setExportProjectId] = useState("");
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showResize, setShowResize] = useState(false);
  const [showCoach, setShowCoach] = useState(true);
  const [packBusy, setPackBusy] = useState(false);
  const [motionBusy, setMotionBusy] = useState(false);
  const [secondsPerPage, setSecondsPerPage] = useState(2);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const soundtrackAudioRef = useRef<HTMLAudioElement | null>(null);
  const [history, setHistory] = useState<CanvasDocument[]>([]);
  const [future, setFuture] = useState<CanvasDocument[]>([]);
  const skipHistory = useRef(false);
  const dragBaseline = useRef<CanvasDocument | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docRef = useRef<CanvasDocument | null>(null);

  const canEdit = access?.canEdit !== false;

  const load = useCallback(async () => {
    const res = await fetch(`/api/create/designs/${designId}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Design not found.");
      return;
    }
    const d = data.design as Design;
    setDesign(d);
    if (data.access) setAccess(data.access as StudioDesignAccess);
    const parsed = parseCanvasDocument(d.canvas, d.design_type as StudioDesignType);
    skipHistory.current = true;
    setDoc(parsed);
    docRef.current = parsed;
    setActivePageId(parsed.pages[0]?.id ?? "");
    setSelectedLayerIds([]);
    setHistory([]);
    setFuture([]);
  }, [designId]);

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
      setSaveState("saving");
      const body: { canvas: CanvasDocument; designType?: StudioDesignType } = { canvas };
      if (designType) body.designType = designType;
      const res = await fetch(`/api/create/designs/${designId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        if (designType) {
          setDesign((d) => (d ? { ...d, design_type: designType } : d));
        }
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1800);
      } else {
        setSaveState("error");
      }
    },
    [designId, canEdit],
  );

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
    const url = doc?.soundtrack?.url;
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
  }, [doc?.soundtrack?.url, playheadMs, timelinePlaying, doc]);

  useEffect(() => {
    return () => {
      soundtrackAudioRef.current?.pause();
      soundtrackAudioRef.current = null;
    };
  }, []);

  async function downloadPng() {
    if (!doc || !design) return;
    setExportNote("Rendering PNG…");
    const dataUrl = await exportCanvasToPngDataUrlAsync(doc, 1, activePageId || undefined);
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
      const result = await exportCanvasPagesZipBlob(doc, 1);
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
      const result = await exportCanvasPagesPdfBlob(doc, 0.75);
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
      const result = await exportCanvasMotionToWebmBlob(doc, {
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
      <div className="min-h-screen flex items-center justify-center">
        <p>{error}</p>
      </div>
    );
  }

  if (!doc || !design || !access) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  const saveLabel = !canEdit
    ? studioRoleLabel(access.role)
    : saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : "Autosave on";

  return (
    <div className="min-h-screen flex flex-col bg-[#E8E6E1]">
      <header className="border-b border-black/10 bg-white px-3 py-2.5 flex flex-wrap items-center gap-2 shrink-0 z-10">
        <Link href="/studio" className="text-xs underline opacity-60 px-1">
          ← Studio
        </Link>
        <h1 className="font-display text-base font-bold flex-1 min-w-[120px] truncate">{design.title}</h1>
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50">{saveLabel}</span>
        <button
          type="button"
          onClick={() => setShowBrandKit((v) => !v)}
          className="rounded-full px-3 py-1.5 text-xs font-bold border border-black/10"
        >
          Brand
        </button>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setShowResize(true)}
            className="rounded-full px-3 py-1.5 text-xs font-bold border border-black/10"
            title="Change artboard size"
          >
            Resize
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void downloadPng()}
          className="rounded-full px-3 py-1.5 text-xs font-bold border border-black/10"
        >
          Download PNG
        </button>
        <button
          type="button"
          disabled={packBusy}
          onClick={() => void downloadPdf()}
          className="rounded-full px-3 py-1.5 text-xs font-bold border border-black/10 disabled:opacity-50"
          title="Multi-page PDF"
        >
          {packBusy ? "…" : "PDF"}
        </button>
        <button
          type="button"
          disabled={packBusy}
          onClick={() => void downloadZip()}
          className="rounded-full px-3 py-1.5 text-xs font-bold border border-black/10 disabled:opacity-50"
          title="ZIP of PNGs (all pages)"
        >
          ZIP
        </button>
        <button
          type="button"
          disabled={motionBusy}
          onClick={() => void downloadMotion()}
          className="rounded-full px-3 py-1.5 text-xs font-bold border border-black/10 disabled:opacity-50"
          title="Export timeline WebM (page durations + video seek)"
        >
          {motionBusy ? "Recording…" : "Export timeline"}
        </button>
        <label className="flex items-center gap-1 text-[10px] font-semibold opacity-60" title="Applies to pages without a custom duration">
          default s/page
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
            className="w-12 rounded border border-black/10 px-1 py-0.5 text-xs"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowShare((v) => !v)}
          className="rounded-full px-3 py-1.5 text-xs font-bold text-white"
          style={{ background: "#E05A2B" }}
        >
          Share
        </button>
        {canEdit ? (
          <button
            type="button"
            onClick={() => doc && void persist(doc)}
            className="rounded-full px-3 py-1.5 text-xs font-bold text-white"
            style={{ background: "#0F0D33" }}
          >
            Save now
          </button>
        ) : null}
      </header>

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
        previewLocalMs={pageLocalTimeMs(doc, playheadMs)?.localMs ?? 0}
        businessId={design.business_id}
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

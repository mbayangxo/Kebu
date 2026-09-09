"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AlignMode, CanvasDocument, CanvasLayer } from "@/lib/studio/canvas-document";
import {
  CANVAS_LAYER_TYPES,
  addCanvasPage,
  alignLayers,
  deleteCanvasPage,
  duplicateCanvasPage,
  duplicateLayer,
  expandSelectionWithGroups,
  getPage,
  groupLayers,
  newLayerId,
  ungroupLayers,
  updatePage,
} from "@/lib/studio/canvas-document";
import { videoSourceTimeSec } from "@/lib/studio/timeline";
import {
  clipboardPayloadFromLayers,
  layersFromClipboardPayload,
  normalizeCrop,
  snapLayerPosition,
} from "@/lib/studio/editor-craft";
import { StudioUploadsLibrary } from "@/app/components/studio/studio-uploads-library";
import { StudioBrandApplyPanel } from "@/app/components/studio/studio-brand-apply-panel";
import { StudioLiveCursors } from "@/app/components/studio/studio-live-cursors";
import {
  STUDIO_ELEMENTS_PACK,
  type StudioElementDef,
} from "@/lib/studio/elements-pack";
import {
  cssStackForStudioFont,
  googleFontsHrefForStudioCatalog,
  studioFontFamilies,
} from "@/lib/studio/fonts-catalog";

type DragMode = "move" | "resize-se" | null;

function TimelineVideo({
  url,
  trimStartMs,
  pageLocalMs,
}: {
  url: string;
  trimStartMs: number;
  pageLocalMs: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const t = videoSourceTimeSec({ trimStartMs }, pageLocalMs);
    const apply = () => {
      if (Math.abs(el.currentTime - t) > 0.08) {
        try {
          el.currentTime = t;
        } catch {
          /* ignore seek races */
        }
      }
    };
    if (el.readyState >= 1) apply();
    else el.addEventListener("loadedmetadata", apply, { once: true });
  }, [url, trimStartMs, pageLocalMs]);

  return (
    <video
      ref={ref}
      src={url}
      className="w-full h-full object-cover pointer-events-none"
      muted
      playsInline
      preload="auto"
    />
  );
}

const FONT_OPTIONS = studioFontFamilies();
const STUDIO_FONTS_HREF = googleFontsHrefForStudioCatalog();

const ALIGN_TOOLS: { mode: AlignMode; label: string; title: string }[] = [
  { mode: "left", label: "L", title: "Align left" },
  { mode: "center-x", label: "C", title: "Align center" },
  { mode: "right", label: "R", title: "Align right" },
  { mode: "top", label: "T", title: "Align top" },
  { mode: "center-y", label: "M", title: "Align middle" },
  { mode: "bottom", label: "B", title: "Align bottom" },
];

/**
 * Canva-class Studio workspace: Elements | Canvas | Properties.
 * Multi-page · pan · multi-select · align/group — Kebu Studio density.
 */
export function StudioCanvasEditor({
  designId,
  document: doc,
  onChange,
  activePageId,
  onActivePageChange,
  selectedLayerIds,
  onSelectLayers,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  readOnly = false,
  previewLocalMs = 0,
  businessId = null,
  liveCursorsUserId = null,
  liveCursorsLabel = "You",
}: {
  designId: string;
  document: CanvasDocument;
  /** ephemeral=true while dragging — parent should not push undo history each frame */
  onChange: (next: CanvasDocument, opts?: { ephemeral?: boolean }) => void;
  activePageId: string;
  onActivePageChange: (pageId: string) => void;
  selectedLayerIds: string[];
  onSelectLayers: (ids: string[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  /** View-only collaborator — pan/zoom/select ok; no mutate */
  readOnly?: boolean;
  /** Timeline page-local time (ms) — seeks video layers on canvas */
  previewLocalMs?: number;
  businessId?: string | null;
  liveCursorsUserId?: string | null;
  liveCursorsLabel?: string;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState<{
    mode: DragMode;
    layerId: string;
    startX: number;
    startY: number;
    orig: CanvasLayer;
    /** Snapshot of layers when move started (for group move) */
    origLayers: CanvasLayer[];
  } | null>(null);
  const [pan, setPan] = useState<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [zoom, setZoom] = useState(45);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<"elements" | "layers" | "uploads" | "brand">("elements");

  useEffect(() => {
    if (!STUDIO_FONTS_HREF) return;
    const id = "kebu-studio-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = STUDIO_FONTS_HREF;
    document.head.appendChild(link);
  }, []);
  const [snapGuides, setSnapGuides] = useState<{ v: number | null; h: number | null }>({
    v: null,
    h: null,
  });
  const [layerClipboard, setLayerClipboard] = useState<string | null>(null);

  const displayScale = Math.min(1.2, Math.max(0.15, zoom / 100));
  const fittedOnce = useRef(false);
  const latestDoc = useRef(doc);
  latestDoc.current = doc;

  const page = getPage(doc, activePageId);
  const layers = page.layers;
  const selectedSet = new Set(selectedLayerIds);
  const primarySelectedId = selectedLayerIds[selectedLayerIds.length - 1] ?? null;
  const selected = layers.find((l) => l.id === primarySelectedId);

  useEffect(() => {
    const el = boardRef.current;
    if (!el || fittedOnce.current) return;
    const fit = Math.min(0.85, Math.max(0.25, (el.clientWidth - 48) / page.width));
    setZoom(Math.round(fit * 100));
    fittedOnce.current = true;
  }, [page.width]);

  const setPageLayers = useCallback(
    (nextLayers: CanvasLayer[], ephemeral = false) => {
      if (readOnly) return;
      const base = latestDoc.current;
      const next = updatePage(base, activePageId, { layers: nextLayers });
      latestDoc.current = next;
      onChange(next, ephemeral ? { ephemeral: true } : undefined);
    },
    [activePageId, onChange, readOnly],
  );

  const updateLayer = useCallback(
    (id: string, patch: Partial<CanvasLayer>, ephemeral = false) => {
      const base = latestDoc.current;
      const p = getPage(base, activePageId);
      const nextLayers = p.layers.map((l) => (l.id === id ? { ...l, ...patch } : l));
      setPageLayers(nextLayers, ephemeral);
    },
    [activePageId, setPageLayers],
  );

  function selectLayer(layer: CanvasLayer, shiftKey: boolean) {
    if (shiftKey) {
      const next = selectedSet.has(layer.id)
        ? selectedLayerIds.filter((id) => id !== layer.id)
        : [...selectedLayerIds, layer.id];
      onSelectLayers(expandSelectionWithGroups(layers, next));
    } else {
      onSelectLayers(expandSelectionWithGroups(layers, [layer.id]));
    }
  }

  function pointerDown(e: React.PointerEvent, layer: CanvasLayer, mode: DragMode) {
    if (layer.locked && mode === "move") {
      selectLayer(layer, e.shiftKey);
      return;
    }
    if (layer.locked) return;
    e.stopPropagation();
    selectLayer(layer, e.shiftKey);
    if (readOnly) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const current = getPage(latestDoc.current, activePageId).layers;
    setDrag({
      mode,
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...layer },
      origLayers: current.map((l) => ({ ...l })),
    });
  }

  function boardPointerDown(e: React.PointerEvent) {
    const middle = e.button === 1;
    if (spaceHeld || middle) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setPan({
        startX: e.clientX,
        startY: e.clientY,
        origX: panOffset.x,
        origY: panOffset.y,
      });
    }
  }

  function pointerMove(e: React.PointerEvent) {
    if (pan) {
      setPanOffset({
        x: pan.origX + (e.clientX - pan.startX),
        y: pan.origY + (e.clientY - pan.startY),
      });
      return;
    }
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / displayScale;
    const dy = (e.clientY - drag.startY) / displayScale;
    const orig = drag.orig;
    if (drag.mode === "move") {
      const groupId = orig.groupId;
      const moveIds = new Set<string>();
      if (groupId) {
        for (const l of drag.origLayers) {
          if (l.groupId === groupId && !l.locked) moveIds.add(l.id);
        }
      } else {
        moveIds.add(drag.layerId);
      }
      const primary = drag.origLayers.find((l) => l.id === drag.layerId)!;
      const snapped = snapLayerPosition(
        primary,
        dx,
        dy,
        drag.origLayers,
        moveIds,
        { width: page.width, height: page.height },
        8,
      );
      setSnapGuides(snapped.guides);
      const adjX = snapped.x - primary.x;
      const adjY = snapped.y - primary.y;
      const nextLayers = drag.origLayers.map((l) => {
        if (!moveIds.has(l.id)) return l;
        const src = drag.origLayers.find((o) => o.id === l.id)!;
        return { ...l, x: src.x + adjX, y: src.y + adjY };
      });
      setPageLayers(nextLayers, true);
    } else if (drag.mode === "resize-se") {
      updateLayer(
        drag.layerId,
        {
          width: Math.max(24, orig.width + dx),
          height: Math.max(24, orig.height + dy),
        },
        true,
      );
    }
  }

  function pointerUp() {
    if (drag) {
      onChange(latestDoc.current);
    }
    setDrag(null);
    setSnapGuides({ v: null, h: null });
    setPan(null);
  }

  function copySelected() {
    if (!selectedLayerIds.length) return;
    const ids = expandSelectionWithGroups(layers, selectedLayerIds);
    const selected = layers.filter((l) => ids.includes(l.id));
    const payload = clipboardPayloadFromLayers(selected);
    setLayerClipboard(payload);
    void navigator.clipboard?.writeText(payload).catch(() => undefined);
  }

  function pasteLayers() {
    if (readOnly) return;
    void (async () => {
      let raw = layerClipboard;
      try {
        const fromSys = await navigator.clipboard?.readText();
        if (fromSys && fromSys.includes("kebuStudioClipboard")) raw = fromSys;
      } catch {
        /* use local clipboard */
      }
      if (!raw) return;
      const pasted = layersFromClipboardPayload(raw);
      if (!pasted?.length) return;
      setPageLayers([...layers, ...pasted]);
      onSelectLayers(pasted.map((p) => p.id));
    })();
  }

  function addLayer(type: (typeof CANVAS_LAYER_TYPES)[number], extras?: Partial<CanvasLayer>) {
    const layer: CanvasLayer = {
      id: newLayerId(),
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      x: page.width * 0.2,
      y: page.height * 0.3,
      width:
        type === "text"
          ? 320
          : type === "image"
            ? 320
            : type === "line"
              ? 280
              : type === "icon"
                ? 72
                : type === "frame"
                  ? 240
                  : 180,
      height:
        type === "text"
          ? 56
          : type === "image"
            ? 320
            : type === "line"
              ? 4
              : type === "icon"
                ? 72
                : type === "frame"
                  ? 240
                  : 140,
      rotation: 0,
      opacity: 1,
      locked: false,
      text: type === "text" ? "Double-click to edit" : undefined,
      fontSize: 32,
      fontFamily: "Fraunces",
      fontWeight: "700",
      color: "#FFFFFF",
      textAlign: "left",
      fill: type === "frame" ? "transparent" : "#E05A2B",
      ...extras,
    };
    setPageLayers([...layers, layer]);
    onSelectLayers([layer.id]);
    setLeftTab("layers");
  }

  function addElement(def: StudioElementDef) {
    addLayer(def.kind, {
      ...def.defaults,
      name: def.label,
      iconKey: def.kind === "icon" ? def.id.replace(/^icon-/, "") : undefined,
      frameStyle: def.frameStyle,
      text: def.glyph ?? def.defaults.text,
    });
  }

  function deleteSelected() {
    if (!selectedLayerIds.length) return;
    const ids = new Set(expandSelectionWithGroups(layers, selectedLayerIds));
    setPageLayers(layers.filter((l) => !ids.has(l.id)));
    onSelectLayers([]);
  }

  function duplicateSelected() {
    if (!selectedLayerIds.length) return;
    const ids = expandSelectionWithGroups(layers, selectedLayerIds);
    const copies = layers.filter((l) => ids.includes(l.id)).map((l) => duplicateLayer(l));
    if (!copies.length) return;
    setPageLayers([...layers, ...copies]);
    onSelectLayers(copies.map((c) => c.id));
  }

  function moveLayerZ(id: string, dir: -1 | 1) {
    const idx = layers.findIndex((l) => l.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= layers.length) return;
    const nextLayers = [...layers];
    const [item] = nextLayers.splice(idx, 1);
    nextLayers.splice(next, 0, item!);
    setPageLayers(nextLayers);
  }

  function applyAlign(mode: AlignMode) {
    if (!selectedLayerIds.length) return;
    const next = alignLayers(layers, selectedLayerIds, mode, {
      width: page.width,
      height: page.height,
    });
    setPageLayers(next);
  }

  function applyGroup() {
    if (selectedLayerIds.length < 2) return;
    setPageLayers(groupLayers(layers, selectedLayerIds));
  }

  function applyUngroup() {
    if (!selectedLayerIds.length) return;
    setPageLayers(ungroupLayers(layers, selectedLayerIds));
  }

  function addPage() {
    if (readOnly) return;
    const result = addCanvasPage(latestDoc.current);
    onChange(result.doc);
    onActivePageChange(result.pageId);
    onSelectLayers([]);
  }

  function duplicatePage() {
    if (readOnly) return;
    const result = duplicateCanvasPage(latestDoc.current, activePageId);
    if (!result) return;
    onChange(result.doc);
    onActivePageChange(result.pageId);
    onSelectLayers([]);
  }

  function removePage(pageId: string) {
    if (readOnly) return;
    const next = deleteCanvasPage(latestDoc.current, pageId);
    if (!next) return;
    onChange(next);
    const fallback = next.pages[0]!;
    onActivePageChange(pageId === activePageId ? fallback.id : activePageId);
    onSelectLayers([]);
  }

  async function onFilePicked(file: File | null, kind: "image" | "video" = "image") {
    if (readOnly || !file) return;
    setUploadBusy(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("designId", designId);
      const res = await fetch("/api/studio/upload", {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(typeof data.error === "string" ? data.error : "Upload failed.");
        return;
      }
      if (kind === "video" || data.kind === "video") {
        addLayer("video", {
          videoUrl: data.url as string,
          name: "Video",
          width: Math.min(480, page.width * 0.7),
          height: Math.min(640, page.height * 0.45),
        });
      } else {
        addLayer("image", { imageUrl: data.url as string, name: "Upload" });
      }
    } catch {
      setUploadError("Network error during upload.");
    } finally {
      setUploadBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (videoFileRef.current) videoFileRef.current.value = "";
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setSpaceHeld(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (!readOnly) onUndo?.();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (!readOnly) onRedo?.();
      } else if (readOnly) {
        return;
      } else if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        e.preventDefault();
        copySelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        e.preventDefault();
        pasteLayers();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        applyGroup();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "g" && e.shiftKey) {
        e.preventDefault();
        applyUngroup();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (readOnly || !selectedLayerIds.length) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const ids = new Set(expandSelectionWithGroups(layers, selectedLayerIds));
        setPageLayers(layers.map((l) => (ids.has(l.id) && !l.locked ? { ...l, x: l.x + dx, y: l.y + dy } : l)));
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpaceHeld(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLayerIds, doc, activePageId, onUndo, onRedo, readOnly]);

  const canGroup = !readOnly && selectedLayerIds.length >= 2;
  const canUngroup =
    !readOnly && selectedLayerIds.some((id) => layers.find((l) => l.id === id)?.groupId);
  const canAlign = !readOnly && selectedLayerIds.length >= 1;

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] min-h-[520px] bg-[#E8E6E1]">
      {/* Top tool strip */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/10 bg-white px-3 py-2 shrink-0">
        {readOnly ? (
          <span className="rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200">
            View only
          </span>
        ) : null}
        <button
          type="button"
          disabled={readOnly || !canUndo}
          onClick={() => onUndo?.()}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-black/10 disabled:opacity-30"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={readOnly || !canRedo}
          onClick={() => onRedo?.()}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-black/10 disabled:opacity-30"
        >
          Redo
        </button>
        <span className="w-px h-5 bg-black/10" />
        <button
          type="button"
          disabled={readOnly || !selectedLayerIds.length}
          onClick={copySelected}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-black/10 disabled:opacity-30"
        >
          Copy
        </button>
        <button
          type="button"
          disabled={readOnly}
          onClick={pasteLayers}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-black/10 disabled:opacity-30"
        >
          Paste
        </button>
        <button
          type="button"
          disabled={readOnly || !selectedLayerIds.length}
          onClick={duplicateSelected}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-black/10 disabled:opacity-30"
        >
          Duplicate
        </button>
        <button
          type="button"
          disabled={readOnly || !selectedLayerIds.length}
          onClick={deleteSelected}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-black/10 text-red-700 disabled:opacity-30"
        >
          Delete
        </button>
        <span className="w-px h-5 bg-black/10" />
        {ALIGN_TOOLS.map((t) => (
          <button
            key={t.mode}
            type="button"
            title={t.title}
            disabled={!canAlign}
            onClick={() => applyAlign(t.mode)}
            className="rounded-lg w-7 h-7 text-[11px] font-bold border border-black/10 disabled:opacity-30"
          >
            {t.label}
          </button>
        ))}
        <span className="w-px h-5 bg-black/10" />
        <button
          type="button"
          disabled={!canGroup}
          onClick={applyGroup}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-black/10 disabled:opacity-30"
        >
          Group
        </button>
        <button
          type="button"
          disabled={!canUngroup}
          onClick={applyUngroup}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-black/10 disabled:opacity-30"
        >
          Ungroup
        </button>
        <span className="flex-1" />
        <span className="text-[10px] opacity-50 hidden sm:inline">
          {spaceHeld ? "Pan…" : "Space+drag to pan"}
        </span>
        <label className="flex items-center gap-2 text-xs font-semibold opacity-80">
          Zoom
          <input
            type="range"
            min={20}
            max={120}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-28"
          />
          <span className="w-10 tabular-nums">{zoom}%</span>
        </label>
        <button
          type="button"
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-black/10"
          onClick={() => {
            const el = boardRef.current;
            if (!el) return;
            const fit = Math.min(0.9, Math.max(0.2, (el.clientWidth - 48) / page.width));
            setZoom(Math.round(fit * 100));
            setPanOffset({ x: 0, y: 0 });
          }}
        >
          Fit
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: Elements / Layers */}
        <aside className="w-[220px] shrink-0 border-r border-black/10 bg-white flex flex-col">
          <div className="flex border-b border-black/10">
            {(["elements", "layers", "uploads", "brand"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setLeftTab(t)}
                className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider ${
                  leftTab === t ? "border-b-2 border-orange-600 text-orange-700" : "opacity-50"
                }`}
              >
                {t === "uploads" ? "Library" : t === "brand" ? "Look" : t}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {leftTab === "brand" ? (
              <StudioBrandApplyPanel
                document={doc}
                pageId={activePageId}
                businessId={businessId}
                readOnly={readOnly}
                onApply={(next) => onChange(next)}
              />
            ) : null}
            {leftTab === "elements" ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">
                  {readOnly ? "Elements (view only)" : "Add"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => addLayer("text")}
                    className="rounded-xl border border-black/10 bg-[#FFF8F0] px-2 py-3 text-xs font-bold hover:border-orange-400 disabled:opacity-40"
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => addLayer("rect")}
                    className="rounded-xl border border-black/10 bg-[#FFF8F0] px-2 py-3 text-xs font-bold hover:border-orange-400 disabled:opacity-40"
                  >
                    Rectangle
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => addLayer("ellipse")}
                    className="rounded-xl border border-black/10 bg-[#FFF8F0] px-2 py-3 text-xs font-bold hover:border-orange-400 disabled:opacity-40"
                  >
                    Ellipse
                  </button>
                  <button
                    type="button"
                    disabled={readOnly || uploadBusy}
                    onClick={() => fileRef.current?.click()}
                    className="rounded-xl border border-black/10 bg-[#0F0D33] text-white px-2 py-3 text-xs font-bold disabled:opacity-50"
                  >
                    {uploadBusy ? "…" : "Image"}
                  </button>
                  <button
                    type="button"
                    disabled={readOnly || uploadBusy}
                    onClick={() => videoFileRef.current?.click()}
                    className="col-span-2 rounded-xl border border-black/10 bg-[#E05A2B] text-white px-2 py-3 text-xs font-bold disabled:opacity-50"
                  >
                    {uploadBusy ? "…" : "Short video"}
                  </button>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 pt-2">Lines · Frames</p>
                <div className="grid grid-cols-2 gap-2">
                  {STUDIO_ELEMENTS_PACK.filter((e) => e.kind === "line" || e.kind === "frame").map((el) => (
                    <button
                      key={el.id}
                      type="button"
                      disabled={readOnly}
                      onClick={() => addElement(el)}
                      className="rounded-xl border border-black/10 bg-white px-2 py-2.5 text-[11px] font-bold hover:border-orange-400 disabled:opacity-40"
                    >
                      {el.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 pt-2">Icons</p>
                <div className="grid grid-cols-3 gap-2">
                  {STUDIO_ELEMENTS_PACK.filter((e) => e.kind === "icon").map((el) => (
                    <button
                      key={el.id}
                      type="button"
                      disabled={readOnly}
                      title={el.label}
                      onClick={() => addElement(el)}
                      className="rounded-xl border border-black/10 bg-[#FFF8F0] px-1 py-2 text-lg hover:border-orange-400 disabled:opacity-40"
                    >
                      {el.glyph}
                    </button>
                  ))}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => void onFilePicked(e.target.files?.[0] ?? null, "image")}
                />
                <input
                  ref={videoFileRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => void onFilePicked(e.target.files?.[0] ?? null, "video")}
                />
                {uploadError ? <p className="text-[11px] text-red-700">{uploadError}</p> : null}
                <p className="text-[10px] leading-relaxed opacity-50">
                  Elements pack: structured icons, lines, and frames — editable layers, not freehand draw.
                </p>
              </>
            ) : leftTab === "uploads" ? (
              <StudioUploadsLibrary
                readOnly={readOnly}
                onPickImage={(url) =>
                  addLayer("image", { imageUrl: url, name: "Library", width: 320, height: 320 })
                }
                onPickVideo={(url) =>
                  addLayer("video", {
                    videoUrl: url,
                    name: "Library video",
                    width: Math.min(480, page.width * 0.7),
                    height: Math.min(640, page.height * 0.45),
                  })
                }
              />
            ) : (
              <ul className="space-y-1">
                {[...layers].reverse().map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={(e) => selectLayer(l, e.shiftKey)}
                      className={`w-full text-left rounded-lg px-2 py-1.5 text-xs ${
                        selectedSet.has(l.id) ? "bg-[#0F0D33] text-white" : "hover:bg-black/5"
                      }`}
                    >
                      <span className="font-semibold">{l.name}</span>
                      <span className="opacity-50 ml-1">· {l.type}</span>
                      {l.groupId ? <span className="opacity-40 ml-1">⊞</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Center canvas */}
        <div
          ref={boardRef}
          className={`flex-1 overflow-hidden p-6 flex justify-center items-start relative ${
            spaceHeld || pan ? "cursor-grab" : ""
          } ${pan ? "cursor-grabbing" : ""}`}
          onPointerDown={boardPointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerLeave={pointerUp}
          onClick={() => {
            if (!spaceHeld && !pan) onSelectLayers([]);
          }}
          onContextMenu={(e) => {
            if (spaceHeld) e.preventDefault();
          }}
        >
          <div
            ref={artboardRef}
            className="relative shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
            style={{
              width: page.width * displayScale,
              height: page.height * displayScale,
              background: page.backgroundColor,
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <StudioLiveCursors
              designId={designId}
              userId={liveCursorsUserId}
              label={liveCursorsLabel}
              enabled={Boolean(liveCursorsUserId)}
              containerRef={artboardRef}
            />
            <div
              className="absolute inset-0"
              style={{
                width: page.width,
                height: page.height,
                transform: `scale(${displayScale})`,
                transformOrigin: "top left",
              }}
            >
              {layers.map((layer) => {
                const selectedOn = selectedSet.has(layer.id);
                return (
                  <div
                    key={layer.id}
                    className={`absolute ${selectedOn ? "outline outline-2 outline-orange-500 outline-offset-1" : ""}`}
                    style={{
                      left: layer.x,
                      top: layer.y,
                      width: layer.width,
                      height: layer.height,
                      transform: `rotate(${layer.rotation}deg)`,
                      opacity: layer.opacity,
                      cursor: spaceHeld ? "grab" : layer.locked ? "not-allowed" : "move",
                      pointerEvents: spaceHeld ? "none" : "auto",
                    }}
                    onPointerDown={(e) => {
                      if (spaceHeld || e.button === 1) return;
                      pointerDown(e, layer, "move");
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {layer.type === "text" ? (
                      <p
                        style={{
                          fontSize: layer.fontSize,
                          fontFamily: cssStackForStudioFont(layer.fontFamily ?? "system-ui"),
                          fontWeight: layer.fontWeight,
                          color: layer.color,
                          textAlign: layer.textAlign,
                          margin: 0,
                          lineHeight: 1.2,
                          pointerEvents: "none",
                          wordBreak: "break-word",
                        }}
                      >
                        {layer.text}
                      </p>
                    ) : layer.type === "image" && layer.imageUrl ? (
                      <div className="w-full h-full overflow-hidden pointer-events-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={layer.imageUrl}
                          alt=""
                          style={(() => {
                            const crop = normalizeCrop(layer);
                            return {
                              width: `${(1 / crop.w) * 100}%`,
                              height: `${(1 / crop.h) * 100}%`,
                              maxWidth: "none",
                              marginLeft: `${(-crop.x / crop.w) * 100}%`,
                              marginTop: `${(-crop.y / crop.h) * 100}%`,
                              objectFit: "fill" as const,
                              transform: `scale(${layer.flipX ? -1 : 1}, ${layer.flipY ? -1 : 1})`,
                            };
                          })()}
                        />
                      </div>
                    ) : layer.type === "video" && layer.videoUrl ? (
                      <TimelineVideo
                        url={layer.videoUrl}
                        trimStartMs={layer.trimStartMs ?? 0}
                        pageLocalMs={previewLocalMs}
                      />
                    ) : layer.type === "ellipse" ? (
                      <div
                        className="w-full h-full rounded-full pointer-events-none"
                        style={{ background: layer.fill }}
                      />
                    ) : layer.type === "line" ? (
                      <div
                        className="w-full pointer-events-none absolute left-0"
                        style={{
                          background: layer.fill ?? "#FFFFFF",
                          height: Math.max(2, layer.height),
                          top: "50%",
                          transform: "translateY(-50%)",
                        }}
                      />
                    ) : layer.type === "frame" ? (
                      <div
                        className="w-full h-full pointer-events-none box-border"
                        style={
                          layer.frameStyle === "polaroid"
                            ? {
                                background: layer.fill ?? "#FFFFFF",
                                border: `${Math.max(1, (layer.strokeWidth ?? 2) / 2)}px solid ${layer.stroke ?? "#E8E4DC"}`,
                                padding: 12,
                                paddingBottom: 36,
                              }
                            : {
                                background: "transparent",
                                border: `${layer.strokeWidth ?? 6}px solid ${layer.stroke ?? "#FFFFFF"}`,
                                borderRadius: layer.frameStyle === "rounded" ? 20 : 0,
                              }
                        }
                      >
                        {layer.frameStyle === "polaroid" ? (
                          <div className="w-full h-full" style={{ background: "#E8E4DC" }} />
                        ) : null}
                      </div>
                    ) : layer.type === "icon" ? (
                      <div
                        className="w-full h-full flex items-center justify-center pointer-events-none select-none"
                        style={{
                          color: layer.color ?? "#FFFFFF",
                          fontSize: layer.fontSize ?? 48,
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        {layer.text || "★"}
                      </div>
                    ) : (
                      <div className="w-full h-full pointer-events-none" style={{ background: layer.fill }} />
                    )}
                    {selectedOn && !layer.locked && selectedLayerIds.length === 1 ? (
                      <div
                        className="absolute -right-1.5 -bottom-1.5 h-3.5 w-3.5 rounded-sm bg-orange-500 cursor-se-resize"
                        onPointerDown={(e) => pointerDown(e, layer, "resize-se")}
                      />
                    ) : null}
                  </div>
                );
              })}
              {snapGuides.v != null ? (
                <div
                  className="absolute top-0 bottom-0 w-px bg-pink-500 pointer-events-none z-20"
                  style={{ left: snapGuides.v }}
                />
              ) : null}
              {snapGuides.h != null ? (
                <div
                  className="absolute left-0 right-0 h-px bg-pink-500 pointer-events-none z-20"
                  style={{ top: snapGuides.h }}
                />
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: Properties */}
        <aside className="w-[260px] shrink-0 border-l border-black/10 bg-white overflow-y-auto p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
            Properties{readOnly ? " · view only" : ""}
          </p>
          <fieldset disabled={readOnly} className="space-y-3 border-0 p-0 m-0 min-w-0 disabled:opacity-70">
          {selectedLayerIds.length > 1 ? (
            <p className="text-xs opacity-60">
              {selectedLayerIds.length} layers selected. Use Align / Group in the toolbar.
            </p>
          ) : null}
          {!selected ? (
            <div className="space-y-3">
              <p className="text-xs opacity-60">Select a layer, or edit the page background.</p>
              <label className="block text-xs font-semibold">
                Background
                <input
                  type="color"
                  value={page.backgroundColor}
                  disabled={readOnly}
                  onChange={(e) => {
                    if (readOnly) return;
                    onChange(updatePage(doc, activePageId, { backgroundColor: e.target.value }));
                  }}
                  className="mt-1 w-full h-10 rounded-lg border border-black/10 disabled:opacity-50"
                />
              </label>
              <p className="text-[10px] opacity-50">
                Artboard {page.width}×{page.height}px · {page.name}
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <label className="block font-semibold">
                Name
                <input
                  value={selected.name}
                  onChange={(e) => updateLayer(selected.id, { name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                />
              </label>
              {selected.type === "text" ? (
                <>
                  <label className="block font-semibold">
                    Text
                    <textarea
                      value={selected.text ?? ""}
                      onChange={(e) => updateLayer(selected.id, { text: e.target.value })}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                    />
                  </label>
                  <label className="block font-semibold">
                    Font
                    <select
                      value={selected.fontFamily ?? "system-ui"}
                      onChange={(e) => updateLayer(selected.id, { fontFamily: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block font-semibold">
                      Size
                      <input
                        type="number"
                        min={8}
                        max={200}
                        value={selected.fontSize ?? 24}
                        onChange={(e) => updateLayer(selected.id, { fontSize: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                      />
                    </label>
                    <label className="block font-semibold">
                      Color
                      <input
                        type="color"
                        value={selected.color ?? "#ffffff"}
                        onChange={(e) => updateLayer(selected.id, { color: e.target.value })}
                        className="mt-1 w-full h-9 rounded-lg border border-black/10"
                      />
                    </label>
                  </div>
                  <label className="block font-semibold">
                    Align
                    <select
                      value={selected.textAlign ?? "left"}
                      onChange={(e) =>
                        updateLayer(selected.id, {
                          textAlign: e.target.value as "left" | "center" | "right",
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </label>
                </>
              ) : null}
              {(selected.type === "rect" || selected.type === "ellipse") && (
                <label className="block font-semibold">
                  Fill
                  <input
                    type="color"
                    value={selected.fill ?? "#E05A2B"}
                    onChange={(e) => updateLayer(selected.id, { fill: e.target.value })}
                    className="mt-1 w-full h-9 rounded-lg border border-black/10"
                  />
                </label>
              )}
              {selected.type === "image" ? (
                <div className="space-y-2">
                  {selected.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.imageUrl}
                      alt=""
                      className="w-full rounded-lg border max-h-28"
                      style={{
                        objectFit: selected.objectFit ?? "cover",
                        transform: `scale(${selected.flipX ? -1 : 1}, ${selected.flipY ? -1 : 1})`,
                      }}
                    />
                  ) : null}
                  <button
                    type="button"
                    className="w-full rounded-full py-2 font-bold text-white text-[11px]"
                    style={{ background: "#0F0D33" }}
                    onClick={() => fileRef.current?.click()}
                  >
                    Replace image
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-black/10 px-2 py-1 text-[11px] font-semibold"
                      onClick={() => updateLayer(selected.id, { flipX: !selected.flipX })}
                    >
                      Flip H
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-black/10 px-2 py-1 text-[11px] font-semibold"
                      onClick={() => updateLayer(selected.id, { flipY: !selected.flipY })}
                    >
                      Flip V
                    </button>
                  </div>
                  <label className="block font-semibold">
                    Fit
                    <select
                      value={selected.objectFit ?? "cover"}
                      onChange={(e) =>
                        updateLayer(selected.id, {
                          objectFit: e.target.value as "cover" | "contain",
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                    >
                      <option value="cover">Cover</option>
                      <option value="contain">Contain</option>
                    </select>
                  </label>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 pt-1">Crop</p>
                  {(
                    [
                      ["cropX", "Left", selected.cropX ?? 0],
                      ["cropY", "Top", selected.cropY ?? 0],
                      ["cropW", "Width", selected.cropW ?? 1],
                      ["cropH", "Height", selected.cropH ?? 1],
                    ] as const
                  ).map(([key, label, val]) => (
                    <label key={key} className="block font-semibold">
                      {label}
                      <input
                        type="range"
                        min={key === "cropW" || key === "cropH" ? 5 : 0}
                        max={100}
                        value={Math.round(val * 100)}
                        onChange={(e) =>
                          updateLayer(selected.id, {
                            [key]: Math.max(
                              key === "cropW" || key === "cropH" ? 0.05 : 0,
                              Number(e.target.value) / 100,
                            ),
                          })
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    className="text-[11px] underline"
                    onClick={() =>
                      updateLayer(selected.id, {
                        cropX: 0,
                        cropY: 0,
                        cropW: 1,
                        cropH: 1,
                      })
                    }
                  >
                    Reset crop
                  </button>
                </div>
              ) : null}
              {selected.type === "video" ? (
                <div className="space-y-2">
                  {selected.videoUrl ? (
                    <video
                      src={selected.videoUrl}
                      className="w-full rounded-lg border object-cover max-h-28"
                      muted
                      controls
                      playsInline
                    />
                  ) : null}
                  <button
                    type="button"
                    className="w-full rounded-full py-2 font-bold text-white text-[11px]"
                    style={{ background: "#E05A2B" }}
                    onClick={() => videoFileRef.current?.click()}
                  >
                    Replace video
                  </button>
                  <p className="text-[10px] opacity-50 leading-relaxed">
                    Trim controls the source start time on the timeline. Export seeks the clip
                    frame-by-frame (S8b).
                  </p>
                  <label className="block font-semibold">
                    Trim start (s)
                    <input
                      type="number"
                      min={0}
                      max={600}
                      step={0.1}
                      value={((selected.trimStartMs ?? 0) / 1000).toFixed(1)}
                      onChange={(e) =>
                        updateLayer(selected.id, {
                          trimStartMs: Math.round(Math.max(0, Number(e.target.value) || 0) * 1000),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                    />
                  </label>
                  <label className="block font-semibold">
                    Trim length (s, blank = page)
                    <input
                      type="number"
                      min={0.1}
                      max={600}
                      step={0.1}
                      value={
                        selected.trimDurationMs != null
                          ? (selected.trimDurationMs / 1000).toFixed(1)
                          : ""
                      }
                      placeholder="Follow page"
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        updateLayer(selected.id, {
                          trimDurationMs: v === "" ? null : Math.round(Math.max(0.1, Number(v)) * 1000),
                        });
                      }}
                      className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                    />
                  </label>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <label className="block font-semibold">
                  Opacity
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round((selected.opacity ?? 1) * 100)}
                    onChange={(e) => updateLayer(selected.id, { opacity: Number(e.target.value) / 100 })}
                    className="mt-1 w-full"
                  />
                </label>
                <label className="block font-semibold">
                  Rotate
                  <input
                    type="number"
                    min={-360}
                    max={360}
                    value={selected.rotation ?? 0}
                    onChange={(e) => updateLayer(selected.id, { rotation: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" className="text-[11px] underline" onClick={() => moveLayerZ(selected.id, 1)}>
                  Bring forward
                </button>
                <button type="button" className="text-[11px] underline" onClick={() => moveLayerZ(selected.id, -1)}>
                  Send back
                </button>
                <button
                  type="button"
                  className="text-[11px] underline"
                  onClick={() => updateLayer(selected.id, { locked: !selected.locked })}
                >
                  {selected.locked ? "Unlock" : "Lock"}
                </button>
              </div>
            </div>
          )}
          </fieldset>
        </aside>
      </div>

      {/* Bottom page strip */}
      <div className="shrink-0 border-t border-black/10 bg-white px-3 py-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-50 mr-1">Pages</span>
        {doc.pages.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              onActivePageChange(p.id);
              onSelectLayers([]);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${
              p.id === activePageId
                ? "border-orange-500 bg-[#FFF8F0] text-orange-800"
                : "border-black/10 hover:bg-black/5"
            }`}
          >
            {p.name || `Page ${i + 1}`}
          </button>
        ))}
        <span className="w-px h-5 bg-black/10 mx-1" />
        <button
          type="button"
          onClick={addPage}
          disabled={readOnly || doc.pages.length >= 20}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-black/10 disabled:opacity-30"
        >
          Add page
        </button>
        <button
          type="button"
          onClick={duplicatePage}
          disabled={readOnly || doc.pages.length >= 20}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-black/10 disabled:opacity-30"
        >
          Duplicate page
        </button>
        <button
          type="button"
          onClick={() => removePage(activePageId)}
          disabled={readOnly || doc.pages.length <= 1}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-black/10 text-red-700 disabled:opacity-30"
        >
          Delete page
        </button>
      </div>
    </div>
  );
}

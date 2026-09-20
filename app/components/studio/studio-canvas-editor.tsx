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
  nudgeLayersWithinArtboard,
  snapLayerPosition,
} from "@/lib/studio/editor-craft";
import { GalaxyEmptyState, GalaxyInspectorSection, GalaxyToolRail } from "@/app/components/galaxy/editor-primitives";
import { StudioIcon } from "@/app/components/studio/studio-icons";
import { StudioUploadsLibrary } from "@/app/components/studio/studio-uploads-library";
import type { BrandSpace } from "@/lib/studio/brand-space";
import { StudioBrandSpacePanel } from "@/app/components/studio/studio-brand-space-panel";
import { StudioThemesPanel } from "@/app/components/studio/studio-themes-panel";
import { StudioBrandApplyPanel } from "@/app/components/studio/studio-brand-apply-panel";
import { StudioToolsPanel } from "@/app/components/studio/studio-tools-panel";
import { StudioLiveCursors } from "@/app/components/studio/studio-live-cursors";
import { StudioMediaAdjustmentsPanel } from "@/app/components/studio/studio-media-adjustments-panel";
import {
  STUDIO_ELEMENTS_PACK,
  searchStudioElements,
  type StudioElementDef,
  type StudioElementCategory,
} from "@/lib/studio/elements-pack";
import { mediaFilterCss } from "@/lib/studio/media-adjustments";
import { fillFrameWithAsset, mediaLayerFromAsset, type StudioDroppedAsset } from "@/lib/studio/asset-canvas-operations";
import {
  cssStackForStudioFont,
  googleFontsHrefForStudioCatalog,
  studioFontFamilies,
} from "@/lib/studio/fonts-catalog";

type DragMode =
  | "move"
  | "resize-nw"
  | "resize-ne"
  | "resize-sw"
  | "resize-se"
  | "rotate"
  | null;

function TimelineVideo({
  url,
  trimStartMs,
  pageLocalMs,
  filterCss,
}: {
  url: string;
  trimStartMs: number;
  pageLocalMs: number;
  filterCss?: string;
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
      style={{ filter: filterCss }}
      muted
      playsInline
      preload="auto"
    />
  );
}

const FONT_OPTIONS = studioFontFamilies();
const STUDIO_FONTS_HREF = googleFontsHrefForStudioCatalog();

const STUDIO_RAIL=[{id:"elements",label:"Elements",icon:<StudioIcon name="elements"/>},{id:"layers",label:"Layers",icon:<StudioIcon name="layers"/>},{id:"uploads",label:"Media",icon:<StudioIcon name="uploads"/>},{id:"themes",label:"Themes",icon:<StudioIcon name="themes"/>},{id:"brand",label:"Brand",icon:<StudioIcon name="brand"/>},{id:"tools",label:"Tools",icon:<StudioIcon name="tools"/>}];

const ALIGN_TOOLS: { mode: AlignMode; label: string; title: string; minSelection?: number }[] = [
  { mode: "left", label: "left", title: "Align left" },
  { mode: "center-x", label: "center", title: "Align center" },
  { mode: "right", label: "right", title: "Align right" },
  { mode: "top", label: "T", title: "Align top" },
  { mode: "center-y", label: "M", title: "Align middle" },
  { mode: "bottom", label: "B", title: "Align bottom" },
  { mode: "distribute-h", label: "↔", title: "Distribute horizontally", minSelection: 3 },
  { mode: "distribute-v", label: "↕", title: "Distribute vertically", minSelection: 3 },
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
  const [elementQuery, setElementQuery] = useState("");
  const [elementCategory, setElementCategory] = useState<StudioElementCategory | "all">("all");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [brandSpace,setBrandSpace]=useState<BrandSpace|null>(null);
  const [leftTab, setLeftTab] = useState<"elements" | "layers" | "uploads" | "themes" | "brand" | "tools">("elements");
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"library" | "inspector" | null>(null);

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
    } else if (drag.mode === "rotate") {
      const artboardBox = artboardRef.current?.getBoundingClientRect();
      if (!artboardBox) return;
      const cx = artboardBox.left + (orig.x + orig.width / 2) * displayScale;
      const cy = artboardBox.top + (orig.y + orig.height / 2) * displayScale;
      const startAngle = Math.atan2(drag.startY - cy, drag.startX - cx);
      const nextAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
      const degrees = orig.rotation + ((nextAngle - startAngle) * 180) / Math.PI;
      const snapped = e.shiftKey ? Math.round(degrees / 15) * 15 : degrees;
      updateLayer(drag.layerId, { rotation: Math.max(-360, Math.min(360, snapped)) }, true);
    } else if (drag.mode?.startsWith("resize-")) {
      let x = orig.x;
      let y = orig.y;
      let width = orig.width;
      let height = orig.height;
      const min = 24;
      if (drag.mode.includes("e")) width = Math.max(min, orig.width + dx);
      if (drag.mode.includes("s")) height = Math.max(min, orig.height + dy);
      if (drag.mode.includes("w")) {
        const nextWidth = Math.max(min, orig.width - dx);
        x = orig.x + (orig.width - nextWidth);
        width = nextWidth;
      }
      if (drag.mode.includes("n")) {
        const nextHeight = Math.max(min, orig.height - dy);
        y = orig.y + (orig.height - nextHeight);
        height = nextHeight;
      }
      if (e.shiftKey) {
        const ratio = orig.width / Math.max(1, orig.height);
        if (Math.abs(dx) >= Math.abs(dy)) {
          height = Math.max(min, width / ratio);
          if (drag.mode.includes("n")) y = orig.y + (orig.height - height);
        } else {
          width = Math.max(min, height * ratio);
          if (drag.mode.includes("w")) x = orig.x + (orig.width - width);
        }
      }
      updateLayer(drag.layerId, { x, y, width, height }, true);
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
      fontStyle: "normal",
      color: "#FFFFFF",
      textAlign: "left",
      letterSpacing: 0,
      lineHeight: 1.2,
      textDecoration: "none",
      textTransform: "none",
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

  function placeDroppedAsset(asset:StudioDroppedAsset,clientX?:number,clientY?:number){if(readOnly)return;const frame=selected?.type==="frame"?selected:null;if(frame){const next=fillFrameWithAsset(frame,asset);setPageLayers(layers.map(l=>l.id===frame.id?next:l));onSelectLayers([frame.id]);return}const rect=artboardRef.current?.getBoundingClientRect();const x=rect&&clientX!=null?(clientX-rect.left)/displayScale:page.width/2,y=rect&&clientY!=null?(clientY-rect.top)/displayScale:page.height/2;const layer=mediaLayerFromAsset(asset,x,y,{width:page.width,height:page.height},newLayerId());setPageLayers([...layers,layer]);onSelectLayers([layer.id])}

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
        setPageLayers(nudgeLayersWithinArtboard(layers, [...ids], dx, dy, { width: page.width, height: page.height }));
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
    <div className="relative flex h-[calc(100dvh-7.5rem)] min-h-[480px] flex-col bg-[#F1F0ED]">
      {/* Top tool strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap border-b border-black/10 bg-[#FFFCF8] px-3 py-1.5 shrink-0">
        {readOnly ? (
          <span className="rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200">
            View only
          </span>
        ) : null}
        <button
          type="button"
          disabled={readOnly || !canUndo}
          onClick={() => onUndo?.()}
          className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-black/60 hover:bg-black/[.04] hover:text-black disabled:opacity-25"
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
        <span className="mx-1 h-4 w-px bg-black/[.08]" />
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
          className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-red-700/70 hover:bg-red-50 hover:text-red-800 disabled:opacity-25"
        >
          Delete
        </button>
        <span className="w-px h-5 bg-black/10" />
        {ALIGN_TOOLS.map((t) => (
          <button
            key={t.mode}
            type="button"
            title={t.title}
            disabled={!canAlign || selectedLayerIds.length < (t.minSelection ?? 1)}
            onClick={() => applyAlign(t.mode)}
            aria-label={t.title}
            className="rounded-lg w-8 h-8 text-[11px] font-bold border border-black/10 bg-white hover:bg-black/[.035] focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-30"
          >
            {t.mode==="left"||t.mode==="center-x"||t.mode==="right"?<StudioIcon name={`align-${t.label}` as "align-left"|"align-center"|"align-right"} className="mx-auto h-4 w-4"/>:t.label}
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
            className="w-20 lg:w-28"
          />
          <span className="w-10 tabular-nums">{zoom}%</span>
        </label>
        <button
          type="button"
          className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-black/55 hover:bg-black/[.04]"
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
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-[14px] border border-black/10 bg-white/95 p-1.5 shadow-xl backdrop-blur md:hidden"><button type="button" onClick={()=>setMobilePanel(mobilePanel==="library"?null:"library")} className="rounded-xl px-3 py-2 text-[10px] font-black" aria-pressed={mobilePanel==="library"}>Create</button><button type="button" onClick={()=>setMobilePanel(mobilePanel==="inspector"?null:"inspector")} className="rounded-xl bg-black px-3 py-2 text-[10px] font-black text-white">Inspector</button></div>
        {/* Left: Elements / Layers */}
        <aside className={`${mobilePanel==="library"?"flex":"hidden"} absolute inset-x-3 bottom-16 top-3 z-30 flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#FFFCF8] shadow-2xl md:static md:flex md:w-[268px] md:shrink-0 md:rounded-none md:border-y-0 md:border-l-0 md:shadow-none`}>
          <GalaxyToolRail items={STUDIO_RAIL} value={leftTab} onChange={(id)=>setLeftTab(id as typeof leftTab)}/><div className="flex-1 overflow-y-auto p-3 space-y-3">
            {leftTab === "themes" ? <StudioThemesPanel document={doc} readOnly={readOnly} onApply={onChange}/> : null}
            {leftTab === "brand" ? <StudioBrandSpacePanel document={doc} readOnly={readOnly} onApply={onChange} onBrandSpace={setBrandSpace} onInsertLogo={(url,label)=>addLayer("image",{imageUrl:url,name:label,width:220,height:120,objectFit:"contain"})}/> : null}
            {leftTab === "brand" ? (
              <StudioBrandApplyPanel
                document={doc}
                pageId={activePageId}
                businessId={businessId}
                readOnly={readOnly}
                onApply={(next) => onChange(next)}
              />
            ) : null}
            {leftTab === "tools" ? (
              <StudioToolsPanel readOnly={readOnly} onAction={(action) => {
                if (action === "text") addLayer("text");
                else setLeftTab(action);
              }} />
            ) : null}
            {leftTab === "elements" ? (
              <div className="space-y-3">
                <div><p className="text-[10px] font-black uppercase tracking-[.18em]">{readOnly?"Elements · view only":"Elements"}</p><p className="text-[9px] text-black/40">Shapes, frames, symbols and business graphics</p></div>
                <input value={elementQuery} onChange={(e)=>setElementQuery(e.target.value)} placeholder="Search elements" className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs"/>
                <div className="flex gap-1 overflow-x-auto">{(["all","lines","frames","symbols","business","social","culture"] as const).map((value)=><button key={value} type="button" onClick={()=>setElementCategory(value)} className={`rounded-full px-2 py-1 text-[9px] font-bold capitalize ${elementCategory===value?"bg-black text-white":"bg-black/[.04] text-black/50"}`}>{value}</button>)}</div>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" disabled={readOnly} onClick={()=>addLayer("text")} className="rounded-xl border border-black/10 bg-white px-2 py-3 text-[10px] font-bold">T<br/><span className="font-normal text-black/40">Text</span></button>
                  <button type="button" disabled={readOnly} onClick={()=>addLayer("rect")} className="rounded-xl border border-black/10 bg-white px-2 py-3 text-[10px] font-bold">■<br/><span className="font-normal text-black/40">Shape</span></button>
                  <button type="button" disabled={readOnly} onClick={()=>addLayer("ellipse")} className="rounded-xl border border-black/10 bg-white px-2 py-3 text-[10px] font-bold">●<br/><span className="font-normal text-black/40">Circle</span></button>
                </div>
                <div className="grid grid-cols-2 gap-2">{searchStudioElements(elementQuery,elementCategory).map((el)=><button key={el.id} type="button" disabled={readOnly} title={el.label} onClick={()=>addElement(el)} className="flex min-h-[70px] flex-col items-center justify-center rounded-xl border border-black/10 bg-white px-2 py-2 text-center hover:border-orange-400 disabled:opacity-40"><span className="text-2xl">{el.glyph ?? (el.kind==="frame"?"□":"━")}</span><span className="mt-1 text-[9px] font-bold">{el.label}</span></button>)}</div>
                {searchStudioElements(elementQuery,elementCategory).length===0?<p className="rounded-xl border border-dashed border-black/15 p-4 text-center text-[10px] text-black/45">No elements match that search.</p>:null}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e)=>void onFilePicked(e.target.files?.[0]??null,"image")}/>
                <input ref={videoFileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e)=>void onFilePicked(e.target.files?.[0]??null,"video")}/>
              </div>
            ) : leftTab === "uploads" ? (
              <StudioUploadsLibrary approvedAssetIds={brandSpace?.approvedAssetIds??[]}
                readOnly={readOnly}
                designId={designId}
                onPickImage={(url) =>
                  addLayer("image", { imageUrl: url, name: "Library", width: 320, height: 320 })
                }
                onDropAsset={()=>undefined}
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
              <div className="space-y-2">
                <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em]">Layers</p><p className="text-[9px] text-black/40">Top layer appears first</p></div><span className="rounded-full bg-black/[.05] px-2 py-1 text-[9px] font-bold">{layers.length}</span></div>
                <ul className="space-y-1">{[...layers].reverse().map((l) => (
                  <li key={l.id} className={`group flex items-center rounded-xl border ${selectedSet.has(l.id)?"border-black bg-black text-white":"border-transparent hover:border-black/10 hover:bg-white"}`}>
                    <button type="button" onClick={(e)=>selectLayer(l,e.shiftKey)} className="min-w-0 flex-1 px-2.5 py-2 text-left">
                      <span className="block truncate text-[10px] font-bold">{l.name}</span><span className="text-[8px] opacity-45">{l.type}{l.groupId?" · grouped":""}</span>
                    </button>
                    {!readOnly?<button type="button" title={l.locked?"Unlock layer":"Lock layer"} onClick={()=>updateLayer(l.id,{locked:!l.locked})} className="mr-1 rounded-lg px-2 py-2 text-[10px] opacity-55 hover:bg-white/10">{l.locked?"🔒":"○"}</button>:null}
                  </li>))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        {/* Center canvas */}
        <div
          ref={boardRef}
          onDragOver={(e)=>{if(e.dataTransfer.types.includes("application/x-kebu-studio-asset")){e.preventDefault();e.dataTransfer.dropEffect="copy"}}}
          onDrop={(e)=>{const raw=e.dataTransfer.getData("application/x-kebu-studio-asset");if(!raw)return;e.preventDefault();try{const a=JSON.parse(raw) as {id?:string;kind:string;url:string;file_name?:string;width?:number|null;height?:number|null};if(a.kind==="image"||a.kind==="video")placeDroppedAsset({id:a.id,kind:a.kind,url:a.url,name:a.file_name,width:a.width,height:a.height},e.clientX,e.clientY)}catch{setUploadError("That asset could not be placed.")}}}
          className={`min-w-0 flex-1 overflow-hidden p-3 sm:p-6 flex justify-center items-start relative ${
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
                      borderRadius: layer.cornerRadius ?? 0,
                      filter:
                        (layer.shadowBlur ?? 0) > 0 || (layer.shadowX ?? 0) !== 0 || (layer.shadowY ?? 0) !== 0
                          ? `drop-shadow(${layer.shadowX ?? 0}px ${layer.shadowY ?? 0}px ${layer.shadowBlur ?? 0}px ${layer.shadowColor ?? "#00000055"})`
                          : undefined,
                      cursor: spaceHeld ? "grab" : layer.locked ? "not-allowed" : "move",
                      pointerEvents: spaceHeld ? "none" : "auto",
                    }}
                    onPointerDown={(e) => {
                      if (spaceHeld || e.button === 1) return;
                      pointerDown(e, layer, "move");
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => {
                      if (readOnly || layer.type !== "text") return;
                      e.stopPropagation();
                      onSelectLayers([layer.id]);
                      setEditingTextId(layer.id);
                    }}
                  >
                    {layer.type === "text" ? (
                      <p
                        style={{
                          fontSize: layer.fontSize,
                          fontFamily: cssStackForStudioFont(layer.fontFamily ?? "system-ui"),
                          fontWeight: layer.fontWeight,
                          fontStyle: layer.fontStyle ?? "normal",
                          color: layer.color,
                          textAlign: layer.textAlign,
                          letterSpacing: layer.letterSpacing != null ? `${layer.letterSpacing}px` : undefined,
                          lineHeight: layer.lineHeight ?? 1.2,
                          textDecoration: layer.textDecoration ?? "none",
                          textTransform: layer.textTransform === "none" ? undefined : layer.textTransform,
                          margin: 0,
                          pointerEvents: editingTextId === layer.id ? "auto" : "none",
                          cursor: editingTextId === layer.id ? "text" : undefined,
                          outline: "none",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                        contentEditable={editingTextId === layer.id}
                        suppressContentEditableWarning
                        onPointerDown={(e) => {
                          if (editingTextId === layer.id) e.stopPropagation();
                        }}
                        onInput={(e) => {
                          if (editingTextId !== layer.id) return;
                          updateLayer(layer.id, { text: e.currentTarget.innerText.slice(0, 500) }, true);
                        }}
                        onBlur={() => {
                          if (editingTextId !== layer.id) return;
                          onChange(latestDoc.current);
                          setEditingTextId(null);
                        }}
                        onKeyDown={(e) => {
                          if (editingTextId !== layer.id) return;
                          e.stopPropagation();
                          if (e.key === "Escape" || ((e.metaKey || e.ctrlKey) && e.key === "Enter")) {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
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
                              filter: mediaFilterCss(layer),
                            };
                          })()}
                        />
                      </div>
                    ) : layer.type === "video" && layer.videoUrl ? (
                      <TimelineVideo
                        url={layer.videoUrl}
                        trimStartMs={layer.trimStartMs ?? 0}
                        pageLocalMs={previewLocalMs}
                        filterCss={mediaFilterCss(layer)}
                      />
                    ) : layer.type === "ellipse" ? (
                      <div
                        className="w-full h-full rounded-full pointer-events-none"
                        style={{ background: layer.fill }}
                      />
                    ) : layer.type === "line" ? (
                      <><div
                        className="w-full pointer-events-none absolute left-0"
                        style={{
                          background: layer.fill ?? "#FFFFFF",
                          height: Math.max(2, layer.height),
                          top: "50%",
                          transform: "translateY(-50%)",
                        }}
                      />{layer.text==="→"?<span className="absolute right-[-2px] top-1/2 -translate-y-1/2 text-[22px] leading-none" style={{color:layer.stroke??layer.fill??"#111"}}>›</span>:null}</>
                    ) : layer.type === "frame" ? (
                      <div
                        className="w-full h-full pointer-events-none box-border overflow-hidden relative"
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
                        {layer.frameMediaUrl && layer.frameMediaKind==="image" ? <img src={layer.frameMediaUrl} alt="" className="absolute inset-0 h-full w-full" style={{objectFit:"cover",objectPosition:`${(layer.frameFocalX??.5)*100}% ${(layer.frameFocalY??.5)*100}%`}}/> : layer.frameMediaUrl && layer.frameMediaKind==="video" ? <video src={layer.frameMediaUrl} muted playsInline className="absolute inset-0 h-full w-full object-cover" style={{objectPosition:`${(layer.frameFocalX??.5)*100}% ${(layer.frameFocalY??.5)*100}%`}}/> : layer.frameStyle === "polaroid" ? <div className="w-full h-full" style={{ background: "#E8E4DC" }} /> : null}
                        <div className="absolute inset-0" style={{border:`${layer.strokeWidth??6}px solid ${layer.stroke??"#fff"}`,borderRadius:layer.frameStyle==="rounded"?20:0}}/>
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
                      <>
                        {([
                          ["-left-1.5 -top-1.5 cursor-nw-resize", "resize-nw"],
                          ["-right-1.5 -top-1.5 cursor-ne-resize", "resize-ne"],
                          ["-left-1.5 -bottom-1.5 cursor-sw-resize", "resize-sw"],
                          ["-right-1.5 -bottom-1.5 cursor-se-resize", "resize-se"],
                        ] as const).map(([classes, mode]) => (
                          <div
                            key={mode}
                            className={`absolute ${classes} h-3.5 w-3.5 rounded-sm border border-white bg-orange-500`}
                            onPointerDown={(e) => pointerDown(e, layer, mode)}
                          />
                        ))}
                        <div className="absolute left-1/2 -top-8 h-6 w-px -translate-x-1/2 bg-orange-500" />
                        <button
                          type="button"
                          aria-label="Rotate layer"
                          className="absolute left-1/2 -top-11 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-orange-500 cursor-grab"
                          onPointerDown={(e) => pointerDown(e, layer, "rotate")}
                        />
                      </>
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
        <aside className={`${mobilePanel==="inspector"?"block":"hidden"} absolute inset-x-3 bottom-16 top-3 z-30 overflow-y-auto rounded-2xl border border-black/10 bg-white p-4 shadow-2xl md:static md:block md:w-[288px] md:shrink-0 md:rounded-none md:border-y-0 md:border-r-0 md:shadow-none space-y-3`}>
          <div className="sticky top-0 z-10 -mx-4 -mt-4 border-b border-black/10 bg-white/95 px-4 py-3 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[.18em]">Inspector{readOnly ? " · view only" : ""}</p><p className="mt-0.5 text-[9px] text-black/40">{selected ? `${selected.name} · ${selected.type}` : `${page.name} · ${page.width}×${page.height}`}</p></div>
          <fieldset disabled={readOnly} className="space-y-3 border-0 p-0 m-0 min-w-0 disabled:opacity-70">
          {selectedLayerIds.length > 1 ? (
            <p className="text-xs opacity-60">
              {selectedLayerIds.length} layers selected. Use Align / Group in the toolbar.
            </p>
          ) : null}
          {!selected ? (
            <div className="space-y-3">
              <GalaxyEmptyState title="Nothing selected" detail="Select something on the canvas to edit it, or adjust the page itself below." />
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
            <div className="space-y-0 text-xs">
              <GalaxyInspectorSection title="Layer"><label className="block font-semibold">
                Name
                <input
                  value={selected.name}
                  onChange={(e) => updateLayer(selected.id, { name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                />
              </label></GalaxyInspectorSection>
              {selected.type === "text" ? (<GalaxyInspectorSection title="Typography">
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
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block font-semibold">
                      Weight
                      <select
                        value={selected.fontWeight ?? "400"}
                        onChange={(e) => updateLayer(selected.id, { fontWeight: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                      >
                        <option value="300">Light</option>
                        <option value="400">Regular</option>
                        <option value="500">Medium</option>
                        <option value="600">Semi bold</option>
                        <option value="700">Bold</option>
                        <option value="800">Extra bold</option>
                        <option value="900">Black</option>
                      </select>
                    </label>
                    <label className="block font-semibold">
                      Style
                      <select
                        value={selected.fontStyle ?? "normal"}
                        onChange={(e) => updateLayer(selected.id, { fontStyle: e.target.value as "normal" | "italic" })}
                        className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                      >
                        <option value="normal">Normal</option>
                        <option value="italic">Italic</option>
                      </select>
                    </label>
                    <label className="block font-semibold">
                      Letter space
                      <input
                        type="number"
                        min={-20}
                        max={100}
                        step={0.5}
                        value={selected.letterSpacing ?? 0}
                        onChange={(e) => updateLayer(selected.id, { letterSpacing: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                      />
                    </label>
                    <label className="block font-semibold">
                      Line height
                      <input
                        type="number"
                        min={0.6}
                        max={3}
                        step={0.05}
                        value={selected.lineHeight ?? 1.2}
                        onChange={(e) => updateLayer(selected.id, { lineHeight: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block font-semibold">
                      Decoration
                      <select
                        value={selected.textDecoration ?? "none"}
                        onChange={(e) => updateLayer(selected.id, { textDecoration: e.target.value as "none" | "underline" | "line-through" })}
                        className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                      >
                        <option value="none">None</option>
                        <option value="underline">Underline</option>
                        <option value="line-through">Strike</option>
                      </select>
                    </label>
                    <label className="block font-semibold">
                      Case
                      <select
                        value={selected.textTransform ?? "none"}
                        onChange={(e) => updateLayer(selected.id, { textTransform: e.target.value as "none" | "uppercase" | "lowercase" })}
                        className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                      >
                        <option value="none">As typed</option>
                        <option value="uppercase">UPPERCASE</option>
                        <option value="lowercase">lowercase</option>
                      </select>
                    </label>
                  </div>
                </GalaxyInspectorSection>
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
              {selected.type==="frame"?<div className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Frame media</p><p className="text-[10px] opacity-55">{selected.frameMediaUrl?"Drop another image/video to replace it.":"Select this frame, then drag media from the library onto the canvas."}</p>{selected.frameMediaUrl?<><label className="block font-semibold">Horizontal focus<input type="range" min="0" max="100" value={Math.round((selected.frameFocalX??.5)*100)} onChange={e=>updateLayer(selected.id,{frameFocalX:Number(e.target.value)/100})} className="w-full"/></label><label className="block font-semibold">Vertical focus<input type="range" min="0" max="100" value={Math.round((selected.frameFocalY??.5)*100)} onChange={e=>updateLayer(selected.id,{frameFocalY:Number(e.target.value)/100})} className="w-full"/></label><button type="button" onClick={()=>updateLayer(selected.id,{frameMediaUrl:null,frameMediaKind:null,sourceAssetId:null})} className="text-[11px] underline">Remove frame media</button></>:null}</div>:null}
              {brandSpace?<GalaxyInspectorSection title="Brand Space"><div className="space-y-2"><div className="flex flex-wrap gap-1">{Object.entries(brandSpace.colors).map(([role,value])=><button key={role} type="button" title={role} onClick={()=>updateLayer(selected.id,selected.type==="text"?{color:value}:selected.type==="line"?{stroke:value,fill:value}:{fill:value})} className="h-6 w-6 rounded border border-black/10" style={{background:value}}/>)}</div>{selected.type==="text"?<div className="flex flex-wrap gap-1">{Object.entries(brandSpace.typography).map(([role,font])=><button key={role} type="button" onClick={()=>updateLayer(selected.id,{fontFamily:font})} className="rounded border border-black/10 px-2 py-1 text-[8px]">{role}</button>)}</div>:null}</div></GalaxyInspectorSection>:null}
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
                  <StudioMediaAdjustmentsPanel
                    layer={selected}
                    onChange={(patch) => updateLayer(selected.id, patch)}
                  />
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
                  <StudioMediaAdjustmentsPanel
                    layer={selected}
                    onChange={(patch) => updateLayer(selected.id, patch)}
                  />
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
              {(["rect","ellipse","line","frame","icon"].includes(selected.type))?<div className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Element style</p>{selected.type!=="icon"?<><label className="block font-semibold">Stroke<input type="color" value={selected.stroke??"#111111"} onChange={e=>updateLayer(selected.id,{stroke:e.target.value})} className="mt-1 h-8 w-full"/></label><label className="block font-semibold">Stroke width<input type="range" min="0" max="40" value={selected.strokeWidth??0} onChange={e=>updateLayer(selected.id,{strokeWidth:Number(e.target.value)})} className="w-full"/></label></>:null}{selected.type==="rect"||selected.type==="frame"?<label className="block font-semibold">Corners<input type="range" min="0" max="200" value={selected.cornerRadius??0} onChange={e=>updateLayer(selected.id,{cornerRadius:Number(e.target.value)})} className="w-full"/></label>:null}{selected.type==="line"?<><label className="block font-semibold">Line weight<input type="range" min="2" max="40" value={selected.height} onChange={e=>updateLayer(selected.id,{height:Number(e.target.value)})} className="w-full"/></label><button type="button" onClick={()=>updateLayer(selected.id,{text:selected.text==="→"?"":"→"})} className="rounded-lg border border-black/10 px-2 py-1 text-[10px] font-bold">{selected.text==="→"?"Remove arrow":"Add arrow"}</button></>:null}</div>:null}
              <p className="pt-1 text-[10px] font-bold uppercase tracking-wider opacity-50">Position · size</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["X", "x", selected.x],
                  ["Y", "y", selected.y],
                  ["Width", "width", selected.width],
                  ["Height", "height", selected.height],
                ] as const).map(([label, key, value]) => (
                  <label key={key} className="block font-semibold">
                    {label}
                    <input
                      type="number"
                      value={Math.round(value * 10) / 10}
                      onChange={(e) => updateLayer(selected.id, { [key]: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                    />
                  </label>
                ))}
              </div>
              <p className="pt-1 text-[10px] font-bold uppercase tracking-wider opacity-50">Effects</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block font-semibold">
                  Corner
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={selected.cornerRadius ?? 0}
                    onChange={(e) => updateLayer(selected.id, { cornerRadius: Math.max(0, Number(e.target.value)) })}
                    className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                  />
                </label>
                <label className="block font-semibold">
                  Shadow blur
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={selected.shadowBlur ?? 0}
                    onChange={(e) => updateLayer(selected.id, { shadowBlur: Math.max(0, Number(e.target.value)) })}
                    className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                  />
                </label>
                <label className="block font-semibold">
                  Shadow X
                  <input
                    type="number"
                    min={-200}
                    max={200}
                    value={selected.shadowX ?? 0}
                    onChange={(e) => updateLayer(selected.id, { shadowX: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                  />
                </label>
                <label className="block font-semibold">
                  Shadow Y
                  <input
                    type="number"
                    min={-200}
                    max={200}
                    value={selected.shadowY ?? 0}
                    onChange={(e) => updateLayer(selected.id, { shadowY: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5"
                  />
                </label>
              </div>
              <label className="block font-semibold">
                Shadow color
                <input
                  type="color"
                  value={(selected.shadowColor ?? "#000000").slice(0, 7)}
                  onChange={(e) => updateLayer(selected.id, { shadowColor: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-black/10"
                />
              </label>
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
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-black/10 disabled:opacity-30" style={{ color: "#8B1E1E" }}
        >
          Delete page
        </button>
      </div>
    </div>
  );
}

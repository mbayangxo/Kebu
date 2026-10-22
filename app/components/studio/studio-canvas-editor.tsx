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
import { resizeCreativeBounds, type ResizeHandle } from "@/lib/creative-core/resize";
import { videoSourceTimeSec } from "@/lib/studio/timeline";
import {
  clipboardPayloadFromLayers,
  layersFromClipboardPayload,
  layersInRect,
  normalizeCrop,
  nudgeLayersWithinArtboard,
  snapLayerPosition,
} from "@/lib/studio/editor-craft";
import { GalaxyEmptyState, GalaxyInspectorSection, GalaxyToolRail } from "@/app/components/galaxy/editor-primitives";
import { StudioInlineText } from "@/app/components/studio/studio-inline-text";
import { StudioIcon } from "@/app/components/studio/studio-icons";
import { StudioUploadsLibrary } from "@/app/components/studio/studio-uploads-library";
import { StudioMarketplaceLibraryPanel } from "@/app/components/studio/studio-marketplace-library-panel";
import { loadCustomFontFaces } from "@/lib/studio/custom-fonts";
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
import { layerMotionAtTime } from "@/lib/studio/layer-motion";
import { fillFrameWithAsset, mediaLayerFromAsset, type StudioDroppedAsset } from "@/lib/studio/asset-canvas-operations";
import { studioLayerFillCss, STUDIO_BLEND_MODES } from "@/lib/studio/layer-paint";
import {
  cssStackForStudioFont,
  googleFontsHrefForStudioCatalog,
  studioFontFamilies,
} from "@/lib/studio/fonts-catalog";

type DragMode =
  | "move"
  | `resize-${ResizeHandle}`
  | "rotate"
  | null;

type MarqueeSelection = {
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  boardLeft: number;
  boardTop: number;
  additive: boolean;
  previousIds: string[];
  moved: boolean;
};

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

const AI_ICON=<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M12 2l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14l-5 3.2 1.9-5.8L4 7.8h6.1z"/><path d="M5 20h14M9 20v-3M15 20v-3"/></svg>;
const STUDIO_RAIL=[{id:"elements",label:"Elements",icon:<StudioIcon name="elements"/>},{id:"layers",label:"Layers",icon:<StudioIcon name="layers"/>},{id:"uploads",label:"Media",icon:<StudioIcon name="uploads"/>},{id:"themes",label:"Themes",icon:<StudioIcon name="themes"/>},{id:"brand",label:"Brand",icon:<StudioIcon name="brand"/>},{id:"tools",label:"Tools",icon:<StudioIcon name="tools"/>},{id:"ai",label:"AI",icon:AI_ICON}];

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
  timelineVisible = false,
  businessId = null,
  liveCursorsUserId = null,
  liveCursorsLabel = "You",
  resolveMediaUrl = (url) => url,
}: {
  designId: string;
  document: CanvasDocument;
  /** ephemeral=true while dragging — parent should not push undo history each frame */
  onChange: (next: CanvasDocument, opts?: { ephemeral?: boolean; cancelGesture?: boolean }) => void;
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
  timelineVisible?: boolean;
  businessId?: string | null;
  liveCursorsUserId?: string | null;
  liveCursorsLabel?: string;
  resolveMediaUrl?: (url: string) => string;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState<{
    pointerId: number;
    mode: DragMode;
    layerId: string;
    startX: number;
    startY: number;
    orig: CanvasLayer;
    /** Snapshot of layers when move started (for group move) */
    origLayers: CanvasLayer[];
    movingIds: string[];
    baseline: CanvasDocument;
  } | null>(null);
  const [pan, setPan] = useState<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [marquee, setMarquee] = useState<MarqueeSelection | null>(null);
  const marqueeRef = useRef<MarqueeSelection | null>(null);
  const suppressSelectionClick = useRef(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [zoom, setZoom] = useState(45);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [elementQuery, setElementQuery] = useState("");
  const [elementCategory, setElementCategory] = useState<StudioElementCategory | "all">("all");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [brandSpace,setBrandSpace]=useState<BrandSpace|null>(null);
  const [leftTab, setLeftTab] = useState<"elements" | "layers" | "uploads" | "themes" | "brand" | "tools" | "ai">("elements");
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"library" | "inspector" | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"design" | "animate" | "position">("design");
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<{role:"user"|"assistant";text:string}[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [customFontFamilies, setCustomFontFamilies] = useState<string[]>([]);

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

  useEffect(() => {
    const id = "kebu-studio-self-hosted-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "/fonts/kebu-display/kebu-display.css";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/studio/creative-assets/library", { credentials: "include" })
      .then((res) => res.json())
      .then(async (data) => {
        const fontItems: { asset: { kind: string; name: string; fileUrl: string } }[] = Array.isArray(data.items) ? data.items : [];
        const fonts = fontItems.filter((i) => i.asset.kind === "font").map((i) => ({ family: i.asset.name, fileUrl: i.asset.fileUrl }));
        if (!fonts.length || cancelled) return;
        const results = await loadCustomFontFaces(fonts);
        if (cancelled) return;
        setCustomFontFamilies(results.filter((r) => r.ok).map((r) => r.family));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
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
    if (fittedOnce.current) return;
    const tryFit = () => {
      const el = boardRef.current;
      if (!el || el.clientWidth === 0) return false;
      const boardH = el.clientHeight || window.innerHeight * 0.7;
      const fitW = (el.clientWidth - 48) / page.width;
      const fitH = (boardH - 48) / page.height;
      const fit = Math.min(0.9, Math.max(0.2, Math.min(fitW, fitH)));
      setZoom(Math.round(fit * 100));
      setPanOffset({ x: 0, y: 0 });
      fittedOnce.current = true;
      return true;
    };
    if (!tryFit()) {
      // Layout hasn't settled yet — try next frame
      const raf = requestAnimationFrame(() => { tryFit(); });
      return () => cancelAnimationFrame(raf);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.width, page.height]);

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
    if (!e.isPrimary || e.button !== 0 || marqueeRef.current) return;
    if (mode === "move" && editingTextId === layer.id) {
      e.stopPropagation();
      return; // Native caret/selection belongs to the on-canvas text editor.
    }
    if (layer.locked && mode === "move") {
      selectLayer(layer, e.shiftKey);
      return;
    }
    if (layer.locked) return;
    // Native text/image dragging cancels pointer capture after the first move.
    if (!readOnly) e.preventDefault();
    e.stopPropagation();
    // Shift constrains a resize; it must not toggle the selected object off.
    const selection = mode === "move" && e.shiftKey
      ? selectedSet.has(layer.id) ? selectedLayerIds.filter(id => id !== layer.id) : [...selectedLayerIds, layer.id]
      : selectedSet.has(layer.id) ? selectedLayerIds : [layer.id];
    if (mode === "move") onSelectLayers(expandSelectionWithGroups(layers, selection));
    else if (!selectedSet.has(layer.id)) selectLayer(layer, false);
    // Shift-clicking an already selected object only removes it from selection.
    if (mode === "move" && e.shiftKey && selectedSet.has(layer.id)) return;
    if (readOnly) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const current = getPage(latestDoc.current, activePageId).layers;
    setDrag({
      pointerId: e.pointerId,
      mode,
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...layer },
      origLayers: current.map((l) => ({ ...l })),
      movingIds: expandSelectionWithGroups(current, selection).filter(id => !current.find(l => l.id === id)?.locked),
      baseline: latestDoc.current,
    });
  }

  function boardPointerDown(e: React.PointerEvent) {
    if (!e.isPrimary || marqueeRef.current) return;
    suppressSelectionClick.current = false;
    const middle = e.button === 1;
    if ((spaceHeld && e.button === 0) || middle) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setPan({
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: panOffset.x,
        origY: panOffset.y,
      });
      return;
    }
    if (e.button !== 0 || (e.target as Element).closest("[data-studio-layer-id]")) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const box = e.currentTarget.getBoundingClientRect();
    const next: MarqueeSelection = {
      pointerId: e.pointerId, startX: e.clientX, startY: e.clientY,
      x: e.clientX, y: e.clientY, boardLeft: box.left, boardTop: box.top,
      additive: e.shiftKey || e.metaKey || e.ctrlKey,
      previousIds: [...selectedLayerIds], moved: false,
    };
    marqueeRef.current = next;
    setMarquee(next);
  }

  function pointerMove(e: React.PointerEvent) {
    const current = marqueeRef.current;
    if (current) {
      if (current.pointerId !== e.pointerId) return;
      const next = {
        ...current, x: e.clientX, y: e.clientY,
        moved: current.moved || Math.hypot(e.clientX - current.startX, e.clientY - current.startY) > 4,
      };
      marqueeRef.current = next;
      setMarquee(next);
      return;
    }
    if (pan) {
      if (pan.pointerId !== e.pointerId) return;
      setPanOffset({
        x: pan.origX + (e.clientX - pan.startX),
        y: pan.origY + (e.clientY - pan.startY),
      });
      return;
    }
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = (e.clientX - drag.startX) / displayScale;
    const dy = (e.clientY - drag.startY) / displayScale;
    const orig = drag.orig;
    if (drag.mode === "move") {
      const moveIds = new Set(drag.movingIds);
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
      const geometry = resizeCreativeBounds(orig, drag.mode.slice(7) as ResizeHandle, { x: dx, y: dy }, {
        keepRatio: e.shiftKey, fromCenter: e.altKey,
      });
      updateLayer(drag.layerId, {
        ...geometry,
        x: Math.max(-2000, Math.min(4000, geometry.x)),
        y: Math.max(-2000, Math.min(4000, geometry.y)),
      }, true);
    }
  }

  function cancelMarquee() {
    if (!marqueeRef.current) return;
    marqueeRef.current = null;
    setMarquee(null);
    suppressSelectionClick.current = true;
  }

  function pointerCancel(e: React.PointerEvent) {
    if (marqueeRef.current && marqueeRef.current.pointerId !== e.pointerId) return;
    if (drag && drag.pointerId !== e.pointerId) return;
    if (pan && pan.pointerId !== e.pointerId) return;
    cancelMarquee();
    if (drag) {
      latestDoc.current = drag.baseline;
      onChange(drag.baseline, { cancelGesture: true });
    }
    if (pan) setPanOffset({ x: pan.origX, y: pan.origY });
    setDrag(null);
    setSnapGuides({ v: null, h: null });
    setPan(null);
  }

  function pointerUp(e: React.PointerEvent) {
    const current = marqueeRef.current;
    if (current) {
      if (current.pointerId !== e.pointerId) return;
      const box = artboardRef.current?.getBoundingClientRect();
      // Selection clearing belongs to a gesture that began on background.
      // Touch can retarget the later click to the board after resizing a layer.
      if (!current.moved && !current.additive) onSelectLayers([]);
      if (current.moved && box && box.width > 0 && box.height > 0) {
        const scaleX = box.width / page.width, scaleY = box.height / page.height;
        const rect = {
          left: (current.startX - box.left) / scaleX,
          top: (current.startY - box.top) / scaleY,
          right: (e.clientX - box.left) / scaleX,
          bottom: (e.clientY - box.top) / scaleY,
        };
        const paintedLayers = layers.map(layer => {
          const motion = layerMotionAtTime(layer, previewLocalMs);
          return {
            ...layer,
            x: layer.x + motion.translateX + layer.width * (1 - motion.scale) / 2,
            y: layer.y + motion.translateY + layer.height * (1 - motion.scale) / 2,
            width: layer.width * motion.scale, height: layer.height * motion.scale,
            opacity: layer.opacity * motion.opacityMultiplier,
          };
        });
        const selectableIds = new Set(paintedLayers
          .filter(layer => !layer.locked && layer.opacity > 0).map(layer => layer.id));
        const hits = expandSelectionWithGroups(layers, layersInRect(paintedLayers, rect))
          .filter(id => selectableIds.has(id));
        onSelectLayers(current.additive ? [...new Set([...current.previousIds, ...hits])] : hits);
      }
      suppressSelectionClick.current = true;
      marqueeRef.current = null;
      setMarquee(null);
      return;
    }
    if (drag && drag.pointerId !== e.pointerId) return;
    if (pan && pan.pointerId !== e.pointerId) return;
    if (pan && Math.hypot(e.clientX - pan.startX, e.clientY - pan.startY) > 4) {
      suppressSelectionClick.current = true;
    }
    if (drag && latestDoc.current !== drag.baseline) {
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
      if (e.key === "Escape" && marqueeRef.current) {
        e.preventDefault();
        cancelMarquee();
        return;
      }
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

  async function sendAiMessage(text: string) {
    if (!text.trim() || aiBusy) return;
    setAiMessages(prev => [...prev, { role: "user", text }]);
    setAiInput("");
    setAiBusy(true);
    try {
      const res = await fetch("/api/yande/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context: "studio" }),
      });
      const data = await res.json() as { reply?: string; message?: string };
      setAiMessages(prev => [...prev, { role: "assistant", text: data.reply ?? data.message ?? "Hmm, I couldn't respond to that." }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "assistant", text: "Something went wrong. Please try again." }]);
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className={`relative flex ${timelineVisible ? "h-[calc(100dvh-18rem)]" : "h-[calc(100dvh-6.5rem)]"} min-h-[520px] flex-col bg-[#111214] text-white`}>
      {/* Top tool strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap border-b border-white/[.08] bg-[#101113] px-3 py-1.5 shrink-0">
        {readOnly ? (
          <span className="rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200">
            View only
          </span>
        ) : null}
        <button
          type="button"
          disabled={readOnly || !canUndo}
          onClick={() => onUndo?.()}
          className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-white/60 hover:bg-[#17181B]/[.06] hover:text-white disabled:opacity-25"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={readOnly || !canRedo}
          onClick={() => onRedo?.()}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-white/10 disabled:opacity-30"
        >
          Redo
        </button>
        <span className="mx-1 h-4 w-px bg-black/[.08]" />
        <button
          type="button"
          disabled={readOnly || !selectedLayerIds.length}
          onClick={copySelected}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-white/10 disabled:opacity-30"
        >
          Copy
        </button>
        <button
          type="button"
          disabled={readOnly}
          onClick={pasteLayers}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-white/10 disabled:opacity-30"
        >
          Paste
        </button>
        <button
          type="button"
          disabled={readOnly || !selectedLayerIds.length}
          onClick={duplicateSelected}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-white/10 disabled:opacity-30"
        >
          <span className="inline-flex items-center gap-1"><StudioIcon name="duplicate" className="h-3.5 w-3.5" />Duplicate</span>
        </button>
        <button
          type="button"
          disabled={readOnly || !selectedLayerIds.length}
          onClick={deleteSelected}
          className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-red-700/70 hover:bg-red-50 hover:text-red-800 disabled:opacity-25"
        >
          <span className="inline-flex items-center gap-1"><StudioIcon name="trash" className="h-3.5 w-3.5" />Delete</span>
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
            className="rounded-lg w-8 h-8 text-[11px] font-bold border border-white/10 bg-[#17181B] hover:bg-black/[.035] focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-30"
          >
            {t.mode==="left"||t.mode==="center-x"||t.mode==="right"?<StudioIcon name={`align-${t.label}` as "align-left"|"align-center"|"align-right"} className="mx-auto h-4 w-4"/>:t.label}
          </button>
        ))}
        <span className="w-px h-5 bg-black/10" />
        <button
          type="button"
          disabled={!canGroup}
          onClick={applyGroup}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-white/10 disabled:opacity-30"
        >
          Group
        </button>
        <button
          type="button"
          disabled={!canUngroup}
          onClick={applyUngroup}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-white/10 disabled:opacity-30"
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
          className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-white/55 hover:bg-[#17181B]/[.06]"
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
        <aside className={`${mobilePanel==="library"?"flex":"hidden"} absolute inset-x-3 bottom-16 top-3 z-30 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111214] shadow-2xl lg:static lg:flex lg:w-[268px] lg:shrink-0 lg:rounded-none lg:border-y-0 lg:border-l-0 lg:shadow-none`}>
          <GalaxyToolRail appearance="dark" items={STUDIO_RAIL} value={leftTab} onChange={(id)=>setLeftTab(id as typeof leftTab)}/><div className="flex-1 overflow-y-auto p-3 space-y-3">
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
            {leftTab === "ai" ? (
              <div className="space-y-3">
                <div><p className="text-[10px] font-black uppercase tracking-[.18em]">Yande AI</p><p className="text-[9px] text-white/60">Generate, design and ideate with AI</p></div>
                {aiMessages.length === 0 ? (
                  <div className="space-y-1.5">
                    {["Write headline text for my design","Suggest a color palette","What font pairs well with Fraunces?","Make my layout feel more premium"].map(s=>(
                      <button key={s} type="button" onClick={()=>void sendAiMessage(s)} className="w-full rounded-xl border border-white/10 bg-[#17181B] px-3 py-2 text-left text-[10px] font-medium text-white/70 hover:border-orange-400 hover:text-white">
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {aiMessages.map((m, i) => (
                      <div key={i} className={`rounded-xl px-3 py-2 text-[10px] leading-relaxed ${m.role==="user"?"bg-orange-500/20 text-orange-200 ml-4":"bg-white/[.06] text-white/80 mr-4"}`}>
                        {m.text}
                      </div>
                    ))}
                    {aiBusy ? <div className="rounded-xl bg-white/[.06] px-3 py-2 text-[10px] text-white/60 mr-4">Thinking…</div> : null}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={aiInput}
                    onChange={e=>setAiInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void sendAiMessage(aiInput)}}}
                    placeholder="Ask Yande AI…"
                    className="flex-1 rounded-xl border border-white/10 bg-[#17181B] px-3 py-2 text-xs placeholder:text-white/60"
                    disabled={aiBusy}
                  />
                  <button
                    type="button"
                    onClick={()=>void sendAiMessage(aiInput)}
                    disabled={aiBusy||!aiInput.trim()}
                    className="rounded-xl bg-orange-500 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
                {aiMessages.length > 0 ? <button type="button" onClick={()=>{setAiMessages([]);setAiInput("")}} className="text-[9px] text-white/60 hover:text-white/60">Clear chat</button> : null}
              </div>
            ) : leftTab === "elements" ? (
              <div className="space-y-3">
                <div><p className="text-[10px] font-black uppercase tracking-[.18em]">{readOnly?"Elements · view only":"Elements"}</p><p className="text-[9px] text-white/60">Shapes, frames, symbols and business graphics</p></div>
                <input value={elementQuery} onChange={(e)=>setElementQuery(e.target.value)} placeholder="Search elements" className="w-full rounded-xl border border-white/10 bg-[#17181B] px-3 py-2 text-xs"/>
                <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">{(["all","shapes","lines","frames","symbols","charts","stickers","illustrations","business","education","creator","social","culture"] as const).map((value)=><button key={value} type="button" onClick={()=>setElementCategory(value)} className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold capitalize ${elementCategory===value?"bg-white text-black":"bg-white/[.05] text-white/50"}`}>{value}</button>)}</div>
                {elementCategory === "all" && !elementQuery ? (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/60 mb-2">Basic</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" disabled={readOnly} onClick={()=>addLayer("text")} className="rounded-xl border border-white/10 bg-[#17181B] px-2 py-3 text-[10px] font-bold">T<br/><span className="font-normal text-white/60">Text</span></button>
                      <button type="button" disabled={readOnly} onClick={()=>addLayer("rect")} className="rounded-xl border border-white/10 bg-[#17181B] px-2 py-3 text-[10px] font-bold">■<br/><span className="font-normal text-white/60">Shape</span></button>
                      <button type="button" disabled={readOnly} onClick={()=>addLayer("ellipse")} className="rounded-xl border border-white/10 bg-[#17181B] px-2 py-3 text-[10px] font-bold">●<br/><span className="font-normal text-white/60">Circle</span></button>
                    </div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/60 mb-2 mt-3">Featured</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(["icon-spark","icon-quote","icon-heart","frame-circle","icon-sun","icon-cowrie","icon-star","icon-arrow","line-accent"] as const).map((id) => {
                        const el = STUDIO_ELEMENTS_PACK.find(e => e.id === id);
                        if (!el) return null;
                        return <button key={el.id} type="button" disabled={readOnly} title={el.label} onClick={()=>addElement(el)} className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-[#17181B] py-2.5 text-center hover:border-orange-400 disabled:opacity-40"><span className="text-xl">{el.glyph ?? "□"}</span><span className="text-[8px] text-white/50">{el.label}</span></button>;
                      })}
                    </div>
                  </div>
                ) : null}
                {(elementCategory === "all" || elementCategory === "social") && !elementQuery ? (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/60 mb-2">Social icons</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id:"ig", label:"Instagram", color:"#E1306C", path:"M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
                        { id:"tk", label:"TikTok", color:"#000000", path:"M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.81 1.54V6.78a4.85 4.85 0 01-1.04-.09z" },
                        { id:"yt", label:"YouTube", color:"#FF0000", path:"M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" },
                        { id:"x", label:"X / Twitter", color:"#000000", path:"M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                        { id:"sp", label:"Spotify", color:"#1DB954", path:"M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" },
                      ]).map(({id, label, color, path}) => (
                        <button key={id} type="button" disabled={readOnly} title={label} onClick={()=>addLayer("icon",{name:label,fill:color,width:48,height:48,iconSvgPath:path,iconViewBox:"0 0 24 24"})} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-[#17181B] py-2 hover:border-orange-400 disabled:opacity-40">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill={color} aria-hidden><path d={path}/></svg>
                          <span className="text-[8px] text-white/50">{label.split(" ")[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2">{searchStudioElements(elementQuery,elementCategory).map((el)=><button key={el.id} type="button" disabled={readOnly} title={el.label} onClick={()=>addElement(el)} className="flex min-h-[70px] flex-col items-center justify-center rounded-xl border border-white/10 bg-[#17181B] px-2 py-2 text-center hover:border-orange-400 disabled:opacity-40">{el.defaults.iconSvgPath ? <svg viewBox={el.defaults.iconViewBox ?? "0 0 24 24"} className="h-7 w-7" fill={el.defaults.fill ?? el.defaults.color ?? "#FFFFFF"} aria-hidden><path d={el.defaults.iconSvgPath}/></svg> : <span className="text-2xl">{el.glyph ?? (el.kind==="frame"?"□":"━")}</span>}<span className="mt-1 text-[9px] font-bold">{el.label}</span></button>)}</div>
                {searchStudioElements(elementQuery,elementCategory).length===0?<p className="rounded-xl border border-dashed border-black/15 p-4 text-center text-[10px] text-white/60">No elements match that search.</p>:null}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e)=>void onFilePicked(e.target.files?.[0]??null,"image")}/>
                <input ref={videoFileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e)=>void onFilePicked(e.target.files?.[0]??null,"video")}/>
              </div>
            ) : leftTab === "uploads" ? (
              <>
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
              <StudioMarketplaceLibraryPanel
                readOnly={readOnly}
                onPickImage={(url, name) => addLayer("image", { imageUrl: url, name, width: 320, height: 320 })}
              />
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em]">Layers</p><p className="text-[9px] text-white/60">Top layer appears first</p></div><span className="rounded-full bg-white/[.06] px-2 py-1 text-[9px] font-bold">{layers.length}</span></div>
                <ul className="space-y-1">{[...layers].reverse().map((l) => (
                  <li key={l.id} className={`group flex items-center rounded-xl border ${selectedSet.has(l.id)?"border-black bg-white text-black":"border-transparent hover:border-white/10 hover:bg-[#17181B]"}`}>
                    <button type="button" onClick={(e)=>selectLayer(l,e.shiftKey)} className="min-w-0 flex-1 px-2.5 py-2 text-left">
                      <span className="block truncate text-[10px] font-bold">{l.name}</span><span className="text-[8px] opacity-45">{l.type}{l.groupId?" · grouped":""}</span>
                    </button>
                    {!readOnly?<button type="button" title={l.locked?"Unlock layer":"Lock layer"} onClick={()=>updateLayer(l.id,{locked:!l.locked})} className="mr-1 rounded-lg px-2 py-2 text-[10px] opacity-55 hover:bg-[#17181B]/10">{l.locked?"🔒":"○"}</button>:null}
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
          className={`min-w-0 flex-1 overflow-hidden bg-[#EEEDEA] p-3 sm:p-6 flex justify-center items-start relative ${
            spaceHeld || pan ? "cursor-grab" : ""
          } ${pan ? "cursor-grabbing" : ""}`}
          onPointerDown={boardPointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerCancel}
          onLostPointerCapture={(e) => {
            if (marqueeRef.current?.pointerId === e.pointerId) cancelMarquee();
          }}
          style={{ touchAction: "none" }}
          onClickCapture={(e) => {
            if (!suppressSelectionClick.current) return;
            suppressSelectionClick.current = false;
            e.stopPropagation();
          }}
          onContextMenu={(e) => {
            if (spaceHeld) e.preventDefault();
          }}
        >
          {marquee?.moved ? (
            <div
              data-studio-marquee
              aria-hidden="true"
              className="pointer-events-none absolute z-50 border border-dashed border-orange-500 bg-orange-500/10"
              style={{
                left: Math.min(marquee.startX, marquee.x) - marquee.boardLeft,
                top: Math.min(marquee.startY, marquee.y) - marquee.boardTop,
                width: Math.abs(marquee.x - marquee.startX),
                height: Math.abs(marquee.y - marquee.startY),
              }}
            />
          ) : null}
          <div
            ref={artboardRef}
            className="relative shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
            style={{
              width: page.width * displayScale,
              height: page.height * displayScale,
              background: page.backgroundColor,
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            }}
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
                const motion = layerMotionAtTime(layer, previewLocalMs);
                return (
                  <div
                    key={layer.id}
                    data-studio-layer-id={layer.id}
                    className={`absolute ${selectedOn ? "outline outline-2 outline-orange-600 outline-offset-1" : ""}`}
                    style={{
                      left: layer.x,
                      top: layer.y,
                      width: layer.width,
                      height: layer.height,
                      transform: `translate(${motion.translateX}px, ${motion.translateY}px) rotate(${layer.rotation}deg) scale(${motion.scale})`,
                      opacity: layer.opacity * motion.opacityMultiplier,
                      mixBlendMode: layer.blendMode && layer.blendMode !== "normal" ? layer.blendMode : undefined,
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
                      <StudioInlineText
                        text={layer.text ?? ""}
                        name={layer.name}
                        editing={editingTextId === layer.id}
                        onChange={text => updateLayer(layer.id, { text }, true)}
                        onFinish={changed => { if (changed) onChange(latestDoc.current); setEditingTextId(null); }}
                        onCancel={original => {
                          const base = latestDoc.current;
                          const next = updatePage(base, activePageId, { layers: getPage(base, activePageId).layers.map(item => item.id === layer.id ? { ...item, text: original } : item) });
                          latestDoc.current = next;
                          onChange(next, { cancelGesture: true });
                          setEditingTextId(null);
                        }}
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
                      />
                    ) : layer.type === "image" && layer.imageUrl ? (
                      <div className="w-full h-full overflow-hidden pointer-events-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveMediaUrl(layer.imageUrl)}
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
                        url={resolveMediaUrl(layer.videoUrl)}
                        trimStartMs={layer.trimStartMs ?? 0}
                        pageLocalMs={previewLocalMs}
                        filterCss={mediaFilterCss(layer)}
                      />
                    ) : layer.type === "ellipse" ? (
                      <div
                        className="w-full h-full rounded-full pointer-events-none"
                        style={{ background: studioLayerFillCss(layer) }}
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
                        {layer.frameMediaUrl && layer.frameMediaKind==="image" ? <img src={resolveMediaUrl(layer.frameMediaUrl)} alt="" className="absolute inset-0 h-full w-full" style={{objectFit:"cover",objectPosition:`${(layer.frameFocalX??.5)*100}% ${(layer.frameFocalY??.5)*100}%`}}/> : layer.frameMediaUrl && layer.frameMediaKind==="video" ? <video src={layer.frameMediaUrl} muted playsInline className="absolute inset-0 h-full w-full object-cover" style={{objectPosition:`${(layer.frameFocalX??.5)*100}% ${(layer.frameFocalY??.5)*100}%`}}/> : layer.frameStyle === "polaroid" ? <div className="w-full h-full" style={{ background: "#E8E4DC" }} /> : null}
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
                        {layer.iconSvgPath ? (
                          <svg viewBox={layer.iconViewBox ?? "0 0 24 24"} className="w-full h-full" fill={layer.fill ?? layer.color ?? "#FFFFFF"} aria-hidden>
                            <path d={layer.iconSvgPath} />
                          </svg>
                        ) : layer.text || "★"}
                      </div>
                    ) : (
                      <div className="w-full h-full pointer-events-none" style={{ background: studioLayerFillCss(layer) }} />
                    )}
                    {selectedOn && !layer.locked && selectedLayerIds.length === 1 ? (
                      <>
                        {([
                          ["nw", "top left", "0%", "0%", "cursor-nwse-resize"],
                          ["n", "top", "50%", "0%", "cursor-ns-resize"],
                          ["ne", "top right", "100%", "0%", "cursor-nesw-resize"],
                          ["e", "right", "100%", "50%", "cursor-ew-resize"],
                          ["se", "bottom right", "100%", "100%", "cursor-nwse-resize"],
                          ["s", "bottom", "50%", "100%", "cursor-ns-resize"],
                          ["sw", "bottom left", "0%", "100%", "cursor-nesw-resize"],
                          ["w", "left", "0%", "50%", "cursor-ew-resize"],
                        ] as const).map(([handle, label, left, top, cursor]) => (
                          <button
                            key={handle}
                            type="button"
                            aria-label={`Resize ${label}`}
                            disabled={readOnly}
                            title="Drag to resize · Shift keeps ratio · Alt/Option resizes from center · arrow keys resize"
                            className={`absolute z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40 ${cursor}`}
                            style={{ left, top, width: Math.max(24, 24 / displayScale), height: Math.max(24, 24 / displayScale), touchAction: "none" }}
                            onPointerDown={(e) => pointerDown(e, layer, `resize-${handle}`)}
                            onKeyDown={(e) => {
                              const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
                              if (!delta || readOnly) return;
                              e.preventDefault(); e.stopPropagation();
                              const step = e.shiftKey ? 10 : 1;
                              const geometry = resizeCreativeBounds(layer, handle, { x: delta[0]! * step, y: delta[1]! * step }, { keepRatio: e.shiftKey, fromCenter: e.altKey });
                              updateLayer(layer.id, { ...geometry, x: Math.max(-2000, Math.min(4000, geometry.x)), y: Math.max(-2000, Math.min(4000, geometry.y)) });
                            }}
                          ><span className="pointer-events-none h-3.5 w-3.5 rounded-sm border border-white bg-orange-600" /></button>
                        ))}
                        <div className="absolute left-1/2 -top-8 h-6 w-px -translate-x-1/2 bg-orange-500" />
                        <button
                          type="button"
                          aria-label="Rotate layer"
                          className="absolute left-1/2 -top-11 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-orange-600 cursor-grab"
                          onPointerDown={(e) => pointerDown(e, layer, "rotate")}
                        />
                      </>
                    ) : null}
                  </div>
                );
              })}
              {layers.length === 0 && !readOnly ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none select-none z-10"
                  style={{ color: page.backgroundColor === "#FFFFFF" || page.backgroundColor === "#F8F4EF" ? "#888" : "rgba(255,255,255,0.35)" }}
                >
                  <div className="rounded-xl border border-current/20 bg-current/5 px-5 py-4 text-center backdrop-blur-sm">
                    <p className="text-[14px] font-bold">Empty canvas</p>
                    <p className="mt-1 text-[11px] opacity-75">Use the Elements panel on the left to add text, shapes, or images</p>
                    <p className="mt-2 text-[9px] opacity-50">T&nbsp;·&nbsp;text &nbsp;·&nbsp; ■&nbsp;shape &nbsp;·&nbsp; ↑↑ upload photo</p>
                  </div>
                </div>
              ) : null}
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
        <aside className={`${mobilePanel==="inspector"?"block":"hidden"} absolute inset-x-3 bottom-16 top-3 z-30 overflow-y-auto rounded-2xl border border-white/10 bg-[#17181B] p-4 shadow-2xl lg:static lg:block lg:w-[288px] lg:shrink-0 lg:rounded-none lg:border-y-0 lg:border-r-0 lg:shadow-none space-y-3`}>
          <div className="sticky top-0 z-10 -mx-4 -mt-4 border-b border-white/10 bg-[#151619]/95 px-4 py-3 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[.18em]">Inspector{readOnly ? " · view only" : ""}</p><p className="mt-0.5 text-[9px] text-white/60">{selected ? `${selected.name} · ${selected.type}` : `${page.name} · ${page.width}×${page.height}`}</p>{selected ? <div className="mt-2 flex gap-1">{(["design","animate","position"] as const).map(t=><button key={t} type="button" onClick={()=>setInspectorTab(t)} className={`rounded-lg px-2.5 py-1 text-[9px] font-bold capitalize ${inspectorTab===t?"bg-orange-500 text-black":"bg-white/[.06] text-white/50 hover:bg-white/[.10]"}`}>{t}</button>)}</div> : null}</div>
          <fieldset disabled={readOnly} className="space-y-3 border-0 p-0 m-0 min-w-0 disabled:opacity-70">
          {selectedLayerIds.length > 1 ? (
            <p className="text-xs opacity-60">
              {selectedLayerIds.length} layers selected. Use Align / Group in the toolbar.
            </p>
          ) : null}
          {!selected ? (
            <div className="space-y-3">
              <GalaxyEmptyState appearance="dark" title="Nothing selected" detail="Select something on the canvas to edit it, or adjust the page itself below." />
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
                  className="mt-1 w-full h-10 rounded-lg border border-white/10 disabled:opacity-50"
                />
              </label>
              <p className="text-[10px] opacity-50">
                Artboard {page.width}×{page.height}px · {page.name}
              </p>
            </div>
          ) : (
            <div className="space-y-0 text-xs">
              {inspectorTab === "design" ? <>
              <GalaxyInspectorSection title="Layer" appearance="dark"><label className="block font-semibold">
                Name
                <input
                  value={selected.name}
                  onChange={(e) => updateLayer(selected.id, { name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                />
              </label></GalaxyInspectorSection>
              </> : null}
              {inspectorTab === "animate" ? <GalaxyInspectorSection title="Motion" appearance="dark">
                <label className="block font-semibold">
                  Entrance
                  <select
                    value={selected.animationPreset ?? "none"}
                    onChange={(e) => updateLayer(selected.id, { animationPreset: e.target.value as CanvasLayer["animationPreset"] })}
                    className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                  >
                    <option value="none">None</option>
                    <option value="fade">Fade</option>
                    <option value="fade_up">Fade up</option>
                    <option value="slide_left">Slide from left</option>
                    <option value="slide_right">Slide from right</option>
                    <option value="scale">Scale in</option>
                    <option value="pop">Pop</option>
                  </select>
                </label>
                {(selected.animationPreset ?? "none") !== "none" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block font-semibold">
                      Duration ms
                      <input
                        type="number"
                        min={100}
                        max={5000}
                        step={50}
                        value={selected.animationDurationMs ?? 600}
                        onChange={(e) => updateLayer(selected.id, { animationDurationMs: Math.max(100, Math.min(5000, Number(e.target.value) || 600)) })}
                        className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                      />
                    </label>
                    <label className="block font-semibold">
                      Delay ms
                      <input
                        type="number"
                        min={0}
                        max={10000}
                        step={50}
                        value={selected.animationDelayMs ?? 0}
                        onChange={(e) => updateLayer(selected.id, { animationDelayMs: Math.max(0, Math.min(10000, Number(e.target.value) || 0)) })}
                        className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                      />
                    </label>
                  </div>
                ) : null}
                <p className="text-[9px] leading-relaxed text-white/60">
                  Motion previews against the page timeline and follows the design into editable video.
                </p>
              </GalaxyInspectorSection> : null}
              {inspectorTab === "design" ? <>
              {selected.type === "text" ? (<GalaxyInspectorSection title="Typography" appearance="dark">
                  <label className="block font-semibold">
                    Text
                    <textarea
                      value={selected.text ?? ""}
                      onChange={(e) => updateLayer(selected.id, { text: e.target.value })}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                    />
                  </label>
                  <label className="block font-semibold">
                    Font
                    <select
                      value={selected.fontFamily ?? "system-ui"}
                      onChange={(e) => updateLayer(selected.id, { fontFamily: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                      {customFontFamilies.length > 0 ? (
                        <optgroup label="Your fonts">
                          {customFontFamilies.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
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
                        className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                      />
                    </label>
                    <label className="block font-semibold">
                      Color
                      <input
                        type="color"
                        value={selected.color ?? "#ffffff"}
                        onChange={(e) => updateLayer(selected.id, { color: e.target.value })}
                        className="mt-1 w-full h-9 rounded-lg border border-white/10"
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
                      className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </label>
                  <div className="flex gap-1 flex-wrap">
                    {([
                      { label: "B", value: "700", field: "fontWeight" as const, active: (selected.fontWeight === "700" || selected.fontWeight === "800" || selected.fontWeight === "900"), title: "Bold" },
                      { label: "I", value: "italic", field: "fontStyle" as const, active: selected.fontStyle === "italic", title: "Italic" },
                      { label: "U", value: "underline", field: "textDecoration" as const, active: selected.textDecoration === "underline", title: "Underline" },
                      { label: "S", value: "line-through", field: "textDecoration" as const, active: selected.textDecoration === "line-through", title: "Strikethrough" },
                    ]).map(({ label, value, field, active, title }) => (
                      <button
                        key={title}
                        type="button"
                        title={title}
                        onClick={() => {
                          if (field === "fontWeight") updateLayer(selected.id, { fontWeight: active ? "400" : value });
                          else if (field === "fontStyle") updateLayer(selected.id, { fontStyle: (active ? "normal" : "italic") as "normal" | "italic" });
                          else updateLayer(selected.id, { textDecoration: (active ? "none" : value) as "none" | "underline" | "line-through" });
                        }}
                        className={`w-8 h-8 rounded-lg border text-[11px] font-bold ${active ? "border-orange-400 bg-orange-400/20 text-orange-300" : "border-white/10 text-white/60"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block font-semibold">
                      Weight
                      <select
                        value={selected.fontWeight ?? "400"}
                        onChange={(e) => updateLayer(selected.id, { fontWeight: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
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
                        className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
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
                        className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
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
                        className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block font-semibold">
                      Decoration
                      <select
                        value={selected.textDecoration ?? "none"}
                        onChange={(e) => updateLayer(selected.id, { textDecoration: e.target.value as "none" | "underline" | "line-through" })}
                        className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
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
                        className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                      >
                        <option value="none">As typed</option>
                        <option value="uppercase">UPPERCASE</option>
                        <option value="lowercase">lowercase</option>
                      </select>
                    </label>
                  </div>
                </GalaxyInspectorSection>
              ) : null}
              {(selected.type === "rect" || selected.type === "ellipse") ? (
                <GalaxyInspectorSection title="Fill" appearance="dark">
                  <label className="block font-semibold">
                    Type
                    <select
                      value={selected.fillType ?? "solid"}
                      onChange={(e) => updateLayer(selected.id, { fillType: e.target.value as CanvasLayer["fillType"] })}
                      className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                    >
                      <option value="solid">Solid</option>
                      <option value="linear_gradient">Linear gradient</option>
                    </select>
                  </label>
                  {(selected.fillType ?? "solid") === "solid" ? (
                    <label className="block font-semibold">
                      Color
                      <input
                        type="color"
                        value={selected.fill ?? "#E05A2B"}
                        onChange={(e) => updateLayer(selected.id, { fill: e.target.value })}
                        className="mt-1 h-9 w-full rounded-lg border border-white/10"
                      />
                    </label>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block font-semibold">
                          From
                          <input
                            type="color"
                            value={selected.gradientFrom ?? selected.fill ?? "#FF6A00"}
                            onChange={(e) => updateLayer(selected.id, { gradientFrom: e.target.value })}
                            className="mt-1 h-9 w-full rounded-lg border border-white/10"
                          />
                        </label>
                        <label className="block font-semibold">
                          To
                          <input
                            type="color"
                            value={selected.gradientTo ?? "#FF1F1F"}
                            onChange={(e) => updateLayer(selected.id, { gradientTo: e.target.value })}
                            className="mt-1 h-9 w-full rounded-lg border border-white/10"
                          />
                        </label>
                      </div>
                      <label className="block font-semibold">
                        Angle · {Math.round(selected.gradientAngle ?? 135)}°
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          step={1}
                          value={selected.gradientAngle ?? 135}
                          onChange={(e) => updateLayer(selected.id, { gradientAngle: Number(e.target.value) })}
                          className="mt-1 w-full"
                        />
                      </label>
                      <div className="h-10 rounded-lg border border-white/10" style={{ background: studioLayerFillCss(selected) }} />
                    </>
                  )}
                </GalaxyInspectorSection>
              ) : null}
              {selected.type==="frame"?<div className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Frame media</p><p className="text-[10px] opacity-55">{selected.frameMediaUrl?"Drop another image/video to replace it.":"Select this frame, then drag media from the library onto the canvas."}</p>{selected.frameMediaUrl?<><label className="block font-semibold">Horizontal focus<input type="range" min="0" max="100" value={Math.round((selected.frameFocalX??.5)*100)} onChange={e=>updateLayer(selected.id,{frameFocalX:Number(e.target.value)/100})} className="w-full"/></label><label className="block font-semibold">Vertical focus<input type="range" min="0" max="100" value={Math.round((selected.frameFocalY??.5)*100)} onChange={e=>updateLayer(selected.id,{frameFocalY:Number(e.target.value)/100})} className="w-full"/></label><button type="button" onClick={()=>updateLayer(selected.id,{frameMediaUrl:null,frameMediaKind:null,sourceAssetId:null})} className="text-[11px] underline">Remove frame media</button></>:null}</div>:null}
              {brandSpace?<GalaxyInspectorSection title="Brand Space" appearance="dark"><div className="space-y-2"><div className="flex flex-wrap gap-1">{Object.entries(brandSpace.colors).map(([role,value])=><button key={role} type="button" title={role} onClick={()=>updateLayer(selected.id,selected.type==="text"?{color:value}:selected.type==="line"?{stroke:value,fill:value}:{fill:value})} className="h-6 w-6 rounded border border-white/10" style={{background:value}}/>)}</div>{selected.type==="text"?<div className="flex flex-wrap gap-1">{Object.entries(brandSpace.typography).map(([role,font])=><button key={role} type="button" onClick={()=>updateLayer(selected.id,{fontFamily:font})} className="rounded border border-white/10 px-2 py-1 text-[8px]">{role}</button>)}</div>:null}</div></GalaxyInspectorSection>:null}
              {selected.type === "image" ? (
                <div className="space-y-2">
                  {selected.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(selected.imageUrl)}
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
                      className="rounded-lg border border-white/10 px-2 py-1 text-[11px] font-semibold"
                      onClick={() => updateLayer(selected.id, { flipX: !selected.flipX })}
                    >
                      Flip H
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white/10 px-2 py-1 text-[11px] font-semibold"
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
                      className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
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
                      src={resolveMediaUrl(selected.videoUrl)}
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
                      className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
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
                      className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                    />
                  </label>
                </div>
              ) : null}
              {(["rect","ellipse","line","frame","icon"].includes(selected.type))?<div className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Element style</p>{selected.type!=="icon"?<><label className="block font-semibold">Stroke<input type="color" value={selected.stroke??"#111111"} onChange={e=>updateLayer(selected.id,{stroke:e.target.value})} className="mt-1 h-8 w-full"/></label><label className="block font-semibold">Stroke width<input type="range" min="0" max="40" value={selected.strokeWidth??0} onChange={e=>updateLayer(selected.id,{strokeWidth:Number(e.target.value)})} className="w-full"/></label></>:null}{selected.type==="rect"||selected.type==="frame"?<label className="block font-semibold">Corners<input type="range" min="0" max="200" value={selected.cornerRadius??0} onChange={e=>updateLayer(selected.id,{cornerRadius:Number(e.target.value)})} className="w-full"/></label>:null}{selected.type==="line"?<><label className="block font-semibold">Line weight<input type="range" min="2" max="40" value={selected.height} onChange={e=>updateLayer(selected.id,{height:Number(e.target.value)})} className="w-full"/></label><button type="button" onClick={()=>updateLayer(selected.id,{text:selected.text==="→"?"":"→"})} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold">{selected.text==="→"?"Remove arrow":"Add arrow"}</button></>:null}</div>:null}
              </> : null}
              {inspectorTab === "position" ? <>
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Effect preset</p>
                <div className="flex gap-1 flex-wrap">
                  {([
                    { label: "None", active: !(selected.shadowBlur ?? 0) && !selected.outlineWidth && !selected.glowBlur },
                    { label: "Shadow", active: Boolean(selected.shadowBlur ?? 0) },
                    { label: "Outline", active: Boolean(selected.outlineWidth ?? 0) },
                    { label: "Glow", active: Boolean(selected.glowBlur ?? 0) },
                  ]).map(({ label, active }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (label === "None") updateLayer(selected.id, { shadowBlur: 0, shadowX: 0, shadowY: 0, outlineWidth: 0, glowBlur: 0 });
                        else if (label === "Shadow") updateLayer(selected.id, { shadowBlur: (selected.shadowBlur ?? 0) > 0 ? 0 : 12, shadowX: 2, shadowY: 4, shadowColor: "#00000066" });
                        else if (label === "Outline") updateLayer(selected.id, { outlineWidth: (selected.outlineWidth ?? 0) > 0 ? 0 : 2, strokeWidth: 2, stroke: selected.color ?? "#ffffff" });
                        else if (label === "Glow") updateLayer(selected.id, { glowBlur: (selected.glowBlur ?? 0) > 0 ? 0 : 16, shadowBlur: (selected.glowBlur ?? 0) > 0 ? 0 : 16, shadowX: 0, shadowY: 0, shadowColor: `${selected.color ?? "#FF5500"}88` });
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[9px] font-bold border ${active ? "border-orange-400 bg-orange-400/15 text-orange-300" : "border-white/10 text-white/50"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
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
                      className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                    />
                  </label>
                ))}
              </div>
              <p className="pt-1 text-[10px] font-bold uppercase tracking-wider opacity-50">Effects</p>
              <label className="block font-semibold">
                Blend
                <select
                  value={selected.blendMode ?? "normal"}
                  onChange={(e) => updateLayer(selected.id, { blendMode: e.target.value as CanvasLayer["blendMode"] })}
                  className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                >
                  {STUDIO_BLEND_MODES.map((mode) => <option key={mode} value={mode}>{mode === "normal" ? "Normal" : mode.replace("-", " ")}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block font-semibold">
                  Corner
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={selected.cornerRadius ?? 0}
                    onChange={(e) => updateLayer(selected.id, { cornerRadius: Math.max(0, Number(e.target.value)) })}
                    className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
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
                    className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
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
                    className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
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
                    className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
                  />
                </label>
              </div>
              <label className="block font-semibold">
                Shadow color
                <input
                  type="color"
                  value={(selected.shadowColor ?? "#000000").slice(0, 7)}
                  onChange={(e) => updateLayer(selected.id, { shadowColor: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-white/10"
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
                    className="mt-1 w-full rounded-lg border border-white/10 px-2 py-1.5"
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
              </> : null}
            </div>
          )}
          </fieldset>
        </aside>
      </div>

      <div role="group" aria-label="Workspace panels" className="relative z-40 flex shrink-0 justify-center gap-1 border-t border-white/10 bg-[#151619] p-1.5 lg:hidden"><button type="button" onClick={()=>setMobilePanel(mobilePanel==="library"?null:"library")} className="rounded-xl px-3 py-2 text-[10px] font-black" aria-pressed={mobilePanel==="library"}>Create</button><button type="button" onClick={()=>setMobilePanel(mobilePanel==="inspector"?null:"inspector")} className="rounded-xl bg-black px-3 py-2 text-[10px] font-black text-white" aria-pressed={mobilePanel==="inspector"}>Inspector</button></div>
      {/* Bottom page strip */}
      <div className="shrink-0 border-t border-white/10 bg-[#101113] px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex flex-wrap items-center gap-2">
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
                : "border-white/10 hover:bg-white/[.06]"
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
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-white/10 disabled:opacity-30"
        >
          Add page
        </button>
        <button
          type="button"
          onClick={duplicatePage}
          disabled={readOnly || doc.pages.length >= 20}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-white/10 disabled:opacity-30"
        >
          Duplicate page
        </button>
        <button
          type="button"
          onClick={() => removePage(activePageId)}
          disabled={readOnly || doc.pages.length <= 1}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold border border-white/10 disabled:opacity-30" style={{ color: "#8B1E1E" }}
        >
          Delete page
        </button>
      </div>
    </div>
  );
}

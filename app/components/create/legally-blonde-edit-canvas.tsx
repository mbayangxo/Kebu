"use client";
import { CollageVideoLayer } from "./collage-video-layer";
import { collageVideosSchema } from "@/lib/create/collage-video";

/**
 * Shopify-style May Lecor / Legally Blonde canvas.
 * - Click background → OS file picker (no form box)
 * - Click name circle → type ON the circle
 * - Click a photo (without dragging) → replace via file picker
 * - No orange inspector panels sitting under the site
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { resizeCollageSource, type CollageCorner } from "@/lib/create/collage-frame-geometry";
import { Z_LAYERS } from "./kebu-z-layers";
import {
  CircularBrandRing,
  layerMotionClass,
  type LayerMotion,
} from "@/app/components/create/circular-brand-ring";
import { LEGALLY_BLONDE_ASSETS, localizeLegallyBlondeAssetUrl } from "@/lib/create/legally-blonde-defaults";
import {
  MAYLECOR_FIGURE_ASSETS,
  MAYLECOR_LOCAL_ASSETS,
} from "@/lib/create/maylecor-defaults";
import { ResponsiveSocialRail } from "./responsive-social-rail";
import { EditableSocialRail, socialRailStyleFromProps } from "./editable-social-rail";
import { uploadProjectAsset } from "@/lib/create/upload-project-asset";
import { MaylecorMotionChrome } from "@/app/components/create/maylecor-motion-chrome";
import { sanitizeMaylecorNavLinks } from "@/lib/create/maylecor-nav";
import { cutoutScrollTransform, MAYLECOR_DEFAULT_LAYER_MOTIONS } from "@/lib/create/maylecor-cutout-motion";
import {
  cutoutHrefToPageSlug,
  normalizeCutoutHref,
  resolveCutoutHref,
} from "@/lib/create/cutout-links";
import { parseNavLayout, type NavSizePreset } from "@/lib/create/nav-chrome-size";
import { SiteThemeFonts } from "@/app/components/create/site-theme-fonts";
import { cssFontStack } from "@/lib/create/site-theme-fonts";
import type { BuilderElementKind, BuilderElementSelection } from "@/lib/create/builder-selection";
import "./artist-motion.css";
import "./legally-blonde-tilda.css";

export type EditableCutoutSlot = {
  key: string;
  label: string;
  src: string;
  topPct: number;
  leftPct: number;
  widthPct: number;
  rotate?: number;
};

const DEFAULT_SLOTS: Omit<EditableCutoutSlot, "src">[] = [
  { key: "cutoutLeft", label: "Left cutout", topPct: 20, leftPct: 4, widthPct: 28, rotate: -4 },
  { key: "cutoutAccent", label: "Center cutout", topPct: 14, leftPct: 30, widthPct: 40, rotate: 0 },
  { key: "cutoutRight", label: "Right cutout", topPct: 22, leftPct: 68, widthPct: 26, rotate: 5 },
  { key: "cutoutSparkle", label: "Sparkle", topPct: 12, leftPct: 42, widthPct: 14, rotate: 0 },
  { key: "heroPhoto", label: "Story photo", topPct: 62, leftPct: 35, widthPct: 25, rotate: 0 },
  { key: "macbook", label: "Album mockup", topPct: 62, leftPct: 65, widthPct: 25, rotate: 0 },
  { key: "titleLogo", label: "Name circle", topPct: 36, leftPct: 30, widthPct: 38, rotate: 0 },
];

/** May Lecor hero — never fall back to Russian / Elle stock cutouts or Cyrillic logo. */
function looksLikeMaylecorHero(props: Record<string, unknown>): boolean {
  const blob = [
    props.chromeLogo,
    props.titleLogo,
    props.cutoutLeft,
    props.cutoutAccent,
    props.seedRevision,
    props.brandLabel,
    props.title,
  ]
    .map((v) => String(v ?? ""))
    .join(" ")
    .toLowerCase();
  return (
    blob.includes("maylecor") ||
    blob.includes("may lecor") ||
    blob.includes("may lècor") ||
    blob.includes("logo-circle-seal") ||
    blob.includes("may-figure") ||
    blob.includes("may-cutout") ||
    Boolean(props.seedRevision)
  );
}

function slotFallbackSrc(key: string, props: Record<string, unknown>): string {
  if (looksLikeMaylecorHero(props)) {
    if (key === "titleLogo") return MAYLECOR_LOCAL_ASSETS.logoCircleSeal;
    if (key === "cutoutLeft") return MAYLECOR_FIGURE_ASSETS.cutoutLeft;
    if (key === "cutoutRight") return MAYLECOR_FIGURE_ASSETS.cutoutRight;
    if (key === "cutoutAccent") return MAYLECOR_FIGURE_ASSETS.cutoutAccent;
    if (key === "heroPhoto") return MAYLECOR_FIGURE_ASSETS.heroPhoto;
    // Russian glitter / MacBook — blank unless the founder uploaded something.
    if (key === "cutoutSparkle" || key === "macbook" || key === "sparkleGif") return "";
  }
  const fallback = LEGALLY_BLONDE_ASSETS[key as keyof typeof LEGALLY_BLONDE_ASSETS];
  return typeof fallback === "string" ? fallback : "";
}

type LayerPos = { leftPct: number; topPct: number };
type ExtraCut = {
  id: string;
  src: string;
  alt?: string;
  href?: string;
  topPct: number;
  leftPct: number;
  widthPct: number;
  rotate?: number;
  zIndex?: number;
  parallaxRole?: "city" | "figure" | "none";
};

type UploadTarget =
  | { kind: "background" }
  | { kind: "slot"; key: string }
  | { kind: "extra"; id: string };

export function LegallyBlondeEditCanvas({
  props,
  responsiveSocialProps,
  editable = true,
  projectId,
  siteBase = "",
  currentSlug = "home",
  fillCanvas = true,
  onPatch,
  selectedElement,
  onSelectSection,
  onSelectElement,
  onNavigatePage,
}: {
  props: Record<string, unknown>;
  responsiveSocialProps?: Record<string, unknown>;
  editable?: boolean;
  projectId?: string;
  siteBase?: string;
  currentSlug?: string;
  fillCanvas?: boolean;
  onPatch: (patch: Record<string, unknown>) => void;
  selectedElement?: BuilderElementSelection | null;
  onSelectSection?: () => void;
  onSelectElement?: (element: Omit<BuilderElementSelection, "sectionId">) => void;
  onNavigatePage?: (slug: string) => void;
}) {
  const hiddenLayers = Array.isArray(props.hiddenLayers)
    ? (props.hiddenLayers as string[])
    : [];
  const bgHidden =
    props.backgroundHidden === true || hiddenLayers.includes("backgroundLayer");
  const bgRaw = localizeLegallyBlondeAssetUrl(String(props.backgroundLayer ?? "")) ?? "";
  const bg = bgHidden ? "" : bgRaw;
  const moves = (props.layerMoves as Record<string, { dx?: number; dy?: number }>) ?? {};
  const positions = (props.layerPositions as Record<string, LayerPos>) ?? {};
  const scales = (props.layerScales as Record<string, number>) ?? {};
  const widthScales = (props.layerWidthScale as Record<string, number>) ?? {};
  const heightScales = (props.layerHeightScale as Record<string, number>) ?? {};
  const crops = (props.layerCrop as Record<string, number>) ?? {};
  const motions = (props.layerMotions as Record<string, LayerMotion>) ?? {};
  const layerLinks = (props.layerLinks as Record<string, string>) ?? {};
  const layerZ = (props.layerZIndex as Record<string, number>) ?? {};
  const layerOpacity = (props.layerOpacity as Record<string, number>) ?? {};
  const layerRotation = (props.layerRotation as Record<string, number>) ?? {};
  const lockedLayers = Array.isArray(props.lockedLayers) ? (props.lockedLayers as string[]) : [];

  function toggleLayerLocked(key: string) {
    onPatch({
      lockedLayers: lockedLayers.includes(key)
        ? lockedLayers.filter((item) => item !== key)
        : [...new Set([...lockedLayers, key])],
    });
  }

  function hideLayer(key: string) {
    onPatch({
      hiddenLayers: [...new Set([...hiddenLayers, key])],
      ...(key === "backgroundLayer" ? { backgroundHidden: true } : {}),
    });
    setSelectedKey(null);
    setSelectedExtraId(null);
    setEditingTitle(false);
  }

  function stepLayer(key: string, delta: -1 | 1) {
    const current = typeof layerZ[key] === "number" ? layerZ[key]! : 10;
    const next = Math.min(80, Math.max(1, current + delta));
    const extras = extraCutouts.map((cut) =>
      cut.id === key ? { ...cut, zIndex: next } : cut,
    );
    onPatch({
      layerZIndex: { ...layerZ, [key]: next },
      ...(extras.some((cut) => cut.id === key) ? { extraCutouts: extras } : {}),
    });
  }

  function duplicateLayer(key: string, source: EditableCutoutSlot | ExtraCut) {
    const nextId = `dup-${Date.now()}`;
    const position = positions[key] ?? {
      leftPct: source.leftPct,
      topPct: source.topPct,
    };
    const currentScale = scales[key] ?? 1;
    const duplicate: ExtraCut = {
      id: nextId,
      src: source.src,
      alt: `${"label" in source ? source.label : source.alt || "Cutout"} copy`,
      href: "href" in source ? source.href : layerLinks[key] ?? "",
      leftPct: Math.min(90, position.leftPct + 3),
      topPct: Math.min(90, position.topPct + 3),
      widthPct: Math.max(4, source.widthPct * currentScale),
      rotate: source.rotate ?? 0,
      zIndex: Math.min(80, (typeof layerZ[key] === "number" ? layerZ[key]! : 10) + 1),
    };
    onPatch({
      extraCutouts: [...extraCutouts, duplicate],
      ...(props.layerScroll && (props.layerScroll as Record<string, { x: number; y: number }>)[key] ? { layerScroll: { ...(props.layerScroll as Record<string, { x: number; y: number }>), [nextId]: (props.layerScroll as Record<string, { x: number; y: number }>)[key] } } : {}),
      layerScales: { ...scales, [nextId]: 1 },
      layerZIndex: { ...layerZ, [nextId]: duplicate.zIndex ?? 11 },
      layerPositions: {
        ...positions,
        [nextId]: { leftPct: duplicate.leftPct, topPct: duplicate.topPct },
      },
    });
    setSelectedExtraId(nextId);
    setSelectedKey(null);
    setEditingTitle(false);
    selectElement(`extra:${nextId}`, "cutout", duplicate.alt || "Cutout copy");
  }

  function bumpLayer(key: string, dir: "front" | "back") {
    // Collect z-indexes of ALL other layers so we can truly move to front/back
    const allSlotKeys = DEFAULT_SLOTS.map((s) => s.key);
    const allExtraIds = Array.isArray(props.extraCutouts)
      ? (props.extraCutouts as { id?: string }[]).map((c) => c.id ?? "")
      : [];
    const otherKeys = [...allSlotKeys, ...allExtraIds].filter((k) => k && k !== key);
    const othersZ = otherKeys.map((k) => (typeof layerZ[k] === "number" ? layerZ[k]! : 10));
    const maxOther = othersZ.length > 0 ? Math.max(...othersZ) : 10;
    const minOther = othersZ.length > 0 ? Math.min(...othersZ) : 10;
    // Bring to Front = above everyone; Send to Back = below everyone
    const next = dir === "front" ? Math.min(79, maxOther + 10) : Math.max(1, minOther - 1);
    const nextMap = { ...layerZ, [key]: next };
    const extras = Array.isArray(props.extraCutouts)
      ? (props.extraCutouts as { id?: string; zIndex?: number }[]).map((c) =>
          c.id === key ? { ...c, zIndex: next } : c,
        )
      : props.extraCutouts;
    onPatch({
      layerZIndex: nextMap,
      ...(Array.isArray(extras) ? { extraCutouts: extras } : {}),
    });
  }
  const titleAsText = props.titleAsText === true;
  const title = String(props.title ?? "MAY LECOR");
  const accent = String(props.accentColor ?? "#E9006B");
  const titleTypography = {
    fontFamily: String(props.titleTextFontFamily ?? "Impact"),
    fontSize: Math.min(48, Math.max(8, Number(props.titleTextFontSize ?? 14))),
    fontWeight: Math.min(900, Math.max(400, Number(props.titleTextFontWeight ?? 900))),
    letterSpacing: Math.min(0.5, Math.max(-0.05, Number(props.titleTextLetterSpacing ?? 0.12))),
    lineHeight: Math.min(2, Math.max(0.8, Number(props.titleTextLineHeight ?? 1.15))),
    color: String(props.titleTextColor ?? "#ffffff"),
  };
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const motionEnabled = props.motionEnabled !== false && !reducedMotion;
  const parallax = motionEnabled && props.scrollMode !== "viewport";
  const sectionMinHeightPx = Math.min(
    1800,
    Math.max(360, Number(props.sectionMinHeightPx ?? 720)),
  );
  const extraCutouts = Array.isArray(props.extraCutouts)
    ? (props.extraCutouts as ExtraCut[])
    : [];

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedExtraId, setSelectedExtraId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [snapGuide, setSnapGuide] = useState({ x: false, y: false });

  useEffect(() => {
    // This canvas only mirrors element selections that belong to it. Section/control selections are
    // owned by the parent Builder and must not erase the active child while pointer gestures are
    // still settling; that was the source of the "cutout jumps back to hero" behavior.
    if (!selectedElement) return;
    if (selectedElement.kind === "control" || selectedElement.elementId === "heroCanvas") return;
    if (selectedElement.kind === "cutout" && selectedElement.elementId.startsWith("extra:")) {
      setSelectedExtraId(selectedElement.elementId.slice("extra:".length));
      setSelectedKey(null);
      setEditingTitle(false);
      return;
    }
    const knownSlot = DEFAULT_SLOTS.some((slot) => slot.key === selectedElement.elementId);
    if (!knownSlot && selectedElement.kind !== "background") return;
    setSelectedKey(selectedElement.elementId);
    setSelectedExtraId(null);
    if (selectedElement.elementId !== "titleLogo") setEditingTitle(false);
  }, [selectedElement]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<UploadTarget | null>(null);
  const titleFieldRef = useRef<HTMLInputElement>(null);

  const slots: EditableCutoutSlot[] = DEFAULT_SLOTS.map((slot) => {
    if (hiddenLayers.includes(slot.key)) return { ...slot, src: "" };
    if (slot.key === "titleLogo" && titleAsText) {
      return { ...slot, src: "__title_text__" };
    }
    const raw = localizeLegallyBlondeAssetUrl(String(props[slot.key] ?? "")) ?? "";
    // Never paint Russian Elle cutouts / Cyrillic seal on a May Lecor hero.
    const russianStock =
      raw.includes("/templates/legally-blonde/") ||
      raw.includes("tildacdn.com") ||
      raw.includes("Group_557");
    const useMay = looksLikeMaylecorHero(props);
    const src = Object.prototype.hasOwnProperty.call(props, slot.key) && !raw
      ? ""
      : raw && !(useMay && russianStock) ? raw : slotFallbackSrc(slot.key, props);
    return {
      ...slot,
      src,
    };
  }).filter((s) => Boolean(s.src));

  function resolveSlotPos(slot: Omit<EditableCutoutSlot, "src">): LayerPos {
    if (positions[slot.key]) return positions[slot.key]!;
    const move = moves[slot.key];
    return {
      leftPct: slot.leftPct + (move?.dx ?? 0) / 12,
      topPct: slot.topPct + (move?.dy ?? 0) / 7,
    };
  }

  function saveLayerLink(key: string, href: string) {
    const next = normalizeCutoutHref(href);
    if (!next) {
      const { [key]: _removed, ...rest } = layerLinks;
      onPatch({ layerLinks: rest });
      return;
    }
    onPatch({ layerLinks: { ...layerLinks, [key]: next } });
  }

  function openCutoutLink(href: string) {
    const h = normalizeCutoutHref(href);
    if (!h) return;
    const pageSlug = cutoutHrefToPageSlug(h);
    if (pageSlug && onNavigatePage) {
      onNavigatePage(pageSlug);
      return;
    }
    const resolved = resolveCutoutHref(h, siteBase);
    if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
      window.open(resolved, "_blank", "noopener,noreferrer");
      return;
    }
    if (resolved.startsWith("/")) {
      window.location.assign(resolved);
    }
  }

  function saveSlotPos(key: string, leftPct: number, topPct: number) {
    onPatch({
      layerPositions: {
        ...positions,
        [key]: { leftPct, topPct },
      },
    });
  }

  function openUpload(target: UploadTarget) {
    if (!projectId) {
      setToast("Save the project first, then upload.");
      return;
    }
    uploadTarget.current = target;
    fileRef.current?.click();
  }

  async function onFilePicked(file: File) {
    if (!projectId || !uploadTarget.current) return;
    const target = uploadTarget.current;
    uploadTarget.current = null;
    setBusy(true);
    setToast("Uploading…");
    const result = await uploadProjectAsset(projectId, file, "section");
    setBusy(false);
    if (!result.ok) {
      setToast(result.error);
      return;
    }
    if (target.kind === "background") {
      onPatch({
        backgroundLayer: result.url,
        backgroundHidden: false,
        hiddenLayers: hiddenLayers.filter((k) => k !== "backgroundLayer"),
      });
    } else if (target.kind === "slot") {
      onPatch({
        [target.key]: result.url,
        hiddenLayers: hiddenLayers.filter((k) => k !== target.key),
        ...(target.key === "titleLogo" ? { titleAsText: false } : {}),
      });
      setEditingTitle(false);
    } else {
      onPatch({
        extraCutouts: extraCutouts.map((c) =>
          c.id === target.id ? { ...c, src: result.url } : c,
        ),
      });
    }
    setToast(null);
  }

  useEffect(() => {
    if (!parallax) return;
    const scene = scrollerRef.current;
    if (!scene) return;
    // The Builder must have one natural document scroller. Derive parallax progress from the
    // scene's position in that viewport instead of creating a nested overflow-y canvas.
    const scrollParent = (() => {
      let node: HTMLElement | null = scene.parentElement;
      while (node && node !== document.body && node !== document.documentElement) {
        const overflowY = window.getComputedStyle(node).overflowY;
        if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight + 1) return node;
        node = node.parentElement;
      }
      return null;
    })();
    const onScroll = () => {
      const rect = scene.getBoundingClientRect();
      const viewportHeight = scrollParent?.clientHeight ?? window.innerHeight;
      const viewportTop = scrollParent?.getBoundingClientRect().top ?? 0;
      const pinnedHeight = scene.firstElementChild?.getBoundingClientRect().height ?? sectionMinHeightPx;
      const travel = Math.max(1, rect.height - Math.min(pinnedHeight, viewportHeight));
      setScrollProgress(Math.min(1, Math.max(0, (viewportTop - rect.top) / travel)));
    };
    onScroll();
    const target: EventTarget = scrollParent ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [parallax, sectionMinHeightPx]);

  useEffect(() => {
    if (!toast || toast === "Uploading…") return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (editingTitle) {
      window.setTimeout(() => titleFieldRef.current?.focus(), 20);
    }
  }, [editingTitle]);

  function selectElement(elementId: string, kind: BuilderElementKind, label: string, inspect = true) {
    if (editable) onSelectElement?.({ elementId, kind, label, inspect });
  }

  function defaultMotion(key: string): LayerMotion {
    const preset = MAYLECOR_DEFAULT_LAYER_MOTIONS[key as keyof typeof MAYLECOR_DEFAULT_LAYER_MOTIONS];
    if (preset) return preset;
    return key === "titleLogo" ? "spin" : "none";
  }

  const artboard = (
      <div
        className="relative isolate w-full flex-1 overflow-hidden"
        style={{
          minHeight: parallax ? `max(${sectionMinHeightPx}px, 100dvh)` : sectionMinHeightPx,
          backgroundColor: String(props.accentColor ?? "#E9006B"),
          backgroundImage: bg ? `url(${bg})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          touchAction: editable ? "none" : "pan-y",
          cursor: busy ? "wait" : "default",
        }}
        onClick={(e) => {
          if (!editable || e.target !== e.currentTarget) return;
          setSelectedKey(null);
          setSelectedExtraId(null);
          setEditingTitle(false);
          selectElement("backgroundLayer", "background", "Background");
        }}
        onDoubleClick={(e) => {
          if (!editable || e.target !== e.currentTarget) return;
          openUpload({ kind: "background" });
        }}
      >
        {props.showNavigation !== false ? <MaylecorMotionChrome
          siteBase={siteBase}
          brandLabel={String(props.brandLabel ?? props.title ?? "MAY LECOR")}
          titleLogo={
            props.showChromeLogo === false
              ? undefined
              : String(props.chromeLogo ?? "").trim() ||
                "/templates/maylecor/logo-stacked.png"
          }
          showChromeLogo={props.showChromeLogo !== false}
          currentSlug={currentSlug}
          accentColor={accent}
          contained
          overlayOnSite
          navLinks={sanitizeMaylecorNavLinks(
            Array.isArray(props.navLinks)
              ? (props.navLinks as {
                  label?: string;
                  href?: string;
                  iconUrl?: string;
                  showLabel?: boolean;
                }[])
              : undefined,
          )}
          navDisplay={
            props.navDisplay === "icons" || props.navDisplay === "photos"
              ? props.navDisplay
              : "text"
          }
          socialLinks={
            Array.isArray(props.socialLinks)
              ? (props.socialLinks as { label: string; iconUrl: string; href: string }[])
              : undefined
          }
          navScale={typeof props.navScale === "number" ? props.navScale : 1}
          navSize={(props.navSize as NavSizePreset | undefined) ?? "comfortable"}
          navLayout={parseNavLayout(props.navLayout)}
          chromeLogoScale={typeof props.chromeLogoScale === "number" ? props.chromeLogoScale : 1}
          headerHeightScale={typeof props.headerHeightScale === "number" ? props.headerHeightScale : 1}
          headerBgColor={typeof props.headerBgColor === "string" ? props.headerBgColor : undefined}
          navFontFamily={typeof props.navFontFamily === "string" ? props.navFontFamily : undefined}
          navFontSizePx={typeof props.navFontSizePx === "number" ? props.navFontSizePx : undefined}
          navFontWeight={typeof props.navFontWeight === "number" ? props.navFontWeight : undefined}
          onNavigate={onNavigatePage}
        /> : null}

        {(collageVideosSchema.safeParse(props.sceneVideos ?? []).data ?? []).map(layer => <CollageVideoLayer key={`${layer.id}:${layer.src}`} layer={layer} progress={parallax ? scrollProgress : 0} motionEnabled={motionEnabled} editing={editable} siteBase={siteBase} onNavigatePage={onNavigatePage} />)}
        {!editable && responsiveSocialProps ? <ResponsiveSocialRail props={responsiveSocialProps} siteBase={siteBase} /> : <EditableSocialRail
          links={Array.isArray(props.socialLinks) ? props.socialLinks as {label: string; href: string; iconUrl: string}[] : []}
          style={socialRailStyleFromProps(props)}
          editing={editable}
          onSelect={(inspect = true) => selectElement("socialRail", "control", "Social links", inspect)}
          onPatch={editable ? onPatch : undefined}
          siteBase={siteBase}
        />}
        {slots.map((slot) => {
          const pos = resolveSlotPos(slot);
          const scale = scales[slot.key] ?? (slot.key === "titleLogo" ? 0.75 : 1);
          const isTitle = slot.key === "titleLogo" && titleAsText;
          return (
            <CutoutChip
              editable={editable}
              key={slot.key}
              slot={{ ...slot, widthPct: Math.max(4, slot.widthPct * scale) }}
              titleText={isTitle ? title || "MAY LECOR" : null}
              titleEditing={editable && isTitle && editingTitle}
              titleInputRef={titleFieldRef}
              accentColor={accent}
              titleTypography={titleTypography}
              selected={editable && selectedKey === slot.key}
              leftPct={pos.leftPct}
              topPct={pos.topPct}
              motion={motionEnabled ? motions[slot.key] ?? defaultMotion(slot.key) : "none"}
              href={layerLinks[slot.key] ?? ""}
              scrollTravel={(props.layerScroll as Record<string, { x: number; y: number }> | undefined)?.[slot.key]}
              scrollProgress={parallax ? scrollProgress : 0}
              pauseMotion={editable && Boolean(selectedKey || selectedExtraId || editingTitle)}
              siteBase={siteBase}
              onNavigatePage={onNavigatePage}
              onLinkChange={(href) => saveLayerLink(slot.key, href)}
              onOpenLink={() => openCutoutLink(layerLinks[slot.key] ?? "")}
              zIndex={typeof layerZ[slot.key] === "number" ? layerZ[slot.key]! : 10}
              opacity={typeof layerOpacity[slot.key] === "number" ? layerOpacity[slot.key]! : 1}
              rotation={typeof layerRotation[slot.key] === "number" ? layerRotation[slot.key]! : slot.rotate ?? 0}
              locked={lockedLayers.includes(slot.key)}
              onBringFront={() => bumpLayer(slot.key, "front")}
              onBringForward={() => stepLayer(slot.key, 1)}
              onSendBackward={() => stepLayer(slot.key, -1)}
              onSendBack={() => bumpLayer(slot.key, "back")}
              onDuplicate={() => duplicateLayer(slot.key, slot)}
              onToggleLock={() => toggleLayerLocked(slot.key)}
              onHide={() => hideLayer(slot.key)}
              onSelect={(inspect = true) => {
                setSelectedKey(slot.key);
                setSelectedExtraId(null);
                selectElement(
                  slot.key,
                  slot.key === "titleLogo" && titleAsText ? "text" : "image",
                  slot.label,
                  inspect,
                );
              }}
              onStartTitleEdit={() => {
                setSelectedKey(slot.key);
                setEditingTitle(true);
                onPatch({ titleAsText: true });
                selectElement(slot.key, "text", slot.label);
              }}
              onEndTitleEdit={() => setEditingTitle(false)}
              onTitleChange={(v) => onPatch({ title: v, brandLabel: v, titleAsText: true })}
              onReplaceImage={() => {
                if (isTitle) {
                  setEditingTitle(true);
                  return;
                }
                openUpload({ kind: "slot", key: slot.key });
              }}
              onDelete={() => {
                onPatch({
                  hiddenLayers: [...new Set([...hiddenLayers, slot.key])],
                  ...(slot.key === "titleLogo" ? {} : { [slot.key]: "" }),
                });
                setSelectedKey(null);
                setEditingTitle(false);
              }}
              onMoved={(leftPct, topPct) => saveSlotPos(slot.key, leftPct, topPct)}
              onResized={(nextScale, leftPct, topPct) => onPatch({
                layerScales: { ...scales, [slot.key]: Number(nextScale.toFixed(6)) },
                layerPositions: { ...positions, [slot.key]: { leftPct, topPct } },
              })}
              baseWidthPct={slot.widthPct}
              scale={scale}
              widthScale={widthScales[slot.key] ?? 1}
              heightScale={heightScales[slot.key] ?? 1}
              crop={crops[slot.key] ?? 0}
              onSnapGuide={setSnapGuide}
            />
          );
        })}

        {extraCutouts
          .filter((c) => c.src && !hiddenLayers.includes(c.id))
          .map((cut) => {
            const scale = scales[cut.id] ?? 1;
            const pos = positions[cut.id] ?? { leftPct: cut.leftPct, topPct: cut.topPct };
            return (
              <CutoutChip
                editable={editable}
                key={cut.id}
                slot={{
                  key: cut.id,
                  label: cut.alt || "Cutout",
                  src: cut.src,
                  topPct: cut.topPct,
                  leftPct: cut.leftPct,
                  widthPct: Math.max(4, cut.widthPct * scale),
                  rotate: cut.rotate,
                }}
                titleText={null}
                titleEditing={false}
                accentColor={accent}
                selected={editable && selectedExtraId === cut.id}
                leftPct={pos.leftPct}
                topPct={pos.topPct}
                motion={motionEnabled ? motions[cut.id] ?? "none" : "none"}
                href={cut.href ?? ""}
                scrollTravel={(props.layerScroll as Record<string, { x: number; y: number }> | undefined)?.[cut.id]}
                scrollKey={cut.parallaxRole === "city" ? "macbook" : cut.parallaxRole === "figure" ? "cutoutAccent" : cut.id}
                scrollProgress={parallax ? scrollProgress : 0}
                pauseMotion={editable && Boolean(selectedKey || selectedExtraId || editingTitle)}
                siteBase={siteBase}
                onNavigatePage={onNavigatePage}
                onLinkChange={(href) => {
                  onPatch({
                    extraCutouts: extraCutouts.map((c) =>
                      c.id === cut.id ? { ...c, href: normalizeCutoutHref(href) } : c,
                    ),
                  });
                }}
                onOpenLink={() => openCutoutLink(cut.href ?? "")}
                zIndex={typeof layerZ[cut.id] === "number" ? layerZ[cut.id]! : 10}
                opacity={typeof layerOpacity[cut.id] === "number" ? layerOpacity[cut.id]! : 1}
                rotation={typeof layerRotation[cut.id] === "number" ? layerRotation[cut.id]! : cut.rotate ?? 0}
                locked={lockedLayers.includes(cut.id)}
                onBringFront={() => bumpLayer(cut.id, "front")}
                onBringForward={() => stepLayer(cut.id, 1)}
                onSendBackward={() => stepLayer(cut.id, -1)}
                onSendBack={() => bumpLayer(cut.id, "back")}
                onDuplicate={() => duplicateLayer(cut.id, cut)}
                onToggleLock={() => toggleLayerLocked(cut.id)}
                onHide={() => hideLayer(cut.id)}
                onSelect={(inspect = true) => {
                  setSelectedExtraId(cut.id);
                  setSelectedKey(null);
                  setEditingTitle(false);
                  selectElement(`extra:${cut.id}`, "cutout", cut.alt || "Cutout", inspect);
                }}
                onReplaceImage={() => openUpload({ kind: "extra", id: cut.id })}
                onDelete={() => {
                  onPatch({
                    extraCutouts: extraCutouts.filter((c) => c.id !== cut.id),
                  });
                  setSelectedExtraId(null);
                }}
                onMoved={(leftPct, topPct) => {
                  onPatch({
                    extraCutouts: extraCutouts.map((c) =>
                      c.id === cut.id ? { ...c, leftPct, topPct } : c,
                    ),
                    layerPositions: {
                      ...positions,
                      [cut.id]: { leftPct, topPct },
                    },
                  });
                }}
                onResized={(nextScale, leftPct, topPct) => onPatch({
                  layerScales: { ...scales, [cut.id]: Number(nextScale.toFixed(6)) },
                  layerPositions: { ...positions, [cut.id]: { leftPct, topPct } },
                  extraCutouts: extraCutouts.map(c => c.id === cut.id ? { ...c, leftPct, topPct } : c),
                })}
                baseWidthPct={cut.widthPct}
                scale={scale}
                widthScale={widthScales[cut.id] ?? 1}
                heightScale={heightScales[cut.id] ?? 1}
                crop={crops[cut.id] ?? 0}
                onSnapGuide={setSnapGuide}
              />
            );
          })}

        {snapGuide.x ? (
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-[90] w-px bg-[#FF6A00]/80"
            style={{ left: "50%" }}
            aria-hidden
          />
        ) : null}
        {snapGuide.y ? (
          <div
            className="pointer-events-none absolute left-0 right-0 z-[90] h-px bg-[#FF6A00]/80"
            style={{ top: "50%" }}
            aria-hidden
          />
        ) : null}

        {editable && parallax ? (
          <div className="pointer-events-none absolute bottom-3 right-3 z-[80] rounded-full bg-black/55 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/90">
            Scroll to move cutouts
          </div>
        ) : null}

        {editable ? <div className="pointer-events-auto absolute bottom-3 left-3 z-[85] flex flex-wrap gap-1.5">
          <button
            type="button"
            className="rounded-full bg-black/75 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow"
            onClick={(e) => {
              e.stopPropagation();
              openUpload({ kind: "background" });
            }}
          >
            {bg ? "Change background" : "Add background"}
          </button>
          {bg ? (
            <button
              type="button"
              className="rounded-full bg-black/75 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow"
              onClick={(e) => {
                e.stopPropagation();
                onPatch({
                  backgroundLayer: "",
                  backgroundHidden: true,
                  hiddenLayers: [...new Set([...hiddenLayers, "backgroundLayer"])],
                });
              }}
            >
              Remove background
            </button>
          ) : null}
        </div> : null}

        {toast ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-[90] -translate-x-1/2 rounded-full bg-black/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
            {toast}
          </div>
        ) : null}

        {editable ? <button
          type="button"
          aria-label="Resize hero section height"
          className="absolute bottom-0 left-1/2 z-[95] h-3 w-20 -translate-x-1/2 translate-y-1/2 cursor-ns-resize rounded-full border border-white/80 bg-[#FF6A00] shadow"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            selectElement("heroCanvas", "control", "Hero section");
            const startY = event.clientY;
            const startHeight = sectionMinHeightPx;
            const artboardEl = event.currentTarget.parentElement as HTMLElement | null;
            let finalHeight = startHeight;
            const onMove = (moveEvent: MouseEvent) => {
              finalHeight = Math.min(
                1800,
                Math.max(360, Math.round(startHeight + (moveEvent.clientY - startY))),
              );
              if (artboardEl) artboardEl.style.minHeight = `${finalHeight}px`;
            };
            const onUp = () => {
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
              if (finalHeight !== startHeight) onPatch({ sectionMinHeightPx: finalHeight });
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
        /> : null}
      </div>
  );

  return (
    /* Fill the builder main pane edge-to-edge (Shopify-style) — no aspect-ratio strip. */
    <div
      className="relative flex min-h-0 w-full flex-1 flex-col bg-[#FFE4F0]"
    >
      <SiteThemeFonts
        fontDisplay={String(props.displayFont ?? "Oswald")}
        fontBody="system-ui"
        extraFamilies={[titleTypography.fontFamily]}
      />

      {editable ? <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFilePicked(f);
          e.target.value = "";
        }}
      /> : null}

      {parallax ? (
        <div
          ref={scrollerRef}
          className="lb-editor-parallax-scroll relative w-full"
        >
          <div className="lb-editor-scroll-scene" style={{ minHeight: `max(${sectionMinHeightPx * 2.2}px, 220dvh)` }}>
            <div className="sticky top-0">{artboard}</div>
          </div>
        </div>
      ) : (
        artboard
      )}
    </div>
  );
}

function CutoutChip({
  editable = true,
  slot,
  titleText,
  titleEditing,
  titleInputRef,
  accentColor,
  titleTypography,
  selected,
  leftPct,
  topPct,
  scale,
  widthScale = 1,
  heightScale = 1,
  crop = 0,
  baseWidthPct,
  motion,
  href = "",
  scrollKey,
  scrollProgress = 0,
  scrollTravel,
  pauseMotion,
  siteBase,
  onNavigatePage,
  onLinkChange,
  onOpenLink,
  onSelect,
  onMoved,
  onResized,
  onTitleChange,
  onStartTitleEdit,
  onEndTitleEdit,
  onReplaceImage,
  onDelete,
  zIndex = 10,
  opacity = 1,
  rotation,
  locked = false,
  onBringFront,
  onBringForward,
  onSendBackward,
  onSendBack,
  onDuplicate,
  onToggleLock,
  onHide,
  onSnapGuide,
}: {
  editable?: boolean;
  slot: EditableCutoutSlot;
  titleText: string | null;
  titleEditing: boolean;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
  accentColor: string;
  titleTypography?: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    letterSpacing: number;
    lineHeight: number;
    color: string;
  };
  selected: boolean;
  leftPct: number;
  topPct: number;
  scale: number;
  widthScale?: number;
  heightScale?: number;
  crop?: number;
  baseWidthPct: number;
  motion: LayerMotion;
  href?: string;
  scrollKey?: string;
  scrollProgress?: number;
  scrollTravel?: { x: number; y: number };
  pauseMotion: boolean;
  siteBase?: string;
  onNavigatePage?: (slug: string) => void;
  onLinkChange?: (href: string) => void;
  onOpenLink?: () => void;
  onSelect: (inspect?: boolean) => void;
  onMoved: (leftPct: number, topPct: number) => void;
  onResized: (scale: number, leftPct: number, topPct: number) => void;
  onTitleChange?: (value: string) => void;
  onStartTitleEdit?: () => void;
  onEndTitleEdit?: () => void;
  onReplaceImage?: () => void;
  onDelete?: () => void;
  zIndex?: number;
  opacity?: number;
  rotation?: number;
  locked?: boolean;
  onBringFront?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onSendBack?: () => void;
  onDuplicate?: () => void;
  onToggleLock?: () => void;
  onHide?: () => void;
  onSnapGuide?: (guide: { x: boolean; y: boolean }) => void;
}) {
  const moved = useRef(false);
  const sourceRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<HTMLElement | null>(null);
  const attachSource = useCallback((element: HTMLDivElement | null) => {
    sourceRef.current = element;
    setScene(element ? element.offsetParent as HTMLElement | null : null);
  }, []);
  const syncSelection = useCallback(() => {
    const source = sourceRef.current, frame = frameRef.current, overlay = selectionRef.current;
    if (!source || !frame || !overlay) return;
    Object.assign(overlay.style, {
      left: `${source.offsetLeft + frame.offsetLeft}px`, top: `${source.offsetTop + frame.offsetTop}px`,
      width: `${frame.offsetWidth}px`, height: `${frame.offsetHeight}px`,
      transform: source.ownerDocument.defaultView?.getComputedStyle(source).transform ?? "none",
    });
  }, []);
  const activeGesture = useRef<(() => void) | null>(null);
  const trailingClick = useRef<(() => void) | null>(null);
  useEffect(() => () => { activeGesture.current?.(); trailingClick.current?.(); }, []);
  const inset = titleText === null ? Math.max(0, Math.min(45, crop)) : 0;
  const fraction = 1 - inset / 50;
  useLayoutEffect(() => {
    syncSelection();
    const source = sourceRef.current, frame = frameRef.current;
    if (!source || !frame || !scene) return;
    const observer = new ResizeObserver(syncSelection);
    observer.observe(source); observer.observe(frame); observer.observe(scene);
    return () => observer.disconnect();
  }, [scene, selected, titleEditing, leftPct, topPct, scale, widthScale, inset, rotation, syncSelection]);

  function blockTrailingClick() {
    trailingClick.current?.();
    const doc = sourceRef.current?.ownerDocument;
    if (!doc) return;
    const clear = () => { doc.removeEventListener("click", block, true); doc.removeEventListener("pointerdown", clear, true); clearTimeout(timer); trailingClick.current = null; };
    const block = (event: MouseEvent) => { if (event.detail === 0) return; event.preventDefault(); event.stopImmediatePropagation(); clear(); };
    doc.addEventListener("click", block, true); doc.addEventListener("pointerdown", clear, true);
    const timer = setTimeout(clear, 1000); trailingClick.current = clear;
  }
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; host: HTMLElement } | null>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [ctxMenu]);

  const baseRotate = rotation ?? slot.rotate ?? 0;
  const scrollTransform =
    scrollProgress > 0 && !pauseMotion
      ? cutoutScrollTransform(scrollKey ?? slot.key, scrollProgress, baseRotate, scrollTravel)
      : baseRotate
        ? `rotate(${baseRotate}deg)`
        : undefined;

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("[data-resize], [data-chip-toolbar], [data-title-edit]")) return;
    e.stopPropagation();
    if (e.altKey && href.trim()) { onOpenLink?.(); return; }
    e.preventDefault(); onSelect(false);
    if (locked) return;
    const source = sourceRef.current, frame = e.currentTarget;
    const scene = source?.offsetParent as HTMLElement | null;
    if (!source || !scene) return;
    activeGesture.current?.();
    const pointerId = e.pointerId, startX = e.clientX, startY = e.clientY;
    const oldLeft = source.style.left, oldTop = source.style.top;
    let lastLeft = leftPct, lastTop = topPct;
    moved.current = false;
    try { frame.setPointerCapture(pointerId); } catch { /* Synthetic/retired pointer. */ }
    const clean = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel);
      try { frame.releasePointerCapture(pointerId); } catch { /* Already released by browser. */ }
      onSnapGuide?.({ x: false, y: false }); activeGesture.current = null;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const rect = scene.getBoundingClientRect(); if (rect.width < 1 || rect.height < 1) return;
      const dx = (event.clientX - startX) / rect.width * 100, dy = (event.clientY - startY) / rect.height * 100;
      if (Math.abs(dx) + Math.abs(dy) > 0.6) moved.current = true;
      lastLeft = Math.max(-5, Math.min(90, leftPct + dx)); lastTop = Math.max(-5, Math.min(90, topPct + dy));
      const w = source.offsetWidth / scene.clientWidth * 100, h = source.offsetHeight / scene.clientHeight * 100;
      const x = Math.abs(lastLeft + w / 2 - 50) <= 1.2, y = Math.abs(lastTop + h / 2 - 50) <= 1.2;
      if (x) lastLeft = 50 - w / 2; if (y) lastTop = 50 - h / 2;
      onSnapGuide?.({ x, y }); source.style.left = `${lastLeft}%`; source.style.top = `${lastTop}%`; syncSelection();
    };
    const cancel = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      clean(); source.style.left = oldLeft; source.style.top = oldTop; syncSelection(); blockTrailingClick();
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      clean();
      if (moved.current) { blockTrailingClick(); onMoved(lastLeft, lastTop); }
      else { onSelect(true); if (titleText !== null) onStartTitleEdit?.(); }
    };
    activeGesture.current = () => { clean(); source.style.left = oldLeft; source.style.top = oldTop; };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel);
  }

  function onCornerResize(e: ReactPointerEvent<HTMLButtonElement>, corner: CollageCorner) {
    e.stopPropagation(); e.preventDefault(); onSelect(false);
    if (locked) return;
    const source = sourceRef.current, handle = e.currentTarget;
    const scene = source?.offsetParent as HTMLElement | null;
    if (!source || !scene || !source.offsetWidth || !source.offsetHeight) return;
    activeGesture.current?.();
    const pointerId = e.pointerId, startX = e.clientX, startY = e.clientY;
    const initial = { x: source.offsetLeft, y: source.offsetTop, width: source.offsetWidth, height: source.offsetHeight, rotation: baseRotate };
    const initialStyle = { left: source.style.left, top: source.style.top, width: source.style.width };
    const effectiveScale = Math.max(4 / baseWidthPct, scale);
    let last = { source: initial, scale: effectiveScale }, changed = false;
    try { handle.setPointerCapture(pointerId); } catch { /* Synthetic/retired pointer. */ }
    const clean = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel);
      try { handle.releasePointerCapture(pointerId); } catch { /* Already released by browser. */ }
      activeGesture.current = null;
    };
    const restore = () => Object.assign(source.style, initialStyle);
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const rect = scene.getBoundingClientRect(); if (rect.width < 1 || rect.height < 1) return;
      const delta = { x: (event.clientX - startX) * scene.clientWidth / rect.width, y: (event.clientY - startY) * scene.clientHeight / rect.height };
      changed = changed || Math.abs(delta.x) + Math.abs(delta.y) > 1;
      last = resizeCollageSource(initial, effectiveScale, inset, corner, delta, { fromCenter: event.altKey, minimumScale: Math.max(0.15, 4 / baseWidthPct),
        positionBounds: { minX: -scene.clientWidth * 0.2, maxX: scene.clientWidth * 1.1, minY: -scene.clientHeight * 0.2, maxY: scene.clientHeight * 1.1 } });
      source.style.left = `${last.source.x / scene.clientWidth * 100}%`;
      source.style.top = `${last.source.y / scene.clientHeight * 100}%`;
      source.style.width = `${last.source.width / scene.clientWidth * 100}%`;
      syncSelection();
    };
    const cancel = (event: PointerEvent) => { if (event.pointerId !== pointerId) return; clean(); restore(); syncSelection(); blockTrailingClick(); };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      clean(); blockTrailingClick();
      if (changed) onResized(last.scale, Number((last.source.x / scene.clientWidth * 100).toFixed(6)), Number((last.source.y / scene.clientHeight * 100).toFixed(6)));
      else restore();
    };
    activeGesture.current = () => { clean(); restore(); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel);
  }

  function onHandleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, corner: CollageCorner) {
    const delta = { x: event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0,
      y: event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0 };
    if (!delta.x && !delta.y) return;
    event.preventDefault(); event.stopPropagation();
    const source = sourceRef.current;
    if (!source || !scene || locked) return;
    const step = event.shiftKey ? 10 : 1;
    const result = resizeCollageSource({ x: source.offsetLeft, y: source.offsetTop, width: source.offsetWidth, height: source.offsetHeight, rotation: baseRotate },
      Math.max(scale, 4 / baseWidthPct), inset, corner, { x: delta.x * step, y: delta.y * step },
      { fromCenter: event.altKey, minimumScale: Math.max(0.15, 4 / baseWidthPct),
        positionBounds: { minX: -scene.clientWidth * 0.2, maxX: scene.clientWidth * 1.1, minY: -scene.clientHeight * 0.2, maxY: scene.clientHeight * 1.1 } });
    onResized(result.scale, Number((result.source.x / scene.clientWidth * 100).toFixed(6)), Number((result.source.y / scene.clientHeight * 100).toFixed(6)));
  }

  const handleClass =
    "pointer-events-auto absolute z-50 h-6 w-6 rounded-sm border-2 border-white bg-[#FF5500] shadow-md hover:scale-110";

  return (
    <div ref={attachSource} data-kebu-source={slot.key} className="pointer-events-none absolute select-none"
      style={{ left: `${leftPct}%`, top: `${topPct}%`, width: `${slot.widthPct * widthScale}%`, transform: scrollTransform,
        zIndex: selected || titleEditing ? Math.max(zIndex, Z_LAYERS.chromeOverlay) : zIndex,
        filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.25))", opacity }}>
      {titleText === null ? (
        // Intrinsic source dimensions are required even with JS disabled; the browser reuses this URL's decoded image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slot.src} alt="" aria-hidden draggable={false} className="invisible block h-auto w-full" />
      ) : null}
      <div className={layerMotionClass(motion, !pauseMotion && !selected && !titleEditing)}
        style={{ position: titleText === null ? "absolute" : "relative", inset: titleText === null ? 0 : undefined, pointerEvents: "none" }}>
    <div ref={frameRef} data-kebu-layer={slot.key}
      className={`select-none ${editable ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={{ position: titleText === null ? "absolute" : "relative", left: titleText === null ? `${inset}%` : undefined,
        top: titleText === null ? `${inset}%` : undefined, width: titleText === null ? `${100 * fraction}%` : "100%",
        height: titleText === null ? `${100 * fraction}%` : undefined, pointerEvents: "auto",
        touchAction: editable ? "none" : "pan-y", userSelect: "none", WebkitUserSelect: "none" }}
      onClick={editable ? event => event.stopPropagation() : undefined}
      onDragStart={editable ? event => event.preventDefault() : undefined}
      onPointerDown={editable ? onPointerDown : undefined}
      onContextMenu={(e) => {
        if (!editable) return;
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        setCtxMenu({ x: e.clientX, y: e.clientY, host: e.currentTarget.ownerDocument.body });
      }}
      onDoubleClick={(e) => {
        if (!editable) return;
        e.stopPropagation();
        if (titleText !== null) onStartTitleEdit?.();
        else onReplaceImage?.();
      }}
      onFocus={editable ? () => onSelect(false) : undefined}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      onKeyDown={(event) => {
        if (!editable || (!selected && !titleEditing)) return;
        if (locked) return;
        if ((event.key === "Delete" || event.key === "Backspace") && onDelete) {
          event.preventDefault();
          onDelete();
          return;
        }
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(true); return; }
        const step = event.shiftKey ? 5 : 1;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onMoved(Math.max(-5, leftPct - step), topPct);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          onMoved(Math.min(90, leftPct + step), topPct);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          onMoved(leftPct, Math.max(-5, topPct - step));
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          onMoved(leftPct, Math.min(90, topPct + step));
        }
      }}
      aria-label={editable ? (
        titleText !== null
          ? "Drag to move · corners to resize · click to type"
          : href.trim()
            ? `Drag to move ${slot.label} · click Open to follow link`
            : `Drag to move ${slot.label} · corners to resize · double-click to change photo`
      ) : undefined}
    >
      {!editable && /^(https?:\/\/|mailto:|tel:|#|\/(?!\/)|[a-z0-9]+(?:-[a-z0-9]+)*$)/i.test(normalizeCutoutHref(href)) ? (
        <a
          className="absolute inset-0 z-30"
          href={resolveCutoutHref(href, siteBase)}
          aria-label={slot.label}
          onClick={(event) => {
            const slug = cutoutHrefToPageSlug(href);
            if (slug && onNavigatePage) { event.preventDefault(); onNavigatePage(slug); }
          }}
        />
      ) : null}
      {/* Right-click context menu — position: fixed so it escapes overflow:hidden */}
      {ctxMenu ? createPortal(
        <div
          data-chip-toolbar="1"
          className="fixed flex min-w-[168px] flex-col overflow-hidden rounded-xl bg-white py-1 shadow-2xl"
          style={{ left: ctxMenu.x + 4, top: ctxMenu.y - 4, zIndex: Z_LAYERS.canvasContextMenu }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {titleText !== null ? (
            <CtxItem onClick={() => { onStartTitleEdit?.(); setCtxMenu(null); }}>Type name</CtxItem>
          ) : (
            <CtxItem onClick={() => { onReplaceImage?.(); setCtxMenu(null); }}>Replace photo</CtxItem>
          )}
          {href.trim() ? (
            <CtxItem onClick={() => { onOpenLink?.(); setCtxMenu(null); }}>Open link</CtxItem>
          ) : null}
          {onDuplicate ? (
            <CtxItem onClick={() => { onDuplicate(); setCtxMenu(null); }}>Duplicate</CtxItem>
          ) : null}
          {onToggleLock ? (
            <CtxItem onClick={() => { onToggleLock(); setCtxMenu(null); }}>
              {locked ? "Unlock" : "Lock"}
            </CtxItem>
          ) : null}
          {onHide ? (
            <CtxItem onClick={() => { onHide(); setCtxMenu(null); }}>Hide</CtxItem>
          ) : null}
          {onBringFront ? (
            <CtxItem onClick={() => { onBringFront(); setCtxMenu(null); }}>Bring to Front</CtxItem>
          ) : null}
          {onBringForward ? (
            <CtxItem onClick={() => { onBringForward(); setCtxMenu(null); }}>Bring Forward</CtxItem>
          ) : null}
          {onSendBackward ? (
            <CtxItem onClick={() => { onSendBackward(); setCtxMenu(null); }}>Send Backward</CtxItem>
          ) : null}
          {onSendBack ? (
            <CtxItem onClick={() => { onSendBack(); setCtxMenu(null); }}>Send to Back</CtxItem>
          ) : null}
          {onDelete ? (
            <CtxItem danger onClick={() => { onDelete(); setCtxMenu(null); }}>Delete</CtxItem>
          ) : null}
        </div>, ctxMenu.host
      ) : null}

      <div className="relative" style={{ width: "100%", height: titleText === null ? "100%" : undefined }}>
        {titleText !== null ? (
          <div className="relative">
            <CircularBrandRing
              text={titleText}
              color={accentColor}
              spinning={motion !== "none" && !selected && !titleEditing}
            />
            {/* Center content — name text always visible; input swaps in when editing */}
            <div className="absolute inset-0 z-20 flex items-center justify-center p-[22%]">
              {titleEditing ? (
                <div
                  data-title-edit="1"
                  className="w-full"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <input
                    ref={titleInputRef}
                    autoFocus
                    className="w-full bg-transparent text-center uppercase caret-white outline-none"
                    style={{
                      color: titleTypography?.color ?? "#ffffff",
                      fontFamily: titleTypography?.fontFamily
                        ? cssFontStack(titleTypography.fontFamily)
                        : "Impact, Arial Black, Helvetica, sans-serif",
                      fontSize: `${titleTypography?.fontSize ?? 14}px`,
                      fontWeight: titleTypography?.fontWeight ?? 900,
                      letterSpacing: `${titleTypography?.letterSpacing ?? 0.12}em`,
                      lineHeight: titleTypography?.lineHeight ?? 1.15,
                      textShadow: "0 1px 8px rgba(0,0,0,0.55)",
                    }}
                    value={titleText}
                    placeholder="YOUR NAME"
                    aria-label="Type your name"
                    onChange={(e) => onTitleChange?.(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") {
                        e.preventDefault();
                        onEndTitleEdit?.();
                      }
                    }}
                  />
                </div>
              ) : (
                <p
                  className="pointer-events-none w-full break-words text-center font-black uppercase text-white"
                  style={{
                    color: titleTypography?.color ?? "#ffffff",
                    fontSize: `${titleTypography?.fontSize ?? 14}px`,
                    letterSpacing: `${titleTypography?.letterSpacing ?? 0.12}em`,
                    lineHeight: titleTypography?.lineHeight ?? 1.15,
                    fontWeight: titleTypography?.fontWeight ?? 900,
                    textShadow: "0 1px 8px rgba(0,0,0,0.55)",
                    fontFamily: titleTypography?.fontFamily
                      ? cssFontStack(titleTypography.fontFamily)
                      : "Impact, Arial Black, Helvetica, sans-serif",
                  }}
                >
                  {titleText || "MAY LECOR"}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slot.src}
              alt={slot.label}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ width: `${100 / fraction}%`, height: `${100 / fraction}%`, left: `${-inset / fraction}%`, top: `${-inset / fraction}%`, transform: heightScale !== 1 ? `scaleY(${heightScale})` : undefined, transformOrigin: "center" }}
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* Shopify-style corner handles — drag with the mouse to make bigger / smaller */}
      {scene && editable && (selected || titleEditing) ? createPortal(
        <div ref={selectionRef} data-kebu-selection={slot.key} style={{ position: "absolute", pointerEvents: "none", zIndex: Z_LAYERS.canvasSelection, outline: "2px solid #FF5500", outlineOffset: 3 }}>
        {!locked ? <>
          <button
            type="button"
            data-resize="1"
            aria-label="Resize top-left"
            className={`${handleClass} -left-1.5 -top-1.5 cursor-nwse-resize`}
            style={{ touchAction: "none" }}
            onPointerDown={(e) => onCornerResize(e, "nw")}
            onKeyDown={(e) => onHandleKeyDown(e, "nw")}
          />
          <button
            type="button"
            data-resize="1"
            aria-label="Resize top-right"
            className={`${handleClass} -right-1.5 -top-1.5 cursor-nesw-resize`}
            style={{ touchAction: "none" }}
            onPointerDown={(e) => onCornerResize(e, "ne")}
            onKeyDown={(e) => onHandleKeyDown(e, "ne")}
          />
          <button
            type="button"
            data-resize="1"
            aria-label="Resize bottom-left"
            className={`${handleClass} -bottom-1.5 -left-1.5 cursor-nesw-resize`}
            style={{ touchAction: "none" }}
            onPointerDown={(e) => onCornerResize(e, "sw")}
            onKeyDown={(e) => onHandleKeyDown(e, "sw")}
          />
          <button
            type="button"
            data-resize="1"
            aria-label="Resize bottom-right"
            className={`${handleClass} -bottom-1.5 -right-1.5 cursor-nwse-resize`}
            style={{ touchAction: "none" }}
            onPointerDown={(e) => onCornerResize(e, "se")}
            onKeyDown={(e) => onHandleKeyDown(e, "se")}
          />
        </> : null}
        </div>, scene
      ) : null}
    </div>
    </div>
    </div>
  );
}

function CtxItem({
  onClick,
  danger = false,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[12px] font-semibold tracking-tight hover:bg-gray-50 active:bg-gray-100"
      style={{ color: danger ? "#DC2626" : "#111111" }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

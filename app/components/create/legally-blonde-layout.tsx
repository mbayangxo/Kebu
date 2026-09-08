"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { LEGALLY_BLONDE_LAYERS } from "@/lib/create/legally-blonde-layers";
import {
  HERO_LOOP_ANIM,
  parseSbsOpts,
  parseTildaCss,
  scrollOffsetFromOpts,
} from "@/lib/create/legally-blonde-motion";
import {
  EditableSocialRail,
  socialRailStyleFromProps,
} from "@/app/components/create/editable-social-rail";
import { LegallyBlondeEditCanvas } from "@/app/components/create/legally-blonde-edit-canvas";
import {
  CircularBrandRing,
  layerMotionClass,
  type LayerMotion,
} from "@/app/components/create/circular-brand-ring";
import { ScaledArtboard } from "@/app/components/create/scaled-artboard";
import { localizeLegallyBlondeAssetUrl } from "@/lib/create/legally-blonde-defaults";
import {
  cutoutHrefToPageSlug,
  cutoutLinkRel,
  cutoutLinkTarget,
  resolveCutoutHref,
} from "@/lib/create/cutout-links";
import { SiteThemeFonts } from "@/app/components/create/site-theme-fonts";
import { cssFontStack } from "@/lib/create/site-theme-fonts";
import "./artist-motion.css";
import "./legally-blonde-tilda.css";

type TildaLayer = {
  id: string;
  type: string;
  url: string | null;
  text: string | null;
  style: string | null;
  atomStyle: string | null;
  animOpts: string | null;
};

export type ExtraCutout = {
  id: string;
  src: string;
  alt?: string;
  href?: string;
  topPct: number;
  leftPct: number;
  widthPct: number;
  rotate?: number;
  zIndex?: number;
  /** city scrolls behind May; figure stays forward. */
  parallaxRole?: "city" | "figure" | "none";
};

export type LegallyBlondeHeroProps = {
  title: string;
  subtitle: string;
  brandLabel?: string;
  backgroundLayer: string;
  titleLogo: string;
  cutoutLeft: string;
  cutoutRight: string;
  cutoutAccent: string;
  cutoutSparkle?: string;
  macbook: string;
  sparkleGif?: string;
  heroPhoto: string;
  accentColor: string;
  displayFont?: string;
  motionEnabled: boolean;
  appearance?: "light" | "dark";
  navLinks?: {
    label: string;
    href: string;
    multiNav?: boolean;
    children?: { label: string; href: string; iconUrl?: string }[];
    iconUrl?: string;
    showLabel?: boolean;
  }[];
  navScale?: number;
  navSize?: "compact" | "comfortable" | "large" | "fullscreen";
  navLayout?: "top" | "side";
  /** words · built-in icons · custom photos/icons */
  navDisplay?: "text" | "icons" | "photos";
  /** Small May logo in upper chrome (click → home). */
  chromeLogo?: string;
  showChromeLogo?: boolean;
  socialLinks?: { label: string; iconUrl: string; href: string }[];
  socialRailVisible?: boolean;
  socialRailBg?: string;
  socialRailLeftPct?: number;
  socialRailTopPct?: number;
  socialRailIconSize?: number;
  layerMoves?: Record<string, { dx: number; dy: number }>;
  layerScales?: Record<string, number>;
  layerMotions?: Record<string, "spin" | "float" | "bob" | "none">;
  layerLinks?: Record<string, string>;
  hiddenLayers?: string[];
  extraCutouts?: ExtraCutout[];
  ctaLabel?: string;
  ctaHref?: string;
  showExtras?: boolean;
  scrollMode?: "viewport" | "parallax";
  /** Replace spinning Russian logo circle with editable brand text around the circle. */
  titleAsText?: boolean;
};

type EditorHooks = {
  sectionId?: string;
  onPatchSection?: (sectionId: string, patch: Record<string, unknown>) => void;
  onSelectSection?: (sectionId: string) => void;
  onNavigatePage?: (slug: string) => void;
};

/** Maps Tilda layer ids → editable prop keys (Russian Elle / Legally Blonde assets). */
export const LB_EDITABLE_LAYER_KEYS: Record<string, keyof LegallyBlondeHeroProps> = {
  "1703760479272": "backgroundLayer",
  "1703760485488": "backgroundLayer",
  "1702905018850": "backgroundLayer",
  "1702905074759": "cutoutAccent",
  "1702905074752": "cutoutRight",
  "1702905074754": "cutoutLeft",
  "1702905074758": "cutoutSparkle",
  "1702905074756": "titleLogo",
  "1701609050895": "heroPhoto",
  "1702050415366": "macbook",
};

const CUTOUT_LAYER_IDS = new Set([
  "1702905074759",
  "1702905074752",
  "1702905074754",
  "1702905074758",
  "1702905074756",
]);

function resolveLayerUrl(layer: TildaLayer, props: LegallyBlondeHeroProps): string | null {
  const key = LB_EDITABLE_LAYER_KEYS[layer.id];
  if (key) {
    const val = props[key];
    // Explicit empty string = user removed this asset (do not fall back to Tilda URL).
    if (typeof val === "string") {
      if (val.trim() === "") return null;
      return localizeLegallyBlondeAssetUrl(val);
    }
  }
  return localizeLegallyBlondeAssetUrl(layer.url);
}

function layerLabel(layerId: string): string {
  const key = LB_EDITABLE_LAYER_KEYS[layerId];
  if (key === "cutoutLeft") return "Left cutout";
  if (key === "cutoutRight") return "Right cutout";
  if (key === "cutoutAccent") return "Center cutout";
  if (key === "cutoutSparkle") return "Sparkle accent";
  if (key === "titleLogo") return "Spinning logo";
  if (key === "backgroundLayer") return "Background";
  if (key === "macbook") return "Laptop / mockup";
  if (key === "heroPhoto") return "Story photo";
  return "Layer";
}

function CutoutLinkOverlay({
  href,
  siteBase,
  label,
  onNavigatePage,
}: {
  href: string;
  siteBase?: string;
  label: string;
  onNavigatePage?: (slug: string) => void;
}) {
  const resolved = resolveCutoutHref(href, siteBase);
  if (!resolved) return null;

  const pageSlug = cutoutHrefToPageSlug(href);
  if (pageSlug && onNavigatePage) {
    return (
      <button
        type="button"
        className="absolute inset-0 z-10 cursor-pointer border-0 bg-transparent p-0"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          onNavigatePage(pageSlug);
        }}
      />
    );
  }

  return (
    <a
      href={resolved}
      className="absolute inset-0 z-10"
      aria-label={label}
      target={cutoutLinkTarget(href)}
      rel={cutoutLinkRel(href)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function renderLayer(
  layer: TildaLayer,
  props: LegallyBlondeHeroProps,
  opts: {
    motion: boolean;
    scrollProgress?: number;
    editing?: boolean;
    selected?: boolean;
    siteBase?: string;
    onNavigatePage?: (slug: string) => void;
    onSelect?: () => void;
    onMoved?: (dx: number, dy: number) => void;
    onTitleChange?: (value: string) => void;
  },
) {
  const url = resolveLayerUrl(layer, props);
  const isTitleLogo = LB_EDITABLE_LAYER_KEYS[layer.id] === "titleLogo";
  const propKey = LB_EDITABLE_LAYER_KEYS[layer.id];
  if (propKey && (props.hiddenLayers ?? []).includes(propKey)) return null;
  if (layer.type !== "text" && !url && !(props.titleAsText !== false && isTitleLogo)) return null;

  const baseStyle = parseTildaCss(layer.style);
  const atomStyle = parseTildaCss(layer.atomStyle);
  const sbs = parseSbsOpts(layer.animOpts);
  const scroll = scrollOffsetFromOpts(sbs, opts.scrollProgress ?? 0);
  const hasScrollMotion = sbs.length >= 2 && Math.abs((sbs[sbs.length - 1]?.mx ?? 0) - (sbs[0]?.mx ?? 0)) > 1;
  const move = props.layerMoves?.[layer.id];
  const scaleKey = LB_EDITABLE_LAYER_KEYS[layer.id];
  const scale =
    (scaleKey && props.layerScales?.[scaleKey]) ||
    props.layerScales?.[layer.id] ||
    (LB_EDITABLE_LAYER_KEYS[layer.id] === "titleLogo" ? 0.55 : 1);
  const layerHref = scaleKey ? String(props.layerLinks?.[scaleKey] ?? "").trim() : "";
  const editable = Boolean(opts.editing && LB_EDITABLE_LAYER_KEYS[layer.id] && CUTOUT_LAYER_IDS.has(layer.id));

  function linkOverlay(label: string) {
    if (opts.editing || !layerHref) return null;
    return (
      <CutoutLinkOverlay
        href={layerHref}
        siteBase={opts.siteBase}
        label={label}
        onNavigatePage={opts.onNavigatePage}
      />
    );
  }

  const transformParts: string[] = [];
  if (baseStyle.transform && typeof baseStyle.transform === "string") {
    transformParts.push(baseStyle.transform);
  }
  if (scale !== 1) {
    transformParts.push(`scale(${scale})`);
  }
  if (move && (move.dx || move.dy)) {
    transformParts.push(`translate3d(${move.dx}px, ${move.dy}px, 0)`);
  }
  if (opts.motion && hasScrollMotion && opts.scrollProgress !== undefined && !opts.editing) {
    transformParts.push(`translate3d(${scroll.x}px, ${scroll.y}px, 0)`);
    if (scroll.rotate) transformParts.push(`rotate(${scroll.rotate}deg)`);
  }

  const style: CSSProperties = {
    ...baseStyle,
    ...atomStyle,
    transform: transformParts.length ? transformParts.join(" ") : baseStyle.transform,
    animation:
      opts.motion && !opts.editing
        ? (() => {
            const key = propKey || layer.id;
            const custom = props.layerMotions?.[key] as LayerMotion | undefined;
            if (custom === "none") return undefined;
            if (custom === "spin") return "lb-logo-spin 14s linear infinite";
            if (custom === "float") return "lb-float-up 2.4s ease-in-out infinite";
            if (custom === "bob") return "maylecor-float-a 3.2s ease-in-out infinite";
            return HERO_LOOP_ANIM[layer.id];
          })()
        : undefined,
    willChange: opts.motion ? "transform" : undefined,
    pointerEvents: editable || (!opts.editing && layerHref) ? "auto" : undefined,
    cursor: editable ? "grab" : !opts.editing && layerHref ? "pointer" : undefined,
    outline: opts.selected ? "2px solid #FF5500" : undefined,
    outlineOffset: opts.selected ? 4 : undefined,
    zIndex: opts.selected ? 50 : baseStyle.zIndex,
    touchAction: editable ? "none" : undefined,
  };

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!editable || !opts.onMoved) return;
    e.stopPropagation();
    e.preventDefault();
    opts.onSelect?.();
    const startX = e.clientX;
    const startY = e.clientY;
    const originDx = move?.dx ?? 0;
    const originDy = move?.dy ?? 0;
    const el = e.currentTarget;
    let lastDx = originDx;
    let lastDy = originDy;

    const onMove = (ev: PointerEvent) => {
      lastDx = originDx + (ev.clientX - startX);
      lastDy = originDy + (ev.clientY - startY);
      const base = parseTildaCss(layer.style).transform;
      const parts = [
        typeof base === "string" ? base : "",
        `translate3d(${lastDx}px, ${lastDy}px, 0)`,
      ].filter(Boolean);
      el.style.transform = parts.join(" ");
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      opts.onMoved?.(Math.round(lastDx), Math.round(lastDy));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  if (layer.type === "text" && layer.text) {
    return (
      <div key={layer.id} className={`lb-layer lb-text-steelfish`} style={style}>
        {layer.text}
      </div>
    );
  }

  if (!url && !(props.titleAsText !== false && LB_EDITABLE_LAYER_KEYS[layer.id] === "titleLogo")) return null;

  /* Middle circle: English name around the ring instead of Russian SVG. */
  if ((props.titleAsText !== false) && LB_EDITABLE_LAYER_KEYS[layer.id] === "titleLogo") {
    const motionKey = propKey || layer.id;
    const customMotion = (props.layerMotions?.[motionKey] ?? "spin") as LayerMotion;
    return (
      <div
        key={layer.id}
        className={`lb-layer${editable ? " lb-layer--editable" : ""} ${
          customMotion !== "spin" ? layerMotionClass(customMotion, opts.motion && !opts.editing) : ""
        }`}
        style={{
          ...style,
          backgroundImage: undefined,
          animation: undefined,
        }}
        onPointerDown={editable ? onPointerDown : undefined}
        onClick={(e) => {
          if (!editable) return;
          e.stopPropagation();
          opts.onSelect?.();
        }}
        role={editable ? "button" : undefined}
        tabIndex={editable ? 0 : undefined}
        aria-label={props.title}
      >
        <CircularBrandRing
          text={props.title || "MAY LECOR"}
          color={props.accentColor || "#E9006B"}
          spinning={opts.motion && !opts.editing && customMotion === "spin"}
        />
        {linkOverlay(props.title || "Open link")}
      </div>
    );
  }

  if (!url) return null;

  if (layer.type === "shape") {
    return (
      <div
        key={layer.id}
        className={`lb-layer lb-shape${editable ? " lb-layer--editable" : ""}`}
        style={{ ...style, backgroundImage: `url(${url})` }}
        aria-hidden={!editable && !layerHref}
        onPointerDown={editable ? onPointerDown : undefined}
        onClick={(e) => {
          if (!editable) return;
          e.stopPropagation();
          opts.onSelect?.();
        }}
      >
        {linkOverlay(layerLabel(layer.id))}
      </div>
    );
  }

  return (
    <div
      key={layer.id}
      className={`lb-layer${editable ? " lb-layer--editable" : ""}`}
      style={style}
      onPointerDown={editable ? onPointerDown : undefined}
      onClick={(e) => {
        if (!editable) return;
        e.stopPropagation();
        opts.onSelect?.();
      }}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      aria-label={editable ? `Move ${layerLabel(layer.id)}` : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className={layer.id === "1702905074756" ? "lb-hero-logo" : undefined}
        draggable={false}
      />
      {linkOverlay(layerLabel(layer.id))}
    </div>
  );
}

function ExtraCutoutItem({
  photo,
  editing,
  selected,
  siteBase,
  onNavigatePage,
  onSelect,
  onMoved,
  scrollProgress = 0,
  motion = false,
}: {
  photo: ExtraCutout;
  editing: boolean;
  selected: boolean;
  siteBase?: string;
  onNavigatePage?: (slug: string) => void;
  onSelect: () => void;
  onMoved: (topPct: number, leftPct: number) => void;
  scrollProgress?: number;
  motion?: boolean;
}) {
  const dragging = useRef(false);
  const role = photo.parallaxRole ?? (photo.id.includes("city") ? "city" : "none");
  const parallaxY =
    !editing && motion && role === "city"
      ? Math.round(scrollProgress * -160)
      : !editing && motion && role === "figure"
        ? Math.round(scrollProgress * -36)
        : 0;

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!editing) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const parent = e.currentTarget.offsetParent as HTMLElement | null;
    if (!parent) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const originLeft = photo.leftPct;
    const originTop = photo.topPct;
    const el = e.currentTarget;
    dragging.current = true;
    let lastLeft = originLeft;
    let lastTop = originTop;

    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const rect = parent.getBoundingClientRect();
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      lastLeft = Math.min(92, Math.max(-8, originLeft + dx));
      lastTop = Math.min(92, Math.max(-8, originTop + dy));
      el.style.left = `${lastLeft}%`;
      el.style.top = `${lastTop}%`;
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      onMoved(lastTop, lastLeft);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      className={`absolute ${editing ? "cursor-grab active:cursor-grabbing lb-layer--editable" : ""} ${
        selected ? "ring-2 ring-[#FF5500] ring-offset-2" : ""
      }`}
      style={{
        top: `${photo.topPct}%`,
        left: `${photo.leftPct}%`,
        width: `${photo.widthPct}%`,
        transform: `rotate(${photo.rotate ?? 0}deg)${
          parallaxY ? ` translate3d(0, ${parallaxY}px, 0)` : ""
        }`,
        zIndex: photo.zIndex ?? 12,
        touchAction: editing ? "none" : undefined,
        pointerEvents: editing || Boolean(photo.href) ? "auto" : "none",
        position: "absolute",
        willChange: parallaxY ? "transform" : undefined,
      }}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        if (!editing) return;
        e.stopPropagation();
        onSelect();
      }}
      role={editing ? "button" : undefined}
      tabIndex={editing ? 0 : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.src} alt={photo.alt ?? ""} className="h-auto w-full select-none" draggable={false} />
      {!editing && photo.href ? (
        <CutoutLinkOverlay
          href={photo.href}
          siteBase={siteBase}
          label={photo.alt || "Open link"}
          onNavigatePage={onNavigatePage}
        />
      ) : null}
    </div>
  );
}

export function LegallyBlondeHeroLayout({
  props,
  contained = false,
  sectionId,
  editor,
  projectId,
  siteBase = "",
  pageSlug = "home",
}: {
  props: LegallyBlondeHeroProps;
  siteBase?: string;
  contained?: boolean;
  sectionId?: string;
  editor?: EditorHooks;
  projectId?: string;
  pageSlug?: string;
}) {
  const motion = props.motionEnabled !== false;
  const viewportOnly = props.scrollMode === "viewport";
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashHide, setSplashHide] = useState(false);
  const showExtras = props.showExtras === true;
  const editing = Boolean(editor?.onPatchSection && sectionId);
  const builderPreview = Boolean(editor?.onPatchSection);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedExtraId, setSelectedExtraId] = useState<string | null>(null);

  function patch(next: Record<string, unknown>) {
    if (!sectionId || !editor?.onPatchSection) return;
    editor.onPatchSection(sectionId, next);
  }

  useEffect(() => {
    // In the builder, skip splash so cutouts are immediately visible/editable.
    if (editing || !motion || viewportOnly) {
      setSplashVisible(false);
      return;
    }
    const t1 = window.setTimeout(() => setSplashHide(true), 2800);
    const t2 = window.setTimeout(() => setSplashVisible(false), 3600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [motion, viewportOnly, editing]);

  useEffect(() => {
    if (!motion || viewportOnly || editing) return;
    const el = scrollTrackRef.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) {
        setScrollProgress(0);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setScrollProgress(scrolled / total);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [motion, viewportOnly, editing]);

  const hero = LEGALLY_BLONDE_LAYERS.hero;
  const scroll = LEGALLY_BLONDE_LAYERS.scroll;
  const scrollTrackHeight = viewportOnly || editing ? undefined : motion ? "220vh" : `${scroll.artboardHeight}px`;
  const extraCutouts = props.extraCutouts ?? [];

  /* Builder: site fills the preview — no pink padding / tip boxes above the artboard. */
  if ((editing || builderPreview) && sectionId) {
    return (
      <div id="top" className="relative flex h-full min-h-0 w-full flex-1 flex-col bg-[#FFE4F0]">
        <LegallyBlondeEditCanvas
          props={props as unknown as Record<string, unknown>}
          projectId={projectId}
          siteBase={siteBase}
          currentSlug={pageSlug}
          onPatch={patch}
          onSelectSection={() => editor?.onSelectSection?.(sectionId)}
          onNavigatePage={editor?.onNavigatePage}
        />
      </div>
    );
  }

  const heroArtboard = (
    <ScaledArtboard designWidth={1200} designHeight={hero.artboardHeight}>
      {hero.elements.map((layer) =>
        renderLayer(layer, props, {
          motion: editing ? false : motion,
          editing,
          siteBase,
          onNavigatePage: editor?.onNavigatePage,
          selected: selectedLayerId === layer.id,
          onSelect: () => {
            setSelectedLayerId(layer.id);
            setSelectedExtraId(null);
            if (sectionId) editor?.onSelectSection?.(sectionId);
          },
          onMoved: (dx, dy) => {
            patch({
              layerMoves: {
                ...(props.layerMoves ?? {}),
                [layer.id]: { dx, dy },
              },
            });
          },
          onTitleChange: (value) => {
            patch({ title: value, brandLabel: value, titleAsText: true });
          },
        }),
      )}
      {extraCutouts
        .filter((c) => c.src)
        .map((photo) => {
          const scale = props.layerScales?.[photo.id] ?? 1;
          return (
          <ExtraCutoutItem
            key={photo.id}
            photo={{ ...photo, widthPct: photo.widthPct * scale }}
            editing={editing}
            selected={selectedExtraId === photo.id}
            siteBase={siteBase}
            onNavigatePage={editor?.onNavigatePage}
            onSelect={() => {
              setSelectedExtraId(photo.id);
              setSelectedLayerId(null);
              if (sectionId) editor?.onSelectSection?.(sectionId);
            }}
            onMoved={(topPct, leftPct) => {
              const next = extraCutouts.map((c) =>
                c.id === photo.id ? { ...c, topPct, leftPct } : c,
              );
              patch({ extraCutouts: next });
            }}
            scrollProgress={scrollProgress}
            motion={editing ? false : motion}
          />
          );
        })}
    </ScaledArtboard>
  );

  return (
    <div
      id="top"
      className={`lb-page relative ${motion && !editing ? "artist-motion-on" : ""} ${viewportOnly || editing ? "lb-page--viewport" : ""} ${contained || editing ? "lb-page--contained" : ""} ${props.appearance === "dark" ? "bg-black text-white" : ""}`}
      style={
        {
          ["--lb-accent" as string]: props.accentColor || "#e9006b",
          ["--lb-display-font" as string]:
            props.displayFont && props.displayFont !== "Steelfish"
              ? cssFontStack(props.displayFont)
              : '"Steelfish", Arial, sans-serif',
        } as CSSProperties
      }
    >
      <SiteThemeFonts
        fontDisplay={props.displayFont && props.displayFont !== "Steelfish" ? props.displayFont : "Oswald"}
        fontBody="system-ui"
      />
      <EditableSocialRail
        links={props.socialLinks ?? []}
        style={socialRailStyleFromProps(props as unknown as Record<string, unknown>)}
        editing={editing}
        onSelect={sectionId && editor?.onSelectSection ? () => editor.onSelectSection!(sectionId) : undefined}
        onPatch={
          sectionId && editor?.onPatchSection
            ? (next) => editor.onPatchSection!(sectionId, next)
            : undefined
        }
      />

      {splashVisible && !viewportOnly && !editing ? (
        <div
          className={`lb-splash${splashHide ? " lb-splash--hide" : ""}${contained ? " lb-splash--contained" : ""}`}
          aria-hidden={splashHide}
        >
          <ScaledArtboard designWidth={1200} designHeight={hero.artboardHeight}>
            {hero.elements.map((layer) => renderLayer(layer, props, { motion }))}
          </ScaledArtboard>
        </div>
      ) : null}

      {editing || viewportOnly || !motion ? (
        <section className="relative mx-auto w-full overflow-hidden lb-viewport-hero" aria-label={props.title}>
          {heroArtboard}
        </section>
      ) : null}

      {!viewportOnly && !editing ? (
        <div ref={scrollTrackRef} className="lb-scroll-scene" style={{ height: scrollTrackHeight }}>
          <div className={motion ? "lb-scroll-pin" : undefined}>
            <ScaledArtboard
              designWidth={1200}
              designHeight={scroll.artboardHeight}
              className={motion ? "w-full" : undefined}
            >
              {scroll.elements.map((layer) =>
                renderLayer(layer, props, {
                  motion,
                  scrollProgress,
                  siteBase,
                  onNavigatePage: editor?.onNavigatePage,
                }),
              )}
            </ScaledArtboard>
          </div>
        </div>
      ) : null}

      {showExtras && props.heroPhoto ? (
        <section id="music" className="relative z-10 px-6 py-16 sm:px-12">
          <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={props.heroPhoto} alt="" className="w-full rounded-2xl object-cover shadow-xl" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: props.accentColor }}>
                {props.brandLabel ?? props.title}
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight">{props.title}</h2>
              <p className="mt-4 text-base leading-relaxed opacity-80">{props.subtitle}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

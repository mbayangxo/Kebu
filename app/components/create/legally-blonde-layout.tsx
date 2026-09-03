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
import { SiteImageUpload } from "@/app/components/create/site-image-upload";
import { LegallyBlondeEditCanvas } from "@/app/components/create/legally-blonde-edit-canvas";
import { ScaledArtboard } from "@/app/components/create/scaled-artboard";
import { localizeLegallyBlondeAssetUrl } from "@/lib/create/legally-blonde-defaults";
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
  topPct: number;
  leftPct: number;
  widthPct: number;
  rotate?: number;
  zIndex?: number;
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
  navLinks?: { label: string; href: string }[];
  socialLinks?: { label: string; iconUrl: string; href: string }[];
  socialRailVisible?: boolean;
  socialRailBg?: string;
  socialRailLeftPct?: number;
  socialRailTopPct?: number;
  socialRailIconSize?: number;
  layerMoves?: Record<string, { dx: number; dy: number }>;
  extraCutouts?: ExtraCutout[];
  ctaLabel?: string;
  ctaHref?: string;
  showExtras?: boolean;
  scrollMode?: "viewport" | "parallax";
  /** Replace spinning Russian logo circle with editable brand text. */
  titleAsText?: boolean;
};

type EditorHooks = {
  sectionId?: string;
  onPatchSection?: (sectionId: string, patch: Record<string, unknown>) => void;
  onSelectSection?: (sectionId: string) => void;
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

function renderLayer(
  layer: TildaLayer,
  props: LegallyBlondeHeroProps,
  opts: {
    motion: boolean;
    scrollProgress?: number;
    editing?: boolean;
    selected?: boolean;
    onSelect?: () => void;
    onMoved?: (dx: number, dy: number) => void;
  },
) {
  const url = resolveLayerUrl(layer, props);
  const isTitleLogo = LB_EDITABLE_LAYER_KEYS[layer.id] === "titleLogo";
  if (layer.type !== "text" && !url && !(props.titleAsText && isTitleLogo)) return null;

  const baseStyle = parseTildaCss(layer.style);
  const atomStyle = parseTildaCss(layer.atomStyle);
  const sbs = parseSbsOpts(layer.animOpts);
  const scroll = scrollOffsetFromOpts(sbs, opts.scrollProgress ?? 0);
  const hasScrollMotion = sbs.length >= 2 && Math.abs((sbs[sbs.length - 1]?.mx ?? 0) - (sbs[0]?.mx ?? 0)) > 1;
  const move = props.layerMoves?.[layer.id];
  const editable = Boolean(opts.editing && LB_EDITABLE_LAYER_KEYS[layer.id] && CUTOUT_LAYER_IDS.has(layer.id));

  const transformParts: string[] = [];
  if (baseStyle.transform && typeof baseStyle.transform === "string") {
    transformParts.push(baseStyle.transform);
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
      opts.motion && !opts.editing && HERO_LOOP_ANIM[layer.id] ? HERO_LOOP_ANIM[layer.id] : undefined,
    willChange: opts.motion ? "transform" : undefined,
    pointerEvents: editable ? "auto" : undefined,
    cursor: editable ? "grab" : undefined,
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

  if (!url && !(props.titleAsText && LB_EDITABLE_LAYER_KEYS[layer.id] === "titleLogo")) return null;

  /* Middle circle: brand name as text instead of Russian SVG logo. */
  if (props.titleAsText && LB_EDITABLE_LAYER_KEYS[layer.id] === "titleLogo") {
    return (
      <div
        key={layer.id}
        className={`lb-layer lb-text-steelfish flex items-center justify-center text-center${editable ? " lb-layer--editable" : ""}`}
        style={{
          ...style,
          backgroundImage: undefined,
          color: props.accentColor || "#fff",
          fontSize: "clamp(2rem, 8vw, 5.5rem)",
          fontWeight: 700,
          lineHeight: 0.95,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          padding: "0.5rem",
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
        {props.title}
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
        aria-hidden={!editable}
        onPointerDown={editable ? onPointerDown : undefined}
        onClick={(e) => {
          if (!editable) return;
          e.stopPropagation();
          opts.onSelect?.();
        }}
      />
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
    </div>
  );
}

function ExtraCutoutItem({
  photo,
  editing,
  selected,
  onSelect,
  onMoved,
}: {
  photo: ExtraCutout;
  editing: boolean;
  selected: boolean;
  onSelect: () => void;
  onMoved: (topPct: number, leftPct: number) => void;
}) {
  const dragging = useRef(false);

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
        transform: `rotate(${photo.rotate ?? 0}deg)`,
        zIndex: photo.zIndex ?? 12,
        touchAction: editing ? "none" : undefined,
        pointerEvents: editing ? "auto" : "none",
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
    </div>
  );
}

export function LegallyBlondeHeroLayout({
  props,
  contained = false,
  sectionId,
  editor,
  projectId,
}: {
  props: LegallyBlondeHeroProps;
  siteBase?: string;
  contained?: boolean;
  sectionId?: string;
  editor?: EditorHooks;
  projectId?: string;
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
  const selectedPropKey = selectedLayerId ? LB_EDITABLE_LAYER_KEYS[selectedLayerId] : null;
  const selectedExtra = extraCutouts.find((c) => c.id === selectedExtraId) ?? null;

  /* Builder: pink edit canvas — never the black Tilda chrome (narrow preview looked empty). */
  if ((editing || builderPreview) && sectionId) {
    return (
      <div
        id="top"
        className="relative w-full p-3 sm:p-5"
        style={{ background: "#FFE4F0", minHeight: 420 }}
      >
        <LegallyBlondeEditCanvas
          props={props as unknown as Record<string, unknown>}
          projectId={projectId}
          onPatch={patch}
          onSelectSection={() => editor?.onSelectSection?.(sectionId)}
        />
        <p className="mt-3 text-center text-[11px] text-black/50">
          Social side icons: edit them in the left Content panel (Social links). They show on the live site.
        </p>
      </div>
    );
  }

  const heroArtboard = (
    <ScaledArtboard designWidth={1200} designHeight={hero.artboardHeight}>
      {hero.elements.map((layer) =>
        renderLayer(layer, props, {
          motion: editing ? false : motion,
          editing,
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
        }),
      )}
      {extraCutouts
        .filter((c) => c.src)
        .map((photo) => (
          <ExtraCutoutItem
            key={photo.id}
            photo={photo}
            editing={editing}
            selected={selectedExtraId === photo.id}
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
          />
        ))}
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
              ? `${props.displayFont}, Arial, sans-serif`
              : '"Steelfish", Arial, sans-serif',
        } as CSSProperties
      }
    >
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

      {editing ? (
        <p className="sticky top-0 z-[60] bg-black/80 px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-white">
          Click a cutout → upload/swap · drag to move · add your own below
        </p>
      ) : null}

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
                }),
              )}
            </ScaledArtboard>
          </div>
        </div>
      ) : null}

      {editing && projectId && (selectedPropKey || selectedExtra) ? (
        <div
          className="sticky bottom-3 z-[70] mx-auto max-w-md rounded-2xl p-3 shadow-xl"
          style={{ background: "#fff", border: "2px solid #FF5500" }}
          onClick={(e) => e.stopPropagation()}
        >
          {selectedPropKey ? (
            <>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>
                Swap {layerLabel(selectedLayerId!)} — Russian original stays until you upload
              </p>
              <SiteImageUpload
                projectId={projectId}
                kind="section"
                label="Upload your cutout / photo"
                value={String(props[selectedPropKey] ?? "")}
                onChange={(url) => patch({ [selectedPropKey]: url })}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full px-3 py-1 text-[10px] font-bold uppercase"
                  style={{ border: "1px solid #DDE0F0" }}
                  onClick={() => patch({ [selectedPropKey]: "" })}
                >
                  Remove from site
                </button>
                <button
                  type="button"
                  className="rounded-full px-3 py-1 text-[10px] font-bold uppercase"
                  style={{ border: "1px solid #DDE0F0" }}
                  onClick={() => {
                    const moves = { ...(props.layerMoves ?? {}) };
                    if (selectedLayerId) delete moves[selectedLayerId];
                    patch({ layerMoves: moves });
                  }}
                >
                  Reset position
                </button>
              </div>
            </>
          ) : null}
          {selectedExtra ? (
            <>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>
                Your added cutout — upload or delete
              </p>
              <SiteImageUpload
                projectId={projectId}
                kind="section"
                label="Upload photo"
                value={selectedExtra.src}
                onChange={(url) => {
                  const next = extraCutouts.map((c) =>
                    c.id === selectedExtra.id ? { ...c, src: url } : c,
                  );
                  patch({ extraCutouts: next });
                }}
              />
              <button
                type="button"
                className="mt-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase text-red-600"
                style={{ border: "1px solid #DDE0F0" }}
                onClick={() => {
                  patch({ extraCutouts: extraCutouts.filter((c) => c.id !== selectedExtra.id) });
                  setSelectedExtraId(null);
                }}
              >
                Delete cutout
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <div className="flex justify-center gap-2 px-4 py-3">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ background: "#0F0D33" }}
            onClick={() => {
              const next: ExtraCutout = {
                id: `cut-${Date.now()}`,
                src: String(props.cutoutAccent || props.cutoutLeft || ""),
                alt: "My cutout",
                topPct: 25 + Math.round(Math.random() * 30),
                leftPct: 20 + Math.round(Math.random() * 40),
                widthPct: 14,
                rotate: -8 + Math.round(Math.random() * 16),
                zIndex: 14,
              };
              patch({ extraCutouts: [...extraCutouts, next] });
              setSelectedExtraId(next.id);
              setSelectedLayerId(null);
            }}
          >
            + Add my cutout
          </button>
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

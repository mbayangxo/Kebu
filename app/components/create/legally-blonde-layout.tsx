"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LEGALLY_BLONDE_LAYERS } from "@/lib/create/legally-blonde-layers";
import {
  HERO_LOOP_ANIM,
  parseSbsOpts,
  parseTildaCss,
  scrollOffsetFromOpts,
} from "@/lib/create/legally-blonde-motion";
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
  motionEnabled: boolean;
  appearance?: "light" | "dark";
  navLinks?: { label: string; href: string }[];
  socialLinks?: { label: string; iconUrl: string; href: string }[];
  ctaLabel?: string;
  ctaHref?: string;
  /** When true, show extra music/contact blocks (not on Russian reference). */
  showExtras?: boolean;
  /** viewport = one screen, no scroll parallax. parallax = full Russian scroll scene. */
  scrollMode?: "viewport" | "parallax";
};

const HERO_URL_BY_ID: Record<string, keyof LegallyBlondeHeroProps> = {
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

function layerUrl(layer: TildaLayer, props: LegallyBlondeHeroProps): string | null {
  const key = HERO_URL_BY_ID[layer.id];
  if (key && typeof props[key] === "string" && props[key]) return props[key] as string;
  return layer.url;
}

function renderLayer(
  layer: TildaLayer,
  props: LegallyBlondeHeroProps,
  opts: {
    motion: boolean;
    scrollProgress?: number;
    extraClass?: string;
  },
) {
  const baseStyle = parseTildaCss(layer.style);
  const atomStyle = parseTildaCss(layer.atomStyle);
  const sbs = parseSbsOpts(layer.animOpts);
  const scroll = scrollOffsetFromOpts(sbs, opts.scrollProgress ?? 0);
  const hasScrollMotion = sbs.length >= 2 && Math.abs((sbs[sbs.length - 1]?.mx ?? 0) - (sbs[0]?.mx ?? 0)) > 1;

  const transformParts: string[] = [];
  if (baseStyle.transform && typeof baseStyle.transform === "string") {
    transformParts.push(baseStyle.transform);
  }
  if (opts.motion && hasScrollMotion && opts.scrollProgress !== undefined) {
    transformParts.push(`translate3d(${scroll.x}px, ${scroll.y}px, 0)`);
    if (scroll.rotate) transformParts.push(`rotate(${scroll.rotate}deg)`);
  }

  const style: CSSProperties = {
    ...baseStyle,
    ...atomStyle,
    transform: transformParts.length ? transformParts.join(" ") : baseStyle.transform,
    animation:
      opts.motion && HERO_LOOP_ANIM[layer.id] ? HERO_LOOP_ANIM[layer.id] : undefined,
    willChange: opts.motion ? "transform" : undefined,
  };

  if (layer.type === "text" && layer.text) {
    return (
      <div
        key={layer.id}
        className={`lb-layer lb-text-steelfish ${opts.extraClass ?? ""}`}
        style={style}
      >
        {layer.text}
      </div>
    );
  }

  const url = layerUrl(layer, props);
  if (!url) return null;

  if (layer.type === "shape") {
    return (
      <div
        key={layer.id}
        className={`lb-layer lb-shape ${opts.extraClass ?? ""}`}
        style={{ ...style, backgroundImage: `url(${url})` }}
        aria-hidden
      />
    );
  }

  return (
    <div key={layer.id} className={`lb-layer ${opts.extraClass ?? ""}`} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className={layer.id === "1702905074756" ? "lb-hero-logo" : undefined}
      />
    </div>
  );
}

export function LegallyBlondeHeroLayout({
  props,
}: {
  props: LegallyBlondeHeroProps;
  siteBase?: string;
}) {
  const motion = props.motionEnabled !== false;
  const viewportOnly = props.scrollMode === "viewport";
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashHide, setSplashHide] = useState(false);
  const showExtras = props.showExtras === true;

  useEffect(() => {
    if (!motion || viewportOnly) {
      setSplashVisible(false);
      return;
    }
    const t1 = window.setTimeout(() => setSplashHide(true), 2800);
    const t2 = window.setTimeout(() => setSplashVisible(false), 3600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [motion, viewportOnly]);

  useEffect(() => {
    if (!motion || viewportOnly) return;
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
  }, [motion, viewportOnly]);

  const hero = LEGALLY_BLONDE_LAYERS.hero;
  const scroll = LEGALLY_BLONDE_LAYERS.scroll;
  const scrollTrackHeight = viewportOnly ? undefined : motion ? "220vh" : `${scroll.artboardHeight}px`;

  return (
    <div
      id="top"
      className={`lb-page ${motion ? "artist-motion-on" : ""} ${viewportOnly ? "lb-page--viewport" : ""} ${props.appearance === "dark" ? "bg-black text-white" : ""}`}
    >
      {splashVisible && !viewportOnly ? (
        <div className={`lb-splash${splashHide ? " lb-splash--hide" : ""}`} aria-hidden={splashHide}>
          <div className="lb-artboard" style={{ height: hero.artboardHeight }}>
            {hero.elements.map((layer) => renderLayer(layer, props, { motion }))}
          </div>
        </div>
      ) : viewportOnly || !motion ? (
        <section
          className="relative mx-auto w-full overflow-hidden lb-viewport-hero"
          style={{ maxWidth: 1200, height: viewportOnly ? "min(100vh, 900px)" : hero.artboardHeight }}
          aria-label={props.title}
        >
          <div className="lb-artboard" style={{ height: viewportOnly ? "min(100vh, 900px)" : hero.artboardHeight }}>
            {hero.elements.map((layer) => renderLayer(layer, props, { motion: viewportOnly ? motion : false }))}
          </div>
        </section>
      ) : null}

      {!viewportOnly ? (
      <div ref={scrollTrackRef} className="lb-scroll-scene" style={{ height: scrollTrackHeight }}>
        <div className={motion ? "lb-scroll-pin" : undefined}>
          <div
            className="lb-artboard"
            style={{ height: scroll.artboardHeight, position: motion ? "relative" : undefined }}
          >
            {scroll.elements.map((layer) =>
              renderLayer(layer, props, {
                motion,
                scrollProgress,
              }),
            )}
          </div>
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

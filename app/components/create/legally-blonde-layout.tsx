"use client";

import { useEffect, useRef, useState } from "react";
import "./artist-motion.css";

export type LegallyBlondeHeroProps = {
  title: string;
  subtitle: string;
  backgroundLayer: string;
  titleLogo: string;
  cutoutLeft: string;
  cutoutRight: string;
  cutoutAccent: string;
  cutoutSparkle?: string;
  macbook: string;
  sparkleGif: string;
  heroPhoto: string;
  accentColor: string;
  motionEnabled: boolean;
};

/** Tilda artboard reference: 1200×700 desktop hero. */
const ARTBOARD_W = 1200;
const ARTBOARD_H = 700;

function MotionWrap({
  motion,
  className,
  style,
  animation,
  children,
}: {
  motion: boolean;
  className?: string;
  style?: React.CSSProperties;
  animation?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={className}
      style={{
        ...style,
        animation: motion && animation ? animation : undefined,
        willChange: motion ? "transform" : undefined,
      }}
    >
      {children}
    </div>
  );
}

export function LegallyBlondeHeroLayout({ props }: { props: LegallyBlondeHeroProps }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const motion = props.motionEnabled !== false;

  useEffect(() => {
    if (!motion) return;
    const el = scrollRef.current;
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
  }, [motion]);

  const macbookShift = motion ? scrollProgress * 80 : 0;
  const parallaxLeft = motion ? scrollProgress * -230 : 0;
  const parallaxRight = motion ? scrollProgress * 50 : 0;

  return (
    <div className={`bg-white ${motion ? "artist-motion-on" : ""}`}>
      {/* ── HERO (Tilda block 682858777 — loop animations, 700px) ── */}
      <section
        className="relative mx-auto w-full overflow-hidden"
        style={{ maxWidth: ARTBOARD_W, height: "min(100vh, 700px)", minHeight: 520 }}
      >
        {props.backgroundLayer ? (
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${props.backgroundLayer})` }}
            aria-hidden
          />
        ) : null}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/70" />

        <div className="relative mx-auto h-full w-full" style={{ maxWidth: ARTBOARD_W }}>
          {/* Center wobble cutout — Group_546, top ~31%, rotate 353° + 14° wobble */}
          {props.cutoutAccent ? (
            <MotionWrap
              motion={motion}
              className="absolute z-20"
              style={{
                left: "50%",
                top: `${(218 / ARTBOARD_H) * 100}%`,
                width: `${(138 / ARTBOARD_W) * 100}%`,
                maxWidth: 138,
                marginLeft: -69,
              }}
              animation="lb-wobble-rotate 2s ease-in-out infinite"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={props.cutoutAccent} alt="" className="h-auto w-full object-contain drop-shadow-xl" />
            </MotionWrap>
          ) : null}

          {/* Right cutout — Group_555, bobs down +16px */}
          {props.cutoutRight ? (
            <MotionWrap
              motion={motion}
              className="absolute z-20"
              style={{
                right: "14%",
                top: `${(219 / ARTBOARD_H) * 100}%`,
                width: `${(72 / ARTBOARD_W) * 100}%`,
                maxWidth: 72,
              }}
              animation="lb-float-down 2s ease-in-out infinite"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={props.cutoutRight} alt="" className="h-auto w-full object-contain drop-shadow-xl" />
            </MotionWrap>
          ) : null}

          {/* Left cutout — Group_556, bobs up −16px */}
          {props.cutoutLeft ? (
            <MotionWrap
              motion={motion}
              className="absolute z-20"
              style={{
                left: `${(500 / ARTBOARD_W) * 100}%`,
                top: `${(235 / ARTBOARD_H) * 100}%`,
                width: `${(72 / ARTBOARD_W) * 100}%`,
                maxWidth: 72,
              }}
              animation="lb-float-up 2s ease-in-out infinite"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={props.cutoutLeft} alt="" className="h-auto w-full object-contain drop-shadow-xl" />
            </MotionWrap>
          ) : null}

          {/* Sparkle portrait — Group_523, centered above logo */}
          {props.cutoutSparkle ? (
            <div
              className="absolute z-10"
              style={{
                left: "50%",
                top: `${((350 - 65) / ARTBOARD_H) * 100}%`,
                width: `${(136 / ARTBOARD_W) * 100}%`,
                maxWidth: 136,
                transform: "translateX(-50%)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={props.cutoutSparkle} alt="" className="h-auto w-full object-contain" />
            </div>
          ) : null}

          {/* Title logo — Group_557.svg, 15s full rotation */}
          {props.titleLogo ? (
            <MotionWrap
              motion={motion}
              className="absolute z-30"
              style={{
                left: "50%",
                top: `${((350 - 64) / ARTBOARD_H) * 100}%`,
                width: `${(477 / ARTBOARD_W) * 100}%`,
                maxWidth: 477,
              }}
              animation="lb-logo-spin 15s linear infinite"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={props.titleLogo} alt={props.title} className="h-auto w-full object-contain" />
            </MotionWrap>
          ) : (
            <h1
              className="absolute left-1/2 z-30 w-[min(72vw,477px)] -translate-x-1/2 text-center text-4xl font-bold uppercase sm:text-6xl"
              style={{
                top: `${((350 - 64) / ARTBOARD_H) * 100}%`,
                color: props.accentColor,
                fontFamily: "Georgia, serif",
              }}
            >
              {props.title}
            </h1>
          )}

          {props.sparkleGif ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.sparkleGif}
              alt=""
              className="absolute z-30 h-14 w-14 object-contain sm:h-20 sm:w-20"
              style={{ right: "18%", top: "58%" }}
            />
          ) : null}
        </div>
      </section>

      {/* ── SCROLL SCENE (Tilda block 678997629 — horizontal parallax on scroll) ── */}
      <div ref={scrollRef} style={{ height: motion ? "180vh" : "auto" }}>
        <div className={`relative ${motion ? "sticky top-0" : ""} min-h-[70vh] overflow-hidden bg-white`}>
          <div className="relative mx-auto w-full" style={{ maxWidth: ARTBOARD_W }}>
            {props.macbook ? (
              <div
                className="relative z-10 mx-auto w-[min(95vw,720px)]"
                style={{
                  transform: `translate3d(0, ${macbookShift}px, 0)`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={props.macbook} alt="" className="w-full object-contain drop-shadow-2xl" />
              </div>
            ) : null}

            {props.cutoutLeft && motion ? (
              <div
                className="pointer-events-none absolute left-[8%] top-[20%] z-20 w-[min(18vw,120px)]"
                style={{ transform: `translate3d(${parallaxLeft * 0.3}px, 0, 0)` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={props.cutoutLeft} alt="" className="w-full object-contain opacity-90" />
              </div>
            ) : null}

            {props.cutoutRight && motion ? (
              <div
                className="pointer-events-none absolute right-[8%] top-[18%] z-20 w-[min(16vw,110px)]"
                style={{ transform: `translate3d(${parallaxRight}px, 0, 0)` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={props.cutoutRight} alt="" className="w-full object-contain opacity-90" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <section className="relative z-10 bg-white px-6 py-16 sm:px-12">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          {props.heroPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.heroPhoto} alt="" className="w-full rounded-2xl object-cover shadow-xl" />
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: props.accentColor }}>
              Legally Blonde
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight" style={{ fontFamily: "Georgia, serif" }}>
              {props.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-neutral-700">{props.subtitle}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

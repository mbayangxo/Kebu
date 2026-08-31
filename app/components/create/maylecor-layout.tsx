"use client";

import { useEffect, useRef, useState } from "react";
import "./artist-motion.css";

type SocialLink = { label: string; iconUrl: string; href: string };

function SocialRail({ links, siteBase }: { links: SocialLink[]; siteBase?: string }) {
  return (
    <aside
      className="fixed left-0 top-0 z-50 flex h-full w-14 flex-col items-center justify-center gap-3 bg-black/80 py-6 sm:w-16"
      aria-label="Social links"
    >
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          title={link.label}
          className="opacity-90 transition hover:opacity-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={link.iconUrl} alt={link.label} className="h-9 w-9 sm:h-11 sm:w-11" />
        </a>
      ))}
      {siteBase ? (
        <a href={siteBase} className="mt-4 text-[9px] uppercase tracking-widest text-white/50 hover:text-white">
          Home
        </a>
      ) : null}
    </aside>
  );
}

export type MaylecorHomeProps = {
  artistName: string;
  backgroundImage: string;
  portraitMain: string;
  collageTop: string;
  collageMiddle: string;
  logoBanner: string;
  bottomLeft: string;
  bottomRight: string;
  logoSmall: string;
  ctaLabel: string;
  musicPageSlug: string;
  homeLogoHref: string;
  socialLinks: SocialLink[];
  motionEnabled?: boolean;
};

export function MaylecorHomeLayout({
  props,
  siteBase = "",
}: {
  props: MaylecorHomeProps;
  siteBase?: string;
}) {
  const musicHref = siteBase ? `${siteBase}/${props.musicPageSlug}` : `/${props.musicPageSlug}`;
  const motion = props.motionEnabled !== false;
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (!motion) return;
    const onScroll = () => setScrollY(window.scrollY);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [motion]);

  const motionClass = motion ? "artist-motion-on" : "";
  const bgShift = motion ? scrollY * 0.25 : 0;
  const bottomShift = motion ? scrollY * 0.08 : 0;

  return (
    <div id="top" ref={rootRef} className={`min-h-screen bg-black text-white ${motionClass}`}>
      <SocialRail links={props.socialLinks} />
      <div className="relative min-h-screen pl-14 sm:pl-16">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40 blur-md"
          style={{
            backgroundImage: `url(${props.backgroundImage})`,
            transform: motion ? `translate3d(0, ${bgShift}px, 0) scale(1.08)` : undefined,
            animation: motion ? "maylecor-kenburns 18s ease-in-out infinite alternate" : undefined,
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black" />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
          <div className="relative mx-auto mb-8 flex min-h-[420px] max-w-4xl flex-col items-center justify-center sm:min-h-[520px]">
            <div
              className="relative w-full max-w-md sm:max-w-lg"
              style={{ animation: motion ? "maylecor-fade-up 1.2s ease-out both" : undefined }}
            >
              {props.collageTop ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={props.collageTop}
                  alt=""
                  className="absolute -top-4 right-0 z-10 w-[52%] object-cover shadow-2xl"
                  style={{
                    animation: motion ? "maylecor-float-a 8s ease-in-out infinite" : undefined,
                  }}
                />
              ) : null}
              {props.portraitMain ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={props.portraitMain}
                  alt={props.artistName}
                  className="relative z-20 mx-auto w-[58%] object-cover shadow-2xl"
                  style={{
                    animation: motion ? "maylecor-float-portrait 6s ease-in-out infinite" : undefined,
                  }}
                />
              ) : null}
              {props.collageMiddle ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={props.collageMiddle}
                  alt=""
                  className="absolute bottom-0 left-0 z-10 w-[55%] object-cover shadow-2xl"
                  style={{
                    animation: motion ? "maylecor-float-b 7s ease-in-out infinite" : undefined,
                  }}
                />
              ) : null}
            </div>
          </div>

          <div
            className="mb-10 text-center"
            style={{ animation: motion ? "maylecor-fade-up 1.4s ease-out 0.2s both" : undefined }}
          >
            <a
              href={musicHref}
              className="inline-block border border-white/30 bg-black/50 px-6 py-4 text-xs font-semibold tracking-[0.35em] text-white transition hover:scale-[1.02] hover:bg-white hover:text-black sm:text-sm"
            >
              {props.ctaLabel}
            </a>
          </div>

          {props.logoBanner ? (
            <a
              href={props.homeLogoHref || "#top"}
              className="mx-auto mb-12 block max-w-xl"
              style={{ animation: motion ? "maylecor-fade-up 1.5s ease-out 0.35s both" : undefined }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={props.logoBanner} alt={props.artistName} className="mx-auto w-full max-w-md object-contain" />
            </a>
          ) : null}

          <div
            className="grid items-end gap-4 sm:grid-cols-2 sm:gap-6"
            style={{
              transform: motion ? `translate3d(0, ${-bottomShift}px, 0)` : undefined,
            }}
          >
            {props.bottomLeft ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.bottomLeft} alt="" className="w-full object-cover shadow-xl" />
            ) : (
              <div className="aspect-[3/4] bg-white/5" />
            )}
            {props.bottomRight ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.bottomRight} alt="" className="w-full object-cover shadow-xl" />
            ) : (
              <div className="aspect-[3/4] bg-white/5" />
            )}
          </div>

          {props.logoSmall ? (
            <div className="mt-10 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={props.logoSmall} alt="" className="h-16 w-auto object-contain opacity-90 sm:h-24" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type MaylecorMusicProps = {
  artistName: string;
  albumArt: string;
  homePageSlug: string;
  socialLinks: SocialLink[];
  motionEnabled?: boolean;
};

export function MaylecorMusicLayout({
  props,
  siteBase = "",
}: {
  props: MaylecorMusicProps;
  siteBase?: string;
}) {
  const homeHref = siteBase ? `${siteBase}` : `/${props.homePageSlug}`;
  const motion = props.motionEnabled !== false;

  return (
    <div className={`min-h-screen bg-black text-white ${motion ? "artist-motion-on" : ""}`}>
      <SocialRail links={props.socialLinks} siteBase={homeHref} />
      <div className="flex min-h-screen flex-col items-center justify-center pl-14 sm:pl-16">
        <a href={homeHref} className="mb-8 text-[10px] uppercase tracking-[0.3em] text-white/60 hover:text-white">
          ← {props.artistName}
        </a>
        {props.albumArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.albumArt}
            alt={`${props.artistName} — music`}
            className="max-w-[90vw] object-contain px-4 sm:max-w-2xl"
            style={{
              animation: motion ? "maylecor-float-portrait 5s ease-in-out infinite" : undefined,
            }}
          />
        ) : (
          <div className="flex h-40 w-80 items-center justify-center border border-white/20 text-sm text-white/50">
            Add album art URL in the editor
          </div>
        )}
        <p className="mt-8 text-[10px] uppercase tracking-[0.4em] text-white/50">Music</p>
      </div>
    </div>
  );
}

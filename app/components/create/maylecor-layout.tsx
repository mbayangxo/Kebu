"use client";

import { useEffect, useRef, useState } from "react";
import {
  EditableSocialRail,
  socialRailStyleFromProps,
  type SocialLinkItem,
} from "@/app/components/create/editable-social-rail";
import "./artist-motion.css";

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
  socialLinks: SocialLinkItem[];
  socialRailVisible?: boolean;
  socialRailBg?: string;
  socialRailLeftPct?: number;
  socialRailTopPct?: number;
  socialRailIconSize?: number;
  motionEnabled?: boolean;
};

type EditorHooks = {
  sectionId?: string;
  onPatchSection?: (sectionId: string, patch: Record<string, unknown>) => void;
  onSelectSection?: (sectionId: string) => void;
};

export function MaylecorHomeLayout({
  props,
  siteBase = "",
  sectionId,
  editor,
}: {
  props: MaylecorHomeProps;
  siteBase?: string;
  sectionId?: string;
  editor?: EditorHooks;
}) {
  const musicHref = siteBase ? `${siteBase}/${props.musicPageSlug}` : `/${props.musicPageSlug}`;
  const motion = props.motionEnabled !== false;
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const editing = Boolean(editor?.onPatchSection && sectionId);

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
    <div id="top" ref={rootRef} className={`relative min-h-screen bg-black text-white ${motionClass}`}>
      <EditableSocialRail
        links={props.socialLinks ?? []}
        style={socialRailStyleFromProps(props as unknown as Record<string, unknown>)}
        editing={editing}
        onSelect={sectionId && editor?.onSelectSection ? () => editor.onSelectSection!(sectionId) : undefined}
        onPatch={
          sectionId && editor?.onPatchSection
            ? (patch) => editor.onPatchSection!(sectionId, patch)
            : undefined
        }
      />
      <div className="relative min-h-screen">
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
          <div className="relative mx-auto mb-8 flex min-h-[280px] max-w-4xl flex-col items-center justify-center sm:min-h-[420px] md:min-h-[520px]">
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
              onClick={(e) => editing && e.preventDefault()}
            >
              {props.ctaLabel}
            </a>
          </div>

          {props.logoBanner ? (
            <a
              href={props.homeLogoHref || "#top"}
              className="mx-auto mb-12 block max-w-xl"
              style={{ animation: motion ? "maylecor-fade-up 1.5s ease-out 0.35s both" : undefined }}
              onClick={(e) => editing && e.preventDefault()}
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

export type MaylecorTrackLink = {
  platform: "spotify" | "apple" | "youtube" | "soundcloud" | "other";
  href?: string;
};

export type MaylecorTrack = {
  id: string;
  title: string;
  coverUrl?: string;
  links?: MaylecorTrackLink[];
};

export type MaylecorMusicProps = {
  artistName: string;
  albumArt: string;
  homePageSlug: string;
  tracks?: MaylecorTrack[];
  socialLinks: SocialLinkItem[];
  socialRailVisible?: boolean;
  socialRailBg?: string;
  socialRailLeftPct?: number;
  socialRailTopPct?: number;
  socialRailIconSize?: number;
  motionEnabled?: boolean;
};

const PLATFORM_LABEL: Record<string, string> = {
  spotify: "Spotify",
  apple: "Apple Music",
  youtube: "YouTube",
  soundcloud: "SoundCloud",
  other: "Listen",
};

function PlatformIcon({ platform }: { platform: string }) {
  const common = "h-5 w-5";
  if (platform === "spotify") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.18c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-.96-.12-1.08-.6-.12-.48.12-.96.6-1.08 4.38-1.32 9.76-.66 13.5 1.62.36.18.54.78.18 1.14zm.12-3.3C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.2-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.48-1.02.66-1.56.36z" />
      </svg>
    );
  }
  if (platform === "apple") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    );
  }
  if (platform === "youtube") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
    </svg>
  );
}

export function MaylecorMusicLayout({
  props,
  siteBase = "",
  sectionId,
  editor,
}: {
  props: MaylecorMusicProps;
  siteBase?: string;
  sectionId?: string;
  editor?: EditorHooks;
}) {
  const homeHref = siteBase ? `${siteBase}` : `/${props.homePageSlug}`;
  const motion = props.motionEnabled !== false;
  const editing = Boolean(editor?.onPatchSection && sectionId);
  const tracks = props.tracks?.length ? props.tracks : [];

  function patchTrack(trackId: string, patch: Partial<MaylecorTrack>) {
    if (!sectionId || !editor?.onPatchSection) return;
    const next = tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t));
    editor.onPatchSection(sectionId, { tracks: next });
  }

  function patchLink(trackId: string, platform: string, href: string) {
    if (!sectionId || !editor?.onPatchSection) return;
    const next = tracks.map((t) => {
      if (t.id !== trackId) return t;
      const links = [...(t.links ?? [])];
      const idx = links.findIndex((l) => l.platform === platform);
      if (idx >= 0) links[idx] = { ...links[idx]!, href };
      else links.push({ platform: platform as MaylecorTrackLink["platform"], href });
      return { ...t, links };
    });
    editor.onPatchSection(sectionId, { tracks: next });
  }

  return (
    <div className={`relative min-h-screen bg-black text-white ${motion ? "artist-motion-on" : ""}`}>
      <EditableSocialRail
        links={props.socialLinks ?? []}
        style={socialRailStyleFromProps(props as unknown as Record<string, unknown>)}
        editing={editing}
        siteBase={editing ? undefined : homeHref}
        onSelect={sectionId && editor?.onSelectSection ? () => editor.onSelectSection!(sectionId) : undefined}
        onPatch={
          sectionId && editor?.onPatchSection
            ? (patch) => editor.onPatchSection!(sectionId, patch)
            : undefined
        }
      />
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-16">
        <a
          href={homeHref}
          className="mb-8 text-[10px] uppercase tracking-[0.3em] text-white/60 hover:text-white"
          onClick={(e) => editing && e.preventDefault()}
        >
          ← {props.artistName}
        </a>
        {props.albumArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.albumArt}
            alt={`${props.artistName} — music`}
            className="mx-auto mb-10 max-w-[90vw] object-contain sm:max-w-md"
            style={{
              animation: motion ? "maylecor-float-portrait 5s ease-in-out infinite" : undefined,
            }}
          />
        ) : (
          <div className="mx-auto mb-8 flex h-40 w-80 items-center justify-center border border-white/20 text-sm text-white/50">
            Add album art URL in the editor
          </div>
        )}
        <p className="mb-6 text-center text-[10px] uppercase tracking-[0.4em] text-white/50">Music</p>

        <ul className="space-y-5">
          {tracks.map((track) => (
            <li key={track.id} className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-center gap-4">
                {track.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track.coverUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/10 text-[10px] text-white/40">
                    Cover
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <input
                      value={track.title}
                      onChange={(e) => patchTrack(track.id, { title: e.target.value })}
                      className="w-full rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-sm font-semibold"
                    />
                  ) : (
                    <p className="truncate text-sm font-semibold">{track.title}</p>
                  )}
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-white/45">Listen on</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {(track.links ?? []).map((link) => {
                      const href = (link.href ?? "").trim();
                      if (editing) {
                        return (
                          <label key={link.platform} className="flex min-w-[10rem] flex-col gap-0.5">
                            <span className="text-[9px] uppercase text-white/40">
                              {PLATFORM_LABEL[link.platform] ?? link.platform}
                            </span>
                            <input
                              value={href}
                              placeholder="https://…"
                              onChange={(e) => patchLink(track.id, link.platform, e.target.value)}
                              className="rounded border border-white/20 bg-black/50 px-1.5 py-1 text-[11px]"
                            />
                          </label>
                        );
                      }
                      if (!href) return null;
                      return (
                        <a
                          key={link.platform}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-semibold text-white/90 transition hover:border-[#E9006B] hover:text-white"
                          aria-label={`${PLATFORM_LABEL[link.platform]} — ${track.title}`}
                        >
                          <PlatformIcon platform={link.platform} />
                          {PLATFORM_LABEL[link.platform] ?? "Listen"}
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {editing ? (
          <p className="mt-6 text-center text-[11px] text-white/45">
            Paste Spotify / Apple Music / YouTube / SoundCloud links per song. Empty links stay hidden live.
          </p>
        ) : null}
      </div>
    </div>
  );
}

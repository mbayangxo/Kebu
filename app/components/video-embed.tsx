"use client";

import { useState } from "react";
import Image from "next/image";
import { isDirectVideoUrl } from "@/lib/create/site-asset-upload";

export function extractYoutubeId(input: string): string | null {
  if (!input?.trim()) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  const m = input.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

export function extractVimeoId(input: string): string | null {
  if (!input?.trim()) return null;
  if (/^\d{6,12}$/.test(input.trim())) return input.trim();
  const m = input.match(
    /(?:player\.)?vimeo\.com\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d{6,12})/,
  );
  return m ? m[1]! : null;
}

export type VideoCard = {
  src: string;
  title?: string;
  caption?: string;
  thumbnail?: string;
};

interface VideoEmbedProps {
  src: string;
  title?: string;
  caption?: string;
  thumbnail?: string;
  className?: string;
}

export function VideoEmbed({ src, title, caption, thumbnail, className = "" }: VideoEmbedProps) {
  const [playing, setPlaying] = useState(false);
  const ytId = extractYoutubeId(src);
  const vimeoId = ytId ? null : extractVimeoId(src);
  const direct = !ytId && !vimeoId && isDirectVideoUrl(src);
  const ytThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
  const thumbUrl = (thumbnail && thumbnail.trim()) || ytThumb;
  const embedUrl = ytId
    ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&color=white`
    : vimeoId
      ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0`
      : null;

  if (!ytId && !vimeoId && !direct) {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-2xl bg-[#0F0D33] ${className}`}
        style={{ aspectRatio: "16/9" }}
      >
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt={title || "Video"} className="absolute inset-0 h-full w-full object-cover opacity-40" />
        ) : null}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <p className="text-xs text-white/60">
            {title || "Add a YouTube / Vimeo link or upload a video"}
          </p>
          {caption ? <p className="text-[10px] text-white/40">{caption}</p> : null}
        </div>
      </div>
    );
  }

  if (direct) {
    return (
      <div className={className}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          controls
          preload="metadata"
          playsInline
          poster={thumbUrl || undefined}
          className="w-full rounded-2xl"
          src={src}
          title={title}
        />
        {caption ? <p className="mt-2.5 text-center text-xs" style={{ color: "#9B8B75" }}>{caption}</p> : null}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative w-full overflow-hidden rounded-2xl shadow-xl" style={{ aspectRatio: "16/9" }}>
        {playing ? (
          <iframe
            src={embedUrl!}
            title={title || "Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 h-full w-full focus:outline-none"
            aria-label={`Play ${title || "video"}`}
          >
            {thumbUrl ? (
              thumbUrl.startsWith("http") ? (
                <Image
                  src={thumbUrl}
                  alt={title || "Video thumbnail"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized={thumbUrl.includes("wixstatic") || thumbUrl.includes("site-assets")}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl} alt={title || "Video thumbnail"} className="absolute inset-0 h-full w-full object-cover" />
              )
            ) : (
              <div className="absolute inset-0 bg-[#0F0D33]" />
            )}
            <div className="absolute inset-0 bg-black/30 transition-colors duration-200 group-hover:bg-black/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform duration-200 group-hover:scale-105 sm:h-16 sm:w-16"
                style={{ background: "#00C851" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white" className="translate-x-0.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            </div>
            {title ? (
              <div
                className="absolute bottom-0 left-0 right-0 px-4 py-3"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
              >
                <p className="text-sm font-semibold leading-snug text-white">{title}</p>
              </div>
            ) : null}
          </button>
        )}
      </div>
      {caption ? <p className="mt-2.5 text-center text-xs" style={{ color: "#9B8B75" }}>{caption}</p> : null}
    </div>
  );
}

export function VideoGrid({
  videos,
  layout = "grid",
  columns = 2,
  fullWidth = false,
  className = "",
}: {
  videos: VideoCard[];
  layout?: "grid" | "single" | "featured" | "fullscreen";
  columns?: 1 | 2 | 3;
  fullWidth?: boolean;
  className?: string;
}) {
  const list = videos.filter((v) => v.src?.trim() || v.thumbnail?.trim() || v.title?.trim());
  if (list.length === 0) return null;

  if (layout === "fullscreen") {
    return (
      <div className={`flex flex-col gap-6 ${className}`}>
        {list.map((v, i) => (
          <VideoEmbed key={`${v.src}-${v.title}-${i}`} src={v.src} title={v.title} caption={v.caption} thumbnail={v.thumbnail} />
        ))}
      </div>
    );
  }

  if (layout === "single") {
    const first = list[0]!;
    return (
      <div className={`${fullWidth ? "" : "mx-auto max-w-4xl"} ${className}`}>
        <VideoEmbed src={first.src} title={first.title} caption={first.caption} thumbnail={first.thumbnail} />
      </div>
    );
  }

  if (layout === "featured" && list.length > 1) {
    const [hero, ...rest] = list;
    return (
      <div className={`space-y-5 ${className}`}>
        <VideoEmbed src={hero!.src} title={hero!.title} caption={hero!.caption} thumbnail={hero!.thumbnail} />
        <div
          className={`grid gap-4 ${
            columns === 1 ? "" : columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"
          }`}
        >
          {rest.map((v, i) => (
            <VideoEmbed
              key={`${v.src}-${v.title}-${i}`}
              src={v.src}
              title={v.title}
              caption={v.caption}
              thumbnail={v.thumbnail}
            />
          ))}
        </div>
      </div>
    );
  }

  const colClass =
    columns === 1 || list.length === 1
      ? fullWidth ? "" : "max-w-4xl mx-auto"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2";

  return (
    <div className={`grid gap-5 ${colClass} ${className}`}>
      {list.map((v, i) => (
        <VideoEmbed
          key={`${v.src}-${v.title}-${i}`}
          src={v.src}
          title={v.title}
          caption={v.caption}
          thumbnail={v.thumbnail}
        />
      ))}
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { VideoEmbed } from "@/app/components/video-embed";
import {
  MEDIA_KIND_LABELS,
  MEDIA_PLATFORM_LABELS,
} from "@/lib/business/artist-media";

type PublicArtist = {
  publicId: string;
  stageName: string;
  bioShort: string;
  hometown: string;
  genres: string[];
  socialLinks: { label: string; href: string }[];
  portraitUrl: string;
  coverUrl: string;
  agency: { name: string; kebuId: string | null };
  pressKitPath: string | null;
  pressKitTitle: string | null;
  media: {
    publicId: string;
    kind: string;
    platform: string;
    title: string;
    url: string;
    thumbnailUrl: string;
    caption: string;
  }[];
};

export default function PublicArtistPage() {
  const { publicId: raw } = useParams<{ publicId: string }>();
  const publicId = (raw || "").trim().toLowerCase();
  const [artist, setArtist] = useState<PublicArtist | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicId) return;
    void (async () => {
      const res = await fetch(`/api/public/artists/${encodeURIComponent(publicId)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Not found.");
        return;
      }
      setArtist(json.artist as PublicArtist);
    })();
  }, [publicId]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-bold">Artist</h1>
        <p className="mt-3 text-sm" style={{ color: "#8B1E1E" }}>{error}</p>
      </main>
    );
  }

  if (!artist) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-sm opacity-70">Loading artist…</p>
      </main>
    );
  }

  const genres = Array.isArray(artist.genres) ? artist.genres : [];
  const socials = Array.isArray(artist.socialLinks) ? artist.socialLinks : [];

  return (
    <main className="min-h-screen" style={{ background: KEBU.cream, color: KEBU.black }}>
      {artist.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={artist.coverUrl} alt="" className="h-40 w-full object-cover sm:h-56" />
      ) : (
        <div className="h-24 w-full sm:h-32" style={{ background: KEBU.card }} />
      )}

      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
          Artist · {artist.agency.name}
          {artist.agency.kebuId ? ` · ${artist.agency.kebuId}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          {artist.portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.portraitUrl}
              alt=""
              className="h-24 w-24 rounded-full object-cover"
              style={{ border: `2px solid ${KEBU.border}` }}
            />
          ) : null}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{artist.stageName}</h1>
            {artist.hometown || genres.length ? (
              <p className="mt-1 text-xs opacity-60">
                {[artist.hometown, genres.join(" · ")].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        </div>

        {artist.bioShort ? (
          <p className="mt-6 text-sm leading-relaxed opacity-90">{artist.bioShort}</p>
        ) : null}

        {artist.pressKitPath ? (
          <p className="mt-4 text-sm">
            <a href={artist.pressKitPath} className="underline" style={{ color: KEBU.orange }}>
              {artist.pressKitTitle || "Press kit"}
            </a>
          </p>
        ) : null}

        {socials.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-3 text-sm">
            {socials.map((s, i) =>
              s.href ? (
                <li key={i}>
                  <a href={s.href} target="_blank" rel="noreferrer" className="underline">
                    {s.label}
                  </a>
                </li>
              ) : null,
            )}
          </ul>
        ) : null}

        <section className="mt-10">
          <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.faint }}>
            Reels · Music videos
          </h2>
          {artist.media.length === 0 ? (
            <p className="mt-3 text-sm opacity-60">No published videos yet.</p>
          ) : (
            <ul className="mt-4 space-y-8">
              {artist.media.map((m) => (
                <li key={m.publicId}>
                  <p className="mb-2 text-sm font-semibold">
                    {m.title}{" "}
                    <span className="font-normal opacity-50">
                      · {MEDIA_KIND_LABELS[m.kind as keyof typeof MEDIA_KIND_LABELS] ?? m.kind} ·{" "}
                      {MEDIA_PLATFORM_LABELS[m.platform as keyof typeof MEDIA_PLATFORM_LABELS] ??
                        m.platform}
                    </span>
                  </p>
                  <VideoEmbed
                    src={m.url}
                    title={m.title}
                    caption={m.caption}
                    thumbnail={m.thumbnailUrl || undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

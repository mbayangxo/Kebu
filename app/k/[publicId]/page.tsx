"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { VideoEmbed } from "@/app/components/video-embed";

type PublicKit = {
  publicId: string;
  title: string;
  publishedAt: string | null;
  headline: string;
  bio: string;
  bookingEmail: string;
  bookingPhone: string;
  quotes: { quote: string; source: string }[];
  facts: { label: string; value: string }[];
  assets: { title: string; url: string; kind: string; caption: string }[];
  media?: {
    publicId: string;
    kind: string;
    platform: string;
    title: string;
    url: string;
    thumbnailUrl: string;
    caption: string;
  }[];
  artist: {
    stageName: string;
    legalName: string;
    bioShort: string;
    hometown: string;
    genres: string[];
    socialLinks: { label: string; href: string }[];
    portraitUrl: string;
    coverUrl: string;
    publicPath?: string | null;
  };
  agency: {
    name: string;
    kebuId: string | null;
  };
};

export default function PublicPressKitPage() {
  const { publicId: raw } = useParams<{ publicId: string }>();
  const publicId = (raw || "").trim().toLowerCase();
  const [kit, setKit] = useState<PublicKit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicId) return;
    void (async () => {
      const res = await fetch(`/api/public/press-kits/${encodeURIComponent(publicId)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Not found.");
        return;
      }
      setKit(json.kit as PublicKit);
    })();
  }, [publicId]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-bold">Press kit</h1>
        <p className="mt-3 text-sm text-red-700">{error}</p>
      </main>
    );
  }

  if (!kit) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-sm opacity-70">Loading press kit…</p>
      </main>
    );
  }

  const socials = Array.isArray(kit.artist.socialLinks) ? kit.artist.socialLinks : [];
  const genres = Array.isArray(kit.artist.genres) ? kit.artist.genres : [];

  return (
    <main className="min-h-screen" style={{ background: KEBU.cream, color: KEBU.black }}>
      {kit.artist.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={kit.artist.coverUrl}
          alt=""
          className="h-40 w-full object-cover sm:h-56"
        />
      ) : (
        <div className="h-24 w-full sm:h-32" style={{ background: KEBU.card }} />
      )}

      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
          Press kit · {kit.agency.name}
          {kit.agency.kebuId ? ` · ${kit.agency.kebuId}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          {kit.artist.portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={kit.artist.portraitUrl}
              alt=""
              className="h-24 w-24 rounded-full object-cover"
              style={{ border: `2px solid ${KEBU.border}` }}
            />
          ) : null}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{kit.artist.stageName}</h1>
            <p className="mt-1 text-sm opacity-70">{kit.headline || kit.title}</p>
            {kit.artist.publicPath ? (
              <p className="mt-1 text-xs">
                <a href={kit.artist.publicPath} className="underline" style={{ color: KEBU.orange }}>
                  Artist page · reels
                </a>
              </p>
            ) : null}
            {kit.artist.hometown || genres.length ? (
              <p className="mt-1 text-xs opacity-60">
                {[kit.artist.hometown, genres.join(" · ")].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        </div>

        {kit.bio ? (
          <section className="mt-8">
            <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.faint }}>
              Bio
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{kit.bio}</p>
          </section>
        ) : null}

        {kit.facts.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.faint }}>
              Facts
            </h2>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {kit.facts.map((f, i) => (
                <div
                  key={`${f.label}-${i}`}
                  className="rounded-xl px-3 py-2"
                  style={{ background: "#fff", border: `1px solid ${KEBU.border}` }}
                >
                  <dt className="text-[10px] uppercase tracking-wider opacity-50">{f.label}</dt>
                  <dd className="text-sm font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {kit.quotes.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.faint }}>
              Press
            </h2>
            <ul className="mt-3 space-y-3">
              {kit.quotes.map((q, i) => (
                <li
                  key={i}
                  className="rounded-xl px-4 py-3"
                  style={{ background: "#fff", border: `1px solid ${KEBU.border}` }}
                >
                  <blockquote className="text-sm leading-relaxed">&ldquo;{q.quote}&rdquo;</blockquote>
                  {q.source ? <p className="mt-2 text-xs opacity-60">— {q.source}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {kit.assets.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.faint }}>
              Assets
            </h2>
            <ul className="mt-3 space-y-2">
              {kit.assets.map((a, i) => (
                <li key={i} className="text-sm">
                  {a.url ? (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                      style={{ color: KEBU.orange }}
                    >
                      {a.title}
                    </a>
                  ) : (
                    <span>{a.title}</span>
                  )}
                  <span className="opacity-50"> · {a.kind}</span>
                  {a.caption ? <span className="opacity-60"> — {a.caption}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {(kit.media?.length ?? 0) > 0 ? (
          <section className="mt-8">
            <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.faint }}>
              Video
            </h2>
            <ul className="mt-4 space-y-6">
              {kit.media!.map((m) => (
                <li key={m.publicId}>
                  <p className="mb-2 text-sm font-semibold">{m.title}</p>
                  <VideoEmbed
                    src={m.url}
                    title={m.title}
                    caption={m.caption}
                    thumbnail={m.thumbnailUrl || undefined}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {(kit.bookingEmail || kit.bookingPhone || socials.length > 0) && (
          <section className="mt-8">
            <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.faint }}>
              Booking / contact
            </h2>
            <div className="mt-2 space-y-1 text-sm">
              {kit.bookingEmail ? (
                <p>
                  <a href={`mailto:${kit.bookingEmail}`} className="underline" style={{ color: KEBU.orange }}>
                    {kit.bookingEmail}
                  </a>
                </p>
              ) : null}
              {kit.bookingPhone ? <p>{kit.bookingPhone}</p> : null}
              {socials.map((s, i) =>
                s.href ? (
                  <p key={i}>
                    <a href={s.href} target="_blank" rel="noreferrer" className="underline">
                      {s.label}
                    </a>
                  </p>
                ) : null,
              )}
            </div>
          </section>
        )}

        <p className="mt-10 text-[11px] opacity-50">
          Official press materials from {kit.agency.name} on Kebu
          {kit.publishedAt
            ? ` · Published ${new Date(kit.publishedAt).toLocaleDateString()}`
            : ""}
          .
        </p>
      </div>
    </main>
  );
}

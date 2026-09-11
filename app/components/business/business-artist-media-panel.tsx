"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import {
  MEDIA_KIND_LABELS,
  MEDIA_PLATFORM_LABELS,
} from "@/lib/business/artist-media";

type ArtistOpt = { id: string; stage_name: string; publicPath: string };
type CampaignOpt = { id: string; title: string; artist_id: string };
type MediaRow = {
  id: string;
  title: string;
  kind: string;
  platform: string;
  url: string;
  status: string;
  artistName: string;
  artist_id: string;
  campaign_id: string | null;
  caption: string;
};

/** Reels / MVs for signed artists — store URLs, publish to public artist page. */
export function BusinessArtistMediaPanel({ businessId }: { businessId: string }) {
  const [artists, setArtists] = useState<ArtistOpt[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOpt[]>([]);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [artistId, setArtistId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [kind, setKind] = useState<keyof typeof MEDIA_KIND_LABELS>("reel");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aRes, cRes, mRes] = await Promise.all([
        fetch(`/api/businesses/${businessId}/artists`, { credentials: "include" }),
        fetch(`/api/businesses/${businessId}/artist-campaigns`, { credentials: "include" }),
        fetch(`/api/businesses/${businessId}/artist-media`, { credentials: "include" }),
      ]);
      const aData = await aRes.json().catch(() => ({}));
      const cData = await cRes.json().catch(() => ({}));
      const mData = await mRes.json().catch(() => ({}));

      if (aRes.ok) {
        const list = (aData.artists ?? []) as ArtistOpt[];
        setArtists(list);
        setArtistId((prev) => prev || list[0]?.id || "");
      } else {
        setError(typeof aData.error === "string" ? aData.error : "Apply 056 for artists.");
      }

      if (cRes.ok) {
        setCampaigns(
          ((cData.campaigns ?? []) as { id: string; title: string; artist_id: string }[]).map(
            (c) => ({ id: c.id, title: c.title, artist_id: c.artist_id }),
          ),
        );
      }

      if (!mRes.ok) {
        setError(
          typeof mData.error === "string"
            ? mData.error
            : "Could not load media (apply 058).",
        );
      } else {
        setMedia((mData.media ?? []) as MediaRow[]);
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const artistCampaigns = campaigns.filter((c) => c.artist_id === artistId);

  async function createMedia(publish: boolean) {
    if (!artistId || !title.trim() || !url.trim()) {
      setError("Artist, title, and video URL are required.");
      return;
    }
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/artist-media`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId,
          campaignId: campaignId || null,
          kind,
          title: title.trim(),
          url: url.trim(),
          caption: caption.trim(),
          status: publish ? "published" : "draft",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save media.");
        return;
      }
      setTitle("");
      setUrl("");
      setCaption("");
      const artist = artists.find((a) => a.id === artistId);
      setHint(
        publish
          ? `Published. Public artist page: ${artist?.publicPath ?? "/a/…"}`
          : "Draft saved.",
      );
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(mediaId: string, status: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/artist-media`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Update failed.");
        return;
      }
      setHint(`Media → ${status}`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-2xl p-5 mb-6"
      style={{ background: KEBU.card, border: `1px solid ${KEBU.border}` }}
    >
      <h2 className="text-sm font-bold uppercase tracking-wider mb-1">Reels · Music videos</h2>
      <p className="mb-4 text-xs leading-relaxed" style={{ color: KEBU.muted }}>
        Attach YouTube / TikTok / Instagram / direct video links to an artist (and optional
        campaign). Publish to their public page — not a Studio editor.
      </p>

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Loading media…
        </p>
      ) : artists.length === 0 ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Add an artist in Artists · Press kits first.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <select
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              value={artistId}
              onChange={(e) => {
                setArtistId(e.target.value);
                setCampaignId("");
              }}
            >
              {artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.stage_name}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">No campaign linked</option>
              {artistCampaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              value={kind}
              onChange={(e) => setKind(e.target.value as keyof typeof MEDIA_KIND_LABELS)}
            >
              {(Object.keys(MEDIA_KIND_LABELS) as (keyof typeof MEDIA_KIND_LABELS)[]).map((k) => (
                <option key={k} value={k}>
                  {MEDIA_KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <input
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              placeholder="https://… YouTube / TikTok / Instagram / .mp4"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <input
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              placeholder="Caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void createMedia(false)}
                className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void createMedia(true)}
                className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                style={{ background: KEBU.orange }}
              >
                Publish
              </button>
            </div>
          </div>

          {media.length > 0 ? (
            <ul className="mt-5 space-y-2">
              {media.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">
                      {m.title}{" "}
                      <span className="font-normal opacity-60">
                        · {m.artistName} ·{" "}
                        {MEDIA_KIND_LABELS[m.kind as keyof typeof MEDIA_KIND_LABELS] ?? m.kind} ·{" "}
                        {MEDIA_PLATFORM_LABELS[m.platform as keyof typeof MEDIA_PLATFORM_LABELS] ??
                          m.platform}{" "}
                        · {m.status}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-2 text-[11px]">
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                        style={{ color: KEBU.orange }}
                      >
                        Open link
                      </a>
                      {m.status !== "published" ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="underline"
                          style={{ color: KEBU.orange }}
                          onClick={() => void setStatus(m.id, "published")}
                        >
                          Publish
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          className="underline opacity-70"
                          onClick={() => void setStatus(m.id, "archived")}
                        >
                          Archive
                        </button>
                      )}
                    </span>
                  </div>
                  {m.caption ? <p className="mt-1 text-xs opacity-70">{m.caption}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm" style={{ color: KEBU.muted }}>
              No reels or MVs yet.
            </p>
          )}
        </>
      )}

      {error ? <p className="mt-3 text-sm" style={{ color: "#8B1E1E" }}>{error}</p> : null}
      {hint ? (
        <p className="mt-3 break-all text-sm" style={{ color: KEBU.muted }}>
          {hint}
        </p>
      ) : null}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import { CAMPAIGN_CHANNEL_LABELS } from "@/lib/business/artist-campaigns";

type ArtistOpt = {
  id: string;
  stage_name: string;
  kits: { id: string; title: string; status: string }[];
};

type CampaignRow = {
  id: string;
  title: string;
  objective: string;
  brief: string;
  status: string;
  channels: string[];
  starts_on: string | null;
  ends_on: string | null;
  artistName: string;
  artist_id: string;
  pressKit: {
    id: string | null;
    title: string;
    status: string;
    publicPath: string | null;
  } | null;
};

const CHANNEL_KEYS = Object.keys(CAMPAIGN_CHANNEL_LABELS) as (keyof typeof CAMPAIGN_CHANNEL_LABELS)[];

/** Promo / release campaigns for signed artists — linked to press kits, not email blasts. */
export function BusinessArtistCampaignsPanel({ businessId }: { businessId: string }) {
  const [artists, setArtists] = useState<ArtistOpt[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [artistId, setArtistId] = useState("");
  const [pressKitId, setPressKitId] = useState("");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [brief, setBrief] = useState("");
  const [channels, setChannels] = useState<string[]>(["press", "instagram"]);
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aRes, cRes] = await Promise.all([
        fetch(`/api/businesses/${businessId}/artists`, { credentials: "include" }),
        fetch(`/api/businesses/${businessId}/artist-campaigns`, { credentials: "include" }),
      ]);
      const aData = await aRes.json().catch(() => ({}));
      const cData = await cRes.json().catch(() => ({}));
      if (!aRes.ok) {
        setError(
          typeof aData.error === "string"
            ? aData.error
            : "Could not load artists (apply 056).",
        );
      } else {
        const list = (aData.artists ?? []) as ArtistOpt[];
        setArtists(list);
        setArtistId((prev) => prev || list[0]?.id || "");
      }
      if (!cRes.ok) {
        setError(
          typeof cData.error === "string"
            ? cData.error
            : "Could not load campaigns (apply 057).",
        );
      } else {
        setCampaigns((cData.campaigns ?? []) as CampaignRow[]);
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

  useEffect(() => {
    const artist = artists.find((a) => a.id === artistId);
    const firstKit = artist?.kits?.[0];
    setPressKitId(firstKit?.id ?? "");
  }, [artistId, artists]);

  function toggleChannel(key: string) {
    setChannels((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key].slice(0, 12),
    );
  }

  async function createCampaign() {
    if (!artistId || !title.trim()) {
      setError("Pick an artist and add a title.");
      return;
    }
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/artist-campaigns`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId,
          pressKitId: pressKitId || null,
          title: title.trim(),
          objective: objective.trim(),
          brief: brief.trim(),
          channels,
          status: "draft",
          startsOn: startsOn || null,
          endsOn: endsOn || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create campaign.");
        return;
      }
      setTitle("");
      setObjective("");
      setBrief("");
      setHint("Campaign draft saved. Activate when the push starts.");
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(campaignId: string, status: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/artist-campaigns`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Update failed.");
        return;
      }
      setHint(`Campaign → ${status}`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const selectedArtist = artists.find((a) => a.id === artistId);
  const kits = selectedArtist?.kits ?? [];

  return (
    <section
      className="rounded-2xl p-5 mb-6"
      style={{ background: KEBU.card, border: `1px solid ${KEBU.border}` }}
    >
      <h2 className="text-sm font-bold uppercase tracking-wider mb-1">Artist campaigns</h2>
      <p className="mb-4 text-xs leading-relaxed" style={{ color: KEBU.muted }}>
        Plan a release or promo push for a signed artist. Link their press kit so the team shares one
        story. This is not the email list sender — reels / Studio posters come next.
      </p>

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Loading campaigns…
        </p>
      ) : artists.length === 0 ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Add an artist in Artists · Press kits first, then create a campaign here.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <select
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
            >
              {artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.stage_name}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              value={pressKitId}
              onChange={(e) => setPressKitId(e.target.value)}
            >
              <option value="">No press kit linked</option>
              {kits.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.title} ({k.status})
                </option>
              ))}
            </select>
            <input
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              placeholder="Campaign title (e.g. Single drop — May)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              placeholder="Objective (streams, press, tickets…)"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
            <textarea
              className="w-full rounded-md border px-2 py-1.5 text-xs min-h-[72px]"
              placeholder="Brief for the team"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {CHANNEL_KEYS.map((key) => {
                const on = channels.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleChannel(key)}
                    className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      border: `1px solid ${on ? KEBU.orange : KEBU.border}`,
                      background: on ? "#fff8f3" : "#fff",
                      color: KEBU.black,
                    }}
                  >
                    {CAMPAIGN_CHANNEL_LABELS[key]}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex flex-1 flex-col gap-1 text-[10px] uppercase tracking-wider opacity-60">
                Starts
                <input
                  type="date"
                  className="rounded-md border px-2 py-1.5 text-xs normal-case tracking-normal opacity-100"
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-[10px] uppercase tracking-wider opacity-60">
                Ends
                <input
                  type="date"
                  className="rounded-md border px-2 py-1.5 text-xs normal-case tracking-normal opacity-100"
                  value={endsOn}
                  onChange={(e) => setEndsOn(e.target.value)}
                />
              </label>
            </div>
            <button
              type="button"
              disabled={busy || !title.trim()}
              onClick={() => void createCampaign()}
              className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
              style={{ background: KEBU.orange }}
            >
              Save campaign draft
            </button>
          </div>

          {campaigns.length > 0 ? (
            <ul className="mt-5 space-y-2">
              {campaigns.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">
                      {c.title}{" "}
                      <span className="font-normal opacity-60">
                        · {c.artistName} · {c.status}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-2 text-[11px]">
                      {c.status !== "active" ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="underline"
                          style={{ color: KEBU.orange }}
                          onClick={() => void setStatus(c.id, "active")}
                        >
                          Activate
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          className="underline"
                          style={{ color: KEBU.orange }}
                          onClick={() => void setStatus(c.id, "paused")}
                        >
                          Pause
                        </button>
                      )}
                      {c.status !== "done" ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="underline opacity-70"
                          onClick={() => void setStatus(c.id, "done")}
                        >
                          Mark done
                        </button>
                      ) : null}
                    </span>
                  </div>
                  {c.objective ? <p className="mt-1 text-xs opacity-70">{c.objective}</p> : null}
                  {c.channels?.length ? (
                    <p className="mt-1 text-[11px] opacity-60">
                      {(c.channels as string[])
                        .map((ch) => CAMPAIGN_CHANNEL_LABELS[ch as keyof typeof CAMPAIGN_CHANNEL_LABELS] ?? ch)
                        .join(" · ")}
                    </p>
                  ) : null}
                  {c.pressKit ? (
                    <p className="mt-1 text-[11px]">
                      Press kit: {c.pressKit.title}
                      {c.pressKit.publicPath ? (
                        <>
                          {" · "}
                          <a
                            href={c.pressKit.publicPath}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                            style={{ color: KEBU.orange }}
                          >
                            Open
                          </a>
                        </>
                      ) : (
                        <span className="opacity-60"> · not published yet</span>
                      )}
                    </p>
                  ) : null}
                  {(c.starts_on || c.ends_on) && (
                    <p className="mt-1 text-[11px] opacity-50">
                      {c.starts_on ?? "?"} → {c.ends_on ?? "?"}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm" style={{ color: KEBU.muted }}>
              No artist campaigns yet.
            </p>
          )}
        </>
      )}

      {error ? <p className="mt-3 text-sm" style={{ color: "#8B1E1E" }}>{error}</p> : null}
      {hint ? (
        <p className="mt-3 text-sm" style={{ color: KEBU.muted }}>
          {hint}
        </p>
      ) : null}
    </section>
  );
}

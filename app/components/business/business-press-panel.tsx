"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type KitSummary = {
  id: string;
  public_id: string;
  title: string;
  status: string;
  publicPath: string;
};

type ArtistRow = {
  id: string;
  stage_name: string;
  slug: string;
  bio_short: string;
  hometown: string;
  status: string;
  publicPath: string;
  kits: KitSummary[];
};

type KitBody = {
  headline: string;
  bio: string;
  bookingEmail: string;
  bookingPhone: string;
  quotes: { quote: string; source: string }[];
  facts: { label: string; value: string }[];
  assets: { title: string; url: string; kind: string; caption: string }[];
};

/**
 * Agency artists + structured press kits (JSON in Supabase, public /k/{id}).
 */
export function BusinessPressPanel({ businessId }: { businessId: string }) {
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [stageName, setStageName] = useState("");
  const [bioShort, setBioShort] = useState("");
  const [hometown, setHometown] = useState("");

  const [selectedArtistId, setSelectedArtistId] = useState<string>("");
  const [kitTitle, setKitTitle] = useState("Electronic press kit");
  const [kitBio, setKitBio] = useState("");
  const [kitHeadline, setKitHeadline] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [assetTitle, setAssetTitle] = useState("");
  const [assetUrl, setAssetUrl] = useState("");
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  /** Last loaded kit body — preserved on save so draft edits do not wipe assets/quotes. */
  const [loadedKit, setLoadedKit] = useState<KitBody | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/artists`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load artists.");
        return;
      }
      const list = (data.artists ?? []) as ArtistRow[];
      setArtists(list);
      setSelectedArtistId((prev) => prev || list[0]?.id || "");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createArtist() {
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/artists`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageName,
          bioShort,
          hometown,
          status: "active",
          genres: [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create artist.");
        return;
      }
      setStageName("");
      setBioShort("");
      setHometown("");
      setHint(`Artist ${data.artist?.stage_name} saved.`);
      setSelectedArtistId(data.artist?.id ?? "");
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function loadKitIntoForm(kitId: string) {
    try {
      const res = await fetch(`/api/businesses/${businessId}/press-kits`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const kit = (data.kits as { id: string; title: string; kit: KitBody }[] | undefined)?.find(
        (k) => k.id === kitId,
      );
      if (!kit) return;
      setEditingKitId(kit.id);
      setKitTitle(kit.title);
      setKitHeadline(kit.kit.headline || "");
      setKitBio(kit.kit.bio || "");
      setBookingEmail(kit.kit.bookingEmail || "");
      setLoadedKit(kit.kit);
    } catch {
      /* keep form as-is */
    }
  }

  function kitPayload(): KitBody {
    const selected = artists.find((a) => a.id === selectedArtistId);
    const base = loadedKit ?? {
      headline: "",
      bio: "",
      bookingEmail: "",
      bookingPhone: "",
      quotes: [] as KitBody["quotes"],
      facts: [] as KitBody["facts"],
      assets: [] as KitBody["assets"],
    };
    const nextAssets = [...(base.assets ?? [])];
    if (assetTitle.trim() && assetUrl.trim()) {
      nextAssets.push({
        title: assetTitle.trim(),
        url: assetUrl.trim(),
        kind: "photo",
        caption: "",
      });
    }
    const facts =
      base.facts?.length
        ? base.facts
        : selected?.hometown
          ? [{ label: "Based in", value: selected.hometown }]
          : [];
    return {
      headline: kitHeadline.trim() || `${selected?.stage_name ?? "Artist"} — Press kit`,
      bio: kitBio.trim(),
      bookingEmail: bookingEmail.trim(),
      bookingPhone: base.bookingPhone || "",
      quotes: base.quotes ?? [],
      facts,
      assets: nextAssets,
    };
  }

  async function createOrPublishKit(publish: boolean) {
    if (!selectedArtistId) {
      setError("Create or select an artist first.");
      return;
    }
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      if (editingKitId) {
        const res = await fetch(`/api/businesses/${businessId}/press-kits`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kitId: editingKitId,
            title: kitTitle,
            status: publish ? "published" : "draft",
            kit: kitPayload(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Could not update kit.");
          return;
        }
        setLoadedKit(data.kit?.kit ?? kitPayload());
        setHint(
          publish
            ? `Published: ${typeof window !== "undefined" ? window.location.origin : ""}${data.kit?.publicPath}`
            : "Draft saved.",
        );
      } else {
        const res = await fetch(`/api/businesses/${businessId}/press-kits`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artistId: selectedArtistId,
            title: kitTitle,
            status: publish ? "published" : "draft",
            kit: kitPayload(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Could not create kit.");
          return;
        }
        setEditingKitId(data.kit?.id ?? null);
        setLoadedKit(data.kit?.kit ?? kitPayload());
        setHint(
          publish
            ? `Published: ${typeof window !== "undefined" ? window.location.origin : ""}${data.kit?.publicPath}`
            : "Draft press kit created.",
        );
      }
      setAssetTitle("");
      setAssetUrl("");
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function publishExisting(kitId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/press-kits`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kitId, status: "published" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Publish failed.");
        return;
      }
      setHint(`Live at ${data.kit?.publicPath}`);
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
      <h2 className="text-sm font-bold uppercase tracking-wider mb-1">Artists · Press kits</h2>
      <p className="mb-4 text-xs leading-relaxed" style={{ color: KEBU.muted }}>
        Add signed talent, then build a structured press kit (bio, facts, asset links). Publish to a
        public page journalists can open — not a fake PDF dump. Reels / MVs live in the panel below.
      </p>

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Loading artists…
        </p>
      ) : (
        <>
          <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: KEBU.faint }}>
            Add artist
          </h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input
              className="rounded-md border px-2 py-1.5 text-xs flex-1 min-w-[140px]"
              placeholder="Stage name"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
            />
            <input
              className="rounded-md border px-2 py-1.5 text-xs flex-1 min-w-[120px]"
              placeholder="Hometown"
              value={hometown}
              onChange={(e) => setHometown(e.target.value)}
            />
            <input
              className="rounded-md border px-2 py-1.5 text-xs flex-[2] min-w-[180px]"
              placeholder="Short bio"
              value={bioShort}
              onChange={(e) => setBioShort(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !stageName.trim()}
              onClick={() => void createArtist()}
              className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
              style={{ background: KEBU.orange }}
            >
              Save artist
            </button>
          </div>

          {artists.length > 0 ? (
            <>
              <h3
                className="mt-5 text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{ color: KEBU.faint }}
              >
                Roster
              </h3>
              <ul className="mb-4 space-y-2 text-sm">
                {artists.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg px-3 py-2"
                    style={{
                      background: selectedArtistId === a.id ? "#fff8f3" : KEBU.cream,
                      border: `1px solid ${selectedArtistId === a.id ? KEBU.orange : KEBU.border}`,
                    }}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        setSelectedArtistId(a.id);
                        setAssetTitle("");
                        setAssetUrl("");
                        if (a.kits[0]) {
                          void loadKitIntoForm(a.kits[0].id);
                        } else {
                          setEditingKitId(null);
                          setLoadedKit(null);
                          setKitTitle("Electronic press kit");
                          setKitHeadline(`${a.stage_name} — Press kit`);
                          setKitBio(a.bio_short || "");
                          setBookingEmail("");
                        }
                      }}
                    >
                      <span className="font-semibold" style={{ color: KEBU.black }}>
                        {a.stage_name}
                      </span>
                      <span className="opacity-60"> · {a.status}</span>
                      {a.hometown ? <span className="opacity-60"> · {a.hometown}</span> : null}
                      {a.status === "active" && a.publicPath ? (
                        <a
                          href={a.publicPath}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 text-[11px] underline"
                          style={{ color: KEBU.orange }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Public page
                        </a>
                      ) : null}
                    </button>
                    {a.kits.length ? (
                      <ul className="mt-1 space-y-1 text-[11px]">
                        {a.kits.map((k) => (
                          <li key={k.id} className="flex flex-wrap items-center gap-2">
                            <span>
                              {k.title} · {k.status}
                            </span>
                            {k.status === "published" ? (
                              <a
                                href={k.publicPath}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                                style={{ color: KEBU.orange }}
                              >
                                Open public kit
                              </a>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                className="underline"
                                style={{ color: KEBU.orange }}
                                onClick={() => void publishExisting(k.id)}
                              >
                                Publish
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-[11px] opacity-60">No press kit yet — create one below.</p>
                    )}
                  </li>
                ))}
              </ul>

              <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: KEBU.faint }}>
                Press kit {editingKitId ? "(editing)" : "(new)"}
              </h3>
              <div className="space-y-2">
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-xs"
                  placeholder="Kit title"
                  value={kitTitle}
                  onChange={(e) => setKitTitle(e.target.value)}
                />
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-xs"
                  placeholder="Headline"
                  value={kitHeadline}
                  onChange={(e) => setKitHeadline(e.target.value)}
                />
                <textarea
                  className="w-full rounded-md border px-2 py-1.5 text-xs min-h-[88px]"
                  placeholder="Approved press bio"
                  value={kitBio}
                  onChange={(e) => setKitBio(e.target.value)}
                />
                <input
                  className="w-full rounded-md border px-2 py-1.5 text-xs"
                  placeholder="Booking email"
                  type="email"
                  value={bookingEmail}
                  onChange={(e) => setBookingEmail(e.target.value)}
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="rounded-md border px-2 py-1.5 text-xs flex-1"
                    placeholder="Asset title (photo / one-sheet)"
                    value={assetTitle}
                    onChange={(e) => setAssetTitle(e.target.value)}
                  />
                  <input
                    className="rounded-md border px-2 py-1.5 text-xs flex-[2]"
                    placeholder="https://… asset URL"
                    value={assetUrl}
                    onChange={(e) => setAssetUrl(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy || !selectedArtistId}
                    onClick={() => void createOrPublishKit(false)}
                    className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                    style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    disabled={busy || !selectedArtistId}
                    onClick={() => void createOrPublishKit(true)}
                    className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                    style={{ background: KEBU.orange }}
                  >
                    Publish kit
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm" style={{ color: KEBU.muted }}>
              No artists yet. Add May Lecor or the next signing above.
            </p>
          )}
        </>
      )}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {hint ? (
        <p className="mt-3 break-all text-sm" style={{ color: KEBU.muted }}>
          {hint}
        </p>
      ) : null}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { BUILDER } from "@/lib/create/builder-ui";

type Provider = "instagram" | "tiktok" | "youtube" | "pinterest" | "twitter" | "whatsapp";

type Row = {
  id: string;
  provider: Provider;
  label: string;
  status: string;
  public_config: Record<string, unknown>;
  updated_at: string;
};

type FeedCard = {
  id: Provider;
  name: string;
  tagline: string;
  sectionHint: string;
  field: "handle" | "url" | "number";
  placeholder: string;
  color: string;
  icon: React.ReactNode;
};

const FEEDS: FeedCard[] = [
  {
    id: "instagram",
    name: "Instagram",
    tagline: "Photo & Reel grid",
    sectionHint: "Adds a live photo grid from your profile",
    field: "handle",
    placeholder: "@yourbrand",
    color: "#E1306C",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "tiktok",
    name: "TikTok",
    tagline: "Short-video feed",
    sectionHint: "Embeds your latest TikToks on the page",
    field: "handle",
    placeholder: "@yourbrand",
    color: "#010101",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.54a8.17 8.17 0 004.78 1.54V7.63a4.84 4.84 0 01-1.01-.94z" />
      </svg>
    ),
  },
  {
    id: "youtube",
    name: "YouTube",
    tagline: "Channel & latest video",
    sectionHint: "Shows your channel and pins a featured video",
    field: "url",
    placeholder: "https://youtube.com/@channel",
    color: "#FF0000",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M22 8s-.2-1.5-.9-2.1c-.8-.9-1.7-.9-2.2-.9C16.5 4.9 12 4.9 12 4.9s-4.5 0-6.9.1c-.5 0-1.4 0-2.2.9C2.2 6.5 2 8 2 8S1.8 9.7 1.8 11.4v1.6C1.8 14.7 2 16.4 2 16.4s.2 1.5.9 2.1c.8.9 1.9.8 2.3.9C6.5 19.5 12 19.5 12 19.5s4.5 0 6.9-.1c.5 0 1.4 0 2.2-.9.7-.6.9-2.1.9-2.1s.2-1.7.2-3.4v-1.6C22.2 9.7 22 8 22 8z" strokeLinejoin="round" />
        <polygon points="10,9 15.5,12 10,15" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "pinterest",
    name: "Pinterest",
    tagline: "Inspiration board",
    sectionHint: "Embeds a curated pin board on your site",
    field: "url",
    placeholder: "https://pinterest.com/yourbrand",
    color: "#E60023",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.63 7.88 6.36 9.37-.09-.8-.17-2.03.04-2.9.18-.79 1.23-5.2 1.23-5.2s-.32-.63-.32-1.57c0-1.47.85-2.57 1.91-2.57.9 0 1.34.68 1.34 1.49 0 .91-.58 2.27-.88 3.53-.25 1.05.52 1.9 1.55 1.9 1.87 0 3.12-2.4 3.12-5.24 0-2.16-1.46-3.67-3.55-3.67-2.42 0-3.84 1.82-3.84 3.7 0 .73.28 1.52.63 1.95.07.08.08.15.06.24-.06.27-.2.85-.23.97-.04.15-.13.18-.3.11-1.13-.52-1.83-2.17-1.83-3.49 0-2.84 2.06-5.44 5.93-5.44 3.12 0 5.55 2.22 5.55 5.19 0 3.09-1.95 5.58-4.65 5.58-.91 0-1.76-.47-2.05-1.03l-.56 2.09c-.2.79-.75 1.77-1.12 2.37.85.26 1.74.4 2.67.4 5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "twitter",
    name: "X / Twitter",
    tagline: "Latest posts",
    sectionHint: "Shows your latest posts in a timeline widget",
    field: "handle",
    placeholder: "@yourbrand",
    color: "#000000",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.24 3h3.31L14.52 10.8 22.71 21H16.3l-4.93-6.44L5.88 21H2.56l7.5-8.42L2.07 3h6.55l4.46 5.9L18.24 3zM17.1 19h1.84L7.03 5H5.07L17.1 19z" />
      </svg>
    ),
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    tagline: "Chat & order button",
    sectionHint: "Adds a floating chat button + click-to-order link",
    field: "number",
    placeholder: "+221 XX XXX XX XX",
    color: "#25D366",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 2a10 10 0 00-8.55 15.18L2 22l4.98-1.42A10 10 0 1012 2z" />
        <path d="M8.5 10.5s.7 1.5 2 2.8c1.3 1.3 2.8 2 2.8 2l1.7-1.7s.6-.5 1.3-.1l2 1c.7.4.5 1.2.5 1.2S18 17 16 17c-3 0-6-2.5-7.5-4S6 7 6 7s0-2 1.3-2.8c0 0 .8-.2 1.2.5l1 2c.4.7-.1 1.3-.1 1.3L8.5 10.5z" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function BuilderConnectionsPanel({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Provider | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/connections`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Could not load."); setLoading(false); return; }
    setRows(data.connections ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [projectId]);

  function openFeed(feed: FeedCard) {
    const existing = rows.find((r) => r.provider === feed.id);
    setDraft(existing ? String(existing.public_config?.[feed.field] ?? "") : "");
    setActive(feed.id);
    setError(null);
  }

  async function save() {
    if (!active) return;
    const feed = FEEDS.find((f) => f.id === active)!;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/connections`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: feed.id, label: feed.name, status: "configured", publicConfig: { [feed.field]: draft.trim() } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Could not save."); setSaving(false); return; }
    await load();
    setActive(null);
    setSaving(false);
  }

  async function remove(provider: Provider) {
    await fetch(`/api/projects/${projectId}/connections`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    await load();
    setActive(null);
  }

  const activeFeed = FEEDS.find((f) => f.id === active);
  const activeRow = rows.find((r) => r.provider === active);

  return (
    <div>
      {/* Header */}
      <div className="border-b px-4 py-4" style={{ borderColor: BUILDER.border }}>
        <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: BUILDER.orange }}>
          Connect
        </p>
        <p className="mt-0.5 text-[14px] font-bold leading-tight" style={{ color: BUILDER.ink }}>
          Social feeds on your site
        </p>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: BUILDER.muted }}>
          Link a social account and embed a live gallery or feed directly on your page — not just a follow button.
        </p>
      </div>

      {error ? (
        <div className="mx-3 mt-3 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ background: "#FFF1F0", color: "#B91C1C", border: "1px solid #FECACA" }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="px-4 py-6 text-center text-[11px]" style={{ color: BUILDER.muted }}>Loading…</div>
      ) : (
        <div className="space-y-2 p-3">
          {FEEDS.map((feed) => {
            const connected = rows.find((r) => r.provider === feed.id);
            const isActive = active === feed.id;

            return (
              <div key={feed.id}>
                {/* Feed card */}
                <button
                  type="button"
                  onClick={() => isActive ? setActive(null) : openFeed(feed)}
                  className="group w-full rounded-xl p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00] transition-all"
                  style={{
                    background: isActive ? "#FFF8F4" : BUILDER.surfaceMuted,
                    border: `1.5px solid ${isActive ? "#FF6A00" : connected ? feed.color + "44" : BUILDER.border}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: feed.color + "18", color: feed.color }}
                    >
                      {feed.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-bold" style={{ color: BUILDER.ink }}>{feed.name}</p>
                        {connected ? (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide"
                            style={{ background: feed.color + "20", color: feed.color }}
                          >
                            Connected
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[10px]" style={{ color: BUILDER.muted }}>{feed.tagline}</p>
                    </div>

                    {/* Arrow */}
                    <svg
                      className="shrink-0 transition-transform"
                      style={{ color: BUILDER.muted, transform: isActive ? "rotate(90deg)" : "rotate(0deg)" }}
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    >
                      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>

                {/* Expanded config */}
                {isActive && activeFeed ? (
                  <div
                    className="rounded-b-xl px-3 pb-3 pt-2"
                    style={{ background: "#FFF8F4", borderLeft: "1.5px solid #FF6A00", borderRight: "1.5px solid #FF6A00", borderBottom: "1.5px solid #FF6A00" }}
                  >
                    {/* What this does */}
                    <div
                      className="mb-3 flex items-start gap-2 rounded-lg px-2.5 py-2"
                      style={{ background: activeFeed.color + "12" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" style={{ color: activeFeed.color }}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                      </svg>
                      <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.ink }}>
                        {activeFeed.sectionHint}. After saving, go to <strong>Build → Add section</strong> to place it on your page.
                      </p>
                    </div>

                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: BUILDER.muted }}>
                      {activeFeed.field === "handle" ? "Handle" : activeFeed.field === "number" ? "Phone number" : "URL"}
                    </label>
                    <input
                      className="w-full rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#FF6A00]"
                      style={{ border: `1.5px solid ${BUILDER.border}`, background: "#fff" }}
                      value={draft}
                      placeholder={activeFeed.placeholder}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void save(); if (e.key === "Escape") setActive(null); }}
                      autoFocus
                      disabled={saving}
                    />

                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={saving || !draft.trim()}
                        onClick={() => void save()}
                        className="rounded-lg px-4 py-1.5 text-[10px] font-bold text-white disabled:opacity-40"
                        style={{ background: BUILDER.ink }}
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActive(null)}
                        className="text-[10px]"
                        style={{ color: BUILDER.muted }}
                      >
                        Cancel
                      </button>
                      {activeRow ? (
                        <button
                          type="button"
                          onClick={() => void remove(activeFeed.id)}
                          className="ml-auto text-[10px] font-semibold"
                          style={{ color: "#DC2626" }}
                        >
                          Disconnect
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer tip */}
      {!loading && (
        <div
          className="mx-3 mb-3 mt-1 rounded-xl px-3 py-3"
          style={{ background: BUILDER.surfaceMuted, border: `1px solid ${BUILDER.border}` }}
        >
          <p className="text-[9px] font-black uppercase tracking-[0.12em] mb-1" style={{ color: BUILDER.muted }}>How it works</p>
          <ol className="space-y-1">
            {["Connect your account above", "Go to Build → Add section", "Choose the matching social feed section"].map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-black text-white"
                  style={{ background: BUILDER.orange }}
                >
                  {i + 1}
                </span>
                <p className="text-[10px]" style={{ color: BUILDER.ink }}>{step}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

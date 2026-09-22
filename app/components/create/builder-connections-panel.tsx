"use client";

import { useEffect, useRef, useState } from "react";
import { BUILDER } from "@/lib/create/builder-ui";
import { GalaxyPanelHeader, GalaxyStatus } from "@/app/components/galaxy/editor-primitives";

type Provider = "instagram" | "tiktok" | "youtube" | "whatsapp" | "maps" | "analytics" | "custom";
type Row = {
  id: string;
  provider: Provider;
  label: string;
  status: string;
  public_config: Record<string, unknown>;
  updated_at: string;
};

const PROVIDERS: Array<{
  id: Provider;
  label: string;
  hint: string;
  field: string;
  placeholder: string;
  emoji: string;
}> = [
  { id: "instagram", label: "Instagram", hint: "Social grids and profile links.", field: "handle", placeholder: "@yourbrand", emoji: "📸" },
  { id: "tiktok", label: "TikTok", hint: "TikTok links and feed extensions.", field: "handle", placeholder: "@yourbrand", emoji: "🎵" },
  { id: "youtube", label: "YouTube", hint: "Channel and video content.", field: "url", placeholder: "https://youtube.com/@...", emoji: "▶️" },
  { id: "whatsapp", label: "WhatsApp", hint: "Chat and order actions.", field: "number", placeholder: "+221...", emoji: "💬" },
  { id: "maps", label: "Maps", hint: "Public place or map URL.", field: "url", placeholder: "https://maps.google.com/...", emoji: "📍" },
  { id: "analytics", label: "Analytics", hint: "Public measurement identifier.", field: "measurementId", placeholder: "Measurement ID", emoji: "📊" },
  { id: "custom", label: "Custom", hint: "Any public endpoint or account reference.", field: "value", placeholder: "Public URL or identifier", emoji: "🔗" },
];

export function BuilderConnectionsPanel({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [tooltip, setTooltip] = useState<Provider | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/connections`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Could not load connections."); setLoading(false); return; }
    setRows(data.connections ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [projectId]);

  function openProvider(p: typeof PROVIDERS[number]) {
    const existing = rows.find((r) => r.provider === p.id);
    setDraftValue(existing ? String(existing.public_config?.[p.field] ?? "") : "");
    setActiveProvider(p.id);
    setError(null);
  }

  async function save() {
    if (!activeProvider) return;
    const p = PROVIDERS.find((x) => x.id === activeProvider)!;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/connections`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: p.id, label: p.label, status: "configured", publicConfig: { [p.field]: draftValue.trim() } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || "Could not save connection."); setSaving(false); return; }
    await load();
    setActiveProvider(null);
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
    setActiveProvider(null);
  }

  const activeProviderDef = PROVIDERS.find((p) => p.id === activeProvider);
  const activeRow = rows.find((r) => r.provider === activeProvider);

  return (
    <div>
      <GalaxyPanelHeader
        eyebrow="Connect"
        title="Connections"
        description="Link outside services to this site — social, messaging, maps, analytics. Public identifiers only; private secrets never live here."
      />

      {error ? (
        <div className="mx-3 mb-3">
          <GalaxyStatus tone="error">{error}</GalaxyStatus>
        </div>
      ) : null}

      {loading ? (
        <div className="px-3 pb-3">
          <GalaxyStatus tone="neutral">Loading connections…</GalaxyStatus>
        </div>
      ) : (
        <div className="px-3 pb-3">
          {/* 4-col icon grid */}
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
          >
            {PROVIDERS.map((p) => {
              const connected = rows.some((r) => r.provider === p.id);
              const isActive = activeProvider === p.id;
              const showTip = tooltip === p.id;

              return (
                <div key={p.id} className="relative">
                  <button
                    type="button"
                    title={p.label}
                    onMouseEnter={() => {
                      clearTimeout(tooltipTimer.current);
                      tooltipTimer.current = setTimeout(() => setTooltip(p.id), 300);
                    }}
                    onMouseLeave={() => { clearTimeout(tooltipTimer.current); setTooltip(null); }}
                    onClick={() => openProvider(p)}
                    className="relative flex h-[52px] w-full flex-col items-center justify-center gap-0.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00] transition-colors"
                    style={{
                      background: isActive ? BUILDER.orangeGlow : connected ? "#F0FDF4" : BUILDER.surfaceMuted,
                      border: `1.5px solid ${isActive ? "#FF6A00" : connected ? "#BBF7D0" : BUILDER.border}`,
                    }}
                  >
                    <span className="text-[22px] leading-none">{p.emoji}</span>
                    <span className="text-[8px] font-semibold leading-none tracking-tight" style={{ color: isActive ? BUILDER.orange : BUILDER.muted }}>
                      {p.label}
                    </span>
                    {connected ? (
                      <span
                        className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-black text-white"
                        style={{ background: "#16A34A" }}
                      >
                        ✓
                      </span>
                    ) : null}
                  </button>

                  {/* Hover tooltip */}
                  {showTip ? (
                    <div
                      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-44 -translate-x-1/2 rounded-xl px-3 py-2 shadow-xl"
                      style={{ background: BUILDER.ink, color: "#fff" }}
                    >
                      <p className="text-[10px] font-bold">{p.label}</p>
                      <p className="mt-0.5 text-[9px] leading-snug opacity-75">{p.hint}</p>
                      {connected ? (
                        <p className="mt-1 text-[9px] font-semibold" style={{ color: "#4ADE80" }}>Connected</p>
                      ) : null}
                      <div
                        className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2"
                        style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `6px solid ${BUILDER.ink}` }}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Inline edit form for active provider */}
          {activeProviderDef ? (
            <div
              className="mt-3 rounded-xl p-3"
              style={{ background: BUILDER.surfaceMuted, border: `1px solid ${BUILDER.border}` }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[18px]">{activeProviderDef.emoji}</span>
                <p className="text-[11px] font-bold" style={{ color: BUILDER.ink }}>{activeProviderDef.label}</p>
                <p className="ml-auto text-[9px]" style={{ color: BUILDER.muted }}>{activeProviderDef.hint}</p>
              </div>
              <input
                className="w-full rounded-lg px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-[#FF6A00]"
                style={{ border: `1px solid ${BUILDER.border}`, background: "#fff" }}
                value={draftValue}
                placeholder={activeProviderDef.placeholder}
                onChange={(e) => setDraftValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void save(); if (e.key === "Escape") setActiveProvider(null); }}
                autoFocus
                disabled={saving}
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving || !draftValue.trim()}
                  onClick={() => void save()}
                  className="rounded-lg px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-40"
                  style={{ background: BUILDER.ink }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveProvider(null)}
                  className="text-[10px]"
                  style={{ color: BUILDER.muted }}
                >
                  Cancel
                </button>
                {activeRow ? (
                  <button
                    type="button"
                    onClick={() => void remove(activeProviderDef.id)}
                    className="ml-auto text-[10px] font-semibold"
                    style={{ color: "#DC2626" }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

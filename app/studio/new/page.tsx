"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { StudioEcosystemStrip } from "@/app/components/studio/studio-ecosystem-strip";
import {
  STUDIO_CREATE_PRESETS,
  blankCanvasForPreset,
  blankDesignTitle,
  getCreatePreset,
  type StudioCreatePreset,
} from "@/lib/studio/create-presets";
import { KEBU } from "@/lib/kebu-brand";
import type { StudioCreationMode } from "@/lib/studio/coach";

const PRESET_ACCENTS: Record<string, string> = {
  instagram_post: "#E1306C",
  instagram_story: "#FF5500",
  whatsapp_status: "#25D366",
  facebook_post: "#1877F2",
  social_square: "#9333EA",
  flyer: "#0EA5E9",
  poster: "#9333EA",
  banner: "#F59E0B",
  business_card: "#10B981",
};

function CanvasThumb({ preset }: { preset: StudioCreatePreset }) {
  const accent = PRESET_ACCENTS[preset.id] ?? KEBU.orange;
  const aspect = preset.width / preset.height;
  const thumbW = 56;
  const thumbH = Math.min(Math.round(thumbW / aspect), 80);
  const id = accent.replace("#", "");
  return (
    <svg
      width={thumbW}
      height={thumbH}
      viewBox={`0 0 ${thumbW} ${thumbH}`}
      style={{ display: "block", borderRadius: 4, flexShrink: 0 }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`thumb-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#050505" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect width={thumbW} height={thumbH} fill={`url(#thumb-${id})`} />
      <line x1={thumbW * 0.33} y1="0" x2={thumbW * 0.33} y2={thumbH} stroke="white" strokeOpacity="0.07" strokeWidth="0.5" />
      <line x1={thumbW * 0.66} y1="0" x2={thumbW * 0.66} y2={thumbH} stroke="white" strokeOpacity="0.07" strokeWidth="0.5" />
      <rect x="5" y={thumbH * 0.25} width={thumbW * 0.55} height="4" rx="2" fill="white" fillOpacity="0.75" />
      <rect x="5" y={thumbH * 0.42} width={thumbW * 0.38} height="3" rx="1.5" fill="white" fillOpacity="0.4" />
    </svg>
  );
}

function PresetCard({
  preset,
  busy,
  onClick,
}: {
  preset: StudioCreatePreset;
  busy: boolean;
  onClick: () => void;
}) {
  const accent = PRESET_ACCENTS[preset.id] ?? KEBU.orange;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="text-left rounded-2xl flex items-center gap-3 px-4 py-3 transition-all disabled:opacity-50"
      style={{
        background: KEBU.white,
        border: `1px solid ${KEBU.border}`,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = accent; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = KEBU.border; }}
    >
      <CanvasThumb preset={preset} />
      <div className="min-w-0">
        <p className="text-sm font-bold" style={{ color: KEBU.black }}>
          {preset.label}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: KEBU.muted }}>
          {preset.description}
        </p>
      </div>
    </button>
  );
}

function NewStudioDesignInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [tab, setTab] = useState<"blank" | "ai">("blank");
  const [creationMode, setCreationMode] = useState<StudioCreationMode>("create_for_me");
  const [businessName, setBusinessName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (search.get("tab") === "ai") setTab("ai");
    if (search.get("mode") === "teach_me") setCreationMode("teach_me");
  }, [search]);

  async function createBlank(presetId: string) {
    const preset = getCreatePreset(presetId);
    if (!preset) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = blankCanvasForPreset(preset);
      const name = businessName.trim();
      if (name) {
        const patchLayers = (layers: typeof canvas.layers) =>
          layers.map((l) => (l.name === "Business" ? { ...l, text: name } : l));
        canvas.layers = patchLayers(canvas.layers);
        canvas.pages = canvas.pages.map((p) => ({ ...p, layers: patchLayers(p.layers) }));
      }
      const res = await fetch("/api/create/designs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: blankDesignTitle(preset),
          designType: preset.designType,
          canvas,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create design.");
        return;
      }
      router.push(`/studio/${data.design.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function createFromAi(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/studio/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          businessName: businessName.trim() || undefined,
          creationMode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not generate designs.");
        return;
      }
      const designs = Array.isArray(data.designs) ? data.designs : [];
      if (!designs.length) {
        setError("No designs returned.");
        return;
      }
      if (data.fallback && !data.usedAi) {
        setNote("AI generation fell back — you still got editable template-based designs.");
      }
      if (typeof data.historyWarning === "string") {
        setNote(data.historyWarning);
      }
      router.push(`/studio/${designs[0].id}`);
    } finally {
      setBusy(false);
    }
  }

  // WhatsApp-first ordering: wa_status first, then rest
  const social = [
    ...STUDIO_CREATE_PRESETS.filter((p) => p.id === "whatsapp_status"),
    ...STUDIO_CREATE_PRESETS.filter((p) => p.group === "social" && p.id !== "whatsapp_status"),
  ];
  const print = STUDIO_CREATE_PRESETS.filter((p) => p.group === "print");
  const web = STUDIO_CREATE_PRESETS.filter((p) => p.group === "web");

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: KEBU.cream }}>
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/studio" className="text-sm font-semibold" style={{ color: KEBU.muted }}>
          ← Studio
        </Link>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-2" style={{ color: KEBU.orange }}>
            Kebu Studio
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
            What are you creating?
          </h1>
          <p className="text-sm mt-2" style={{ color: KEBU.muted }}>
            Blank, templates, or AI — then ship into Builder, Shop, and Reach.
          </p>
        </div>

        <StudioEcosystemStrip />

        {/* Tabs */}
        <div className="flex gap-1" style={{ borderBottom: `1px solid ${KEBU.border}` }}>
          {(
            [
              ["blank", "Blank size"],
              ["ai", "AI campaign"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="px-4 py-2 text-sm font-bold -mb-px"
              style={{
                borderBottom: tab === id ? `2px solid ${KEBU.orange}` : "2px solid transparent",
                color: tab === id ? KEBU.orange : KEBU.muted,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Business name — shared between tabs */}
        <label className="block text-sm font-semibold" style={{ color: KEBU.black }}>
          Business name{" "}
          <span className="font-normal" style={{ color: KEBU.muted }}>
            (optional — pre-fills your design)
          </span>
          <input
            className="mt-1 w-full rounded-xl px-3 py-2 text-sm"
            style={{
              background: KEBU.white,
              border: `1px solid ${KEBU.border}`,
              color: KEBU.black,
            }}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Baobab Glow"
          />
        </label>

        {tab === "blank" ? (
          <div className="space-y-5">
            {social.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  Social &amp; messaging
                </h2>
                <div className="grid sm:grid-cols-2 gap-2">
                  {social.map((p) => (
                    <PresetCard
                      key={p.id}
                      preset={p}
                      busy={busy}
                      onClick={() => void createBlank(p.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {print.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  Print
                </h2>
                <div className="grid sm:grid-cols-2 gap-2">
                  {print.map((p) => (
                    <PresetCard
                      key={p.id}
                      preset={p}
                      busy={busy}
                      onClick={() => void createBlank(p.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {web.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  Web
                </h2>
                <div className="grid sm:grid-cols-2 gap-2">
                  {web.map((p) => (
                    <PresetCard
                      key={p.id}
                      preset={p}
                      busy={busy}
                      onClick={() => void createBlank(p.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {busy && (
              <p className="text-xs text-center py-2" style={{ color: KEBU.muted }}>
                Creating your canvas…
              </p>
            )}

            <p className="text-xs" style={{ color: KEBU.faint }}>
              Prefer templates?{" "}
              <Link href="/studio/templates" className="font-semibold underline" style={{ color: KEBU.orange }}>
                Browse templates
              </Link>
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => void createFromAi(e)}
            className="space-y-4 rounded-2xl p-6"
            style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: KEBU.muted }}>
                How should Kebu help?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["create_for_me", "Do it for me", "Kebu builds editable designs. You tweak and ship."],
                    ["teach_me", "Teach me", "Same designs — plus why each choice (learn by building)."],
                  ] as const
                ).map(([mode, title, desc]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCreationMode(mode)}
                    className="rounded-2xl px-3 py-3 text-left"
                    style={{
                      border: creationMode === mode ? `1.5px solid ${KEBU.orange}` : `1px solid ${KEBU.border}`,
                      background: creationMode === mode ? "#FFF8F0" : KEBU.white,
                    }}
                  >
                    <span className="text-sm font-bold block" style={{ color: KEBU.black }}>{title}</span>
                    <span className="block text-[11px] mt-1 leading-snug" style={{ color: KEBU.muted }}>{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-sm font-semibold" style={{ color: KEBU.black }}>
              What do you need?
              <textarea
                required
                minLength={8}
                maxLength={800}
                rows={4}
                className="mt-1 w-full rounded-xl px-3 py-2 text-sm"
                style={{
                  background: KEBU.cream,
                  border: `1px solid ${KEBU.border}`,
                  color: KEBU.black,
                }}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="I need a launch campaign for my Senegalese skincare brand — IG post, story, and flyer."
              />
            </label>

            <p className="text-xs" style={{ color: KEBU.faint }}>
              Creates up to 3 editable designs. Guidance stays on your project — not a video course.
            </p>

            <button
              type="submit"
              disabled={busy}
              className="rounded-full px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: KEBU.orange }}
            >
              {busy ? "Generating…" : creationMode === "teach_me" ? "Generate & teach" : "Generate campaign"}
            </button>
          </form>
        )}

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: "#FFF0EE", border: `1px solid ${KEBU.red}`, color: KEBU.red }}
            role="alert"
          >
            {error}
          </div>
        )}
        {note && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: "#F0FFF4", border: "1px solid #BBF7D0", color: "#15803D" }}
            role="status"
          >
            {note}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewStudioDesignPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm" style={{ color: KEBU.muted }}>
          Loading…
        </div>
      }
    >
      <NewStudioDesignInner />
    </Suspense>
  );
}

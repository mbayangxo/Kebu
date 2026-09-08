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
} from "@/lib/studio/create-presets";
import type { StudioCreationMode } from "@/lib/studio/coach";

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
        setNote(
          "AI key not configured or generation fell back — you still got editable template-based designs.",
        );
      }
      if (typeof data.historyWarning === "string") {
        setNote(data.historyWarning);
      }
      router.push(`/studio/${designs[0].id}`);
    } finally {
      setBusy(false);
    }
  }

  const social = STUDIO_CREATE_PRESETS.filter((p) => p.group === "social");
  const print = STUDIO_CREATE_PRESETS.filter((p) => p.group === "print");

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: "#FFF8F0" }}>
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/studio" className="text-sm underline opacity-70">
          ← Studio
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Kebu Studio</p>
          <h1 className="font-display text-3xl font-bold mt-2">What are you creating?</h1>
          <p className="text-sm mt-2 opacity-70">
            Blank, templates, or AI — then ship into Builder, Shop, and Reach.
          </p>
        </div>

        <StudioEcosystemStrip />

        <div className="flex gap-2 border-b border-black/10">
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
              className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px ${
                tab === id ? "border-orange-600 text-orange-800" : "border-transparent opacity-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="block text-sm">
          Business name (optional)
          <input
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 bg-white"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Baobab Glow"
          />
        </label>

        {tab === "blank" ? (
          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider opacity-60">Social</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {social.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void createBlank(p.id)}
                    className="text-left rounded-2xl border border-black/10 bg-white p-4 hover:border-orange-400 disabled:opacity-50"
                  >
                    <p className="font-semibold">{p.label}</p>
                    <p className="text-xs opacity-60 mt-1">{p.description}</p>
                  </button>
                ))}
              </div>
            </section>
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider opacity-60">Print</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {print.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void createBlank(p.id)}
                    className="text-left rounded-2xl border border-black/10 bg-white p-4 hover:border-orange-400 disabled:opacity-50"
                  >
                    <p className="font-semibold">{p.label}</p>
                    <p className="text-xs opacity-60 mt-1">{p.description}</p>
                  </button>
                ))}
              </div>
            </section>
            <p className="text-xs opacity-60">
              Prefer templates?{" "}
              <Link href="/studio/templates" className="underline font-semibold">
                Browse templates
              </Link>
            </p>
            {busy ? <p className="text-xs opacity-60">Creating…</p> : null}
          </div>
        ) : (
          <form
            onSubmit={(e) => void createFromAi(e)}
            className="space-y-4 rounded-3xl bg-white border border-black/10 p-6"
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">
                How should Kebu help?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCreationMode("create_for_me")}
                  className={`rounded-2xl border px-3 py-3 text-left ${
                    creationMode === "create_for_me"
                      ? "border-orange-500 bg-[#FFF8F0]"
                      : "border-black/10"
                  }`}
                >
                  <span className="text-sm font-bold">Do it for me</span>
                  <span className="block text-[11px] opacity-60 mt-1 leading-snug">
                    Kebu builds editable designs. You tweak and ship.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode("teach_me")}
                  className={`rounded-2xl border px-3 py-3 text-left ${
                    creationMode === "teach_me"
                      ? "border-orange-500 bg-[#FFF8F0]"
                      : "border-black/10"
                  }`}
                >
                  <span className="text-sm font-bold">Teach me</span>
                  <span className="block text-[11px] opacity-60 mt-1 leading-snug">
                    Same designs — plus why each choice (learn by building).
                  </span>
                </button>
              </div>
            </div>
            <label className="block text-sm">
              What do you need?
              <textarea
                required
                minLength={8}
                maxLength={800}
                rows={4}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="I need a launch campaign for my Senegalese skincare brand — IG post, story, and flyer."
              />
            </label>
            <p className="text-xs opacity-60 leading-relaxed">
              Creates up to 3 editable designs. Not a video course — guidance stays on your project.
            </p>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "#E05A2B" }}
            >
              {busy
                ? "Generating…"
                : creationMode === "teach_me"
                  ? "Generate & teach"
                  : "Generate campaign"}
            </button>
          </form>
        )}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {note ? <p className="text-sm text-emerald-800">{note}</p> : null}
      </div>
    </div>
  );
}

export default function NewStudioDesignPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>}
    >
      <NewStudioDesignInner />
    </Suspense>
  );
}

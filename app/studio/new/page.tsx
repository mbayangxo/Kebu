"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
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
  instagram_post: "#FF6A00",
  instagram_story: "#FF1F1F",
  whatsapp_status: "#0E9F6E",
  facebook_post: "#2667FF",
  social_square: "#111111",
  flyer: "#A15CFF",
  poster: "#FF6A00",
  banner: "#F4B400",
  business_card: "#0B6E4F",
};

const MOSAIC = [
  { src: "/templates/maylecor/portrait.jpg", alt: "Portrait reference", className: "col-span-2 row-span-2" },
  { src: "/templates/maylecor/city-skyline.png", alt: "City reference", className: "col-span-1 row-span-1" },
  { src: "/templates/legally-blonde/hero-photo.png", alt: "Editorial reference", className: "col-span-1 row-span-2" },
  { src: "/templates/kdirection/portrait.jpg", alt: "Artist reference", className: "col-span-1 row-span-1" },
];

function FormatGlyph({ preset }: { preset: StudioCreatePreset }) {
  const accent = PRESET_ACCENTS[preset.id] ?? KEBU.orange;
  const aspect = preset.width / preset.height;
  const width = aspect > 1.6 ? 86 : aspect < .75 ? 48 : 64;
  const height = Math.max(42, Math.min(76, Math.round(width / aspect)));
  return (
    <div
      className="relative overflow-hidden rounded-[9px] border border-black/10 shadow-[0_8px_28px_rgba(10,10,10,.08)]"
      style={{ width, height, background: `linear-gradient(145deg,${accent},#111)` }}
      aria-hidden
    >
      <span className="absolute left-2 top-2 h-1.5 w-7 rounded-full bg-white/80" />
      <span className="absolute bottom-2 left-2 h-1 w-5 rounded-full bg-white/35" />
    </div>
  );
}

function NewStudioDesignInner() {
  const router = useRouter();
  const search = useSearchParams();
  const requestedType = search.get("type");
  const requestedPreset = requestedType ? getCreatePreset(requestedType) : undefined;

  const [tab, setTab] = useState<"blank" | "ai">("blank");
  const [creationMode, setCreationMode] = useState<StudioCreationMode>("create_for_me");
  const [businessName, setBusinessName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (search.get("tab") === "ai") setTab("ai");
    if (search.get("mode") === "teach_me") setCreationMode("teach_me");
  }, [search]);

  const grouped = useMemo(() => ({
    social: STUDIO_CREATE_PRESETS.filter((preset) => preset.group === "social"),
    print: STUDIO_CREATE_PRESETS.filter((preset) => preset.group === "print"),
    web: STUDIO_CREATE_PRESETS.filter((preset) => preset.group === "web"),
  }), []);

  async function createBlank(presetId: string) {
    const preset = getCreatePreset(presetId);
    if (!preset || busyId) return;
    setBusyId(presetId);
    setError(null);
    setNote(null);
    try {
      const canvas = blankCanvasForPreset(preset);
      const name = businessName.trim();
      if (name) {
        const patchLayers = (layers: typeof canvas.layers) =>
          layers.map((layer) => (layer.name === "Business" ? { ...layer, text: name } : layer));
        canvas.layers = patchLayers(canvas.layers);
        canvas.pages = canvas.pages.map((page) => ({ ...page, layers: patchLayers(page.layers) }));
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
      if (!res.ok || !data.design?.id) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not create design.");
      }
      router.push(`/studio/${data.design.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create design.");
    } finally {
      setBusyId(null);
    }
  }

  async function createFromAi(event: React.FormEvent) {
    event.preventDefault();
    if (busyId) return;
    setBusyId("ai");
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
      if (!res.ok) throw new Error(data.error ?? "Could not generate designs.");
      const designs = Array.isArray(data.designs) ? data.designs : [];
      if (!designs.length) throw new Error("No designs returned.");
      if (data.fallback && !data.usedAi) setNote("Kebu used the local editable design engine instead of returning an empty result.");
      if (typeof data.historyWarning === "string") setNote(data.historyWarning);
      router.push(`/studio/${designs[0].id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate designs.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#FFFCF8] text-black">
      <header className="flex min-h-16 items-center justify-between border-b border-black/10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3"><Link href="/dashboard" className="text-[9px] font-semibold text-black/45">← Kebu</Link><span className="text-black/15">|</span><Link href="/studio" className="text-[10px] font-semibold">Studio</Link></div>
        <div className="hidden items-center gap-5 text-[10px] font-black uppercase tracking-[.14em] text-black/40 sm:flex">
          <Link href="/studio/templates" className="hover:text-black">Themes</Link>
          <Link href="/studio/brand" className="hover:text-black">Brand</Link>
          <Link href="/studio/video/new" className="hover:text-black">Video</Link>
        </div>
      </header>

      <section className="grid min-h-[calc(100vh-64px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(520px,.95fr)]">
        <div className="flex min-h-[580px] flex-col justify-between border-b border-black/10 px-5 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-12 xl:px-16">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.25em]" style={{ color: KEBU.orange }}>Kebu Studio</p>
            <h1 className="mt-4 max-w-3xl text-[clamp(3rem,7vw,7.5rem)] font-black leading-[.82] tracking-[-.065em]" style={{ fontFamily: "var(--font-fraunces)" }}>
              Start with the <span className="font-normal italic">idea.</span><br />Not the menu.
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-6 text-black/55 sm:text-base">
              Choose a format and the real editor opens immediately. Or describe what you need and Kebu builds an editable first direction for you.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MOSAIC.map((image) => (
              <div key={image.src} className={"relative min-h-[120px] overflow-hidden rounded-[18px] bg-black " + image.className}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt={image.alt} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-[680px] bg-white">
          <div className="sticky top-0 z-10 border-b border-black/10 bg-white/95 px-5 py-4 backdrop-blur sm:px-7 lg:px-8">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setTab("blank")} className="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[.12em]" style={{ background: tab === "blank" ? KEBU.black : "transparent", color: tab === "blank" ? "white" : KEBU.muted }}>Formats</button>
              <button type="button" onClick={() => setTab("ai")} className="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[.12em]" style={{ background: tab === "ai" ? KEBU.black : "transparent", color: tab === "ai" ? "white" : KEBU.muted }}>Kebu AI</button>
              <Link href="/studio/templates" className="ml-auto rounded-full border border-black/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.12em]">Themes</Link>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-7 lg:px-8">
            <label className="block max-w-xl">
              <span className="text-[9px] font-black uppercase tracking-[.14em] text-black/40">Identity on this piece <span className="normal-case tracking-normal">(optional)</span></span>
              <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Your name, brand or project" className="mt-2 min-h-11 w-full border-b border-black/15 bg-transparent text-sm font-semibold outline-none focus:border-black" />
            </label>

            {tab === "blank" ? (
              <div className="mt-8 space-y-9">
                {requestedPreset ? (
                  <section className="rounded-[22px] border border-black/10 bg-[#FFFCF8] p-4 sm:p-5">
                    <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>You picked this</p>
                    <button type="button" onClick={() => void createBlank(requestedPreset.id)} disabled={Boolean(busyId)} className="mt-3 flex w-full items-center gap-4 text-left disabled:opacity-50">
                      <FormatGlyph preset={requestedPreset} />
                      <span className="min-w-0 flex-1"><span className="block text-lg font-black">{requestedPreset.label}</span><span className="mt-1 block text-[10px] text-black/45">{requestedPreset.description} · opens directly in the editor</span></span>
                      <span className="rounded-full bg-black px-4 py-2 text-[9px] font-black uppercase tracking-wide text-white">{busyId === requestedPreset.id ? "Opening…" : "Create →"}</span>
                    </button>
                  </section>
                ) : null}

                {([
                  ["social", "Social & messaging", "Posts, stories and status formats"],
                  ["print", "Print", "Physical pieces and handouts"],
                  ["web", "Web", "Wide digital canvases"],
                ] as const).map(([group, title, description]) => (
                  <section key={group}>
                    <div className="mb-3 flex items-end justify-between gap-4">
                      <div><h2 className="text-sm font-black">{title}</h2><p className="mt-1 text-[10px] text-black/40">{description}</p></div>
                      <span className="text-[9px] font-black uppercase tracking-[.12em] text-black/25">{grouped[group].length} formats</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {grouped[group].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          disabled={Boolean(busyId)}
                          onClick={() => void createBlank(preset.id)}
                          className="group flex min-h-[116px] items-center gap-4 rounded-[18px] border border-black/10 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-[0_10px_32px_rgba(10,10,10,.06)] disabled:opacity-45"
                        >
                          <FormatGlyph preset={preset} />
                          <span className="min-w-0 flex-1"><span className="block text-[12px] font-black">{preset.label}</span><span className="mt-1 block text-[10px] text-black/40">{preset.description}</span><span className="mt-4 block text-[9px] font-black uppercase tracking-wide" style={{ color: KEBU.orange }}>{busyId === preset.id ? "Creating…" : "Open canvas →"}</span></span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}

                <section className="grid gap-2 sm:grid-cols-2">
                  <Link href="/studio/video/new" className="min-h-[145px] rounded-[20px] bg-black p-5 text-white">
                    <p className="text-[9px] font-black uppercase tracking-[.16em] text-white/40">Motion</p>
                    <p className="mt-5 text-xl font-black">Start a video</p>
                    <p className="mt-2 text-[10px] leading-relaxed text-white/45">Timeline, music intelligence, captions and motion in the same creative system.</p>
                  </Link>
                  <Link href="/studio/templates" className="min-h-[145px] rounded-[20px] border border-black/10 bg-[#EEE8E1] p-5">
                    <p className="text-[9px] font-black uppercase tracking-[.16em] text-black/35">Themes</p>
                    <p className="mt-5 text-xl font-black">Start from a world</p>
                    <p className="mt-2 text-[10px] leading-relaxed text-black/45">Use a complete aesthetic direction instead of a generic template grid.</p>
                  </Link>
                </section>
              </div>
            ) : (
              <form onSubmit={(event) => void createFromAi(event)} className="mt-8">
                <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Creative direction</p>
                <h2 className="mt-2 max-w-xl text-4xl font-black leading-[.95] tracking-[-.045em]" style={{ fontFamily: "var(--font-fraunces)" }}>Tell Kebu what you are trying to make happen.</h2>
                <textarea required minLength={8} maxLength={800} rows={7} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Launch my skincare line in Dakar. I need a sharp, editorial social campaign that still feels warm and local." className="mt-6 w-full resize-y rounded-[20px] border border-black/10 bg-[#FFFCF8] p-4 text-sm leading-6 outline-none focus:border-black/30" />
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {([
                    ["create_for_me", "Create for me", "Give me an editable first direction."],
                    ["teach_me", "Build with me", "Create it and explain the visual choices as I work."],
                  ] as const).map(([mode, title, description]) => (
                    <button key={mode} type="button" onClick={() => setCreationMode(mode)} className="rounded-[16px] border p-4 text-left" style={{ borderColor: creationMode === mode ? KEBU.orange : "rgba(0,0,0,.10)", background: creationMode === mode ? "rgba(255,106,0,.06)" : "white" }}>
                      <span className="block text-[11px] font-black">{title}</span>
                      <span className="mt-1 block text-[9px] leading-relaxed text-black/45">{description}</span>
                    </button>
                  ))}
                </div>
                <button type="submit" disabled={Boolean(busyId) || prompt.trim().length < 8} className="mt-5 min-h-12 rounded-full px-6 text-[10px] font-black uppercase tracking-[.12em] text-white disabled:opacity-40" style={{ background: "linear-gradient(90deg,#FF6A00,#FF1F1F)" }}>{busyId === "ai" ? "Creating…" : "Create direction →"}</button>
              </form>
            )}

            {error ? <div role="alert" className="mt-5 rounded-[16px] border px-4 py-3 text-xs font-semibold" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>{error}</div> : null}
            {note ? <div role="status" className="mt-5 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">{note}</div> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function NewStudioDesignPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#FFFCF8]" />}><NewStudioDesignInner /></Suspense>;
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CreateDesignCanvas } from "@/lib/create/create-designs";

type Design = {
  id: string;
  title: string;
  design_type: string;
  canvas: CreateDesignCanvas;
};

function PosterPreview({ canvas }: { canvas: CreateDesignCanvas }) {
  return (
    <div
      className="aspect-[3/4] w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between p-8 text-white"
      style={{ background: canvas.backgroundColor }}
    >
      <div>
        <p className="text-xs uppercase tracking-widest opacity-70">{canvas.businessName}</p>
        <h2 className="font-display text-3xl font-bold mt-4 leading-tight">{canvas.headline}</h2>
        <p className="text-sm mt-3 opacity-85">{canvas.subheadline}</p>
      </div>
      {canvas.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={canvas.imageUrl} alt="" className="w-full h-32 object-cover rounded-xl my-4" />
      ) : null}
      <span
        className="inline-block self-start rounded-full px-4 py-2 text-sm font-bold"
        style={{ background: canvas.accentColor, color: "#fff" }}
      >
        {canvas.cta}
      </span>
    </div>
  );
}

export default function StudioEditorPage() {
  const params = useParams<{ id: string }>();
  const designId = params.id;
  const [design, setDesign] = useState<Design | null>(null);
  const [canvas, setCanvas] = useState<CreateDesignCanvas | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/create/designs/${designId}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Design not found.");
      return;
    }
    setDesign(data.design);
    setCanvas(data.design.canvas as CreateDesignCanvas);
  }, [designId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!canvas) return;
    setSaveState("saving");
    const res = await fetch(`/api/create/designs/${designId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canvas }),
    });
    setSaveState(res.ok ? "saved" : "idle");
    if (res.ok) setTimeout(() => setSaveState("idle"), 2000);
  }

  function downloadHtml() {
    if (!canvas || !design) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${design.title}</title>
<style>body{margin:0;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f5f5f5}
.poster{width:600px;max-width:100%;aspect-ratio:3/4;background:${canvas.backgroundColor};color:#fff;padding:48px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between}
h1{font-size:2rem;margin:16px 0} .cta{display:inline-block;background:${canvas.accentColor};padding:12px 20px;border-radius:999px;font-weight:bold;color:#fff}
</style></head><body><div class="poster"><div><small>${canvas.businessName}</small><h1>${canvas.headline}</h1><p>${canvas.subheadline}</p></div><span class="cta">${canvas.cta}</span></div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${design.title.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{error}</p>
      </div>
    );
  }

  if (!canvas) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2" style={{ background: "#FFF8F0" }}>
      <div className="p-6 space-y-4 border-r border-black/10 bg-white">
        <Link href="/studio" className="text-sm underline text-muted">
          ← Kebu Create
        </Link>
        <h1 className="font-display text-xl font-bold">{design?.title}</h1>
        <p className="text-xs text-muted">Kebu Create — not Kebu Builder. Saves to your account and raises readiness when linked to a business.</p>

        {(
          [
            ["businessName", "Business name"],
            ["headline", "Headline"],
            ["subheadline", "Subheadline"],
            ["cta", "Call to action"],
            ["accentColor", "Accent color"],
            ["backgroundColor", "Background"],
            ["imageUrl", "Hero image URL"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            {label}
            <input
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              value={canvas[key]}
              onChange={(e) => setCanvas((c) => (c ? { ...c, [key]: e.target.value } : c))}
            />
          </label>
        ))}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => void save()}
            className="rounded-full px-4 py-2 text-sm font-bold text-white"
            style={{ background: "#0F0D33" }}
          >
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save"}
          </button>
          <button type="button" onClick={downloadHtml} className="rounded-full px-4 py-2 text-sm font-bold border border-black/15">
            Download poster
          </button>
        </div>
      </div>
      <div className="p-8 flex items-center justify-center">
        <PosterPreview canvas={canvas} />
      </div>
    </div>
  );
}

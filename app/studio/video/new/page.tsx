"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { VIDEO_ASPECT_PRESETS } from "@/lib/studio/composition";
import { StudioEcosystemStrip } from "@/app/components/studio/studio-ecosystem-strip";

export default function NewStudioVideoPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Untitled video");
  const [presetId, setPresetId] = useState<(typeof VIDEO_ASPECT_PRESETS)[number]["id"]>("9:16");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/video", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || "Untitled video", presetId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create project.");
        return;
      }
      router.push(`/studio/video/${data.project.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: "#FFF8F0" }}>
      <div className="mx-auto max-w-lg space-y-6">
        <Link href="/studio" className="text-sm underline opacity-70">
          ← Studio
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Kebu Studio Video</p>
          <h1 className="font-display text-3xl font-bold mt-2">New video project</h1>
          <p className="text-sm mt-2 opacity-70 leading-relaxed">
            Multi-track timeline — upload clips, trim, move, save. Same project later grows into Quick
            Edit and pro tools.
          </p>
        </div>
        <StudioEcosystemStrip compact />
        <label className="block text-sm font-semibold">
          Title
          <input
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 bg-white"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </label>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider opacity-50">Aspect ratio</p>
          <div className="grid gap-2">
            {VIDEO_ASPECT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetId(p.id)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  presetId === p.id ? "border-orange-500 bg-white" : "border-black/10 bg-white/60"
                }`}
              >
                <span className="font-semibold">{p.label}</span>
                <span className="block text-xs opacity-50 mt-0.5">
                  {p.width}×{p.height}
                </span>
              </button>
            ))}
          </div>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void create()}
          className="rounded-full px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "#E05A2B" }}
        >
          {busy ? "Creating…" : "Open editor"}
        </button>
      </div>
    </div>
  );
}

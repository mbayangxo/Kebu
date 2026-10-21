"use client";

import { useEffect, useState } from "react";
import { StudioWorldNav } from "@/app/components/studio/studio-world-nav";
import { KEBU } from "@/lib/kebu-brand";

const STYLES = [
  { id: "Light", weight: 300, italic: false, label: "Light" },
  { id: "LightItalic", weight: 300, italic: true, label: "Light Italic" },
  { id: "Regular", weight: 400, italic: false, label: "Regular" },
  { id: "RegularItalic", weight: 400, italic: true, label: "Regular Italic" },
  { id: "Bold", weight: 700, italic: false, label: "Bold" },
  { id: "BoldItalic", weight: 700, italic: true, label: "Bold Italic" },
] as const;

const BASE = "/fonts/kebu-display";

export default function StudioFontsPage() {
  const [styleId, setStyleId] = useState<(typeof STYLES)[number]["id"]>("Regular");
  const [sample, setSample] = useState("KEBU STUDIO 2026");
  const style = STYLES.find((s) => s.id === styleId)!;

  useEffect(() => {
    const id = "kebu-fonts-page-stylesheet";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "/fonts/kebu-display/kebu-display.css";
    document.head.appendChild(link);
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFCF8] text-black">
      <StudioWorldNav />
      <main className="mx-auto max-w-[1100px] px-4 py-7 sm:px-7 lg:px-10">
        <header className="mb-7 border-b pb-6" style={{ borderColor: KEBU.borders.default }}>
          <p className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: KEBU.orange }}>
            Kebu's own type
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl">Kebu Display</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>
            An original geometric display typeface built for Kebu — not a reskin of an existing
            font. Six weight/style instances, a real variable font, and genuine installable files.
            A headline/display face (uppercase, digits, essential punctuation, French accents) —
            not a body-text face yet.
          </p>
        </header>

        <section className="mb-8">
          <label className="mb-2 block text-[10px] font-black uppercase tracking-wider" style={{ color: KEBU.muted }}>
            Try it
          </label>
          <input
            value={sample}
            onChange={(e) => setSample(e.target.value.toUpperCase())}
            className="mb-5 w-full rounded-xl border px-4 py-3 text-sm"
            style={{ borderColor: KEBU.borders.default }}
          />
          <div
            className="rounded-[20px] border bg-white p-6"
            style={{ borderColor: KEBU.borders.default, minHeight: 140 }}
          >
            <p
              style={{
                fontFamily: '"Kebu Display", system-ui, sans-serif',
                fontWeight: style.weight,
                fontStyle: style.italic ? "italic" : "normal",
                fontSize: "clamp(32px, 7vw, 72px)",
                lineHeight: 1.15,
                wordBreak: "break-word",
              }}
            >
              {sample || " "}
            </p>
          </div>
        </section>

        <section className="mb-8 flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyleId(s.id)}
              className="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider"
              style={{
                background: styleId === s.id ? KEBU.black : "transparent",
                color: styleId === s.id ? "white" : KEBU.muted,
                border: `1px solid ${KEBU.borders.default}`,
              }}
            >
              {s.label}
            </button>
          ))}
        </section>

        <section className="mb-8 rounded-[20px] border bg-white p-6" style={{ borderColor: KEBU.borders.default }}>
          <h2 className="mb-3 text-sm font-black">Download — {style.label}</h2>
          <p className="mb-4 text-[11px]" style={{ color: KEBU.muted }}>
            .woff2 is what Studio and the web use. .ttf/.otf are real installable desktop files.
          </p>
          <div className="flex flex-wrap gap-2">
            {(["woff2", "ttf", "otf"] as const).map((ext) => (
              <a
                key={ext}
                href={`${BASE}/KebuDisplay-${style.id}.${ext}`}
                download
                className="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white"
                style={{ background: KEBU.orange }}
              >
                .{ext}
              </a>
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-[20px] border bg-white p-6" style={{ borderColor: KEBU.borders.default }}>
          <h2 className="mb-1 text-sm font-black">Variable font</h2>
          <p className="mb-4 text-[11px]" style={{ color: KEBU.muted }}>
            One file, a real weight (wght) axis from Light to Bold — for places that want to
            interpolate rather than swap static files.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`${BASE}/KebuDisplay-Variable.woff2`}
              download
              className="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white"
              style={{ background: KEBU.orange }}
            >
              .woff2 (variable)
            </a>
            <a
              href={`${BASE}/KebuDisplay-Variable.ttf`}
              download
              className="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white"
              style={{ background: KEBU.orange }}
            >
              .ttf (variable)
            </a>
          </div>
        </section>

        <section className="rounded-[20px] border bg-white p-6" style={{ borderColor: KEBU.borders.default }}>
          <h2 className="mb-3 text-sm font-black">Use it in Studio</h2>
          <p className="text-[11px] leading-relaxed" style={{ color: KEBU.muted }}>
            Kebu Display is already in every text layer's font picker — no setup needed. Select a
            text layer, open Typography, and choose "Kebu Display" from the Font dropdown.
            Weight/italic follow the usual text controls.
          </p>
        </section>
      </main>
    </div>
  );
}

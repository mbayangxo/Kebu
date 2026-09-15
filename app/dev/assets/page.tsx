"use client";
export const dynamic = "force-dynamic";

import { useRef, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

const D = {
  bg:      "#0D1117",
  surface: "#161B22",
  border:  "rgba(255,255,255,0.08)",
  muted:   "rgba(255,255,255,0.45)",
  faint:   "rgba(255,255,255,0.2)",
  text:    "#E6EDF3",
} as const;

const FILTERS = ["All", "Images", "Templates", "Fonts", "Icons"] as const;
type Filter = (typeof FILTERS)[number];

type Asset = {
  id: string;
  name: string;
  type: Filter;
  size: string;
  url: string;
  uploadedAt: string;
};

const MOCK_ASSETS: Asset[] = [];

function DropZone({ onFiles }: { onFiles: (files: FileList) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className="flex flex-col items-center justify-center py-16 rounded-2xl text-center cursor-pointer transition-all"
      style={{
        border: `2px dashed ${dragging ? KEBU.orange : D.border}`,
        background: dragging ? "rgba(255,85,0,0.05)" : D.surface,
      }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.ttf,.otf,.zip"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
        }}
      />
      <span className="text-4xl mb-4">☁️</span>
      <p className="text-sm font-bold mb-1" style={{ color: D.text }}>
        Drop files here, or click to browse
      </p>
      <p className="text-xs" style={{ color: D.muted }}>
        Images, templates, fonts, icons — up to 50 MB per file
      </p>
      <p className="text-[11px] mt-4 px-6 leading-relaxed max-w-xs" style={{ color: D.faint }}>
        Asset storage requires Supabase Storage to be configured. Coming soon.
      </p>
    </div>
  );
}

function AssetCard({ asset }: { asset: Asset }) {
  return (
    <div
      className="group relative rounded-xl overflow-hidden transition-all hover:-translate-y-0.5"
      style={{ border: `1px solid ${D.border}`, background: D.surface }}
    >
      <div
        className="aspect-video flex items-center justify-center text-3xl"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        {asset.type === "Images" ? "🖼️" :
         asset.type === "Templates" ? "📄" :
         asset.type === "Fonts" ? "Aa" : "🎨"}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold truncate" style={{ color: D.text }}>{asset.name}</p>
        <p className="text-[10px] mt-0.5" style={{ color: D.muted }}>{asset.size} · {asset.uploadedAt}</p>
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(13,17,23,0.9)" }}
      >
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-xs font-bold"
          style={{ background: KEBU.orange, color: KEBU.white }}
        >
          Download
        </button>
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{ border: `1px solid ${D.border}`, color: D.muted }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function DevAssetsPage() {
  const [filter, setFilter] = useState<Filter>("All");

  const filtered = MOCK_ASSETS.filter(
    (a) => filter === "All" || a.type === filter,
  );

  function handleFiles(_files: FileList) {
    alert("Asset storage is coming soon — Supabase Storage bucket needs to be set up first.");
  }

  return (
    <AppShell title="Assets">
      <div className="min-h-full" style={{ background: D.bg }}>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: KEBU.orange }}>
                Developer Platform
              </p>
              <h1 className="text-xl font-black" style={{ fontFamily: "var(--font-fraunces)", color: D.text }}>
                Assets
              </h1>
            </div>
            <button
              type="button"
              onClick={() => document.getElementById("asset-upload-trigger")?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-[0.97] hover:brightness-105"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              + Upload
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.97]"
                style={{
                  background: filter === f ? KEBU.orange : "rgba(255,255,255,0.06)",
                  color: filter === f ? KEBU.white : D.muted,
                  border: `1px solid ${filter === f ? KEBU.orange : D.border}`,
                }}
              >
                {f}
              </button>
            ))}
            {MOCK_ASSETS.length > 0 && (
              <span className="ml-auto text-[11px] font-semibold" style={{ color: D.muted }}>
                {filtered.length} {filter === "All" ? "assets" : filter.toLowerCase()}
              </span>
            )}
          </div>

          {MOCK_ASSETS.length === 0 ? (
            <DropZone onFiles={handleFiles} />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                {filtered.map((asset) => <AssetCard key={asset.id} asset={asset} />)}
              </div>
              <div
                className="flex items-center gap-4 rounded-xl px-5 py-3.5 cursor-pointer transition-colors"
                style={{ border: `1.5px dashed ${D.border}` }}
                onClick={() => document.getElementById("asset-upload-trigger")?.click()}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,85,0,0.04)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
              >
                <span className="text-xl" style={{ color: KEBU.orange }}>+</span>
                <p className="text-sm font-semibold" style={{ color: D.text }}>Upload more assets</p>
                <p className="text-xs ml-auto" style={{ color: D.muted }}>Images, templates, fonts, icons</p>
              </div>
            </>
          )}

          <input
            id="asset-upload-trigger"
            type="file"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }}
          />

        </div>
      </div>
    </AppShell>
  );
}

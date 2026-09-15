"use client";
export const dynamic = "force-dynamic";

import { useRef, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

const T = { border: KEBU.border } as const;

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
      className="flex flex-col items-center justify-center py-14 rounded-2xl text-center cursor-pointer transition-all"
      style={{
        border: `2px dashed ${dragging ? KEBU.orange : T.border}`,
        background: dragging ? "rgba(255,85,0,0.04)" : KEBU.white,
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
        onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); }}
      />
      <span className="text-4xl mb-4">☁️</span>
      <p className="text-sm font-bold mb-1" style={{ color: KEBU.black }}>
        Drop files here, or click to browse
      </p>
      <p className="text-xs" style={{ color: KEBU.muted }}>
        Images, templates, fonts, icons — up to 50 MB per file
      </p>
      <p className="text-[11px] mt-4 px-6 leading-relaxed max-w-xs" style={{ color: KEBU.faint }}>
        Asset storage requires Supabase Storage to be configured. Coming soon.
      </p>
    </div>
  );
}

function AssetCard({ asset }: { asset: Asset }) {
  return (
    <div
      className="group relative rounded-xl overflow-hidden transition-all hover:-translate-y-0.5"
      style={{ border: `1px solid ${T.border}`, background: KEBU.white }}
    >
      <div
        className="aspect-video flex items-center justify-center text-3xl"
        style={{ background: "rgba(10,10,10,0.04)" }}
      >
        {asset.type === "Images" ? "🖼️" :
         asset.type === "Templates" ? "📄" :
         asset.type === "Fonts" ? "Aa" : "🎨"}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold truncate" style={{ color: KEBU.black }}>{asset.name}</p>
        <p className="text-[10px] mt-0.5" style={{ color: KEBU.muted }}>{asset.size} · {asset.uploadedAt}</p>
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(255,251,247,0.92)" }}
      >
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-xs font-bold"
          style={{ background: KEBU.black, color: KEBU.white }}
        >
          Download
        </button>
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{ border: `1px solid ${T.border}`, color: KEBU.muted }}
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
    <AppShell
      title="Assets"
      actions={
        <button
          type="button"
          onClick={() => document.getElementById("asset-upload-trigger")?.click()}
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-[0.97] hover:brightness-105"
          style={{ background: KEBU.orange, color: KEBU.white }}
        >
          + Upload
        </button>
      }
    >
      <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.97]"
              style={{
                background: filter === f ? KEBU.black : KEBU.white,
                color: filter === f ? KEBU.white : KEBU.muted,
                border: `1px solid ${filter === f ? KEBU.black : T.border}`,
              }}
            >
              {f}
            </button>
          ))}
          {MOCK_ASSETS.length > 0 && (
            <span className="ml-auto text-[11px] font-semibold" style={{ color: KEBU.muted }}>
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
              className="flex items-center gap-4 rounded-xl px-5 py-3.5 cursor-pointer transition-colors hover:bg-orange-50"
              style={{ border: `1.5px dashed ${T.border}` }}
              onClick={() => document.getElementById("asset-upload-trigger")?.click()}
            >
              <span className="text-xl">+</span>
              <p className="text-sm font-semibold" style={{ color: KEBU.black }}>Upload more assets</p>
              <p className="text-xs ml-auto" style={{ color: KEBU.muted }}>Images, templates, fonts, icons</p>
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
    </AppShell>
  );
}

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";
import { toast } from "@/app/components/kebu/toast";

const T = { border: KEBU.border } as const;

const FILTERS = ["All", "Images", "Templates", "Fonts", "Icons"] as const;
type Filter = (typeof FILTERS)[number];

type Asset = {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
  uploadedAt: string;
};

function DropZone({ onFiles, uploading }: { onFiles: (files: FileList) => void; uploading: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className="flex flex-col items-center justify-center py-14 rounded-2xl text-center cursor-pointer transition-all"
      style={{
        border: `2px dashed ${dragging ? KEBU.orange : T.border}`,
        background: dragging ? "rgba(255,85,0,0.04)" : KEBU.white,
        opacity: uploading ? 0.6 : 1,
        pointerEvents: uploading ? "none" : undefined,
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
        accept="image/*,.pdf,.ttf,.otf,.woff,.woff2,.zip,.svg"
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); }}
      />
      <span className="text-4xl mb-4">{uploading ? "⏳" : "☁️"}</span>
      <p className="text-sm font-bold mb-1" style={{ color: KEBU.black }}>
        {uploading ? "Uploading…" : "Drop files here, or click to browse"}
      </p>
      <p className="text-xs" style={{ color: KEBU.muted }}>
        Images, templates, fonts, icons — up to 50 MB per file
      </p>
    </div>
  );
}

function AssetCard({ asset, onDelete }: { asset: Asset; onDelete: (name: string) => void }) {
  const isImage = asset.type === "Images";
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${asset.name}"?`)) return;
    setDeleting(true);
    const res = await fetch("/api/dev/assets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: asset.name }),
    });
    if (res.ok) {
      onDelete(asset.name);
      toast("Asset deleted.", "success");
    } else {
      toast("Could not delete asset.", "error");
      setDeleting(false);
    }
  }

  return (
    <div
      className="group relative rounded-xl overflow-hidden transition-all hover:-translate-y-0.5"
      style={{ border: `1px solid ${T.border}`, background: KEBU.white, opacity: deleting ? 0.4 : 1 }}
    >
      <div
        className="aspect-video flex items-center justify-center overflow-hidden"
        style={{ background: "rgba(10,10,10,0.04)" }}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">
            {asset.type === "Templates" ? "📄" : asset.type === "Fonts" ? "Aa" : "🎨"}
          </span>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold truncate" style={{ color: KEBU.black }}>{asset.name}</p>
        <p className="text-[10px] mt-0.5" style={{ color: KEBU.muted }}>{asset.size} · {asset.uploadedAt}</p>
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(255,251,247,0.92)" }}
      >
        <a
          href={asset.url}
          download={asset.name}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg px-3 py-1.5 text-xs font-bold"
          style={{ background: KEBU.black, color: KEBU.white }}
        >
          Download
        </a>
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
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
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const fetchAssets = useCallback(() => {
    fetch("/api/dev/assets")
      .then((r) => r.json())
      .then((j) => setAssets(j.assets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  async function handleFiles(files: FileList) {
    setUploading(true);
    let uploaded = 0;
    let failed = 0;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/dev/assets", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        uploaded++;
        setAssets((prev) => [json.asset, ...prev]);
      } else {
        failed++;
        toast(json.error ?? `Failed to upload ${file.name}`, "error");
      }
    }
    if (uploaded > 0) toast(`${uploaded} file${uploaded > 1 ? "s" : ""} uploaded.`, "success");
    setUploading(false);
  }

  function handleDelete(name: string) {
    setAssets((prev) => prev.filter((a) => a.name !== name));
  }

  const filtered = filter === "All" ? assets : assets.filter((a) => a.type === filter);

  return (
    <AppShell
      title="Assets"
      actions={
        <button
          type="button"
          disabled={uploading}
          onClick={() => uploadRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-[0.97] hover:brightness-105 disabled:opacity-50"
          style={{ background: KEBU.orange, color: KEBU.white }}
        >
          {uploading ? "Uploading…" : "+ Upload"}
        </button>
      }
    >
      <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10 py-8">

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
          {assets.length > 0 && (
            <span className="ml-auto text-[11px] font-semibold self-center" style={{ color: KEBU.muted }}>
              {filtered.length} {filter === "All" ? "assets" : filter.toLowerCase()}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: KEBU.orange, borderTopColor: "transparent" }} />
          </div>
        ) : assets.length === 0 ? (
          <DropZone onFiles={handleFiles} uploading={uploading} />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
              {filtered.map((asset) => (
                <AssetCard key={asset.id} asset={asset} onDelete={handleDelete} />
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <p className="text-sm" style={{ color: KEBU.muted }}>No {filter.toLowerCase()} yet.</p>
                </div>
              )}
            </div>
            <div
              className="flex items-center gap-4 rounded-xl px-5 py-3.5 cursor-pointer transition-colors hover:bg-orange-50"
              style={{ border: `1.5px dashed ${T.border}` }}
              onClick={() => uploadRef.current?.click()}
            >
              <span className="text-xl">+</span>
              <p className="text-sm font-semibold" style={{ color: KEBU.black }}>Upload more assets</p>
              <p className="text-xs ml-auto" style={{ color: KEBU.muted }}>Images, templates, fonts, icons</p>
            </div>
          </>
        )}

        <input
          ref={uploadRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,.pdf,.ttf,.otf,.woff,.woff2,.zip,.svg"
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }}
        />

      </div>
    </AppShell>
  );
}

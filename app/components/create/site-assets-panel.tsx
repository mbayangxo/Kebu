"use client";

import { useCallback, useEffect, useState } from "react";
import { SiteImageUpload } from "@/app/components/create/site-image-upload";
import { SiteMediaUpload } from "@/app/components/create/site-media-upload";
import { BUILDER } from "@/lib/create/builder-ui";
import {
  KEBU_ASSET_DRAG_MIME,
  type KebuDragAsset,
} from "@/lib/create/builder-media-drop";

export { KEBU_ASSET_DRAG_MIME, type KebuDragAsset };

type AssetRow = {
  id: string;
  url: string;
  kind: string;
  alt: string | null;
  created_at: string;
};

function assetMediaKind(kind: string): KebuDragAsset["kind"] {
  if (kind === "video") return "video";
  if (kind === "audio") return "audio";
  return "image";
}

export function SiteAssetsPanel({
  projectId,
  onPickUrl,
  onUseOnSite,
}: {
  projectId: string;
  onPickUrl?: (url: string, kind: KebuDragAsset["kind"]) => void;
  /** Add asset to the current page canvas (preferred). */
  onUseOnSite?: (asset: KebuDragAsset) => void;
}) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "image" | "video" | "audio">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/assets`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load assets.");
        setAssets([]);
        return;
      }
      setAssets(Array.isArray(data.assets) ? data.assets : []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function useAsset(url: string, kind: KebuDragAsset["kind"]) {
    setPicked(url);
    onPickUrl?.(url, kind);
    onUseOnSite?.({ url, kind });
  }

  function onUploaded(url: string, kind: KebuDragAsset["kind"]) {
    void load();
    useAsset(url, kind);
  }

  const visible = assets.filter((a) => {
    const k = assetMediaKind(a.kind);
    return filter === "all" || filter === k;
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold" style={{ color: BUILDER.ink }}>
          Media library
        </p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: BUILDER.muted }}>
          Upload photos, videos, or music here. Then <strong>drag</strong> onto the preview, or tap{" "}
          <strong>Add to site</strong>. Images land on K-Direction as collage cutouts you can place; videos/audio go
          into media sections on this page.
        </p>
      </div>

      <div className="space-y-2">
        <SiteImageUpload
          projectId={projectId}
          kind="section"
          value=""
          onChange={(url) => onUploaded(url, "image")}
          label="Upload photo / cutout / logo"
        />
        <SiteMediaUpload
          projectId={projectId}
          kind="video"
          value=""
          onChange={(url) => onUploaded(url, "video")}
          label="Upload video"
          showPreview={false}
        />
        <SiteMediaUpload
          projectId={projectId}
          kind="audio"
          value=""
          onChange={(url) => onUploaded(url, "audio")}
          label="Upload music / audio"
          showPreview={false}
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {(
          [
            ["all", "All"],
            ["image", "Photos"],
            ["video", "Videos"],
            ["audio", "Audio"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: filter === id ? BUILDER.ink : "#fff",
              color: filter === id ? "#fff" : BUILDER.muted,
              border: `1px solid ${BUILDER.border}`,
            }}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-[10px] opacity-60">Loading library…</p> : null}
      {error ? <p className="text-[10px] text-red-600">{error}</p> : null}

      {visible.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visible.map((a) => {
            const kind = assetMediaKind(a.kind);
            return (
              <div
                key={a.id}
                className="overflow-hidden rounded-xl border"
                style={{
                  borderColor: picked === a.url ? BUILDER.orange : BUILDER.border,
                  background: "#fff",
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    KEBU_ASSET_DRAG_MIME,
                    JSON.stringify({ url: a.url, kind } satisfies KebuDragAsset),
                  );
                  e.dataTransfer.setData("text/uri-list", a.url);
                  e.dataTransfer.effectAllowed = "copy";
                }}
              >
                <div className="relative aspect-square bg-black/5">
                  {kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.alt ?? ""} className="h-full w-full object-cover pointer-events-none" />
                  ) : kind === "video" ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={a.url} className="h-full w-full object-cover pointer-events-none" muted />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase tracking-wider opacity-60">
                      Audio
                    </div>
                  )}
                  <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white">
                    {kind}
                  </span>
                </div>
                <div className="space-y-1 p-1.5">
                  <button
                    type="button"
                    className="w-full rounded-full py-1 text-[9px] font-bold uppercase tracking-wider text-white"
                    style={{ background: BUILDER.ink }}
                    onClick={() => useAsset(a.url, kind)}
                  >
                    Add to site
                  </button>
                  <p className="text-center text-[8px] opacity-50">or drag to preview</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : !loading ? (
        <p className="text-[10px] opacity-60">No uploads yet — add a photo or video above.</p>
      ) : null}

      {picked ? (
        <p className="text-[10px] break-all rounded-lg p-2" style={{ background: BUILDER.surfaceMuted }}>
          Last used: {picked}
        </p>
      ) : null}
    </div>
  );
}

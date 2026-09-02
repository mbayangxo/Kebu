"use client";

import { useCallback, useEffect, useState } from "react";
import { SiteImageUpload } from "@/app/components/create/site-image-upload";
import { BUILDER } from "@/lib/create/builder-ui";

type AssetRow = {
  id: string;
  url: string;
  kind: string;
  alt: string | null;
  created_at: string;
};

export function SiteAssetsPanel({
  projectId,
  onPickUrl,
}: {
  projectId: string;
  onPickUrl?: (url: string) => void;
}) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

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

  function onUploaded(url: string) {
    void load();
    setPicked(url);
    onPickUrl?.(url);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: BUILDER.muted }}>
        Upload photos for your site — cutouts, galleries, products, and backgrounds. Tap an image to copy its URL into
        the section you are editing.
      </p>

      <SiteImageUpload
        projectId={projectId}
        kind="section"
        value=""
        onChange={onUploaded}
        label="Upload photo or graphic"
      />

      {loading ? <p className="text-[10px] opacity-60">Loading library…</p> : null}
      {error ? <p className="text-[10px] text-red-600">{error}</p> : null}

      {assets.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {assets.map((a) => (
            <button
              key={a.id}
              type="button"
              className="relative aspect-square overflow-hidden rounded-xl border-2 transition-transform hover:scale-[1.02]"
              style={{
                borderColor: picked === a.url ? BUILDER.orange : BUILDER.border,
              }}
              onClick={() => {
                setPicked(a.url);
                onPickUrl?.(a.url);
                void navigator.clipboard?.writeText(a.url);
              }}
              title="Tap to use this image"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.alt ?? ""} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : !loading ? (
        <p className="text-[10px] opacity-60">No uploads yet — add your first image above.</p>
      ) : null}

      {picked ? (
        <p className="text-[10px] break-all rounded-lg p-2" style={{ background: BUILDER.surfaceMuted }}>
          Selected: {picked}
        </p>
      ) : null}
    </div>
  );
}

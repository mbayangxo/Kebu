"use client";

import { useRef, useState } from "react";
import { SITE_ASSET_SPECS, type SiteAssetKind } from "@/lib/create/site-asset-upload";

export function SiteImageUpload({
  projectId,
  kind,
  value,
  onChange,
  label,
}: {
  projectId: string;
  kind: SiteAssetKind;
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const spec = SITE_ASSET_SPECS[kind];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      const res = await fetch(`/api/projects/${projectId}/assets/upload`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      onChange(data.url as string);
    } catch {
      setError("Network error during upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "#FAFAF8", border: "1px solid #E8E6DF" }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider">{label ?? spec.label}</p>
          <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: "#6B5B45" }}>
            {spec.hint}
          </p>
        </div>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-12 w-12 rounded-lg object-cover border border-black/10 shrink-0" />
        ) : (
          <div
            className="h-12 w-12 rounded-lg border border-dashed border-black/15 flex items-center justify-center text-[9px] text-muted shrink-0"
            aria-hidden
          >
            No image
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={spec.accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
          style={{ background: "#0F0D33", color: "#fff" }}
        >
          {busy ? "Uploading…" : "Upload photo"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ border: "1px solid #DDE0F0" }}
          >
            Remove
          </button>
        ) : null}
      </div>
      {error ? <p className="text-[10px] text-red-600">{error}</p> : null}
    </div>
  );
}

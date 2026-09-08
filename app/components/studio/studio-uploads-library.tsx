"use client";

import { useCallback, useEffect, useState } from "react";

type UploadRow = {
  id: string;
  kind: "image" | "video";
  url: string;
  file_name: string | null;
  created_at: string;
};

/** S16 — reusable uploads for the current user. */
export function StudioUploadsLibrary({
  onPickImage,
  onPickVideo,
  readOnly,
}: {
  onPickImage: (url: string) => void;
  onPickVideo: (url: string) => void;
  readOnly?: boolean;
}) {
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/studio/uploads", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load library.");
      return;
    }
    setUploads(Array.isArray(data.uploads) ? data.uploads : []);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/uploads?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Remove failed.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Your uploads</p>
        <button type="button" className="text-[10px] underline opacity-60" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {error ? <p className="text-[11px] text-red-700">{error}</p> : null}
      {uploads.length === 0 ? (
        <p className="text-[10px] opacity-50 leading-relaxed">
          Images and videos you upload appear here for reuse. Apply migration 073 if this stays empty after
          upload.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {uploads.map((u) => (
            <li key={u.id} className="rounded-lg border border-black/10 overflow-hidden bg-[#FFF8F0]">
              <button
                type="button"
                disabled={readOnly}
                className="w-full text-left disabled:opacity-40"
                onClick={() => (u.kind === "video" ? onPickVideo(u.url) : onPickImage(u.url))}
              >
                {u.kind === "video" ? (
                  <div className="h-16 flex items-center justify-center text-[10px] font-bold bg-black/80 text-white">
                    Video
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.url} alt="" className="h-16 w-full object-cover" />
                )}
                <p className="px-1 py-0.5 text-[9px] truncate opacity-60">{u.file_name || u.kind}</p>
              </button>
              {!readOnly ? (
                <button
                  type="button"
                  disabled={busy}
                  className="w-full text-[9px] py-0.5 underline opacity-50"
                  onClick={() => void remove(u.id)}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

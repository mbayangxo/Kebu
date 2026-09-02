"use client";

import { useRef, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

export function BusinessLogoEditor({
  businessId,
  logoUrl,
  businessName,
  onUpdated,
}: {
  businessId: string;
  logoUrl: string | null;
  businessName: string;
  onUpdated: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    const res = await fetch(`/api/businesses/${businessId}/logo`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as { logoUrl?: string; error?: string };
    setBusy(false);
    if (!res.ok || !data.logoUrl) {
      setError(data.error ?? "Upload failed.");
      return;
    }
    onUpdated(data.logoUrl);
  }

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: KEBU.border }}>
      <h3 className="text-sm font-bold mb-1">Business logo</h3>
      <p className="text-xs opacity-70 mb-4">
        Shown on your business dashboard and trade profile. Square PNG or JPG, max 3 MB.
      </p>
      <div className="flex items-center gap-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={`${businessName} logo`} className="w-16 h-16 rounded-xl object-cover border" />
        ) : (
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-lg font-bold text-white"
            style={{ background: KEBU.orange }}
          >
            {businessName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="text-xs font-bold px-4 py-2 rounded-full text-white disabled:opacity-60"
            style={{ background: KEBU.orange }}
          >
            {busy ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
          </button>
        </div>
      </div>
      {error ? <p className="text-xs text-red-600 mt-3">{error}</p> : null}
    </div>
  );
}

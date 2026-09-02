"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewStudioDesignPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Grand opening poster");
  const [businessName, setBusinessName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createDesign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/create/designs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          designType: "poster",
          canvas: { businessName: businessName || "My business" },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create design.");
        return;
      }
      router.push(`/studio/${data.design.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#FFF8F0" }}>
      <form onSubmit={(e) => void createDesign(e)} className="w-full max-w-md rounded-3xl bg-white border border-black/10 p-8 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Kebu Create</p>
        <h1 className="font-display text-2xl font-bold">New poster</h1>
        <label className="block text-sm">
          Design title
          <input
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Business name on poster
          <input
            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Atelier Baobab"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full py-3 font-bold text-white disabled:opacity-50"
          style={{ background: "#E05A2B" }}
        >
          {busy ? "Creating…" : "Open editor"}
        </button>
      </form>
    </div>
  );
}

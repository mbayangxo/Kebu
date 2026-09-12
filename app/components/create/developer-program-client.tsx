"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type DevProfile = { displayName: string; status: string } | null;
type DevListing = { id: string; name: string; status: string; priceCents: number; salesCount: number };

export function DeveloperProgramClient() {
  const sellFileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<DevProfile>(null);
  const [listings, setListings] = useState<DevListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [devName, setDevName] = useState("");
  const [sellName, setSellName] = useState("");
  const [sellPrice, setSellPrice] = useState("5");
  const [sellDesc, setSellDesc] = useState("");

  const loadDev = useCallback(async () => {
    const res = await fetch("/api/aesthetics/developer", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;
    setProfile(data.profile ?? null);
    setListings(Array.isArray(data.listings) ? data.listings : []);
    if (data.profile?.displayName) setDevName(data.profile.displayName);
  }, []);

  useEffect(() => {
    loadDev().finally(() => setLoading(false));
  }, [loadDev]);

  async function createDeveloper() {
    if (!devName.trim()) { setError("Enter a developer or studio name."); return; }
    setBusy("dev"); setError(null);
    try {
      const res = await fetch("/api/aesthetics/developer", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: devName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(typeof data.error === "string" ? data.error : "Could not create account."); return; }
      setNote("Developer account ready — upload a template to sell.");
      await loadDev();
    } catch { setError("Network error."); }
    finally { setBusy(null); }
  }

  async function sellFile(file: File | undefined) {
    if (!file) return;
    if (!sellName.trim()) { setError("Name this template first."); return; }
    if (!file.name.toLowerCase().endsWith(".json")) { setError("Upload Kebu JSON only."); return; }
    setBusy("sell"); setError(null);
    try {
      const fileJson = JSON.parse(await file.text()) as unknown;
      const priceCents = Math.max(0, Math.round(Number(sellPrice) * 100) || 0);
      const res = await fetch("/api/aesthetics/marketplace", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sellName.trim(), description: sellDesc.trim() || undefined, priceCents, fileJson, publish: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(typeof data.error === "string" ? data.error : "Upload failed."); return; }
      setNote("Template submitted for review. We'll notify you when it's live.");
      setSellName(""); setSellDesc(""); setSellPrice("5");
      await loadDev();
    } catch { setError("Invalid JSON or network error."); }
    finally { setBusy(null); }
  }

  if (loading) {
    return <p className="text-sm" style={{ color: KEBU.muted }}>Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }}>{error}</p>
      ) : null}
      {note ? (
        <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "#E8F8EE", color: "#1B6B3A" }}>{note}</p>
      ) : null}

      {!profile ? (
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: KEBU.muted }}>
              Studio or developer name
            </label>
            <input
              value={devName}
              onChange={(e) => setDevName(e.target.value)}
              placeholder="e.g. Studio Dakar, Awa Creative"
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ borderColor: KEBU.border }}
            />
          </div>
          <button
            type="button"
            disabled={busy === "dev"}
            onClick={() => void createDeveloper()}
            className="rounded-full px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: KEBU.orange }}
          >
            {busy === "dev" ? "Creating…" : "Apply as developer"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: "#E8F8EE", border: "1px solid #C8E8D4" }}
          >
            <span className="text-lg">✓</span>
            <div>
              <p className="text-sm font-bold" style={{ color: "#1B6B3A" }}>
                {profile.displayName}
              </p>
              <p className="text-[11px]" style={{ color: "#3A9A5A" }}>
                Developer account active · {profile.status}
              </p>
            </div>
          </div>

          {/* Upload a template */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ border: `1px solid ${KEBU.border}`, background: "#FAFAF8" }}
          >
            <h3 className="font-bold text-sm" style={{ color: KEBU.black }}>Upload a template to sell</h3>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: KEBU.muted }}>
                Template name
              </label>
              <input
                value={sellName}
                onChange={(e) => setSellName(e.target.value)}
                placeholder="e.g. Abidjan Boutique"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: KEBU.muted }}>
                Description
              </label>
              <textarea
                value={sellDesc}
                onChange={(e) => setSellDesc(e.target.value)}
                placeholder="Short description of what this template is built for"
                rows={2}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: KEBU.muted }}>
                Price (USD)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="w-32 rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: KEBU.border }}
              />
              <p className="text-[10px] mt-1" style={{ color: KEBU.muted }}>$0 = free. You keep 70% of paid sales.</p>
            </div>
            <button
              type="button"
              disabled={busy === "sell"}
              onClick={() => sellFileRef.current?.click()}
              className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
              style={{ background: KEBU.black }}
            >
              {busy === "sell" ? "Uploading…" : "Upload JSON file"}
            </button>
            <input
              ref={sellFileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => { void sellFile(e.target.files?.[0]); e.currentTarget.value = ""; }}
            />
          </div>

          {/* Listings */}
          {listings.length > 0 ? (
            <div>
              <h3 className="text-sm font-bold mb-3" style={{ color: KEBU.black }}>Your templates</h3>
              <div className="space-y-2">
                {listings.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: "#fff", border: `1px solid ${KEBU.border}` }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: KEBU.black }}>{l.name}</p>
                      <p className="text-[10px]" style={{ color: KEBU.muted }}>
                        {l.status} · {l.salesCount} sale{l.salesCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: KEBU.black }}>
                      {l.priceCents === 0 ? "Free" : `$${(l.priceCents / 100).toFixed(0)}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

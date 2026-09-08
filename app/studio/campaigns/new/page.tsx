"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";
import type { BrandDnaRow } from "@/lib/studio/brand-dna";

export default function NewCampaignPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [goal, setGoal] = useState("");
  const [direction, setDirection] = useState("");
  const [keywords, setKeywords] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [brandKitId, setBrandKitId] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<{ id: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [bRes, dRes] = await Promise.all([
        fetch("/api/businesses", { credentials: "include" }),
        fetch("/api/studio/brand-dna", { credentials: "include" }),
      ]);
      const bData = await bRes.json().catch(() => ({}));
      const dData = await dRes.json().catch(() => ({}));
      if (bRes.ok && Array.isArray(bData.businesses)) {
        setBusinesses(
          bData.businesses.map((b: { id: string; trading_name: string | null; legal_name: string }) => ({
            id: b.id,
            label: b.trading_name || b.legal_name,
          })),
        );
      }
      const kits = (dData.kits ?? []) as BrandDnaRow[];
      if (kits[0]) {
        setBrandKitId(kits[0].id);
        if (kits[0].business_id) setBusinessId(kits[0].business_id);
      }
    })();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/campaigns", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Untitled campaign",
          brief: brief.trim(),
          goal: goal.trim(),
          businessId: businessId || null,
          brandKitId,
          mood: {
            direction: direction.trim(),
            keywords: keywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
              .slice(0, 20),
            moodboardNotes: "",
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create campaign.");
        return;
      }
      router.push(`/studio/campaigns/${data.campaign.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="New campaign">
      <main className="max-w-xl mx-auto px-5 py-8">
        <Link href="/studio/campaigns" className="text-xs font-bold underline" style={{ color: KEBU.orange }}>
          ← Campaigns
        </Link>
        <h1 className="text-3xl font-bold mt-4 mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          New campaign project
        </h1>
        <p className="text-sm mb-6" style={{ color: KEBU.muted }}>
          Describe what you’re launching. Creative Director will build a connected pack from Brand DNA.
        </p>
        {error ? (
          <p className="mb-4 text-sm" role="alert" style={{ color: KEBU.red }}>
            {error}
          </p>
        ) : null}
        <form onSubmit={(e) => void create(e)} className="space-y-3">
          <label className="block text-xs font-bold">
            Title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="EP Launch · Summer drop"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            Goal
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Drive pre-saves and WhatsApp orders"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            Brief
            <textarea
              required
              rows={4}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="I need a campaign for my new clothing brand…"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            Visual direction
            <textarea
              rows={2}
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              placeholder="Sahelian luxury · warm light · bold type"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            Keywords (comma-separated)
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="night, gold, Dakar"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            Business
            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal"
            >
              <option value="">Optional</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full py-3 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
            style={{ background: KEBU.orange }}
          >
            {busy ? "Creating…" : "Create campaign"}
          </button>
        </form>
      </main>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";
import type { StudioCampaignProjectRow } from "@/lib/studio/campaign-project";

type DesignRow = { id: string; title: string; design_type: string; updated_at?: string };

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [campaign, setCampaign] = useState<StudioCampaignProjectRow | null>(null);
  const [designs, setDesigns] = useState<DesignRow[]>([]);
  const [direction, setDirection] = useState("");
  const [busy, setBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studio/campaigns/${id}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      router.replace(`/login?next=/studio/campaigns/${id}`);
      return;
    }
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Campaign not found.");
      return;
    }
    setCampaign(data.campaign as StudioCampaignProjectRow);
    setDesigns(Array.isArray(data.designs) ? data.designs : []);
    setDirection(String(data.campaign?.mood?.direction ?? ""));
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveDirection() {
    if (!campaign) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/campaigns/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: { ...campaign.mood, direction } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save direction.");
        return;
      }
      setCampaign(data.campaign);
      setNote(
        data.campaign?.meta?.needsAssetRefresh
          ? "Direction updated — regenerate pack so assets stay aligned."
          : "Direction saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function generatePack() {
    setGenBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/studio/campaigns/${id}/generate`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not generate pack.");
        return;
      }
      setCampaign(data.campaign);
      setNote(typeof data.message === "string" ? data.message : "Pack ready.");
      await load();
    } finally {
      setGenBusy(false);
    }
  }

  if (error && !campaign) {
    return (
      <AppShell title="Campaign">
        <main className="max-w-xl mx-auto px-5 py-10">
          <p style={{ color: KEBU.red }}>{error}</p>
          <Link href="/studio/campaigns" className="underline text-sm mt-4 inline-block">
            Back
          </Link>
        </main>
      </AppShell>
    );
  }

  if (!campaign) {
    return (
      <AppShell title="Campaign">
        <p className="p-8 text-sm opacity-60">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={campaign.title}>
      <main className="max-w-3xl mx-auto px-5 py-8">
        <Link href="/studio/campaigns" className="text-xs font-bold underline" style={{ color: KEBU.orange }}>
          ← Campaigns
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] mt-4 mb-1" style={{ color: KEBU.orange }}>
          Creative Director · {campaign.status}
        </p>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          {campaign.title}
        </h1>
        {campaign.goal ? (
          <p className="text-sm mb-2" style={{ color: KEBU.muted }}>
            Goal: {campaign.goal}
          </p>
        ) : null}
        <p className="text-sm mb-6 whitespace-pre-wrap">{campaign.brief}</p>

        {error ? (
          <p className="mb-3 text-sm" role="alert" style={{ color: KEBU.red }}>
            {error}
          </p>
        ) : null}
        {note ? (
          <p className="mb-3 text-sm" style={{ color: KEBU.orange }}>
            {note}
          </p>
        ) : null}

        <section
          className="rounded-2xl p-5 mb-6 space-y-3"
          style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
        >
          <h2 className="font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
            Visual direction
          </h2>
          <textarea
            rows={3}
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: KEBU.border }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveDirection()}
              className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider border"
              style={{ borderColor: KEBU.border }}
            >
              {busy ? "Saving…" : "Save direction"}
            </button>
            <button
              type="button"
              disabled={genBusy}
              onClick={() => void generatePack()}
              className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
              style={{ background: KEBU.orange }}
            >
              {genBusy ? "Building pack…" : "Generate Creative Director pack"}
            </button>
            <Link href="/studio/brand" className="rounded-full px-4 py-2 text-xs font-bold underline self-center">
              Brand DNA
            </Link>
          </div>
          {campaign.mood.keywords?.length ? (
            <p className="text-[11px]" style={{ color: KEBU.muted }}>
              Keywords: {campaign.mood.keywords.join(" · ")}
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>
            Linked designs ({designs.length || campaign.design_ids.length})
          </h2>
          {designs.length === 0 ? (
            <p className="text-sm" style={{ color: KEBU.muted }}>
              No designs yet — generate a pack to create social + poster assets from Brand DNA.
            </p>
          ) : (
            <ul className="space-y-2">
              {designs.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/studio/${d.id}`}
                    className="block rounded-xl px-4 py-3 text-sm font-semibold"
                    style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
                  >
                    {d.title}{" "}
                    <span className="font-normal" style={{ color: KEBU.muted }}>
                      · {d.design_type}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}

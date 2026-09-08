"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";
import type { StudioCampaignProjectRow } from "@/lib/studio/campaign-project";

export default function StudioCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<StudioCampaignProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/campaigns", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/studio/campaigns");
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load campaigns.");
        return;
      }
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell title="Campaigns">
      <main className="max-w-3xl mx-auto px-5 py-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: KEBU.orange }}>
          Creative Director
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
              Campaign projects
            </h1>
            <p className="text-sm mt-1" style={{ color: KEBU.muted }}>
              One brief → mood + connected designs. Change direction, keep the system linked.
            </p>
          </div>
          <Link
            href="/studio/campaigns/new"
            className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
            style={{ background: KEBU.orange }}
          >
            New campaign
          </Link>
        </div>

        <div className="flex gap-3 text-xs mb-6">
          <Link href="/studio" className="underline font-bold" style={{ color: KEBU.orange }}>
            ← Studio
          </Link>
          <Link href="/studio/brand" className="underline font-bold" style={{ color: KEBU.orange }}>
            Brand DNA
          </Link>
        </div>

        {loading ? <p className="text-sm" style={{ color: KEBU.muted }}>Loading…</p> : null}
        {error ? (
          <p className="text-sm" role="alert" style={{ color: KEBU.red }}>
            {error}
          </p>
        ) : null}

        {!loading && campaigns.length === 0 ? (
          <p className="text-sm" style={{ color: KEBU.muted }}>
            No campaigns yet. Set{" "}
            <Link href="/studio/brand" className="underline font-semibold">
              Brand DNA
            </Link>{" "}
            then start a campaign from a brief.
          </p>
        ) : null}

        <ul className="space-y-3">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Link
                href={`/studio/campaigns/${c.id}`}
                className="block rounded-2xl p-4"
                style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
              >
                <p className="font-bold">{c.title}</p>
                <p className="text-[11px] mt-1" style={{ color: KEBU.muted }}>
                  {c.status} · {c.design_ids.length} designs
                  {c.goal ? ` · ${c.goal}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RecordOverview = {
  generatedAt: string;
  counts: {
    businesses: number;
    publishedWebsites: number;
    liveDeployments: number;
    connectedDomains: number;
    verifiedDomains: number;
    catalogProducts: number;
    createDesigns: number;
  };
  domains: Array<{ id: string; hostname: string; status: string; provider: string; project_id: string }>;
  recentBusinesses: Array<{
    id: string;
    public_kebu_id: string;
    legal_name: string;
    country_code: string;
    lifecycle_status: string;
    created_at: string;
  }>;
  notes: string[];
};

export default function KebuRecordPortalPage() {
  const [data, setData] = useState<RecordOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/record", { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not load Kebu Record.");
        return;
      }
      setData(json as RecordOverview);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-warm-ivory">
      <div className="bg-deep-green text-ivory py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-2">Internal · Team only</p>
          <h1 className="font-display text-3xl font-bold">Kebu Record</h1>
          <p className="text-ivory/70 text-sm mt-2 max-w-2xl">
            Platform operations — all businesses, hosted sites, domains, and catalog activity. Not the user-facing
            business identity document.
          </p>
          <div className="flex gap-4 mt-4 text-sm">
            <Link href="/admin" className="underline text-ivory/80">
              Legacy data admin
            </Link>
            <Link href="/create" className="underline text-ivory/80">
              Kebu Builder
            </Link>
            <Link href="/studio" className="underline text-ivory/80">
              Kebu Create
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {error ? <p className="text-red-700">{error}</p> : null}
        {!data && !error ? <p className="text-muted">Loading platform snapshot…</p> : null}

        {data ? (
          <>
            <p className="text-xs text-muted">Snapshot {new Date(data.generatedAt).toLocaleString()}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                ["Businesses", data.counts.businesses],
                ["Published sites", data.counts.publishedWebsites],
                ["Live deployments", data.counts.liveDeployments],
                ["Verified domains", data.counts.verifiedDomains],
                ["Connected domains", data.counts.connectedDomains],
                ["Catalog products", data.counts.catalogProducts],
                ["Create designs", data.counts.createDesigns],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-white border border-border rounded-2xl p-5 text-center">
                  <p className="font-display text-3xl font-bold text-deep-green">{value as number}</p>
                  <p className="text-xs text-muted mt-1">{label as string}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-border rounded-2xl p-6">
              <h2 className="font-display text-lg font-bold mb-4">Recent businesses</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b">
                      <th className="py-2 pr-4">Kebu ID</th>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Country</th>
                      <th className="py-2">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentBusinesses.map((b) => (
                      <tr key={b.id} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono text-xs">{b.public_kebu_id}</td>
                        <td className="py-2 pr-4">{b.legal_name}</td>
                        <td className="py-2 pr-4">{b.country_code}</td>
                        <td className="py-2">{new Date(b.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-6">
              <h2 className="font-display text-lg font-bold mb-4">Hosted & connected domains</h2>
              {data.domains.length === 0 ? (
                <p className="text-sm text-muted">No custom domains connected yet.</p>
              ) : (
                <ul className="text-sm space-y-2">
                  {data.domains.map((d) => (
                    <li key={d.id} className="flex justify-between gap-4 border-b border-border/40 pb-2">
                      <span className="font-mono">{d.hostname}</span>
                      <span className="text-muted capitalize">
                        {d.status} · {d.provider}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <ul className="text-xs text-muted space-y-1">
              {data.notes.map((n) => (
                <li key={n}>· {n}</li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}

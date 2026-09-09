"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type HelpRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  status: string;
  source: string;
  created_at: string;
  helped_at: string | null;
  helped_by: string | null;
};

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
  accounts: { day: number; week: number; month: number; total: number };
  help: {
    open: number;
    inProgress: number;
    helped: number;
    closed: number;
    helpedOrClosed: number;
    requestsThisWeek: number;
    recent: HelpRow[];
    migrationNeeded?: boolean;
  };
  health: {
    failedSites: number;
    checkedSites: number;
    recentFailures: Array<{
      subdomain: string;
      ok: boolean;
      http_status: number | null;
      error_message: string | null;
      checked_at: string;
    }>;
    billingPastDue: number;
    billingExpired: number;
    shopOrdersThisWeek: number;
    aiEventsThisMonth: number;
  };
  crons: {
    recent: Array<{
      id: string;
      job_name: string;
      status: string;
      summary: Record<string, unknown>;
      error_message: string | null;
      started_at: string;
      finished_at: string;
    }>;
    migrationNeeded?: boolean;
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
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/record", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Could not load Kebu Record.");
      return;
    }
    setError(null);
    setData(json as RecordOverview);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setHelpStatus(id: string, status: "in_progress" | "helped" | "closed" | "open") {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/record", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, helpedBy: "admin" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not update help request.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-warm-ivory">
      <div className="bg-deep-green text-ivory py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-2">Internal · Team only</p>
          <h1 className="font-display text-3xl font-bold">Kebu Record</h1>
          <p className="text-ivory/70 text-sm mt-2 max-w-2xl">
            Platform ops — new accounts, help requests, cron / site health, businesses and hosted assets.
          </p>
          <div className="flex gap-4 mt-4 text-sm">
            <Link href="/admin" className="underline text-ivory/80">
              Legacy data admin
            </Link>
            <Link href="/support" className="underline text-ivory/80">
              Site support desk
            </Link>
            <Link href="/create" className="underline text-ivory/80">
              Kebu Builder
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

            <section>
              <h2 className="font-display text-lg font-bold mb-3">New accounts</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  ["Today", data.accounts.day],
                  ["This week", data.accounts.week],
                  ["Last 30 days", data.accounts.month],
                  ["All time", data.accounts.total],
                ].map(([label, value]) => (
                  <div key={label as string} className="bg-white border border-border rounded-2xl p-5 text-center">
                    <p className="font-display text-3xl font-bold text-deep-green">{value as number}</p>
                    <p className="text-xs text-muted mt-1">{label as string}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold mb-3">Customer help</h2>
              {data.help.migrationNeeded ? (
                <p className="text-sm text-amber-800 mb-3">
                  Apply <code>APPLY_083_HELP_AND_CRON.sql</code> to track help requests.
                </p>
              ) : null}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[
                  ["Open requests", data.help.open],
                  ["In progress", data.help.inProgress],
                  ["Helped / closed", data.help.helpedOrClosed],
                  ["Requests this week", data.help.requestsThisWeek],
                ].map(([label, value]) => (
                  <div key={label as string} className="bg-white border border-border rounded-2xl p-5 text-center">
                    <p className="font-display text-3xl font-bold text-deep-green">{value as number}</p>
                    <p className="text-xs text-muted mt-1">{label as string}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-border rounded-2xl p-6">
                <h3 className="text-sm font-bold mb-3">Recent help requests</h3>
                {data.help.recent.length === 0 ? (
                  <p className="text-sm text-muted">No help requests yet — they arrive from /contact.</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {data.help.recent.map((h) => (
                      <li key={h.id} className="border-b border-border/40 pb-3">
                        <div className="flex flex-wrap justify-between gap-2">
                          <div>
                            <p className="font-semibold">{h.subject}</p>
                            <p className="text-xs text-muted">
                              {h.name} · {h.email}
                              {h.phone ? ` · ${h.phone}` : ""} · {h.status} ·{" "}
                              {new Date(h.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {h.status === "open" ? (
                              <button
                                type="button"
                                disabled={busyId === h.id}
                                className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase"
                                onClick={() => void setHelpStatus(h.id, "in_progress")}
                              >
                                Start
                              </button>
                            ) : null}
                            {h.status !== "helped" && h.status !== "closed" ? (
                              <button
                                type="button"
                                disabled={busyId === h.id}
                                className="rounded-full bg-deep-green px-3 py-1 text-[10px] font-bold uppercase text-ivory"
                                onClick={() => void setHelpStatus(h.id, "helped")}
                              >
                                Mark helped
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold mb-3">Cron & site health</h2>
              {data.crons.migrationNeeded ? (
                <p className="text-sm text-amber-800 mb-3">
                  Apply <code>APPLY_083_HELP_AND_CRON.sql</code> for cron run history.
                </p>
              ) : null}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[
                  ["Sites failing probe", data.health.failedSites],
                  ["Sites checked", data.health.checkedSites],
                  ["Billing past due", data.health.billingPastDue],
                  ["Shop orders (7d)", data.health.shopOrdersThisWeek],
                ].map(([label, value]) => (
                  <div key={label as string} className="bg-white border border-border rounded-2xl p-5 text-center">
                    <p className="font-display text-3xl font-bold text-deep-green">{value as number}</p>
                    <p className="text-xs text-muted mt-1">{label as string}</p>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border border-border rounded-2xl p-6">
                  <h3 className="text-sm font-bold mb-3">Recent cron runs</h3>
                  {data.crons.recent.length === 0 ? (
                    <p className="text-sm text-muted">No cron runs logged yet (after next scheduled job).</p>
                  ) : (
                    <ul className="text-xs space-y-2">
                      {data.crons.recent.map((c) => (
                        <li key={c.id} className="flex justify-between gap-2 border-b border-border/40 pb-2">
                          <span>
                            <span className="font-mono">{c.job_name}</span> · {c.status}
                            {c.error_message ? ` — ${c.error_message}` : ""}
                          </span>
                          <span className="text-muted shrink-0">
                            {new Date(c.finished_at).toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="bg-white border border-border rounded-2xl p-6">
                  <h3 className="text-sm font-bold mb-3">Failing live sites</h3>
                  {data.health.recentFailures.length === 0 ? (
                    <p className="text-sm text-muted">No failing probes right now.</p>
                  ) : (
                    <ul className="text-xs space-y-2">
                      {data.health.recentFailures.map((f) => (
                        <li key={f.subdomain} className="border-b border-border/40 pb-2">
                          <span className="font-mono">{f.subdomain}</span>
                          {f.error_message ? ` — ${f.error_message}` : f.http_status ? ` — HTTP ${f.http_status}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[10px] text-muted mt-3">
                    AI events (30d): {data.health.aiEventsThisMonth} · Billing expired rows:{" "}
                    {data.health.billingExpired}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold mb-3">Platform totals</h2>
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
            </section>

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

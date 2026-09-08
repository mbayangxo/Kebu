"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type PlanOption = {
  id: string;
  name: string;
  monthlyUsd: number;
  hero?: boolean;
  whoFor?: string;
};

type BillingSite = {
  projectId: string;
  title: string;
  subdomain?: string | null;
  canPublish: boolean;
  subscription: {
    status: string;
    tier?: string;
    plan: string;
    periodEnd: string | null;
    autopayEnabled: boolean;
    pendingCheckoutUrl?: string | null;
  } | null;
};

const PAID_DEFAULT = "shop";

/** My Account — plans + autopay for every site (exempt accounts see free note). */
export function AccountHostingBilling() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exempt, setExempt] = useState(false);
  const [message, setMessage] = useState("");
  const [label, setLabel] = useState("$5/month");
  const [autopayDescription, setAutopayDescription] = useState("");
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [sites, setSites] = useState<BillingSite[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tierBySite, setTierBySite] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me/billing", { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        billingExempt?: boolean;
        message?: string;
        label?: string;
        autopayDescription?: string;
        plans?: PlanOption[];
        sites?: BillingSite[];
      };
      if (!res.ok) {
        setError(data.error || "Could not load billing.");
        return;
      }
      setExempt(Boolean(data.billingExempt));
      setMessage(data.message || "");
      setLabel(data.label || "$5/month");
      setAutopayDescription(data.autopayDescription || "");
      setPlans(data.plans ?? []);
      setSites(data.sites ?? []);
      const nextTiers: Record<string, string> = {};
      for (const s of data.sites ?? []) {
        const t = s.subscription?.tier;
        nextTiers[s.projectId] = t && t !== "free" ? t : PAID_DEFAULT;
      }
      setTierBySite(nextTiers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const paidPlans = plans.filter((p) => p.monthlyUsd > 0);

  async function pay(projectId: string, autopay: boolean) {
    setBusyId(projectId);
    try {
      const tier = tierBySite[projectId] || PAID_DEFAULT;
      const res = await fetch(`/api/projects/${projectId}/billing/subscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, plan: "monthly", autopay, forceRenew: true }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        paymentUrl?: string;
        exempt?: boolean;
        alreadyActive?: boolean;
        message?: string;
      };
      if (data.exempt || data.alreadyActive) {
        await load();
        return;
      }
      if (!res.ok || !data.paymentUrl) {
        setError(data.error || "Could not start payment.");
        return;
      }
      window.location.href = data.paymentUrl;
    } finally {
      setBusyId(null);
    }
  }

  async function toggleAutopay(projectId: string, next: boolean) {
    setBusyId(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}/billing`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autopayEnabled: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not update autopay.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm opacity-60">Loading hosting billing…</p>;
  }

  return (
    <section
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "#fff", border: `1px solid ${KEBU.border}` }}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>
          Plans &amp; hosting
        </p>
        <h2 className="text-lg font-bold mt-1" style={{ color: KEBU.black }}>
          {exempt ? "Your sites are free on Kebu" : `Shop is ${label} — start free, upgrade when ready`}
        </h2>
        <p className="text-sm mt-1 leading-relaxed" style={{ color: KEBU.muted }}>
          {message}
        </p>
        {!exempt && autopayDescription ? (
          <p className="text-xs mt-2 leading-relaxed" style={{ color: KEBU.muted }}>
            {autopayDescription}
          </p>
        ) : null}
        {!exempt ? (
          <p className="text-xs mt-2">
            <Link href="/pricing" className="font-semibold underline" style={{ color: KEBU.black }}>
              See all plans
            </Link>
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm" style={{ color: "#8B1E1E" }} role="alert">
          {error}
        </p>
      ) : null}

      {sites.length === 0 ? (
        <p className="text-sm opacity-60">
          No websites yet.{" "}
          <Link href="/create" className="underline font-semibold">
            Create a site
          </Link>
        </p>
      ) : (
        <ul className="space-y-3">
          {sites.map((site) => {
            const currentTier = site.subscription?.tier ?? "free";
            return (
              <li
                key={site.projectId}
                className="rounded-xl p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                style={{ background: "#fff", border: "1px solid #E8E6DF" }}
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate" style={{ color: KEBU.black }}>
                    {site.title}
                  </p>
                  <p className="text-[11px] opacity-60">
                    {site.subdomain ? `/${site.subdomain}` : "No subdomain yet"} ·{" "}
                    {currentTier === "free"
                      ? "Kebu Free"
                      : currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
                    {exempt || site.canPublish
                      ? site.subscription?.periodEnd && currentTier !== "free"
                        ? ` · until ${new Date(site.subscription.periodEnd).toLocaleDateString()}`
                        : " · hosting OK"
                      : ` · needs payment (${site.subscription?.status ?? "unpaid"})`}
                  </p>
                </div>
                {!exempt ? (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {paidPlans.length > 0 ? (
                      <select
                        aria-label="Plan"
                        value={tierBySite[site.projectId] || PAID_DEFAULT}
                        disabled={busyId === site.projectId}
                        onChange={(e) =>
                          setTierBySite((m) => ({ ...m, [site.projectId]: e.target.value }))
                        }
                        className="rounded-full px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white"
                        style={{ border: "1px solid #DDE0F0", color: KEBU.black }}
                      >
                        {paidPlans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name.replace(/^Kebu /, "")} ${p.monthlyUsd}/mo
                            {p.hero ? " ★" : ""}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={Boolean(site.subscription?.autopayEnabled)}
                        disabled={busyId === site.projectId || !site.subscription || currentTier === "free"}
                        onChange={(e) => void toggleAutopay(site.projectId, e.target.checked)}
                      />
                      Autopay
                    </label>
                    <button
                      type="button"
                      disabled={busyId === site.projectId}
                      onClick={() => void pay(site.projectId, true)}
                      className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                      style={{ background: "#0F0D33" }}
                    >
                      {busyId === site.projectId
                        ? "…"
                        : currentTier === "free"
                          ? "Upgrade"
                          : "Renew / change"}
                    </button>
                    <Link
                      href={`/create/${site.projectId}`}
                      className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ border: "1px solid #DDE0F0", color: KEBU.black }}
                    >
                      Open
                    </Link>
                  </div>
                ) : (
                  <Link
                    href={`/create/${site.projectId}`}
                    className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shrink-0"
                    style={{ border: "1px solid #DDE0F0", color: KEBU.black }}
                  >
                    Open editor
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

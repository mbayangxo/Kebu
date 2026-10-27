"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type ConnectedService = { key: string; label: string; detail: string };

type Entitlement = {
  key: string;
  label: string;
  detail: string;
  status: "none" | "pending" | "verified" | "revoked";
  grantedAt: string | null;
  source: string | null;
};

type EntitlementsResponse = {
  connectedServices: ConnectedService[];
  entitlements: Entitlement[];
};

const STATUS_COPY: Record<Entitlement["status"], string> = {
  none: "Not applicable yet",
  pending: "Verification pending",
  verified: "Active",
  revoked: "Revoked by you",
};

/**
 * Your Kebu Account is your control center, not surveillance
 * (docs/product/KEBU-UNIFIED-ACCOUNT.md). Baseline products are listed as
 * honest, informational "always available" rows -- this codebase has no
 * real per-product kill-switch yet, so a toggle here would be exactly the
 * kind of fake control the product rules forbid. Only entitlements with a
 * real, server-enforced backing (currently: Opportunity personalization,
 * gating the real /opportunity for-you feed and listings) get a genuine
 * revoke/restore control.
 */
export function PrivacyControlCenter() {
  const [data, setData] = useState<EntitlementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me/entitlements", { credentials: "include" });
      const body = (await res.json().catch(() => ({}))) as Partial<EntitlementsResponse> & { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not load your privacy settings.");
        return;
      }
      setData({ connectedServices: body.connectedServices ?? [], entitlements: body.entitlements ?? [] });
    } catch {
      setError("Could not load your privacy settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(entitlement: Entitlement) {
    setBusyKey(entitlement.key);
    setError(null);
    try {
      const action = entitlement.status === "revoked" ? "optIn" : "revoke";
      const res = await fetch("/api/me/entitlements", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: entitlement.key, action }),
      });
      const body = (await res.json().catch(() => ({}))) as Entitlement & { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not update this permission.");
        return;
      }
      setData((prev) =>
        prev
          ? { ...prev, entitlements: prev.entitlements.map((e) => (e.key === entitlement.key ? body : e)) }
          : prev,
      );
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) {
    return <p className="text-sm" style={{ color: KEBU.muted }}>Loading…</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>
          Connected services
        </p>
        <div className="mt-2 divide-y rounded-lg border" style={{ borderColor: KEBU.border }}>
          {(data?.connectedServices ?? []).map((service) => (
            <div key={service.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold">{service.label}</p>
                <p className="text-[11px]" style={{ color: KEBU.muted }}>
                  {service.detail}
                </p>
              </div>
              <span className="text-[10px] font-bold" style={{ color: KEBU.muted }} aria-hidden>
                ✓
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>
          Permissions you can revoke
        </p>
        <div className="mt-2 divide-y rounded-lg border" style={{ borderColor: KEBU.border }}>
          {(data?.entitlements ?? []).length === 0 ? (
            <p className="px-3 py-3 text-sm" style={{ color: KEBU.muted }}>
              No revocable permissions yet.
            </p>
          ) : (
            (data?.entitlements ?? []).map((entitlement) => (
              <div key={entitlement.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{entitlement.label}</p>
                  <p className="text-[11px]" style={{ color: KEBU.muted }}>
                    {entitlement.detail}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold" style={{ color: entitlement.status === "verified" ? KEBU.orange : KEBU.muted }}>
                    {STATUS_COPY[entitlement.status]}
                  </p>
                </div>
                {entitlement.status === "verified" || entitlement.status === "revoked" ? (
                  <button
                    type="button"
                    disabled={busyKey === entitlement.key}
                    onClick={() => void toggle(entitlement)}
                    className="shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold disabled:opacity-50"
                    style={{ borderColor: KEBU.border }}
                  >
                    {entitlement.status === "revoked" ? "Restore" : "Revoke"}
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

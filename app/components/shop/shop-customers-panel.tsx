"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import type { ShopCustomerRow } from "@/lib/shop/customers";
import type { ShopCustomerProfile } from "@/lib/shop/customer-profiles";
import { carrierLabel } from "@/lib/shop/carriers";

function formatXof(n: number): string {
  if (!n) return "—";
  return `${Math.round(n).toLocaleString()} XOF`;
}

export function ShopCustomersPanel({
  projectId,
  businessId,
}: {
  projectId: string;
  businessId?: string | null;
}) {
  const [customers, setCustomers] = useState<ShopCustomerRow[]>([]);
  const [businessLinked, setBusinessLinked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [profile, setProfile] = useState<ShopCustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/customers`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load customers.");
        return;
      }
      setCustomers(Array.isArray(data.customers) ? data.customers : []);
      setBusinessLinked(data.businessLinked !== false);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openProfile(key: string) {
    setSelectedKey(key);
    setProfile(null);
    setProfileLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/customers/${encodeURIComponent(key)}`,
        { credentials: "include" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load profile.");
        return;
      }
      setProfile(data.profile ?? null);
    } catch {
      setError("Network error.");
    } finally {
      setProfileLoading(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed" style={{ color: KEBU.muted }}>
        Customers who bought from this store — profiles grow with every order. Open someone to see
        transaction history, what they like, average order, and lifetime spend.
        {businessId ? (
          <>
            {" "}
            Campaigns:{" "}
            <Link
              href={`/business/${businessId}`}
              className="font-semibold underline"
              style={{ color: KEBU.orange }}
            >
              Business → Email
            </Link>
            .
          </>
        ) : null}
      </p>

      {!businessLinked ? (
        <p
          className="mb-4 rounded-xl px-3 py-2 text-xs"
          style={{ background: KEBU.cream, color: KEBU.black }}
        >
          Link this site to a Kebu business so newsletter emails join the same list.
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Loading customers…
        </p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : customers.length === 0 ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          No customers yet. Publish and take an order (email optional but helps profiles).
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ul className="space-y-2">
            {customers.map((c) => (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => void openProfile(c.key)}
                  className="w-full rounded-xl border px-3 py-2.5 text-left transition-opacity hover:opacity-90"
                  style={{
                    borderColor: selectedKey === c.key ? KEBU.orange : KEBU.border,
                    background: selectedKey === c.key ? "#fff8f3" : "#fff",
                  }}
                >
                  <p className="text-sm font-bold" style={{ color: KEBU.black }}>
                    {c.name}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
                    {[c.phone, c.email].filter(Boolean).join(" · ") || "No contact yet"}
                  </p>
                  <p
                    className="mt-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: KEBU.faint }}
                  >
                    {c.orderCount > 0
                      ? `${c.orderCount} order${c.orderCount === 1 ? "" : "s"}`
                      : "List only"}
                    {c.lifetimeAmountXof > 0
                      ? ` · Lifetime ${formatXof(c.lifetimeAmountXof)}`
                      : ""}
                    {c.averageOrderAmountXof > 0
                      ? ` · Avg ${formatXof(c.averageOrderAmountXof)}`
                      : ""}
                  </p>
                  {c.likedProducts[0] ? (
                    <p className="mt-0.5 text-[11px] opacity-70">
                      Likes: {c.likedProducts.slice(0, 3).map((p) => p.name).join(", ")}
                    </p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>

          <div
            className="rounded-xl border px-4 py-3 min-h-[200px]"
            style={{ borderColor: KEBU.border, background: KEBU.cream }}
          >
            {!selectedKey ? (
              <p className="text-sm" style={{ color: KEBU.muted }}>
                Tap a customer to open their profile and order history.
              </p>
            ) : profileLoading ? (
              <p className="text-sm" style={{ color: KEBU.muted }}>
                Loading profile…
              </p>
            ) : !profile ? (
              <p className="text-sm" style={{ color: KEBU.muted }}>
                No profile data yet. Apply migration 054 if orders exist but profiles are empty.
              </p>
            ) : (
              <>
                <p className="text-lg font-bold" style={{ color: KEBU.black }}>
                  {profile.name}
                </p>
                <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
                  {[profile.phone, profile.email].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white px-2 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider opacity-50">Orders</p>
                    <p className="text-sm font-bold">{profile.orderCount}</p>
                  </div>
                  <div className="rounded-lg bg-white px-2 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider opacity-50">Avg</p>
                    <p className="text-sm font-bold">{formatXof(profile.averageOrderAmountXof)}</p>
                  </div>
                  <div className="rounded-lg bg-white px-2 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider opacity-50">Lifetime</p>
                    <p className="text-sm font-bold">{formatXof(profile.lifetimeAmountXof)}</p>
                  </div>
                </div>
                {profile.likedProducts.length ? (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                      What they like
                    </p>
                    <ul className="mt-1 space-y-1 text-xs">
                      {profile.likedProducts.slice(0, 6).map((p) => (
                        <li key={p.name}>
                          {p.name}{" "}
                          <span className="opacity-60">
                            · {p.quantity} units · {p.orders} orders
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Transaction history
                  </p>
                  <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                    {profile.transactions.map((t) => (
                      <li
                        key={t.id}
                        className="rounded-lg bg-white px-2.5 py-2 text-xs"
                        style={{ border: `1px solid ${KEBU.border}` }}
                      >
                        <p className="font-semibold">
                          {t.orderNumber ? `${t.orderNumber} · ` : ""}
                          {t.quantity}× {t.productName}
                        </p>
                        <p className="opacity-70">
                          {t.priceLabel || (t.amountXof != null ? formatXof(t.amountXof) : "")}
                          {` · ${t.status}`}
                          {t.paymentStatus ? ` · ${t.paymentStatus}` : ""}
                        </p>
                        {t.trackingNumber ? (
                          <p className="mt-0.5 opacity-70">
                            {carrierLabel(t.carrier)} · {t.trackingNumber}
                            {t.trackingUrl ? (
                              <>
                                {" "}
                                ·{" "}
                                <a
                                  href={t.trackingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline"
                                  style={{ color: KEBU.orange }}
                                >
                                  Track
                                </a>
                              </>
                            ) : null}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider opacity-40">
                          {t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

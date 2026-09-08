"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import type { SellerTrustSnapshot } from "@/lib/shop/seller-trust";

/** Honest Kebu ID + AfriID status — never a fake “verified seller” badge. */
export function ShopSellerTrustBanner({ projectId }: { projectId: string }) {
  const [trust, setTrust] = useState<SellerTrustSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/seller-trust`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Could not load seller trust.");
          return;
        }
        setTrust(data.sellerTrust as SellerTrustSnapshot);
        setError(null);
      } catch {
        if (!cancelled) setError("Could not load seller trust.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (error) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {error}
      </p>
    );
  }

  if (!trust) {
    return (
      <p className="text-xs" style={{ color: KEBU.muted }}>
        Checking seller trust…
      </p>
    );
  }

  return (
    <div
      className="rounded-2xl border px-4 py-3 space-y-1.5"
      style={{ borderColor: KEBU.border, background: "#fff" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
        Seller trust
      </p>
      <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
        {trust.label}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: KEBU.muted }}>
        Joko (pay in Cauris): {trust.canEnableJoko ? "allowed" : "blocked until requirements below"}. Products
        without Kebu ID: up to {trust.productSoftLimitWithoutKebuId} (you have {trust.productCount}). Informal
        businesses welcome — we do not show a verified-seller badge until AfriID is actually verified.
      </p>
      {trust.nextAction ? (
        <p className="text-xs" style={{ color: KEBU.black }}>
          Next:{" "}
          {trust.nextActionHref ? (
            <Link href={trust.nextActionHref} className="font-semibold underline">
              {trust.nextAction}
            </Link>
          ) : (
            trust.nextAction
          )}
        </p>
      ) : null}
      {trust.kebuPublicId ? (
        <p className="text-[11px] opacity-60">Kebu ID {trust.kebuPublicId}</p>
      ) : null}
    </div>
  );
}

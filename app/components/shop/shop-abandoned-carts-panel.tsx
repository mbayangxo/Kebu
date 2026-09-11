"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";

type CartDraft = {
  id: string;
  subdomain: string;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  discount_code: string | null;
  last_seen_at: string;
  itemCount: number;
};

type DiscountOpt = { code: string; percent_off: number; is_active: boolean };

/** Merchant view of open carts left idle — recover via WhatsApp or email when configured. */
export function ShopAbandonedCartsPanel({
  projectId,
  embedded = false,
}: {
  projectId: string;
  embedded?: boolean;
}) {
  const [drafts, setDrafts] = useState<CartDraft[]>([]);
  const [shopName, setShopName] = useState("Shop");
  const [discounts, setDiscounts] = useState<DiscountOpt[]>([]);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [draftRes, discRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/cart-drafts`, { credentials: "include" }),
        fetch(`/api/projects/${projectId}/discounts`, { credentials: "include" }),
      ]);
      const data = await draftRes.json().catch(() => ({}));
      if (!draftRes.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load abandoned carts.");
        return;
      }
      setDrafts(Array.isArray(data.drafts) ? data.drafts : []);
      if (typeof data.shopName === "string") setShopName(data.shopName);

      const discData = await discRes.json().catch(() => ({}));
      if (discRes.ok && Array.isArray(discData.discounts)) {
        const opts = (discData.discounts as DiscountOpt[]).filter((d) => d.is_active);
        setDiscounts(opts);
        setRecoveryCode((prev) => prev || opts[0]?.code || "");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount / project change
  }, [projectId]);

  async function act(draftId: string, action: "mark_recovered" | "send_recovery") {
    setBusyId(draftId);
    setNote(null);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/cart-drafts`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          action,
          discountCode: recoveryCode.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Action failed.");
        return;
      }
      if (action === "send_recovery") {
        if (typeof data.whatsappHref === "string" && data.whatsappHref.startsWith("https://")) {
          window.open(data.whatsappHref, "_blank", "noopener,noreferrer");
        }
        if (data.emailSent) {
          setNote("Recovery email sent (when Resend is configured). Draft marked recovered.");
        } else if (data.emailReason) {
          setNote(
            data.whatsappHref
              ? `WhatsApp opened. Email: ${data.emailReason}`
              : `Could not email: ${data.emailReason}. Add phone/email on the cart, or set RESEND_API_KEY.`,
          );
        } else {
          setNote("Recovery link ready.");
        }
        if (data.markedRecovered) await load();
      } else {
        setNote("Marked recovered.");
        await load();
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={embedded ? "" : "mt-10"}>
      {!embedded ? (
        <>
          <h2 className="text-lg font-bold" style={{ color: KEBU.black }}>
            Abandoned carts
          </h2>
          <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
            Connected to your live shop cart. Idle 30+ minutes with email/phone appear here. Recovery never
            marks an order paid.
          </p>
        </>
      ) : (
        <p className="mb-4 text-sm leading-relaxed" style={{ color: KEBU.muted }}>
          Live shop → Add to cart → shopper leaves → draft saved → you recover here. Outreach only — not
          paid. Need a % off code? Create one under{" "}
          <Link href={`/shop/${projectId}?tab=discounts`} className="underline font-semibold">
            Discounts
          </Link>
          .
        </p>
      )}
      {discounts.length > 0 ? (
        <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider">
          Offer this code in recovery messages
          <select
            className="mt-1 block w-full max-w-xs rounded-lg border px-2 py-1.5 text-xs normal-case tracking-normal"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
          >
            <option value="">No code</option>
            {discounts.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} (−{d.percent_off}%)
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="mt-2 text-[11px]" style={{ color: KEBU.muted }}>
          Tip: add a discount (e.g. COMEBACK10) then recover carts with that code in the message.
        </p>
      )}
      {note ? (
        <p className="mt-2 text-xs" style={{ color: KEBU.muted }}>
          {note}
        </p>
      ) : null}
      {loading ? (
        <p className="mt-3 text-sm" style={{ color: KEBU.muted }}>
          Loading abandoned carts…
        </p>
      ) : error ? (
        <p className="mt-3 text-sm" style={{ color: "#8B1E1E" }}>{error}</p>
      ) : drafts.length === 0 ? (
        <p className="mt-3 text-sm" style={{ color: KEBU.muted }}>
          No abandoned carts yet. Publish a site with a Products section, add products, then have someone
          tap Add to cart and leave the checkout open with their email or phone.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {drafts.map((d) => (
            <li
              key={d.id}
              className="rounded-xl px-3 py-3 text-sm"
              style={{ border: `1px solid ${KEBU.border}`, background: KEBU.cream }}
            >
              <p className="font-semibold">
                {d.itemCount} item{d.itemCount === 1 ? "" : "s"} · /sites/{d.subdomain}
              </p>
              <p className="mt-1 text-xs">
                {d.customer_name || "Visitor"}
                {d.customer_email ? ` · ${d.customer_email}` : ""}
                {d.customer_phone ? ` · ${d.customer_phone}` : ""}
              </p>
              {d.discount_code ? (
                <p className="mt-0.5 text-[10px] font-mono opacity-60">Code started: {d.discount_code}</p>
              ) : null}
              <p className="mt-1 text-[10px] uppercase tracking-wider opacity-50">
                Last seen {new Date(d.last_seen_at).toLocaleString()} · {shopName}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === d.id || (!d.customer_email && !d.customer_phone)}
                  className="rounded-full px-3 py-1 text-[10px] font-bold text-white disabled:opacity-40"
                  style={{ background: KEBU.orange }}
                  onClick={() => void act(d.id, "send_recovery")}
                >
                  {busyId === d.id ? "…" : "Recover (WhatsApp / email)"}
                </button>
                <button
                  type="button"
                  disabled={busyId === d.id}
                  className="rounded-full border px-3 py-1 text-[10px] font-bold disabled:opacity-40"
                  onClick={() => void act(d.id, "mark_recovered")}
                >
                  Mark recovered
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Return URL after live checkout (JOKO / PayPal / Paystack / Wave).
 * Money: paid only after verified capture/webhook — never from this page alone.
 */
export default function OrderThanksClient({
  orderId,
  paypalToken,
  psp,
}: {
  orderId?: string;
  paypalToken?: string;
  psp?: string;
}) {
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    // Only attempt PayPal capture when this return is from PayPal (psp=paypal or token + paypal)
    const isPaypal = psp === "paypal" || (!psp && Boolean(paypalToken));
    if (!orderId || !paypalToken || !isPaypal) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/public/shop/paypal/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, paypalOrderId: paypalToken }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          paid?: boolean;
          alreadyPaid?: boolean;
          error?: string;
        };
        if (cancelled) return;
        if (res.ok && (data.paid || data.alreadyPaid)) {
          setNote("PayPal capture succeeded on the server. Merchant will see Money: paid.");
        } else if (!res.ok) {
          setNote(
            data.error ||
              "PayPal capture pending — if payment succeeded, the webhook will still mark the order paid.",
          );
        }
      } catch {
        if (!cancelled) {
          setNote("Could not confirm PayPal from this page — webhook may still mark paid.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, paypalToken, psp]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Thanks — order received</h1>
      <p className="mt-3 text-sm leading-relaxed opacity-80">
        If you paid with JOKO, PayPal, card (Paystack), or Wave, payment is confirmed only after Kebu
        verifies the provider — not because this page loaded. Merchants see Money: paid when that lands.
      </p>
      {note ? <p className="mt-3 text-sm font-medium opacity-90">{note}</p> : null}
      {orderId ? <p className="mt-4 font-mono text-xs opacity-60">Order {orderId}</p> : null}
      <Link href="/" className="mt-8 text-sm font-semibold underline">
        Back to Kebu
      </Link>
    </main>
  );
}

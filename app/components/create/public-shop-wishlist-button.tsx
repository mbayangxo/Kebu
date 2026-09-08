"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Heart / save for signed-in shoppers. Guests get a sign-in prompt. */
export function PublicShopWishlistButton({
  subdomain,
  productId,
  productName,
}: {
  subdomain: string;
  productId: string;
  productName: string;
}) {
  const [signedIn, setSignedIn] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setSignedIn(Boolean(user));
    if (!user) {
      setSaved(false);
      return;
    }
    const res = await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/wishlist`, {
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const items = Array.isArray(data.items) ? data.items : [];
    setSaved(items.some((it: { productId?: string }) => it.productId === productId));
  }, [subdomain, productId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggle() {
    setHint(null);
    if (!signedIn) {
      setHint("Sign in under My account to save a wishlist.");
      return;
    }
    setBusy(true);
    try {
      if (saved) {
        const res = await fetch(
          `/api/public/sites/${encodeURIComponent(subdomain)}/wishlist?productId=${encodeURIComponent(productId)}`,
          { method: "DELETE", credentials: "include" },
        );
        if (res.ok) setSaved(false);
      } else {
        const res = await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/wishlist`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (res.ok) setSaved(true);
        else {
          const data = await res.json().catch(() => ({}));
          setHint(typeof data.error === "string" ? data.error : "Could not save.");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-0.5">
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        className="kebu-shop-wishlist inline-block rounded-full border border-current px-3 py-1.5 text-xs font-bold opacity-90 disabled:opacity-50"
        aria-label={saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      >
        {saved ? "Saved ★" : "Wishlist"}
      </button>
      {hint ? <span className="text-[9px] opacity-60 max-w-[10rem]">{hint}</span> : null}
    </div>
  );
}

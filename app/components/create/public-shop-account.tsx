"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authCallbackUrl, isEmailNotConfirmed } from "@/lib/auth/email-confirm";
import { shopAccountPath } from "@/lib/shop/customer-account";

type OrderRow = {
  id: string;
  order_number?: string | null;
  product_name: string;
  quantity: number;
  price_label: string;
  status: string;
  payment_status?: string | null;
  created_at: string;
  items?: { product_name: string; quantity: number; price_label: string }[];
};

type WishItem = {
  productId: string;
  name: string;
  priceLabel: string;
  imageUrl: string;
};

/** Live-shop customer portal: create account, sign in, see purchase history. */
export function PublicShopAccount({
  subdomain,
  siteTitle,
}: {
  subdomain: string;
  siteTitle: string;
}) {
  const supabase = createClient();
  const accountPath = shopAccountPath(subdomain);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [wishlist, setWishlist] = useState<WishItem[]>([]);
  const [messages, setMessages] = useState<{ id: string; sender_role: string; body: string; created_at: string }[]>(
    [],
  );
  const [messageBody, setMessageBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  const loadMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUserEmail(null);
        setOrders([]);
        setWishlist([]);
        return;
      }
      setUserEmail(user.email ?? null);
      const res = await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/me`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setUserEmail(null);
        setOrders([]);
        setWishlist([]);
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load your account.");
        return;
      }
      if (data.profile?.displayName) setDisplayName(data.profile.displayName);
      if (data.profile?.phone) setPhone(data.profile.phone);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      if (data.needsMigration) {
        setNote(typeof data.message === "string" ? data.message : "Migration 048 required.");
      }
      const wishRes = await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/wishlist`, {
        credentials: "include",
      });
      const wishData = await wishRes.json().catch(() => ({}));
      setWishlist(wishRes.ok && Array.isArray(wishData.items) ? wishData.items : []);
      const msgRes = await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/messages`, {
        credentials: "include",
      });
      const msgData = await msgRes.json().catch(() => ({}));
      setMessages(msgRes.ok && Array.isArray(msgData.messages) ? msgData.messages : []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [subdomain, supabase.auth]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  async function authSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setConfirmPending(false);
    setNote(null);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          if (isEmailNotConfirmed(err.message)) {
            setConfirmPending(true);
            setError("Confirm your email first, then sign in.");
          } else {
            setError(err.message);
          }
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: authCallbackUrl(accountPath),
            data: { full_name: displayName.trim() || undefined },
          },
        });
        if (err) {
          setError(err.message);
          return;
        }
        setNote("Check your email to confirm, then sign in. Guest checkout still works without an account.");
        setMode("signin");
        return;
      }
      await loadMe();
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/me`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save.");
        return;
      }
      setNote("Profile saved for this store.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setOrders([]);
    setWishlist([]);
    setNote(null);
  }

  async function removeWish(productId: string) {
    await fetch(
      `/api/public/sites/${encodeURIComponent(subdomain)}/wishlist?productId=${encodeURIComponent(productId)}`,
      { method: "DELETE", credentials: "include" },
    );
    setWishlist((w) => w.filter((i) => i.productId !== productId));
  }

  async function sendStoreMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageBody.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: messageBody.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not send.");
        return;
      }
      setMessageBody("");
      const msgRes = await fetch(`/api/public/sites/${encodeURIComponent(subdomain)}/messages`, {
        credentials: "include",
      });
      const msgData = await msgRes.json().catch(() => ({}));
      setMessages(msgRes.ok && Array.isArray(msgData.messages) ? msgData.messages : []);
      setNote("Message sent to the store.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 text-[#0a0a0a]">
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">
        <Link href={`/sites/${subdomain}`} className="underline">
          ← {siteTitle}
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Your shop account</h1>
      <p className="mt-1 text-sm opacity-70">
        Create a free Kebu account to see purchase history for this store. Cart still works as a guest.
      </p>

      {loading ? (
        <p className="mt-6 text-sm opacity-60">Loading…</p>
      ) : !userEmail ? (
        <form onSubmit={(e) => void authSubmit(e)} className="mt-6 space-y-3 rounded-2xl border border-black/10 bg-white p-4">
          <div className="flex gap-2 text-xs font-bold">
            <button
              type="button"
              className={mode === "signin" ? "underline" : "opacity-50"}
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
            <span className="opacity-30">·</span>
            <button
              type="button"
              className={mode === "signup" ? "underline" : "opacity-50"}
              onClick={() => setMode("signup")}
            >
              Create account
            </button>
          </div>
          {mode === "signup" ? (
            <input
              placeholder="Your name"
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          ) : null}
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            minLength={8}
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          {error ? <p className="text-xs text-red-700">{error}</p> : null}
          {confirmPending ? (
            <p className="text-xs opacity-70">Open the confirmation link we emailed you.</p>
          ) : null}
          {note ? <p className="text-xs opacity-70">{note}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-black px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-sm font-semibold">{userEmail}</p>
            <button type="button" className="mt-2 text-xs underline opacity-60" onClick={() => void signOut()}>
              Sign out
            </button>
            <form onSubmit={(e) => void saveProfile(e)} className="mt-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Profile for this store</p>
              <input
                placeholder="Display name"
                maxLength={80}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <input
                placeholder="WhatsApp / phone"
                maxLength={24}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                Save profile
              </button>
            </form>
            {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
            {note ? <p className="mt-2 text-xs opacity-70">{note}</p> : null}
          </div>

          <section>
            <h2 className="text-lg font-bold">Message the store</h2>
            <p className="mt-1 text-xs opacity-60">
              Ask about sizes, delivery, or custom orders. The merchant replies in their Shop → Messages.
            </p>
            <ul className="mt-3 max-h-40 space-y-2 overflow-auto">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`rounded-lg px-2 py-1.5 text-sm ${
                    m.sender_role === "customer" ? "bg-black/5 ml-2" : "bg-white border border-black/10 mr-2"
                  }`}
                >
                  <p className="text-[9px] font-bold uppercase opacity-50">
                    {m.sender_role === "customer" ? "You" : "Store"}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </li>
              ))}
            </ul>
            <form onSubmit={(e) => void sendStoreMessage(e)} className="mt-3 space-y-2">
              <textarea
                required
                maxLength={2000}
                rows={3}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Write to the store…"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                Send message
              </button>
            </form>
          </section>

          <section>
            <h2 className="text-lg font-bold">Wishlist</h2>
            <p className="mt-1 text-xs opacity-60">Saved products on this store. Tap Wishlist on a product card.</p>
            {wishlist.length === 0 ? (
              <p className="mt-3 text-sm opacity-60">No saved items yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {wishlist.map((w) => (
                  <li
                    key={w.productId}
                    className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{w.name}</p>
                      {w.priceLabel ? <p className="text-[11px] opacity-60">{w.priceLabel}</p> : null}
                    </div>
                    <button
                      type="button"
                      className="text-[10px] underline opacity-60 shrink-0"
                      onClick={() => void removeWish(w.productId)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold">Purchase history</h2>
            <p className="mt-1 text-xs opacity-60">
              Orders placed while signed in on this store. Status is fulfillment — Money: unpaid until a
              verified payment webhook.
            </p>
            {orders.length === 0 ? (
              <p className="mt-3 text-sm opacity-60">No orders yet for this account on this store.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {orders.map((o) => (
                  <li key={o.id} className="rounded-xl border border-black/10 bg-white px-3 py-3 text-sm">
                    <p className="font-semibold">
                      {o.order_number ? (
                        <span className="font-mono text-[11px] opacity-70">{o.order_number} · </span>
                      ) : null}
                      {o.quantity}× {o.product_name}
                    </p>
                    {o.items && o.items.length > 1 ? (
                      <ul className="mt-1 text-[11px] opacity-70">
                        {o.items.map((it, i) => (
                          <li key={`${o.id}-${i}`}>
                            {it.quantity}× {it.product_name}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mt-1 text-[10px] uppercase tracking-wider opacity-50">
                      {o.status}
                      {o.payment_status ? ` · Money: ${o.payment_status}` : ""} ·{" "}
                      {new Date(o.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

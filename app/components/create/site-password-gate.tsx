"use client";

import { useState, useEffect } from "react";

/**
 * Password gate overlay for password-protected shops.
 * Checks for a non-httpOnly indicator cookie; if absent, shows a blocking form.
 * On success the auth API sets both a session cookie and this indicator cookie.
 */
export function SitePasswordGate({
  subdomain,
  shopName,
}: {
  subdomain: string;
  shopName: string;
}) {
  const indicatorKey = `kebu_site_pw_ok_${subdomain}`;
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hasIndicator = document.cookie
      .split(";")
      .some((c) => c.trim().startsWith(`${indicatorKey}=1`));
    setUnlocked(hasIndicator);
  }, [indicatorKey]);

  // While checking cookie (server-render → hydration gap), render nothing over the site.
  if (unlocked === null || unlocked) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/sites/${subdomain}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      if (res.ok) {
        // The API sets the httpOnly session cookie. Set the indicator here.
        const expires = new Date(Date.now() + 86400 * 1000).toUTCString();
        document.cookie = `${indicatorKey}=1; path=/; expires=${expires}; SameSite=Lax`;
        setUnlocked(true);
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Incorrect password.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(15,13,51,0.96)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-2xl"
        style={{ background: "#FFFAF6", border: "1px solid #F0E8DF" }}
      >
        <div className="mb-6 flex flex-col items-center gap-2">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "#FF5500" }}
            aria-hidden
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-[17px] font-bold" style={{ color: "#0F0D33" }}>
            {shopName}
          </h1>
          <p className="text-center text-[13px]" style={{ color: "#8A8578" }}>
            This shop is password protected.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            autoComplete="current-password"
            disabled={busy}
            className="w-full rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#FF5500]/40 disabled:opacity-60"
            style={{ border: "1.5px solid #E8E0D8", background: "#fff" }}
          />
          {error ? (
            <p className="text-[12px] font-medium" style={{ color: "#B91C1C" }}>
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !password.trim()}
            className="w-full rounded-xl py-3 text-[14px] font-bold text-white disabled:opacity-50"
            style={{ background: "#FF5500" }}
          >
            {busy ? "Checking…" : "Enter shop"}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px]" style={{ color: "#C0B8B0" }}>
          Powered by <span style={{ color: "#FF5500", fontWeight: 600 }}>kebu</span>
        </p>
      </div>
    </div>
  );
}

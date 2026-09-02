"use client";

import { useState } from "react";

export function NewsletterSignup({
  projectId,
  heading,
  subheading,
  buttonLabel,
  successMessage,
  preview = false,
}: {
  projectId?: string;
  heading: string;
  subheading: string;
  buttonLabel: string;
  successMessage: string;
  preview?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview || !projectId) {
      setError("Publish your site to collect real emails.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not subscribe. Try again.");
        return;
      }
      setDone(true);
      setEmail("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="newsletter" className="px-5 py-12 max-w-xl mx-auto scroll-mt-20 text-center">
      <h2 className="text-2xl font-bold mb-2">{heading}</h2>
      <p className="text-sm opacity-75 mb-6">{subheading}</p>
      {done ? (
        <p className="text-sm font-semibold" style={{ color: "#00A651" }}>
          {successMessage}
        </p>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="flex flex-col sm:flex-row gap-2 justify-center">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="flex-1 min-w-0 rounded-full border px-4 py-2.5 text-sm"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-full px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: "#FF5500" }}
          >
            {busy ? "Saving…" : buttonLabel}
          </button>
        </form>
      )}
      {error ? <p className="text-xs text-red-600 mt-3">{error}</p> : null}
      {preview && !projectId ? (
        <p className="text-[10px] opacity-50 mt-3">Preview only — subscribers save when the site is live.</p>
      ) : null}
    </section>
  );
}

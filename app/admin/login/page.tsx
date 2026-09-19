"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = use(searchParams);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, next }),
      });
      if (res.ok) {
        const { next: dest } = await res.json();
        const safeDest =
          typeof dest === "string" &&
          dest.startsWith("/admin") &&
          !dest.startsWith("//") &&
          !dest.includes("\\")
            ? dest
            : "/admin";
        router.push(safeDest);
        router.refresh();
      } else {
        setError("Incorrect password");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-deep-green flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
        <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-1">Internal</p>
        <h1 className="font-display text-2xl font-bold text-ink mb-1">Admin access</h1>
        <p className="text-muted text-sm mb-6">Enter the admin password to continue.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full border border-border rounded-xl px-4 py-3 text-sm text-ink"
            required
          />
          {error && <p className="text-red-earth text-xs font-medium">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-deep-green text-ivory font-bold text-sm py-3 rounded-xl hover:bg-mid-green transition-colors disabled:opacity-50"
          >
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type SiteRow = {
  id: string;
  title: string;
  subdomain: string | null;
  status: string;
  published_at: string | null;
  updated_at: string;
};

export default function SupportDeskPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [reason, setReason] = useState("");
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [supportEmail, setSupportEmail] = useState<string | null>(null);

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/sites?q=${encodeURIComponent(q.trim())}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not search.");
        setSites([]);
        return;
      }
      setSites(json.sites ?? []);
      setSupportEmail(json.supportEmail ?? null);
    } finally {
      setLoading(false);
    }
  }, [q]);

  const openSupportSession = useCallback(async (projectId: string) => {
    const why = reason.trim();
    if (why.length < 5) {
      setError("Add a short ticket or reason before opening a customer site.");
      return;
    }
    setOpeningId(projectId);
    setError(null);
    try {
      const res = await fetch("/api/support/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, reason: why }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not start support session.");
        return;
      }
      router.push(`/create/${projectId}`);
    } finally {
      setOpeningId(null);
    }
  }, [reason, router]);

  return (
    <div className="min-h-screen" style={{ background: "#F7F4EE", color: "#1a1a1a" }}>
      <div className="px-4 py-10" style={{ background: "#0F0D33", color: "#fff" }}>
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-300">Team · Support desk</p>
          <h1 className="font-display text-3xl font-bold">Help someone with their site</h1>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            Search for the site, enter the customer ticket or support reason, then start a 30-minute
            project-bound support session. Access is audited and expires automatically.
          </p>
          {supportEmail ? <p className="mt-2 text-xs text-white/50">Signed in as {supportEmail}</p> : null}
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void search(); }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="subdomain or site UUID"
            className="min-w-[200px] flex-1 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm"
          />
          <button type="submit" disabled={loading} className="rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: "#FF5500" }}>
            {loading ? "Searching…" : "Find site"}
          </button>
        </form>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/60">Ticket / support reason</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={240}
            placeholder="Example: Ticket 1842 — customer asked for help fixing navigation"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm"
          />
        </label>

        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

        <ul className="space-y-3">
          {sites.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="text-xs text-black/50">
                  {s.subdomain ? `${s.subdomain}.kebu.africa` : "no subdomain"} · {s.status}
                  {s.published_at ? " · published" : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={openingId === s.id || reason.trim().length < 5}
                onClick={() => void openSupportSession(s.id)}
                className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40"
                style={{ background: "#0F0D33" }}
              >
                {openingId === s.id ? "Starting…" : "Start support session"}
              </button>
            </li>
          ))}
        </ul>

        {!loading && sites.length === 0 && !error ? <p className="text-sm text-black/50">Search for a site to begin support.</p> : null}

        <p className="text-xs text-black/40">
          <Link href="/admin/record" className="underline">Kebu Record</Link>{" "}
          · platform counts use the separate admin session.
        </p>
      </div>
    </div>
  );
}

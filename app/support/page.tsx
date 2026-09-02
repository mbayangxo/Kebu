"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

type SiteRow = {
  id: string;
  title: string;
  subdomain: string | null;
  status: string;
  published_at: string | null;
  updated_at: string;
  owner_id: string;
};

export default function SupportDeskPage() {
  const [q, setQ] = useState("");
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="min-h-screen" style={{ background: "#F7F4EE", color: "#1a1a1a" }}>
      <div className="px-4 py-10" style={{ background: "#0F0D33", color: "#fff" }}>
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
            Team · Support desk
          </p>
          <h1 className="font-display text-3xl font-bold">Help someone with their site</h1>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            Search by subdomain (e.g. maylecor) or project id, then open the builder. Every open is
            logged. Your account must be listed in{" "}
            <code className="text-amber-200">KEBU_SUPPORT_ADMIN_EMAILS</code>.
          </p>
          {supportEmail ? (
            <p className="mt-2 text-xs text-white/50">Signed in as {supportEmail}</p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="maylecor or site UUID"
            className="min-w-[200px] flex-1 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full px-5 py-2.5 text-sm font-bold text-white"
            style={{ background: "#FF5500" }}
          >
            {loading ? "Searching…" : "Find site"}
          </button>
        </form>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <ul className="space-y-3">
          {sites.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3"
            >
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="text-xs text-black/50">
                  {s.subdomain ? `${s.subdomain}.kebu.africa` : "no subdomain"} · {s.status}
                  {s.published_at ? " · published" : ""}
                </p>
              </div>
              <Link
                href={`/create/${s.id}`}
                className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
                style={{ background: "#0F0D33" }}
              >
                Open builder
              </Link>
            </li>
          ))}
        </ul>

        {!loading && sites.length === 0 && !error ? (
          <p className="text-sm text-black/50">Search for a subdomain to help someone edit their site.</p>
        ) : null}

        <p className="text-xs text-black/40">
          <Link href="/admin/record" className="underline">
            Kebu Record
          </Link>{" "}
          · cookie admin for platform counts · this desk uses your signed-in support account.
        </p>
      </div>
    </div>
  );
}

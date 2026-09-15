"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Subscriber = {
  email: string;
  name?: string | null;
  source?: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

export function ShopNewsletterPanel({
  projectId,
  sub,
}: {
  projectId: string;
  sub?: string;
}) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [copyNote, setCopyNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/newsletter`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load subscribers.");
        return;
      }
      const list = Array.isArray(data.subscribers)
        ? data.subscribers
        : Array.isArray(data.emails)
          ? (data.emails as string[]).map((email) => ({ email, created_at: "" }))
          : [];
      setSubscribers(list);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = search.trim()
    ? subscribers.filter(
        (s) =>
          s.email.toLowerCase().includes(search.toLowerCase()) ||
          (s.name ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : subscribers;

  function exportCsv() {
    const header = "email,name,source,date\n";
    const rows = subscribers
      .map((s) => `${s.email},${s.name ?? ""},${s.source ?? ""},${s.created_at ?? ""}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kebu-subscribers-${projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyEmails() {
    const text = subscribers.map((s) => s.email).join(", ");
    navigator.clipboard.writeText(text).then(() => {
      setCopyNote("Copied!");
      setTimeout(() => setCopyNote(null), 2000);
    });
  }

  if (sub === "campaigns") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <div className="text-4xl mb-3">📣</div>
        <h2 className="text-lg font-bold mb-2" style={{ color: KEBU.black }}>Campaigns coming soon</h2>
        <p className="text-sm leading-relaxed" style={{ color: KEBU.muted }}>
          Send newsletters and promos directly to your subscriber list. Available soon.
        </p>
        {subscribers.length > 0 && (
          <p className="text-sm mt-4 font-semibold" style={{ color: KEBU.black }}>
            You have {subscribers.length} subscriber{subscribers.length !== 1 ? "s" : ""} ready.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: KEBU.black }}>Email list</h1>
          <p className="text-sm mt-0.5" style={{ color: KEBU.muted }}>
            {loading ? "Loading…" : `${subscribers.length} subscriber${subscribers.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyEmails}
            className="rounded-lg px-3 py-2 text-[12px] font-semibold border transition-opacity hover:opacity-80"
            style={{ border: `1px solid #E5E5E5`, color: KEBU.black, background: "#fff" }}
          >
            {copyNote ?? "Copy emails"}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-lg px-3 py-2 text-[12px] font-semibold transition-opacity hover:opacity-80"
            style={{ background: KEBU.black, color: "#fff" }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* How to grow your list */}
      <div className="rounded-2xl p-4 mb-6 flex gap-3" style={{ background: "#FFF8F2", border: "1px solid #FFD7BB" }}>
        <span className="text-xl flex-shrink-0 mt-0.5">💡</span>
        <div>
          <p className="text-[12px] font-semibold mb-1" style={{ color: KEBU.black }}>Grow your list</p>
          <p className="text-[12px] leading-relaxed" style={{ color: KEBU.muted }}>
            Add an <strong>Email list</strong> or <strong>Email popup</strong> section to any page in the builder — subscribers land here automatically.
          </p>
        </div>
      </div>

      {/* Search */}
      {subscribers.length > 5 && (
        <input
          type="search"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-[13px] mb-4 outline-none focus:ring-1"
          style={{ border: "1px solid #E5E5E5", background: "#fff", color: KEBU.black }}
        />
      )}

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-sm" style={{ color: KEBU.muted }}>Loading…</div>
      ) : error ? (
        <div className="py-12 text-center text-sm" style={{ color: "#DC2626" }}>{error}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-3xl mb-3">✉️</div>
          <p className="text-sm font-semibold mb-1" style={{ color: KEBU.black }}>
            {search ? "No subscribers match your search." : "No subscribers yet."}
          </p>
          {!search && (
            <p className="text-[12px]" style={{ color: KEBU.muted }}>
              Add an Email list section to your site to start collecting addresses.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E5E5" }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #E5E5E5" }}>
                <th className="px-4 py-2.5 text-left font-semibold" style={{ color: KEBU.muted }}>Email</th>
                <th className="px-4 py-2.5 text-left font-semibold hidden sm:table-cell" style={{ color: KEBU.muted }}>Name</th>
                <th className="px-4 py-2.5 text-left font-semibold hidden md:table-cell" style={{ color: KEBU.muted }}>Source</th>
                <th className="px-4 py-2.5 text-left font-semibold hidden sm:table-cell" style={{ color: KEBU.muted }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.email}
                  style={{
                    borderBottom: i < filtered.length - 1 ? "1px solid #F0F0F0" : "none",
                    background: "#fff",
                  }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: KEBU.black }}>{s.email}</td>
                  <td className="px-4 py-3 hidden sm:table-cell" style={{ color: KEBU.muted }}>{s.name ?? "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell" style={{ color: KEBU.muted }}>
                    {s.source ? (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "#F4F4F5", color: KEBU.muted }}>
                        {s.source}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell" style={{ color: KEBU.muted }}>
                    {s.created_at ? formatDate(s.created_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 text-[11px]" style={{ color: KEBU.muted, borderTop: "1px solid #F0F0F0", background: "#FAFAFA" }}>
            {filtered.length} of {subscribers.length} subscribers
          </div>
        </div>
      )}
    </div>
  );
}

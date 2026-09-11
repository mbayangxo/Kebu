"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import type { CustomerSegment } from "@/app/api/projects/[id]/segments/route";

function formatXof(n: number): string {
  if (!n) return "—";
  return `${Math.round(n).toLocaleString()} XOF`;
}

export function ShopSegmentsPanel({ projectId }: { projectId: string }) {
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/segments`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load segments.");
        return;
      }
      setSegments(Array.isArray(data.segments) ? data.segments : []);
      setTotalCustomers(typeof data.totalCustomers === "number" ? data.totalCustomers : 0);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeSegment = segments.find((s) => s.id === activeSegmentId) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            Customer segments
          </p>
          <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
            Auto-computed from your real order history. {totalCustomers > 0 ? `${totalCustomers} customers identified.` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ background: KEBU.black }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Computing segments…
        </p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : totalCustomers === 0 ? (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            No customers yet
          </p>
          <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
            Segments appear once you have confirmed or fulfilled orders with customer names.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            {segments
              .filter((s) => s.count > 0)
              .map((seg) => (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => setActiveSegmentId(seg.id === activeSegmentId ? null : seg.id)}
                  className="w-full rounded-xl border px-4 py-3 text-left transition-colors"
                  style={{
                    borderColor: activeSegmentId === seg.id ? KEBU.orange : KEBU.border,
                    background: activeSegmentId === seg.id ? "#fff8f3" : "#fff",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold" style={{ color: KEBU.black }}>
                        {seg.label}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: KEBU.muted }}>
                        {seg.description}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                      style={{ background: KEBU.orange, color: "#fff" }}
                    >
                      {seg.count}
                    </span>
                  </div>
                </button>
              ))}

            {segments.filter((s) => s.count > 0).length === 0 ? (
              <p className="text-xs" style={{ color: KEBU.muted }}>
                No customers match any segment yet. Segments require confirmed orders.
              </p>
            ) : null}
          </div>

          <div
            className="min-h-[200px] rounded-xl border p-4"
            style={{ borderColor: KEBU.border, background: KEBU.cream }}
          >
            {!activeSegment ? (
              <p className="text-sm" style={{ color: KEBU.muted }}>
                Tap a segment to see its members.
              </p>
            ) : (
              <div>
                <p className="text-sm font-bold" style={{ color: KEBU.black }}>
                  {activeSegment.label} · {activeSegment.count} customers
                </p>
                <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
                  {activeSegment.description}
                </p>
                <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                  {activeSegment.members.map((m) => (
                    <li
                      key={m.key}
                      className="rounded-lg bg-white px-3 py-2 text-xs"
                      style={{ border: `1px solid ${KEBU.border}` }}
                    >
                      <p className="font-semibold" style={{ color: KEBU.black }}>
                        {m.name}
                      </p>
                      <p className="opacity-70">
                        {[m.phone, m.email].filter(Boolean).join(" · ") || "No contact"}
                      </p>
                      <p
                        className="mt-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: KEBU.faint }}
                      >
                        {m.orderCount} order{m.orderCount !== 1 ? "s" : ""}
                        {m.lifetimeXof > 0 ? ` · ${formatXof(m.lifetimeXof)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
                {activeSegment.members.length === 50 ? (
                  <p className="mt-2 text-[10px]" style={{ color: KEBU.muted }}>
                    Showing top 50. Export CSV coming soon.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="rounded-2xl p-4 text-xs leading-relaxed"
        style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
      >
        <p className="font-semibold" style={{ color: KEBU.black }}>
          How to use segments
        </p>
        <p className="mt-1">
          <strong>VIP</strong> — send thank-you WhatsApp messages, offer early access to new products.
        </p>
        <p className="mt-0.5">
          <strong>At risk</strong> — reach out via WhatsApp with a special discount before they forget you.
        </p>
        <p className="mt-0.5">
          <strong>Repeat buyers</strong> — your most loyal audience. Ask for reviews, referrals, or a testimonial.
        </p>
      </div>
    </div>
  );
}

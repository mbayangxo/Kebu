"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReachBoardCreative } from "@/lib/reach/auction";

function deviceKind(): "desktop" | "tablet" | "mobile" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function sessionKey(): string {
  const k = "kebu_reach_board_session";
  try {
    let v = sessionStorage.getItem(k);
    if (!v || v.length < 8) {
      v = `s${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      sessionStorage.setItem(k, v);
    }
    return v.slice(0, 64);
  } catch {
    return `s${Date.now().toString(36)}`;
  }
}

/** Public paid placement board — impressions only when ≥50% visible. */
export function ReachBoardPanel() {
  const [creatives, setCreatives] = useState<ReachBoardCreative[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const impressed = useRef(new Set<string>());

  const load = useCallback(async () => {
    const res = await fetch("/api/public/reach/board?limit=12");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load board.");
      setCreatives([]);
      return;
    }
    setCreatives(Array.isArray(data.creatives) ? data.creatives : []);
    setNote(typeof data.honestNote === "string" ? data.honestNote : null);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function recordImpression(campaignId: string, ratio: number) {
    if (impressed.current.has(campaignId)) return;
    impressed.current.add(campaignId);
    await fetch("/api/public/reach/board/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        eventType: "impression",
        visibleRatio: ratio,
        sessionKey: sessionKey(),
        device: deviceKind(),
        referrer: typeof document !== "undefined" ? document.referrer.slice(0, 500) : null,
      }),
    }).catch(() => undefined);
  }

  async function onBoardClick(c: ReachBoardCreative) {
    setBusy(c.campaignId);
    try {
      const res = await fetch("/api/public/reach/board/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: c.campaignId,
          eventType: "board_click",
          sessionKey: sessionKey(),
          device: deviceKind(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Click failed.");
        return;
      }
      const dest =
        typeof data.destinationUrl === "string" && data.destinationUrl
          ? data.destinationUrl
          : c.promotePath;
      window.location.href = dest.startsWith("http") || dest.startsWith("/") ? dest : c.promotePath;
    } finally {
      setBusy(null);
    }
  }

  if (error && !creatives.length) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (!creatives.length) {
    return (
      <div className="rounded-3xl border border-dashed border-black/15 bg-white p-10 text-center space-y-2">
        <p className="text-lg font-semibold">No paid placements right now</p>
        <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
          The board stays empty until merchants fund Reach credits, set a CPC bid, and enable board
          placement. We never invent ads or impressions to fill space.
        </p>
        {note ? <p className="text-[11px] opacity-60">{note}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {note ? <p className="text-[11px] opacity-60 leading-relaxed">{note}</p> : null}
      <ul className="grid sm:grid-cols-2 gap-3">
        {creatives.map((c) => (
          <BoardCard
            key={c.campaignId}
            creative={c}
            busy={busy === c.campaignId}
            onVisible={(ratio) => void recordImpression(c.campaignId, ratio)}
            onClick={() => void onBoardClick(c)}
          />
        ))}
      </ul>
    </div>
  );
}

function BoardCard({
  creative,
  busy,
  onVisible,
  onClick,
}: {
  creative: ReachBoardCreative;
  busy: boolean;
  onVisible: (ratio: number) => void;
  onClick: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e || fired.current) return;
        if (e.isIntersecting && e.intersectionRatio >= 0.5) {
          fired.current = true;
          onVisible(e.intersectionRatio);
        }
      },
      { threshold: [0.5, 0.75, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [onVisible]);

  return (
    <li
      ref={ref}
      className="rounded-2xl border border-black/10 bg-white overflow-hidden flex flex-col"
    >
      {creative.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creative.imageUrl} alt="" className="h-36 w-full object-cover bg-[#E8E6E1]" />
      ) : (
        <div className="h-36 w-full bg-[#0F0D33] flex items-end p-3">
          <span className="text-white font-display text-lg font-bold leading-tight">
            {creative.headline}
          </span>
        </div>
      )}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Sponsored</p>
        <p className="font-semibold text-sm leading-snug">{creative.headline}</p>
        {creative.note ? <p className="text-xs opacity-60 line-clamp-2">{creative.note}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={onClick}
          className="mt-auto rounded-full px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          style={{ background: "#E05A2B" }}
        >
          {busy ? "Opening…" : "Visit"}
        </button>
      </div>
    </li>
  );
}

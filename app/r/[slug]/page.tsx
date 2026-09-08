"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type PublicCampaign = {
  title: string;
  status: string;
  slug: string;
  destinationUrl: string | null;
  creativeNote: string | null;
  paused: boolean;
};

function deviceBucket(): "desktop" | "tablet" | "mobile" {
  if (typeof window === "undefined") return "desktop";
  return window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop";
}

export default function ReachPromotePublicPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [going, setGoing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/public/reach/${slug}`);
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Link not found.");
        return;
      }
      setCampaign(data.campaign as PublicCampaign);
      void fetch(`/api/public/reach/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "open",
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
          device: deviceBucket(),
        }),
        keepalive: true,
      }).catch(() => undefined);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function go() {
    if (!campaign?.destinationUrl) return;
    setGoing(true);
    try {
      await fetch(`/api/public/reach/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "click",
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
          device: deviceBucket(),
        }),
        keepalive: true,
      });
    } catch {
      /* still navigate */
    }
    window.location.href = campaign.destinationUrl;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#FFF8F0" }}>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted" style={{ background: "#FFF8F0" }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ background: "#FFF8F0" }}>
      <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 space-y-4 text-center shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Kebu Reach</p>
        <h1 className="font-display text-2xl font-bold">{campaign.title}</h1>
        {campaign.creativeNote ? (
          <p className="text-sm opacity-70 leading-relaxed">{campaign.creativeNote}</p>
        ) : null}
        {campaign.paused ? (
          <p className="text-sm text-amber-800 bg-amber-50 rounded-xl px-3 py-2">
            This promote link is paused by the owner.
          </p>
        ) : (
          <button
            type="button"
            disabled={going || !campaign.destinationUrl}
            onClick={() => void go()}
            className="w-full rounded-full py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "#E05A2B" }}
          >
            {going ? "Opening…" : "Continue"}
          </button>
        )}
        <p className="text-[10px] opacity-40">Tracked promote link · not a paid ad network yet</p>
      </div>
    </div>
  );
}

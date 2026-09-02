"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

type PublicCard = {
  publicAfriqueId: string;
  displayName: string;
  countryCode: string;
  eligibilityStatus: "verified";
  avatarUrl: string | null;
  verifiedAt: string | null;
};

export default function PublicAfriqueIdPage() {
  const params = useParams<{ publicId: string }>();
  const [card, setCard] = useState<PublicCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/public/id/${encodeURIComponent(params.publicId)}`);
      const data = (await res.json().catch(() => ({}))) as { card?: PublicCard; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not load this identity.");
        setCard(null);
      } else {
        setCard(data.card ?? null);
      }
      setLoading(false);
    })();
  }, [params.publicId]);

  return (
    <AppShell title="Afrique ID">
      <div className="max-w-md mx-auto px-5 py-12 text-center">
        {loading ? (
          <p className="text-sm" style={{ color: KEBU.muted }}>
            Loading…
          </p>
        ) : error ? (
          <div>
            <p className="text-sm mb-4" style={{ color: KEBU.errorText }}>
              {error}
            </p>
            <Link href="/" className="text-sm font-bold underline" style={{ color: KEBU.orange }}>
              Back to Kebu
            </Link>
          </div>
        ) : card ? (
          <div className="rounded-3xl border p-8 bg-white" style={{ borderColor: KEBU.border }}>
            {card.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-4" />
            ) : (
              <span
                className="w-20 h-20 rounded-full inline-flex items-center justify-center text-2xl font-bold text-white mb-4"
                style={{ background: KEBU.orange }}
              >
                {card.displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: KEBU.orange }}>
              Verified · Afrique ID
            </p>
            <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
              {card.displayName}
            </h1>
            <p className="font-mono text-sm mb-4">{card.publicAfriqueId}</p>
            <p className="text-xs" style={{ color: KEBU.muted }}>
              Country focus: {card.countryCode} · Personal identity on Kebu
            </p>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

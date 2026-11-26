"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuAuthHeaderCTA } from "@/app/components/kebu-auth-header-cta";
import { KEBU } from "@/lib/kebu-brand";

type Developer = {
  id: string;
  name: string;
  bio: string | null;
  websiteUrl: string | null;
  updatedAt: string;
};

export default function PersonResultPage() {
  const params = useParams<{ id: string }>();
  const [developer, setDeveloper] = useState<Developer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch(`/api/public/developers/${encodeURIComponent(params.id)}`);
        if (!active) return;
        if (r.status === 404) {
          setNotFound(true);
          return;
        }
        if (!r.ok) {
          setFailed(true);
          return;
        }
        const body = await r.json();
        setDeveloper(body.developer);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id]);

  return (
    <main className="min-h-screen" style={{ background: KEBU.bright, color: KEBU.black }}>
      <header className="flex items-center justify-between border-b px-5 py-4 sm:px-8" style={{ borderColor: KEBU.border }}>
        <Link href="/kebu-search" className="flex items-center gap-2">
          <KebuMark size={28} />
          <span className="text-sm font-black">Kebu Search</span>
        </Link>
        <KebuAuthHeaderCTA />
      </header>

      <div className="mx-auto max-w-[720px] px-5 py-10 sm:px-8">
        <Link href="/kebu-search" className="text-[11px] font-semibold" style={{ color: KEBU.muted }}>
          ← Back to search
        </Link>

        {loading ? <p className="mt-6 text-[11px]" style={{ color: KEBU.muted }}>Loading…</p> : null}

        {!loading && notFound ? (
          <div className="mt-6 rounded-[14px] border border-dashed p-10 text-center" style={{ borderColor: KEBU.border }}>
            <p className="font-semibold">This profile isn&rsquo;t publicly listed.</p>
            <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>
              It may not exist, or isn&rsquo;t an approved Kebu developer yet.
            </p>
          </div>
        ) : null}

        {!loading && failed ? (
          <div className="mt-6 rounded-[14px] border p-10 text-center" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg }}>
            <p className="font-semibold">This profile could not load.</p>
            <p className="mt-1 text-[11px]" style={{ color: KEBU.status.errorText }}>
              Check your connection and try again.
            </p>
          </div>
        ) : null}

        {!loading && developer ? (
          <article className="mt-6 rounded-[18px] border bg-white p-6" style={{ borderColor: KEBU.border }}>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-black">{developer.name}</h1>
              <span
                className="shrink-0 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wide"
                style={{ background: KEBU.status.successBg, color: KEBU.status.successText }}
              >
                verified
              </span>
            </div>

            {developer.bio ? <p className="mt-4 text-sm leading-relaxed">{developer.bio}</p> : null}

            <div className="mt-6 flex flex-wrap gap-2">
              {developer.websiteUrl ? (
                <a
                  href={developer.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white"
                  style={{ background: KEBU.black }}
                >
                  Visit website →
                </a>
              ) : null}
            </div>

            <p className="mt-6 text-[9px]" style={{ color: KEBU.faint }}>
              Source: Kebu Studio Marketplace · last updated {new Date(developer.updatedAt).toLocaleDateString()}
            </p>
          </article>
        ) : null}
      </div>
    </main>
  );
}

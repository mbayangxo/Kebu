"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KebuWorldSwitcher } from "@/app/components/kebu/kebu-world-switcher";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import type { HomeSummary } from "@/lib/account/home-summary";
import { KEBU } from "@/lib/kebu-brand";

const CONNECTED = [
  ["Mail", "/email", "message"],
  ["Chat", "/chat", "message"],
  ["Library", "/library", "library"],
  ["Docs", "/docs", "work"],
  ["Tasks", "/tasks", "work"],
  ["Calendar", "/calendar", "calendar"],
  ["People", "/people", "people"],
  ["Studio", "/studio", "studio"],
  ["Sites", "/my-sites", "builder"],
  ["Shop", "/shop", "commerce"],
  ["Opportunity OS", "/opportunity", "opportunity"],
] as const;

export default function SpacesPage() {
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [summaryState, setSummaryState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    fetch("/api/me/home", { credentials: "include" })
      .then((res) => res.ok ? res.json() : Promise.reject(res.status))
      .then((data) => {
        setSummary(data?.summary ?? null);
        setSummaryState("ready");
      })
      .catch(() => setSummaryState("error"));
  }, []);

  return (
    <AppShell title="Spaces">
      <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-7">
        <header className="grid gap-4 border-b pb-6 lg:grid-cols-[1fr_340px] lg:items-end" style={{ borderColor: KEBU.borders.default }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Spaces</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.04em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>Everything belongs somewhere.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>Personal work, businesses, sites and creative projects stay connected without turning Kebu into separate islands.</p>
          </div>
          <KebuWorldSwitcher compact />
        </header>

        <section className="py-6">
          <p className="mb-3 text-[9px] font-black uppercase tracking-[.15em]" style={{ color: KEBU.muted }}>Connected tools</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11">
            {CONNECTED.map(([label, href, icon]) => (
              <Link key={label} href={href} className="rounded-[16px] border bg-white p-3 outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#FF6A00]" style={{ borderColor: KEBU.borders.default }}>
                <KebuIcon name={icon as KebuIconName} size={18} style={{ color: KEBU.orange }} />
                <p className="mt-3 text-[11px] font-black">{label}</p>
              </Link>
            ))}
          </div>
        </section>

        {summaryState === "error" ? (
          <div role="alert" className="mb-4 rounded-xl border px-4 py-3 text-xs font-semibold" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }}>Could not load your spaces. Refresh to try again.</div>
        ) : null}

        <section className="grid gap-3 lg:grid-cols-3">
          <article className="rounded-[22px] border bg-black p-5 text-white" style={{ borderColor: KEBU.borders.default }}>
            <p className="text-[9px] font-black uppercase tracking-[.14em] text-white/45">Personal</p>
            <h2 className="mt-2 text-2xl" style={{ fontFamily: "var(--font-fraunces)" }}>Personal Kebu</h2>
            <p className="mt-2 text-[11px] leading-relaxed text-white/55">Discovery, creative work, messages and files that are not tied to a business.</p>
            <Link href="/dashboard" className="mt-5 inline-flex text-[10px] font-black uppercase tracking-wide" style={{ color: KEBU.orange }}>Open personal home →</Link>
          </article>

          {summaryState === "loading" ? (
            <article className="animate-pulse rounded-[22px] border bg-white p-5" style={{ borderColor: KEBU.borders.default }}>
              <div className="h-2 w-16 rounded-full" style={{ background: KEBU.borders.default }} />
              <div className="mt-3 h-4 w-32 rounded-full" style={{ background: KEBU.borders.default }} />
              <div className="mt-2 h-2 w-24 rounded-full" style={{ background: KEBU.borders.subtle }} />
            </article>
          ) : null}

          {summaryState === "ready" ? (summary?.businesses ?? []).map((business) => (
            <article key={business.id} className="rounded-[22px] border bg-white p-5" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>Business</p>
              <h2 className="mt-2 text-xl font-black">{business.name}</h2>
              <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>{business.role}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={"/business/" + business.id} className="rounded-full bg-black px-3 py-2 text-[10px] font-bold text-white">Open space</Link>
                <Link href={"/email?business=" + business.id} className="rounded-full border px-3 py-2 text-[10px] font-bold" style={{ borderColor: KEBU.borders.default }}>Mail</Link>
                <Link href={"/shop?business=" + business.id} className="rounded-full border px-3 py-2 text-[10px] font-bold" style={{ borderColor: KEBU.borders.default }}>Shop</Link>
              </div>
            </article>
          )) : null}

          {summaryState === "ready" && (summary?.businesses.length ?? 0) === 0 ? (
            <article className="rounded-[22px] border border-dashed bg-white p-5" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[9px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.orange }}>New space</p>
              <h2 className="mt-2 text-xl font-black">Start something</h2>
              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: KEBU.muted }}>Create a business only when you need business-specific tools. Your personal Kebu stays intact.</p>
              <Link href="/business/register" className="mt-5 inline-flex text-[10px] font-black uppercase tracking-wide" style={{ color: KEBU.orange }}>Create business →</Link>
            </article>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

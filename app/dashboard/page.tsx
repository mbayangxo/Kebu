"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { Skeleton } from "@/app/components/kebu-skeleton";
import { displayFirstName } from "@/lib/account/user-profile";
import type { HomeSummary } from "@/lib/account/home-summary";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";

type CalEvent = { id: string; title: string; starts_at: string; ends_at?: string | null };

const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}${m === 0 ? "" : ":" + String(m).padStart(2, "0")} ${ap}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function isToday(iso: string) {
  const d = new Date(iso);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

const QUICK: { label: string; href: string; icon: string }[] = [
  { label: "New note", href: "/docs/new", icon: "📝" },
  { label: "Upload", href: "/library", icon: "⬆" },
  { label: "Create", href: "/studio/new", icon: "✦" },
  { label: "Find", href: "/search", icon: "🔍" },
  { label: "Send", href: "/email", icon: "✉" },
  { label: "Plan", href: "/calendar", icon: "📅" },
  { label: "Learn", href: "/browser", icon: "📖" },
  { label: "More", href: "/tools", icon: "⚡" },
];

const SPACE_ACCENTS = [
  "linear-gradient(135deg,#0a0a0a,#1a0a03 55%,#FF5500)",
  "linear-gradient(135deg,#0c0c14,#1a1a2e 55%,#6C63FF)",
  "linear-gradient(135deg,#0a0f0a,#0d1f0d 55%,#00C896)",
  "linear-gradient(135deg,#140a00,#2a1500 55%,#F4B400)",
];

export default function KebuHomePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<CalEvent[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me/home", { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as { summary?: HomeSummary; error?: string };
      if (res.status === 401) { router.replace("/login?next=/dashboard"); return; }
      if (!res.ok || !data.summary) { setError(data.error ?? "Could not load your Kebu."); return; }
      if (!data.summary.setup?.onboardingComplete) { router.replace("/welcome?next=/dashboard"); return; }
      setSummary(data.summary);
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    fetch("/api/work/items?kind=event&limit=10", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { items?: CalEvent[] } | null) => {
        if (d?.items) setEvents(d.items.filter((e) => isToday(e.starts_at)));
      })
      .catch(() => {});
  }, []);

  const first = displayFirstName(summary?.profile.name, summary?.profile.email);
  const now = todayLabel();

  return (
    <AppShell title="Home">
      <div className="min-h-screen" style={{ background: KEBU.bright, color: KEBU.black }}>
        {loading ? (
          <div className="mx-auto max-w-[1400px] space-y-5 px-5 py-8 sm:px-8">
            <Skeleton height={44} width="55%" style={{ background: KEBU.cream }} />
            <Skeleton height={28} width="38%" style={{ background: KEBU.cream }} />
            <Skeleton height={140} width="100%" style={{ background: KEBU.cream }} />
            <Skeleton height={300} width="100%" style={{ background: KEBU.cream }} />
          </div>
        ) : error ? (
          <div className="mx-auto max-w-2xl px-5 py-12">
            <div className="rounded-2xl border p-6" style={{ borderColor: "rgba(255,31,31,.3)", background: "rgba(255,31,31,.07)" }}>
              <p className="font-semibold">{error}</p>
              <button type="button" onClick={() => void load()} className="mt-3 rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: KEBU.orange }}>Retry</button>
            </div>
          </div>
        ) : summary ? (
          <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
            {/* Main grid: content + right column */}
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">

              {/* ── Left: main content ── */}
              <div className="space-y-8 min-w-0">

                {/* Greeting */}
                <header>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[.18em]" style={{ color: "rgba(0,0,0,0.35)" }}>{now}</p>
                  <h1 className="text-[clamp(2.4rem,5vw,4rem)] font-black leading-[.92] tracking-[-.05em]" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
                    {greeting()},&nbsp;<span style={{ color: KEBU.orange }}>{first}.</span>
                  </h1>
                  <p className="mt-3 text-base text-black/50">What are we building today?</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link href="/studio/new" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[11px] font-black uppercase tracking-[.12em] text-white" style={{ background: KEBU.orange }}>
                      <span>→</span> Start from an idea
                    </Link>
                    <Link href="/opportunity" className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-[11px] font-black uppercase tracking-[.12em]" style={{ borderColor: "rgba(0,0,0,0.15)", color: KEBU.black }}>
                      Opportunity OS
                    </Link>
                  </div>
                </header>

                {/* Hero banner: dark card */}
                <div className="relative overflow-hidden rounded-2xl" style={{ background: "#0A0A0A", minHeight: 160 }}>
                  <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse at 75% 50%,#FF5500 0%,transparent 60%),radial-gradient(ellipse at 20% 80%,#6C63FF 0%,transparent 50%)" }} />
                  <div className="relative z-10 flex flex-col justify-end p-6 sm:p-8" style={{ minHeight: 160 }}>
                    <p className="text-xs font-black uppercase tracking-[.2em] text-white/30">Ideas Build Move.</p>
                    <p className="mt-2 max-w-xs text-2xl font-black leading-tight text-white" style={{ fontFamily: "var(--font-fraunces)" }}>Create Work<br />Learn Earn Belong</p>
                    <p className="mt-2 text-[10px] text-white/40">Dakar → New York → Everywhere ✦</p>
                  </div>
                </div>

                {/* Your spaces */}
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[11px] font-black uppercase tracking-[.1em]" style={{ color: "rgba(0,0,0,0.5)" }}>Your spaces</h2>
                    <Link href="/spaces" className="text-[10px] font-semibold" style={{ color: KEBU.orange }}>View all →</Link>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {summary.businesses.map((b, i) => (
                      <Link key={b.id} href={`/business/${b.id}`}
                        className="relative shrink-0 w-[170px] overflow-hidden rounded-2xl p-4 transition hover:-translate-y-0.5"
                        style={{ background: SPACE_ACCENTS[i % SPACE_ACCENTS.length], minHeight: 110 }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="relative z-10">
                          <p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">Business</p>
                          <p className="mt-6 text-sm font-black leading-tight text-white">{b.name}</p>
                        </div>
                      </Link>
                    ))}
                    {summary.sites.slice(0, 3).map((s, i) => (
                      <Link key={s.id} href={s.projectType === "store" ? `/shop/${s.id}` : `/my-sites/${s.id}`}
                        className="relative shrink-0 w-[170px] overflow-hidden rounded-2xl p-4 transition hover:-translate-y-0.5"
                        style={{ background: SPACE_ACCENTS[(i + 1) % SPACE_ACCENTS.length], minHeight: 110 }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="relative z-10">
                          <p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">{s.projectType === "store" ? "Store" : "Site"}</p>
                          <p className="mt-6 text-sm font-black leading-tight text-white">{s.title}</p>
                        </div>
                      </Link>
                    ))}
                    {summary.businesses.length === 0 && summary.sites.length === 0 ? (
                      <div className="relative shrink-0 w-[170px] overflow-hidden rounded-2xl p-4" style={{ background: SPACE_ACCENTS[0], minHeight: 110 }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="relative z-10">
                          <p className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">Personal</p>
                          <p className="mt-6 text-sm font-black leading-tight text-white">My Space</p>
                        </div>
                      </div>
                    ) : null}
                    <Link href="/create/new"
                      className="flex shrink-0 w-[120px] items-center justify-center rounded-2xl border border-dashed text-sm font-semibold transition hover:bg-black/[.04]"
                      style={{ borderColor: "rgba(0,0,0,0.18)", color: "rgba(0,0,0,0.4)", minHeight: 110 }}>
                      + Add
                    </Link>
                    {/* Inspirational dark card */}
                    <div className="relative shrink-0 w-[200px] overflow-hidden rounded-2xl p-5" style={{ background: "#0A0A0A", minHeight: 110 }}>
                      <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at 80% 20%,#FF5500,transparent 60%)" }} />
                      <p className="relative z-10 text-[9px] font-black uppercase tracking-[.16em] text-white/30">Kebu</p>
                      <p className="relative z-10 mt-3 text-xs font-black leading-relaxed text-white/60">
                        PEOPLE IDEAS<br />OPPORTUNITIES<br />REAL PROGRESS
                      </p>
                    </div>
                  </div>
                </section>

                {/* Pick up where you left off */}
                {summary.sites.length > 0 ? (
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-[11px] font-black uppercase tracking-[.1em]" style={{ color: "rgba(0,0,0,0.5)" }}>Pick up where you left off</h2>
                      <Link href="/library" className="text-[10px] font-semibold" style={{ color: KEBU.orange }}>View all →</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {summary.sites.slice(0, 4).map((s, i) => (
                        <Link key={s.id} href={s.projectType === "store" ? `/shop/${s.id}` : `/my-sites/${s.id}`}
                          className="group overflow-hidden rounded-xl border transition hover:-translate-y-0.5 hover:shadow-md"
                          style={{ borderColor: KEBU.borders.default }}>
                          <div className="h-28 overflow-hidden" style={{ background: `linear-gradient(145deg,${SPACE_ACCENTS[i % 4].match(/#[a-fA-F0-9]{6}/g)?.[2] ?? "#FF5500"},#111)` }} />
                          <div className="p-3">
                            <p className="truncate text-[11px] font-black">{s.title}</p>
                            <p className="mt-0.5 text-[9px]" style={{ color: KEBU.muted }}>
                              {s.projectType === "store" ? "Shop" : "Sites"} · {s.status === "published" ? "Live" : "Draft"}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}

                {/* Ideas are everywhere — opportunity section */}
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: KEBU.orange }}>Opportunity OS</p>
                      <h2 className="mt-1 text-xl font-black" style={{ fontFamily: "var(--font-fraunces)" }}>Ideas are everywhere.</h2>
                    </div>
                    <Link href="/opportunity" className="text-[10px] font-semibold" style={{ color: KEBU.orange }}>Browse all →</Link>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { tag: "Grant", title: "Creative Africa Fund", sub: "$50,000 · Global", href: "/opportunity" },
                      { tag: "Job", title: "Creative Director", sub: "Paris, France · Remote", href: "/opportunity" },
                      { tag: "Program", title: "AI for Creators", sub: "Google · 12 weeks", href: "/opportunity" },
                    ].map((opp) => (
                      <Link key={opp.title} href={opp.href}
                        className="group overflow-hidden rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                        style={{ borderColor: KEBU.borders.default, background: KEBU.white }}>
                        <span className="inline-flex rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wide text-white" style={{ background: KEBU.orange }}>{opp.tag}</span>
                        <p className="mt-3 font-black leading-tight">{opp.title}</p>
                        <p className="mt-1 text-[10px]" style={{ color: KEBU.muted }}>{opp.sub}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              </div>

              {/* ── Right column ── */}
              <aside className="space-y-4 lg:min-w-0">

                {/* Today's calendar */}
                <section className="rounded-2xl border overflow-hidden" style={{ borderColor: KEBU.borders.default, background: KEBU.white }}>
                  <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: KEBU.borders.default }}>
                    <h2 className="text-[11px] font-black uppercase tracking-[.1em]">Today</h2>
                    <Link href="/calendar" className="text-[10px] font-semibold" style={{ color: KEBU.orange }}>View calendar →</Link>
                  </div>
                  <div className="divide-y" style={{ borderColor: KEBU.borders.default }}>
                    {events.length > 0 ? events.map((ev) => (
                      <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: KEBU.orange }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold">{ev.title}</p>
                          <p className="text-[9px]" style={{ color: KEBU.muted }}>{formatTime(ev.starts_at)}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-[11px]" style={{ color: KEBU.muted }}>Nothing scheduled today.</p>
                        <Link href="/calendar" className="mt-2 inline-flex text-[10px] font-semibold" style={{ color: KEBU.orange }}>Add event →</Link>
                      </div>
                    )}
                  </div>
                </section>

                {/* Quick actions */}
                <section className="rounded-2xl border p-4" style={{ borderColor: KEBU.borders.default, background: KEBU.white }}>
                  <h2 className="mb-3 text-[11px] font-black uppercase tracking-[.1em]">Quick actions</h2>
                  <div className="grid grid-cols-4 gap-2">
                    {QUICK.map((q) => (
                      <Link key={q.href + q.label} href={q.href}
                        className="flex flex-col items-center gap-1.5 rounded-xl py-2.5 text-center transition hover:bg-black/[.04]">
                        <span className="text-lg">{q.icon}</span>
                        <span className="text-[9px] font-semibold leading-none" style={{ color: "rgba(0,0,0,0.55)" }}>{q.label}</span>
                      </Link>
                    ))}
                  </div>
                </section>

                {/* User profile card */}
                <section className="rounded-2xl border p-4" style={{ borderColor: KEBU.borders.default, background: KEBU.white }}>
                  <div className="flex items-center gap-3">
                    {summary.profile.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={summary.profile.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full font-black text-black" style={{ background: KEBU.orange }}>{(first || "K").charAt(0).toUpperCase()}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black">{summary.profile.name || first}</p>
                      <p className="truncate text-[10px]" style={{ color: KEBU.muted }}>Personal</p>
                    </div>
                    <Link href="/account/settings" className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-black/[.06]" style={{ color: KEBU.muted }}>
                      <KebuIcon name="settings" size={15} />
                    </Link>
                  </div>
                </section>

                {/* Inspirational dark card */}
                <section className="relative overflow-hidden rounded-2xl p-6" style={{ background: "#0A0A0A", minHeight: 160 }}>
                  <div className="absolute -bottom-16 -right-16 h-44 w-44 rotate-45 rounded-[35%] opacity-60" style={{ background: `linear-gradient(135deg,${KEBU.orange},${KEBU.red})` }} />
                  <p className="relative z-10 text-[9px] font-black uppercase tracking-[.18em] text-white/30">Same dreams.</p>
                  <p className="relative z-10 mt-2 text-2xl font-black leading-tight text-white" style={{ fontFamily: "var(--font-fraunces)" }}>Bigger moves.</p>
                  <p className="relative z-10 mt-3 text-[10px] text-white/40">Your work. Your vision.<br />Your Kebu.</p>
                </section>
              </aside>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

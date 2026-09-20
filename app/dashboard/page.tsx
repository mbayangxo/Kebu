"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { Skeleton } from "@/app/components/kebu-skeleton";
import { displayFirstName } from "@/lib/account/user-profile";
import type { HomeSummary } from "@/lib/account/home-summary";
import { toolById, type KebuToolId } from "@/lib/account/kebu-setup";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";
import { useKebuAccountContext } from "@/app/hooks/use-kebu-account-context";

const orange = KEBU.orange;
const red = KEBU.red;
const panel = KEBU.white;
const border = KEBU.borders.default;
const muted = KEBU.muted;

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

function Action({ href, label, icon }: { href: string; label: string; icon: KebuIconName }) {
  return (
    <Link href={href} className="group rounded-xl border p-3 text-center transition hover:-translate-y-0.5"
      style={{ borderColor: border, background: "rgba(255,255,255,.025)" }}>
      <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg text-lg"
        style={{ background: "linear-gradient(145deg,rgba(255,106,0,.22),rgba(255,31,31,.08))", color: orange }}>
        <KebuIcon name={icon} size={20} />
      </span>
      <span className="text-[11px] font-semibold" style={{ color: KEBU.black }}>{label}</span>
    </Link>
  );
}

function WorldCard({ title, subtitle, href, accent }: { title: string; subtitle: string; href: string; accent: string }) {
  return (
    <Link href={href} className="group min-w-[185px] flex-1 overflow-hidden rounded-xl border transition hover:-translate-y-0.5 hover:shadow-sm"
      style={{ borderColor: border, background: panel }}>
      <div className="h-20 relative overflow-hidden" style={{ background: accent }}>
        <div className="absolute -right-8 -top-12 h-32 w-32 rotate-45 rounded-[35%] bg-black/45" />
        <div className="absolute -bottom-10 left-7 h-24 w-24 rotate-45 rounded-[35%] bg-black/25" />
      </div>
      <div className="p-3.5">
        <p className="font-semibold" style={{ color: KEBU.black }}>{title}</p>
        <p className="mt-0.5 text-[11px]" style={{ color: muted }}>{subtitle}</p>
      </div>
    </Link>
  );
}

export default function KebuHomePage() {
  const router = useRouter();
  const { context: accountContext } = useKebuAccountContext();
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const first = displayFirstName(summary?.profile.name, summary?.profile.email);
  const activeSpace = accountContext?.mode === "business" && accountContext.activeBusiness ? accountContext.activeBusiness.name : "Personal";
  const hasWork = Boolean(summary && (summary.sites.length || summary.businesses.length || summary.updates.length));
  const primaryTool = summary ? toolById((summary.setup.tools[0] ?? "search") as KebuToolId) : null;

  return (
    <AppShell title="Home">
      <div className="min-h-[calc(100vh-60px)]" style={{ background: KEBU.bright, color: KEBU.black }}>
        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
          {loading ? (
            <div className="space-y-4">
              <Skeleton height={56} width="42%" style={{ background: KEBU.cream }} />
              <Skeleton height={132} width="100%" style={{ background: KEBU.cream }} />
              <Skeleton height={300} width="100%" style={{ background: KEBU.cream }} />
            </div>
          ) : error ? (
            <div className="rounded-xl border p-6" style={{ borderColor: "rgba(255,31,31,.35)", background: "rgba(255,31,31,.08)" }}>
              <p className="font-semibold">{error}</p>
              <button type="button" onClick={() => void load()} className="mt-3 rounded-full px-4 py-2 text-sm font-semibold text-black" style={{ background: orange }}>Retry</button>
            </div>
          ) : summary ? (
            <>
              <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                  <p className="mb-1 text-xs font-medium" style={{ color: muted }}>
                    {new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date())}
                  </p>
                  <div className="flex items-center gap-2"><p className="text-[10px] font-semibold tracking-[.08em]" style={{ color: orange }}>Your Kebu</p><span className="rounded-md border px-2 py-0.5 text-[9px] font-semibold" style={{borderColor:border,color:muted}}>{activeSpace} space</span></div>
                  <h1 className="mt-1 max-w-5xl text-3xl font-semibold tracking-[-.035em] sm:text-5xl" style={{ fontFamily: "var(--font-fraunces)" }}>
                    Welcome back, {first}. <span className="font-normal italic">Pick up where you left off.</span>
                  </h1>
                  <p className="mt-2 text-sm" style={{ color: muted }}>Everything you were working on, organized around your current space.</p>
                </div>
                <Link href={toolById((summary.setup.tools[0] ?? "search") as KebuToolId)?.href ?? "/search"} className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
                  style={{ background: "linear-gradient(90deg," + orange + "," + red + ")" }}>
                  Continue →
                </Link>
              </header>

              <section className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Your spaces</h2>
                  <Link href="/spaces" className="text-xs" style={{ color: muted }}>Open Spaces <Arrow /></Link>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {summary.businesses.map((business) => (
                    <WorldCard key={business.id} title={business.name} subtitle="Business" href={`/business/${business.id}`}
                      accent="linear-gradient(135deg,#FF6A00,#FF1F1F 55%,#2a0803)" />
                  ))}
                  {summary.sites.slice(0, 3).map((site) => (
                    <WorldCard key={site.id} title={site.title} subtitle={site.projectType === "store" ? "Store" : "Website"}
                      href={site.projectType === "store" ? `/shop/${site.id}` : `/my-sites/${site.id}`}
                      accent="linear-gradient(135deg,#1b0904,#FF6A00 55%,#FF1F1F)" />
                  ))}
                  {summary.businesses.length === 0 && summary.sites.length === 0 ? (
                    <WorldCard title="Personal" subtitle="Your private starting space" href={primaryTool?.href ?? "/search"} accent="linear-gradient(135deg,#141414,#FF6A00,#FF1F1F)" />
                  ) : null}
                  <Link href="/create" className="flex min-w-[150px] items-center justify-center rounded-xl border text-sm font-semibold transition hover:-translate-y-0.5"
                    style={{ borderColor: border, color: muted }}>+ New space</Link>
                </div>
              </section>

              {!hasWork ? (<section className="mb-6 grid gap-3 border-y py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" style={{borderColor:border}}><div><p className="text-[10px] font-semibold" style={{color:orange}}>START HERE</p><h2 className="mt-1 text-xl font-semibold">Your Home gets useful as you use Kebu.</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed" style={{color:muted}}>Nothing is filled with demo activity. Start with one of the tools you chose and real work will appear here automatically.</p></div><Link href={primaryTool?.href ?? "/search"} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-black px-4 text-xs font-semibold text-white">Open {primaryTool?.label ?? "Search"} →</Link></section>) : null}

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_340px]">
                <main className="space-y-4">
                  <section className="overflow-hidden rounded-xl border" style={{ borderColor: border, background: panel }}>
                    <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: border }}>
                      <h2 className="font-semibold"><span style={{ color: red }}>●</span> Needs your attention</h2>
                      <Link href="/tasks" className="text-xs" style={{ color: muted }}>View all <Arrow /></Link>
                    </div>
                    <div>
                      {summary.updates.length ? summary.updates.slice(0, 5).map((item) => (
                        <Link key={item.id} href={item.href} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-black/[.025]"
                          style={{ borderColor: border }}>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(255,85,0,.10)", color: orange }}><KebuIcon name="yande" size={17} /></span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{item.title}</p>
                            <p className="truncate text-[11px]" style={{ color: muted }}>{item.body}</p>
                          </div>
                          <Arrow />
                        </Link>
                      )) : (
                        <div className="px-4 py-8 text-center text-sm" style={{ color: muted }}>Nothing needs your attention right now.</div>
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="font-semibold">Continue where you left off</h2>
                      <Link href="/library" className="text-xs" style={{ color: muted }}>Library <Arrow /></Link>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {summary.sites.slice(0, 3).map((site) => (
                        <Link key={site.id} href={site.projectType === "store" ? `/shop/${site.id}` : `/my-sites/${site.id}`}
                          className="overflow-hidden rounded-xl border" style={{ borderColor: border, background: panel }}>
                          <div className="h-24" style={{ background: "linear-gradient(125deg,#25100a,#FF6A00 52%,#080808)" }} />
                          <div className="p-3.5">
                            <p className="font-semibold">{site.title}</p>
                            <p className="text-[11px]" style={{ color: muted }}>{site.status === "published" ? "Live" : "Continue editing"}</p>
                          </div>
                        </Link>
                      ))}
                      {summary.sites.length === 0 ? (
                        <Link href="/create/new" className="flex min-h-36 items-center justify-center rounded-xl border border-dashed text-sm" style={{ borderColor: border, color: muted }}>Create your first site →</Link>
                      ) : null}
                    </div>
                  </section>

                  <section className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["Sites", summary.stats.sitesTotal, "/my-sites"],
                      ["Products", summary.stats.storeProducts, "/shop"],
                      ["Subscribers", summary.stats.emailSubscribers, "/business"],
                    ].map(([label, value, href]) => (
                      <Link key={String(label)} href={String(href)} className="rounded-xl border p-5" style={{ borderColor: border, background: panel }}>
                        <p className="text-3xl" style={{ fontFamily: "var(--font-fraunces)" }}>{String(value)}</p>
                        <p className="mt-1 text-xs" style={{ color: muted }}>{String(label)}</p>
                      </Link>
                    ))}
                  </section>
                </main>

                <aside className="space-y-4">
                  <section className="rounded-xl border p-4" style={{ borderColor: border, background: panel }}>
                    <h2 className="mb-4 font-semibold">Quick actions</h2>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
                      {summary.setup.tools.slice(0, 8).map((id) => {
                        const tool = toolById(id as KebuToolId);
                        return tool ? <Action key={id} href={tool.href} label={tool.label} icon={tool.icon as KebuIconName} /> : null;
                      })}
                    </div>
                  </section>

                  <section className="rounded-xl border p-4" style={{ borderColor: border, background: panel }}>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="font-semibold">Your Kebu</h2>
                      <Link href="/account" className="text-xs" style={{ color: muted }}>Account <Arrow /></Link>
                    </div>
                    <div className="flex items-center gap-3">
                      {summary.profile.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={summary.profile.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 items-center justify-center rounded-full font-bold text-black" style={{ background: orange }}>{first.charAt(0).toUpperCase()}</span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{summary.profile.name || first}</p>
                        <p className="truncate text-xs" style={{ color: muted }}>{summary.profile.email}</p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border p-4" style={{ borderColor: border, background: panel }}>
                    <p className="text-[9px] font-semibold tracking-[.08em]" style={{ color: orange }}>Your setup</p>
                    <p className="mt-2 text-sm font-black capitalize">{summary.setup.persona}</p>
                    <p className="mt-1 text-[10px] leading-relaxed" style={{ color: muted }}>{summary.setup.intents.map((intent) => intent.replace("_", " ")).join(" · ")}</p>
                    <Link href="/welcome?edit=1" className="mt-3 inline-flex text-[10px] font-black uppercase tracking-wide" style={{ color: orange }}>Edit my Kebu →</Link>
                  </section>

                  <section className="relative min-h-48 overflow-hidden rounded-xl border p-5" style={{ borderColor: border, background: "linear-gradient(145deg,#170804,#0b0b0b 60%)" }}>
                    <div className="absolute -bottom-20 -right-16 h-52 w-52 rotate-45 rounded-[35%]" style={{ background: "linear-gradient(135deg,#FF6A00,#FF1F1F)" }} />
                    <p className="relative z-10 max-w-[190px] text-2xl leading-tight" style={{ fontFamily: "var(--font-fraunces)" }}>Your ideas.<br />Your work.<br />Your Kebu.</p>
                  </section>
                </aside>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

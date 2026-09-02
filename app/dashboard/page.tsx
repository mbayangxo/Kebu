"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";
import { displayFirstName } from "@/lib/account/user-profile";
import type { HomeSummary, HomeUpdate } from "@/lib/account/home-summary";
import { readStoredWorkspace } from "@/lib/navigation/kebu-workspace";

function StatCard({ value, label, href, accent }: { value: string | number; label: string; href: string; accent?: "orange" | "red" }) {
  const color = accent === "red" ? KEBU.red : KEBU.orange;
  return (
    <Link
      href={href}
      className="group block rounded-2xl p-5 transition-all hover:-translate-y-0.5"
      style={{
        background: KEBU.white,
        border: `2px solid ${KEBU.black}`,
        boxShadow: "4px 4px 0 rgba(10,10,10,1)",
      }}
    >
      <p
        className="text-3xl font-black leading-none"
        style={{ fontFamily: "var(--font-fraunces)", color }}
      >
        {value}
      </p>
      <p className="text-[11px] mt-2 font-bold uppercase tracking-wider" style={{ color: KEBU.black }}>
        {label}
      </p>
      <span
        className="inline-block mt-3 text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: KEBU.red }}
      >
        Open →
      </span>
    </Link>
  );
}

function QuickAction({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-full px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all hover:brightness-110"
      style={{ background: KEBU.black, color: KEBU.white }}
    >
      {label}
    </Link>
  );
}

function UpdateRow({ item }: { item: HomeUpdate }) {
  const kindLabel: Record<HomeUpdate["kind"], string> = {
    site: "Builder",
    business: "Business",
    email: "Email",
    create: "Create",
    opportunity: "Opportunity",
    b2b: "B2B",
  };

  return (
    <Link
      href={item.href}
      className="flex gap-4 rounded-2xl p-4 transition-all hover:-translate-y-px"
      style={{
        background: KEBU.white,
        border: `1px solid rgba(10,10,10,0.12)`,
        borderLeft: `4px solid ${KEBU.orange}`,
      }}
    >
      <span
        className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md h-fit"
        style={{ background: KEBU.black, color: KEBU.orange }}
      >
        {kindLabel[item.kind]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm truncate" style={{ color: KEBU.black }}>
          {item.title}
        </p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: KEBU.black, opacity: 0.65 }}>
          {item.body}
        </p>
      </div>
      <span className="shrink-0 text-lg font-black self-center" style={{ color: KEBU.red }}>
        →
      </span>
    </Link>
  );
}

export default function KebuHomePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me/home", { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        summary?: HomeSummary;
        error?: string;
      };
      if (res.status === 401) {
        router.replace("/login?next=/dashboard");
        return;
      }
      if (!res.ok || !data.summary) {
        setError(data.error ?? "Could not load your Kebu home.");
        return;
      }
      if (data.summary.personalization?.needsIntake) {
        router.replace("/welcome?next=/dashboard");
        return;
      }
      if (!readStoredWorkspace()) {
        router.replace("/start?next=/dashboard");
        return;
      }
      setSummary(data.summary);
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const first = displayFirstName(summary?.profile.name, summary?.profile.email);

  return (
    <AppShell title="Your Kebu">
      <div className="min-h-full">
        {/* Hero strip */}
        <div className="relative overflow-hidden" style={{ background: KEBU.black }}>
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            aria-hidden
            style={{
              background: `radial-gradient(ellipse 70% 100% at 100% 0%, ${KEBU.orange}, transparent 55%), radial-gradient(ellipse 50% 80% at 0% 100%, ${KEBU.red}, transparent 50%)`,
            }}
          />
          <div className="relative max-w-5xl mx-auto px-5 lg:px-10 py-10 lg:py-14">
            {loading ? (
              <p className="text-sm text-white/70">Loading your Kebu…</p>
            ) : error ? (
              <div className="rounded-xl p-4 text-sm" style={{ background: KEBU.red, color: KEBU.white }}>
                {error}{" "}
                <button type="button" className="underline font-bold" onClick={() => void load()}>
                  Retry
                </button>
              </div>
            ) : summary ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                {summary.profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={summary.profile.avatarUrl}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover ring-4 ring-[#FF5500]"
                  />
                ) : (
                  <span
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white"
                    style={{ background: KEBU.orange }}
                  >
                    {first.charAt(0).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-1" style={{ color: KEBU.orange }}>
                    Your Kebu
                  </p>
                  <h1
                    className="text-2xl lg:text-4xl font-black text-white"
                    style={{ fontFamily: "var(--font-fraunces)" }}
                  >
                    Hi, {first}
                  </h1>
                  <p className="text-sm mt-2 max-w-xl" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {summary.personalization.exploreOnly
                      ? "Explore Africa, learn, build when you are ready."
                      : "Sites, store, opportunities — everything in one place."}
                  </p>
                  {summary.profile.afriqueId ? (
                    <p className="text-[11px] font-mono mt-2 font-bold" style={{ color: KEBU.orange }}>
                      {summary.profile.afriqueId}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})` }} />
        </div>

        <div className="max-w-5xl mx-auto px-5 lg:px-10 py-8 lg:py-12">
          {summary ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                <StatCard value={summary.stats.sitesTotal} label="Your sites" href="/create/sites" />
                <StatCard value={summary.stats.sitesPublished} label="Published" href="/create/sites" accent="red" />
                <StatCard value={summary.stats.storeProducts} label="Store products" href="/create/sites" />
                <StatCard
                  value={summary.stats.emailSubscribers}
                  label="Email list"
                  href={summary.businesses[0] ? `/business/${summary.businesses[0].id}` : "/account"}
                />
                <StatCard value={summary.stats.createDesigns} label="Create designs" href="/studio" accent="red" />
                <StatCard value={summary.stats.countriesLive} label="Countries live" href="/opportunity/countries" />
              </div>

              <section className="mb-10">
                <h2 className="text-[10px] font-black uppercase tracking-[0.24em] mb-4" style={{ color: KEBU.red }}>
                  Quick actions
                </h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Kebu Builder", href: "/create" },
                    { label: "Kebu Create", href: "/studio" },
                    { label: "Kebu Business", href: "/business" },
                    { label: "Your profile", href: "/account" },
                    { label: "Opportunity OS", href: "/opportunity" },
                    { label: "Countries", href: "/opportunity/countries" },
                    { label: "B2B", href: "/b2b" },
                  ].map((a) => (
                    <QuickAction key={a.href} label={a.label} href={a.href} />
                  ))}
                </div>
              </section>

              {summary.businesses.length > 0 ? (
                <section className="mb-10">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.24em] mb-4" style={{ color: KEBU.red }}>
                    Business & Kebu ID
                  </h2>
                  <div className="space-y-3">
                    {summary.businesses.map((b) => (
                      <Link
                        key={b.id}
                        href={`/business/${b.id}`}
                        className="flex items-center justify-between rounded-2xl px-5 py-4 transition-all hover:-translate-y-px"
                        style={{
                          background: KEBU.black,
                          color: KEBU.white,
                          borderLeft: `4px solid ${KEBU.orange}`,
                        }}
                      >
                        <div>
                          <p className="font-bold text-sm">{b.name}</p>
                          <p className="text-[11px] font-mono font-bold mt-0.5" style={{ color: KEBU.orange }}>
                            {b.publicKebuId}
                          </p>
                        </div>
                        {b.readinessScore != null ? (
                          <div className="text-right">
                            <p className="text-3xl font-black" style={{ color: KEBU.orange }}>
                              {b.readinessScore}
                            </p>
                            <p className="text-[9px] font-bold uppercase" style={{ color: KEBU.red }}>
                              readiness
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs font-bold uppercase" style={{ color: KEBU.orange }}>
                            Set up →
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {summary.sites.some((s) => s.projectType === "store") ? (
                <section
                  className="mb-10 rounded-2xl p-5"
                  style={{ background: KEBU.white, border: `2px solid ${KEBU.black}` }}
                >
                  <h2 className="text-sm font-black uppercase tracking-wider mb-3" style={{ color: KEBU.black }}>
                    Your store
                  </h2>
                  {summary.sites
                    .filter((s) => s.projectType === "store")
                    .map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 py-3 border-b last:border-0"
                        style={{ borderColor: "rgba(10,10,10,0.1)" }}
                      >
                        <div>
                          <p className="font-bold text-sm">{s.title}</p>
                          <p className="text-xs" style={{ color: KEBU.black, opacity: 0.6 }}>
                            {s.status === "published" ? "Live" : "Draft"} · {s.productCount} products
                          </p>
                        </div>
                        <Link href={`/create/${s.id}`} className="text-xs font-black uppercase" style={{ color: KEBU.orange }}>
                          Manage →
                        </Link>
                      </div>
                    ))}
                </section>
              ) : null}

              <section>
                <h2 className="text-[10px] font-black uppercase tracking-[0.24em] mb-4" style={{ color: KEBU.red }}>
                  Updates & next steps
                </h2>
                <div className="space-y-2">
                  {summary.updates.map((u) => (
                    <UpdateRow key={u.id} item={u} />
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

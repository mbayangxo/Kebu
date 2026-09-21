"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { KebuMark } from "@/app/components/kebu-mark";
import { RegistrationProgressTimeline } from "@/app/components/business/registration-progress-timeline";
import { BusinessDocumentsPanel } from "@/app/components/business/business-documents-panel";
import { BusinessStructureEditor } from "@/app/components/business/business-structure-editor";
import { B2bProfileEditor } from "@/app/components/business/b2b-profile-editor";
import { BusinessLogoEditor } from "@/app/components/business/business-logo-editor";
import { EmailMarketingPanel } from "@/app/components/business/email-marketing-panel";
import { BusinessEventsPanel } from "@/app/components/business/business-events-panel";
import { BusinessOpsPanel } from "@/app/components/business/business-ops-panel";
import { BusinessTeamPanel } from "@/app/components/business/business-team-panel";
import { BusinessPressPanel } from "@/app/components/business/business-press-panel";
import { BusinessArtistCampaignsPanel } from "@/app/components/business/business-artist-campaigns-panel";
import { BusinessArtistMediaPanel } from "@/app/components/business/business-artist-media-panel";
import { KEBU } from "@/lib/kebu-brand";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";
import { portalModulesForCategory } from "@/lib/business/portal-modules";

type Business = {
  id: string;
  public_kebu_id: string;
  legal_name: string;
  trading_name: string | null;
  country_code: string;
  region: string | null;
  category: string;
  description: string;
  business_email: string | null;
  business_phone: string | null;
  website: string | null;
  legal_structure: string | null;
  registration_status: string;
  lifecycle_status: string;
  verification_level: number;
  logo_url?: string | null;
};

type Readiness = {
  score_value: number;
  score_band: string;
  confidence_level: string;
  model_version: string;
  explanation: { summary?: string; note?: string };
  missing_items: string[];
  helping_factors: string[];
  limiting_factors: string[];
  calculated_at: string;
};

type ProgressStep = {
  step_key: string;
  label: string;
  sort_order: number;
  is_complete: boolean;
  completed_at: string | null;
};

type Owner = { full_name: string; email: string; ownership_percent: number; is_primary_founder: boolean };
type StatusRow = { id: string; from_status: string | null; to_status: string; note: string | null; created_at: string };

type WebsiteProject = {
  id: string;
  title: string;
  status: string;
  subdomain: string | null;
  published_at: string | null;
  editorUrl: string;
  previewPath: string | null;
  liveUrl: string | null;
  appPreviewUrl: string | null;
  shopOpened?: boolean;
  shopOpenedAt?: string | null;
  shopUrl?: string;
  productCount?: number;
  siteHomeUrl?: string;
};

type WorkspaceTab = "today" | "projects" | "people" | "operations" | "analytics";

const WORKSPACE_TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "today", label: "Today" },
  { id: "projects", label: "Projects" },
  { id: "people", label: "People" },
  { id: "operations", label: "Operations" },
  { id: "analytics", label: "Analytics" },
];

export default function BusinessDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("today");
  const [business, setBusiness] = useState<Business | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [progress, setProgress] = useState<ProgressStep[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusRow[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [websiteProjects, setWebsiteProjects] = useState<WebsiteProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalcBusy, setRecalcBusy] = useState(false);
  const [shopBusyId, setShopBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${id}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/business/${id}`);
        return;
      }
      if (res.status === 404) {
        setError("Business not found — or you do not have access.");
        setBusiness(null);
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load business.");
        return;
      }
      setBusiness(data.business);
      setRole(data.membership?.role ?? null);
      setOwners(Array.isArray(data.owners) ? data.owners : []);
      setProgress(Array.isArray(data.registrationProgress) ? data.registrationProgress : []);
      setStatusHistory(Array.isArray(data.statusHistory) ? data.statusHistory : []);
      setReadiness(data.readiness ?? null);
      setWebsiteProjects(Array.isArray(data.websiteProjects) ? data.websiteProjects : []);
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!readiness || readiness.model_version === "business-readiness-v3" || recalcBusy) return;
    void recalculate();
  }, [readiness?.model_version]);

  async function recalculate() {
    if (recalcBusy) return;
    setRecalcBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${id}/readiness`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not recalculate score.");
        return;
      }
      setReadiness(data.readiness);
      await load();
    } catch {
      setError("Network error while recalculating.");
    } finally {
      setRecalcBusy(false);
    }
  }

  async function openShop(projectId: string) {
    if (shopBusyId) return;
    setShopBusyId(projectId);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/shop/open`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not open shop.");
        return;
      }
      await load();
      if (typeof data.shopUrl === "string") router.push(data.shopUrl);
    } catch {
      setError("Network error while opening shop.");
    } finally {
      setShopBusyId(null);
    }
  }

  const structureLabel = business?.legal_structure?.replace(/_/g, " ") ?? "—";
  const canEditStructure =
    Boolean(business) &&
    (role === "founder" || role === "administrator") &&
    ["draft", "preparing", "ready_to_submit"].includes(business?.registration_status ?? "");

  const bizName = business?.trading_name || business?.legal_name || "Business";

  return (
    <AppShell title={bizName} immersive>
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur" style={{ borderColor: KEBU.borders.default }}>
        <div className="flex min-h-14 items-center gap-3 px-3 sm:px-5 lg:px-7">
          <Link href="/business?tab=businesses" className="flex min-h-9 items-center gap-2 rounded-full px-2.5 text-[10px] font-black uppercase tracking-[.1em] hover:bg-black/[.035]">
            <span aria-hidden>←</span><span className="hidden sm:inline">My Businesses</span>
          </Link>
          <span className="h-5 w-px bg-black/10" aria-hidden />
          <KebuMark size={22} />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black">{bizName}</p>
            <p className="text-[8px] font-bold uppercase tracking-[.14em] text-black/35">Business world</p>
          </div>
          <nav className="ml-3 hidden items-center gap-1 lg:flex" aria-label="Business world">
            <a href="#sites" className="rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-black/55 hover:bg-black/[.04]">Sites</a>
            <a href="#team" className="rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-black/55 hover:bg-black/[.04]">People</a>
            <a href="#operations" className="rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-black/55 hover:bg-black/[.04]">Operations</a>
            <Link href="/email" className="rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-black/55 hover:bg-black/[.04]">Mail</Link>
          </nav>
        </div>
      </header>
      {loading ? (
        <div className="px-6 sm:px-8 lg:px-10 pt-10">
          <p className="text-sm" style={{ color: KEBU.muted }}>Loading business…</p>
        </div>
      ) : error || !business ? (
        <div className="px-6 sm:px-8 lg:px-10 pt-10">
          <div role="alert" className="rounded-xl p-4 max-w-lg" style={{ background: KEBU.errorBg, color: KEBU.errorText }}>
            <p className="mb-3">{error ?? "Unavailable"}</p>
            <button type="button" className="underline font-semibold" onClick={() => void load()}>Retry</button>
          </div>
        </div>
      ) : (
        <div className="px-6 sm:px-8 lg:px-10 py-8">

          <section className="overflow-hidden rounded-[20px] bg-[#0B0D0F] text-white shadow-[0_16px_50px_rgba(0,0,0,.18)]">
            <div className="grid min-h-[170px] lg:grid-cols-[minmax(0,1fr)_350px]">
              <div className="relative overflow-hidden p-5 sm:p-6">
                <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 58% 30%,rgba(255,106,0,.36),transparent 28%),linear-gradient(120deg,#131416,#2a1512 58%,#0a0b0d)" }} />
                <div className="relative">
                  <p className="text-[9px] uppercase tracking-[.18em] text-white/40">Workspace</p>
                  <div className="mt-1 flex items-end gap-3"><h1 className="text-[46px] leading-none tracking-[-.05em] sm:text-[58px]" style={{ fontFamily: "var(--font-fraunces)" }}>{bizName}</h1><span className="pb-1 text-white/30">⌄</span></div>
                  <p className="mt-2 max-w-xl text-[11px] text-white/58">{business.description || business.category}</p>
                  <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[8px]">{business.category}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-[8px]">{business.country_code}{business.region ? " · " + business.region : ""}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-[8px]">{business.public_kebu_id}</span></div>
                </div>
              </div>
              <div className="relative overflow-hidden border-l border-white/10 p-5">
                <div className="absolute inset-0" style={{background:"linear-gradient(135deg,rgba(255,106,0,.65),rgba(25,7,5,.9)),radial-gradient(circle at 70% 20%,rgba(255,255,255,.22),transparent 22%)"}} />
                <div className="relative flex h-full flex-col justify-between"><p className="max-w-[190px] text-[27px] leading-[1.02]" style={{fontFamily:"var(--font-fraunces)"}}>Stories move the world.</p><div className="flex gap-2"><Link href={"/create/new?businessId="+business.id} className="rounded-full bg-white px-3 py-2 text-[8px] font-semibold text-black">Create site</Link><Link href="/studio" className="rounded-full border border-white/30 px-3 py-2 text-[8px] font-semibold">Studio</Link></div></div>
              </div>
            </div>
            {/* Functional tab nav */}
            <nav className="flex gap-1.5 overflow-x-auto border-t border-white/10 px-4 py-2.5">
              {WORKSPACE_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className="shrink-0 rounded-full px-3 py-2 text-[8px] font-semibold transition"
                  style={{
                    background: activeTab === t.id ? "#FFB09A" : "rgba(255,255,255,.06)",
                    color: activeTab === t.id ? "#160807" : "rgba(255,255,255,.62)",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </section>

          {/* ── TODAY tab ─────────────────────────────────────────────── */}
          {activeTab === "today" && (
            <section className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                {/* KPI tiles */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {([
                    [websiteProjects.length, "Projects", "▣", null],
                    [progress.filter((s) => s.is_complete).length, "Tasks done", "✓", null],
                    [owners.length, "People", "◉", null],
                    [readiness?.score_value ?? 0, "Readiness", "↗", null],
                    [business.verification_level, "Verification", "✦", null],
                  ] as [number, string, string, string | null][]).map(([value, label, icon]) => (
                    <div key={label} className="rounded-[12px] border border-white/5 bg-[#111315] p-3 text-white">
                      <div className="flex items-center justify-between">
                        <p className="text-[24px]" style={{ fontFamily: "var(--font-fraunces)" }}>{value}</p>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-[9px]">{icon}</span>
                      </div>
                      <p className="mt-1 text-[8px] text-white/40">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Active projects preview */}
                <div className="mt-3 rounded-[16px] border border-white/5 bg-[#0D0F11] p-3 text-white">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold">Active projects</p>
                    <button type="button" onClick={() => setActiveTab("projects")} className="text-[8px] text-white/40 hover:text-white/60">See all →</button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {websiteProjects.slice(0, 6).map((site, index) => (
                      <Link key={site.id} href={site.siteHomeUrl ?? "/my-sites/" + site.id} className="overflow-hidden rounded-[12px] border border-white/10 bg-[#151719] transition hover:border-white/20">
                        <div className="h-20" style={{ background: index % 2 ? "linear-gradient(135deg,#2a1512,#ff6a00)" : "linear-gradient(135deg,#17191d,#b55339)" }} />
                        <div className="p-3">
                          <p className="truncate text-[10px] font-semibold">{site.title}</p>
                          <p className="mt-1 text-[8px] text-white/38">{site.status}{site.shopOpened ? " · Shop open" : ""}</p>
                        </div>
                      </Link>
                    ))}
                    {!websiteProjects.length ? (
                      <div className="col-span-full py-8 text-center text-[9px] text-white/35">No active site projects yet.</div>
                    ) : null}
                  </div>
                </div>

                {/* Status activity */}
                {statusHistory.length > 0 && (
                  <div className="mt-3 rounded-[16px] border border-white/5 bg-[#0D0F11] p-3 text-white">
                    <p className="mb-2 text-[11px] font-semibold">Recent activity</p>
                    <div className="space-y-2">
                      {statusHistory.slice(0, 5).map((h) => (
                        <div key={h.id} className="flex items-start gap-2 text-[8px]">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFB09A]" />
                          <div>
                            <span className="font-semibold text-white/75">{h.from_status ?? "—"} → {h.to_status}</span>
                            {h.note ? <span className="text-white/40"> · {h.note}</span> : null}
                            <p className="text-white/28">{new Date(h.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right sidebar */}
              <aside className="space-y-3">
                {/* Readiness */}
                {readiness && (
                  <div className="rounded-[16px] border border-white/5 bg-[#0D0F11] p-4 text-white">
                    <p className="mb-1 text-[10px] font-semibold">Business Readiness</p>
                    <p className="text-[32px] leading-none" style={{ fontFamily: "var(--font-fraunces)", color: "#FFB09A" }}>
                      {readiness.score_value}
                    </p>
                    <p className="mt-1 text-[8px] uppercase tracking-wide text-white/40">
                      {readiness.score_band.replace(/_/g, " ")}
                    </p>
                    {readiness.explanation?.summary && (
                      <p className="mt-2 text-[8px] leading-relaxed text-white/45">{readiness.explanation.summary}</p>
                    )}
                    {(role === "founder" || role === "administrator") && (
                      <button type="button" onClick={() => void recalculate()} disabled={recalcBusy} className="mt-3 text-[8px] font-semibold underline text-white/35 disabled:opacity-50 hover:text-white/60">
                        {recalcBusy ? "Recalculating…" : "Recalculate"}
                      </button>
                    )}
                  </div>
                )}

                {/* People */}
                <div className="rounded-[16px] border border-white/5 bg-[#0D0F11] p-3 text-white">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold">People ({owners.length})</p>
                    <button type="button" onClick={() => setActiveTab("people")} className="text-[8px] text-white/35 hover:text-white/60">See all →</button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {owners.slice(0, 5).map((owner) => (
                      <div key={owner.email} className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] font-semibold">
                          {owner.full_name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[9px] font-semibold">{owner.full_name}</span>
                          <span className="block truncate text-[8px] text-white/35">
                            {owner.is_primary_founder ? "Founder" : "Owner"} · {owner.ownership_percent}%
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Workspace focus */}
                <div className="rounded-[16px] border border-white/5 bg-[#0D0F11] p-3 text-white">
                  <p className="mb-2 text-[11px] font-semibold">Workspace focus</p>
                  <div className="space-y-1.5">
                    {progress.slice(0, 5).map((step) => (
                      <div key={step.step_key} className="flex items-center gap-2 text-[8px]">
                        <span className={step.is_complete ? "text-[#FFB09A]" : "text-white/30"}>
                          {step.is_complete ? "●" : "○"}
                        </span>
                        <span className={step.is_complete ? "text-white/50 line-through" : "text-white/65"}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>
          )}

          {/* ── PROJECTS tab ─────────────────────────────────────────── */}
          {activeTab === "projects" && (
            <section className="mt-4 rounded-[16px] border border-white/5 bg-[#0D0F11] p-4 text-white">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[14px] font-semibold">Sites & projects</p>
                <Link href={`/create/new?businessId=${business.id}`} className="rounded-full bg-white/10 px-3 py-2 text-[8px] font-semibold hover:bg-white/15 transition">
                  + Create site
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {websiteProjects.map((site) => (
                  <div key={site.id} className="overflow-hidden rounded-[14px] border border-white/10 bg-[#151719]">
                    <div className="h-28" style={{ background: "linear-gradient(135deg,#2a1512,#ff6a00)" }} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[11px] font-semibold">{site.title}</p>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[7px] font-bold uppercase" style={{ background: site.status === "published" ? "rgba(34,197,94,.15)" : "rgba(255,255,255,.06)", color: site.status === "published" ? "#4ADE80" : "rgba(255,255,255,.45)" }}>
                          {site.status}
                        </span>
                      </div>
                      {site.subdomain && <p className="mt-0.5 text-[8px] text-white/30">/sites/{site.subdomain}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={site.siteHomeUrl ?? `/my-sites/${site.id}`} className="rounded-full bg-white/10 px-2.5 py-1.5 text-[8px] font-semibold hover:bg-white/15 transition">Overview</Link>
                        <Link href={site.editorUrl} className="rounded-full bg-white/10 px-2.5 py-1.5 text-[8px] font-semibold hover:bg-white/15 transition">Edit</Link>
                        {site.liveUrl && <a href={site.liveUrl} target="_blank" rel="noreferrer" className="rounded-full bg-white/10 px-2.5 py-1.5 text-[8px] font-semibold hover:bg-white/15 transition">Live ↗</a>}
                        {site.shopOpened ? (
                          <Link href={site.shopUrl ?? `/shop/${site.id}`} className="rounded-full px-2.5 py-1.5 text-[8px] font-semibold text-white transition" style={{ background: KEBU.orange }}>Shop</Link>
                        ) : (
                          <button type="button" disabled={shopBusyId === site.id} onClick={() => void openShop(site.id)} className="rounded-full px-2.5 py-1.5 text-[8px] font-semibold text-white disabled:opacity-50 transition" style={{ background: KEBU.orange }}>
                            {shopBusyId === site.id ? "Opening…" : "Open shop"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!websiteProjects.length && (
                  <div className="col-span-full rounded-[14px] border border-dashed border-white/15 py-12 text-center text-[10px] text-white/35">
                    No site projects yet.{" "}
                    <Link href={`/create/new?businessId=${business.id}`} className="underline" style={{ color: "#FFB09A" }}>Create one</Link>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── PEOPLE tab ────────────────────────────────────────────── */}
          {activeTab === "people" && (
            <section className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[14px] font-semibold text-white">Owners & founders</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {owners.map((o) => (
                    <div key={o.email} className="rounded-[14px] border border-white/10 bg-[#0D0F11] p-4 text-white">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-black" style={{ background: "linear-gradient(135deg,#FF6A00,#FF1F1F)" }}>
                          {o.full_name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold">{o.full_name}</p>
                          <p className="truncate text-[8px] text-white/40">{o.email}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[8px] text-white/60">
                          {o.is_primary_founder ? "Founder" : "Owner"}
                        </span>
                        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[8px] text-white/60">
                          {o.ownership_percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {owners.length === 0 && <p className="text-[10px] text-white/35">No ownership rows yet.</p>}
                </div>
                <div className="mt-4">
                  <BusinessTeamPanel businessId={id} />
                </div>
              </div>
              <aside className="space-y-3">
                <div className="rounded-[16px] border border-white/5 bg-[#0D0F11] p-4 text-white">
                  <p className="mb-3 text-[11px] font-semibold">Registration progress</p>
                  <RegistrationProgressTimeline steps={progress} />
                </div>
              </aside>
            </section>
          )}

          {/* ── OPERATIONS tab ───────────────────────────────────────── */}
          {activeTab === "operations" && (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                {/* Website & shop */}
                <section className="rounded-2xl p-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                  <div className="mb-1 flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider">Website & shop</h2>
                    {websiteProjects.length > 0 && (
                      <Link href={`/create/new?businessId=${business.id}`} className="text-xs font-bold" style={{ color: KEBU.orange }}>+ Add site</Link>
                    )}
                  </div>
                  <p className="mb-4 text-xs leading-relaxed" style={{ color: KEBU.muted }}>Shop is separate — open it when you sell.</p>
                  {websiteProjects.length === 0 ? (
                    <div className="rounded-xl p-5 text-center" style={{ border: `2px dashed ${KEBU.border}` }}>
                      <p className="mb-3 text-sm" style={{ color: KEBU.muted }}>No website yet</p>
                      <Link href={`/create/new?businessId=${business.id}`} className="inline-flex rounded-full px-5 py-2 text-xs font-bold text-white" style={{ background: KEBU.orange }}>Create website</Link>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {websiteProjects.map((site) => (
                        <li key={site.id} className="rounded-xl p-4" style={{ background: KEBU.bright, border: `1px solid ${KEBU.border}` }}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold">{site.title}</p>
                              <p className="mt-0.5 text-[11px]" style={{ color: KEBU.muted }}>
                                {site.status}{site.subdomain ? ` · /sites/${site.subdomain}` : ""}
                                {site.shopOpened ? ` · Shop open${typeof site.productCount === "number" ? ` · ${site.productCount} products` : ""}` : " · No shop"}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: site.status === "published" ? "#DCFCE7" : KEBU.cream, color: site.status === "published" ? "#166534" : KEBU.muted }}>{site.status}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link href={site.siteHomeUrl ?? `/my-sites/${site.id}`} className="rounded-full px-3 py-1.5 text-[10px] font-bold" style={{ background: KEBU.black, color: KEBU.white }}>Overview</Link>
                            <Link href={site.editorUrl} className="rounded-full border px-3 py-1.5 text-[10px] font-bold" style={{ borderColor: KEBU.border }}>Edit site</Link>
                            {site.liveUrl && <a href={site.liveUrl} target="_blank" rel="noreferrer" className="rounded-full border px-3 py-1.5 text-[10px] font-bold" style={{ borderColor: KEBU.border }}>Live ↗</a>}
                            {site.shopOpened ? (
                              <Link href={site.shopUrl ?? `/shop/${site.id}`} className="rounded-full px-3 py-1.5 text-[10px] font-bold text-white" style={{ background: KEBU.orange }}>Shop admin</Link>
                            ) : (
                              <button type="button" disabled={shopBusyId === site.id} onClick={() => void openShop(site.id)} className="rounded-full px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-60" style={{ background: KEBU.orange }}>
                                {shopBusyId === site.id ? "Opening…" : "Open shop"}
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {(role === "founder" || role === "administrator" || role === "store_manager") && (
                  <>
                    <section className="rounded-2xl p-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>{business.category} modules</p>
                      <ul className="mb-5 flex flex-wrap gap-2">
                        {portalModulesForCategory(business.category).map((m) => (
                          <li key={m.id} className="rounded-full px-3 py-1 text-[10px] font-semibold" style={{ background: KEBU.cream, color: KEBU.black }} title={m.why}>{m.label}</li>
                        ))}
                      </ul>
                      <BusinessEventsPanel businessId={business.id} />
                    </section>
                    <section className="rounded-2xl p-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                      <BusinessOpsPanel businessId={business.id} />
                    </section>
                    <section className="rounded-2xl p-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider">Email & campaigns</h2>
                      <EmailMarketingPanel businessId={business.id} />
                    </section>
                    <section className="rounded-2xl p-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                      <B2bProfileEditor businessId={business.id} />
                    </section>
                  </>
                )}

                <BusinessPressPanel businessId={id} />
                <BusinessArtistCampaignsPanel businessId={id} />
                <BusinessArtistMediaPanel businessId={id} />

                <section className="rounded-2xl p-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                  <h2 className="mb-4 text-sm font-bold uppercase tracking-wider">Activity</h2>
                  {statusHistory.length === 0 ? (
                    <p className="text-sm" style={{ color: KEBU.muted }}>No status history yet.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {statusHistory.map((h) => (
                        <li key={h.id} style={{ color: KEBU.muted }}>
                          <span className="font-semibold" style={{ color: KEBU.black }}>{h.from_status ?? "—"} → {h.to_status}</span>
                          {h.note ? ` · ${h.note}` : ""}
                          <span className="block text-[11px]" style={{ color: KEBU.faint }}>{new Date(h.created_at).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <div className="space-y-4">
                <section className="rounded-2xl p-5" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                  <h2 className="mb-3 text-xs font-bold uppercase tracking-wider">Registration</h2>
                  <RegistrationProgressTimeline steps={progress} />
                </section>
                <section className="rounded-2xl p-5" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                  <h2 className="mb-3 text-xs font-bold uppercase tracking-wider">Documents</h2>
                  <BusinessDocumentsPanel businessId={business.id} publicKebuId={business.public_kebu_id} canEdit={role === "founder" || role === "administrator"} onProgressChange={() => void load()} />
                </section>
                <section className="rounded-2xl p-5" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                  <h2 className="mb-1 text-xs font-bold uppercase tracking-wider">Legal structure</h2>
                  <p className="mb-3 text-[10px] leading-relaxed" style={{ color: KEBU.faint }}>Current: <strong>{structureLabel}</strong></p>
                  <BusinessStructureEditor businessId={business.id} countryCode={business.country_code} currentStructure={business.legal_structure} canEdit={canEditStructure} onUpdated={(code) => { setBusiness((prev) => (prev ? { ...prev, legal_structure: code } : prev)); void load(); }} />
                </section>
                {(role === "founder" || role === "administrator") && (
                  <section className="rounded-2xl p-5" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                    <BusinessLogoEditor businessId={business.id} logoUrl={business.logo_url ?? null} businessName={business.trading_name || business.legal_name} onUpdated={(url) => setBusiness((prev) => (prev ? { ...prev, logo_url: url } : prev))} />
                  </section>
                )}
                <section className="rounded-2xl p-5" style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}>
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>About</p>
                  <p className="text-xs leading-relaxed" style={{ color: KEBU.black }}>{business.description}</p>
                </section>
              </div>
            </div>
          )}

          {/* ── ANALYTICS tab ─────────────────────────────────────────── */}
          {activeTab === "analytics" && (
            <section className="mt-4 rounded-[16px] border border-white/5 bg-[#0D0F11] p-6 text-white">
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-white/30">Analytics — coming soon</p>
              <p className="mt-3 text-[28px] font-black tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
                Insights on the way.
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-white/40">
                Business analytics, campaign performance and audience insights will live here.
              </p>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}

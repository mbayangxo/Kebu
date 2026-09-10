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

export default function BusinessDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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

  const bizName = business?.trading_name || business?.legal_name ?? "Business";

  return (
    <AppShell title={bizName}>
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

          {/* Page header */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-1" style={{ color: KEBU.orange }}>
                {business.country_code}{business.region ? ` · ${business.region}` : ""} · {business.category}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
                {bizName}
              </h1>
              {business.trading_name && business.trading_name !== business.legal_name ? (
                <p className="text-sm mt-1" style={{ color: KEBU.muted }}>Legal: {business.legal_name}</p>
              ) : null}
              <p className="font-mono text-xs mt-2" style={{ color: KEBU.orange }}>{business.public_kebu_id}</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link
                href={`/create/new?businessId=${business.id}`}
                className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
                style={{ background: KEBU.orange, color: KEBU.black }}
              >
                Build website
              </Link>
              <Link
                href="/business?tab=pulse"
                className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
                style={{ border: `1px solid ${KEBU.border}` }}
              >
                Pulse
              </Link>
            </div>
          </div>

          {/* Status strip */}
          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { label: structureLabel },
              { label: business.registration_status.replace(/_/g, " ") },
              { label: role ? `Your role: ${role}` : null },
            ].filter((s) => s.label).map((s) => (
              <span key={s.label} className="rounded-full px-3 py-1 text-[10px] font-semibold" style={{ background: KEBU.cream, color: KEBU.black }}>
                {s.label}
              </span>
            ))}
          </div>

          {/* Main 2-column layout */}
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            {/* Left column — primary content */}
            <div className="space-y-6">

              {/* Website & shop */}
              <section className="rounded-2xl p-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-bold uppercase tracking-wider">Website & shop</h2>
                  {websiteProjects.length > 0 ? (
                    <Link href={`/create/new?businessId=${business.id}`} className="text-xs font-bold" style={{ color: KEBU.orange }}>
                      + Add site
                    </Link>
                  ) : null}
                </div>
                <p className="text-xs mb-5 leading-relaxed" style={{ color: KEBU.muted }}>
                  Shop is separate — open it when you sell. Agencies can skip it.
                </p>
                {websiteProjects.length === 0 ? (
                  <div className="rounded-xl p-5 text-center" style={{ border: `2px dashed ${KEBU.border}` }}>
                    <p className="text-sm mb-3" style={{ color: KEBU.muted }}>No website yet</p>
                    <Link href={`/create/new?businessId=${business.id}`} className="inline-flex rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider text-white" style={{ background: KEBU.orange }}>
                      Create website
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {websiteProjects.map((site) => (
                      <li key={site.id} className="rounded-xl p-4" style={{ background: KEBU.bright, border: `1px solid ${KEBU.border}` }}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold">{site.title}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: KEBU.muted }}>
                              {site.status}{site.subdomain ? ` · /sites/${site.subdomain}` : ""}
                              {site.shopOpened ? ` · Shop open${typeof site.productCount === "number" ? ` · ${site.productCount} products` : ""}` : " · No shop"}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: site.status === "published" ? "#DCFCE7" : KEBU.cream, color: site.status === "published" ? "#166534" : KEBU.muted }}>
                            {site.status}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link href={site.siteHomeUrl ?? `/my-sites/${site.id}`} className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: KEBU.black, color: KEBU.white }}>
                            Overview
                          </Link>
                          <Link href={site.editorUrl} className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ border: `1px solid ${KEBU.border}` }}>
                            Edit site
                          </Link>
                          {site.liveUrl ? (
                            <a href={site.liveUrl} target="_blank" rel="noreferrer" className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ border: `1px solid ${KEBU.border}` }}>
                              Live ↗
                            </a>
                          ) : null}
                          {site.shopOpened ? (
                            <Link href={site.shopUrl ?? `/shop/${site.id}`} className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: KEBU.orange }}>
                              Shop admin
                            </Link>
                          ) : (
                            <button type="button" disabled={shopBusyId === site.id} onClick={() => void openShop(site.id)} className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-60" style={{ background: KEBU.orange }}>
                              {shopBusyId === site.id ? "Opening…" : "Open shop"}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Operations panels */}
              {(role === "founder" || role === "administrator" || role === "store_manager") ? (
                <>
                  <section className="rounded-2xl p-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: KEBU.muted }}>
                      {business.category} modules
                    </p>
                    <ul className="flex flex-wrap gap-2 mb-5">
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
                    <h2 className="text-sm font-bold uppercase tracking-wider mb-4">Email & campaigns</h2>
                    <EmailMarketingPanel businessId={business.id} />
                  </section>

                  <section className="rounded-2xl p-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                    <B2bProfileEditor businessId={business.id} />
                  </section>
                </>
              ) : null}

              {/* Team, Press, Artist panels */}
              <BusinessTeamPanel businessId={id} />
              <BusinessPressPanel businessId={id} />
              <BusinessArtistCampaignsPanel businessId={id} />
              <BusinessArtistMediaPanel businessId={id} />

              {/* Owners */}
              <section className="rounded-2xl p-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                <h2 className="text-sm font-bold uppercase tracking-wider mb-4">Owners</h2>
                {owners.length === 0 ? (
                  <p className="text-sm" style={{ color: KEBU.muted }}>No ownership rows yet.</p>
                ) : (
                  <ul className="text-sm space-y-2">
                    {owners.map((o) => (
                      <li key={o.email} style={{ color: KEBU.muted }}>
                        {o.full_name} · {Number(o.ownership_percent)}%{o.is_primary_founder ? " · founder" : ""}
                        <span className="block text-[11px]">{o.email}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Status history */}
              <section className="rounded-2xl p-6" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                <h2 className="text-sm font-bold uppercase tracking-wider mb-4">Activity</h2>
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

            {/* Right sidebar */}
            <div className="space-y-5">

              {/* Readiness score */}
              <section className="rounded-2xl p-5" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                <h2 className="text-xs font-bold uppercase tracking-wider mb-3">Business Readiness</h2>
                {readiness ? (
                  <>
                    <p className="text-4xl font-bold mb-0.5" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.orange }}>
                      {readiness.score_value}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: KEBU.muted }}>
                      {readiness.score_band.replace(/_/g, " ")} · {readiness.confidence_level}
                    </p>
                    <p className="text-xs leading-relaxed mb-3" style={{ color: KEBU.muted }}>{readiness.explanation?.summary}</p>
                    {readiness.missing_items?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5">Next actions</p>
                        <ul className="text-xs space-y-1" style={{ color: KEBU.muted }}>
                          {readiness.missing_items.slice(0, 5).map((f) => <li key={f}>· {f}</li>)}
                        </ul>
                      </div>
                    )}
                    {(role === "founder" || role === "administrator") && (
                      <button type="button" onClick={() => void recalculate()} disabled={recalcBusy} className="mt-2 text-xs font-semibold underline disabled:opacity-50" style={{ color: KEBU.orange }}>
                        {recalcBusy ? "Recalculating…" : "Recalculate"}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-xs" style={{ color: KEBU.muted }}>No score yet.</p>
                )}
              </section>

              {/* Registration progress */}
              <section className="rounded-2xl p-5" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                <h2 className="text-xs font-bold uppercase tracking-wider mb-3">Registration</h2>
                <RegistrationProgressTimeline steps={progress} />
              </section>

              {/* Documents */}
              <section className="rounded-2xl p-5" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                <h2 className="text-xs font-bold uppercase tracking-wider mb-3">Documents</h2>
                <BusinessDocumentsPanel
                  businessId={business.id}
                  publicKebuId={business.public_kebu_id}
                  canEdit={role === "founder" || role === "administrator"}
                  onProgressChange={() => void load()}
                />
              </section>

              {/* Legal structure */}
              <section className="rounded-2xl p-5" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                <h2 className="text-xs font-bold uppercase tracking-wider mb-1">Legal structure</h2>
                <p className="text-[10px] mb-3 leading-relaxed" style={{ color: KEBU.faint }}>
                  Current: <strong>{structureLabel}</strong>
                </p>
                <BusinessStructureEditor
                  businessId={business.id}
                  countryCode={business.country_code}
                  currentStructure={business.legal_structure}
                  canEdit={canEditStructure}
                  onUpdated={(code) => {
                    setBusiness((prev) => (prev ? { ...prev, legal_structure: code } : prev));
                    void load();
                  }}
                />
              </section>

              {/* Logo */}
              {(role === "founder" || role === "administrator") ? (
                <section className="rounded-2xl p-5" style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}>
                  <BusinessLogoEditor
                    businessId={business.id}
                    logoUrl={business.logo_url ?? null}
                    businessName={business.trading_name || business.legal_name}
                    onUpdated={(url) => setBusiness((prev) => (prev ? { ...prev, logo_url: url } : prev))}
                  />
                </section>
              ) : null}

              {/* Description */}
              <section className="rounded-2xl p-5" style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: KEBU.muted }}>About</p>
                <p className="text-xs leading-relaxed" style={{ color: KEBU.black }}>{business.description}</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

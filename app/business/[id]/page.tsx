"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { KebuMark } from "@/app/components/kebu-mark";
import { RegistrationProgressTimeline } from "@/app/components/business/registration-progress-timeline";
import { BusinessDocumentsPanel } from "@/app/components/business/business-documents-panel";
import { KEBU } from "@/lib/kebu-brand";

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

type Member = { id: string; role: string; status: string; user_id: string };
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
};

export default function BusinessDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [progress, setProgress] = useState<ProgressStep[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusRow[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [websiteProjects, setWebsiteProjects] = useState<WebsiteProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalcBusy, setRecalcBusy] = useState(false);

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
      setMembers(Array.isArray(data.members) ? data.members : []);
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

  const structureLabel = business?.legal_structure?.replace(/_/g, " ") ?? "—";

  return (
    <div className="min-h-screen" style={{ background: KEBU.cream, color: KEBU.black }}>
      <header className="sticky top-0 z-40" style={{ background: KEBU.black }}>
        <div
          className="h-[3px] w-full"
          style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})` }}
        />
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/business" className="flex items-center gap-2 text-white text-sm">
            <KebuMark size={28} />
            <span className="font-bold tracking-[0.12em]">← Businesses</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        {loading ? (
          <p className="text-sm" style={{ color: KEBU.muted }}>
            Loading business…
          </p>
        ) : error || !business ? (
          <div
            role="alert"
            className="rounded-xl p-4"
            style={{ background: KEBU.errorBg, color: KEBU.errorText }}
          >
            <p className="mb-3">{error ?? "Unavailable"}</p>
            <button type="button" className="underline font-semibold" onClick={() => void load()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3"
              style={{ color: KEBU.orange }}
            >
              Business dashboard · registration
            </p>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
              {business.legal_name}
            </h1>
            {business.trading_name && (
              <p className="text-sm mb-4" style={{ color: KEBU.muted }}>
                Trading as {business.trading_name}
              </p>
            )}

            <div className="rounded-2xl p-5 mb-6" style={{ background: KEBU.black, color: KEBU.white }}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 mb-2">Kebu ID</p>
              <p className="font-mono text-lg sm:text-xl" style={{ color: KEBU.orange }}>
                {business.public_kebu_id}
              </p>
              <p className="text-xs text-white/40 mt-3">
                {business.country_code}
                {business.region ? ` · ${business.region}` : ""} · {structureLabel} ·{" "}
                {business.registration_status.replace(/_/g, " ")}
                {role ? ` · your role: ${role}` : ""}
              </p>
              <Link
                href={`/create/new?businessId=${business.id}`}
                className="inline-block mt-5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
                style={{ background: KEBU.orange, color: KEBU.black }}
              >
                Build Website
              </Link>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <section
                className="rounded-2xl p-5"
                style={{ background: KEBU.card, border: `1px solid ${KEBU.border}` }}
              >
                <h2 className="text-sm font-bold uppercase tracking-wider mb-1">Business Readiness</h2>
                <p className="text-[10px] mb-4 leading-relaxed" style={{ color: KEBU.faint }}>
                  Profile completion score for registration — not the full Kebu Score (store, orders, and verified activity come later).
                </p>
                {readiness ? (
                  <>
                    <p className="text-4xl font-bold mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
                      {readiness.score_value}
                    </p>
                    <p className="text-xs uppercase tracking-wider mb-3" style={{ color: KEBU.orange }}>
                      {readiness.score_band.replace(/_/g, " ")} · {readiness.confidence_level} confidence
                    </p>
                    <p className="text-sm mb-3" style={{ color: KEBU.muted }}>
                      {readiness.explanation?.summary}
                    </p>
                    <p className="text-[11px] mb-4" style={{ color: KEBU.faint }}>
                      {readiness.explanation?.note}
                    </p>
                    {readiness.helping_factors?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1">Helping</p>
                        <ul className="text-xs space-y-1" style={{ color: KEBU.muted }}>
                          {readiness.helping_factors.slice(0, 5).map((f) => (
                            <li key={f}>• {f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {readiness.missing_items?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1">Missing / next</p>
                        <ul className="text-xs space-y-1" style={{ color: KEBU.muted }}>
                          {readiness.missing_items.slice(0, 6).map((f) => (
                            <li key={f}>• {f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-[10px]" style={{ color: KEBU.faint }}>
                      Model {readiness.model_version} · calculated{" "}
                      {new Date(readiness.calculated_at).toLocaleString()}
                    </p>
                    {(role === "founder" || role === "administrator") && (
                      <button
                        type="button"
                        onClick={() => void recalculate()}
                        disabled={recalcBusy}
                        className="mt-4 text-xs font-semibold underline disabled:opacity-50"
                        style={{ color: KEBU.orange }}
                      >
                        {recalcBusy ? "Recalculating…" : "Recalculate readiness"}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm" style={{ color: KEBU.muted }}>
                    No readiness score yet.
                  </p>
                )}
              </section>

              <section
                className="rounded-2xl p-5"
                style={{ background: KEBU.card, border: `1px solid ${KEBU.border}` }}
              >
                <h2 className="text-sm font-bold uppercase tracking-wider mb-1">Business Registration</h2>
                <p className="text-[10px] mb-4 leading-relaxed" style={{ color: KEBU.faint }}>
                  Track your path from application to active business. Steps advance when verified on the server — not from the browser.
                </p>
                <RegistrationProgressTimeline steps={progress} />
              </section>
            </div>

            <section
              className="rounded-2xl p-5 mb-6"
              style={{ background: KEBU.card, border: `1px solid ${KEBU.border}` }}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider mb-1">Registration documents</h2>
              <p className="text-[10px] mb-4 leading-relaxed" style={{ color: KEBU.faint }}>
                Upload required files to complete the Documents Uploaded step. Stored securely in Supabase.
              </p>
              <BusinessDocumentsPanel
                businessId={business.id}
                canEdit={role === "founder" || role === "administrator"}
                onProgressChange={() => void load()}
              />
            </section>

            <dl
              className="grid sm:grid-cols-2 gap-4 rounded-2xl p-5 mb-6"
              style={{ background: KEBU.card, border: `1px solid ${KEBU.border}` }}
            >
              <div>
                <dt className="text-[10px] uppercase tracking-wider" style={{ color: KEBU.faint }}>
                  Category
                </dt>
                <dd className="font-semibold mt-1">{business.category}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider" style={{ color: KEBU.faint }}>
                  Registration status
                </dt>
                <dd className="font-semibold mt-1">{business.registration_status.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider" style={{ color: KEBU.faint }}>
                  Website
                </dt>
                <dd className="mt-1 text-sm" style={{ color: KEBU.muted }}>
                  {websiteProjects.length > 0 ? (
                    <ul className="space-y-2">
                      {websiteProjects.map((site) => (
                        <li key={site.id}>
                          <Link
                            href={site.editorUrl}
                            className="font-semibold underline"
                            style={{ color: KEBU.black }}
                          >
                            {site.title}
                          </Link>
                          <span className="block text-[11px] mt-0.5">
                            {site.status.replace(/_/g, " ")}
                            {site.subdomain ? ` · /sites/${site.subdomain}` : ""}
                          </span>
                          <span className="flex flex-wrap gap-3 mt-1 text-[11px]">
                            {site.previewPath ? (
                              <Link href={site.previewPath} className="underline" style={{ color: KEBU.orange }}>
                                Preview
                              </Link>
                            ) : null}
                            {site.liveUrl ? (
                              <a
                                href={site.liveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                                style={{ color: KEBU.orange }}
                              >
                                Live URL
                              </a>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : business.website ? (
                    <a href={business.website} target="_blank" rel="noopener noreferrer" className="underline">
                      {business.website}
                    </a>
                  ) : (
                    <>
                      No website yet.{" "}
                      <Link
                        href={`/create/new?businessId=${business.id}`}
                        className="underline font-semibold"
                        style={{ color: KEBU.orange }}
                      >
                        Build one
                      </Link>
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider" style={{ color: KEBU.faint }}>
                  Store
                </dt>
                <dd className="mt-1 text-sm" style={{ color: KEBU.muted }}>
                  Not created yet (commerce is a later slice)
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-wider" style={{ color: KEBU.faint }}>
                  Description
                </dt>
                <dd className="mt-1 text-sm" style={{ color: KEBU.muted, lineHeight: 1.6 }}>
                  {business.description}
                </dd>
              </div>
            </dl>

            <section
              className="rounded-2xl p-5 mb-6"
              style={{ background: KEBU.card, border: `1px solid ${KEBU.border}` }}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3">Members</h2>
              <ul className="text-sm space-y-2">
                {members.map((m) => (
                  <li key={m.id} style={{ color: KEBU.muted }}>
                    {m.role} · {m.status}
                  </li>
                ))}
              </ul>
              {owners.length > 0 && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-wider mt-4 mb-2">Owners</h3>
                  <ul className="text-sm space-y-2">
                    {owners.map((o) => (
                      <li key={o.email} style={{ color: KEBU.muted }}>
                        {o.full_name} · {Number(o.ownership_percent)}% · {o.email}
                        {o.is_primary_founder ? " · founder" : ""}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section
              className="rounded-2xl p-5"
              style={{ background: KEBU.card, border: `1px solid ${KEBU.border}` }}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3">Recent activity</h2>
              {statusHistory.length === 0 ? (
                <p className="text-sm" style={{ color: KEBU.muted }}>
                  No status history yet.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {statusHistory.map((h) => (
                    <li key={h.id} style={{ color: KEBU.muted }}>
                      <span className="font-semibold" style={{ color: KEBU.black }}>
                        {h.from_status ?? "—"} → {h.to_status}
                      </span>
                      {h.note ? ` · ${h.note}` : ""}
                      <span className="block text-[11px]" style={{ color: KEBU.faint }}>
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { FEATURED_TEMPLATES } from "@/lib/create/featured-templates";
import { publicTemplateSeeds } from "@/lib/create/templates-seed";
import {
  kebuSitePreviewPath,
  liveSiteUrl,
  plannedKebuAfricaHost,
} from "@/lib/create/site-urls";

type ProjectRow = {
  id: string;
  title: string;
  project_type: string;
  status: string;
  subdomain?: string | null;
  updated_at: string;
};

type PortfolioSiteRow = {
  key: string;
  title: string;
  projectId: string | null;
  subdomain: string | null;
  editorUrl: string | null;
  previewPath: string | null;
  kebuAfricaUrl?: string | null;
  status?: string | null;
};

export default function CreateHubPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbHealth, setDbHealth] = useState<{ saveReady: boolean; message: string } | null>(null);
  const [portfolioBusy, setPortfolioBusy] = useState(false);
  const [portfolioNote, setPortfolioNote] = useState<string | null>(null);
  const [portfolioAllowed, setPortfolioAllowed] = useState(false);
  const [portfolioSites, setPortfolioSites] = useState<PortfolioSiteRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/create");
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load projects.");
        setProjects([]);
        return;
      }
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch {
      setError("Network error. Check your connection and retry.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadPortfolio = useCallback(async () => {
    setPortfolioBusy(true);
    setPortfolioNote(null);
    const res = await fetch("/api/projects/ensure-portfolio?ensure=1", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      router.replace("/login?next=/create");
      setPortfolioBusy(false);
      return;
    }
    if (res.ok && data.allowed === true) {
      setPortfolioAllowed(true);
      setPortfolioSites(Array.isArray(data.sites) ? data.sites : []);
      if (data.autoEnsured) {
        setPortfolioNote("May Lecor and K-Direction are in My sites.");
        await load();
      }
      if (typeof data.error === "string") {
        setError(data.detail ? `${data.error} (${data.detail})` : data.error);
      }
    } else {
      setPortfolioAllowed(false);
      setPortfolioSites([]);
    }
    setPortfolioBusy(false);
  }, [load, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  useEffect(() => {
    async function checkDb() {
      const res = await fetch("/api/create/health", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDbHealth({
          saveReady: Boolean(data.saveReady),
          message: typeof data.message === "string" ? data.message : "",
        });
      }
    }
    void checkDb();
  }, []);

  const portfolioProjectIds = new Set(
    portfolioSites.map((s) => s.projectId).filter((id): id is string => Boolean(id)),
  );
  const otherProjects = projects.filter((p) => !portfolioProjectIds.has(p.id));

  return (
    <AppShell
      title="Kebu Builder"
      portfolioSites={portfolioAllowed ? portfolioSites : []}
      actions={
        <Link
          href="/create/new"
          className="rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: "#FF5500", color: "#FFFFFF" }}
        >
          + New site
        </Link>
      }
    >
      <main className="max-w-5xl mx-auto px-5 py-10 sm:py-14">
        <section className="mb-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] mb-3" style={{ color: "#FF5500" }}>
            Kebu Builder
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 max-w-2xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            Your website. Your photos. Live on Kebu.
          </h1>
          <p className="text-base max-w-xl leading-relaxed mb-6" style={{ color: "#5C5348" }}>
            Pick a template, swap image URLs in the editor, preview, then publish. Live sites open at{" "}
            <strong>/sites/your-name</strong> on this app. Branded <strong>*.kebu.africa</strong> comes after
            that domain is owned + DNS.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/create/new"
              className="inline-flex rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider"
              style={{ background: "#FF5500", color: "#FFFFFF" }}
            >
              Start building
            </Link>
            <Link
              href="/create/demo/musician-artist"
              className="inline-flex rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wider"
              style={{ border: "2px solid #FF5500", color: "#FF5500" }}
            >
              Preview artist template
            </Link>
          </div>
        </section>

        {dbHealth && !dbHealth.saveReady ? (
          <div
            className="rounded-2xl p-4 mb-10 text-sm leading-relaxed"
            style={{ background: "#FFF8E8", border: "1px solid #F0E4C8", color: "#6B5B45" }}
          >
            <p className="font-semibold mb-1" style={{ color: "#0A0A0A" }}>
              Demos work now · saving needs Supabase later
            </p>
            <p>
              You can preview templates below without a database. When you apply migrations, edit → save → publish
              connects end-to-end. {dbHealth.message}
            </p>
          </div>
        ) : null}

        <section className="mb-12">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-bold">Featured templates</h2>
              <p className="text-sm mt-1" style={{ color: "#6B5B45" }}>
                Preview instantly · customize photos in the editor
              </p>
            </div>
            <Link href="/create/new" className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#FF5500" }}>
              Browse all {publicTemplateSeeds().length} templates →
            </Link>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {FEATURED_TEMPLATES.map((t) => (
              <li
                key={t.slug}
                className="rounded-2xl overflow-hidden flex flex-col bg-white"
                style={{ border: "1px solid rgba(10,10,10,0.1)", color: "#0A0A0A", boxShadow: "0 8px 24px rgba(255,85,0,0.06)" }}
              >
                <div className="h-2 w-full" style={{ background: t.accent }} />
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: t.accent }}>
                    {t.category}
                  </p>
                  <h3 className="text-lg font-bold mb-2">{t.name}</h3>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: "#5C5348" }}>{t.tagline}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={`/create/demo/${t.slug}`}
                      className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: "#FFF8F2", color: "#0A0A0A", border: "1px solid rgba(10,10,10,0.1)" }}
                    >
                      Preview demo
                    </Link>
                    <Link
                      href={`/create/new?template=${t.slug}`}
                      className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: "#FF5500", color: "#FFFFFF" }}
                    >
                      Use template
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="rounded-2xl p-6 mb-10 grid sm:grid-cols-4 gap-4"
          style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.1)" }}
        >
          {[
            { n: "1", t: "Pick template", d: "Artist, agency, salon, store — starters for everyone" },
            { n: "2", t: "Edit photos", d: "Swap any image URL — motion stays" },
            { n: "3", t: "Preview", d: "Desktop + mobile before you publish" },
            { n: "4", t: "Go live", d: "Public at /sites/your-name" },
          ].map((step) => (
            <div key={step.n}>
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold mb-2"
                style={{ background: "#FF5500", color: "#FFFFFF" }}
              >
                {step.n}
              </span>
              <p className="font-semibold text-sm">{step.t}</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "#6B5B45" }}>
                {step.d}
              </p>
            </div>
          ))}
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-2">My sites</h2>
          {portfolioBusy ? (
            <p className="text-sm mb-3" style={{ color: "#5C5348" }}>
              Loading your sites…
            </p>
          ) : null}
          {portfolioNote ? (
            <p className="text-xs mb-3" style={{ color: "#FF5500" }} role="status">
              {portfolioNote}
            </p>
          ) : null}
          {error ? (
            <div role="alert" className="rounded-xl p-4 text-sm mb-3" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
              {error}
              <button
                type="button"
                className="underline ml-2"
                onClick={() => {
                  void load();
                  void loadPortfolio();
                }}
              >
                Retry
              </button>
            </div>
          ) : null}

          {portfolioAllowed && portfolioSites.length > 0 ? (
            <ul className="space-y-3 mb-8">
              {portfolioSites.map((s) => {
                const path = s.previewPath ?? kebuSitePreviewPath(s.subdomain);
                const live = liveSiteUrl(s.subdomain) ?? path;
                return (
                  <li
                    key={s.key}
                    className="rounded-2xl px-5 py-4"
                    style={{ background: "#FFF8F2", border: "1px solid rgba(255,85,0,0.25)" }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{s.title}</p>
                        {path ? (
                          <a
                            href={path}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold underline break-all"
                            style={{ color: "#0A0A0A" }}
                          >
                            {live}
                          </a>
                        ) : (
                          <p className="text-xs" style={{ color: "#5C5348" }}>
                            Setting up… refresh in a moment.
                          </p>
                        )}
                      </div>
                      {s.editorUrl ? (
                        <Link
                          href={s.editorUrl}
                          className="text-xs font-bold rounded-full px-4 py-2"
                          style={{ background: "#FF5500", color: "#fff" }}
                        >
                          Open editor →
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <h3 className="text-sm font-bold mb-3" style={{ color: "#5C5348" }}>
            {portfolioAllowed ? "Other sites on this account" : "Your sites"}
          </h3>
          {loading ? (
            <p className="text-sm" style={{ color: "#5C5348" }}>
              Loading…
            </p>
          ) : otherProjects.length === 0 ? (
            <div
              className="rounded-2xl px-6 py-8 text-center"
              style={{ border: "1px dashed rgba(10,10,10,0.15)", background: "#fff" }}
            >
              <p className="text-sm" style={{ color: "#5C5348" }}>
                {portfolioAllowed
                  ? "No other sites yet — start from a shared template below."
                  : "Pick a shared template to create your first site."}
              </p>
              <Link href="/create/new" className="text-sm font-semibold underline mt-3 inline-block" style={{ color: "#FF5500" }}>
                New site from template
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {otherProjects.map((p) => {
                const path = kebuSitePreviewPath(p.subdomain);
                const live = liveSiteUrl(p.subdomain);
                const planned = plannedKebuAfricaHost(p.subdomain);
                const isLive = p.status === "published";
                return (
                  <li
                    key={p.id}
                    className="rounded-2xl px-5 py-4"
                    style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.1)" }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{p.title}</p>
                        <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: "#8A8074" }}>
                          {p.status} · {p.project_type}
                        </p>
                        {path ? (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#FF5500" }}>
                              {isLive ? "Live now" : "Public path (after publish)"}
                            </p>
                            <a
                              href={path}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-sm font-semibold underline break-all"
                              style={{ color: "#0A0A0A" }}
                            >
                              {live ?? path}
                            </a>
                            {planned ? (
                              <p className="text-[11px]" style={{ color: "#8A8074" }}>
                                Planned later: {planned}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Link
                          href={`/create/${p.id}`}
                          className="text-xs font-bold text-center rounded-full px-4 py-2"
                          style={{ background: "#FF5500", color: "#fff" }}
                        >
                          Open editor →
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-center text-xs" style={{ color: "#8A8578" }}>
          <Link href="/business" className="underline">
            My businesses
          </Link>
          {" · "}
          Live hosting $4/month via JOKO when you publish
        </p>
      </main>
    </AppShell>
  );
}

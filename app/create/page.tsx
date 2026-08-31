"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CreateShell } from "@/app/components/create/create-shell";
import { FEATURED_TEMPLATES } from "@/lib/create/featured-templates";
import { publicTemplateSeeds } from "@/lib/create/templates-seed";
import {
  formatSiteAddressLabel,
  kebuAfricaSiteUrl,
  kebuSitePreviewPath,
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
    const res = await fetch("/api/projects/ensure-portfolio", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.allowed === true) {
      setPortfolioAllowed(true);
      setPortfolioSites(Array.isArray(data.sites) ? data.sites : []);
    } else {
      setPortfolioAllowed(false);
      setPortfolioSites([]);
    }
  }, []);

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

  async function addPortfolioSites() {
    if (portfolioBusy) return;
    setPortfolioBusy(true);
    setPortfolioNote(null);
    setError(null);
    try {
      const res = await fetch("/api/projects/ensure-portfolio", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/create");
        return;
      }
      if (res.status === 403) {
        setError("These sites are private to the owner account.");
        setPortfolioAllowed(false);
        return;
      }
      if (res.status === 400 && data.registerUrl) {
        setError(typeof data.error === "string" ? data.error : "Register a business first.");
        setPortfolioNote("Open Business → Register, then come back and add your sites.");
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not add portfolio sites.");
        return;
      }
      setPortfolioNote(typeof data.message === "string" ? data.message : "Sites ready.");
      await Promise.all([load(), loadPortfolio()]);
    } catch {
      setError("Network error while adding sites.");
    } finally {
      setPortfolioBusy(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#FFFBF7", color: "#0A0A0A" }}>
      <CreateShell
        step="start"
        title="Kebu Create"
        actions={
          <Link
            href="/create/new"
            className="rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: "#FF5500", color: "#FFFFFF" }}
          >
            + New site
          </Link>
        }
      />

      <main className="max-w-5xl mx-auto px-5 py-10 sm:py-14">
        <section className="mb-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] mb-3" style={{ color: "#FF5500" }}>
            Build something real
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 max-w-2xl" style={{ fontFamily: "var(--font-fraunces)" }}>
            Your website. Your photos. Live on Kebu.
          </h1>
          <p className="text-base max-w-xl leading-relaxed mb-6" style={{ color: "#5C5348" }}>
            Pick a template, swap image URLs in the editor, preview motion and cutouts, then go live at{" "}
            <strong>https://your-name.kebu.africa</strong> when you are ready.
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
            { n: "4", t: "Go live", d: "HTTPS on yourname.kebu.africa" },
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
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold">Your sites</h2>
            {portfolioAllowed ? (
              <button
                type="button"
                onClick={() => void addPortfolioSites()}
                disabled={portfolioBusy}
                className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                style={{ background: "#FF5500", color: "#FFFFFF" }}
              >
                {portfolioBusy ? "Adding…" : "Add my sites (May Lecor + K-Direction)"}
              </button>
            ) : null}
          </div>
          {portfolioAllowed ? (
            portfolioNote ? (
              <p className="text-xs mb-3" style={{ color: "#FF5500" }} role="status">
                {portfolioNote}
              </p>
            ) : (
              <p className="text-xs mb-3" style={{ color: "#5C5348" }}>
                Private to your owner login only. Other people use shared templates — not May Lecor or K-Direction.
              </p>
            )
          ) : (
            <p className="text-xs mb-3" style={{ color: "#5C5348" }}>
              Start from a shared template below. Your sites stay on this login — others cannot see them.
            </p>
          )}
          {error ? (
            <div role="alert" className="rounded-xl p-4 text-sm mb-3" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
              {error}
              {error.includes("Register") ? (
                <Link href="/business/register" className="underline ml-2 font-semibold">
                  Register business
                </Link>
              ) : (
                <button type="button" className="underline ml-2" onClick={() => void load()}>
                  Retry
                </button>
              )}
            </div>
          ) : null}
          {loading ? (
            <p className="text-sm" style={{ color: "#5C5348" }}>
              Loading…
            </p>
          ) : projects.length === 0 ? (
            <div
              className="rounded-2xl px-6 py-10 text-center"
              style={{ border: "1px dashed rgba(10,10,10,0.15)", background: "#fff" }}
            >
              <p className="font-semibold mb-2">No sites on this account yet</p>
              <p className="text-sm mb-4" style={{ color: "#5C5348" }}>
                {portfolioAllowed
                  ? "Add your personal May Lecor + K-Direction sites above, or start from a shared template."
                  : "Pick a shared template to create your first site."}
              </p>
              <Link href="/create/new" className="text-sm font-semibold underline" style={{ color: "#FF5500" }}>
                Create your first site
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {projects.map((p) => {
                const liveUrl = kebuAfricaSiteUrl(p.subdomain);
                const previewPath = kebuSitePreviewPath(p.subdomain);
                const address = formatSiteAddressLabel(p.subdomain);
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
                        {address ? (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#FF5500" }}>
                              {isLive ? "Live address" : "Your Kebu address (after publish)"}
                            </p>
                            {liveUrl ? (
                              <a
                                href={isLive ? liveUrl : previewPath ?? liveUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-sm font-semibold underline break-all"
                                style={{ color: "#0A0A0A" }}
                              >
                                {liveUrl}
                              </a>
                            ) : null}
                            {previewPath ? (
                              <a
                                href={previewPath}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-xs underline"
                                style={{ color: "#5C5348" }}
                              >
                                Open on Kebu: {previewPath}
                              </a>
                            ) : null}
                            {!isLive ? (
                              <p className="text-[11px]" style={{ color: "#8A8074" }}>
                                Address is reserved. Publish from the editor to make {address} public.
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-xs mt-2" style={{ color: "#8A8074" }}>
                            No subdomain yet — open the editor and set your site address.
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Link
                          href={`/create/${p.id}`}
                          className="text-xs font-bold text-center rounded-full px-4 py-2"
                          style={{ background: "#FF5500", color: "#fff" }}
                        >
                          Open editor →
                        </Link>
                        <Link
                          href={`/create/${p.id}/preview`}
                          className="text-xs font-semibold text-center underline"
                          style={{ color: "#5C5348" }}
                        >
                          Preview draft
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {portfolioAllowed && portfolioSites.some((s) => s.projectId) ? (
            <div className="mt-8 rounded-2xl p-5" style={{ background: "#FFF8F2", border: "1px solid rgba(255,85,0,0.25)" }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: "#FF5500" }}>
                Your private sites · May Lecor & K-Direction
              </p>
              <ul className="space-y-3">
                {portfolioSites
                  .filter((s) => s.projectId)
                  .map((s) => {
                    const liveUrl = s.kebuAfricaUrl ?? kebuAfricaSiteUrl(s.subdomain);
                    const previewPath = s.previewPath ?? kebuSitePreviewPath(s.subdomain);
                    return (
                      <li key={s.key} className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold">{s.title}</p>
                          {liveUrl ? (
                            <a
                              href={previewPath ?? liveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-semibold underline break-all"
                              style={{ color: "#0A0A0A" }}
                            >
                              {liveUrl}
                            </a>
                          ) : (
                            <p className="text-xs" style={{ color: "#5C5348" }}>
                              Subdomain pending — click Add my sites again to go live
                            </p>
                          )}
                          {previewPath ? (
                            <a href={previewPath} className="block text-xs mt-1 underline" style={{ color: "#5C5348" }}>
                              Open now: {previewPath}
                            </a>
                          ) : null}
                        </div>
                        {s.editorUrl ? (
                          <Link href={s.editorUrl} className="text-xs font-bold" style={{ color: "#FF5500" }}>
                            Edit →
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ) : null}
        </section>

        <p className="text-center text-xs" style={{ color: "#8A8578" }}>
          <Link href="/business" className="underline">
            My businesses
          </Link>
          {" · "}
          Live hosting $4/month via JOKO when you publish
        </p>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { TemplatePreviewCard } from "@/app/components/create/template-preview-card";
import { MySitesGrid, type MySiteProject } from "@/app/components/create/my-sites-grid";
import { getFeaturedGalleryTemplates } from "@/lib/create/template-gallery";

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
    try {
      let res = await fetch("/api/projects/ensure-portfolio?ensure=1", { credentials: "include" });
      let data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/create");
        return;
      }
      if (res.ok && data.allowed === true) {
        setPortfolioAllowed(true);
        let sites: PortfolioSiteRow[] = Array.isArray(data.sites) ? data.sites : [];
        const needsCreate = sites.some((s) => !s.projectId);
        if (needsCreate) {
          const postRes = await fetch("/api/projects/ensure-portfolio", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
          const postData = await postRes.json().catch(() => ({}));
          if (postRes.ok && Array.isArray(postData.sites)) {
            sites = postData.sites;
            if (postData.errors?.length) {
              setPortfolioNote(
                `Some sites need attention: ${postData.errors.map((e: { key: string; error: string }) => `${e.key}: ${e.error}`).join(" · ")}`,
              );
            } else {
              setPortfolioNote("May Lecor and K-Direction are ready — open the editor to connect your domain.");
            }
            await load();
          } else if (typeof postData.error === "string") {
            setPortfolioNote(
              postData.detail ? `${postData.error} (${postData.detail})` : postData.error,
            );
          }
        } else if (data.autoEnsured) {
          setPortfolioNote("May Lecor and K-Direction are in My sites.");
          await load();
        }
        setPortfolioSites(sites);
        if (typeof data.error === "string" && !needsCreate) {
          setPortfolioNote(
            data.detail ? `${data.error} (${data.detail})` : data.error,
          );
        }
      } else {
        setPortfolioAllowed(false);
        setPortfolioSites([]);
      }
    } catch {
      setPortfolioNote("Could not load portfolio sites. Retry in a moment.");
    } finally {
      setPortfolioBusy(false);
    }
  }, [load, router]);

  async function restorePortfolioSites() {
    setPortfolioBusy(true);
    setPortfolioNote(null);
    try {
      const res = await fetch("/api/projects/ensure-portfolio", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/create");
        return;
      }
      if (!res.ok) {
        setPortfolioNote(typeof data.error === "string" ? data.error : "Could not create portfolio sites.");
        return;
      }
      setPortfolioAllowed(true);
      setPortfolioSites(Array.isArray(data.sites) ? data.sites : []);
      if (data.errors?.length) {
        setPortfolioNote(
          data.errors.map((e: { key: string; error: string }) => `${e.key}: ${e.error}`).join(" · "),
        );
      } else {
        setPortfolioNote("May Lecor and K-Direction are ready.");
      }
      await load();
    } catch {
      setPortfolioNote("Network error. Retry.");
    } finally {
      setPortfolioBusy(false);
    }
  }

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

  const galleryFeatured = getFeaturedGalleryTemplates().slice(0, 3);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#templates") {
      router.replace("/create/templates");
    }
  }, [router]);

  return (
    <AppShell
      title="Kebu Builder"
      portfolioSites={portfolioAllowed ? portfolioSites : []}
      actions={
        <Link
          href="/create/new"
          className="rounded-full px-4 py-2 text-sm font-semibold"
          style={{ background: "#FF5500", color: "#FFFFFF" }}
        >
          + New site
        </Link>
      }
    >
      <main className="max-w-6xl mx-auto px-5 py-10 sm:py-14">
        <section className="relative rounded-[2rem] overflow-hidden mb-14 p-8 sm:p-12">
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(125deg, #FF5500 0%, #E10600 40%, #0A0A0A 100%)",
            }}
          />
          <div className="absolute inset-0 opacity-20" aria-hidden style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #fff 0%, transparent 40%)" }} />
          <div className="relative text-white max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-4 opacity-90">Kebu Builder</p>
            <h1 className="text-3xl sm:text-5xl font-bold mb-4 leading-[1.05]" style={{ fontFamily: "var(--font-fraunces)" }}>
              Build something people can see — not another SaaS dashboard.
            </h1>
            <p className="text-sm sm:text-base leading-relaxed opacity-90 mb-8">
              Pick a template below, drop in your photos, publish to the world. Stores, artists, salons, agencies — all
              visual, all yours.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/create/templates"
                className="inline-flex rounded-full px-6 py-3 text-sm font-bold bg-white text-black"
              >
                Browse templates
              </Link>
              <Link
                href="/create/new"
                className="inline-flex rounded-full px-6 py-3 text-sm font-semibold border-2 border-white/80"
              >
                Blank site
              </Link>
            </div>
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

        <section className="mb-14">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: "#FF5500" }}>
                Templates
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
                See the site — not a description
              </h2>
            </div>
            <Link
              href="/create/templates"
              className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
              style={{ background: "#0A0A0A", color: "#fff" }}
            >
              All templates →
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {galleryFeatured.map((t) => (
              <li key={t.slug}>
                <TemplatePreviewCard template={t} visualOnly />
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

          {portfolioAllowed && portfolioSites.every((s) => !s.projectId) ? (
            <div
              className="rounded-2xl px-5 py-4 mb-6"
              style={{ background: "#FFF8F2", border: "1px solid rgba(255,85,0,0.25)" }}
            >
              <p className="text-sm mb-3" style={{ color: "#5C5348" }}>
                May Lecor and K-Direction are not in your account yet. One tap creates both sites.
              </p>
              <button
                type="button"
                disabled={portfolioBusy}
                onClick={() => void restorePortfolioSites()}
                className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                style={{ background: "#FF5500", color: "#fff" }}
              >
                {portfolioBusy ? "Creating…" : "Add May Lecor & K-Direction"}
              </button>
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm" style={{ color: "#5C5348" }}>
              Loading…
            </p>
          ) : (
            <MySitesGrid
              compact
              projects={projects.map(
                (p): MySiteProject => ({
                  id: p.id,
                  title: p.title,
                  status: p.status,
                  subdomain: p.subdomain,
                  project_type: p.project_type,
                  updated_at: p.updated_at,
                  published_at: p.status === "published" ? p.updated_at : null,
                }),
              )}
            />
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

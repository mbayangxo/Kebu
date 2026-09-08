"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { TemplatePreviewCard } from "@/app/components/create/template-preview-card";
import { getFeaturedGalleryTemplates, getFlagshipGalleryTemplates } from "@/lib/create/template-gallery";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";

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
  const [error, setError] = useState<string | null>(null);
  const [dbHealth, setDbHealth] = useState<{ saveReady: boolean; message: string } | null>(null);
  const [portfolioBusy, setPortfolioBusy] = useState(false);
  const [portfolioNote, setPortfolioNote] = useState<string | null>(null);
  const [portfolioAllowed, setPortfolioAllowed] = useState(false);
  const [portfolioSites, setPortfolioSites] = useState<PortfolioSiteRow[]>([]);

  const load = useCallback(async () => {
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
        // Always POST so existing May/K-Direction projects get template upgrades (Wix canvas, ksendr).
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
            setPortfolioNote(
              "May Lecor and K-Direction are ready — edit in the builder (drag photos, upload cutouts), then connect domain from My sites.",
            );
          }
          await load();
        } else if (typeof postData.error === "string") {
          setPortfolioNote(
            postData.detail ? `${postData.error} (${postData.detail})` : postData.error,
          );
        } else if (data.autoEnsured) {
          setPortfolioNote("May Lecor and K-Direction are in My sites.");
          await load();
        }
        setPortfolioSites(sites);
        if (typeof data.error === "string") {
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

  const galleryFlagship = getFlagshipGalleryTemplates();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#templates") {
      router.replace("/create/aesthetics");
    }
  }, [router]);

  return (
    <AppShell
      title="My Space"
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
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-4 opacity-90">
              Aesthetic store · build a site
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold mb-4 leading-[1.05]" style={{ fontFamily: "var(--font-fraunces)" }}>
              Pick a look. See the demo. Start your site.
            </h1>
            <p className="text-sm sm:text-base leading-relaxed opacity-90 mb-8">
              Themes live in Aesthetics. Your websites live in My Sites. Studio is for graphics — separate. Mae / owner
              brands are not mixed into the store.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/create/aesthetics"
                className="inline-flex rounded-full px-6 py-3 text-sm font-bold bg-white text-black"
              >
                Open Aesthetic store
              </Link>
              <Link
                href="/create/new?mode=ai"
                className="inline-flex rounded-full px-6 py-3 text-sm font-semibold border-2 border-white/80"
              >
                Build a site with Yande
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
                Real site layouts
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
                May Lecor (Russian cutouts) · K-Direction (Wix)
              </h2>
              <p className="text-sm mt-2 max-w-xl" style={{ color: "#5C5348" }}>
                May Lecor <em>is</em> the Russian pink cutout site — not a separate template. K-Direction is the other engine.
              </p>
            </div>
            <Link
              href="/create/aesthetics"
              className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
              style={{ background: "#0A0A0A", color: "#fff" }}
            >
              All aesthetics →
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {galleryFlagship.map((t) => (
              <li key={t.slug}>
                <TemplatePreviewCard template={t} visualOnly />
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: "#FF5500" }}>
                More templates
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
                Salons, stores, agencies, and more
              </h2>
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {getFeaturedGalleryTemplates()
              .filter((t) => !galleryFlagship.some((f) => f.slug === t.slug))
              .slice(0, 3)
              .map((t) => (
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
            { n: "1", t: "Words or template", d: "Describe the business, or pick a real starting design" },
            { n: "2", t: "Edit the draft", d: "Yande output is Kebu pages you can change — not a locked HTML dump" },
            { n: "3", t: "Preview", d: "Desktop + mobile before you publish" },
            { n: "4", t: "Go live", d: "Public at /sites/your-name — then Shop, payments, operate" },
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

        <section
          className="rounded-2xl p-6 mb-10 flex flex-wrap items-center justify-between gap-4"
          style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.1)" }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-1" style={{ color: "#FF5500" }}>
              My sites — not aesthetics
            </p>
            <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
              Your websites live here
            </h2>
            <p className="text-sm mt-2 max-w-lg" style={{ color: "#5C5348" }}>
              Drafts and live sites only. Theme browsing is under Aesthetics — do not mix the two.
            </p>
            {portfolioNote ? (
              <p className="text-xs mt-2" style={{ color: "#FF5500" }} role="status">
                {portfolioNote}
              </p>
            ) : null}
            {error ? (
              <p className="text-xs mt-2" style={{ color: "#8B1E1E" }} role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {portfolioAllowed && portfolioSites.every((s) => !s.projectId) ? (
              <button
                type="button"
                disabled={portfolioBusy}
                onClick={() => void restorePortfolioSites()}
                className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                style={{ background: "#0A0A0A", color: "#fff" }}
              >
                {portfolioBusy ? "Creating…" : "Add brand sites"}
              </button>
            ) : null}
            <Link
              href={MY_SITES_HREF}
              className="rounded-full px-6 py-3 text-sm font-bold text-white"
              style={{ background: "#FF5500" }}
            >
              Open My sites{projects.length ? ` (${projects.length})` : ""}
            </Link>
          </div>
        </section>

        <p className="text-center text-xs" style={{ color: "#8A8578" }}>
          <Link href="/business" className="underline">
            My businesses
          </Link>
          {" · "}
          Start free — Shop is $5/month for store + hosting via JOKO
        </p>
      </main>
    </AppShell>
  );
}

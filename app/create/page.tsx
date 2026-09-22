"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/components/app-shell";
import { TemplatePreviewCard } from "@/app/components/create/template-preview-card";
import { getFeaturedGalleryTemplates, getFlagshipGalleryTemplates } from "@/lib/create/template-gallery";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";
import { KEBU } from "@/lib/kebu-brand";

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

const TYPE_TABS = ["All", "Website", "Design", "Video", "Document", "Presentation", "Social", "Brand Kit", "More"];

const TEMPLATE_STARTERS = [
  { label: "Blank", bg: "#F5F4F1", border: true },
  { label: "Social Media", bg: "linear-gradient(135deg,#EC4899,#D946EF)" },
  { label: "Website", bg: "linear-gradient(135deg,#FF5500,#E10600)" },
  { label: "Presentation", bg: "linear-gradient(135deg,#0EA5E9,#06B6D4)" },
  { label: "Video", bg: "linear-gradient(135deg,#1A1A1A,#374151)" },
  { label: "Document", bg: "linear-gradient(135deg,#10B981,#059669)" },
];

const CONTENT_FILTERS = ["All", "Websites", "Designs", "Videos", "Documents", "Presentations", "Social", "Brand Kits"];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function CreateHubPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [portfolioBusy, setPortfolioBusy] = useState(false);
  const [portfolioNote, setPortfolioNote] = useState<string | null>(null);
  const [portfolioAllowed, setPortfolioAllowed] = useState(false);
  const [portfolioSites, setPortfolioSites] = useState<PortfolioSiteRow[]>([]);
  const [activeTab, setActiveTab] = useState("All");
  const [activeFilter, setActiveFilter] = useState("All");

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
      const res = await fetch("/api/projects/ensure-portfolio?ensure=1", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/create");
        return;
      }
      if (res.ok && data.allowed === true) {
        setPortfolioAllowed(true);
        let sites: PortfolioSiteRow[] = Array.isArray(data.sites) ? data.sites : [];
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPortfolio();
  }, [loadPortfolio]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#templates") {
      router.replace("/create/aesthetics");
    }
  }, [router]);

  const galleryFlagship = getFlagshipGalleryTemplates();

  const TYPE_TO_PROJECT_TYPE: Record<string, string> = {
    Website: "website",
    Design: "design",
    Video: "video",
    Document: "document",
    Presentation: "presentation",
    Social: "social",
    "Brand Kit": "brand",
  };

  const FILTER_TO_PROJECT_TYPE: Record<string, string> = {
    Websites: "website",
    Designs: "design",
    Videos: "video",
    Documents: "document",
    Presentations: "presentation",
    Social: "social",
    "Brand Kits": "brand",
  };

  const filteredProjects = projects.filter((p) => {
    const tabFilter = activeTab !== "All" && activeTab !== "More" ? TYPE_TO_PROJECT_TYPE[activeTab] : null;
    const contentFilter = activeFilter !== "All" ? FILTER_TO_PROJECT_TYPE[activeFilter] : null;
    const activeKey = tabFilter ?? contentFilter;
    if (!activeKey) return true;
    return p.project_type?.toLowerCase().includes(activeKey);
  });

  const gradients = [
    "linear-gradient(135deg,#FF5500,#E10600)",
    "linear-gradient(135deg,#1A1A1A,#374151)",
    "linear-gradient(135deg,#0EA5E9,#4A1D96)",
    "linear-gradient(135deg,#10B981,#059669)",
    "linear-gradient(135deg,#F59E0B,#EF4444)",
    "linear-gradient(135deg,#EC4899,#D946EF)",
  ];

  return (
    <AppShell
      title="Create"
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
      <div style={{ background: "#FAFAF9", minHeight: "100vh" }}>
        <div className="px-5 pt-5 sm:px-8 sm:pt-5">
          {/* Type tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="shrink-0 rounded-full px-4 py-1.5 text-[11px] font-bold transition"
                style={
                  activeTab === tab
                    ? { background: KEBU.black, color: "#fff" }
                    : { background: "white", color: KEBU.muted, border: "1px solid " + KEBU.borders.default }
                }
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-8 sm:px-8 space-y-8 mt-6">
          {/* Start creating section */}
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[.14em] mb-3" style={{ color: KEBU.muted }}>
              Start creating
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {/* Dark "Start creating" card */}
              <div
                className="flex shrink-0 flex-col justify-between rounded-2xl p-5 w-52 h-44"
                style={{ background: KEBU.black }}
              >
                <p className="text-base font-black text-white" style={{ fontFamily: "var(--font-fraunces)" }}>
                  Start creating
                </p>
                <Link
                  href="/create/new"
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold"
                  style={{ background: KEBU.orange, color: "#fff" }}
                >
                  + New project
                </Link>
              </div>
              {/* Template starters */}
              {TEMPLATE_STARTERS.map((t) => (
                <Link
                  key={t.label}
                  href="/create/aesthetics"
                  className="relative shrink-0 rounded-2xl overflow-hidden w-40 h-44 flex items-end p-3 hover:-translate-y-0.5 transition-transform"
                  style={
                    t.border
                      ? { background: t.bg, border: "1px dashed " + KEBU.borders.strong }
                      : { background: t.bg }
                  }
                >
                  <span
                    className="relative z-10 text-[11px] font-bold"
                    style={{ color: t.border ? KEBU.muted : "white" }}
                  >
                    {t.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Filter bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {CONTENT_FILTERS.map((f, i) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className="shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition"
                style={
                  activeFilter === f
                    ? { background: KEBU.black, color: "#fff" }
                    : { background: "white", color: KEBU.muted, border: "1px solid " + KEBU.borders.default }
                }
              >
                {f}
              </button>
            ))}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button className="rounded-xl border bg-white px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: KEBU.borders.default }}>
                🔍
              </button>
              <button className="rounded-xl border bg-white px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: KEBU.borders.default }}>
                Filter
              </button>
              <button className="rounded-xl border bg-white px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: KEBU.borders.default }}>
                Last modified ↕
              </button>
            </div>
          </div>

          {/* Error / portfolio notes */}
          {error && (
            <p className="text-xs rounded-xl border px-4 py-3" style={{ borderColor: KEBU.status.errorBorder, background: KEBU.status.errorBg, color: KEBU.status.errorText }} role="alert">
              {error}
            </p>
          )}
          {portfolioNote && (
            <p className="text-xs" style={{ color: KEBU.orange }} role="status">{portfolioNote}</p>
          )}

          {/* Recent projects */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: KEBU.muted }}>
                Recent projects
              </h2>
              <Link href={MY_SITES_HREF} className="text-[10px] font-bold" style={{ color: KEBU.orange }}>
                Open My sites{projects.length ? ` (${projects.length})` : ""} →
              </Link>
            </div>
            {filteredProjects.length > 0 ? (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {filteredProjects.slice(0, 12).map((project, i) => (
                  <Link
                    key={project.id}
                    href={`/create/${project.id}`}
                    className="rounded-2xl border bg-white overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition"
                    style={{ borderColor: KEBU.borders.default }}
                  >
                    <div
                      className="h-32 flex items-center justify-center"
                      style={{ background: gradients[i % gradients.length] }}
                    />
                    <div className="p-3">
                      <p className="truncate text-[12px] font-black">{project.title || "Untitled"}</p>
                      <p className="mt-0.5 text-[9px] uppercase tracking-wide" style={{ color: KEBU.faint }}>
                        {project.project_type} · Edited {timeAgo(project.updated_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed bg-white p-10 text-center" style={{ borderColor: KEBU.borders.default }}>
                <p className="text-sm font-black">No projects yet.</p>
                <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>
                  Start with a template or build from scratch.
                </p>
                <Link
                  href="/create/new"
                  className="mt-4 inline-flex rounded-full px-4 py-2 text-[10px] font-bold text-white"
                  style={{ background: KEBU.black }}
                >
                  + New project
                </Link>
              </div>
            )}
          </section>

          {/* Portfolio allow / restore */}
          {portfolioAllowed && portfolioSites.every((s) => !s.projectId) && (
            <div className="rounded-2xl border bg-white p-5 flex flex-wrap items-center justify-between gap-4" style={{ borderColor: KEBU.borders.default }}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.14em] mb-1" style={{ color: KEBU.orange }}>Brand portfolio sites</p>
                <p className="text-sm font-black" style={{ fontFamily: "var(--font-fraunces)" }}>May Lecor &amp; K-Direction</p>
              </div>
              <button
                type="button"
                disabled={portfolioBusy}
                onClick={() => void restorePortfolioSites()}
                className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50 text-white"
                style={{ background: KEBU.black }}
              >
                {portfolioBusy ? "Creating…" : "Add brand sites"}
              </button>
            </div>
          )}

          {/* Flagship templates */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.14em] mb-1" style={{ color: KEBU.orange }}>Real site layouts</p>
                <h2 className="text-xl font-black" style={{ fontFamily: "var(--font-fraunces)" }}>May Lecor · K-Direction</h2>
              </div>
              <Link href="/create/aesthetics" className="rounded-full px-4 py-2 text-[10px] font-bold text-white" style={{ background: KEBU.black }}>
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

          {/* Bottom 3-col */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Templates */}
            <Link
              href="/create/aesthetics"
              className="rounded-2xl border bg-white p-5 hover:-translate-y-0.5 hover:shadow-sm transition"
              style={{ borderColor: KEBU.borders.default }}
            >
              <p className="text-[10px] font-black uppercase tracking-[.14em] mb-1" style={{ color: KEBU.muted }}>Browse</p>
              <p className="text-base font-black" style={{ fontFamily: "var(--font-fraunces)" }}>Templates →</p>
              <ul className="mt-3 grid grid-cols-3 gap-1">
                {getFeaturedGalleryTemplates()
                  .filter((t) => !galleryFlagship.some((f) => f.slug === t.slug))
                  .slice(0, 3)
                  .map((t) => (
                    <li key={t.slug} className="aspect-square rounded-lg overflow-hidden" style={{ background: "#F5F4F1" }}>
                      <TemplatePreviewCard template={t} visualOnly />
                    </li>
                  ))}
              </ul>
            </Link>

            {/* AI tools */}
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[10px] font-black uppercase tracking-[.14em] mb-1" style={{ color: KEBU.muted }}>Powered by Yande</p>
              <p className="text-base font-black mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>AI tools →</p>
              <div className="flex gap-2 flex-wrap">
                {["Generate", "Edit", "Remove BG", "Resize", "Translate"].map((tool) => (
                  <span
                    key={tool}
                    className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                    style={{ background: "rgba(255,85,0,0.09)", color: KEBU.orange }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            {/* Import from */}
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: KEBU.borders.default }}>
              <p className="text-[10px] font-black uppercase tracking-[.14em] mb-1" style={{ color: KEBU.muted }}>Bring your work</p>
              <p className="text-base font-black mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>Import from →</p>
              <div className="flex gap-2 flex-wrap">
                {["Google Drive", "Dropbox", "Figma", "Canva"].map((src) => (
                  <span
                    key={src}
                    className="rounded-xl border px-2.5 py-1.5 text-[10px] font-bold"
                    style={{ borderColor: KEBU.borders.default, color: KEBU.muted }}
                  >
                    {src}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

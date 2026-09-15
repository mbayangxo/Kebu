"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MySitesGrid, type MySiteProject, type MySitesFilter } from "@/app/components/create/my-sites-grid";
import { KEBU } from "@/lib/kebu-brand";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";

type PortfolioSiteRow = {
  key: string;
  title: string;
  projectId: string | null;
  subdomain: string | null;
  editorUrl: string | null;
  previewPath: string | null;
  status?: string | null;
};

/**
 * My sites — drafts + live + portfolio brands in one workspace (not under /create).
 */
export function MySitesWithPortfolio({
  initialProjects,
  initialFilter = "all",
}: {
  initialProjects: MySiteProject[];
  initialFilter?: MySitesFilter;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<MySiteProject[]>(initialProjects);
  const [portfolioSites, setPortfolioSites] = useState<PortfolioSiteRow[]>([]);
  const [portfolioAllowed, setPortfolioAllowed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reloadProjects = useCallback(async () => {
    const res = await fetch("/api/projects", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      router.replace(`/login?next=${MY_SITES_HREF}`);
      return;
    }
    if (res.ok && Array.isArray(data.projects)) {
      setProjects(data.projects as MySiteProject[]);
    }
  }, [router]);

  const ensurePortfolio = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const getRes = await fetch("/api/projects/ensure-portfolio?ensure=1", { credentials: "include" });
      const getData = await getRes.json().catch(() => ({}));
      if (getRes.status === 401) {
        router.replace(`/login?next=${MY_SITES_HREF}`);
        return;
      }

      if (getData.allowed !== true) {
        setPortfolioAllowed(false);
        setPortfolioSites([]);
        setNote(
          "Flagship brand sites (May Lecor, K-Direction, DkLNS, Ndaoan House, RECT, Mayjor Good) only appear for the portfolio owner account. On Vercel, set KEBU_PORTFOLIO_OWNER_EMAILS to your login email (comma-separated), redeploy, then refresh this page.",
        );
        return;
      }

      setPortfolioAllowed(true);

      const postRes = await fetch("/api/projects/ensure-portfolio", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const postData = await postRes.json().catch(() => ({}));

      if (!postRes.ok) {
        setError(
          typeof postData.error === "string"
            ? postData.detail
              ? `${postData.error} (${postData.detail})`
              : postData.error
            : "Could not create or upgrade portfolio sites.",
        );
        if (Array.isArray(getData.sites)) setPortfolioSites(getData.sites);
        return;
      }

      const sites: PortfolioSiteRow[] = Array.isArray(postData.sites) ? postData.sites : [];
      setPortfolioSites(sites);

      if (Array.isArray(postData.errors) && postData.errors.length > 0) {
        setNote(
          postData.errors
            .map((e: { key: string; error: string }) => `${e.key}: ${e.error}`)
            .join(" · "),
        );
      } else {
        setNote(
          "Brand sites are ready — open each editor to edit, then Publish so /sites/{name} updates for visitors.",
        );
      }

      await reloadProjects();
      router.refresh();
    } catch {
      setError("Network error while loading brand sites. Retry.");
    } finally {
      setBusy(false);
    }
  }, [reloadProjects, router]);

  useEffect(() => {
    void ensurePortfolio();
  }, [ensurePortfolio]);

  return (
    <div>
      <div className="w-full px-5 sm:px-8 lg:px-16 pt-4 space-y-3">
        {busy ? (
          <p className="text-xs" style={{ color: KEBU.muted }}>
            Loading…
          </p>
        ) : null}

        {error ? (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: "#FFF1F0", color: "#8B1E1E", border: "1px solid #FECACA" }}
            role="alert"
          >
            {error}
            <button
              type="button"
              className="ml-3 font-bold underline"
              onClick={() => void ensurePortfolio()}
            >
              Retry
            </button>
          </div>
        ) : null}

        {note && portfolioAllowed === false ? (
          <div
            className="rounded-xl px-3 py-2 text-xs"
            style={{ background: "#FFF8E8", color: KEBU.black, border: `1px solid ${KEBU.border}` }}
            role="status"
          >
            {note}
          </div>
        ) : null}

        {portfolioAllowed && portfolioSites.length > 0 ? (
          <div className="rounded-2xl p-4" style={{ border: `1px solid ${KEBU.border}`, background: "#FFFFFF" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-4 rounded-full" style={{ background: KEBU.orange }} />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: KEBU.orange }}>
                Brand Sites
              </p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {portfolioSites.map((s) => {
                const live = s.status === "published";
                return (
                  <li
                    key={s.key}
                    className="group flex flex-col rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${KEBU.border}` }}
                  >
                    {/* Mini preview strip */}
                    <div
                      className="h-14 relative"
                      style={{ background: `linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 60%, rgba(255,85,0,0.4) 100%)` }}
                    >
                      <div className="absolute top-2 left-2 right-2 space-y-1">
                        <div className="h-[2px] rounded-full bg-white opacity-25 w-3/4" />
                        <div className="h-[2px] rounded-full bg-white opacity-15 w-1/2" />
                      </div>
                      <div
                        className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider"
                        style={{ background: live ? "#DCFCE7" : "rgba(0,0,0,0.35)", color: live ? "#15803D" : "rgba(255,255,255,0.8)" }}
                      >
                        {live ? "Live" : "Draft"}
                      </div>
                    </div>
                    {/* Info row */}
                    <div className="px-3 py-2.5 flex-1 flex flex-col gap-1" style={{ background: "#FAFAF8" }}>
                      <span className="font-bold text-[13px] leading-tight" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
                        {s.title}
                      </span>
                      {s.subdomain ? (
                        <span className="text-[9px] font-mono" style={{ color: KEBU.muted }}>
                          /sites/{s.subdomain}
                        </span>
                      ) : null}
                      <div className="flex items-center gap-2 mt-auto pt-1.5">
                        {s.editorUrl ? (
                          <Link
                            href={s.editorUrl}
                            className="rounded-md px-2.5 py-1 text-[10px] font-bold text-white"
                            style={{ background: KEBU.orange }}
                          >
                            Edit
                          </Link>
                        ) : null}
                        {s.previewPath ? (
                          <a
                            href={s.previewPath}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md px-2.5 py-1 text-[10px] font-semibold border"
                            style={{ borderColor: KEBU.border, color: KEBU.black }}
                          >
                            Live ↗
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <MySitesGrid projects={projects} initialFilter={initialFilter} />
    </div>
  );
}

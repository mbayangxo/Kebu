"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { sanitizeMaylecorNavLinks } from "@/lib/create/maylecor-nav";
import { KEBU } from "@/lib/kebu-brand";

type PageRow = {
  id: string;
  slug: string;
  title: string;
  sort_order: number;
};

type NavLink = {
  label: string;
  href: string;
  multiNav?: boolean;
  children?: { label: string; href: string }[];
};

/**
 * Shopify-style Pages manager inside Kebu Shop —
 * add pages, set menu links, open About May for editing.
 */
export function ShopPagesPanel({ projectId }: { projectId: string }) {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [navLinks, setNavLinks] = useState<NavLink[]>([]);
  const [usesSiteChrome, setUsesSiteChrome] = useState(false);
  const [heroSectionId, setHeroSectionId] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [publishNote, setPublishNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [seedAbout, setSeedAbout] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load pages.");
        return;
      }
      const list = (Array.isArray(data.pages) ? data.pages : []) as PageRow[];
      setPages(list.slice().sort((a, b) => a.sort_order - b.sort_order));
      setSubdomain(typeof data.project?.subdomain === "string" ? data.project.subdomain : null);

      const chromeRes = await fetch(`/api/projects/${projectId}/site-chrome`, { credentials: "include" });
      const chromeData = await chromeRes.json().catch(() => ({}));
      if (chromeRes.ok && chromeData.siteChrome?.header?.props?.links) {
        const links = (chromeData.siteChrome.header.props.links as { label?: string; href?: string }[]).map(
          (l) => ({ label: String(l.label ?? ""), href: String(l.href ?? "") }),
        );
        setNavLinks(links);
        setUsesSiteChrome(true);
        setHeroSectionId(null);
        return;
      }

      const sections = (Array.isArray(data.sections) ? data.sections : []) as {
        id: string;
        page_id: string;
        section_type: string;
        props?: Record<string, unknown>;
      }[];
      const homeId = list.find((p) => p.slug === "home")?.id;
      const hero =
        sections.find(
          (s) =>
            s.section_type === "legally-blonde-hero" && (!homeId || s.page_id === homeId),
        ) ??
        sections.find((s) => s.section_type === "legally-blonde-hero") ??
        sections.find((s) => s.section_type === "navigation");
      if (hero) {
        setHeroSectionId(hero.id);
        const links = sanitizeMaylecorNavLinks(
          (hero.props?.navLinks as { label?: string; href?: string }[]) ?? [],
        );
        setNavLinks(links);
      } else {
        setHeroSectionId(null);
        setNavLinks(sanitizeMaylecorNavLinks([]));
      }
      setUsesSiteChrome(false);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function slugify(raw: string) {
    return raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
  }

  async function saveNav(next: NavLink[]) {
    setBusy(true);
    setNote(null);
    try {
      if (usesSiteChrome) {
        const res = await fetch(`/api/projects/${projectId}/site-chrome`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ header: { links: next.map((l) => ({ label: l.label, href: l.href })) } }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setNote(typeof data.error === "string" ? data.error : "Could not save menu links.");
          return;
        }
        setNavLinks(next);
        setNote("Site menu saved. Publish when ready for visitors to see changes.");
        return;
      }
      if (!heroSectionId) {
        setNote("Open the website editor once so the site menu can be saved.");
        return;
      }
      const res = await fetch(`/api/projects/${projectId}/sections`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: heroSectionId, props: { navLinks: next } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(typeof data.error === "string" ? data.error : "Could not save menu links.");
        return;
      }
      setNavLinks(sanitizeMaylecorNavLinks(next));
      setNote("Menu links saved. Publish the site when you want visitors to see them.");
    } finally {
      setBusy(false);
    }
  }

  function menuHrefForPage(page: PageRow) {
    return page.slug === "home" ? "/" : `/${page.slug}`;
  }

  function isInMenu(page: PageRow) {
    const href = menuHrefForPage(page);
    return navLinks.some((l) => l.href === href || l.href === page.slug);
  }

  async function toggleMenu(page: PageRow) {
    const href = menuHrefForPage(page);
    if (isInMenu(page)) {
      await saveNav(navLinks.filter((l) => l.href !== href && l.href !== page.slug));
      return;
    }
    await saveNav([...navLinks, { label: page.title, href }]);
  }

  async function addPage(e: React.FormEvent) {
    e.preventDefault();
    const nextTitle = title.trim() || (seedAbout ? "About May" : "");
    const nextSlug = slug.trim() || slugify(nextTitle) || (seedAbout ? "about" : "");
    if (!nextTitle || !nextSlug) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: nextTitle,
          slug: nextSlug,
          seed: seedAbout || nextSlug === "about" ? "about-may" : "blank",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(typeof data.error === "string" ? data.error : "Could not add page.");
        return;
      }
      const page = data.page as PageRow;
      setTitle("");
      setSlug("");
      setSeedAbout(false);
      await load();
      const href = page.slug === "home" ? "/" : `/${page.slug}`;
      if (!navLinks.some((l) => l.href === href)) {
        await saveNav([...navLinks, { label: page.title, href }]);
      }
      setNote(`Page “${page.title}” added. Edit copy in the website builder.`);
    } finally {
      setBusy(false);
    }
  }

  async function ensureAboutMay() {
    const existing = pages.find((p) => p.slug === "about");
    if (existing) {
      setNote("About May already exists — open it in the builder to edit the bio.");
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "About May", slug: "about", seed: "about-may" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(typeof data.error === "string" ? data.error : "Could not create About May.");
        return;
      }
      await load();
      // Re-read menu after load so we don't use a stale closure.
      const res2 = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
      const data2 = await res2.json().catch(() => ({}));
      const sections2 = (Array.isArray(data2.sections) ? data2.sections : []) as {
        id: string;
        section_type: string;
        props?: Record<string, unknown>;
      }[];
      const hero2 = sections2.find((s) => s.section_type === "legally-blonde-hero");
      const currentNav = sanitizeMaylecorNavLinks(
        (hero2?.props?.navLinks as { label?: string; href?: string }[]) ?? [],
      );
      const href = "/about";
      if (!currentNav.some((l) => l.href === href || l.href === "about")) {
        await saveNav([...currentNav, { label: "About May", href }]);
      }
      setNote("About May page created with May’s full bio. Publish when ready.");
    } finally {
      setBusy(false);
    }
  }

  async function removePage(page: PageRow) {
    if (page.slug === "home") {
      setNote("Home cannot be deleted.");
      return;
    }
    if (!window.confirm(`Remove page “${page.title}”?`)) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(typeof data.error === "string" ? data.error : "Could not delete page.");
        return;
      }
      const href = menuHrefForPage(page);
      const nextNav = navLinks.filter((l) => l.href !== href && l.href !== page.slug);
      setNavLinks(nextNav);
      if (usesSiteChrome || heroSectionId) await saveNav(nextNav);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function updateMenuLink(index: number, patch: Partial<NavLink>) {
    const next = navLinks.map((l, i) => (i === index ? { ...l, ...patch } : l));
    setNavLinks(next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold" style={{ color: KEBU.black }}>
          Pages
        </h2>
        <p className="mt-1 text-xs font-mono" style={{ color: KEBU.muted }}>
          {subdomain ? `${subdomain}.kebu.africa` : "Set a site address in the builder"}
        </p>
        {subdomain ? (
          <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
            Live URL base: <span className="font-mono">/sites/{subdomain}</span>
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/create/${projectId}`}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ border: `1px solid ${KEBU.border}`, color: KEBU.black }}
          >
            Open builder
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setPublishNote(null);
              try {
                const res = await fetch(`/api/projects/${projectId}/publish`, {
                  method: "POST",
                  credentials: "include",
                });
                const data = await res.json().catch(() => ({}));
                setPublishNote(
                  res.ok
                    ? "Site published — menu and pages are live after refresh."
                    : typeof data.error === "string"
                      ? data.error
                      : "Publish failed.",
                );
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
            style={{ background: KEBU.orange }}
          >
            Publish site
          </button>
        </div>
        {publishNote ? (
          <p className="mt-2 text-xs rounded-xl px-3 py-2" style={{ background: KEBU.cream }}>
            {publishNote}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void ensureAboutMay()}
        className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
        style={{ background: KEBU.orange }}
      >
        {pages.some((p) => p.slug === "about") ? "About May is ready" : "+ Create About May page"}
      </button>

      {loading ? (
        <p className="text-sm" style={{ color: KEBU.muted }}>
          Loading pages…
        </p>
      ) : error ? (
        <p className="text-sm" style={{ color: "#8B1E1E" }}>{error}</p>
      ) : (
        <ul className="space-y-2">
          {pages.map((page) => (
            <li
              key={page.id}
              className="flex flex-wrap items-center gap-2 rounded-2xl px-3 py-3"
              style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: KEBU.black }}>
                  {page.title}
                </p>
                <p className="text-[11px] font-mono" style={{ color: KEBU.muted }}>
                  /{page.slug === "home" ? "" : page.slug}
                </p>
              </div>
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={isInMenu(page)}
                  disabled={busy}
                  onChange={() => void toggleMenu(page)}
                />
                In menu
              </label>
              <Link
                href={`/create/${projectId}?page=${page.slug}`}
                className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ border: `1px solid ${KEBU.border}`, color: KEBU.black }}
              >
                Edit
              </Link>
              {subdomain ? (
                <a
                  href={page.slug === "home" ? `/sites/${subdomain}` : `/sites/${subdomain}/${page.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ border: `1px solid ${KEBU.border}`, color: KEBU.black }}
                >
                  View
                </a>
              ) : null}
              {page.slug !== "home" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removePage(page)}
                  className="text-[10px] font-bold text-red-600 disabled:opacity-40"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-2xl p-4 space-y-3" style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
          Menu links + multi-navigation
        </p>
        <p className="text-xs leading-relaxed" style={{ color: KEBU.muted }}>
          Turn on <strong>Multi-nav</strong> for Shop or May&apos;s World (Shopify-style dropdown). Add child links to
          pages under that menu.
        </p>
        {navLinks.length === 0 ? (
          <p className="text-xs" style={{ color: KEBU.muted }}>
            No menu links yet. Turn on “In menu” on a page.
          </p>
        ) : (
          <ul className="space-y-3">
            {navLinks.map((link, index) => (
              <li
                key={`${link.href}-${index}`}
                className="rounded-xl bg-white p-3 space-y-2"
                style={{ border: `1px solid ${KEBU.border}` }}
              >
                <div className="flex flex-wrap gap-2">
                  <input
                    className="min-w-[8rem] flex-1 rounded-lg px-2 py-1.5 text-xs"
                    style={{ border: `1px solid ${KEBU.border}` }}
                    value={link.label}
                    onChange={(e) => void updateMenuLink(index, { label: e.target.value })}
                    aria-label="Menu label"
                  />
                  <input
                    className="min-w-[8rem] flex-1 rounded-lg px-2 py-1.5 text-xs font-mono"
                    style={{ border: `1px solid ${KEBU.border}` }}
                    value={link.href}
                    onChange={(e) => void updateMenuLink(index, { href: e.target.value })}
                    aria-label="Menu link"
                  />
                  <button
                    type="button"
                    className="text-[10px] font-bold text-red-600"
                    onClick={() => void saveNav(navLinks.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
                <label className="flex items-center gap-2 text-[11px] font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(link.multiNav)}
                    onChange={(e) => {
                      const multiNav = e.target.checked;
                      const children =
                        multiNav && !(link.children?.length)
                          ? pages
                              .filter((p) => p.slug !== "home" && `/${p.slug}` !== link.href && p.slug !== link.href.replace(/^\//, ""))
                              .slice(0, 6)
                              .map((p) => ({ label: p.title, href: p.slug === "home" ? "/" : `/${p.slug}` }))
                          : link.children ?? [];
                      void updateMenuLink(index, {
                        multiNav,
                        children: multiNav ? children : [],
                      });
                    }}
                  />
                  Multi-nav (dropdown)
                </label>
                {link.multiNav ? (
                  <div className="space-y-2 pl-2 border-l-2" style={{ borderColor: KEBU.orange }}>
                    {(link.children ?? []).map((child, ci) => (
                      <div key={`${child.href}-${ci}`} className="flex flex-wrap gap-2">
                        <input
                          className="min-w-[7rem] flex-1 rounded-lg px-2 py-1 text-[11px]"
                          style={{ border: `1px solid ${KEBU.border}` }}
                          value={child.label}
                          placeholder="Child label"
                          onChange={(e) => {
                            const children = [...(link.children ?? [])];
                            children[ci] = { ...child, label: e.target.value };
                            void updateMenuLink(index, { children });
                          }}
                        />
                        <select
                          className="min-w-[7rem] flex-1 rounded-lg px-2 py-1 text-[11px]"
                          style={{ border: `1px solid ${KEBU.border}` }}
                          value={child.href}
                          onChange={(e) => {
                            const children = [...(link.children ?? [])];
                            children[ci] = { ...child, href: e.target.value };
                            void updateMenuLink(index, { children });
                          }}
                        >
                          {pages.map((p) => (
                            <option key={p.id} value={p.slug === "home" ? "/" : `/${p.slug}`}>
                              {p.title} (/{p.slug === "home" ? "" : p.slug})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="text-[10px] text-red-600"
                          onClick={() => {
                            const children = (link.children ?? []).filter((_, i) => i !== ci);
                            void updateMenuLink(index, { children });
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: KEBU.orange }}
                      onClick={() => {
                        const first = pages.find((p) => p.slug !== "home");
                        const href = first ? `/${first.slug}` : "/mays-world";
                        const children = [
                          ...(link.children ?? []),
                          { label: first?.title ?? "Page", href },
                        ];
                        void updateMenuLink(index, { children, multiNav: true });
                      }}
                    >
                      + Add dropdown link
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={busy || (!usesSiteChrome && !heroSectionId)}
          onClick={() => void saveNav(navLinks)}
          className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: KEBU.black }}
        >
          Save menu links
        </button>
      </div>

      <form onSubmit={(e) => void addPage(e)} className="space-y-3 rounded-2xl p-4" style={{ border: `1px solid ${KEBU.border}` }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
          Add a page
        </p>
        <label className="block text-[10px] uppercase tracking-wider">
          Title
          <input
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slug || slug === slugify(title)) setSlug(slugify(e.target.value));
            }}
            placeholder="About May"
          />
        </label>
        <label className="block text-[10px] uppercase tracking-wider">
          URL slug
          <input
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-sm font-mono"
            style={{ border: `1px solid ${KEBU.border}` }}
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="about"
          />
        </label>
        <label className="flex items-center gap-2 text-xs" style={{ color: KEBU.black }}>
          <input type="checkbox" checked={seedAbout} onChange={(e) => setSeedAbout(e.target.checked)} />
          Start with May’s About bio (recommended for About May)
        </label>
        <button
          type="submit"
          disabled={busy || (!title.trim() && !seedAbout)}
          className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: KEBU.orange }}
        >
          {busy ? "Saving…" : "Add page"}
        </button>
      </form>

      {note ? (
        <p className="rounded-xl px-3 py-2 text-xs" style={{ background: KEBU.cream, color: KEBU.black }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

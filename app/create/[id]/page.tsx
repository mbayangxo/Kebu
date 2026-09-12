"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BuilderStudioChrome, BuilderStudioRail, type BuilderStudioTab } from "@/app/components/create/builder-studio-chrome";
import { BuilderAestheticsPanel } from "@/app/components/create/builder-aesthetics-panel";
import { YandeAssistant } from "@/app/components/create/yande-assistant";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { buildEditorPreviewDefinition } from "@/lib/create/editor-definition";
import { BUILDER, BUILDER_QUICK_SECTIONS, labelForSectionType } from "@/lib/create/builder-ui";
import { AddSectionPicker } from "@/app/components/create/add-section-picker";
import { BuilderSiteChromePanel } from "@/app/components/create/builder-site-chrome-panel";
import { BuilderBlogPanel } from "@/app/components/create/builder-blog-panel";
import {
  CHROME_FOOTER_ID,
  CHROME_HEADER_ID,
  isChromeSectionId,
  parseSiteChrome,
  patchSiteChromePart,
  projectUsesEmbeddedNav,
  type SiteChrome,
} from "@/lib/create/site-chrome";
import { defaultMaylecorNavLinks } from "@/lib/create/maylecor-nav";
import type { SiteSeo } from "@/lib/create/site-seo";
import { defaultSiteSeo } from "@/lib/create/site-seo";
import type { PublishState } from "@/lib/create/publish-state";
import { SiteAssetsPanel } from "@/app/components/create/site-assets-panel";
import { SectionPhotoField } from "@/app/components/create/section-photo-field";
import { BuilderBusinessNudge } from "@/app/components/create/builder-business-nudge";
import { BuilderEditablePreview } from "@/app/components/create/builder-editable-preview";
import { BuilderSiteCommandBar } from "@/app/components/create/builder-site-command-bar";
import { BuilderSectionListDnd } from "@/app/components/create/builder-section-list-dnd";
import { BuilderSectionZone } from "@/app/components/create/builder-section-zone";
import { BuilderFreeTextEditor, type FreeTextBlock } from "@/app/components/create/builder-free-text-editor";
import { BuilderPagesPanel } from "@/app/components/create/builder-pages-panel";
import { BuilderAiPreviewPanel } from "@/app/components/create/builder-ai-preview-panel";
import type { AiSectionChange } from "@/lib/create/ai-improve-merge";
import { mergePartialAiDefinition } from "@/lib/create/ai-improve-merge";
import { SiteMediaUpload } from "@/app/components/create/site-media-upload";
import { NavLinksEditor, mapNavLinksForEditor } from "@/app/components/create/nav-links-editor";
import { NavSizeEditor } from "@/app/components/create/nav-size-editor";
import { SocialLinksEditor } from "@/app/components/create/social-links-editor";
import type { ThemeTokens } from "@/lib/create/website-schema";
import {
  planMediaAssetApply,
  type KebuDragAsset,
} from "@/lib/create/builder-media-drop";
import { BUILDER_DEVICE_FRAME } from "@/lib/create/builder-device";
import { projectUsesMaylecorRussianLayout } from "@/lib/create/maylecor-russian-hero";
import { defaultMaylecorKsendrProps } from "@/lib/create/maylecor-ksendr-defaults";
import { projectUsesKdirectionLayout } from "@/lib/create/kdirection-local-assets";
import { clampNavScale, parseNavLayout, parseNavSize } from "@/lib/create/nav-chrome-size";
import { mySiteDetailHref } from "@/lib/navigation/product-nav";
import {
  DataModeProvider,
} from "@/app/components/create/data-mode-provider";
import { resolveClientDataMode } from "@/lib/create/data-mode";
import { measureResponseBytes, evaluateKb } from "@/lib/create/kb-budget";
import {
  enqueueSaveSection,
  isBrowserOnline,
} from "@/lib/create/offline-queue";

type Section = {
  id: string;
  page_id: string;
  section_type: string;
  sort_order: number;
  props: Record<string, unknown>;
};

type Project = {
  id: string;
  title: string;
  status: string;
  description?: string | null;
  subdomain?: string | null;
  theme?: WebsiteDefinition["theme"];
  business_id?: string | null;
  seo?: SiteSeo | Record<string, unknown> | null;
};

export default function ProjectEditorPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supportAssist, setSupportAssist] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "queued" | "error">("idle");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [payingHosting, setPayingHosting] = useState(false);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<{ url: string; title: string } | null>(null);
  const [subdomainInput, setSubdomainInput] = useState("");
  const [seoSettings, setSeoSettings] = useState<SiteSeo>(() => defaultSiteSeo());
  const [settingsState, setSettingsState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [settingsNote, setSettingsNote] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<BuilderStudioTab>("content");
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingThemeRef = useRef<ThemeTokens | null>(null);
  const [billing, setBilling] = useState<{
    canPublish: boolean;
    label: string;
    periodEnd?: string | null;
    billingExempt?: boolean;
    autopayEnabled?: boolean;
    tier?: string;
    plans?: Array<{ id: string; name: string; monthlyUsd: number; hero?: boolean }>;
  } | null>(null);
  const [checkoutTier, setCheckoutTier] = useState("shop");
  const [improving, setImproving] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [improveInstruction, setImproveInstruction] = useState("");
  const [improveMode, setImproveMode] = useState<"free" | "redesign" | "page" | "rewrite" | "convert">(
    "free",
  );
  const [improveNote, setImproveNote] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<{
    definition: WebsiteDefinition;
    intents: string[];
    sectionChanges: AiSectionChange[];
    acceptedSectionIds: Set<string>;
    repaired: boolean;
  } | null>(null);
  const [createNote, setCreateNote] = useState<string | null>(null);
  const [history, setHistory] = useState<Section[][]>([]);
  const [future, setFuture] = useState<Section[][]>([]);
  const [pages, setPages] = useState<Array<{ id: string; slug: string; title: string; sort_order: number }>>([]);
  const [siteChrome, setSiteChrome] = useState<SiteChrome | null>(null);
  const [previewPageSlug, setPreviewPageSlug] = useState("home");
  const [editPageId, setEditPageId] = useState("");
  const [publishState, setPublishState] = useState<PublishState | null>(null);
  const [appOrigin, setAppOrigin] = useState("");
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const chromeSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAppOrigin(window.location.origin);
    const q = new URLSearchParams(window.location.search);
    if (q.get("created") !== "1") return;
    const usedAi = q.get("usedAi") === "1";
    setCreateNote(
      usedAi
        ? "Yande built this draft from your words. Every page is editable Kebu structure — change anything, then publish."
        : "Draft site created from your words. Yande AI was not used this time (no key or generation fell back). You still have a full editable multi-page site.",
    );
  }, []);

  useEffect(() => {
    if (!previewFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [previewFullscreen]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/create/${projectId}`);
        return;
      }
      if (res.status === 404) {
        setError("Project not found — or you do not have access.");
        setProject(null);
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load project.");
        return;
      }
      let projectPayload = data;
      const sectionRows = Array.isArray(data.sections) ? data.sections : [];
      const desc = typeof data.project?.description === "string" ? data.project.description : "";
      const needsMaylecorFix =
        desc.includes("portfolio:maylecor") ||
        sectionRows.some(
          (s: { section_type?: string }) =>
            s.section_type === "legally-blonde-hero" || s.section_type === "maylecor-home",
        );
      const needsKdirectionFix =
        desc.includes("portfolio:kdirection") ||
        sectionRows.some(
          (s: { section_type?: string }) =>
            s.section_type === "kdirection-home" || s.section_type === "kdirection-page",
        );
      if (needsMaylecorFix) {
        const upRes = await fetch(`/api/projects/${projectId}/upgrade-maylecor`, {
          method: "POST",
          credentials: "include",
        });
        if (upRes.ok) {
          const res2 = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
          const data2 = await res2.json().catch(() => ({}));
          if (res2.ok) projectPayload = data2;
        }
      } else if (needsKdirectionFix) {
        const upRes = await fetch(`/api/projects/${projectId}/upgrade-kdirection`, {
          method: "POST",
          credentials: "include",
        });
        if (upRes.ok) {
          const res2 = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
          const data2 = await res2.json().catch(() => ({}));
          if (res2.ok) projectPayload = data2;
        }
      }
      setProject(projectPayload.project ?? data.project);
      setSupportAssist(Boolean(projectPayload.supportAssist ?? data.supportAssist));
      setPages(Array.isArray(projectPayload.pages) ? projectPayload.pages : []);
      setSections(Array.isArray(projectPayload.sections) ? projectPayload.sections : []);
      if (projectPayload.siteChrome && typeof projectPayload.siteChrome === "object") {
        setSiteChrome(parseSiteChrome(projectPayload.siteChrome));
      }
      if (projectPayload.publishState && typeof projectPayload.publishState === "object") {
        setPublishState(projectPayload.publishState as PublishState);
      }
      const pageList = Array.isArray(projectPayload.pages) ? projectPayload.pages : [];
      const firstPage = pageList[0] ?? null;
      setEditPageId((current) => {
        if (current && pageList.some((p: { id: string }) => p.id === current)) return current;
        return firstPage?.id ?? "";
      });
      setPreviewPageSlug((current) => {
        if (pageList.some((p: { slug: string }) => p.slug === current)) return current;
        return firstPage?.slug ?? "home";
      });
      const sub = typeof data.project?.subdomain === "string" ? data.project.subdomain : "";
      setSubdomainInput(sub);
      setPublishUrl(sub ? `/sites/${sub}` : null);
      setSeoSettings(defaultSiteSeo(data.project?.title ?? "My website"));
      if (data.project?.seo && typeof data.project.seo === "object") {
        setSeoSettings((prev) => ({ ...prev, ...(data.project.seo as SiteSeo) }));
      }

      const billingRes = await fetch(`/api/projects/${projectId}/billing`, { credentials: "include" });
      const billingData = await billingRes.json().catch(() => ({}));
      if (billingRes.ok) {
        const tier =
          typeof billingData.subscription?.tier === "string"
            ? billingData.subscription.tier
            : "free";
        setBilling({
          canPublish: Boolean(billingData.canPublish),
          label: typeof billingData.label === "string" ? billingData.label : "$5/month",
          periodEnd: billingData.subscription?.periodEnd ?? null,
          billingExempt: Boolean(billingData.billingExempt),
          autopayEnabled: Boolean(billingData.subscription?.autopayEnabled),
          tier,
          plans: Array.isArray(billingData.plans) ? billingData.plans : undefined,
        });
        if (tier && tier !== "free") setCheckoutTier(tier);
        else setCheckoutTier("shop");
      }
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    let cancelled = false;
    const timers = saveTimers.current;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
      Object.values(timers).forEach(clearTimeout);
      if (chromeSaveTimer.current) clearTimeout(chromeSaveTimer.current);
    };
  }, [load]);

  function pushHistory(prev: Section[]) {
    setHistory((h) => [...h.slice(-19), prev]);
    setFuture([]);
  }

  const [kbSaveNote, setKbSaveNote] = useState<string | null>(null);

  async function persistProps(sectionId: string, props: Record<string, unknown>) {
    const mode = resolveClientDataMode();
    const offline = !isBrowserOnline() || mode === "offline";
    if (offline) {
      enqueueSaveSection({ projectId, sectionId, props });
      setSaveState("queued");
      setKbSaveNote("Not saved on server yet — queued until Syncing…");
      setError(null);
      return;
    }
    setSaveState("saving");
    try {
      const res = await fetch(`/api/projects/${projectId}/sections`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Kebu-Data-Mode": mode,
        },
        body: JSON.stringify({ sectionId, props }),
      });
      const bytes = await measureResponseBytes(res);
      const ev = evaluateKb({ action: "save_section", mode, usedBytes: bytes });
      setKbSaveNote(ev.summary);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveState("error");
        const issueHint =
          data?.issues?.fieldErrors && typeof data.issues.fieldErrors === "object"
            ? Object.entries(data.issues.fieldErrors as Record<string, string[]>)
                .map(([k, v]) => `${k}: ${(v ?? []).join(", ")}`)
                .slice(0, 3)
                .join(" · ")
            : "";
        setError(
          [typeof data.error === "string" ? data.error : "Save failed.", issueHint || data.detail]
            .filter(Boolean)
            .join(" — "),
        );
        return;
      }
      if (data.section) {
        setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...data.section } : s)));
      }
      setPublishState((prev) =>
        prev
          ? { ...prev, hasUnpublishedChanges: true }
          : { isLive: false, hasUnpublishedChanges: true, lastPublishedAt: null, draftUpdatedAt: null, livePublicPath: null },
      );
      setSaveState("saved");
      setError(null);
    } catch {
      enqueueSaveSection({ projectId, sectionId, props });
      setSaveState("queued");
      setKbSaveNote("Not saved on server yet — queued until Syncing…");
      setError(null);
    }
  }

  async function persistChrome(part: "header" | "footer", props: Record<string, unknown>) {
    const mode = resolveClientDataMode();
    const offline = !isBrowserOnline() || mode === "offline";
    if (offline) {
      setSaveState("queued");
      setKbSaveNote("Site header/footer queued until Syncing…");
      return;
    }
    setSaveState("saving");
    try {
      const body = part === "header" ? { header: props } : { footer: props };
      const res = await fetch(`/api/projects/${projectId}/site-chrome`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Kebu-Data-Mode": mode },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveState("error");
        setError(typeof data.error === "string" ? data.error : "Could not save site header/footer.");
        return;
      }
      if (data.siteChrome) {
        setSiteChrome(parseSiteChrome(data.siteChrome));
      }
      setPublishState((prev) =>
        prev
          ? { ...prev, hasUnpublishedChanges: true }
          : { isLive: false, hasUnpublishedChanges: true, lastPublishedAt: null, draftUpdatedAt: null, livePublicPath: null },
      );
      setSaveState("saved");
      setError(null);
    } catch {
      setSaveState("queued");
      setKbSaveNote("Site header/footer queued until Syncing…");
    }
  }

  function updateChromeProps(part: "header" | "footer", patch: Record<string, unknown>) {
    setSiteChrome((prev) => {
      const base = prev ?? parseSiteChrome(null);
      const next = patchSiteChromePart({ ...base, enabled: true }, part, patch);
      if (chromeSaveTimer.current) clearTimeout(chromeSaveTimer.current);
      chromeSaveTimer.current = setTimeout(() => {
        const props =
          part === "header"
            ? next.header?.props
            : next.footer?.props;
        if (props) void persistChrome(part, props as Record<string, unknown>);
      }, 500);
      return next;
    });
  }

  function updateProps(sectionId: string, patch: Record<string, unknown>) {
    if (isChromeSectionId(sectionId)) {
      updateChromeProps(sectionId === CHROME_HEADER_ID ? "header" : "footer", patch);
      return;
    }
    setSections((prev) => {
      pushHistory(prev);
      const next = prev.map((s) =>
        s.id === sectionId ? { ...s, props: { ...s.props, ...patch } } : s
      );
      const merged = next.find((s) => s.id === sectionId)?.props ?? patch;
      if (saveTimers.current[sectionId]) clearTimeout(saveTimers.current[sectionId]);
      saveTimers.current[sectionId] = setTimeout(() => {
        void persistProps(sectionId, merged);
      }, 500);
      return next;
    });
  }

  async function addSection(
    type: string,
    props?: Record<string, unknown>,
    insertAfterSectionId?: string | null,
  ): Promise<Section | null> {
    const embeddedNav = projectUsesEmbeddedNav(sections.map((s) => s.section_type));
    if (siteChrome?.enabled && !embeddedNav && (type === "navigation" || type === "footer")) {
      setError('Header and footer apply to every page — use "Site header" or "Site footer" in the sidebar.');
      setSelectedSectionId(type === "navigation" ? CHROME_HEADER_ID : CHROME_FOOTER_ID);
      setSidebarTab("content");
      setLeftPanelOpen(true);
      return null;
    }
    const page = pages.find((p) => p.id === editPageId) ?? pages[0];
    let nextProps = props;
    if (type === "navigation" && !props) {
      const links =
        pages.length > 0
          ? pages
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((p) => ({
                label: p.title,
                href: p.slug === "home" ? "/" : `/${p.slug}`,
              }))
          : defaultMaylecorNavLinks();
      nextProps = {
        brand: project?.title?.trim() || "My site",
        links,
      };
    }
    const res = await fetch(`/api/projects/${projectId}/sections`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        pageSlug: page?.slug ?? "home",
        ...(insertAfterSectionId !== undefined ? { insertAfterSectionId } : {}),
        ...(nextProps ? { props: nextProps } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not add section.");
      return null;
    }
    const section = data.section as Section;
    setSections((prev) => {
      pushHistory(prev);
      return [...prev, section].sort((a, b) => a.sort_order - b.sort_order);
    });
    setSelectedSectionId(section.id);
    setSidebarTab("content");
    return section;
  }

  async function duplicateSection(sectionId: string) {
    const source = sections.find((s) => s.id === sectionId);
    if (!source) return;
    await addSection(source.section_type, { ...source.props });
  }

  /** Media library → canvas / current page (photo collage, video, or audio). */
  async function applyMediaAsset(
    asset: KebuDragAsset,
    drop?: { leftPct: number; topPct: number },
  ) {
    const page = pages.find((p) => p.id === editPageId) ?? pages.find((p) => p.slug === previewPageSlug) ?? pages[0];
    if (!page) {
      setError("No page to add media to.");
      return;
    }
    const plan = planMediaAssetApply(asset, {
      pageId: page.id,
      sections,
      selectedSectionId,
      drop,
    });
    if (plan.action === "collage") {
      updateProps(plan.sectionId, { collagePhotos: plan.photos });
      setSelectedSectionId(plan.sectionId);
      setSidebarTab("content");
      return;
    }
    if (plan.action === "hero") {
      updateProps(plan.sectionId, { heroImage: plan.heroImage });
      setSelectedSectionId(plan.sectionId);
      setSidebarTab("content");
      return;
    }
    if (plan.action === "gallery") {
      updateProps(plan.sectionId, { items: plan.items });
      setSelectedSectionId(plan.sectionId);
      setSidebarTab("content");
      return;
    }
    if (plan.action === "patch-src") {
      updateProps(plan.sectionId, { src: plan.src });
      setSelectedSectionId(plan.sectionId);
      setSidebarTab("content");
      return;
    }
    const created = await addSection(plan.type, plan.props);
    if (created) {
      setSelectedSectionId(created.id);
      setSidebarTab("content");
    }
  }

  async function deleteSection(sectionId: string) {
    const res = await fetch(`/api/projects/${projectId}/sections`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId }),
    });
    if (!res.ok) {
      setError("Could not delete section.");
      return;
    }
    setSections((prev) => {
      pushHistory(prev);
      return prev.filter((s) => s.id !== sectionId);
    });
  }

  async function reorderSections(orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, index) =>
        fetch(`/api/projects/${projectId}/sections`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId: id, sortOrder: index }),
        }),
      ),
    );
    await load();
  }

  async function moveSection(sectionId: string, direction: -1 | 1) {
    const ordered = [...sections]
      .filter((s) => s.page_id === editPageId)
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = ordered.findIndex((s) => s.id === sectionId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
    const a = ordered[idx]!;
    const b = ordered[swapIdx]!;
    await Promise.all([
      fetch(`/api/projects/${projectId}/sections`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: a.id, sortOrder: b.sort_order }),
      }),
      fetch(`/api/projects/${projectId}/sections`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: b.id, sortOrder: a.sort_order }),
      }),
    ]);
    await load();
  }

  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1]!;
      setFuture((f) => [sections, ...f]);
      setSections(prev);
      // Persist each section props best-effort
      prev.forEach((s) => {
        void persistProps(s.id, s.props);
      });
      return h.slice(0, -1);
    });
  }

  function redo() {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0]!;
      setHistory((h) => [...h, sections]);
      setSections(next);
      next.forEach((s) => {
        void persistProps(s.id, s.props);
      });
      return f.slice(1);
    });
  }

  async function payHostingWithJoko(opts?: {
    autopay?: boolean;
    forceRenew?: boolean;
    tier?: string;
  }) {
    if (payingHosting) return;
    setPayingHosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/billing/subscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: opts?.tier ?? checkoutTier ?? "shop",
          plan: "monthly",
          autopay: opts?.autopay ?? true,
          forceRenew: opts?.forceRenew ?? false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/create/${projectId}`);
        return;
      }
      if (data.exempt || data.alreadyActive) {
        await load();
        return;
      }
      if (!res.ok || !data.paymentUrl) {
        setError(typeof data.error === "string" ? data.error : "Could not start JOKO payment.");
        return;
      }
      window.location.href = data.paymentUrl as string;
    } catch {
      setError("Network error while starting JOKO payment.");
    } finally {
      setPayingHosting(false);
    }
  }

  async function persistSiteSettings(nextSubdomain: string, nextSeo: SiteSeo, themePatch?: Partial<ThemeTokens>) {
    setSettingsState("saving");
    setSettingsNote(null);
    try {
      const subdomainValid =
        nextSubdomain.trim().length >= 3 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSubdomain.trim());
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(subdomainValid ? { subdomain: nextSubdomain.trim().toLowerCase() } : {}),
          seo: nextSeo,
          ...(themePatch ? { theme: themePatch } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSettingsState("error");
        setError(typeof data.error === "string" ? data.error : "Could not save site settings.");
        return;
      }
      if (typeof data.httpsUrl === "string" && data.httpsUrl.startsWith("http")) {
        setPublishUrl(data.httpsUrl);
      } else if (data.project?.subdomain) {
        setPublishUrl(`/sites/${data.project.subdomain}`);
      }
      if (data.project?.subdomain) {
        setSubdomainInput(String(data.project.subdomain));
      }
      setSettingsState("saved");
      setSettingsNote(
        typeof data.message === "string" ? data.message : "Site settings saved to Supabase.",
      );
      if (data.project?.theme && typeof data.project.theme === "object") {
        setProject((prev) => (prev ? { ...prev, theme: data.project.theme as ThemeTokens } : prev));
      }
    } catch {
      setSettingsState("error");
      setError("Network error while saving site settings.");
    }
  }

  function queueSiteSettingsSave(patch: { subdomain?: string; seo?: Partial<SiteSeo>; theme?: Partial<ThemeTokens> }) {
    const nextSubdomain = patch.subdomain ?? subdomainInput;
    const nextSeo: SiteSeo = {
      ...seoSettings,
      ...(patch.seo ?? {}),
      commerce: {
        merchantWhatsApp: seoSettings.commerce?.merchantWhatsApp ?? "",
        preferJokoCheckout: seoSettings.commerce?.preferJokoCheckout ?? false,
        ...(patch.seo?.commerce ?? {}),
      },
    };
    if (patch.subdomain !== undefined) setSubdomainInput(patch.subdomain);
    if (patch.seo) setSeoSettings(nextSeo);

    if (patch.theme) {
      setProject((prev) => {
        if (!prev) return prev;
        const base = (prev.theme as ThemeTokens) ?? {
          primary: "#0F0D33",
          accent: "#E9006B",
          background: "#FAFAF8",
          text: "#0F0D33",
          fontDisplay: "Fraunces",
          fontBody: "system-ui",
          spacing: "comfortable" as const,
        };
        const nextTheme = { ...base, ...patch.theme } as ThemeTokens;
        pendingThemeRef.current = nextTheme;
        return { ...prev, theme: nextTheme };
      });
    }

    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => {
      const subdomainValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSubdomain.trim()) && nextSubdomain.trim().length >= 3;
      const themeToSave = pendingThemeRef.current ?? undefined;
      pendingThemeRef.current = null;
      void persistSiteSettings(
        subdomainValid ? nextSubdomain.trim().toLowerCase() : subdomainInput.trim().toLowerCase(),
        nextSeo,
        themeToSave,
      );
    }, 600);
  }

  async function publish() {
    if (publishing) return;
    if (!subdomainInput.trim()) {
      setError("Set your Kebu site address under Domain & SEO before publishing.");
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      await persistSiteSettings(subdomainInput.trim(), seoSettings);
      const res = await fetch(`/api/projects/${projectId}/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain: subdomainInput.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (typeof data.migrationHint === "string" && data.migrationHint.length > 0) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Free hosting needs a database update. Run FIX_free_publish.sql in Supabase, then try Publish again.",
        );
        return;
      }
      if (res.status === 402 && data.billingRequired) {
        setError(
          `Publish needs hosting. Free works on a Kebu subdomain — or pay ${data.monthlyLabel ?? "$5/month"} (Shop) via JOKO.`,
        );
        setBilling((b) => (b ? { ...b, canPublish: false } : b));
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Publish failed.");
        return;
      }
      const liveUrl = data.deployment?.public_path ?? data.liveUrl ?? data.publicPath ?? null;
      setPublishUrl(liveUrl);
      const fullUrl = liveUrl
        ? liveUrl.startsWith("http")
          ? liveUrl
          : `https://${subdomainInput.trim().toLowerCase()}.kebu.africa`
        : `https://${subdomainInput.trim().toLowerCase()}.kebu.africa`;
      setPublishSuccess({ url: fullUrl, title: project?.title ?? "Your site" });
      await load();
    } catch {
      setError("Network error while publishing.");
    } finally {
      setPublishing(false);
    }
  }

  async function previewWithAi() {
    if (improving) return;
    setImproving(true);
    setError(null);
    setImproveNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-improve/preview`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: improveInstruction.trim() || undefined,
          mode: improveMode === "free" ? undefined : improveMode,
          focusPageSlug: previewPageSlug || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/create/${projectId}`);
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not preview AI changes.");
        return;
      }
      if (!data.definition || !Array.isArray(data.intents)) {
        setError("Preview response was incomplete. Retry.");
        return;
      }
      const sectionChanges = Array.isArray(data.sectionChanges)
        ? (data.sectionChanges as AiSectionChange[])
        : [];
      const defaultAccepted = new Set(sectionChanges.map((c) => c.sectionId));
      setAiPreview({
        definition: data.definition as WebsiteDefinition,
        intents: data.intents as string[],
        sectionChanges,
        acceptedSectionIds: defaultAccepted,
        repaired: Boolean(data.repaired),
      });
    } catch {
      setError("Network error while previewing. Retry.");
    } finally {
      setImproving(false);
    }
  }

  async function applyAiPreview() {
    if (improving || !aiPreview) return;
    setImproving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-improve/apply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          definition: aiPreview.definition,
          acceptedSectionIds:
            aiPreview.sectionChanges.length > 0
              ? [...aiPreview.acceptedSectionIds]
              : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/create/${projectId}`);
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not apply AI changes.");
        return;
      }
      setAiPreview(null);
      setImproveNote(
        typeof data.message === "string"
          ? data.message
          : "Draft updated. Publish again to update your live site.",
      );
      setHistory([]);
      setFuture([]);
      await load();
      setSaveState("saved");
    } catch {
      setError("Network error while applying changes. Retry.");
    } finally {
      setImproving(false);
    }
  }

  function discardAiPreview() {
    setAiPreview(null);
    setImproveNote(null);
  }

  async function repairLayout() {
    setRepairing(true);
    setError(null);
    try {
      const path = maylecorRussianLayout
        ? `/api/projects/${projectId}/upgrade-maylecor`
        : `/api/projects/${projectId}/upgrade-kdirection`;
      const upRes = await fetch(path, { method: "POST", credentials: "include" });
      const upData = await upRes.json().catch(() => ({}));
      if (!upRes.ok) {
        setError(typeof upData.error === "string" ? upData.error : "Could not repair this site layout.");
        return;
      }
      await load();
    } catch {
      setError("Network error while repairing layout.");
    } finally {
      setRepairing(false);
    }
  }

  const canvasEditor = {
    selectedSectionId,
    onSelectSection: (id: string) => {
      setSelectedSectionId(id);
      setSidebarTab("content");
      setLeftPanelOpen(true);
      const match = sections.find((s) => s.id === id);
      if (match) setEditPageId(match.page_id);
    },
    onPatchSection: updateProps,
    onNavigatePage: (slug: string) => {
      const match = pages.find((p) => p.slug === slug);
      if (!match) return;
      setPreviewPageSlug(match.slug);
      setEditPageId(match.id);
    },
    onDuplicateSection: (id: string) => {
      if (isChromeSectionId(id)) return;
      void duplicateSection(id);
    },
    onDeleteSection: (id: string) => {
      if (isChromeSectionId(id)) return;
      void deleteSection(id);
    },
    onMoveSection: (id: string, dir: "up" | "down") => {
      if (isChromeSectionId(id)) return;
      void moveSection(id, dir === "up" ? -1 : 1);
    },
    // Add/remove sections only from the left Sections rail — not on the canvas.
    onMoveFreeTextBlock: (sectionId: string, blockId: string, x: number, y: number) => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section || section.section_type !== "free-text") return;
      const blocks = Array.isArray(section.props.blocks) ? [...section.props.blocks] : [];
      const idx = blocks.findIndex((b: { id?: string }) => b.id === blockId);
      if (idx < 0) return;
      blocks[idx] = { ...blocks[idx], x, y };
      updateProps(sectionId, { blocks });
    },
  };

  const previewDefinition: WebsiteDefinition | null = project
    ? buildEditorPreviewDefinition({ ...project, seo: seoSettings }, pages, sections, siteChrome)
    : null;

  const canvasDefinition = (() => {
    if (!aiPreview) return previewDefinition;
    if (aiPreview.sectionChanges.length === 0 || !previewDefinition) {
      return aiPreview.definition;
    }
    return mergePartialAiDefinition(
      previewDefinition,
      aiPreview.definition,
      [...aiPreview.acceptedSectionIds],
    );
  })();

  const previewSiteBase = project?.subdomain ? `/sites/${project.subdomain}` : "";
  const maylecorRussianLayout = projectUsesMaylecorRussianLayout(
    project?.description,
    sections.map((s) => s.section_type),
  );
  const kdirectionLayout = projectUsesKdirectionLayout(
    project?.description,
    sections.map((s) => s.section_type),
  );

  const chromeActive =
    Boolean(siteChrome?.enabled) &&
    !projectUsesEmbeddedNav(sections.map((s) => s.section_type)) &&
    !maylecorRussianLayout &&
    !kdirectionLayout;

  useEffect(() => {
    // Keep Sections panel open by default (Shopify theme editor). Only collapse on tiny screens.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches) {
      setLeftPanelOpen(false);
    } else {
      setLeftPanelOpen(true);
      setSidebarTab("content");
    }
  }, [projectId]);

  function openStudioTab(tab: BuilderStudioTab) {
    if (leftPanelOpen && sidebarTab === tab) {
      setLeftPanelOpen(false);
      return;
    }
    setSidebarTab(tab);
    setLeftPanelOpen(true);
  }

  const editPageSections = sections
    .filter((s) => s.page_id === editPageId)
    .filter((s) => !chromeActive || (s.section_type !== "navigation" && s.section_type !== "footer"))
    .sort((a, b) => a.sort_order - b.sort_order);

  const saveStatusLabel =
    saveState === "saving"
      ? "Saving draft…"
      : saveState === "queued"
        ? "Not saved yet — queued"
        : saveState === "saved"
          ? "Draft saved"
          : saveState === "error"
            ? "Save failed"
            : "";

  const flagshipCanvas = maylecorRussianLayout || kdirectionLayout;
  /** Shopify-feel: desktop preview fills the site pane; phone/tablet keep device frames. */
  const wideCanvas = flagshipCanvas || device === "desktop";

  return (
    <DataModeProvider>
    <div
      className="relative flex h-dvh flex-col overflow-hidden"
      style={{ background: BUILDER.bg, color: BUILDER.ink }}
    >
      {publishSuccess ? (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Site published"
        >
          <div
            className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
            style={{ background: "#fff", border: "2px solid #0A0A0A" }}
          >
            {/* Animated checkmark */}
            <div
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "#00C851" }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#00C851" }}>
              Now live
            </p>
            <h2 className="mt-1 text-xl font-black leading-tight" style={{ fontFamily: "var(--font-fraunces)", color: "#0A0A0A" }}>
              {publishSuccess.title} is live!
            </h2>
            <p className="mt-1 text-[11px]" style={{ color: "#6B7280" }}>
              Your site is live and ready to share.
            </p>
            {/* URL box with copy */}
            <div
              className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: "#F4F4F5", border: "1px solid #E5E5E5" }}
            >
              <a
                href={publishSuccess.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-left text-[11px] font-mono font-semibold"
                style={{ color: "#0A0A0A" }}
              >
                {publishSuccess.url.replace(/^https?:\/\//, "")}
              </a>
              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(publishSuccess.url); } catch { /* noop */ }
                }}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white"
                style={{ background: "#0A0A0A" }}
              >
                Copy
              </button>
            </div>
            {/* Actions */}
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Mon site est en ligne — visitez-le ici : ${publishSuccess.url}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-full py-2.5 text-[12px] font-bold text-white"
                style={{ background: "#25D366" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
                Partager sur WhatsApp
              </a>
              <button
                type="button"
                onClick={() => setPublishSuccess(null)}
                className="rounded-full py-2.5 text-[12px] font-semibold"
                style={{ border: "1px solid #E5E5E5", color: "#6B7280" }}
              >
                Continuer à éditer
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <BuilderStudioChrome
        projectId={projectId}
        title={project?.title ?? "Editor"}
        saveLabel={saveStatusLabel}
        draftLabel={
          publishState?.hasUnpublishedChanges
            ? publishState.isLive
              ? "Unpublished"
              : "Draft"
            : publishState?.isLive
              ? "Live"
              : undefined
        }
        device={device}
        onDevice={setDevice}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={undo}
        onRedo={redo}
        publishing={publishing || improving}
        publishLabel={publishState?.hasUnpublishedChanges ? "Publish" : "Publish"}
        onPublish={() => void publish()}
        onSaveDraft={() => {
          if (saveState === "idle" || saveState === "saved") {
            setSaveState("saved");
          }
        }}
        savingDraft={saveState === "saving"}
        previewHost={project?.subdomain ? `${project.subdomain}.kebu.africa` : undefined}
        pages={pages
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
        activePageId={editPageId}
        onPageChange={(pageId) => {
          setEditPageId(pageId);
          const match = pages.find((p) => p.id === pageId);
          if (match) setPreviewPageSlug(match.slug);
        }}
      />

      {billing && !billing.billingExempt && !billing.canPublish && !flagshipCanvas ? (
        <div
          className="border-b px-4 py-2.5 text-center text-xs leading-relaxed"
          style={{ background: "#FFF4EC", borderColor: "#F0D9C8", color: "#9A3412" }}
        >
          This site needs an active plan to publish.{" "}
          <strong>Kebu Shop ({billing.label})</strong> is the plan we recommend.{" "}
          {billing.plans && billing.plans.filter((p) => p.monthlyUsd > 0).length > 0 ? (
            <>
              <label className="sr-only" htmlFor="checkout-tier">
                Plan
              </label>
              <select
                id="checkout-tier"
                className="mx-1 rounded border px-1 py-0.5 text-[11px] font-semibold"
                value={checkoutTier}
                onChange={(e) => setCheckoutTier(e.target.value)}
              >
                {billing.plans
                  .filter((p) => p.monthlyUsd > 0)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.monthlyUsd}/mo
                    </option>
                  ))}
              </select>{" "}
            </>
          ) : null}
          <button
            type="button"
            className="font-bold underline"
            onClick={() => void payHostingWithJoko({ autopay: true })}
            disabled={payingHosting}
          >
            Pay with JOKO
          </button>
          {" · "}
          <Link href="/account" className="font-bold underline">
            Manage billing
          </Link>
        </div>
      ) : null}

      {billing &&
      !billing.billingExempt &&
      billing.canPublish &&
      billing.tier === "free" &&
      !flagshipCanvas ? (
        <div
          className="border-b px-4 py-2 text-center text-[11px] leading-relaxed"
          style={{ background: "#F8FAFC", borderColor: "#E2E8F0", color: "#334155" }}
        >
          You&apos;re on <strong>Kebu Free</strong> — publish on a Kebu subdomain. Upgrade to{" "}
          <strong>Shop ($5/mo)</strong> for store + custom domain.{" "}
          <button
            type="button"
            className="font-bold underline"
            onClick={() => void payHostingWithJoko({ autopay: true, tier: "shop", forceRenew: true })}
            disabled={payingHosting}
          >
            Upgrade with JOKO
          </button>
          {" · "}
          <Link href="/pricing" className="font-bold underline">
            All plans
          </Link>
        </div>
      ) : null}

      {billing?.billingExempt && !flagshipCanvas ? (
        <div
          className="border-b px-4 py-2 text-center text-[11px]"
          style={{ background: "#F0FDF4", color: "#166534" }}
        >
          Your account does not pay for hosting — publish anytime.
        </div>
      ) : null}

      {supportAssist ? (
        <div
          className="border-b px-4 py-2.5 text-center text-xs font-semibold"
          style={{ background: "#FF5500", color: "#fff" }}
        >
          Support assist mode — you are helping edit someone else's site. Changes are audited.
        </div>
      ) : null}

      {error ? (
        <div
          className="border-b px-4 py-2.5 text-center text-xs"
          style={{ background: "#FFF1F0", color: "#8B1E1E" }}
          role="alert"
        >
          {error}{" "}
          {!subdomainInput.trim() ? (
            <Link href={mySiteDetailHref(projectId)} className="font-bold underline">
              Open Domain &amp; SEO
            </Link>
          ) : null}
        </div>
      ) : null}

      {createNote && !maylecorRussianLayout ? (
        <div
          className="border-b px-4 py-2 text-center text-[11px] font-medium"
          style={{ background: "#F0FDF4", color: "#166534" }}
          role="status"
        >
          {createNote}
        </div>
      ) : null}

      {improveNote && !maylecorRussianLayout ? (
        <div
          className="border-b px-4 py-2 text-center text-[11px] font-medium"
          style={{ background: "#FFF4EC", color: "#C2410C" }}
          role="status"
        >
          {improveNote}
        </div>
      ) : null}

      {aiPreview && !maylecorRussianLayout ? (
        <div
          className="border-b px-4 py-2 text-center text-[11px] font-medium"
          style={{ background: "#EFF6FF", color: "#1D4ED8" }}
          role="status"
        >
          Previewing Yande&apos;s proposal — apply to save your draft or discard to revert the canvas.
        </div>
      ) : null}

      {publishState?.hasUnpublishedChanges && !maylecorRussianLayout ? (
        <div
          className="border-b px-4 py-2.5 text-center text-xs leading-relaxed"
          style={{ background: "#FFF8E8", borderColor: "#F0E4C8", color: "#6B5B45" }}
        >
          <strong style={{ color: "#0F0D33" }}>You are editing a draft.</strong> Changes save automatically but{" "}
          <strong>visitors only see your last published version</strong> until you click{" "}
          <strong>Publish</strong> (top right).
          {publishState.isLive && (publishState.livePublicPath || publishUrl) ? (
            <>
              {" "}
              Live site:{" "}
              <a
                href={
                  publishState.livePublicPath?.startsWith("http")
                    ? publishState.livePublicPath
                    : `${appOrigin}${publishState.livePublicPath || publishUrl || ""}`
                }
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold"
              >
                {publishState.livePublicPath || publishUrl}
              </a>
            </>
          ) : null}
        </div>
      ) : publishState?.isLive && !maylecorRussianLayout ? (
        <div
          className="border-b px-4 py-2 text-center text-[11px]"
          style={{ background: "#E8F8EE", borderColor: "#C8E8D4", color: "#1B6B3A" }}
        >
          Live and up to date. Edit anytime — publish again from the top right when you want changes public.
          {publishUrl ? (
            <>
              {" "}
              <a
                href={publishUrl.startsWith("http") ? publishUrl : `${appOrigin}${publishUrl}`}
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold"
              >
                Open live site
              </a>
            </>
          ) : null}
        </div>
      ) : null}

      {!loading && project && !project.business_id && !maylecorRussianLayout ? (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <BuilderBusinessNudge compact />
        </div>
      ) : null}

      <main className="relative flex min-h-0 flex-1 w-full overflow-hidden">
        {loading ? (
          <p className="text-sm p-6" style={{ color: BUILDER.muted }}>
            Loading…
          </p>
        ) : error && !project ? (
          <div role="alert" className="rounded-xl p-4 m-6" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
            {error}
            <button type="button" className="underline ml-2" onClick={() => void load()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <BuilderStudioRail
              railTab={sidebarTab}
              panelOpen={leftPanelOpen}
              onRail={openStudioTab}
              extras={
                <>
                  <Link
                    href={mySiteDetailHref(projectId)}
                    title="Domain & SEO"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[9px] font-bold uppercase leading-none"
                    style={{ color: BUILDER.muted }}
                  >
                    SEO
                  </Link>
                  {maylecorRussianLayout || kdirectionLayout ? (
                    <button
                      type="button"
                      title="Repair layout"
                      onClick={() => void repairLayout()}
                      disabled={repairing || loading}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-[9px] font-bold uppercase disabled:opacity-40"
                      style={{ color: BUILDER.muted }}
                    >
                      Fix
                    </button>
                  ) : null}
                </>
              }
            />

            {/* Mobile backdrop — tap outside panel to close */}
            {leftPanelOpen && (
              <div
                className="md:hidden absolute inset-0 z-20 bg-black/40"
                onClick={() => setLeftPanelOpen(false)}
                aria-hidden
              />
            )}

            <aside
              className={`${
                leftPanelOpen
                  ? "absolute md:relative inset-y-0 left-11 md:left-auto w-[280px] md:w-[260px] z-30 md:z-auto shadow-2xl md:shadow-none"
                  : "hidden"
              } shrink-0 overflow-y-auto border-r`}
              style={{ borderColor: "#E5E5E5", background: "#FAFAFA" }}
            >
              {/* Mobile close button */}
              <div className="md:hidden flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#E5E5E5" }}>
                <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BUILDER.muted }}>
                  {sidebarTab === "content" ? "Sections" : sidebarTab === "pages" ? "Pages" : sidebarTab === "aesthetic" ? "Style" : sidebarTab === "media" ? "Photos" : sidebarTab === "nav" ? "Navigation" : sidebarTab === "shop" ? "Shop" : "Yande"}
                </p>
                <button
                  type="button"
                  onClick={() => setLeftPanelOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ background: "#F0F0F0", color: BUILDER.ink }}
                  aria-label="Close panel"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {sidebarTab === "pages" && project ? (
                <div className="px-4 py-4">
                <BuilderPagesPanel
                  projectId={projectId}
                  pages={pages}
                  editPageId={editPageId}
                  previewPageSlug={previewPageSlug}
                  onSelectPage={(p) => {
                    setEditPageId(p.id);
                    setPreviewPageSlug(p.slug);
                  }}
                  onRefresh={load}
                  onError={setError}
                />
                </div>
              ) : null}

              {sidebarTab === "media" && (
                <div className="px-4 py-4">
                  <SiteAssetsPanel
                    projectId={projectId}
                    onUseOnSite={(asset) => void applyMediaAsset(asset)}
                  />
                </div>
              )}

              {sidebarTab === "shop" && (
                <div className="px-4 py-5 space-y-4">
                  <div>
                    <p className="text-[13px] font-semibold mb-1" style={{ color: BUILDER.ink }}>Shop</p>
                    <p className="text-[12px] leading-relaxed" style={{ color: BUILDER.muted }}>
                      Products, orders, and payments live in Kebu Shop — keep the canvas free for the site.
                    </p>
                  </div>
                  <Link
                    href={`/shop/${projectId}`}
                    className="inline-flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-[12px] font-semibold"
                    style={{ background: BUILDER.ink, color: "#fff" }}
                  >
                    Open Shop
                  </Link>
                </div>
              )}

              {sidebarTab === "nav" && (
                <div className="px-4 py-4 space-y-4">
                  {chromeActive && siteChrome ? (
                    <BuilderSiteChromePanel
                      part="header"
                      chrome={siteChrome}
                      selected={selectedSectionId === CHROME_HEADER_ID}
                      onSelect={() => setSelectedSectionId(CHROME_HEADER_ID)}
                      onPatch={(patch) => updateChromeProps("header", patch)}
                    />
                  ) : (
                    (() => {
                      const hero = sections.find(
                        (s) =>
                          s.page_id === editPageId &&
                          (s.section_type === "legally-blonde-hero" ||
                            s.section_type === "navigation" ||
                            s.section_type === "kdirection-page"),
                      );
                      if (!hero) {
                        return (
                          <p className="text-[11px]" style={{ color: BUILDER.muted }}>
                            Select a page with a header to edit navigation.
                          </p>
                        );
                      }
                      const links = Array.isArray(hero.props.navLinks)
                        ? (hero.props.navLinks as Parameters<typeof mapNavLinksForEditor>[0])
                        : Array.isArray(hero.props.links)
                          ? (hero.props.links as Parameters<typeof mapNavLinksForEditor>[0])
                          : [];
                      return (
                        <NavLinksEditor
                          projectId={projectId}
                          links={mapNavLinksForEditor(links)}
                          onChange={(navLinks) => {
                            if (hero.section_type === "navigation") {
                              updateProps(hero.id, { links: navLinks });
                            } else {
                              updateProps(hero.id, { navLinks });
                            }
                          }}
                        />
                      );
                    })()
                  )}
                </div>
              )}

              {sidebarTab === "aesthetic" && (
                <div className="px-4 py-4">
                  {(() => {
                    const heroTypes = new Set([
                      "legally-blonde-hero",
                      "hero",
                      "kdirection-home",
                      "maylecor-home",
                    ]);
                    const hero =
                      editPageSections.find((s) => heroTypes.has(s.section_type)) ??
                      sections.find((s) => heroTypes.has(s.section_type));
                    const pop = sections.find((s) => s.section_type === "email-popup");
                    const heroBg = (() => {
                      if (!hero) return "";
                      if (hero.section_type === "legally-blonde-hero") {
                        if (hero.props.backgroundHidden === true) return "";
                        return String(hero.props.backgroundLayer ?? "");
                      }
                      return String(hero.props.backgroundImage ?? hero.props.background ?? "");
                    })();
                    const brandLogo = (() => {
                      if (hero && typeof hero.props.chromeLogo === "string") {
                        return String(hero.props.chromeLogo);
                      }
                      return String((seoSettings as { logoUrl?: string }).logoUrl ?? "");
                    })();
                    return (
                      <BuilderAestheticsPanel
                        theme={
                          (project?.theme as ThemeTokens) ??
                          previewDefinition?.theme ?? {
                            primary: "#0F0D33",
                            accent: "#E9006B",
                            background: "#FAFAF8",
                            text: "#0F0D33",
                            fontDisplay: "Fraunces",
                            fontBody: "system-ui",
                            spacing: "comfortable",
                          }
                        }
                        onThemeChange={(patch) => queueSiteSettingsSave({ theme: patch })}
                        extras={{
                          projectId,
                          heroAccent:
                            hero?.section_type === "legally-blonde-hero"
                              ? String(hero.props.accentColor ?? "#E9006B")
                              : String(hero?.props.accentColor ?? (project?.theme as ThemeTokens)?.accent ?? "#E9006B"),
                          heroBackground: heroBg,
                          brandLogo,
                          onHeroAccentChange: hero
                            ? (color) => updateProps(hero.id, { accentColor: color })
                            : undefined,
                          onHeroBackgroundChange: hero
                            ? (url) => {
                                if (hero.section_type === "legally-blonde-hero") {
                                  if (!url.trim()) {
                                    const hl = Array.isArray(hero.props.hiddenLayers)
                                      ? [...(hero.props.hiddenLayers as string[])]
                                      : [];
                                    if (!hl.includes("backgroundLayer")) hl.push("backgroundLayer");
                                    updateProps(hero.id, {
                                      backgroundLayer: "",
                                      backgroundHidden: true,
                                      hiddenLayers: hl,
                                    });
                                    return;
                                  }
                                  const hl = Array.isArray(hero.props.hiddenLayers)
                                    ? (hero.props.hiddenLayers as string[]).filter((x) => x !== "backgroundLayer")
                                    : [];
                                  updateProps(hero.id, {
                                    backgroundLayer: url,
                                    backgroundHidden: false,
                                    hiddenLayers: hl,
                                  });
                                  return;
                                }
                                if (hero.section_type === "hero") {
                                  updateProps(hero.id, { background: url.startsWith("#") ? url : hero.props.background, backgroundImage: url });
                                  return;
                                }
                                updateProps(hero.id, { backgroundImage: url });
                              }
                            : undefined,
                          onBrandLogoChange: (url) => {
                            if (hero && ("chromeLogo" in hero.props || hero.section_type === "legally-blonde-hero")) {
                              updateProps(hero.id, { chromeLogo: url, showChromeLogo: Boolean(url.trim()) });
                              return;
                            }
                            if (hero) {
                              updateProps(hero.id, { chromeLogo: url });
                            }
                          },
                          onUsePhotoOnSite: (url) => {
                            void applyMediaAsset({ url, kind: "image" });
                          },
                          popupSection: pop ? { id: pop.id, props: pop.props } : null,
                          onEnsurePopup: async () => {
                            await addSection("email-popup");
                            setSidebarTab("aesthetic");
                            setLeftPanelOpen(true);
                          },
                          onPatchPopup: (patch) => {
                            const current = sections.find((s) => s.section_type === "email-popup");
                            if (current) updateProps(current.id, patch);
                          },
                          faviconUrl: seoSettings.faviconUrl,
                          metaTitle: seoSettings.metaTitle,
                          metaDescription: seoSettings.metaDescription,
                          onSeoChange: (patch) => queueSiteSettingsSave({ seo: patch }),
                        }}
                      />
                    );
                  })()}
                </div>
              )}

              {sidebarTab === "yande" && (
                <div className="px-4 py-4 space-y-4">
                <YandeAssistant
                  variant="improve"
                  value={improveInstruction}
                  onChange={setImproveInstruction}
                  onSubmit={() => void (aiPreview ? applyAiPreview() : previewWithAi())}
                  busy={improving}
                  submitLabel={aiPreview ? "Apply changes" : "Preview changes"}
                />
                {aiPreview ? (
                  <BuilderAiPreviewPanel
                    intents={aiPreview.intents}
                    sectionChanges={aiPreview.sectionChanges}
                    acceptedSectionIds={aiPreview.acceptedSectionIds}
                    busy={improving}
                    onToggleSection={(sectionId) => {
                      setAiPreview((prev) => {
                        if (!prev) return prev;
                        const next = new Set(prev.acceptedSectionIds);
                        if (next.has(sectionId)) next.delete(sectionId);
                        else next.add(sectionId);
                        return { ...prev, acceptedSectionIds: next };
                      });
                    }}
                    onSelectAll={() => {
                      setAiPreview((prev) =>
                        prev
                          ? {
                              ...prev,
                              acceptedSectionIds: new Set(prev.sectionChanges.map((c) => c.sectionId)),
                            }
                          : prev,
                      );
                    }}
                    onClearAll={() => {
                      setAiPreview((prev) => (prev ? { ...prev, acceptedSectionIds: new Set() } : prev));
                    }}
                    onApply={() => void applyAiPreview()}
                    onDiscard={discardAiPreview}
                  />
                ) : null}
                </div>
              )}

              {sidebarTab === "content" && (
              <>
              {/* Shopify-style drill-down breadcrumb: shown when a section is selected */}
              {selectedSectionId ? (
                <div
                  className="sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-3"
                  style={{ background: BUILDER.surface, borderColor: BUILDER.border }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedSectionId(null)}
                    className="flex shrink-0 items-center gap-1 text-[12px] font-medium"
                    style={{ color: BUILDER.muted }}
                    aria-label="Back to sections list"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Sections
                  </button>
                  <span aria-hidden style={{ color: BUILDER.border, fontSize: 14 }}>›</span>
                  <p className="min-w-0 truncate text-[13px] font-semibold" style={{ color: BUILDER.ink }}>
                    {selectedSectionId === CHROME_HEADER_ID
                      ? "Site header"
                      : selectedSectionId === CHROME_FOOTER_ID
                        ? "Site footer"
                        : labelForSectionType(
                            sections.find((s) => s.id === selectedSectionId)?.section_type ?? "section",
                          )}
                  </p>
                </div>
              ) : (
                /* Header shown when no section is selected */
                <div className="border-b px-4 py-4" style={{ borderColor: BUILDER.border }}>
                  <p className="text-[14px] font-semibold" style={{ color: BUILDER.ink }}>Sections</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: BUILDER.muted }}>
                    Header · Template · Footer
                  </p>
                </div>
              )}
              {!selectedSectionId && pages.length > 1 && (
                <div className="px-4 py-2.5 border-b" style={{ borderColor: BUILDER.border }}>
                  <label className="block text-[10px] uppercase tracking-wider" style={{ color: BUILDER.muted }}>
                    Editing page
                    <select
                      value={editPageId}
                      onChange={(e) => {
                        setEditPageId(e.target.value);
                        const match = pages.find((p) => p.id === e.target.value);
                        if (match) setPreviewPageSlug(match.slug);
                      }}
                      className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
                      style={{ border: `1px solid ${BUILDER.border}`, background: "#fff" }}
                    >
                      {pages
                        .slice()
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              )}

              {!selectedSectionId && <BuilderBlogPanel projectId={projectId} />}

              {!selectedSectionId && (
              <div className="px-2 py-1 space-y-1" style={{ background: "#ffffff" }}>

                {chromeActive && siteChrome ? (
                  <>
                    <BuilderSectionZone zone="top">
                      <BuilderSiteChromePanel
                        part="header"
                        chrome={siteChrome}
                        selected={selectedSectionId === CHROME_HEADER_ID}
                        onSelect={() => setSelectedSectionId(CHROME_HEADER_ID)}
                        onPatch={(patch) => updateChromeProps("header", patch)}
                      />
                    </BuilderSectionZone>
                    <BuilderSectionZone
                      zone="middle"
                      count={editPageSections.length}
                      footer={
                        <AddSectionPicker
                          pageTitle={pages.find((p) => p.id === editPageId)?.title ?? "Page"}
                          onAdd={async (type) => { await addSection(type); }}
                        />
                      }
                    >
                      <BuilderSectionListDnd
                        sections={editPageSections.map((s) => ({
                          id: s.id,
                          section_type: s.section_type,
                          sort_order: s.sort_order,
                          hidden: Boolean(s.props.hidden),
                          props: s.props as Record<string, unknown>,
                        }))}
                        selectedSectionId={selectedSectionId}
                        onSelect={(id) => setSelectedSectionId(id)}
                        onReorder={(ids) => void reorderSections(ids)}
                        onMoveUp={(id) => void moveSection(id, -1)}
                        onMoveDown={(id) => void moveSection(id, 1)}
                        onRemove={(id) => void deleteSection(id)}
                        onToggleHidden={(id) => {
                          const s = sections.find((x) => x.id === id);
                          if (s) updateProps(id, { hidden: !Boolean(s.props.hidden) });
                        }}
                      />
                    </BuilderSectionZone>
                    <BuilderSectionZone zone="lower">
                      <BuilderSiteChromePanel
                        part="footer"
                        chrome={siteChrome}
                        selected={selectedSectionId === CHROME_FOOTER_ID}
                        onSelect={() => setSelectedSectionId(CHROME_FOOTER_ID)}
                        onPatch={(patch) => updateChromeProps("footer", patch)}
                      />
                    </BuilderSectionZone>
                  </>
                ) : (
                  <BuilderSectionZone
                    zone="middle"
                    count={editPageSections.length}
                    emptyHint="This design embeds its own header/footer in the page. Edit words on the canvas or in the selected section below."
                    footer={
                      <AddSectionPicker
                        pageTitle={pages.find((p) => p.id === editPageId)?.title ?? "Page"}
                        onAdd={async (type) => { await addSection(type); }}
                      />
                    }
                  >
                    <BuilderSectionListDnd
                      sections={editPageSections.map((s) => ({
                        id: s.id,
                        section_type: s.section_type,
                        sort_order: s.sort_order,
                        hidden: Boolean(s.props.hidden),
                        props: s.props as Record<string, unknown>,
                      }))}
                      selectedSectionId={selectedSectionId}
                      onSelect={(id) => setSelectedSectionId(id)}
                      onReorder={(ids) => void reorderSections(ids)}
                      onMoveUp={(id) => void moveSection(id, -1)}
                      onMoveDown={(id) => void moveSection(id, 1)}
                      onRemove={(id) => void deleteSection(id)}
                      onToggleHidden={(id) => {
                        const s = sections.find((x) => x.id === id);
                        if (s) updateProps(id, { hidden: !Boolean(s.props.hidden) });
                      }}
                    />
                  </BuilderSectionZone>
                )}
              </div>
              )}

              {/* Shopify drill-down: section props for the selected section only */}
              {selectedSectionId && editPageSections.filter((s) => s.id === selectedSectionId).map((section) => (
                    <div
                      key={section.id}
                      className="px-4 py-4 space-y-4"
                    >
                      {/* Section actions */}
                      <div className="flex flex-wrap gap-1.5 pb-3 border-b" style={{ borderColor: BUILDER.border }}>
                          <button type="button" className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium" style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink }} onClick={() => void moveSection(section.id, -1)}>
                            ↑ Move up
                          </button>
                          <button type="button" className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium" style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink }} onClick={() => void moveSection(section.id, 1)}>
                            ↓ Move down
                          </button>
                          <button
                            type="button"
                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
                            style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink }}
                            onClick={() => void duplicateSection(section.id)}
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
                            style={{ border: "1px solid #FECACA", color: "#B91C1C" }}
                            onClick={() => {
                              if (window.confirm(`Remove "${labelForSectionType(section.section_type)}" from this page?`)) {
                                void deleteSection(section.id);
                              }
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      {section.section_type === "maylecor-home" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>
                            Words
                          </p>
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.artistName ?? "")}
                            onChange={(e) => updateProps(section.id, { artistName: e.target.value })}
                            aria-label="Artist name"
                            placeholder="MAY LECOR"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.ctaLabel ?? "")}
                            onChange={(e) => updateProps(section.id, { ctaLabel: e.target.value })}
                            aria-label="CTA label"
                          />
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: "#FF5500" }}>
                            Photos — tap upload
                          </p>
                          {(
                            [
                              ["backgroundImage", "Background"],
                              ["portraitMain", "Main portrait"],
                              ["collageTop", "Collage top"],
                              ["collageMiddle", "Collage middle"],
                              ["logoBanner", "Logo banner"],
                              ["bottomLeft", "Bottom left photo"],
                              ["bottomRight", "Bottom right photo"],
                              ["logoSmall", "Small logo"],
                            ] as const
                          ).map(([key, label]) => (
                            <SectionPhotoField
                              key={key}
                              projectId={projectId}
                              label={label}
                              value={String(section.props[key] ?? "")}
                              onChange={(url) => updateProps(section.id, { [key]: url })}
                            />
                          ))}
                          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={section.props.motionEnabled !== false}
                              onChange={(e) => updateProps(section.id, { motionEnabled: e.target.checked })}
                            />
                            Floating motion (cutouts + parallax)
                          </label>
                          <SocialLinksEditor
                            projectId={projectId}
                            links={((section.props.socialLinks as { label?: string; href?: string; iconUrl?: string }[]) ?? []).map(
                              (l) => ({
                                label: String(l.label ?? ""),
                                href: String(l.href ?? ""),
                                iconUrl: String(l.iconUrl ?? ""),
                              }),
                            )}
                            onChange={(socialLinks) => updateProps(section.id, { socialLinks })}
                            rail={{
                              visible: section.props.socialRailVisible !== false,
                              bgColor: String(section.props.socialRailBg ?? "rgba(0,0,0,0.85)"),
                              leftPct: Number(section.props.socialRailLeftPct ?? 0),
                              topPct: Number(section.props.socialRailTopPct ?? 12),
                              iconSize: Number(section.props.socialRailIconSize ?? 40),
                            }}
                            onRailChange={(patch) => updateProps(section.id, patch)}
                          />
                        </div>
                      )}
                      {section.section_type === "legally-blonde-hero" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>
                            May Lecor hero
                          </p>
                          <button
                            type="button"
                            className="w-full rounded-lg px-2 py-1.5 text-[11px] font-semibold"
                            style={{ border: "1px solid #FF5500", color: "#FF5500" }}
                            onClick={() =>
                              updateProps(section.id, {
                                ...defaultMaylecorKsendrProps(
                                  String(section.props.title ?? section.props.brandLabel ?? "MAY LECOR"),
                                ),
                              })
                            }
                          >
                            Restore May circle + cutouts
                          </button>
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.title ?? "")}
                            onChange={(e) =>
                              updateProps(section.id, { title: e.target.value, brandLabel: e.target.value })
                            }
                            aria-label="Title"
                            placeholder="Artist or brand name"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            rows={3}
                            value={String(section.props.subtitle ?? "")}
                            onChange={(e) => updateProps(section.id, { subtitle: e.target.value })}
                            aria-label="Subtitle"
                            placeholder="Short bio or tagline"
                          />
                          <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
                            Center mark uses the May Lècor circle seal (not Russian text). Swap cutouts in Media or on the canvas.
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ color: "#FF5500" }}>
                            Top bar logo (clicks → home)
                          </p>
                          <label className="flex items-center gap-2 text-[11px] font-semibold">
                            <input
                              type="checkbox"
                              checked={section.props.showChromeLogo !== false}
                              onChange={(e) => updateProps(section.id, { showChromeLogo: e.target.checked })}
                            />
                            Show small May logo in the upper bar
                          </label>
                          {section.props.showChromeLogo !== false ? (
                            <SectionPhotoField
                              projectId={projectId}
                              label="Upper logo (optional — leave default or upload)"
                              value={String(section.props.chromeLogo ?? "")}
                              onChange={(url) => updateProps(section.id, { chromeLogo: url })}
                            />
                          ) : null}
                          <label className="block text-[10px] uppercase tracking-wider">
                            Nav look
                            <select
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.navDisplay ?? "text")}
                              onChange={(e) =>
                                updateProps(section.id, {
                                  navDisplay: e.target.value as "text" | "icons" | "photos",
                                })
                              }
                            >
                              <option value="text">Words</option>
                              <option value="icons">Built-in icons</option>
                              <option value="photos">Photos / custom icons</option>
                            </select>
                          </label>
                          <NavLinksEditor
                            projectId={projectId}
                            allowIcons
                            links={mapNavLinksForEditor(
                              (section.props.navLinks as Parameters<typeof mapNavLinksForEditor>[0]) ?? [],
                            )}
                            onChange={(navLinks) => updateProps(section.id, { navLinks })}
                          />
                          <NavSizeEditor
                            scale={clampNavScale(section.props.navScale, 1)}
                            size={parseNavSize(section.props.navSize)}
                            layout={parseNavLayout(section.props.navLayout)}
                            onChange={(patch) => updateProps(section.id, patch)}
                          />
                          <label className="block text-[10px] uppercase tracking-wider">
                            Display font (Steelfish recommended)
                            <select
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.displayFont ?? "Steelfish")}
                              onChange={(e) => updateProps(section.id, { displayFont: e.target.value })}
                            >
                              {(
                                [
                                  "Steelfish",
                                  "Oswald",
                                  "Bebas Neue",
                                  "Playfair Display",
                                  "Fraunces",
                                  "Syne",
                                  "Georgia",
                                  "system-ui",
                                ] as const
                              ).map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </label>
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: "#FF5500" }}>
                            May Lecor layers — drag on canvas or upload here
                          </p>
                          <p className="text-[10px] leading-relaxed" style={{ color: "#6B5B45" }}>
                            Remove background = solid accent color. Replace cutouts on the canvas or upload below.
                          </p>
                          <div className="space-y-2 rounded-lg p-2" style={{ border: "1px solid #EEE" }}>
                            <SectionPhotoField
                              projectId={projectId}
                              label="Background"
                              value={
                                section.props.backgroundHidden === true
                                  ? ""
                                  : String(section.props.backgroundLayer ?? "")
                              }
                              onChange={(url) => {
                                if (!url.trim()) {
                                  const hl = Array.isArray(section.props.hiddenLayers)
                                    ? [...(section.props.hiddenLayers as string[])]
                                    : [];
                                  if (!hl.includes("backgroundLayer")) hl.push("backgroundLayer");
                                  updateProps(section.id, {
                                    backgroundLayer: "",
                                    backgroundHidden: true,
                                    hiddenLayers: hl,
                                  });
                                  return;
                                }
                                const hl = Array.isArray(section.props.hiddenLayers)
                                  ? (section.props.hiddenLayers as string[]).filter((x) => x !== "backgroundLayer")
                                  : [];
                                updateProps(section.id, {
                                  backgroundLayer: url,
                                  backgroundHidden: false,
                                  hiddenLayers: hl,
                                });
                              }}
                            />
                            <button
                              type="button"
                              className="w-full rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                              style={{ border: "1px solid #DDE0F0", color: BUILDER.ink }}
                              onClick={() => {
                                const hl = Array.isArray(section.props.hiddenLayers)
                                  ? [...(section.props.hiddenLayers as string[])]
                                  : [];
                                if (!hl.includes("backgroundLayer")) hl.push("backgroundLayer");
                                updateProps(section.id, {
                                  backgroundLayer: "",
                                  backgroundHidden: true,
                                  hiddenLayers: hl,
                                });
                              }}
                            >
                              Remove background
                            </button>
                          </div>
                          {(
                            [
                              ["titleLogo", "Circle seal / logo"],
                              ["cutoutLeft", "Cutout left (transparent PNG)"],
                              ["cutoutRight", "Cutout right (transparent PNG)"],
                              ["cutoutAccent", "Center cutout portrait"],
                              ["cutoutSparkle", "Sparkle / small accent"],
                              ["macbook", "Laptop / album mockup"],
                              ["heroPhoto", "Story photo"],
                            ] as const
                          ).map(([key, label]) => (
                            <SectionPhotoField
                              key={key}
                              projectId={projectId}
                              label={label}
                              value={String(section.props[key] ?? "")}
                              onChange={(url) => updateProps(section.id, { [key]: url })}
                            />
                          ))}
                          <button
                            type="button"
                            className="w-full rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
                            style={{ background: "#0F0D33" }}
                            onClick={() => {
                              const existing = (section.props.extraCutouts as Record<string, unknown>[]) ?? [];
                              updateProps(section.id, {
                                extraCutouts: [
                                  ...existing,
                                  {
                                    id: `cut-${Date.now()}`,
                                    src: String(section.props.cutoutAccent ?? section.props.cutoutLeft ?? ""),
                                    alt: "My cutout",
                                    topPct: 28,
                                    leftPct: 35,
                                    widthPct: 14,
                                    rotate: -6,
                                    zIndex: 14,
                                  },
                                ],
                              });
                            }}
                          >
                            + Add my cutout (drag on preview)
                          </button>
                          {((section.props.extraCutouts as { id?: string; src?: string }[]) ?? []).map((cut, idx) => (
                            <div key={cut.id ?? idx} className="space-y-1 rounded-lg p-2" style={{ border: "1px solid #EEE" }}>
                              <SectionPhotoField
                                projectId={projectId}
                                label={`Extra cutout ${idx + 1}`}
                                value={String(cut.src ?? "")}
                                onChange={(url) => {
                                  const next = [...((section.props.extraCutouts as typeof cut[]) ?? [])];
                                  next[idx] = { ...next[idx]!, src: url };
                                  updateProps(section.id, { extraCutouts: next });
                                }}
                              />
                              <input
                                className="w-full text-xs rounded px-2 py-1"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={String((cut as { href?: string }).href ?? "")}
                                placeholder="Link when photo is clicked (https://… or /page)"
                                onChange={(e) => {
                                  const next = [...((section.props.extraCutouts as typeof cut[]) ?? [])];
                                  next[idx] = { ...next[idx]!, href: e.target.value } as typeof cut;
                                  updateProps(section.id, { extraCutouts: next });
                                }}
                              />
                              <button
                                type="button"
                                className="text-[10px] font-bold uppercase text-red-600"
                                onClick={() => {
                                  const next = ((section.props.extraCutouts as typeof cut[]) ?? []).filter(
                                    (_, i) => i !== idx,
                                  );
                                  updateProps(section.id, { extraCutouts: next });
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                          <label className="block text-[10px] uppercase tracking-wider">
                            Accent color
                            <input
                              className="mt-1 w-full text-xs rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.accentColor ?? "#FF1493")}
                              onChange={(e) => updateProps(section.id, { accentColor: e.target.value })}
                            />
                          </label>
                          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={section.props.motionEnabled !== false}
                              onChange={(e) => updateProps(section.id, { motionEnabled: e.target.checked })}
                            />
                            Floating cutout animation
                          </label>
                          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={section.props.scrollMode !== "parallax"}
                              onChange={(e) =>
                                updateProps(section.id, { scrollMode: e.target.checked ? "viewport" : "parallax" })
                              }
                            />
                            One-screen home (off = full scroll scene)
                          </label>
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: "#FF5500" }}>
                            Music / social links
                          </p>
                          <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
                            Add, remove, reorder, and set links only here. On the canvas you can drag the rail — not edit icons.
                          </p>
                          <SocialLinksEditor
                            projectId={projectId}
                            links={((section.props.socialLinks as { label?: string; href?: string; iconUrl?: string }[]) ?? []).map(
                              (l) => ({
                                label: String(l.label ?? ""),
                                href: String(l.href ?? ""),
                                iconUrl: String(l.iconUrl ?? ""),
                              }),
                            )}
                            onChange={(socialLinks) => updateProps(section.id, { socialLinks })}
                            rail={{
                              visible: section.props.socialRailVisible !== false,
                              bgColor: String(section.props.socialRailBg ?? "rgba(0,0,0,0.85)"),
                              leftPct: Number(section.props.socialRailLeftPct ?? 0),
                              topPct: Number(section.props.socialRailTopPct ?? 12),
                              iconSize: Number(section.props.socialRailIconSize ?? 40),
                            }}
                            onRailChange={(patch) => updateProps(section.id, patch)}
                          />
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-3" style={{ color: "#FF5500" }}>
                            Photo layers
                          </p>
                          <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
                            Bring forward or send back — order saves with your draft. Links for each photo are below.
                          </p>
                          <ul className="space-y-1.5">
                            {[
                              ...(section.props.titleLogo || section.props.titleAsText
                                ? [{ key: "titleLogo", label: "Name circle" }]
                                : []),
                              ...["cutoutLeft", "cutoutRight", "cutoutAccent", "heroPhoto", "macbook"]
                                .filter((k) => String(section.props[k] ?? "").trim())
                                .map((k) => ({ key: k, label: k.replace(/([A-Z])/g, " $1").trim() })),
                              ...(((section.props.extraCutouts as { id?: string; alt?: string }[]) ?? []).map((c, i) => ({
                                key: String(c.id ?? `extra-${i}`),
                                label: c.alt?.trim() || `Extra photo ${i + 1}`,
                              })) as { key: string; label: string }[]),
                            ].map((layer) => {
                              const zMap = (section.props.layerZIndex as Record<string, number>) ?? {};
                              const z = typeof zMap[layer.key] === "number" ? zMap[layer.key]! : 10;
                              const linkMap = (section.props.layerLinks as Record<string, string>) ?? {};
                              return (
                                <li
                                  key={layer.key}
                                  className="rounded-md px-2 py-1.5"
                                  style={{ background: BUILDER.surfaceMuted, border: `1px solid ${BUILDER.border}` }}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-[11px] font-medium">{layer.label}</span>
                                    <span className="text-[9px] tabular-nums" style={{ color: BUILDER.muted }}>
                                      z{z}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    <button
                                      type="button"
                                      className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                                      style={{ border: `1px solid ${BUILDER.border}` }}
                                      onClick={() => {
                                        const next = Math.min(80, z + 10);
                                        const layerZIndex = { ...zMap, [layer.key]: next };
                                        const extras = (
                                          (section.props.extraCutouts as { id?: string; zIndex?: number }[]) ?? []
                                        ).map((c) =>
                                          c.id === layer.key ? { ...c, zIndex: Math.min(40, next) } : c,
                                        );
                                        updateProps(section.id, {
                                          layerZIndex,
                                          ...(extras.length ? { extraCutouts: extras } : {}),
                                        });
                                      }}
                                    >
                                      Front
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                                      style={{ border: `1px solid ${BUILDER.border}` }}
                                      onClick={() => {
                                        const next = Math.max(1, z - 10);
                                        const layerZIndex = { ...zMap, [layer.key]: next };
                                        const extras = (
                                          (section.props.extraCutouts as { id?: string; zIndex?: number }[]) ?? []
                                        ).map((c) =>
                                          c.id === layer.key ? { ...c, zIndex: Math.min(40, next) } : c,
                                        );
                                        updateProps(section.id, {
                                          layerZIndex,
                                          ...(extras.length ? { extraCutouts: extras } : {}),
                                        });
                                      }}
                                    >
                                      Back
                                    </button>
                                  </div>
                                  <input
                                    className="mt-1 w-full rounded px-1.5 py-1 text-[10px]"
                                    style={{ border: `1px solid ${BUILDER.border}` }}
                                    placeholder="Link — /shop or https://…"
                                    value={String(linkMap[layer.key] ?? "")}
                                    onChange={(e) => {
                                      const layerLinks = { ...linkMap, [layer.key]: e.target.value };
                                      if (!e.target.value.trim()) {
                                        const { [layer.key]: _, ...rest } = linkMap;
                                        updateProps(section.id, { layerLinks: rest });
                                        return;
                                      }
                                      updateProps(section.id, { layerLinks });
                                    }}
                                  />
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      {section.section_type === "kdirection-home" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>
                            Wix K-Direction — drag photos on the canvas
                          </p>
                          <p className="text-[10px] leading-relaxed" style={{ color: "#6B5B45" }}>
                            Upload cutouts (PNG with transparent background works best). On the preview: click a photo → Upload, then drag it where you want. Saves to your project automatically.
                          </p>
                          <SectionPhotoField
                            projectId={projectId}
                            label="Your logo (optional)"
                            value={String(section.props.logoImage ?? "")}
                            onChange={(url) => updateProps(section.id, { logoImage: url })}
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.brandLine1 ?? "K")}
                            onChange={(e) => updateProps(section.id, { brandLine1: e.target.value })}
                            placeholder="K"
                            aria-label="Brand letter"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.brandLine2 ?? "DIRECTION")}
                            onChange={(e) => updateProps(section.id, { brandLine2: e.target.value })}
                            placeholder="DIRECTION"
                            aria-label="Brand word"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            rows={2}
                            value={String(section.props.mission ?? "")}
                            onChange={(e) => updateProps(section.id, { mission: e.target.value })}
                            placeholder="Mission / short line under the logo"
                          />
                          <label className="block text-[10px] uppercase tracking-wider">
                            Font (Oswald = Wix)
                            <input
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.displayFont ?? "Oswald")}
                              onChange={(e) => updateProps(section.id, { displayFont: e.target.value })}
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-[10px] uppercase tracking-wider">
                              Logo color
                              <input
                                className="mt-1 w-full text-xs rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={String(section.props.logoColor ?? "#FFFFFF")}
                                onChange={(e) => updateProps(section.id, { logoColor: e.target.value })}
                              />
                            </label>
                            <label className="block text-[10px] uppercase tracking-wider">
                              Mirror color
                              <input
                                className="mt-1 w-full text-xs rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={String(section.props.logoMirrorColor ?? "#F5C4B8")}
                                onChange={(e) => updateProps(section.id, { logoMirrorColor: e.target.value })}
                              />
                            </label>
                          </div>
                          <label className="block text-[10px] uppercase tracking-wider">
                            Nav button yellow
                            <input
                              className="mt-1 w-full text-xs rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.navButtonBg ?? "#FFF86B")}
                              onChange={(e) => updateProps(section.id, { navButtonBg: e.target.value })}
                            />
                          </label>
                          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={section.props.showMirrorLogo !== false}
                              onChange={(e) => updateProps(section.id, { showMirrorLogo: e.target.checked })}
                            />
                            Mirrored wordmark (Wix)
                          </label>
                          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={section.props.showHomeIcon !== false}
                              onChange={(e) => updateProps(section.id, { showHomeIcon: e.target.checked })}
                            />
                            Home icon in nav
                          </label>
                          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={section.props.showOverlay === true}
                              onChange={(e) => updateProps(section.id, { showOverlay: e.target.checked })}
                            />
                            Dark overlay on background photo
                          </label>
                          <SectionPhotoField
                            projectId={projectId}
                            label="Optional background photo (over gradient)"
                            value={String(section.props.backgroundImage ?? "")}
                            onChange={(url) => updateProps(section.id, { backgroundImage: url })}
                          />
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: "#FF5500" }}>
                            Collage photos / cutouts
                          </p>
                          <p className="text-[10px] leading-relaxed" style={{ color: "#6B5B45" }}>
                            Switch Desktop / Tablet / Phone above the preview, then drag photos — each device can look different and all publish together.
                          </p>
                          <button
                            type="button"
                            className="w-full rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
                            style={{ background: "#0F0D33" }}
                            onClick={() => {
                              const existing = (section.props.collagePhotos as Record<string, unknown>[]) ?? [];
                              const base = {
                                src: String(
                                  (section.props.featuredArtistImage as string) ||
                                    (existing[0] as { src?: string } | undefined)?.src ||
                                    "",
                                ),
                                alt: "New photo",
                                rotate: -10 + Math.round(Math.random() * 20),
                                topPct: 20 + Math.round(Math.random() * 40),
                                leftPct: 20 + Math.round(Math.random() * 40),
                                widthPct: 16,
                                zIndex: 5,
                              };
                              const next = [
                                ...existing,
                                {
                                  ...base,
                                  tablet: {
                                    rotate: base.rotate,
                                    topPct: base.topPct,
                                    leftPct: Math.min(70, base.leftPct),
                                    widthPct: Math.min(28, base.widthPct * 1.2),
                                    hidden: false,
                                  },
                                  mobile: {
                                    rotate: Math.max(-18, Math.min(18, base.rotate)),
                                    topPct: 10 + (existing.length % 3) * 28,
                                    leftPct: existing.length % 2 === 0 ? 8 : 52,
                                    widthPct: 40,
                                    hidden: existing.length >= 4,
                                  },
                                },
                              ];
                              updateProps(section.id, { collagePhotos: next });
                            }}
                          >
                            + Add photo / cutout
                          </button>
                          {(
                            (section.props.collagePhotos as {
                              src?: string;
                              rotate?: number;
                              topPct?: number;
                              leftPct?: number;
                              widthPct?: number;
                            }[]) ?? []
                          ).map((photo, idx) => (
                            <div key={idx} className="space-y-1 rounded-lg p-2" style={{ border: "1px solid #EEE" }}>
                              <SectionPhotoField
                                projectId={projectId}
                                label={`Photo ${idx + 1} — upload then drag on canvas`}
                                value={String(photo.src ?? "")}
                                onChange={(url) => {
                                  const next = [
                                    ...((section.props.collagePhotos as typeof photo[]) ?? []),
                                  ];
                                  next[idx] = { ...next[idx]!, src: url };
                                  updateProps(section.id, { collagePhotos: next });
                                }}
                              />
                              <input
                                className="w-full text-xs rounded px-2 py-1"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={String((photo as { href?: string }).href ?? "")}
                                placeholder="Link when photo is clicked (https://… or /artists)"
                                onChange={(e) => {
                                  const next = [
                                    ...((section.props.collagePhotos as (typeof photo & { href?: string })[]) ?? []),
                                  ];
                                  next[idx] = { ...next[idx]!, href: e.target.value };
                                  updateProps(section.id, { collagePhotos: next });
                                }}
                              />
                              <div className="grid grid-cols-2 gap-1">
                                <label className="text-[9px]">
                                  Rotate
                                  <input
                                    type="number"
                                    className="mt-0.5 w-full text-xs rounded px-1 py-1"
                                    style={{ border: "1px solid #DDE0F0" }}
                                    value={Number(photo.rotate ?? 0)}
                                    onChange={(e) => {
                                      const next = [
                                        ...((section.props.collagePhotos as typeof photo[]) ?? []),
                                      ];
                                      next[idx] = { ...next[idx]!, rotate: Number(e.target.value) };
                                      updateProps(section.id, { collagePhotos: next });
                                    }}
                                  />
                                </label>
                                <label className="text-[9px]">
                                  Width %
                                  <input
                                    type="number"
                                    className="mt-0.5 w-full text-xs rounded px-1 py-1"
                                    style={{ border: "1px solid #DDE0F0" }}
                                    value={Number(photo.widthPct ?? 16)}
                                    onChange={(e) => {
                                      const next = [
                                        ...((section.props.collagePhotos as typeof photo[]) ?? []),
                                      ];
                                      next[idx] = { ...next[idx]!, widthPct: Number(e.target.value) };
                                      updateProps(section.id, { collagePhotos: next });
                                    }}
                                  />
                                </label>
                                <label className="text-[9px]">
                                  Top %
                                  <input
                                    type="number"
                                    className="mt-0.5 w-full text-xs rounded px-1 py-1"
                                    style={{ border: "1px solid #DDE0F0" }}
                                    value={Number(photo.topPct ?? 10)}
                                    onChange={(e) => {
                                      const next = [
                                        ...((section.props.collagePhotos as typeof photo[]) ?? []),
                                      ];
                                      next[idx] = { ...next[idx]!, topPct: Number(e.target.value) };
                                      updateProps(section.id, { collagePhotos: next });
                                    }}
                                  />
                                </label>
                                <label className="text-[9px]">
                                  Left %
                                  <input
                                    type="number"
                                    className="mt-0.5 w-full text-xs rounded px-1 py-1"
                                    style={{ border: "1px solid #DDE0F0" }}
                                    value={Number(photo.leftPct ?? 10)}
                                    onChange={(e) => {
                                      const next = [
                                        ...((section.props.collagePhotos as typeof photo[]) ?? []),
                                      ];
                                      next[idx] = { ...next[idx]!, leftPct: Number(e.target.value) };
                                      updateProps(section.id, { collagePhotos: next });
                                    }}
                                  />
                                </label>
                              </div>
                              <button
                                type="button"
                                className="text-[10px] font-bold uppercase text-red-600"
                                onClick={() => {
                                  const next = ((section.props.collagePhotos as typeof photo[]) ?? []).filter(
                                    (_, i) => i !== idx,
                                  );
                                  updateProps(section.id, { collagePhotos: next });
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <NavLinksEditor
                            links={mapNavLinksForEditor(
                              (section.props.navLinks as Parameters<typeof mapNavLinksForEditor>[0]) ?? [],
                            )}
                            onChange={(navLinks) => updateProps(section.id, { navLinks })}
                          />
                          <NavSizeEditor
                            scale={clampNavScale(section.props.navScale, 1)}
                            size={parseNavSize(section.props.navSize)}
                            layout={parseNavLayout(section.props.navLayout)}
                            onChange={(patch) => updateProps(section.id, patch)}
                          />
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: "#FF5500" }}>
                            Social / music links
                          </p>
                          <p className="text-[10px] leading-relaxed" style={{ color: "#6B5B45" }}>
                            Manage icons only here — add, remove, reorder, upload. Canvas shows them; drag position saves.
                          </p>
                          <SocialLinksEditor
                            projectId={projectId}
                            links={((section.props.socialLinks as { label?: string; href?: string; iconUrl?: string }[]) ?? []).map(
                              (l) => ({
                                label: String(l.label ?? ""),
                                href: String(l.href ?? ""),
                                iconUrl: String(l.iconUrl ?? ""),
                              }),
                            )}
                            onChange={(socialLinks) => updateProps(section.id, { socialLinks })}
                          />
                          <label className="block text-[10px] uppercase tracking-wider pt-1">
                            Footer text
                            <input
                              className="mt-1 w-full text-xs rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.footerText ?? "")}
                              onChange={(e) => updateProps(section.id, { footerText: e.target.value })}
                            />
                          </label>
                        </div>
                      )}
                      {section.section_type === "kdirection-page" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.title ?? "")}
                            onChange={(e) => updateProps(section.id, { title: e.target.value })}
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            rows={4}
                            value={String(section.props.body ?? "")}
                            onChange={(e) => updateProps(section.id, { body: e.target.value })}
                          />
                          <SectionPhotoField
                            projectId={projectId}
                            label="Hero photo"
                            value={String(section.props.heroImage ?? "")}
                            onChange={(url) => updateProps(section.id, { heroImage: url })}
                          />
                          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={section.props.showOverlay === true}
                              onChange={(e) => updateProps(section.id, { showOverlay: e.target.checked })}
                            />
                            Dark overlay
                          </label>
                          <NavLinksEditor
                            links={mapNavLinksForEditor(
                              (section.props.navLinks as Parameters<typeof mapNavLinksForEditor>[0]) ?? [],
                            )}
                            onChange={(navLinks) => updateProps(section.id, { navLinks })}
                          />
                          <NavSizeEditor
                            scale={clampNavScale(section.props.navScale, 1)}
                            size={parseNavSize(section.props.navSize)}
                            layout={parseNavLayout(section.props.navLayout)}
                            onChange={(patch) => updateProps(section.id, patch)}
                          />
                        </div>
                      )}
                      {section.section_type === "maylecor-music" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.artistName ?? "")}
                            onChange={(e) => updateProps(section.id, { artistName: e.target.value })}
                            aria-label="Artist name"
                          />
                          <SectionPhotoField
                            projectId={projectId}
                            label="Album art"
                            value={String(section.props.albumArt ?? "")}
                            onChange={(url) => updateProps(section.id, { albumArt: url })}
                          />
                          <SocialLinksEditor
                            projectId={projectId}
                            links={((section.props.socialLinks as { label?: string; href?: string; iconUrl?: string }[]) ?? []).map(
                              (l) => ({
                                label: String(l.label ?? ""),
                                href: String(l.href ?? ""),
                                iconUrl: String(l.iconUrl ?? ""),
                              }),
                            )}
                            onChange={(socialLinks) => updateProps(section.id, { socialLinks })}
                            rail={{
                              visible: section.props.socialRailVisible !== false,
                              bgColor: String(section.props.socialRailBg ?? "rgba(0,0,0,0.85)"),
                              leftPct: Number(section.props.socialRailLeftPct ?? 0),
                              topPct: Number(section.props.socialRailTopPct ?? 12),
                              iconSize: Number(section.props.socialRailIconSize ?? 40),
                            }}
                            onRailChange={(patch) => updateProps(section.id, patch)}
                          />
                        </div>
                      )}
                      {section.section_type === "hero" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.orange }}>Copy</p>
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                            placeholder="Heading"
                            aria-label="Hero heading"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[60px]"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.subheading ?? "")}
                            onChange={(e) => updateProps(section.id, { subheading: e.target.value })}
                            placeholder="Subheading"
                            aria-label="Hero subheading"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.buttonLabel ?? "")}
                              onChange={(e) => updateProps(section.id, { buttonLabel: e.target.value })}
                              placeholder="Button label"
                              aria-label="Button label"
                            />
                            <input
                              className="w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.buttonHref ?? "")}
                              onChange={(e) => updateProps(section.id, { buttonHref: e.target.value })}
                              placeholder="Button link"
                              aria-label="Button link"
                            />
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ color: BUILDER.orange }}>Design</p>
                          <SectionPhotoField
                            projectId={projectId}
                            label="Background image (optional)"
                            value={String(section.props.image ?? "")}
                            onChange={(url) => updateProps(section.id, { image: url })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-[10px] uppercase tracking-wider">
                              Background color
                              <input
                                type="color"
                                className="mt-1 h-8 w-full cursor-pointer rounded border-0 p-0"
                                value={String(section.props.background ?? "#0A0A0A")}
                                onChange={(e) => updateProps(section.id, { background: e.target.value })}
                              />
                            </label>
                            <label className="block text-[10px] uppercase tracking-wider">
                              Text align
                              <select
                                className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={String(section.props.align ?? "center")}
                                onChange={(e) => updateProps(section.id, { align: e.target.value })}
                              >
                                <option value="center">Center</option>
                                <option value="left">Left</option>
                              </select>
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-[10px] uppercase tracking-wider">
                              Height
                              <select
                                className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={String(section.props.minHeight ?? "80vh")}
                                onChange={(e) => updateProps(section.id, { minHeight: e.target.value })}
                              >
                                <option value="50vh">Half screen</option>
                                <option value="70vh">Tall</option>
                                <option value="80vh">Hero (80vh)</option>
                                <option value="100vh">Full screen</option>
                              </select>
                            </label>
                            <label className="block text-[10px] uppercase tracking-wider">
                              Overlay
                              <input
                                type="range"
                                min={0}
                                max={0.9}
                                step={0.05}
                                className="mt-2 w-full"
                                value={Number(section.props.overlayOpacity ?? 0.42)}
                                onChange={(e) => updateProps(section.id, { overlayOpacity: Number(e.target.value) })}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                      {section.section_type === "text" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[80px]"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.body ?? "")}
                            onChange={(e) => updateProps(section.id, { body: e.target.value })}
                          />
                        </div>
                      )}
                      {section.section_type === "navigation" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.brand ?? "")}
                            onChange={(e) => updateProps(section.id, { brand: e.target.value })}
                            aria-label="Brand name"
                            placeholder="Brand name"
                          />
                          <NavLinksEditor
                            links={mapNavLinksForEditor(
                              (section.props.links as Parameters<typeof mapNavLinksForEditor>[0]) ?? [],
                            )}
                            onChange={(links) => updateProps(section.id, { links })}
                          />
                          <NavSizeEditor
                            scale={clampNavScale(section.props.navScale, 1)}
                            size={parseNavSize(section.props.navSize)}
                            layout={parseNavLayout(section.props.navLayout)}
                            onChange={(patch) => updateProps(section.id, patch)}
                          />
                        </div>
                      )}
                      {section.section_type === "footer" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            placeholder="© Your Brand · 2026"
                            value={String(section.props.text ?? "")}
                            onChange={(e) => updateProps(section.id, { text: e.target.value })}
                          />
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ color: BUILDER.orange }}>Footer links</p>
                          <NavLinksEditor
                            links={mapNavLinksForEditor((section.props.links as Parameters<typeof mapNavLinksForEditor>[0]) ?? [])}
                            onChange={(links) => updateProps(section.id, { links })}
                          />
                        </div>
                      )}
                      {section.section_type === "whatsapp" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.phone ?? "")}
                            onChange={(e) => updateProps(section.id, { phone: e.target.value })}
                            aria-label="WhatsApp phone"
                            placeholder="WhatsApp number with country code"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.label ?? "")}
                            onChange={(e) => updateProps(section.id, { label: e.target.value })}
                            aria-label="WhatsApp button label"
                          />
                        </div>
                      )}
                      {section.section_type === "contact" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                            aria-label="Contact heading"
                            placeholder="Contact"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.email ?? "")}
                            onChange={(e) => updateProps(section.id, { email: e.target.value })}
                            aria-label="Email"
                            placeholder="Email"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.phone ?? "")}
                            onChange={(e) => updateProps(section.id, { phone: e.target.value })}
                            aria-label="Phone"
                            placeholder="Phone"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.address ?? "")}
                            onChange={(e) => updateProps(section.id, { address: e.target.value })}
                            aria-label="Address"
                            placeholder="Address or city"
                          />
                        </div>
                      )}
                      {section.section_type === "features" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                            aria-label="Features heading"
                            placeholder="Section heading"
                          />
                          {(Array.isArray(section.props.items) ? section.props.items : []).map(
                            (item: { title?: string; body?: string; image?: string; href?: string }, idx: number) => (
                              <div key={idx} className="space-y-1.5 rounded-lg p-2" style={{ background: "#F4F2EC" }}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: BUILDER.muted }}>Item {idx + 1}</span>
                                  <button
                                    type="button"
                                    className="text-[10px] font-semibold"
                                    style={{ color: "#B91C1C" }}
                                    onClick={() => {
                                      const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                      items.splice(idx, 1);
                                      updateProps(section.id, { items });
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                                <input
                                  className="w-full text-sm rounded-lg px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  value={String(item?.title ?? "")}
                                  onChange={(e) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], title: e.target.value };
                                    updateProps(section.id, { items });
                                  }}
                                  placeholder="Title"
                                />
                                <textarea
                                  className="w-full text-sm rounded-lg px-2 py-1 min-h-[60px]"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  value={String(item?.body ?? "")}
                                  onChange={(e) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], body: e.target.value };
                                    updateProps(section.id, { items });
                                  }}
                                  placeholder="Description"
                                />
                                <SectionPhotoField
                                  projectId={projectId}
                                  label="Image (optional)"
                                  value={String(item?.image ?? "")}
                                  onChange={(url) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], image: url };
                                    updateProps(section.id, { items });
                                  }}
                                />
                                <input
                                  className="w-full text-sm rounded-lg px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  value={String(item?.href ?? "")}
                                  placeholder="Link (optional)"
                                  onChange={(e) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], href: e.target.value };
                                    updateProps(section.id, { items });
                                  }}
                                />
                              </div>
                            )
                          )}
                          <button
                            type="button"
                            className="text-[11px] font-semibold underline"
                            onClick={() => {
                              const items = [
                                ...(Array.isArray(section.props.items) ? section.props.items : []),
                                { title: "New offer", body: "Describe this offer." },
                              ];
                              updateProps(section.id, { items });
                            }}
                          >
                            + Add item
                          </button>
                        </div>
                      )}
                      {section.section_type === "faq" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                            aria-label="FAQ heading"
                          />
                          {(Array.isArray(section.props.items) ? section.props.items : []).map(
                            (item: { question?: string; answer?: string }, idx: number) => (
                              <div key={idx} className="space-y-1 rounded-lg p-2" style={{ background: "#F4F2EC" }}>
                                <input
                                  className="w-full text-sm rounded-lg px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  value={String(item?.question ?? "")}
                                  onChange={(e) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], question: e.target.value };
                                    updateProps(section.id, { items });
                                  }}
                                  aria-label={`FAQ ${idx + 1} question`}
                                  placeholder="Question"
                                />
                                <textarea
                                  className="w-full text-sm rounded-lg px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  value={String(item?.answer ?? "")}
                                  onChange={(e) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], answer: e.target.value };
                                    updateProps(section.id, { items });
                                  }}
                                  aria-label={`FAQ ${idx + 1} answer`}
                                  placeholder="Answer"
                                />
                              </div>
                            )
                          )}
                          <button
                            type="button"
                            className="text-[11px] font-semibold underline"
                            onClick={() => {
                              const items = [
                                ...(Array.isArray(section.props.items) ? section.props.items : []),
                                { question: "New question?", answer: "Write a clear answer." },
                              ];
                              updateProps(section.id, { items });
                            }}
                          >
                            + Add question
                          </button>
                        </div>
                      )}
                      {section.section_type === "testimonials" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                            placeholder="What our customers say"
                            aria-label="Testimonials heading"
                          />
                          {(Array.isArray(section.props.items) ? section.props.items : []).map(
                            (item: { quote?: string; name?: string; role?: string; avatar?: string }, idx: number) => (
                              <div key={idx} className="space-y-1.5 rounded-lg p-2" style={{ background: "#F4F2EC" }}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: BUILDER.muted }}>Quote {idx + 1}</span>
                                  <button
                                    type="button"
                                    className="text-[10px] font-semibold"
                                    style={{ color: "#B91C1C" }}
                                    onClick={() => {
                                      const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                      items.splice(idx, 1);
                                      updateProps(section.id, { items });
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                                <textarea
                                  className="w-full text-sm rounded-lg px-2 py-1 min-h-[70px]"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  value={String(item?.quote ?? "")}
                                  onChange={(e) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], quote: e.target.value };
                                    updateProps(section.id, { items });
                                  }}
                                  placeholder="Their words..."
                                />
                                <div className="grid grid-cols-2 gap-1">
                                  <input
                                    className="w-full text-sm rounded-lg px-2 py-1"
                                    style={{ border: "1px solid #DDE0F0" }}
                                    value={String(item?.name ?? "")}
                                    onChange={(e) => {
                                      const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                      items[idx] = { ...items[idx], name: e.target.value };
                                      updateProps(section.id, { items });
                                    }}
                                    placeholder="Name"
                                  />
                                  <input
                                    className="w-full text-sm rounded-lg px-2 py-1"
                                    style={{ border: "1px solid #DDE0F0" }}
                                    value={String(item?.role ?? "")}
                                    onChange={(e) => {
                                      const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                      items[idx] = { ...items[idx], role: e.target.value };
                                      updateProps(section.id, { items });
                                    }}
                                    placeholder="Role / location"
                                  />
                                </div>
                                <SectionPhotoField
                                  projectId={projectId}
                                  label="Photo (optional)"
                                  value={String(item?.avatar ?? "")}
                                  onChange={(url) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], avatar: url };
                                    updateProps(section.id, { items });
                                  }}
                                />
                              </div>
                            )
                          )}
                          <button
                            type="button"
                            className="text-[11px] font-semibold underline"
                            onClick={() => {
                              const items = [
                                ...(Array.isArray(section.props.items) ? section.props.items : []),
                                { quote: "Amazing experience.", name: "Customer", role: "" },
                              ];
                              updateProps(section.id, { items });
                            }}
                          >
                            + Add quote
                          </button>
                        </div>
                      )}
                      {section.section_type === "video" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            placeholder="Heading (Videos)"
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                          />
                          <label className="block text-[10px] uppercase tracking-wider">
                            Layout
                            <select
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.layout ?? "grid")}
                              onChange={(e) =>
                                updateProps(section.id, {
                                  layout: e.target.value as "grid" | "single" | "featured",
                                })
                              }
                            >
                              <option value="grid">Grid thumbnails</option>
                              <option value="single">One video (full width)</option>
                              <option value="featured">Featured + grid</option>
                            </select>
                          </label>
                          <label className="block text-[10px] uppercase tracking-wider">
                            Columns
                            <select
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.columns ?? 2)}
                              onChange={(e) =>
                                updateProps(section.id, { columns: Number(e.target.value) as 1 | 2 | 3 })
                              }
                            >
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={Boolean(section.props.fullWidth)}
                              onChange={(e) => updateProps(section.id, { fullWidth: e.target.checked })}
                            />
                            Full page width (edge-to-edge)
                          </label>
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>
                            Videos — YouTube / Vimeo link, upload, or custom thumbnail
                          </p>
                          {(
                            (section.props.items as {
                              src?: string;
                              title?: string;
                              caption?: string;
                              thumbnail?: string;
                            }[]) ??
                            (section.props.src
                              ? [
                                  {
                                    src: String(section.props.src),
                                    title: String(section.props.title ?? ""),
                                    caption: String(section.props.caption ?? ""),
                                    thumbnail: String(section.props.thumbnail ?? ""),
                                  },
                                ]
                              : [])
                          ).map((item, idx) => {
                            const items =
                              (section.props.items as typeof item[]) ??
                              (section.props.src
                                ? [
                                    {
                                      src: String(section.props.src),
                                      title: String(section.props.title ?? ""),
                                      caption: String(section.props.caption ?? ""),
                                      thumbnail: String(section.props.thumbnail ?? ""),
                                    },
                                  ]
                                : []);
                            return (
                              <div key={idx} className="space-y-1 rounded-lg p-2" style={{ border: "1px solid #EEE" }}>
                                <input
                                  className="w-full text-xs rounded px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  placeholder="Title"
                                  value={item.title ?? ""}
                                  onChange={(e) => {
                                    const next = [...items];
                                    next[idx] = { ...next[idx]!, title: e.target.value };
                                    updateProps(section.id, { items: next, src: next[0]?.src ?? "" });
                                  }}
                                />
                                <input
                                  className="w-full text-xs rounded px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  placeholder="YouTube / Vimeo URL or link"
                                  value={item.src ?? ""}
                                  onChange={(e) => {
                                    const next = [...items];
                                    next[idx] = { ...next[idx]!, src: e.target.value };
                                    updateProps(section.id, { items: next, src: next[0]?.src ?? "" });
                                  }}
                                />
                                <SiteMediaUpload
                                  projectId={projectId}
                                  kind="video"
                                  value={String(item.src ?? "")}
                                  onChange={(src) => {
                                    const next = [...items];
                                    next[idx] = { ...next[idx]!, src };
                                    updateProps(section.id, { items: next, src: next[0]?.src ?? "" });
                                  }}
                                  label="Or upload video file"
                                />
                                <SectionPhotoField
                                  projectId={projectId}
                                  label="Custom thumbnail (optional)"
                                  value={String(item.thumbnail ?? "")}
                                  onChange={(url) => {
                                    const next = [...items];
                                    next[idx] = { ...next[idx]!, thumbnail: url };
                                    updateProps(section.id, { items: next });
                                  }}
                                />
                                <button
                                  type="button"
                                  className="text-[10px] font-bold uppercase text-red-600"
                                  onClick={() => {
                                    const next = items.filter((_, i) => i !== idx);
                                    updateProps(section.id, { items: next, src: next[0]?.src ?? "" });
                                  }}
                                >
                                  Remove video
                                </button>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            className="w-full rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
                            style={{ background: "#0F0D33" }}
                            onClick={() => {
                              const items = [
                                ...((section.props.items as { src: string; title: string; caption: string; thumbnail: string }[]) ??
                                  []),
                                { src: "", title: `Video ${((section.props.items as unknown[]) ?? []).length + 1}`, caption: "", thumbnail: "" },
                              ];
                              updateProps(section.id, { items });
                            }}
                          >
                            + Add video
                          </button>
                        </div>
                      )}
                      {section.section_type === "audio" && (
                        <div className="space-y-2">
                          <SiteMediaUpload
                            projectId={projectId}
                            kind="audio"
                            value={String(section.props.src ?? "")}
                            onChange={(src) => updateProps(section.id, { src })}
                            label="Music file from your computer"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            placeholder="Or paste MP3 URL"
                            value={String(section.props.src ?? "")}
                            onChange={(e) => updateProps(section.id, { src: e.target.value })}
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            placeholder="Track title"
                            value={String(section.props.title ?? "")}
                            onChange={(e) => updateProps(section.id, { title: e.target.value })}
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            placeholder="Artist name"
                            value={String(section.props.artist ?? "")}
                            onChange={(e) => updateProps(section.id, { artist: e.target.value })}
                          />
                        </div>
                      )}
                      {section.section_type === "gallery" && (
                        <div className="space-y-2">
                          <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
                            Upload photos or paste image URLs. Great for Photos and Videos pages.
                          </p>
                          <label className="block text-[10px] uppercase tracking-wider">
                            Photo layout
                            <select
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.layout ?? "grid")}
                              onChange={(e) =>
                                updateProps(section.id, {
                                  layout: e.target.value as "grid" | "single" | "featured",
                                })
                              }
                            >
                              <option value="grid">Grid</option>
                              <option value="single">One photo (full width)</option>
                              <option value="featured">Featured + grid</option>
                            </select>
                          </label>
                          <label className="block text-[10px] uppercase tracking-wider">
                            Columns
                            <select
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.columns ?? 3)}
                              onChange={(e) =>
                                updateProps(section.id, { columns: Number(e.target.value) as 1 | 2 | 3 })
                              }
                            >
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                            </select>
                          </label>
                          {(Array.isArray(section.props.items) ? section.props.items : []).map(
                            (item: { src?: string; alt?: string }, idx: number) => (
                              <div key={idx} className="space-y-1 rounded-lg p-2" style={{ background: BUILDER.surfaceMuted }}>
                                <SectionPhotoField
                                  projectId={projectId}
                                  label={`Photo ${idx + 1}`}
                                  value={String(item?.src ?? "")}
                                  onChange={(url) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], src: url, alt: items[idx]?.alt ?? "" };
                                    updateProps(section.id, { items });
                                  }}
                                />
                                <input
                                  className="w-full text-xs rounded-lg px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  placeholder="Caption (optional)"
                                  value={String(item?.alt ?? "")}
                                  onChange={(e) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], src: items[idx]?.src ?? "", alt: e.target.value };
                                    updateProps(section.id, { items });
                                  }}
                                />
                                <button
                                  type="button"
                                  className="text-[10px] text-red-600"
                                  onClick={() => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items.splice(idx, 1);
                                    updateProps(section.id, { items });
                                  }}
                                >
                                  Remove photo
                                </button>
                              </div>
                            ),
                          )}
                          <button
                            type="button"
                            className="text-[11px] font-semibold underline"
                            style={{ color: BUILDER.orange }}
                            onClick={() => {
                              const items = [
                                ...(Array.isArray(section.props.items) ? section.props.items : []),
                                { src: "", alt: "" },
                              ];
                              updateProps(section.id, { items });
                            }}
                          >
                            + Add photo
                          </button>
                        </div>
                      )}
                      {section.section_type === "products" && (
                        <div className="space-y-3">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                            placeholder="Section heading"
                          />
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.faint }}>
                            Shop layout
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(
                              [
                                ["grid", "Grid"],
                                ["grid-dense", "Dense grid"],
                                ["list", "List"],
                                ["featured", "Featured"],
                              ] as const
                            ).map(([id, label]) => {
                              const on = String(section.props.layout ?? "grid") === id;
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => updateProps(section.id, { layout: id })}
                                  className="rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider"
                                  style={{
                                    background: on ? BUILDER.ink : BUILDER.surfaceMuted,
                                    color: on ? "#fff" : BUILDER.ink,
                                    border: `1px solid ${BUILDER.border}`,
                                  }}
                                  aria-pressed={on}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          {String(section.props.layout ?? "grid") !== "list" ? (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: BUILDER.faint }}>
                                Columns
                              </p>
                              <div className="flex gap-1.5">
                                {([2, 3, 4] as const).map((n) => {
                                  const on = Number(section.props.columns ?? 3) === n;
                                  return (
                                    <button
                                      key={n}
                                      type="button"
                                      onClick={() => updateProps(section.id, { columns: n })}
                                      className="flex-1 rounded-lg py-2 text-[11px] font-bold"
                                      style={{
                                        background: on ? BUILDER.ink : BUILDER.surfaceMuted,
                                        color: on ? "#fff" : BUILDER.ink,
                                        border: `1px solid ${BUILDER.border}`,
                                      }}
                                      aria-pressed={on}
                                    >
                                      {n}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.faint }}>
                            Order form look
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(
                              [
                                ["inline", "Inline"],
                                ["sheet", "Bottom sheet"],
                                ["card", "Card"],
                                ["minimal", "Minimal"],
                              ] as const
                            ).map(([id, label]) => {
                              const on = String(section.props.orderStyle ?? "inline") === id;
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => updateProps(section.id, { orderStyle: id })}
                                  className="rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider"
                                  style={{
                                    background: on ? BUILDER.ink : BUILDER.surfaceMuted,
                                    color: on ? "#fff" : BUILDER.ink,
                                    border: `1px solid ${BUILDER.border}`,
                                  }}
                                  aria-pressed={on}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.orderCtaLabel ?? "Place order")}
                            onChange={(e) => updateProps(section.id, { orderCtaLabel: e.target.value })}
                            placeholder="Order button label"
                          />
                          {/* Full width toggle */}
                          <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={Boolean(section.props.fullWidth)}
                              onChange={(e) => updateProps(section.id, { fullWidth: e.target.checked })}
                            />
                            Full page width (edge-to-edge)
                          </label>

                          {/* Hover zoom toggle */}
                          <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={Boolean(section.props.hoverZoom)}
                              onChange={(e) => updateProps(section.id, { hoverZoom: e.target.checked })}
                            />
                            Hover zoom on product images
                          </label>

                          {/* Filter mode */}
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.faint }}>
                            Filter nav
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(
                              [
                                ["none", "None"],
                                ["horizontal", "Horizontal"],
                                ["sidebar", "Sidebar"],
                              ] as const
                            ).map(([id, label]) => {
                              const on = String(section.props.filterMode ?? "none") === id;
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => updateProps(section.id, { filterMode: id })}
                                  className="rounded-lg px-1.5 py-2 text-[9px] font-bold uppercase tracking-wider"
                                  style={{
                                    background: on ? BUILDER.ink : BUILDER.surfaceMuted,
                                    color: on ? "#fff" : BUILDER.ink,
                                    border: `1px solid ${BUILDER.border}`,
                                  }}
                                  aria-pressed={on}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          {String(section.props.filterMode ?? "none") !== "none" ? (
                            <div className="space-y-1">
                              <p className="text-[10px] opacity-60">Filter tags — one per line (e.g. Size S, Color Red)</p>
                              <textarea
                                className="w-full text-xs rounded-lg px-2 py-1.5 min-h-[64px]"
                                style={{ border: "1px solid #DDE0F0", resize: "vertical" }}
                                value={((section.props.filterFields as string[]) ?? []).join("\n")}
                                placeholder={"Size S\nSize M\nColor Red\nColor Black"}
                                onChange={(e) =>
                                  updateProps(section.id, {
                                    filterFields: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                                  })
                                }
                              />
                            </div>
                          ) : null}

                          {/* Banner section */}
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.faint }}>
                            Banner (optional)
                          </p>
                          <SectionPhotoField
                            projectId={projectId}
                            label="Banner image"
                            value={String(section.props.bannerImageUrl ?? "")}
                            onChange={(url) => updateProps(section.id, { bannerImageUrl: url })}
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.bannerText ?? "")}
                            onChange={(e) => updateProps(section.id, { bannerText: e.target.value })}
                            placeholder="Banner text overlay (optional)"
                          />

                          {/* Related products per item */}
                          {(() => {
                            const items = (section.props.items as { name: string; productId?: string; relatedProductIds?: string[] }[] | undefined) ?? [];
                            if (items.length < 2) return null;
                            return (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.faint }}>
                                  "You might also like" per product
                                </p>
                                {items.map((item, idx) => {
                                  const others = items.filter((_, i) => i !== idx);
                                  const currentRelated = item.relatedProductIds ?? [];
                                  return (
                                    <details key={item.productId ?? item.name ?? idx} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BUILDER.border}` }}>
                                      <summary className="cursor-pointer px-2.5 py-1.5 text-[10px] font-semibold" style={{ background: BUILDER.surfaceMuted, listStyle: "none" }}>
                                        {item.name}
                                        {currentRelated.length > 0 ? (
                                          <span className="ml-1.5 opacity-50">({currentRelated.length} related)</span>
                                        ) : null}
                                      </summary>
                                      <div className="px-2.5 py-2 space-y-1">
                                        {others.map((other) => {
                                          const isChecked = other.productId
                                            ? currentRelated.includes(other.productId)
                                            : false;
                                          return (
                                            <label key={other.productId ?? other.name} className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                  const newItems = items.map((it, i) => {
                                                    if (i !== idx) return it;
                                                    const prev = it.relatedProductIds ?? [];
                                                    const pid = other.productId;
                                                    if (!pid) return it;
                                                    const next = e.target.checked
                                                      ? [...prev, pid]
                                                      : prev.filter((id) => id !== pid);
                                                    return { ...it, relatedProductIds: next };
                                                  });
                                                  updateProps(section.id, { items: newItems });
                                                }}
                                              />
                                              {other.name}
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </details>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
                            Catalog lives in{" "}
                            <Link href={`/shop/${projectId}?tab=products`} className="font-bold underline" style={{ color: "#FF5500" }}>
                              Kebu Shop → Products
                            </Link>
                            . Layout here only changes how the shop page looks.
                          </p>
                          <Link
                            href={`/shop/${projectId}?tab=products`}
                            className="inline-block rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
                            style={{ background: "#FF5500" }}
                          >
                            Manage products in Shop
                          </Link>
                        </div>
                      )}
                      {section.section_type === "newsletter" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                            placeholder="Heading"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[60px]"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.subheading ?? "")}
                            onChange={(e) => updateProps(section.id, { subheading: e.target.value })}
                            placeholder="Subheading"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.buttonLabel ?? "")}
                            onChange={(e) => updateProps(section.id, { buttonLabel: e.target.value })}
                            placeholder="Button label"
                          />
                        </div>
                      )}
                      {section.section_type === "email-popup" && (
                        <div className="space-y-2">
                          <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
                            Overlay on the live site. Emails save to your business list (same as Email list).
                            Consent is stored in the visitor's browser — not a full legal cookie platform.
                          </p>
                          <label className="flex items-center gap-2 text-[11px]">
                            <input
                              type="checkbox"
                              checked={section.props.enabled !== false}
                              onChange={(e) => updateProps(section.id, { enabled: e.target.checked })}
                            />
                            Show popup
                          </label>
                          <label className="block text-[10px] uppercase tracking-wider">
                            Mode
                            <select
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.mode ?? "both")}
                              onChange={(e) => updateProps(section.id, { mode: e.target.value })}
                            >
                              <option value="both">Email + consent</option>
                              <option value="email">Email only</option>
                              <option value="consent">Consent only</option>
                            </select>
                          </label>
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                            placeholder="Heading"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[60px]"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.body ?? "")}
                            onChange={(e) => updateProps(section.id, { body: e.target.value })}
                            placeholder="Body"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.consentLabel ?? "")}
                            onChange={(e) => updateProps(section.id, { consentLabel: e.target.value })}
                            placeholder="Consent checkbox text"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-[10px] uppercase tracking-wider">
                              Delay (sec)
                              <input
                                type="number"
                                min={0}
                                max={60}
                                className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={Number(section.props.delaySeconds ?? 4)}
                                onChange={(e) =>
                                  updateProps(section.id, { delaySeconds: Number(e.target.value) })
                                }
                              />
                            </label>
                            <label className="block text-[10px] uppercase tracking-wider">
                              Remind (days)
                              <input
                                type="number"
                                min={0}
                                max={365}
                                className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={Number(section.props.remindAfterDays ?? 14)}
                                onChange={(e) =>
                                  updateProps(section.id, { remindAfterDays: Number(e.target.value) })
                                }
                              />
                            </label>
                          </div>
                        </div>
                      )}
                      {section.section_type === "map" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            placeholder="Address label"
                            value={String(section.props.address ?? "")}
                            onChange={(e) => updateProps(section.id, { address: e.target.value })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              step="any"
                              className="w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              placeholder="Latitude"
                              value={Number(section.props.latitude ?? 0)}
                              onChange={(e) => updateProps(section.id, { latitude: Number(e.target.value) })}
                            />
                            <input
                              type="number"
                              step="any"
                              className="w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              placeholder="Longitude"
                              value={Number(section.props.longitude ?? 0)}
                              onChange={(e) => updateProps(section.id, { longitude: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      )}
                      {section.section_type === "free-text" && (
                        <BuilderFreeTextEditor
                          blocks={
                            (Array.isArray(section.props.blocks)
                              ? section.props.blocks
                              : []) as FreeTextBlock[]
                          }
                          themeDisplayFont={
                            (project?.theme as ThemeTokens | undefined)?.fontDisplay ??
                            previewDefinition?.theme?.fontDisplay
                          }
                          themeBodyFont={
                            (project?.theme as ThemeTokens | undefined)?.fontBody ??
                            previewDefinition?.theme?.fontBody
                          }
                          onChange={(blocks) => updateProps(section.id, { blocks })}
                        />
                      )}
                      {section.section_type === "events" && (
                        <div className="space-y-2">
                          <button
                            type="button"
                            className="text-[11px] font-semibold underline"
                            onClick={() => {
                              const items = [
                                ...(Array.isArray(section.props.items) ? section.props.items : []),
                                { title: "New event", date: "2026-01-01", location: "", description: "", ticketUrl: "#" },
                              ];
                              updateProps(section.id, { items });
                            }}
                          >
                            + Add event
                          </button>
                        </div>
                      )}
                      {section.section_type === "editorial-hero" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.orange }}>Copy</p>
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                            placeholder="Headline"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[60px]"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.subheading ?? "")}
                            onChange={(e) => updateProps(section.id, { subheading: e.target.value })}
                            placeholder="Subheading"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.buttonLabel ?? "")}
                              onChange={(e) => updateProps(section.id, { buttonLabel: e.target.value })}
                              placeholder="Button label"
                            />
                            <input
                              className="text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.buttonHref ?? "")}
                              onChange={(e) => updateProps(section.id, { buttonHref: e.target.value })}
                              placeholder="Button link"
                            />
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ color: BUILDER.orange }}>Design</p>
                          <SectionPhotoField
                            projectId={projectId}
                            label="Background image"
                            value={String(section.props.image ?? "")}
                            onChange={(url) => updateProps(section.id, { image: url })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-[10px] uppercase tracking-wider">
                              Height
                              <select
                                className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={String(section.props.minHeight ?? "70vh")}
                                onChange={(e) => updateProps(section.id, { minHeight: e.target.value })}
                              >
                                <option value="50vh">Half screen</option>
                                <option value="70vh">Tall</option>
                                <option value="88vh">Very tall</option>
                                <option value="100vh">Full screen</option>
                              </select>
                            </label>
                            <label className="block text-[10px] uppercase tracking-wider">
                              Align
                              <select
                                className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={String(section.props.align ?? "left")}
                                onChange={(e) => updateProps(section.id, { align: e.target.value })}
                              >
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                              </select>
                            </label>
                          </div>
                          <label className="block text-[10px] uppercase tracking-wider">
                            Overlay darkness
                            <input
                              type="range"
                              min={0}
                              max={0.9}
                              step={0.05}
                              className="mt-2 w-full"
                              value={Number(section.props.overlayOpacity ?? 0.35)}
                              onChange={(e) => updateProps(section.id, { overlayOpacity: Number(e.target.value) })}
                            />
                          </label>
                        </div>
                      )}
                      {section.section_type === "announcement-bar" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.text ?? "")}
                            onChange={(e) => updateProps(section.id, { text: e.target.value })}
                            placeholder="Free shipping on orders over 10,000 XOF"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.link ?? "")}
                            onChange={(e) => updateProps(section.id, { link: e.target.value })}
                            placeholder="Link (optional)"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-[10px] uppercase tracking-wider">
                              Background
                              <input
                                type="color"
                                className="mt-1 h-8 w-full cursor-pointer rounded border-0 p-0"
                                value={String(section.props.background ?? "#0A0A0A")}
                                onChange={(e) => updateProps(section.id, { background: e.target.value })}
                              />
                            </label>
                            <label className="block text-[10px] uppercase tracking-wider">
                              Text color
                              <input
                                type="color"
                                className="mt-1 h-8 w-full cursor-pointer rounded border-0 p-0"
                                value={String(section.props.color ?? "#ffffff")}
                                onChange={(e) => updateProps(section.id, { color: e.target.value })}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                      {section.section_type === "marquee" && (
                        <div className="space-y-2">
                          <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
                            Scrolling text strip. One item per line.
                          </p>
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[80px]"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={(Array.isArray(section.props.items) ? section.props.items : []).join("\n")}
                            onChange={(e) => {
                              const items = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
                              updateProps(section.id, { items });
                            }}
                            placeholder={"New arrivals\nShop now\nFree delivery\nMade in Africa"}
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.separator ?? " · ")}
                            onChange={(e) => updateProps(section.id, { separator: e.target.value })}
                            placeholder="Separator ( · )"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-[10px] uppercase tracking-wider">
                              Background
                              <input
                                type="color"
                                className="mt-1 h-8 w-full cursor-pointer rounded border-0 p-0"
                                value={String(section.props.background ?? "#0A0A0A")}
                                onChange={(e) => updateProps(section.id, { background: e.target.value })}
                              />
                            </label>
                            <label className="block text-[10px] uppercase tracking-wider">
                              Text color
                              <input
                                type="color"
                                className="mt-1 h-8 w-full cursor-pointer rounded border-0 p-0"
                                value={String(section.props.color ?? "#ffffff")}
                                onChange={(e) => updateProps(section.id, { color: e.target.value })}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                      {section.section_type === "split" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.orange }}>Copy</p>
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                            placeholder="Heading"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[80px]"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.body ?? "")}
                            onChange={(e) => updateProps(section.id, { body: e.target.value })}
                            placeholder="Body text"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.buttonLabel ?? "")}
                              onChange={(e) => updateProps(section.id, { buttonLabel: e.target.value })}
                              placeholder="Button"
                            />
                            <input
                              className="text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.buttonHref ?? "")}
                              onChange={(e) => updateProps(section.id, { buttonHref: e.target.value })}
                              placeholder="Link"
                            />
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ color: BUILDER.orange }}>Image</p>
                          <SectionPhotoField
                            projectId={projectId}
                            label="Photo"
                            value={String(section.props.image ?? "")}
                            onChange={(url) => updateProps(section.id, { image: url })}
                          />
                          <label className="block text-[10px] uppercase tracking-wider">
                            Image side
                            <select
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.imagePosition ?? "left")}
                              onChange={(e) => updateProps(section.id, { imagePosition: e.target.value })}
                            >
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                            </select>
                          </label>
                        </div>
                      )}
                      {!["hero", "text", "free-text", "navigation", "footer", "whatsapp", "contact", "features", "faq", "testimonials", "video", "audio", "map", "events", "image", "gallery", "products", "newsletter", "email-popup", "maylecor-home", "maylecor-music", "legally-blonde-hero", "kdirection-home", "kdirection-page", "editorial-hero", "announcement-bar", "marquee", "split"].includes(
                        section.section_type
                      ) && (
                        <p className="text-[11px]" style={{ color: "#8A8578" }}>
                          You can reorder or hide this section. Use Yande to rewrite copy.
                        </p>
                      )}
                      <label className="flex items-center gap-2 mt-2 text-[11px]">
                        <input
                          type="checkbox"
                          checked={Boolean(section.props.hidden)}
                          onChange={(e) => updateProps(section.id, { hidden: e.target.checked })}
                        />
                        Hide section
                      </label>
                    </div>
                  ))}
              </>
              )}
            </aside>

            <section
              className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              style={{
                background: maylecorRussianLayout
                  ? "#FFE4F0"
                  : kdirectionLayout
                    ? "#f5f5f5"
                    : "#F1F1F1",
              }}
            >
              <div
                className={`mx-auto flex min-h-0 flex-1 w-full ${
                  wideCanvas ? "overflow-y-auto p-0" : "overflow-y-auto items-start p-5 sm:p-8"
                }`}
              >
                <div
                  className={`mx-auto bg-white ${
                    wideCanvas ? "flex min-h-full w-full flex-1 flex-col" : "overflow-x-hidden"
                  }`}
                  style={
                    wideCanvas
                      ? {
                          width: "100%",
                          maxWidth: "100%",
                          minHeight: "100%",
                          height: "auto",
                          border: "none",
                          borderRadius: 0,
                          boxShadow: "none",
                        }
                      : {
                          width: "100%",
                          maxWidth: BUILDER_DEVICE_FRAME[device],
                          minHeight: device === "mobile" ? 520 : device === "tablet" ? 640 : 560,
                          border:
                            device === "mobile"
                              ? "3px solid #1a1a1a"
                              : device === "tablet"
                                ? "2px solid #333"
                                : "1px solid #c8c4bc",
                          borderRadius: device === "mobile" ? 28 : device === "tablet" ? 18 : 12,
                          boxShadow:
                            device === "desktop"
                              ? "0 16px 48px rgba(0,0,0,0.22)"
                              : "0 12px 40px rgba(0,0,0,0.18)",
                        }
                  }
                >
                {canvasDefinition && (
                  <BuilderEditablePreview
                    definition={canvasDefinition}
                    pageSlug={previewPageSlug}
                    siteBase={previewSiteBase || undefined}
                    projectId={projectId}
                    device={device}
                    canvasFill={wideCanvas}
                    pageTitle={
                      pages.find((p) => p.slug === previewPageSlug)?.title ??
                      pages.find((p) => p.id === editPageId)?.title ??
                      "Home"
                    }
                    onAssetDrop={(asset, drop) => void applyMediaAsset(asset, drop)}
                    editor={canvasEditor}
                  />
                )}
                </div>
              </div>
              {canvasDefinition ? (
                <BuilderSiteCommandBar
                  value={improveInstruction}
                  onChange={setImproveInstruction}
                  mode={improveMode}
                  onModeChange={setImproveMode}
                  onPreview={() => void previewWithAi()}
                  onApply={() => void applyAiPreview()}
                  onDiscard={discardAiPreview}
                  busy={improving}
                  device={device}
                  preview={aiPreview ? { intents: aiPreview.intents, repaired: aiPreview.repaired } : null}
                  sectionChanges={aiPreview?.sectionChanges}
                  acceptedSectionIds={aiPreview?.acceptedSectionIds}
                  onToggleSection={(sectionId) => {
                    setAiPreview((prev) => {
                      if (!prev) return prev;
                      const next = new Set(prev.acceptedSectionIds);
                      if (next.has(sectionId)) next.delete(sectionId);
                      else next.add(sectionId);
                      return { ...prev, acceptedSectionIds: next };
                    });
                  }}
                  onSelectAllSections={() => {
                    setAiPreview((prev) =>
                      prev
                        ? {
                            ...prev,
                            acceptedSectionIds: new Set(prev.sectionChanges.map((c) => c.sectionId)),
                          }
                        : prev,
                    );
                  }}
                  onClearAllSections={() => {
                    setAiPreview((prev) => (prev ? { ...prev, acceptedSectionIds: new Set() } : prev));
                  }}
                />
              ) : null}
            </section>
          </>
        )}
      </main>

      {previewFullscreen && canvasDefinition ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: maylecorRussianLayout ? "#FFE4F0" : BUILDER.bg }}
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen site preview"
        >
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
            style={{
              borderColor: "rgba(0,0,0,0.1)",
              background: "rgba(255,255,255,0.95)",
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#0F0D33" }}>
              Fullscreen edit · Esc to exit
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["desktop", "Desktop"],
                  ["tablet", "Tablet"],
                  ["mobile", "Phone"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDevice(id)}
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: device === id ? "#0F0D33" : "#ECEAE4",
                    color: device === id ? "#fff" : "#5C5348",
                  }}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPreviewFullscreen(false)}
                className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ background: "#FF5500" }}
              >
                Exit fullscreen
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
            <div
              className="mx-auto overflow-hidden bg-white shadow-2xl"
              style={{
                width: "100%",
                maxWidth: device === "desktop" ? "100%" : BUILDER_DEVICE_FRAME[device],
                minHeight: "calc(100vh - 6rem)",
                borderRadius: device === "mobile" ? 28 : 12,
              }}
            >
              <BuilderEditablePreview
                definition={canvasDefinition}
                pageSlug={previewPageSlug}
                siteBase={previewSiteBase || undefined}
                projectId={projectId}
                device={device}
                pageTitle={
                  pages.find((p) => p.slug === previewPageSlug)?.title ??
                  pages.find((p) => p.id === editPageId)?.title ??
                  "Home"
                }
                onAssetDrop={(asset, drop) => void applyMediaAsset(asset, drop)}
                editor={canvasEditor}
              />
            </div>
          </div>
        </div>
      ) : null}
      {kbSaveNote ? (
        <p
          className="pointer-events-none fixed left-3 bottom-3 z-[55] max-w-xs rounded-lg px-2 py-1 text-[10px]"
          style={{ background: "rgba(255,251,247,0.95)", color: "#166534", border: "1px solid #E8E6DF" }}
        >
          {kbSaveNote}
        </p>
      ) : null}
    </div>
    </DataModeProvider>
  );
}

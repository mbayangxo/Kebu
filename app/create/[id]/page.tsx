"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BuilderStudioChrome, BuilderStudioRail, type BuilderStudioTab } from "@/app/components/create/builder-studio-chrome";
import { YandeMark } from "@/app/components/yande-mark";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { buildEditorPreviewDefinition } from "@/lib/create/editor-definition";
import { BUILDER, BUILDER_QUICK_SECTIONS, labelForSectionType } from "@/lib/create/builder-ui";
import { BuilderElementInspector } from "@/app/components/create/builder-element-inspector";
import { BuilderSectionLayoutPanel } from "@/app/components/create/builder-section-layout-panel";
import type { BuilderElementSelection } from "@/lib/create/builder-selection";
import { AddSectionPicker } from "@/app/components/create/add-section-picker";
import { BuilderBlogPanel } from "@/app/components/create/builder-blog-panel";
import {
  CHROME_FOOTER_ID,
  CHROME_HEADER_ID,
  isChromeSectionId,
  parseSiteChrome,
  projectUsesEmbeddedNav,
  removeSiteChromePart,
  type SiteChrome,
} from "@/lib/create/site-chrome";
import type { SiteSeo } from "@/lib/create/site-seo";
import { defaultSiteSeo } from "@/lib/create/site-seo";
import { mergeSiteCommerce } from "@/lib/create/site-commerce";
import type { PublishState } from "@/lib/create/publish-state";
import { SectionPhotoField } from "@/app/components/create/section-photo-field";
import { BuilderBusinessNudge } from "@/app/components/create/builder-business-nudge";
import { BuilderEditablePreview } from "@/app/components/create/builder-editable-preview";
import { BuilderSectionListDnd } from "@/app/components/create/builder-section-list-dnd";
import { BuilderSectionZone } from "@/app/components/create/builder-section-zone";
import { BuilderLayersPanel } from "@/app/components/create/builder-layers-panel";
import { BuilderAppsPanel } from "@/app/components/create/builder-apps-panel";
import { BuilderSectionInspector } from "@/app/components/create/builder-section-inspector";
import { BuilderFreeTextEditor, type FreeTextBlock } from "@/app/components/create/builder-free-text-editor";
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
import {
  applyDeviceAwarePatch,
  clearDeviceOverrideKeys,
  DEVICE_OVERRIDE_KEYS,
  hasDeviceOverrideKeys,
  mergeDeviceAwareSectionProps,
} from "@/lib/create/device-overrides";
import { projectUsesMaylecorRussianLayout } from "@/lib/create/maylecor-russian-hero";
import { defaultMaylecorKsendrProps } from "@/lib/create/maylecor-ksendr-defaults";
import { projectUsesKdirectionLayout } from "@/lib/create/kdirection-local-assets";
import { clampNavScale, parseNavLayout, parseNavSize } from "@/lib/create/nav-chrome-size";
import { mySiteDetailHref } from "@/lib/navigation/product-nav";
import {
  DataModeProvider,
} from "@/app/components/create/data-mode-provider";
import { useProjectAutosave } from "./use-project-autosave";
import { Z_LAYERS } from "@/app/components/create/kebu-z-layers";
import { useBuilderAccordion } from "@/app/components/create/use-builder-accordion";
import {
  portfolioUpgradeForProject,
  type EditorProject as Project,
  type EditorSection as Section,
} from "./project-editor-load";

/**
 * Code-split the heaviest sidebar/panel views that are hidden behind a tab or a closed-by-default
 * panel on first load (docs/product/KEBU-BUILDER-UX-STANDARD.md: "zero code-splitting" finding).
 * Each of these only mounts once its gating condition (sidebarTab / aiPreview / yandeOpen) becomes
 * true, so its chunk is fetched on demand instead of shipping in the Builder's initial bundle.
 */
const BuilderAestheticsPanel = dynamic(
  () => import("@/app/components/create/builder-aesthetics-panel").then((m) => m.BuilderAestheticsPanel),
  { ssr: false },
);
const BuilderSiteChromePanel = dynamic(
  () => import("@/app/components/create/builder-site-chrome-panel").then((m) => m.BuilderSiteChromePanel),
  { ssr: false },
);
const SiteAssetsPanel = dynamic(
  () => import("@/app/components/create/site-assets-panel").then((m) => m.SiteAssetsPanel),
  { ssr: false },
);
const BuilderPagesPanel = dynamic(
  () => import("@/app/components/create/builder-pages-panel").then((m) => m.BuilderPagesPanel),
  { ssr: false },
);
const SiteDomainSeoPanel = dynamic(
  () => import("@/app/components/create/site-domain-seo-panel").then((m) => m.SiteDomainSeoPanel),
  { ssr: false },
);
const BuilderConnectionsPanel = dynamic(
  () => import("@/app/components/create/builder-connections-panel").then((m) => m.BuilderConnectionsPanel),
  { ssr: false },
);
const BuilderShopPanel = dynamic(
  () => import("@/app/components/create/builder-shop-panel").then((m) => m.BuilderShopPanel),
  { ssr: false },
);
const BuilderVersionHistoryPanel = dynamic(
  () => import("@/app/components/create/builder-version-history-panel").then((m) => m.BuilderVersionHistoryPanel),
  { ssr: false },
);
const BuilderAiPreviewPanel = dynamic(
  () => import("@/app/components/create/builder-ai-preview-panel").then((m) => m.BuilderAiPreviewPanel),
  { ssr: false },
);
const YandeAssistant = dynamic(
  () => import("@/app/components/create/yande-assistant").then((m) => m.YandeAssistant),
  { ssr: false },
);

function SidebarDetails({ title, children, defaultOpen = true, group }: { title: string; children: import("react").ReactNode; defaultOpen?: boolean; group?: string }) {
  const { open, setAccordionOpen } = useBuilderAccordion(group, defaultOpen);

  return (
    <details
      open={open}
      onToggle={(event) => setAccordionOpen(event.currentTarget.open)}
      className="group border-b"
      style={{ borderColor: "#E5E5E5" }}
    >
      <summary
        className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 select-none"
        style={{ background: "#F7F7F7" }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#5C5C5C" }}>{title}</span>
        <span className="text-[10px] text-[#ABABAB] transition-transform group-open:rotate-90" aria-hidden>▶</span>
      </summary>
      <div className="px-4 py-3 space-y-3">
        {children}
      </div>
    </details>
  );
}

function PanelField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: import("react").ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "#8A8A8A" }}>{label}</p>
      {children}
      {hint ? <p className="mt-1 text-[9px] leading-relaxed" style={{ color: "#ABABAB" }}>{hint}</p> : null}
    </div>
  );
}

export default function ProjectEditorPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supportAssist, setSupportAssist] = useState(false);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [payingHosting, setPayingHosting] = useState(false);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [subdomainInput, setSubdomainInput] = useState("");
  const [seoSettings, setSeoSettings] = useState<SiteSeo>(() => defaultSiteSeo());
  const [settingsState, setSettingsState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [settingsNote, setSettingsNote] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<BuilderStudioTab>("content");
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<BuilderElementSelection | null>(null);
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingThemeRef = useRef<ThemeTokens | null>(null);
  // Ref to the iframe used for mobile/tablet device preview (see below)
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [billing, setBilling] = useState<{
    canPublish: boolean;
    label: string;
    periodEnd?: string | null;
    billingExempt?: boolean;
    autopayEnabled?: boolean;
    tier?: string;
    plans?: Array<{ id: string; name: string; monthlyUsd: number; hero?: boolean }>;
  } | null>(null);
  const [checkoutTier, setCheckoutTier] = useState("starter");
  const [improving, setImproving] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [improveInstruction, setImproveInstruction] = useState("");
  const [yandeOpen, setYandeOpen] = useState(false);
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

  // Escape closes the Yande AI panel when open
  useEffect(() => {
    if (!yandeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setYandeOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [yandeOpen]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fire project and billing fetches in parallel — billing only needs the project ID.
      const [res, billingRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`, { credentials: "include" }),
        fetch(`/api/projects/${projectId}/billing`, { credentials: "include" }),
      ]);
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
      const portfolioUpgrade = portfolioUpgradeForProject(data);
      if (portfolioUpgrade) {
        const upRes = await fetch(`/api/projects/${projectId}/upgrade-${portfolioUpgrade}`, {
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

      const billingData = await billingRes.json().catch(() => ({}));
      if (billingRes.ok) {
        const tier =
          typeof billingData.subscription?.tier === "string"
            ? billingData.subscription.tier
            : "free";
        setBilling({
          canPublish: Boolean(billingData.canPublish),
          label: typeof billingData.label === "string" ? billingData.label : "$2/site/month",
          periodEnd: billingData.subscription?.periodEnd ?? null,
          billingExempt: Boolean(billingData.billingExempt),
          autopayEnabled: Boolean(billingData.subscription?.autopayEnabled),
          tier,
          plans: Array.isArray(billingData.plans) ? billingData.plans : undefined,
        });
        if (tier && tier !== "free") setCheckoutTier(tier);
        else setCheckoutTier("starter");
      }
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  function pushHistory(prev: Section[]) {
    setHistory((h) => [...h.slice(-19), prev]);
    setFuture([]);
  }

  const {
    saveState,
    saveStatusLabel,
    kbSaveNote,
    updateProps,
    updateChromeProps,
    saveDraftNow,
    persistProps,
    restorePropsSnapshot,
    markAllSaved,
  } = useProjectAutosave({
      projectId,
      sections,
      setSections,
      pushHistory,
      siteChrome,
      setSiteChrome,
      setPublishState,
      setError,
    });

  async function removeChromePart(part: "header" | "footer") {
    if (!siteChrome) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError(`Reconnect to remove the site ${part}. Other supported edits can remain queued offline.`);
      return;
    }
    const label = part === "header" ? "navigation" : "footer";
    if (!window.confirm(`Remove the site ${label}? You can add it again later.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/site-chrome`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(part === "header" ? { header: null } : { footer: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : `Could not remove site ${label}.`);
        return;
      }
      setSiteChrome(
        data.siteChrome && typeof data.siteChrome === "object"
          ? parseSiteChrome(data.siteChrome)
          : removeSiteChromePart(siteChrome, part),
      );
      setSelectedSectionId(null);
      setSelectedElement(null);
      setLeftPanelOpen(false);
    } catch {
      setError(`Network error while removing site ${label}.`);
    }
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
          : [{ label: "Home", href: "/" }];
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
    setSections((prev) => [...prev, section].sort((a, b) => a.sort_order - b.sort_order));
    setSelectedSectionId(section.id);
    setSidebarTab("content");
    return section;
  }

  async function duplicateSection(sectionId: string) {
    const source = sections.find((s) => s.id === sectionId);
    if (!source) return;
    await addSection(source.section_type, { ...source.props }, source.id);
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
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }

  async function reorderSections(orderedIds: string[]) {
    setError(null);
    try {
      const responses = await Promise.all(
        orderedIds.map((id, index) =>
          fetch(`/api/projects/${projectId}/sections`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sectionId: id, sortOrder: index }),
          }),
        ),
      );
      if (responses.some((response) => !response.ok)) {
        setError("Could not reorder every section. Kebu restored the last saved order.");
      }
    } catch {
      setError("Network error while reordering sections. Kebu restored the last saved order.");
    } finally {
      // The server is canonical. Reload even after a partial/network failure so the canvas never
      // pretends an order was saved when Supabase disagrees.
      await load();
    }
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
    const previousSections = sections;
    const optimistic = sections.map((section) => {
      if (section.id === a.id) return { ...section, sort_order: b.sort_order };
      if (section.id === b.id) return { ...section, sort_order: a.sort_order };
      return section;
    });
    setSections(optimistic);
    try {
      // Do not write the two halves concurrently: if one request fails after the other succeeds,
      // Supabase can be left with duplicate sort_order values. Write one side, then the other, and
      // compensate the first write if the second cannot be saved.
      const first = await fetch(`/api/projects/${projectId}/sections`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: a.id, sortOrder: b.sort_order }),
      });
      if (!first.ok) throw new Error("first reorder write failed");
      const second = await fetch(`/api/projects/${projectId}/sections`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: b.id, sortOrder: a.sort_order }),
      });
      if (!second.ok) {
        const rollback = await fetch(`/api/projects/${projectId}/sections`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId: a.id, sortOrder: a.sort_order }),
        });
        if (!rollback.ok) {
          setError("Section order needs recovery. Kebu is reloading the saved order.");
        } else {
          setError("Could not move that section. Kebu restored the last saved order.");
        }
        setSections(previousSections);
        await load();
      }
    } catch {
      setSections(previousSections);
      setError("Network error while moving that section. Kebu restored the last saved order.");
      await load();
    }
  }

  async function undo() {
    if (history.length === 0) return;
    const prev = history[history.length - 1]!;
    setHistory((current) => current.slice(0, -1));
    setFuture((current) => [sections, ...current]);
    setSections(prev);
    await restorePropsSnapshot(prev);
  }

  async function redo() {
    if (future.length === 0) return;
    const next = future[0]!;
    setFuture((current) => current.slice(1));
    setHistory((current) => [...current.slice(-19), sections]);
    setSections(next);
    await restorePropsSnapshot(next);
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
    // Base the merge on the FULL current commerce object (not just two cherry-picked fields) — a
    // save triggered by an unrelated change (favicon, meta title, subdomain) must never drop payment
    // settings (COD, mobile money, card, PayPal, Wave link, etc.) that were already configured
    // elsewhere (e.g. the Shop admin's Payments tab). mergeSiteCommerce also guarantees every
    // required field is present, which is what keeps this object assignable to SiteSeo["commerce"].
    const nextSeo: SiteSeo = {
      ...seoSettings,
      ...(patch.seo ?? {}),
      commerce: mergeSiteCommerce(patch.seo?.commerce, seoSettings.commerce),
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
      const draftSaved = await saveDraftNow();
      if (!draftSaved) {
        setError("Kebu could not confirm your latest draft is saved yet. Fix the save issue, then publish again.");
        return;
      }
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
          `Publish needs a paid plan for a custom domain. Free sites publish on your Kebu subdomain — or upgrade to Starter ($2/site/month) via JOKO.`,
        );
        setBilling((b) => (b ? { ...b, canPublish: false } : b));
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Publish failed.");
        return;
      }
      setPublishUrl(data.deployment?.public_path ?? data.liveUrl ?? data.publicPath ?? null);
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
          focusElement: selectedElement
            ? {
                ...selectedElement,
                device,
              }
            : undefined,
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
      markAllSaved();
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

  function selectSectionForInspector(id: string | null) {
    setSelectedSectionId(id);
    setSelectedElement(null);
    if (id) {
      setSidebarTab("content");
      setLeftPanelOpen(true);
    } else {
      setLeftPanelOpen(false);
    }
  }

  const canvasEditor = {
    selectedSectionId,
    selectedElement,
    onSelectSection: (id: string) => {
      selectSectionForInspector(id);
      const match = sections.find((s) => s.id === id);
      if (match) setEditPageId(match.page_id);
    },
    onSelectElement: (selection: BuilderElementSelection) => {
      setSelectedSectionId(selection.sectionId);
      setSelectedElement(selection);
      setSidebarTab("content");
      setLeftPanelOpen(true);
      const match = sections.find((s) => s.id === selection.sectionId);
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

  const previewDefinition = useMemo<WebsiteDefinition | null>(
    () =>
      project
        ? buildEditorPreviewDefinition({ ...project, seo: seoSettings }, pages, sections, siteChrome)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project, seoSettings, pages, sections, siteChrome],
  );

  const canvasDefinition = useMemo(() => {
    if (!aiPreview) return previewDefinition;
    if (aiPreview.sectionChanges.length === 0 || !previewDefinition) {
      return aiPreview.definition;
    }
    return mergePartialAiDefinition(
      previewDefinition,
      aiPreview.definition,
      [...aiPreview.acceptedSectionIds],
    );
  }, [aiPreview, previewDefinition]);

  const previewSiteBase = project?.subdomain ? `/sites/${project.subdomain}` : "";

  const sectionTypes = useMemo(() => sections.map((s) => s.section_type), [sections]);

  const maylecorRussianLayout = useMemo(
    () => projectUsesMaylecorRussianLayout(project?.description, sectionTypes),
    [project?.description, sectionTypes],
  );
  const kdirectionLayout = useMemo(
    () => projectUsesKdirectionLayout(project?.description, sectionTypes),
    [project?.description, sectionTypes],
  );

  const chromeActive = useMemo(
    () =>
      Boolean(siteChrome?.enabled) &&
      !projectUsesEmbeddedNav(sectionTypes) &&
      !maylecorRussianLayout &&
      !kdirectionLayout,
    [siteChrome?.enabled, sectionTypes, maylecorRussianLayout, kdirectionLayout],
  );

  useEffect(() => {
    // Canvas-first: panel always starts closed so the site preview fills the full width.
    // It opens on demand: clicking a rail icon or clicking a section on the canvas.
    setLeftPanelOpen(false);
    setSidebarTab("content");
  }, [projectId]);

  function openStudioTab(tab: BuilderStudioTab) {
    if (leftPanelOpen && sidebarTab === tab) {
      setLeftPanelOpen(false);
      return;
    }
    setSidebarTab(tab);
    setLeftPanelOpen(true);
  }

  const editPageSections = useMemo(
    () =>
      sections
        .filter((s) => s.page_id === editPageId)
        .filter((s) => !chromeActive || (s.section_type !== "navigation" && s.section_type !== "footer"))
        .sort((a, b) => a.sort_order - b.sort_order),
    [sections, editPageId, chromeActive],
  );

  const flagshipCanvas = maylecorRussianLayout || kdirectionLayout;
  /**
   * Shopify-feel: desktop preview fills the site pane; phone/tablet keep device frames.
   *
   * This must NOT also key off flagshipCanvas — doing so previously forced full-bleed at every
   * device size for Maylecor/Russian and K-Direction projects, which made the mobile/tablet/desktop
   * switcher above the canvas a no-op for those projects (switching device changed editDevice-driven
   * section logic but the canvas never actually resized, so nothing visibly changed). Bug reported by
   * the user: "the desktop tablet and phone on top of the builder preview doesn't even work."
   */
  const wideCanvas = device === "desktop";

  // When the user switches to mobile/tablet, the canvas becomes an iframe (see below) so that
  // Tailwind responsive breakpoints fire against the iframe's real viewport, not the browser window.
  // This effect keeps the iframe's definition in sync with the Builder's current in-memory state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const iframe = previewIframeRef.current;
    if (!iframe || !canvasDefinition || wideCanvas) return;
    const send = () => {
      iframe.contentWindow?.postMessage(
        { type: "kebu:definition:update", definition: canvasDefinition, pageSlug: previewPageSlug },
        window.location.origin,
      );
    };
    // When the iframe signals it's ready, push the current definition immediately
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if ((e.data as { type?: string })?.type === "kebu:preview:ready") send();
    }
    window.addEventListener("message", onMessage);
    // Also push whenever definition or pageSlug changes (iframe may already be ready)
    send();
    return () => window.removeEventListener("message", onMessage);
  }, [canvasDefinition, previewPageSlug, wideCanvas]); // previewIframeRef is stable

  return (
    <DataModeProvider>
    <div
      className="relative flex h-dvh flex-col overflow-hidden"
      style={{ background: BUILDER.bg, color: BUILDER.ink }}
    >
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
        onUndo={() => void undo()}
        onRedo={() => void redo()}
        publishing={publishing || improving}
        publishLabel={publishState?.hasUnpublishedChanges ? "Publish" : "Publish"}
        onPublish={() => void publish()}
        onSaveDraft={() => void saveDraftNow()}
        savingDraft={saveState === "saving"}
        saveLabelColor={
          saveState === "error" ? "#CC1A1A"
          : saveState === "unsaved" || saveState === "queued" ? "#D97706"
          : saveState === "saved" ? "#009E40"
          : "#8C8C8C"
        }
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
        onYande={() => {
          setImproveMode("free");
          setYandeOpen((open) => !open);
        }}
        yandeOpen={yandeOpen}
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

      <main className="relative flex min-h-0 flex-1 w-full overflow-hidden pb-[calc(60px+env(safe-area-inset-bottom))] sm:pb-0">
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
            <aside
              className={`${
                leftPanelOpen
                  ? "fixed inset-0 w-full sm:relative sm:inset-auto sm:w-[268px] sm:max-w-[88vw]"
                  : "pointer-events-none fixed inset-0 opacity-0 sm:pointer-events-auto sm:opacity-100 sm:relative sm:inset-auto sm:w-0"
              } shrink-0 min-h-0 overflow-y-auto border-r sm:transition-[width] sm:duration-200 sm:ease-out`}
              style={{
                borderColor: BUILDER.border,
                background: BUILDER.surface,
                zIndex: leftPanelOpen ? Z_LAYERS.drawerPanel : undefined,
              }}
            >
              {/* Mobile only: editing takes the full screen (a fixed 280px sidebar squeezed the live
                  preview into an unreadable sliver — docs/product/KEBU-BUILDER-UX-STANDARD.md). "Done"
                  is the same dismissal already wired to the rail's toggle-tap behavior. */}
              <div
                className="sm:hidden sticky top-0 z-10 flex items-center justify-between border-b px-3 py-2.5"
                style={{ borderColor: BUILDER.border, background: BUILDER.surface }}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: BUILDER.muted }}>
                  Editing
                </span>
                <button
                  type="button"
                  onClick={() => setLeftPanelOpen(false)}
                  className="rounded-full px-4 py-1.5 text-xs font-bold text-white"
                  style={{ background: BUILDER.ink }}
                >
                  Done — view site
                </button>
              </div>

              {sidebarTab === "pages" && project ? (
                <div className="px-3 py-3">
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
                  onPagesChange={setPages}
                  onError={setError}
                />
                </div>
              ) : null}

              {sidebarTab === "media" && (
                <div>
                  <SiteAssetsPanel
                    projectId={projectId}
                    onUseOnSite={(asset) => void applyMediaAsset(asset)}
                  />
                </div>
              )}

              {sidebarTab === "layers" && (
                (() => {
                  const FREEFORM_TYPES = ["legally-blonde-hero", "maylecor-home", "maylecor-music", "kdirection-home"];
                  const hasFreeform = (s: { section_type: string; props: Record<string, unknown> }) =>
                    FREEFORM_TYPES.includes(s.section_type) ||
                    Array.isArray(s.props.extraCutouts) ||
                    Array.isArray(s.props.hiddenLayers);
                  const hero =
                    (selectedSectionId
                      ? editPageSections.find((s) => s.id === selectedSectionId && hasFreeform(s as { section_type: string; props: Record<string, unknown> }))
                      : null) ??
                    editPageSections.find((s) => hasFreeform(s as { section_type: string; props: Record<string, unknown> })) ??
                    sections.find((s) => hasFreeform(s as { section_type: string; props: Record<string, unknown> }));
                  if (!hero || !hasFreeform(hero as { section_type: string; props: Record<string, unknown> })) {
                    return (
                      <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: BUILDER.muted }} aria-hidden>
                          <rect x="3" y="3" width="18" height="4" rx="1" />
                          <rect x="3" y="10" width="18" height="4" rx="1" opacity="0.5" />
                          <rect x="3" y="17" width="18" height="4" rx="1" opacity="0.25" />
                        </svg>
                        <div>
                          <p className="text-[12px] font-semibold" style={{ color: BUILDER.ink }}>No layer canvas here</p>
                          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: BUILDER.muted }}>
                            Layer controls appear for template sections with stacked photos and cutouts.
                            Select a freeform section — like a Maylecor or May Lècor hero — on the canvas.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  const resolvedProps = mergeDeviceAwareSectionProps(
                    hero.props as Record<string, unknown>,
                    device,
                  );
                  return (
                    <BuilderLayersPanel
                      sectionId={hero.id}
                      props={resolvedProps}
                      selectedElement={selectedElement}
                      onSelect={(selection) => {
                        setSelectedSectionId(selection.sectionId);
                        setSelectedElement(selection);
                        setSidebarTab("content");
                        setLeftPanelOpen(true);
                      }}
                      onPatch={(patch) =>
                        applyDeviceAwarePatch(
                          updateProps,
                          hero.id,
                          hero.props as Record<string, unknown>,
                          device,
                          patch,
                        )
                      }
                    />
                  );
                })()
              )}

              {sidebarTab === "extensions" && (
                <div className="space-y-4">
                  <BuilderAppsPanel
                    projectId={projectId}
                    sectionTypes={editPageSections.map((section) => section.section_type)}
                    onAdd={async (type) => {
                      await addSection(type);
                      setSidebarTab("content");
                      setLeftPanelOpen(true);
                    }}
                  />
                  <div className="border-t px-3 pt-4" style={{ borderColor: BUILDER.border }}>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: BUILDER.muted }}>
                      Connections
                    </p>
                    <BuilderConnectionsPanel projectId={projectId} />
                  </div>
                  <div className="border-t px-3 pb-3 pt-4" style={{ borderColor: BUILDER.border }}>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: BUILDER.muted }}>
                      Blog
                    </p>
                    <BuilderBlogPanel projectId={projectId} />
                  </div>
                </div>
              )}

              {sidebarTab === "shop" && (
                <BuilderShopPanel
                  projectId={projectId}
                  commerce={seoSettings.commerce ?? {}}
                  onSaved={(next) => queueSiteSettingsSave({ seo: { commerce: next } })}
                  onActivated={(next) => {
                    setSeoSettings((current) => ({ ...current, commerce: next }));
                    void load();
                  }}
                />
              )}

              {sidebarTab === "history" && (
                <BuilderVersionHistoryPanel
                  projectId={projectId}
                  onRestored={async () => {
                    await load();
                  }}
                  onError={(msg) => setError(msg)}
                />
              )}

              {sidebarTab === "seo" && (
                <SiteDomainSeoPanel projectId={projectId} />
              )}


              {sidebarTab === "nav" && (
                <div className="px-4 py-4 space-y-4">
                  {chromeActive && siteChrome ? (
                    <BuilderSiteChromePanel
                      part="header"
                      chrome={siteChrome}
                      selected={selectedSectionId === CHROME_HEADER_ID}
                      onSelect={() => selectSectionForInspector(CHROME_HEADER_ID)}
                      onPatch={(patch) => updateChromeProps("header", patch)}
                      onRemove={() => void removeChromePart("header")}
                      projectId={projectId}
                      pages={pages}
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
                          pages={pages}
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
                    onClick={() => selectSectionForInspector(null)}
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
                    {selectedElement
                      ? selectedElement.label
                      : selectedSectionId === CHROME_HEADER_ID
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
                <div className="border-b px-3 py-2.5" style={{ borderColor: BUILDER.border }}>
                  <p className="text-[13px] font-semibold" style={{ color: BUILDER.ink }}>Sections</p>
                  <p className="text-[11px] leading-tight" style={{ color: BUILDER.muted }}>
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


              {!selectedSectionId && (
              <div className="px-2 py-1.5 space-y-1.5" style={{ background: "#ffffff" }}>

                {chromeActive && siteChrome ? (
                  <>
                    <BuilderSectionZone zone="top">
                      <BuilderSiteChromePanel
                        part="header"
                        chrome={siteChrome}
                        selected={selectedSectionId === CHROME_HEADER_ID}
                        onSelect={() => setSelectedSectionId(CHROME_HEADER_ID)}
                        onPatch={(patch) => updateChromeProps("header", patch)}
                        onRemove={() => void removeChromePart("header")}
                        projectId={projectId}
                        pages={pages}
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
                        onSelect={(id) => selectSectionForInspector(id)}
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
                        onSelect={() => selectSectionForInspector(CHROME_FOOTER_ID)}
                        onPatch={(patch) => updateChromeProps("footer", patch)}
                        onRemove={() => void removeChromePart("footer")}
                        projectId={projectId}
                        pages={pages}
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
              {selectedElement ? (
                (() => {
                  const section = sections.find((s) => s.id === selectedElement.sectionId);
                  if (!section) return null;
                  return (
                    <BuilderElementInspector
                      selection={selectedElement}
                      sectionProps={mergeDeviceAwareSectionProps(
                        section.props as Record<string, unknown>,
                        device,
                      )}
                      projectId={projectId}
                      device={device}
                      responsiveOverrideActive={hasDeviceOverrideKeys(
                        section.props as Record<string, unknown>,
                        device,
                        selectedElement.elementId === "titleLogo"
                          ? [
                              "title",
                              "titleAsText",
                              "titleTextFontFamily",
                              "titleTextFontSize",
                              "titleTextFontWeight",
                              "titleTextLetterSpacing",
                              "titleTextLineHeight",
                              "titleTextColor",
                              "layerScales",
                              "layerZIndex",
                              "layerOpacity",
                              "layerRotation",
                              "layerPositions",
                              "lockedLayers",
                            ]
                          : selectedElement.elementId === "heroCanvas"
                            ? ["sectionMinHeightPx"]
                            : selectedElement.elementId === "siteFooter"
                              ? ["embeddedFooterPaddingTop", "embeddedFooterPaddingBottom"]
                              : selectedElement.kind === "background"
                                ? ["backgroundLayer", "backgroundHidden"]
                                : [
                                    "extraCutouts",
                                    "layerScales",
                                    "layerZIndex",
                                    "layerOpacity",
                                    "layerRotation",
                                    "layerPositions",
                                    "hiddenLayers",
                                    "lockedLayers",
                                  ],
                      )}
                      onResetResponsive={(keys) =>
                        updateProps(
                          section.id,
                          clearDeviceOverrideKeys(
                            section.props as Record<string, unknown>,
                            device,
                            keys,
                          ),
                        )
                      }
                      onAskAi={() => {
                        setImproveInstruction(`Update only ${selectedElement.label}. `);
                        setImproveMode("free");
                        setYandeOpen(true);
                      }}
                      onPatch={(patch) =>
                        applyDeviceAwarePatch(
                          updateProps,
                          section.id,
                          section.props as Record<string, unknown>,
                          device,
                          patch,
                        )
                      }
                      onEditSection={() => setSelectedElement(null)}
                    />
                  );
                })()
              ) : null}

              {selectedSectionId && !selectedElement && editPageSections.filter((s) => s.id === selectedSectionId).map((section) => (
                <BuilderSectionInspector
                  key={section.id}
                  section={{
                    ...section,
                    props: mergeDeviceAwareSectionProps(
                      section.props as Record<string, unknown>,
                      device,
                    ),
                  }}
                  projectId={projectId}
                  pages={pages}
                  themeDisplayFont={(project?.theme as ThemeTokens | undefined)?.fontDisplay ?? previewDefinition?.theme?.fontDisplay}
                  themeBodyFont={(project?.theme as ThemeTokens | undefined)?.fontBody ?? previewDefinition?.theme?.fontBody}
                  onUpdateProps={(patch) =>
                    applyDeviceAwarePatch(
                      updateProps,
                      section.id,
                      section.props as Record<string, unknown>,
                      device,
                      patch,
                    )
                  }
                  responsiveDevice={device}
                  responsiveOverrideActive={hasDeviceOverrideKeys(
                    section.props as Record<string, unknown>,
                    device,
                    DEVICE_OVERRIDE_KEYS[section.section_type as keyof typeof DEVICE_OVERRIDE_KEYS] ?? [],
                  )}
                  onResetResponsive={() =>
                    updateProps(
                      section.id,
                      clearDeviceOverrideKeys(
                        section.props as Record<string, unknown>,
                        device,
                        DEVICE_OVERRIDE_KEYS[section.section_type as keyof typeof DEVICE_OVERRIDE_KEYS] ?? [],
                      ),
                    )
                  }
                  onMoveUp={() => void moveSection(section.id, -1)}
                  onMoveDown={() => void moveSection(section.id, 1)}
                  onDuplicate={() => void duplicateSection(section.id)}
                  onDelete={() => { if (window.confirm(`Remove "${labelForSectionType(section.section_type)}" from this page?`)) void deleteSection(section.id); }}
                />
              ))}
              </>
              )}
            </aside>

            <section
              className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              style={{
                background: maylecorRussianLayout
                  ? "#FFF1F6"
                  : kdirectionLayout
                    ? BUILDER.surfaceMuted
                    : BUILDER.bg,
              }}
            >
              <div
                className={`mx-auto flex min-h-0 flex-1 w-full ${
                  wideCanvas ? "overflow-y-auto p-2 sm:p-3" : "overflow-y-auto items-start p-4 sm:p-8"
                }`}
                onClick={(e) => {
                  if (e.target === e.currentTarget) selectSectionForInspector(null);
                }}
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
                          border: `1px solid ${BUILDER.border}`,
                          borderRadius: 12,
                          boxShadow: "0 8px 30px rgba(10,10,10,0.07)",
                          overflow: "hidden",
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
                          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
                        }
                  }
                >
                {canvasDefinition && wideCanvas && (
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
                {/* Mobile/tablet: iframe so Tailwind breakpoints fire against a real viewport of that
                    width, not the browser window. The Builder pushes the live definition via
                    postMessage (see useEffect above) so the preview tracks unsaved edits in real time. */}
                {canvasDefinition && !wideCanvas && (
                  <iframe
                    ref={previewIframeRef}
                    src={`/create/${projectId}/preview?embed=1`}
                    title={`${device} preview`}
                    style={{
                      width: "100%",
                      minHeight: device === "mobile" ? 700 : 900,
                      border: "none",
                      display: "block",
                    }}
                  />
                )}
                </div>
              </div>
            </section>
          </>
        )}

        {/* Yande is invoked from the editor chrome so it never covers site content. */}
        {/* Yande right-side sliding panel */}
        {yandeOpen ? (
          <>
            {/* click-outside backdrop (transparent) */}
            <div
              className="absolute inset-0 z-30"
              onClick={() => setYandeOpen(false)}
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 right-0 top-0 z-40 flex flex-col overflow-hidden border-l"
              style={{
                width: 300,
                background: "#FAFAFA",
                borderColor: "#E5E5E5",
                boxShadow: "-4px 0 24px rgba(0,0,0,0.10)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* panel header */}
              <div
                className="flex shrink-0 items-center justify-between border-b px-3 py-2.5"
                style={{ borderColor: "#E5E5E5" }}
              >
                <div className="flex items-center gap-2">
                  <YandeMark size={28} />
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: BUILDER.ink }}
                  >
                    Yande AI
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Close Yande"
                  onClick={() => setYandeOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md"
                  style={{ color: BUILDER.muted }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Mode selector */}
              {!aiPreview ? (
                <div
                  className="flex shrink-0 flex-wrap gap-1 border-b px-3 py-2"
                  style={{ borderColor: "#E5E5E5" }}
                >
                  {(
                    [
                      ["free", "Improve"],
                      ["redesign", "Redesign"],
                      ["page", "Page"],
                      ["rewrite", "Rewrite"],
                      ["convert", "Convert"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setImproveMode(id)}
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: improveMode === id ? BUILDER.ink : "#F0F0F0",
                        color: improveMode === id ? "#fff" : BUILDER.muted,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}

              {/* AI preview panel when active */}
              {aiPreview ? (
                <div className="shrink-0 border-b px-3 py-3" style={{ borderColor: "#E5E5E5" }}>
                  <BuilderAiPreviewPanel
                    intents={aiPreview.intents}
                    sectionChanges={aiPreview.sectionChanges}
                    acceptedSectionIds={aiPreview.acceptedSectionIds}
                    onApply={() => void applyAiPreview()}
                    onDiscard={discardAiPreview}
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
                    busy={improving}
                  />
                </div>
              ) : null}

              {/* Yande assistant input */}
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <YandeAssistant
                  variant="improve"
                  value={improveInstruction}
                  onChange={setImproveInstruction}
                  onSubmit={() => void (aiPreview ? applyAiPreview() : previewWithAi())}
                  busy={improving}
                  submitLabel={aiPreview ? "Apply" : "Preview"}
                />
                {improveNote ? (
                  <p
                    className="mt-3 rounded-xl px-3 py-2 text-[11px] leading-relaxed"
                    style={{ background: "#F4F4F5", color: BUILDER.muted }}
                  >
                    {improveNote}
                  </p>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
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

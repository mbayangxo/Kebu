"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKcdBuilder } from "./use-kcd-builder";
import { kcdPreviewUpdate } from "@/lib/create/kcd-preview-update";
import { buildIndex, isSpatialLocked, type KcdDocument } from "@/lib/creative-core";
import { builderNodeMoveOperations, primitiveDefinition, primitiveGeometryOperations, primitiveDuplicateOperation, primitivePropertyOperations } from "@/lib/create/kcd-primitive-operations";
import { reconcilePageNavigation } from "@/lib/create/kcd-page-navigation";
import type { NodeId, PageId } from "@/lib/creative-core";
import { previewDefinitionUpdate } from "@/lib/create/preview-definition-update";
import { documentToRows, type LegacySectionType } from "@/lib/create/kcd-adapter";
import { BuilderStudioChrome, BuilderStudioRail, type BuilderStudioTab } from "@/app/components/create/builder-studio-chrome";
import { BuilderAppearanceProvider, BuilderPanelScope } from "@/app/components/create/builder-appearance-provider";
import { BUILDER_PANEL } from "@/lib/create/builder-panel-appearance";
import { YandeMark } from "@/app/components/yande-mark";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { buildEditorPreviewDefinition, resolveEditorTheme } from "@/lib/create/editor-definition";
import { builderKcdDocumentView, builderKcdView } from "@/lib/create/kcd-adapter/builder-view";
import { createKcdRenderProjection } from "@/lib/create/kcd-adapter/render-view";
import type { RenderPath } from "@/lib/create/kcd-render-flag";
import { BUILDER, BUILDER_QUICK_SECTIONS, labelForSectionType } from "@/lib/create/builder-ui";
import { AddSectionPicker } from "@/app/components/create/add-section-picker";
import { BuilderBlogPanel } from "@/app/components/create/builder-blog-panel";
import {
  CHROME_FOOTER_ID,
  CHROME_HEADER_ID,
  isChromeSectionId,
  parseSiteChrome,
  projectUsesEmbeddedNav,
  type SiteChrome,
} from "@/lib/create/site-chrome";
import { defaultMaylecorNavLinks } from "@/lib/create/maylecor-nav";
import type { SiteSeo } from "@/lib/create/site-seo";
import { defaultSiteSeo } from "@/lib/create/site-seo";
import { mergeSiteCommerce } from "@/lib/create/site-commerce";
import { enqueueSaveSettings, flushOfflineQueue } from "@/lib/create/offline-queue";
import type { PublishState } from "@/lib/create/publish-state";
import { SectionPhotoField } from "@/app/components/create/section-photo-field";
import { BuilderBusinessNudge } from "@/app/components/create/builder-business-nudge";
import { BuilderEditablePreview } from "@/app/components/create/builder-editable-preview";
import { BuilderSectionListDnd } from "@/app/components/create/builder-section-list-dnd";
import { BuilderSectionZone } from "@/app/components/create/builder-section-zone";
import { BuilderFreeTextEditor, type FreeTextBlock } from "@/app/components/create/builder-free-text-editor";
import type { AiSectionChange } from "@/lib/create/ai-improve-merge";
import { mergePartialAiDefinition } from "@/lib/create/ai-improve-merge";
import { SiteMediaUpload } from "@/app/components/create/site-media-upload";
import { NavLinksEditor, mapNavLinksForEditor } from "@/app/components/create/nav-links-editor";
import { NavSizeEditor } from "@/app/components/create/nav-size-editor";
import { SocialLinksEditor } from "@/app/components/create/social-links-editor";
import type { ThemeTokens } from "@/lib/create/website-schema";
import { HERO_HEIGHT_OPTIONS, heroBackgroundPatch, heroBackgroundSwatch, heroPropsForCopy, normalizeLegacyHeroProps, resolveHeroHeight } from "@/lib/create/hero-section";
import {
  planMediaAssetApply,
  type KebuDragAsset,
} from "@/lib/create/builder-media-drop";
import { BUILDER_DEVICE_FRAME } from "@/lib/create/builder-device";
import { orderSectionsForDevice } from "@/lib/create/device-composition";
import { normalizeLegacyEditorialHeroProps } from "@/lib/create/editorial-hero-section";
import { projectUsesMaylecorRussianLayout } from "@/lib/create/maylecor-russian-hero";
import { defaultMaylecorKsendrProps } from "@/lib/create/maylecor-ksendr-defaults";
import { projectUsesKdirectionLayout } from "@/lib/create/kdirection-local-assets";
import { clampNavScale, parseNavLayout, parseNavSize } from "@/lib/create/nav-chrome-size";
import { mySiteDetailHref } from "@/lib/navigation/product-nav";
import {
  DataModeProvider,
} from "@/app/components/create/data-mode-provider";
import { builderPublishReceipt, builderSettingsReceipt, confirmBuilderDraftRefresh } from "@/lib/create/builder-write-receipts";
import { BuilderDraftActionGate, type BuilderSaveReadiness } from "@/lib/create/builder-save-readiness";
import { useProjectAutosave } from "./use-project-autosave";
import { Z_LAYERS } from "@/app/components/create/kebu-z-layers";
import { MobileActionBar } from "@/app/components/create/mobile-action-bar";
import { Sheet } from "@/app/components/create/sheet";
import { useBreakpoint } from "@/lib/create/use-breakpoint";
import { acquireScrollLock, releaseScrollLock } from "@/lib/create/scroll-lock";
import { useFocusTrap } from "@/lib/create/use-focus-trap";
import {
  deviceScopedPatch,
  getResponsiveState,
  markResponsiveCustom,
  mergeDeviceAwareSectionProps,
  storeAutoOverrides,
} from "@/lib/create/device-overrides";
import { generateDeviceOverrides, COMPOSABLE_SECTION_TYPES } from "@/lib/create/responsive-composer";

/**
 * Code-split the heaviest sidebar/panel views that are hidden behind a tab or a closed-by-default
 * panel on first load (docs/product/KEBU-BUILDER-UX-STANDARD.md: "zero code-splitting" finding).
 * Each of these only mounts once its gating condition (sidebarTab / aiPreview / yandeOpen) becomes
 * true, so its chunk is fetched on demand instead of shipping in the Builder's initial bundle.
 */
const KcdPrimitivePanel = dynamic(() => import("@/app/components/create/kcd/primitive-panel").then((module) => module.KcdPrimitivePanel));
const ExperienceDnaControls = dynamic(() => import("@/app/components/create/kcd/experience-dna-controls").then(module => module.ExperienceDnaControls));
const ExperienceEngineControls = dynamic(() => import("@/app/components/create/kcd/experience-engine-controls").then(module => module.ExperienceEngineControls));
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
const YandePanelBody = dynamic(
  () => import("@/app/components/create/yande-panel-body").then((m) => m.YandePanelBody),
  { ssr: false },
);

function SidebarDetails({ title, children, defaultOpen = true, group }: { title: string; children: import("react").ReactNode; defaultOpen?: boolean; group?: string }) {
  return (
    <details open={defaultOpen} name={group} className="group border-b" style={{ borderColor: "#E5E5E5" }}>
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
  document_schema_version?: string | null;
};

export default function ProjectEditorPage() {
  const params = useParams<{ id: string }>();
  return <ProjectEditor key={params.id} projectId={params.id} />;
}

function ProjectEditor({ projectId }: { projectId: string }) {
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftReloadRequired, setDraftReloadRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportAssist, setSupportAssist] = useState(false);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [payingHosting, setPayingHosting] = useState(false);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [subdomainInput, setSubdomainInput] = useState("");
  const [seoSettings, setSeoSettings] = useState<SiteSeo>(() => defaultSiteSeo());
  const [settingsState, setSettingsState] = useState<"idle" | "unsaved" | "saving" | "saved" | "error">("idle");
  const [settingsNote, setSettingsNote] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<BuilderStudioTab>("content");
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingThemeRef = useRef<ThemeTokens | null>(null);
  const settingsVersionRef = useRef(0);
  const pendingSettingsRef = useRef<{ subdomain?: string; seo?: SiteSeo; theme?: Partial<ThemeTokens> } | null>(null);
  // Ref to the iframe used for mobile/tablet device preview (see below)
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const previewSentRef = useRef<{ window: Window | null; definition: WebsiteDefinition; sequence: number; nativeDocument: KcdDocument | null } | null>(null);
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
  const [draftActionGate] = useState(() => new BuilderDraftActionGate());
  const [repairing, setRepairing] = useState(false);
  const [improveInstruction, setImproveInstruction] = useState("");
  const [yandeOpen, setYandeOpen] = useState(false);
  const yandeTriggerRef = useRef<HTMLButtonElement>(null);
  const [yandeDialOpen, setYandeDialOpen] = useState(true);
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
  const [mobileAddSectionOpen, setMobileAddSectionOpen] = useState(false);
  const [pages, setPages] = useState<Array<{ id: string; slug: string; title: string; sort_order: number; device_layouts?: unknown }>>([]);
  const [siteChrome, setSiteChrome] = useState<SiteChrome | null>(null);
  /** 3C: "kcd" renders the canvas through the Kebu Creative Core (QA flag; see lib/create/kcd-render-flag.ts). */
  const [renderPath, setRenderPath] = useState<RenderPath>("3b");
  const [previewPageSlug, setPreviewPageSlug] = useState("home");
  const [editPageId, setEditPageId] = useState("");
  const [publishState, setPublishState] = useState<PublishState | null>(null);
  const operationEditing = renderPath === "kcd" && project?.document_schema_version === "kcd-1";
  const operations = useKcdBuilder(projectId, (rows) => {
    setSections(rows.sections);
    setPages(rows.pages);
    const selected = rows.pages.find((page) => page.id === editPageId) ?? rows.pages[0];
    if (selected) { setEditPageId(selected.id); setPreviewPageSlug(selected.slug); }
    setPublishState((previous) => previous ? { ...previous, hasUnpublishedChanges: true } : previous);
  }, setError, async () => { setSiteChrome(await reconcilePageNavigation(projectId)); });
  const initializeOperations = operations.initialize;
  const prepareOperationReload = operations.prepareReload;
  const [appOrigin, setAppOrigin] = useState("");
  /**
   * Tracks which destructive sidebar action awaits inline confirmation.
   * Cleared automatically when the selected section changes so stale prompts
   * can never fire on the wrong section.
   */
  type ConfirmAction =
    | { kind: "remove"; sectionId: string }
    | { kind: "regenerate"; sectionId: string; deviceLabel: string }
    | { kind: "reset-auto"; sectionId: string; deviceLabel: string };
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmAction | null>(null);
  const bp = useBreakpoint();
  const leftPanelRef = useRef<HTMLElement | null>(null);
  const mobileAddSectionTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Focus-trap the left panel when it's open as a mobile/tablet overlay (below lg = 1024px).
  useFocusTrap(leftPanelRef, leftPanelOpen && bp !== "lg" && bp !== "xl");

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

  // Clear any pending inline confirmation when the selected section changes.
  useEffect(() => { setPendingConfirm(null); }, [selectedSectionId]);

  useEffect(() => {
    if (!previewFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    acquireScrollLock();
    return () => {
      window.removeEventListener("keydown", onKey);
      releaseScrollLock();
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

  // Scroll-lock + Escape for the left panel when it's a mobile/tablet overlay (below lg = 1024px).
  useEffect(() => {
    if (!(leftPanelOpen && bp !== "lg" && bp !== "xl")) return;
    acquireScrollLock();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLeftPanelOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      releaseScrollLock();
      document.removeEventListener("keydown", onKey, true);
    };
  }, [leftPanelOpen, bp]);

  // Global Cmd/Ctrl+Z = Undo, Cmd/Ctrl+Shift+Z = Redo.
  // Suppress when focus is inside a text-editing element so native browser undo still works there.
  // Use a ref so the event listener always dispatches to the latest undo/redo without re-registering.
  const undoRedoRef = useRef({ undo, redo });
  useEffect(() => { undoRedoRef.current = { undo, redo }; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "z") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      const editable = (e.target as HTMLElement | null)?.isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || editable) return;
      e.preventDefault();
      if (e.shiftKey) {
        undoRedoRef.current.redo();
      } else {
        undoRedoRef.current.undo();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await prepareOperationReload();
      // Fire project and billing fetches in parallel — billing only needs the project ID.
      const [res, billingRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`, { credentials: "include" }),
        fetch(`/api/projects/${projectId}/billing`, { credentials: "include" }),
      ]);
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/create/${projectId}`);
        return false;
      }
      if (res.status === 404) {
        setError("Project not found — or you do not have access.");
        setProject(null);
        return false;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load project.");
        return false;
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
      if (needsMaylecorFix && data.project?.document_schema_version !== "kcd-1") {
        const upRes = await fetch(`/api/projects/${projectId}/upgrade-maylecor`, {
          method: "POST",
          credentials: "include",
        });
        if (upRes.ok) {
          const res2 = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
          const data2 = await res2.json().catch(() => ({}));
          if (res2.ok) projectPayload = data2;
        }
      } else if (needsKdirectionFix && data.project?.document_schema_version !== "kcd-1") {
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
      setRenderPath(projectPayload.renderPath === "kcd" ? "kcd" : "3b");
      if (projectPayload.renderPath === "kcd" && projectPayload.project?.document_schema_version === "kcd-1") {
        setYandeDialOpen(false);
        await flushOfflineQueue();
        const documentResponse = await fetch(`/api/projects/${projectId}/operations`, { credentials: "include", cache: "no-store" });
        const documentPayload = await documentResponse.json().catch(() => ({}));
        if (!documentResponse.ok) throw new Error(typeof documentPayload.error === "string" ? documentPayload.error : "Could not load operation editing.");
        initializeOperations(documentPayload.document);
      }
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
      setDraftReloadRequired(false);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Network error. Retry.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [projectId, router, initializeOperations, prepareOperationReload]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // On unmount: flush any pending settings into the offline queue so they survive navigation.
  // Clears the debounce timer to prevent setState-after-unmount.
  useEffect(() => {
    return () => {
      if (settingsTimer.current) {
        clearTimeout(settingsTimer.current);
        settingsTimer.current = null;
      }
      const pending = pendingSettingsRef.current;
      if (pending) {
        try {
          enqueueSaveSettings({ projectId, ...pending });
        } catch {
          /* best-effort — queue may be full */
        }
        pendingSettingsRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function pushHistory(prev: Section[]) {
    setHistory((h) => [...h.slice(-19), prev]);
    setFuture([]);
  }

  const {
    saveState: legacySaveState,
    saveStatusLabel: legacySaveStatusLabel,
    kbSaveNote,
    updateProps: legacyUpdateProps,
    updateChromeProps,
    saveDraftNow: legacySaveDraftNow,
    writeHistorySnapshot,
    writeStructure,
    commitStructure,
    currentSections,
    markAllSaved,
    pendingTerminals,
    dismissTerminalItem,
    dismissAllTerminalItems,
    canPublishNow: legacyCanPublishNow,
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

  const sectionSaveState = operationEditing && operations.status !== "idle"
    ? operations.status === "saving" ? "saving" : operations.status === "queued" ? "queued" : "error"
    : operationEditing && legacySaveState === "idle" ? operations.pending ? "unsaved" : "saved" : legacySaveState;
  const sectionSaveStatusLabel = operationEditing && operations.status !== "idle"
    ? operations.status === "saving" ? "Saving draft…" : operations.message ?? "Save not confirmed"
    : operationEditing && legacySaveState === "idle" ? operations.pending ? "Unsaved changes" : "Draft saved" : legacySaveStatusLabel;
  const saveState = settingsState === "error" ? "error" : settingsState === "saving" ? "saving" : settingsState === "unsaved" ? "unsaved" : sectionSaveState;
  const saveStatusLabel = settingsState === "error" ? "Settings not saved — retry Save draft" : settingsState === "saving" ? "Saving site settings…" : settingsState === "unsaved" ? "Unsaved site settings" : sectionSaveStatusLabel;
  const canUndo = !draftReloadRequired && (operationEditing ? operations.canUndo : history.length > 0);
  const canRedo = !draftReloadRequired && (operationEditing ? operations.canRedo : future.length > 0);
  function updateProps(id: string, patch: Record<string, unknown>) {
    const document = operations.getDocument();
    if (operationEditing && document?.nodes[id as NodeId] && isSpatialLocked(document, id as NodeId)) { setError("Unlock this element or its container before editing."); return; }
    if (operationEditing && !isChromeSectionId(id)) operations.updateProps(id, patch);
    else legacyUpdateProps(id, patch);
  }
  async function saveDraftNow() {
    if (draftReloadRequired) { setError("Reload the updated draft before saving or applying more changes."); return; }
    if (settingsTimer.current) { clearTimeout(settingsTimer.current); settingsTimer.current = null; }
    if (operationEditing) await operations.flush();
    await legacySaveDraftNow();
    const pendingSettings = pendingSettingsRef.current;
    if (pendingSettings) {
      await persistSiteSettings(pendingSettings.subdomain ?? subdomainInput, pendingSettings.seo ?? seoSettings, pendingThemeRef.current ?? pendingSettings.theme);
    }
  }
  function canPublishNow(): BuilderSaveReadiness {
    if (draftReloadRequired) return { ok: false, reason: "Reload the updated draft before continuing." };
    if (pendingSettingsRef.current) return { ok: false, reason: "Site settings are not confirmed saved. Retry Save draft before continuing." };
    if (operationEditing && !operations.canPublish()) return { ok: false, reason: operations.message ?? "Wait for operation changes to finish saving before publishing." };
    return legacyCanPublishNow();
  }

  // Reconcile: when dismissTerminalItem marks a section as _needsServerReconcile,
  // trigger a full project reload so the editor shows authoritative server state.
  useEffect(() => {
    const needsReconcile = sections.some((s) => (s as unknown as Record<string, unknown>)._needsServerReconcile);
    if (needsReconcile) void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  // Updates per-device section ordering/visibility for the current page.
  // Writes to the project_pages.device_layouts column via PATCH.
  // Inspector edits made while Tablet/Phone is being edited are device edits: device-editable
  // keys go to deviceOverrides[device] (lib/create/device-overrides.ts deviceScopedPatch);
  // shared keys stay base. Desktop and site-chrome edits are base edits.
  function updateSectionPropsForDevice(sectionId: string, patch: Record<string, unknown>) {
    const base = sections.find((s) => s.id === sectionId);
    if (!base || device === "desktop" || isChromeSectionId(sectionId)) {
      updateProps(sectionId, patch);
      return;
    }
    updateProps(sectionId, deviceScopedPatch(base.section_type, base.props, device, patch));
  }

  async function updatePageDeviceLayouts(
    pageId: string,
    patch: { tablet?: { sectionOrder?: string[]; hiddenSections?: string[] } | null; mobile?: { sectionOrder?: string[]; hiddenSections?: string[] } | null },
  ) {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    if (operationEditing) {
      try {
        await operations.submit("Edit device layout", Object.entries(patch).map(([device, composition]) => ({
          op: "setDeviceComposition", pageId: pageId as PageId, device: device as "tablet" | "mobile",
          composition: composition == null ? null : {
            ...(composition.sectionOrder ? { order: composition.sectionOrder as NodeId[] } : {}),
            ...(composition.hiddenSections ? { hidden: composition.hiddenSections as NodeId[] } : {}),
          },
        })));
      } catch (error) { setError(error instanceof Error ? error.message : "Could not save device layout."); }
      return;
    }
    const current = (page.device_layouts ?? {}) as { tablet?: unknown; mobile?: unknown };
    const next = { ...current, ...patch };
    // Optimistic update
    setPages((prev) => prev.map((p) => p.id === pageId ? { ...p, device_layouts: next } : p));
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, deviceLayouts: next }),
      });
      if (!res.ok) {
        // Roll back optimistic update on failure
        setPages((prev) => prev.map((p) => p.id === pageId ? { ...p, device_layouts: current } : p));
      } else {
        const json = await res.json().catch(() => ({}));
        if (json.page) {
          setPages((prev) => prev.map((p) => p.id === pageId ? { ...p, ...json.page } : p));
        }
      }
    } catch {
      setPages((prev) => prev.map((p) => p.id === pageId ? { ...p, device_layouts: current } : p));
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
          : defaultMaylecorNavLinks();
      nextProps = {
        brand: project?.title?.trim() || "My site",
        links,
      };
    }
    // Ordered with every other write of section rows (autosaves, Undo/Redo, Remove).
    if (operationEditing) {
      if (!page) { setError("No page to add this section to."); return null; }
      try {
        const id = await operations.add(page.id, type as LegacySectionType, nextProps, insertAfterSectionId);
        const document = operations.getDocument();
        const row = document ? documentToRows(document).sections.find((section) => section.id === id) : null;
        if (!row) throw new Error("Could not confirm the added section.");
        setSelectedSectionId(id); setSidebarTab("content");
        return { ...row, props: row.props as Record<string, unknown> };
      } catch (error) { setError(error instanceof Error ? error.message : "Could not add section."); return null; }
    }
    const added = await writeStructure(async () => {
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
      return data as { section: Section; shifted?: { id: string; sort_order: number }[] };
    });
    if (!added) return null;
    const section = added.section;
    // The server moved later siblings down to make room; apply the same positions locally.
    const shifted = new Map((added.shifted ?? []).map((r) => [r.id, r.sort_order]));
    commitStructure((prev) =>
      [...prev.map((s) => (shifted.has(s.id) ? { ...s, sort_order: shifted.get(s.id)! } : s)), section].sort(
        (a, b) => a.sort_order - b.sort_order,
      ),
    );
    setSelectedSectionId(section.id);
    setSidebarTab("content");
    return section;
  }

  async function duplicateSection(sectionId: string) {
    const lockDocument = operations.getDocument();
    if (operationEditing && lockDocument?.nodes[sectionId as NodeId] && isSpatialLocked(lockDocument, sectionId as NodeId)) { setError("Unlock this element or its container before editing."); return; }
    const document = operations.getDocument();
    const native = operationEditing && document?.nodes[sectionId as NodeId];
    if (native && !native.type.startsWith("legacy-section:")) {
      try { await operations.submit("Duplicate element", [primitiveDuplicateOperation(document!, native.id)]); }
      catch (error) { setError(error instanceof Error ? error.message : "Could not duplicate element."); }
      return;
    }
    const source = sections.find((s) => s.id === sectionId);
    if (!source) return;
    // Insert the duplicate immediately after the original, not appended at the end.
    const props = source.section_type === "hero" ? heroPropsForCopy(source.props) : { ...source.props };
    await addSection(source.section_type, props, sectionId);
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
    const document = operations.getDocument();
    const native = operationEditing && selectedSectionId ? document?.nodes[selectedSectionId as NodeId] : undefined;
    if (native?.type === "image") {
      if (document && isSpatialLocked(document, native.id)) { setError("Unlock this element or its container before editing."); return; }
      if (asset.kind !== "image") { setError("Choose an image for this element."); return; }
      try { await operations.submit("Change image", primitivePropertyOperations(native, device, "src", asset.url)); }
      catch (error) { setError(error instanceof Error ? error.message : "Could not change image."); }
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
    const lockDocument = operations.getDocument();
    if (operationEditing && lockDocument?.nodes[sectionId as NodeId] && isSpatialLocked(lockDocument, sectionId as NodeId)) { setError("Unlock this element or its container before editing."); return; }
    if (operationEditing) {
      try {
        await operations.submit("Remove section", [{ op: "removeNode", id: sectionId as NodeId }]);
        setSelectedSectionId((previous) => previous === sectionId ? null : previous);
      } catch (error) { setError(error instanceof Error ? error.message : "Could not remove section."); }
      return;
    }
    // Ordered with every other write; the section's pending autosave is dropped (Undo restores it).
    const removed = await writeStructure(
      async () => {
        const res = await fetch(`/api/projects/${projectId}/sections`, {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId }),
        });
        return res.ok;
      },
      { removing: sectionId },
    );
    if (!removed) {
      setError("Could not delete section.");
      return;
    }
    commitStructure((prev) => prev.filter((s) => s.id !== sectionId));
    // Clear selection so the sidebar doesn't show a stale inspector for the deleted section.
    setSelectedSectionId((prev) => (prev === sectionId ? null : prev));
  }

  async function reorderSections(orderedIds: string[]) {
    if (operationEditing) {
      try {
        const document = operations.getDocument();
        if (!document) throw new Error("The document is not ready.");
        const roots = buildIndex(document).children(editPageId as PageId, null);
        const movable = (node: { type: string }) => node.type.startsWith("legacy-section:") && (!chromeActive || !["legacy-section:navigation", "legacy-section:footer"].includes(node.type));
        const legacy = roots.filter(movable);
        if (orderedIds.length !== legacy.length || new Set(orderedIds).size !== legacy.length || legacy.some((node) => !orderedIds.includes(node.id))) throw new Error("The page changed. Reload before reordering.");
        let position = 0;
        const completeOrder = roots.map((node) => movable(node) ? orderedIds[position++] : node.id);
        await operations.reorder(editPageId, completeOrder);
      }
      catch (error) { setError(error instanceof Error ? error.message : "Could not reorder sections."); }
      return;
    }
    // Single atomic request — assigns dense rank (0, 1, 2…) server-side, eliminating
    // the N-concurrent-PATCH read-then-write race.
    await fetch(`/api/projects/${projectId}/sections/reorder`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
    await load();
  }

  async function moveSection(sectionId: string, direction: -1 | 1) {
    const lockDocument = operations.getDocument();
    if (operationEditing && lockDocument?.nodes[sectionId as NodeId] && isSpatialLocked(lockDocument, sectionId as NodeId)) { setError("Unlock this element or its container before editing."); return; }
    if (operationEditing) {
      try {
        const document = operations.getDocument();
        if (!document) throw new Error("The document is not ready.");
        const moves = builderNodeMoveOperations(document, sectionId as NodeId, direction);
        if (moves.length) await operations.submit("Move section", moves);
      } catch (error) { setError(error instanceof Error ? error.message : "Could not move section."); }
      return;
    }
    const ordered = [...sections]
      .filter((s) => s.page_id === editPageId)
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = ordered.findIndex((s) => s.id === sectionId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
    // Build the new desired order after the swap, then use the atomic reorder endpoint.
    const newOrdered = [...ordered];
    [newOrdered[idx], newOrdered[swapIdx]] = [newOrdered[swapIdx]!, newOrdered[idx]!];
    const newOrderedIds = newOrdered.map((s) => s.id);
    if (operationEditing) { await reorderSections(newOrderedIds); return; }
    // Optimistic UI update using dense rank matching the new order (one Undo step); the server
    // write is ordered with every other write, so an Undo right after cannot be overtaken by it.
    commitStructure((prev) =>
      prev.map((s) => {
        const newIdx = newOrderedIds.indexOf(s.id);
        if (newIdx === -1) return s;
        return { ...s, sort_order: newIdx };
      }),
    );
    const moved = await writeStructure(async () => {
      const res = await fetch(`/api/projects/${projectId}/sections/reorder`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: newOrderedIds }),
      });
      return res.ok;
    });
    if (!moved) setError("Could not move section — reload to see the saved order.");
  }

  // Undo/Redo: plain state updates (React may call updater functions more than once, which sent
  // duplicate batch writes); the autosave hook writes the snapshot in order with every other save
  // of section props (lib/create/section-save-coordinator.ts).
  function undo() {
    if (operationEditing) { void operations.travel("undo"); return; }
    if (history.length === 0) return;
    const prev = history[history.length - 1]!;
    const current = currentSections();
    setHistory(history.slice(0, -1));
    setFuture([current, ...future]);
    setSections(prev);
    void writeHistorySnapshot(prev, current);
  }

  function redo() {
    if (operationEditing) { void operations.travel("redo"); return; }
    if (future.length === 0) return;
    const next = future[0]!;
    const current = currentSections();
    setFuture(future.slice(1));
    setHistory([...history, current]);
    setSections(next);
    void writeHistorySnapshot(next, current);
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

  function persistSiteSettings(nextSubdomain: string, nextSeo: SiteSeo, themePatch?: Partial<ThemeTokens>) {
    const version = settingsVersionRef.current;
    return writeStructure(() => sendSiteSettings(nextSubdomain, nextSeo, themePatch, version));
  }

  async function sendSiteSettings(nextSubdomain: string, nextSeo: SiteSeo, themePatch: Partial<ThemeTokens> | undefined, version: number) {
    if (version !== settingsVersionRef.current) return false;
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
      if (version !== settingsVersionRef.current) return false;
      if (!res.ok) {
        setSettingsState("error");
        setError(typeof data.error === "string" ? data.error : "Could not save site settings.");
        return false;
      }
      if (typeof data.httpsUrl === "string" && data.httpsUrl.startsWith("http")) {
        setPublishUrl(data.httpsUrl);
      } else if (data.project?.subdomain) {
        setPublishUrl(`/sites/${data.project.subdomain}`);
      }
      if (data.project?.subdomain) {
        setSubdomainInput(String(data.project.subdomain));
      }
      if (!builderSettingsReceipt(data, projectId)) {
        setSettingsState("error");
        setError("Settings save response was incomplete. Retry Save draft before continuing.");
        return false;
      }
      pendingSettingsRef.current = null;
      pendingThemeRef.current = null;
      setSettingsState("saved");
      setSettingsNote(
        typeof data.message === "string" ? data.message : "Site settings saved to Supabase.",
      );
      if (data.project?.theme && typeof data.project.theme === "object") {
        setProject((prev) => (prev ? { ...prev, theme: data.project.theme as ThemeTokens } : prev));
      }
      return true;
    } catch {
      if (version !== settingsVersionRef.current) return false;
      setSettingsState("error");
      setError("Network error while saving site settings.");
      return false;
    }
  }

  function queueSiteSettingsSave(patch: { subdomain?: string; seo?: Partial<SiteSeo>; theme?: Partial<ThemeTokens> }) {
    settingsVersionRef.current++;
    setSettingsState("unsaved");
    setSettingsNote(null);
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

    // Track pending settings so unmount can flush them to the offline queue.
    pendingSettingsRef.current = {
      subdomain: nextSubdomain.trim() || undefined,
      seo: nextSeo,
      theme: patch.theme,
    };

    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => {
      // Do NOT clear pendingSettingsRef here — the unmount cleanup owns the ref.
      // Clearing it here creates a race: if unmount fires between the timer
      // callback clearing the ref and the cleanup running, the edit is silently dropped.
      settingsTimer.current = null;
      const subdomainValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSubdomain.trim()) && nextSubdomain.trim().length >= 3;
      const themeToSave = pendingThemeRef.current ?? undefined;
      void persistSiteSettings(
        subdomainValid ? nextSubdomain.trim().toLowerCase() : subdomainInput.trim().toLowerCase(),
        nextSeo,
        themeToSave,
      );
    }, 600);
  }

  async function publish() {
    if (publishing || draftActionGate.busy) return;
    if (!subdomainInput.trim()) {
      setError("Set your Kebu site address under Domain & SEO before publishing.");
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      const outcome = await draftActionGate.run({ save: saveDraftNow, readiness: canPublishNow, action: async () => {
        if (!await persistSiteSettings(subdomainInput.trim(), seoSettings)) return;
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
        const path = builderPublishReceipt(data, subdomainInput.trim().toLowerCase());
        if (!path) {
          setDraftReloadRequired(true);
          setError("Publish response was incomplete. Reload the draft to check its live status before retrying.");
          return;
        }
        setPublishUrl(path);
        await load();
      } });
      if (outcome.status === "blocked") setError(outcome.reason);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Network error while publishing.");
    } finally {
      setPublishing(false);
    }
  }

  async function previewWithAi() {
    if (improving || draftActionGate.busy) return;
    setImproving(true);
    setError(null);
    setImproveNote(null);
    try {
      const outcome = await draftActionGate.run({ save: saveDraftNow, readiness: canPublishNow, action: async () => {
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
      } });
      if (outcome.status === "blocked") setError(outcome.reason);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Network error while previewing. Retry.");
    } finally {
      setImproving(false);
    }
  }

  async function applyAiPreview() {
    if (improving || !aiPreview || draftActionGate.busy) return;
    if (aiPreview.sectionChanges.length > 0 && aiPreview.acceptedSectionIds.size === 0) {
      setError("Select at least one section to apply.");
      return;
    }
    setImproving(true);
    setError(null);
    try {
      const outcome = await draftActionGate.run({ save: saveDraftNow, readiness: canPublishNow, action: async () => {
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
        if (data.applied !== true) {
          setAiPreview(null);
          setDraftReloadRequired(true);
          setError("Apply response was incomplete. Reload the draft to check whether changes were saved.");
          return;
        }
        setAiPreview(null);
        setImproveNote(
          typeof data.message === "string"
            ? data.message
            : "Draft updated. Publish again to update your live site.",
        );
        setDraftReloadRequired(true);
        const loaded = await confirmBuilderDraftRefresh(load, () => {
          setHistory([]);
          setFuture([]);
          markAllSaved();
        });
        if (!loaded) {
          setImproveNote("Changes were saved, but the updated draft could not be loaded. Reload before editing.");
          return;
        }
      } });
      if (outcome.status === "blocked") setError(outcome.reason);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Network error while applying changes. Retry.");
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

  const changeSpatial = useCallback(async (id: string, patch: unknown) => {
    const document = operations.getDocument();
    if (!operationEditing || !document) throw new Error("Native editing is unavailable.");
    await operations.submit("Change element layout", primitiveGeometryOperations(document, id as NodeId, device, patch));
  }, [operationEditing, operations, device]);

  const canvasEditor = {
    onSpatialChange: operationEditing ? changeSpatial : undefined,
    selectedSectionId,
    editDevice: device,
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
      // Route canvas "Remove" through the same inline confirmation as the sidebar —
      // selects the section and arms the confirm state so the sidebar shows "Remove? / Cancel / Remove".
      setSelectedSectionId(id);
      setSidebarTab("content");
      setLeftPanelOpen(true);
      setPendingConfirm({ kind: "remove", sectionId: id });
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

  const projectKcdRender = useMemo(() => createKcdRenderProjection(true), []);
  const kcdView = useMemo(
    () =>
      project && renderPath === "kcd"
        ? operationEditing && operations.document
          ? builderKcdDocumentView(operations.document, { ...project, seo: seoSettings }, siteChrome, projectKcdRender)
          : builderKcdView({ project: { ...project, seo: seoSettings }, siteChrome, pages, sections })
        : null,
    [project, renderPath, seoSettings, pages, sections, siteChrome, operationEditing, operations.document, projectKcdRender],
  );
  const kcdRenderError = kcdView && !kcdView.ok ? kcdView.error : null;

  const previewDefinition = useMemo<WebsiteDefinition | null>(
    () => {
      if (!project) return null;
      if (kcdView) return kcdView.ok ? kcdView.definition : null;
      return buildEditorPreviewDefinition({ ...project, seo: seoSettings }, pages, sections, siteChrome);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project, kcdView, seoSettings, pages, sections, siteChrome],
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

  const editPageSections = useMemo(
    () =>
      sections
        .filter((s) => s.page_id === editPageId)
        .filter((s) => !operationEditing || operations.document?.nodes[s.id as NodeId]?.type.startsWith("legacy-section:"))
        .filter((s) => !chromeActive || (s.section_type !== "navigation" && s.section_type !== "footer"))
        .sort((a, b) => a.sort_order - b.sort_order),
    [sections, editPageId, chromeActive, operationEditing, operations.document],
  );

  // Device-specific section order from page.device_layouts
  const editPage = pages.find((p) => p.id === editPageId);
  const editPageDeviceLayoutsRaw = editPage?.device_layouts;
  const editPageDeviceLayouts = useMemo(
    () => (editPageDeviceLayoutsRaw ?? {}) as { tablet?: { sectionOrder?: string[]; hiddenSections?: string[] }; mobile?: { sectionOrder?: string[]; hiddenSections?: string[] } },
    [editPageDeviceLayoutsRaw],
  );
  const activeDeviceLayout = device !== "desktop" ? editPageDeviceLayouts[device as "tablet" | "mobile"] : undefined;
  // For device mode: sections in device-specific order (device_layouts.sectionOrder overrides sort_order)
  const deviceOrderedSections = useMemo(
    () => orderSectionsForDevice(editPageSections, editPageDeviceLayouts, device),
    [editPageSections, editPageDeviceLayouts, device],
  );

  // The inspector shows the selected section as it appears on the edited device.
  const inspectorSections = useMemo(
    () =>
      editPageSections
        .filter((s) => s.id === selectedSectionId)
        .map((s) => ({
          ...s,
          baseProps: s.props,
          // Hero: show legacy template fields (backgroundImageUrl, overlay, primaryCta) as the
          // canonical values the canvas renders.
          props: mergeDeviceAwareSectionProps(
            s.section_type === "hero"
              ? (normalizeLegacyHeroProps(s.props) as Record<string, unknown>)
              : s.section_type === "editorial-hero"
                ? (normalizeLegacyEditorialHeroProps(s.props) as Record<string, unknown>)
                : s.props,
            device,
          ),
        })),
    [editPageSections, selectedSectionId, device],
  );

  // Reorder sections for the current non-desktop device by writing to device_layouts
  function moveDeviceSection(sectionId: string, direction: -1 | 1) {
    if (operationEditing) {
      const document = operations.getDocument();
      if (!document) { setError("The document is not ready."); return; }
      const moves = builderNodeMoveOperations(document, sectionId as NodeId, direction, device);
      if (moves.length) void operations.submit("Move section on device", moves).catch((error) => setError(error instanceof Error ? error.message : "Could not move section."));
      return;
    }
    const ordered = deviceOrderedSections;
    const idx = ordered.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= ordered.length) return;
    const newOrder = ordered.map((s) => s.id);
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
    if (editPageId) {
      void updatePageDeviceLayouts(editPageId, {
        [device]: { ...(activeDeviceLayout ?? {}), sectionOrder: newOrder },
      });
    }
  }

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
  const nativePreviewDocument = kcdView?.ok && !aiPreview ? kcdView.nativeDocument ?? null : null;

  // When the user switches to mobile/tablet, the canvas becomes an iframe (see below) so that
  // Tailwind responsive breakpoints fire against the iframe's real viewport, not the browser window.
  // This effect keeps the iframe's definition AND edited device in sync with the Builder's
  // in-memory state. Tablet↔Phone switches keep the same iframe (only wideCanvas changes it),
  // so `device` must be a dependency or the iframe keeps rendering the previous device.
  useEffect(() => {
    const iframe = previewIframeRef.current;
    if (!iframe || !canvasDefinition || wideCanvas) return;
    const send = (full = false) => {
      const target = iframe.contentWindow;
      if (!target) return;
      const previous = previewSentRef.current;
      const base = previous?.sequence ?? 0;
      const sequence = base + 1;
      const update = previewDefinitionUpdate(!full && previous?.window === target ? previous.definition : null,
        canvasDefinition, sequence, base);
      const nativeUpdate = kcdPreviewUpdate(!full && previous?.window === target ? previous.nativeDocument : null, nativePreviewDocument, sequence, base);
      target.postMessage({ type: "kebu:definition:patch", update, nativeUpdate, pageSlug: previewPageSlug, editDevice: device, selectedNodeId: selectedSectionId }, window.location.origin);
      previewSentRef.current = { window: target, definition: canvasDefinition, sequence, nativeDocument: nativePreviewDocument };
    };
    // When the iframe signals it's ready, push the current definition immediately
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.source !== iframe?.contentWindow) return;
      const message = e.data as { type?: string; nodeId?: string; patch?: unknown; requestId?: string };
      if (message?.type === "kebu:preview:ready") send(true);
      else if (message?.type === "kebu:node:geometry" && typeof message.nodeId === "string" && typeof message.requestId === "string" && message.requestId.length <= 100) {
        const reply = (error?: string) => iframe?.contentWindow?.postMessage({ type: "kebu:geometry:ack", requestId: message.requestId, ...(error ? { error } : {}) }, window.location.origin);
        void changeSpatial(message.nodeId, message.patch).then(() => reply()).catch(error => {
          const text = error instanceof Error ? error.message : "The layout edit could not be saved."; setError(text); reply(text);
        });
      }
      else if (message?.type === "kebu:node:select" && typeof message.nodeId === "string") {
        // Legacy-only KCD pages still have canonical selectable roots, before conversion adds native content.
        const selectionDocument = nativePreviewDocument ?? (operationEditing ? operations.document : undefined);
        const selected = selectionDocument?.nodes[message.nodeId as NodeId];
        if (selected) {
          setSelectedSectionId(message.nodeId); setSidebarTab("content"); setLeftPanelOpen(true);
          setEditPageId(selected.pageId);
        }
      }
    }
    window.addEventListener("message", onMessage);
    // Also push whenever definition, page or device changes (iframe may already be ready)
    send();
    return () => window.removeEventListener("message", onMessage);
  }, [canvasDefinition, nativePreviewDocument, operationEditing, operations.document, previewPageSlug, wideCanvas, device, selectedSectionId, changeSpatial]); // previewIframeRef is stable

  return (
    <DataModeProvider>
    <BuilderAppearanceProvider>
    <div
      className="relative flex h-dvh flex-col overflow-hidden"
      inert={improving || publishing}
      aria-busy={improving || publishing}
      style={{ background: BUILDER.bg, color: BUILDER.ink }}
    >
      {draftReloadRequired ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 border-b border-amber-400 bg-amber-50 px-4 py-2 text-xs text-amber-950">
          <p>The current draft needs to be reloaded before editing or publishing again.</p>
          <button type="button" className="min-h-11 rounded border border-amber-800 px-3 font-semibold" onClick={() => void load()}>Reload updated draft</button>
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
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        publishing={publishing || improving}
        publishLabel={publishState?.hasUnpublishedChanges ? "Publish" : "Publish"}
        onPublish={() => void publish()}
        onSaveDraft={() => void saveDraftNow()}
        savingDraft={saveState === "saving"}
        saveLabelColor={
          saveState === "needs-attention" || saveState === "error" ? "#CC1A1A"
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

      {pendingTerminals.length > 0 ? (
        <div
          className="border-b px-4 py-2.5 text-xs"
          style={{ background: "#FFF1F0", borderColor: "#FCA5A5", color: "#7F1D1D" }}
          role="alert"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <strong>Action required — {pendingTerminals.length} change{pendingTerminals.length !== 1 ? "s" : ""} could not be saved</strong>
              <ul className="mt-1 space-y-0.5">
                {pendingTerminals.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <span>{t.description}{t.lastError ? ` (${t.lastError})` : ""}</span>
                    <button
                      type="button"
                      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ background: "#FCA5A5", color: "#7F1D1D" }}
                      onClick={() => dismissTerminalItem(t.id)}
                    >
                      Discard
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className="shrink-0 rounded px-2 py-1 text-[11px] font-semibold"
              style={{ background: "#FCA5A5", color: "#7F1D1D" }}
              onClick={() => dismissAllTerminalItems()}
            >
              Dismiss all
            </button>
          </div>
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
        ) : error && (!project || (operationEditing && !operations.document)) ? (
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
              ref={leftPanelRef}
              aria-label="Section editor"
              aria-modal={leftPanelOpen && (bp === "xs" || bp === "sm" || bp === "md") ? true : undefined}
              className={`${
                !leftPanelOpen
                  ? "hidden lg:hidden"
                  : bp === "xs" || bp === "sm"
                    ? "fixed inset-0 w-full z-[900]"
                    : bp === "md"
                      ? "fixed inset-y-0 left-0 right-auto w-[300px] z-[900]"
                      : "relative w-[280px]"
              } shrink-0 min-h-0 overflow-y-auto border-r`}
              style={{
                borderColor: "#E5E5E5",
                background: "#FAFAFA",
                zIndex: leftPanelOpen && (bp === "xs" || bp === "sm" || bp === "md") ? Z_LAYERS.drawerPanel : undefined,
              }}
            >
              {/* Mobile/tablet overlay: "Done" dismisses back to canvas. Hidden when docked at lg+. */}
              <div
                className="lg:hidden sticky top-0 z-20 flex h-[52px] items-center justify-between border-b px-3 py-2.5"
                style={{ borderColor: "#E5E5E5", background: "#FAFAFA" }}
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
                  busy={operationEditing && (operations.pending || operations.navigationBusy)}
                  pageOperations={operationEditing ? {
                    add: operations.addPage,
                    update: (pageId, title, slug) => operations.submit("Edit page", [{ op: "updatePage", pageId: pageId as PageId, title, slug }]),
                    remove: (pageId) => operations.submit("Remove page", [{ op: "removePage", pageId: pageId as PageId }]),
                    reorder: operations.reorderPages,
                  } : undefined}
                  onRefresh={async () => { await load(); }}
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
                      if (hero.section_type === "hero") return String(hero.props.image ?? "");
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
                        // Resolved like the canvas and publish: a stored theme of '{}' (the column
                        // default) has no accent/primary, and the Colors panel reads them.
                        theme={resolveEditorTheme(project?.theme)}
                        onThemeChange={(patch) => queueSiteSettingsSave({ theme: patch })}
                        extras={{
                          projectId,
                          heroAccent:
                            hero?.section_type === "legally-blonde-hero"
                              ? String(hero.props.accentColor ?? "#E9006B")
                              : String(hero?.props.accentColor ?? (project?.theme as ThemeTokens)?.accent ?? "#E9006B"),
                          heroBackground: heroBg,
                          brandLogo,
                          // The standard Hero renders neither accentColor nor chromeLogo — no no-op controls for it.
                          onHeroAccentChange: hero && hero.section_type !== "hero"
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
                                  updateProps(hero.id, heroBackgroundPatch(url));
                                  return;
                                }
                                updateProps(hero.id, { backgroundImage: url });
                              }
                            : undefined,
                          onBrandLogoChange: hero?.section_type === "hero" ? undefined : (url) => {
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


              <div hidden={sidebarTab !== "content"}>
                {operationEditing && operations.document ? <ExperienceDnaControls key={projectId} projectId={projectId} disabled={false} /> : null}
                {operationEditing && operations.document && editPageId ? <ExperienceEngineControls key={`engine:${projectId}`} document={operations.document} pageId={editPageId} selectedId={selectedSectionId} disabled={operations.status !== "idle" || operations.pending} submit={operations.submitReviewed} /> : null}
              </div>
              {sidebarTab === "content" && (
              <>
              {/* Shopify-style drill-down breadcrumb: shown when a section is selected */}
              {selectedSectionId ? (
                <div
                  className="sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-3"
                  style={{ background: BUILDER.surface, borderColor: BUILDER.border, top: bp === "xs" || bp === "sm" || bp === "md" ? 52 : 0 }}
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
                        : (operations.document?.nodes[selectedSectionId as NodeId] && primitiveDefinition(operations.document.nodes[selectedSectionId as NodeId])?.displayName) || labelForSectionType(
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
                        sections={deviceOrderedSections.map((s) => ({
                          id: s.id,
                          section_type: s.section_type,
                          sort_order: s.sort_order,
                          hidden: Boolean(s.props.hidden),
                          props: s.props as Record<string, unknown>,
                        }))}
                        selectedSectionId={selectedSectionId}
                        onSelect={(id) => setSelectedSectionId(id)}
                        onReorder={device === "desktop" ? (ids) => void reorderSections(ids) : () => {}}
                        onMoveUp={(id) => device === "desktop" ? void moveSection(id, -1) : moveDeviceSection(id, -1)}
                        onMoveDown={(id) => device === "desktop" ? void moveSection(id, 1) : moveDeviceSection(id, 1)}
                        onRemove={(id) => { setSelectedSectionId(id); setSidebarTab("content"); setPendingConfirm({ kind: "remove", sectionId: id }); }}
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
                      sections={deviceOrderedSections.map((s) => ({
                        id: s.id,
                        section_type: s.section_type,
                        sort_order: s.sort_order,
                        hidden: Boolean(s.props.hidden),
                        props: s.props as Record<string, unknown>,
                      }))}
                      selectedSectionId={selectedSectionId}
                      onSelect={(id) => setSelectedSectionId(id)}
                      onReorder={device === "desktop" ? (ids) => void reorderSections(ids) : () => {}}
                      onMoveUp={(id) => device === "desktop" ? void moveSection(id, -1) : moveDeviceSection(id, -1)}
                      onMoveDown={(id) => device === "desktop" ? void moveSection(id, 1) : moveDeviceSection(id, 1)}
                      onRemove={(id) => { setSelectedSectionId(id); setSidebarTab("content"); setPendingConfirm({ kind: "remove", sectionId: id }); }}
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
              {operationEditing && operations.document && editPageId ? <BuilderPanelScope><KcdPrimitivePanel
                key={`${editPageId}:${selectedSectionId ?? "list"}:${device}`}
                document={operations.document} pageId={editPageId as PageId} device={device}
                selectedId={selectedSectionId} onSelect={setSelectedSectionId} onSubmit={operations.submit}
              /></BuilderPanelScope> : null}
              {selectedSectionId && inspectorSections.map((section) => (
                    <div key={section.id} className="pb-2">
                      {/* Section actions — always visible */}
                      <div className="flex flex-wrap gap-1.5 px-3 py-2.5 border-b" style={{ borderColor: BUILDER.border }}>
                          <button type="button" className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium" style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink }} onClick={() => device === "desktop" ? void moveSection(section.id, -1) : moveDeviceSection(section.id, -1)}>
                            ↑ Move up{device !== "desktop" ? ` (${device === "tablet" ? "Tablet" : "Phone"})` : ""}
                          </button>
                          <button type="button" className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium" style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink }} onClick={() => device === "desktop" ? void moveSection(section.id, 1) : moveDeviceSection(section.id, 1)}>
                            ↓ Move down{device !== "desktop" ? ` (${device === "tablet" ? "Tablet" : "Phone"})` : ""}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
                            style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink }}
                            onClick={() => void duplicateSection(section.id)}
                          >
                            Duplicate
                          </button>
                          {pendingConfirm?.kind === "remove" && pendingConfirm.sectionId === section.id ? (
                            <span className="flex items-center gap-1.5" role="group" aria-label="Confirm remove section">
                              <span className="text-[11px] font-medium" style={{ color: "#B91C1C" }}>Remove?</span>
                              <button
                                type="button"
                                autoFocus
                                className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
                                style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink }}
                                onClick={() => setPendingConfirm(null)}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
                                style={{ border: "1px solid #FECACA", background: "#FEF2F2", color: "#B91C1C" }}
                                onClick={() => { setPendingConfirm(null); void deleteSection(section.id); }}
                              >
                                Remove
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
                              style={{ border: "1px solid #FECACA", color: "#B91C1C" }}
                              onClick={() => setPendingConfirm({ kind: "remove", sectionId: section.id })}
                            >
                              Remove
                            </button>
                          )}
                        </div>

                      {/* Responsive state indicator — shown only on tablet/phone device preview */}
                      {device !== "desktop" && !isChromeSectionId(section.id) && (() => {
                        const rsState = getResponsiveState(section.baseProps, section.section_type);
                        const isComposable = COMPOSABLE_SECTION_TYPES.has(section.section_type);
                        const deviceLabel = device === "tablet" ? "Tablet" : "Phone";
                        const bgColor = rsState === "needs-review" ? "#FEF3C7" : rsState === "custom" ? "#EFF6FF" : "#F0FDF4";
                        const textColor = rsState === "needs-review" ? "#92400E" : rsState === "custom" ? "#1D4ED8" : "#15803D";
                        const statusLabel = rsState === "needs-review" ? "⚠ Needs review" : rsState === "custom" ? "✦ Customized" : "✦ Auto-designed";
                        return (
                          <div className="mx-3 my-2 rounded-lg overflow-hidden border" style={{ borderColor: rsState === "needs-review" ? "#FDE68A" : rsState === "custom" ? "#BFDBFE" : "#BBF7D0" }}>
                            <div className="flex items-center justify-between px-3 py-2" style={{ background: bgColor }}>
                              <span className="text-[11px] font-semibold" style={{ color: textColor }}>
                                {deviceLabel}: {statusLabel}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 px-3 py-2" style={{ background: "#FAFAFA" }}>
                              {rsState === "auto" && isComposable && (
                                <button
                                  type="button"
                                  className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                                  style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink, background: "#fff" }}
                                  onClick={() => {
                                    const updated = markResponsiveCustom(section.baseProps, section.section_type);
                                    updateProps(section.id, { deviceOverrides: updated.deviceOverrides });
                                  }}
                                >
                                  Customize
                                </button>
                              )}
                              {rsState === "custom" && isComposable && (
                                pendingConfirm?.kind === "regenerate" && pendingConfirm.sectionId === section.id ? (
                                  <span className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Confirm regenerate layout">
                                    <span className="text-[11px] font-medium" style={{ color: "#1D4ED8" }}>Overwrite {deviceLabel} changes?</span>
                                    <button
                                      type="button"
                                      className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                                      style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink, background: "#fff" }}
                                      onClick={() => setPendingConfirm(null)}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      autoFocus
                                      className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                                      style={{ border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#1D4ED8" }}
                                      onClick={() => {
                                        setPendingConfirm(null);
                                        const generated = generateDeviceOverrides(section.section_type, section.baseProps);
                                        const updated = storeAutoOverrides(section.baseProps, generated, section.section_type);
                                        updateProps(section.id, { deviceOverrides: updated.deviceOverrides });
                                      }}
                                    >
                                      Regenerate
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                                    style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink, background: "#fff" }}
                                    onClick={() => setPendingConfirm({ kind: "regenerate", sectionId: section.id, deviceLabel })}
                                  >
                                    Regenerate
                                  </button>
                                )
                              )}
                              {rsState === "needs-review" && (
                                <>
                                  {pendingConfirm?.kind === "regenerate" && pendingConfirm.sectionId === section.id ? (
                                    <span className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Confirm regenerate layout">
                                      <span className="text-[11px] font-medium" style={{ color: "#92400E" }}>Overwrite {deviceLabel} changes?</span>
                                      <button
                                        type="button"
                                        className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                                        style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink, background: "#fff" }}
                                        onClick={() => setPendingConfirm(null)}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        autoFocus
                                        className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                                        style={{ border: "1px solid #FDE68A", background: "#FFFBEB", color: "#92400E" }}
                                        onClick={() => {
                                          setPendingConfirm(null);
                                          const generated = generateDeviceOverrides(section.section_type, section.baseProps);
                                          const updated = storeAutoOverrides(section.baseProps, generated, section.section_type);
                                          updateProps(section.id, { deviceOverrides: updated.deviceOverrides });
                                        }}
                                      >
                                        Regenerate
                                      </button>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                                      style={{ border: "1px solid #FDE68A", color: "#92400E", background: "#FFFBEB" }}
                                      onClick={() => setPendingConfirm({ kind: "regenerate", sectionId: section.id, deviceLabel })}
                                    >
                                      Regenerate
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                                    style={{ border: "1px solid #FDE68A", color: "#92400E", background: "#FFFBEB" }}
                                    onClick={() => {
                                      const updated = markResponsiveCustom(section.baseProps, section.section_type);
                                      updateProps(section.id, { deviceOverrides: updated.deviceOverrides });
                                    }}
                                  >
                                    Keep — mark reviewed
                                  </button>
                                </>
                              )}
                              {(rsState === "custom" || rsState === "needs-review") && (
                                pendingConfirm?.kind === "reset-auto" && pendingConfirm.sectionId === section.id ? (
                                  <span className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Confirm reset to auto">
                                    <span className="text-[11px] font-medium" style={{ color: "#92400E" }}>Remove {deviceLabel} customizations?</span>
                                    <button
                                      type="button"
                                      className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                                      style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink, background: "#fff" }}
                                      onClick={() => setPendingConfirm(null)}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      autoFocus
                                      className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                                      style={{ border: `1px solid ${BUILDER.border}`, background: "#fff", color: BUILDER.muted }}
                                      onClick={() => {
                                        setPendingConfirm(null);
                                        updateProps(section.id, { deviceOverrides: null });
                                      }}
                                    >
                                      Reset
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                                    style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.muted, background: "#fff" }}
                                    onClick={() => setPendingConfirm({ kind: "reset-auto", sectionId: section.id, deviceLabel })}
                                  >
                                    Reset to Auto
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      <SidebarDetails title="Content" group="section-inspector">
                      {section.section_type === "maylecor-home" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>
                            Words
                          </p>
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.artistName ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { artistName: e.target.value })}
                            aria-label="Artist name"
                            placeholder="MAY LECOR"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.ctaLabel ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { ctaLabel: e.target.value })}
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
                              onChange={(url) => updateSectionPropsForDevice(section.id, { [key]: url })}
                            />
                          ))}
                          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={section.props.motionEnabled !== false}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { motionEnabled: e.target.checked })}
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
                            onChange={(socialLinks) => updateSectionPropsForDevice(section.id, { socialLinks })}
                            rail={{
                              visible: section.props.socialRailVisible !== false,
                              bgColor: String(section.props.socialRailBg ?? "rgba(0,0,0,0.85)"),
                              leftPct: Number(section.props.socialRailLeftPct ?? 0),
                              topPct: Number(section.props.socialRailTopPct ?? 12),
                              iconSize: Number(section.props.socialRailIconSize ?? 40),
                            }}
                            onRailChange={(patch) => updateSectionPropsForDevice(section.id, patch)}
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
                              updateSectionPropsForDevice(section.id, {
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
                              updateSectionPropsForDevice(section.id, { title: e.target.value, brandLabel: e.target.value })
                            }
                            aria-label="Title"
                            placeholder="Artist or brand name"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            rows={3}
                            value={String(section.props.subtitle ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { subtitle: e.target.value })}
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
                              onChange={(e) => updateSectionPropsForDevice(section.id, { showChromeLogo: e.target.checked })}
                            />
                            Show small May logo in the upper bar
                          </label>
                          {section.props.showChromeLogo !== false ? (
                            <SectionPhotoField
                              projectId={projectId}
                              label="Upper logo (optional — leave default or upload)"
                              value={String(section.props.chromeLogo ?? "")}
                              onChange={(url) => updateSectionPropsForDevice(section.id, { chromeLogo: url })}
                            />
                          ) : null}
                          <label className="block text-[10px] uppercase tracking-wider">
                            Nav look
                            <select
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.navDisplay ?? "text")}
                              onChange={(e) =>
                                updateSectionPropsForDevice(section.id, {
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
                            pages={pages}
                            links={mapNavLinksForEditor(
                              (section.props.navLinks as Parameters<typeof mapNavLinksForEditor>[0]) ?? [],
                            )}
                            onChange={(navLinks) => updateSectionPropsForDevice(section.id, { navLinks })}
                          />
                          <NavSizeEditor
                            scale={clampNavScale(section.props.navScale, 1)}
                            size={parseNavSize(section.props.navSize)}
                            layout={parseNavLayout(section.props.navLayout)}
                            logoAlign={(section.props.logoAlign as "left" | "center" | "right" | undefined) ?? "left"}
                            onChange={(patch) => updateSectionPropsForDevice(section.id, patch)}
                          />
                          <label className="block text-[10px] uppercase tracking-wider">
                            Display font (Steelfish recommended)
                            <select
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.displayFont ?? "Steelfish")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { displayFont: e.target.value })}
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
                                  updateSectionPropsForDevice(section.id, {
                                    backgroundLayer: "",
                                    backgroundHidden: true,
                                    hiddenLayers: hl,
                                  });
                                  return;
                                }
                                const hl = Array.isArray(section.props.hiddenLayers)
                                  ? (section.props.hiddenLayers as string[]).filter((x) => x !== "backgroundLayer")
                                  : [];
                                updateSectionPropsForDevice(section.id, {
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
                                updateSectionPropsForDevice(section.id, {
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
                              onChange={(url) => updateSectionPropsForDevice(section.id, { [key]: url })}
                            />
                          ))}
                          <button
                            type="button"
                            className="w-full rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
                            style={{ background: "#0F0D33" }}
                            onClick={() => {
                              const existing = (section.props.extraCutouts as Record<string, unknown>[]) ?? [];
                              updateSectionPropsForDevice(section.id, {
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
                                  updateSectionPropsForDevice(section.id, { extraCutouts: next });
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
                                  updateSectionPropsForDevice(section.id, { extraCutouts: next });
                                }}
                              />
                              <button
                                type="button"
                                className="text-[10px] font-bold uppercase text-red-600"
                                onClick={() => {
                                  const next = ((section.props.extraCutouts as typeof cut[]) ?? []).filter(
                                    (_, i) => i !== idx,
                                  );
                                  updateSectionPropsForDevice(section.id, { extraCutouts: next });
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
                              onChange={(e) => updateSectionPropsForDevice(section.id, { accentColor: e.target.value })}
                            />
                          </label>
                          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={section.props.motionEnabled !== false}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { motionEnabled: e.target.checked })}
                            />
                            Floating cutout animation
                          </label>
                          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={section.props.scrollMode !== "parallax"}
                              onChange={(e) =>
                                updateSectionPropsForDevice(section.id, { scrollMode: e.target.checked ? "viewport" : "parallax" })
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
                            onChange={(socialLinks) => updateSectionPropsForDevice(section.id, { socialLinks })}
                            rail={{
                              visible: section.props.socialRailVisible !== false,
                              bgColor: String(section.props.socialRailBg ?? "rgba(0,0,0,0.85)"),
                              leftPct: Number(section.props.socialRailLeftPct ?? 0),
                              topPct: Number(section.props.socialRailTopPct ?? 12),
                              iconSize: Number(section.props.socialRailIconSize ?? 40),
                            }}
                            onRailChange={(patch) => updateSectionPropsForDevice(section.id, patch)}
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
                              const hasExplicitZ = typeof zMap[layer.key] === "number";
                              const z = hasExplicitZ ? zMap[layer.key]! : null;
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
                                      {z !== null ? `z${z}` : "auto"}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    <button
                                      type="button"
                                      className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                                      style={{ border: `1px solid ${BUILDER.border}` }}
                                      onClick={() => {
                                        // If no explicit z yet, jump straight to front (80) so the
                                        // first "Front" click reliably puts the layer above all others.
                                        const next = z !== null ? Math.min(80, z + 10) : 80;
                                        const layerZIndex = { ...zMap, [layer.key]: next };
                                        const extras = (
                                          (section.props.extraCutouts as { id?: string; zIndex?: number }[]) ?? []
                                        ).map((c) =>
                                          c.id === layer.key ? { ...c, zIndex: Math.min(40, next) } : c,
                                        );
                                        updateSectionPropsForDevice(section.id, {
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
                                        // If no explicit z yet, jump straight to back (1) so the
                                        // first "Back" click reliably sends the layer behind all others.
                                        const next = z !== null ? Math.max(1, z - 10) : 1;
                                        const layerZIndex = { ...zMap, [layer.key]: next };
                                        const extras = (
                                          (section.props.extraCutouts as { id?: string; zIndex?: number }[]) ?? []
                                        ).map((c) =>
                                          c.id === layer.key ? { ...c, zIndex: Math.min(40, next) } : c,
                                        );
                                        updateSectionPropsForDevice(section.id, {
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
                                        updateSectionPropsForDevice(section.id, { layerLinks: rest });
                                        return;
                                      }
                                      updateSectionPropsForDevice(section.id, { layerLinks });
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
                            onChange={(url) => updateSectionPropsForDevice(section.id, { logoImage: url })}
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.brandLine1 ?? "K")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { brandLine1: e.target.value })}
                            placeholder="K"
                            aria-label="Brand letter"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.brandLine2 ?? "DIRECTION")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { brandLine2: e.target.value })}
                            placeholder="DIRECTION"
                            aria-label="Brand word"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            rows={2}
                            value={String(section.props.mission ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { mission: e.target.value })}
                            placeholder="Mission / short line under the logo"
                          />
                          <label className="block text-[10px] uppercase tracking-wider">
                            Font (Oswald = Wix)
                            <input
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.displayFont ?? "Oswald")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { displayFont: e.target.value })}
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-[10px] uppercase tracking-wider">
                              Logo color
                              <input
                                className="mt-1 w-full text-xs rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={String(section.props.logoColor ?? "#FFFFFF")}
                                onChange={(e) => updateSectionPropsForDevice(section.id, { logoColor: e.target.value })}
                              />
                            </label>
                            <label className="block text-[10px] uppercase tracking-wider">
                              Mirror color
                              <input
                                className="mt-1 w-full text-xs rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={String(section.props.logoMirrorColor ?? "#F5C4B8")}
                                onChange={(e) => updateSectionPropsForDevice(section.id, { logoMirrorColor: e.target.value })}
                              />
                            </label>
                          </div>
                          <label className="block text-[10px] uppercase tracking-wider">
                            Nav button yellow
                            <input
                              className="mt-1 w-full text-xs rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.navButtonBg ?? "#FFF86B")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { navButtonBg: e.target.value })}
                            />
                          </label>
                          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={section.props.showMirrorLogo !== false}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { showMirrorLogo: e.target.checked })}
                            />
                            Mirrored wordmark (Wix)
                          </label>
                          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={section.props.showHomeIcon !== false}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { showHomeIcon: e.target.checked })}
                            />
                            Home icon in nav
                          </label>
                          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={section.props.showOverlay === true}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { showOverlay: e.target.checked })}
                            />
                            Dark overlay on background photo
                          </label>
                          <SectionPhotoField
                            projectId={projectId}
                            label="Optional background photo (over gradient)"
                            value={String(section.props.backgroundImage ?? "")}
                            onChange={(url) => updateSectionPropsForDevice(section.id, { backgroundImage: url })}
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
                              updateSectionPropsForDevice(section.id, { collagePhotos: next });
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
                                  updateSectionPropsForDevice(section.id, { collagePhotos: next });
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
                                  updateSectionPropsForDevice(section.id, { collagePhotos: next });
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
                                      updateSectionPropsForDevice(section.id, { collagePhotos: next });
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
                                      updateSectionPropsForDevice(section.id, { collagePhotos: next });
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
                                      updateSectionPropsForDevice(section.id, { collagePhotos: next });
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
                                      updateSectionPropsForDevice(section.id, { collagePhotos: next });
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
                                  updateSectionPropsForDevice(section.id, { collagePhotos: next });
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <NavLinksEditor
                            pages={pages}
                            links={mapNavLinksForEditor(
                              (section.props.navLinks as Parameters<typeof mapNavLinksForEditor>[0]) ?? [],
                            )}
                            onChange={(navLinks) => updateSectionPropsForDevice(section.id, { navLinks })}
                          />
                          <NavSizeEditor
                            scale={clampNavScale(section.props.navScale, 1)}
                            size={parseNavSize(section.props.navSize)}
                            layout={parseNavLayout(section.props.navLayout)}
                            logoAlign={(section.props.logoAlign as "left" | "center" | "right" | undefined) ?? "left"}
                            onChange={(patch) => updateSectionPropsForDevice(section.id, patch)}
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
                            onChange={(socialLinks) => updateSectionPropsForDevice(section.id, { socialLinks })}
                          />
                          <label className="block text-[10px] uppercase tracking-wider pt-1">
                            Footer text
                            <input
                              className="mt-1 w-full text-xs rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.footerText ?? "")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { footerText: e.target.value })}
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { title: e.target.value })}
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            rows={4}
                            value={String(section.props.body ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { body: e.target.value })}
                          />
                          <SectionPhotoField
                            projectId={projectId}
                            label="Hero photo"
                            value={String(section.props.heroImage ?? "")}
                            onChange={(url) => updateSectionPropsForDevice(section.id, { heroImage: url })}
                          />
                          <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={section.props.showOverlay === true}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { showOverlay: e.target.checked })}
                            />
                            Dark overlay
                          </label>
                          <NavLinksEditor
                            pages={pages}
                            links={mapNavLinksForEditor(
                              (section.props.navLinks as Parameters<typeof mapNavLinksForEditor>[0]) ?? [],
                            )}
                            onChange={(navLinks) => updateSectionPropsForDevice(section.id, { navLinks })}
                          />
                          <NavSizeEditor
                            scale={clampNavScale(section.props.navScale, 1)}
                            size={parseNavSize(section.props.navSize)}
                            layout={parseNavLayout(section.props.navLayout)}
                            logoAlign={(section.props.logoAlign as "left" | "center" | "right" | undefined) ?? "left"}
                            onChange={(patch) => updateSectionPropsForDevice(section.id, patch)}
                          />
                        </div>
                      )}
                      {section.section_type === "maylecor-music" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.artistName ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { artistName: e.target.value })}
                            aria-label="Artist name"
                          />
                          <SectionPhotoField
                            projectId={projectId}
                            label="Album art"
                            value={String(section.props.albumArt ?? "")}
                            onChange={(url) => updateSectionPropsForDevice(section.id, { albumArt: url })}
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
                            onChange={(socialLinks) => updateSectionPropsForDevice(section.id, { socialLinks })}
                            rail={{
                              visible: section.props.socialRailVisible !== false,
                              bgColor: String(section.props.socialRailBg ?? "rgba(0,0,0,0.85)"),
                              leftPct: Number(section.props.socialRailLeftPct ?? 0),
                              topPct: Number(section.props.socialRailTopPct ?? 12),
                              iconSize: Number(section.props.socialRailIconSize ?? 40),
                            }}
                            onRailChange={(patch) => updateSectionPropsForDevice(section.id, patch)}
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { heading: e.target.value })}
                            placeholder="Heading"
                            aria-label="Hero heading"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[60px]"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.subheading ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { subheading: e.target.value })}
                            placeholder="Subheading"
                            aria-label="Hero subheading"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.buttonLabel ?? "")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { buttonLabel: e.target.value })}
                              placeholder="Button label"
                              aria-label="Button label"
                            />
                            <input
                              className="w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.buttonHref ?? "")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { buttonHref: e.target.value })}
                              placeholder="Button link"
                              aria-label="Button link"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.secondaryButtonLabel ?? "")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { secondaryButtonLabel: e.target.value })}
                              placeholder="Second button (optional)"
                              aria-label="Second button label"
                            />
                            <input
                              className="w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.secondaryButtonHref ?? "")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { secondaryButtonHref: e.target.value })}
                              placeholder="Second button link"
                              aria-label="Second button link"
                            />
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ color: BUILDER.orange }}>Design</p>
                          <SectionPhotoField
                            projectId={projectId}
                            label="Background image (optional)"
                            value={String(section.props.image ?? "")}
                            onChange={(url) => updateSectionPropsForDevice(section.id, { image: url })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-[10px] uppercase tracking-wider">
                              Background color
                              <input
                                type="color"
                                className="mt-1 h-8 w-full cursor-pointer rounded border-0 p-0"
                                aria-label="Hero background color"
                                value={heroBackgroundSwatch(section.props.background, previewDefinition?.theme.primary)}
                                onChange={(e) => updateSectionPropsForDevice(section.id, { background: e.target.value })}
                              />
                            </label>
                            <label className="block text-[10px] uppercase tracking-wider">
                              Text align
                              <select
                                className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={String(section.props.align ?? "center")}
                                onChange={(e) => updateSectionPropsForDevice(section.id, { align: e.target.value })}
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
                                value={resolveHeroHeight(section.props.minHeight)}
                                onChange={(e) => updateSectionPropsForDevice(section.id, { minHeight: e.target.value })}
                                aria-label="Hero height"
                              >
                                {HERO_HEIGHT_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
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
                                aria-label="Hero overlay opacity"
                                value={Number(section.props.overlayOpacity ?? 0.42)}
                                onChange={(e) => updateSectionPropsForDevice(section.id, { overlayOpacity: Number(e.target.value) })}
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { heading: e.target.value })}
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[80px]"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.body ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { body: e.target.value })}
                          />
                        </div>
                      )}
                      {section.section_type === "navigation" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.brand ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { brand: e.target.value })}
                            aria-label="Brand name"
                            placeholder="Brand name"
                          />
                          <NavLinksEditor
                            pages={pages}
                            links={mapNavLinksForEditor(
                              (section.props.links as Parameters<typeof mapNavLinksForEditor>[0]) ?? [],
                            )}
                            onChange={(links) => updateSectionPropsForDevice(section.id, { links })}
                          />
                          <NavSizeEditor
                            scale={clampNavScale(section.props.navScale, 1)}
                            size={parseNavSize(section.props.navSize)}
                            layout={parseNavLayout(section.props.navLayout)}
                            logoAlign={(section.props.logoAlign as "left" | "center" | "right" | undefined) ?? "left"}
                            onChange={(patch) => updateSectionPropsForDevice(section.id, patch)}
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { text: e.target.value })}
                          />
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ color: BUILDER.orange }}>Footer links</p>
                          <NavLinksEditor
                            pages={pages}
                            links={mapNavLinksForEditor((section.props.links as Parameters<typeof mapNavLinksForEditor>[0]) ?? [])}
                            onChange={(links) => updateSectionPropsForDevice(section.id, { links })}
                          />
                        </div>
                      )}
                      {section.section_type === "whatsapp" && (
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.phone ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { phone: e.target.value })}
                            aria-label="WhatsApp phone"
                            placeholder="WhatsApp number with country code"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.label ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { label: e.target.value })}
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { heading: e.target.value })}
                            aria-label="Contact heading"
                            placeholder="Contact"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.email ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { email: e.target.value })}
                            aria-label="Email"
                            placeholder="Email"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.phone ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { phone: e.target.value })}
                            aria-label="Phone"
                            placeholder="Phone"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.address ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { address: e.target.value })}
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { heading: e.target.value })}
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
                                      updateSectionPropsForDevice(section.id, { items });
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
                                    updateSectionPropsForDevice(section.id, { items });
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
                                    updateSectionPropsForDevice(section.id, { items });
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
                                    updateSectionPropsForDevice(section.id, { items });
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
                                    updateSectionPropsForDevice(section.id, { items });
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
                              updateSectionPropsForDevice(section.id, { items });
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { heading: e.target.value })}
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
                                    updateSectionPropsForDevice(section.id, { items });
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
                                    updateSectionPropsForDevice(section.id, { items });
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
                              updateSectionPropsForDevice(section.id, { items });
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { heading: e.target.value })}
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
                                      updateSectionPropsForDevice(section.id, { items });
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
                                    updateSectionPropsForDevice(section.id, { items });
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
                                      updateSectionPropsForDevice(section.id, { items });
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
                                      updateSectionPropsForDevice(section.id, { items });
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
                                    updateSectionPropsForDevice(section.id, { items });
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
                              updateSectionPropsForDevice(section.id, { items });
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { heading: e.target.value })}
                          />
                          <label className="block text-[10px] uppercase tracking-wider">
                            Layout
                            <select
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.layout ?? "grid")}
                              onChange={(e) =>
                                updateSectionPropsForDevice(section.id, {
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
                                updateSectionPropsForDevice(section.id, { columns: Number(e.target.value) as 1 | 2 | 3 })
                              }
                            >
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                            </select>
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
                                    updateSectionPropsForDevice(section.id, { items: next, src: next[0]?.src ?? "" });
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
                                    updateSectionPropsForDevice(section.id, { items: next, src: next[0]?.src ?? "" });
                                  }}
                                />
                                <SiteMediaUpload
                                  projectId={projectId}
                                  kind="video"
                                  value={String(item.src ?? "")}
                                  onChange={(src) => {
                                    const next = [...items];
                                    next[idx] = { ...next[idx]!, src };
                                    updateSectionPropsForDevice(section.id, { items: next, src: next[0]?.src ?? "" });
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
                                    updateSectionPropsForDevice(section.id, { items: next });
                                  }}
                                />
                                <button
                                  type="button"
                                  className="text-[10px] font-bold uppercase text-red-600"
                                  onClick={() => {
                                    const next = items.filter((_, i) => i !== idx);
                                    updateSectionPropsForDevice(section.id, { items: next, src: next[0]?.src ?? "" });
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
                              updateSectionPropsForDevice(section.id, { items });
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
                            onChange={(src) => updateSectionPropsForDevice(section.id, { src })}
                            label="Music file from your computer"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            placeholder="Or paste MP3 URL"
                            value={String(section.props.src ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { src: e.target.value })}
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            placeholder="Track title"
                            value={String(section.props.title ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { title: e.target.value })}
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            placeholder="Artist name"
                            value={String(section.props.artist ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { artist: e.target.value })}
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
                                updateSectionPropsForDevice(section.id, {
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
                                updateSectionPropsForDevice(section.id, { columns: Number(e.target.value) as 1 | 2 | 3 })
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
                                    updateSectionPropsForDevice(section.id, { items });
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
                                    updateSectionPropsForDevice(section.id, { items });
                                  }}
                                />
                                <button
                                  type="button"
                                  className="text-[10px] text-red-600"
                                  onClick={() => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items.splice(idx, 1);
                                    updateSectionPropsForDevice(section.id, { items });
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
                              updateSectionPropsForDevice(section.id, { items });
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { heading: e.target.value })}
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
                                  onClick={() => updateSectionPropsForDevice(section.id, { layout: id })}
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
                                      onClick={() => updateSectionPropsForDevice(section.id, { columns: n })}
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
                                  onClick={() => updateSectionPropsForDevice(section.id, { orderStyle: id })}
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { orderCtaLabel: e.target.value })}
                            placeholder="Order button label"
                          />
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { heading: e.target.value })}
                            placeholder="Heading"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[60px]"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.subheading ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { subheading: e.target.value })}
                            placeholder="Subheading"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.buttonLabel ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { buttonLabel: e.target.value })}
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
                              onChange={(e) => updateSectionPropsForDevice(section.id, { enabled: e.target.checked })}
                            />
                            Show popup
                          </label>
                          <label className="block text-[10px] uppercase tracking-wider">
                            Mode
                            <select
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.mode ?? "both")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { mode: e.target.value })}
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { heading: e.target.value })}
                            placeholder="Heading"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[60px]"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.body ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { body: e.target.value })}
                            placeholder="Body"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.consentLabel ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { consentLabel: e.target.value })}
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
                                  updateSectionPropsForDevice(section.id, { delaySeconds: Number(e.target.value) })
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
                                  updateSectionPropsForDevice(section.id, { remindAfterDays: Number(e.target.value) })
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { address: e.target.value })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              step="any"
                              className="w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              placeholder="Latitude"
                              value={Number(section.props.latitude ?? 0)}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { latitude: Number(e.target.value) })}
                            />
                            <input
                              type="number"
                              step="any"
                              className="w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              placeholder="Longitude"
                              value={Number(section.props.longitude ?? 0)}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { longitude: Number(e.target.value) })}
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
                          onChange={(blocks) => updateSectionPropsForDevice(section.id, { blocks })}
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
                              updateSectionPropsForDevice(section.id, { items });
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
                            value={String(section.props.eyebrow ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { eyebrow: e.target.value })}
                            placeholder="Eyebrow — short line above the headline (optional)"
                            aria-label="Editorial hero eyebrow"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { heading: e.target.value })}
                            placeholder="Headline"
                            aria-label="Editorial hero headline"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[60px]"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.subheading ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { subheading: e.target.value })}
                            placeholder="Subheading"
                            aria-label="Editorial hero subheading"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.buttonLabel ?? "")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { buttonLabel: e.target.value })}
                              placeholder="Button label"
                              aria-label="Editorial hero button label"
                            />
                            <input
                              className="text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.buttonHref ?? "")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { buttonHref: e.target.value })}
                              placeholder="Button link"
                              aria-label="Editorial hero button link"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.secondaryButtonLabel ?? "")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { secondaryButtonLabel: e.target.value })}
                              placeholder="Second button (optional)"
                              aria-label="Editorial hero Second button label"
                            />
                            <input
                              className="text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.secondaryButtonHref ?? "")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { secondaryButtonHref: e.target.value })}
                              placeholder="Second button link"
                              aria-label="Editorial hero Second button link"
                            />
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ color: BUILDER.orange }}>Design</p>
                          <SectionPhotoField
                            projectId={projectId}
                            label="Background image"
                            // The editorial-hero schema stores the photo as `imageUrl` (`image` was stripped on save).
                            value={String(section.props.imageUrl ?? section.props.image ?? "")}
                            onChange={(url) => updateSectionPropsForDevice(section.id, { imageUrl: url })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-[10px] uppercase tracking-wider">
                              Height
                              <select
                                className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                aria-label="Editorial hero height"
                                // The schema stores the height as `heightVh` (`minHeight` was stripped on save).
                                value={String(section.props.heightVh ?? 80)}
                                onChange={(e) => updateSectionPropsForDevice(section.id, { heightVh: Number(e.target.value) })}
                              >
                                {[...new Set([50, 70, 80, 88, 100, Number(section.props.heightVh ?? 80)])]
                                  .sort((a, b) => a - b)
                                  .map((vh) => (
                                    <option key={vh} value={vh}>
                                      {({ 50: "Half screen", 70: "Tall", 80: "Hero (80vh)", 88: "Very tall", 100: "Full screen" } as Record<number, string>)[vh] ?? `${vh}vh`}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <label className="block text-[10px] uppercase tracking-wider">
                              Align
                              <select
                                className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                aria-label="Editorial hero align"
                                value={String(section.props.align ?? "left")}
                                onChange={(e) => updateSectionPropsForDevice(section.id, { align: e.target.value })}
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
                              aria-label="Editorial hero overlay"
                              value={Number(section.props.overlayOpacity ?? 0.35)}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { overlayOpacity: Number(e.target.value) })}
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { text: e.target.value })}
                            placeholder="Free shipping on orders over 10,000 XOF"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.link ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { link: e.target.value })}
                            placeholder="Link (optional)"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-[10px] uppercase tracking-wider">
                              Background
                              <input
                                type="color"
                                className="mt-1 h-8 w-full cursor-pointer rounded border-0 p-0"
                                value={String(section.props.background ?? "#0A0A0A")}
                                onChange={(e) => updateSectionPropsForDevice(section.id, { background: e.target.value })}
                              />
                            </label>
                            <label className="block text-[10px] uppercase tracking-wider">
                              Text color
                              <input
                                type="color"
                                className="mt-1 h-8 w-full cursor-pointer rounded border-0 p-0"
                                value={String(section.props.color ?? "#ffffff")}
                                onChange={(e) => updateSectionPropsForDevice(section.id, { color: e.target.value })}
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
                              updateSectionPropsForDevice(section.id, { items });
                            }}
                            placeholder={"New arrivals\nShop now\nFree delivery\nMade in Africa"}
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.separator ?? " · ")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { separator: e.target.value })}
                            placeholder="Separator ( · )"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-[10px] uppercase tracking-wider">
                              Background
                              <input
                                type="color"
                                className="mt-1 h-8 w-full cursor-pointer rounded border-0 p-0"
                                value={String(section.props.background ?? "#0A0A0A")}
                                onChange={(e) => updateSectionPropsForDevice(section.id, { background: e.target.value })}
                              />
                            </label>
                            <label className="block text-[10px] uppercase tracking-wider">
                              Text color
                              <input
                                type="color"
                                className="mt-1 h-8 w-full cursor-pointer rounded border-0 p-0"
                                value={String(section.props.color ?? "#ffffff")}
                                onChange={(e) => updateSectionPropsForDevice(section.id, { color: e.target.value })}
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
                            onChange={(e) => updateSectionPropsForDevice(section.id, { heading: e.target.value })}
                            placeholder="Heading"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5 min-h-[80px]"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.body ?? "")}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { body: e.target.value })}
                            placeholder="Body text"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.buttonLabel ?? "")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { buttonLabel: e.target.value })}
                              placeholder="Button"
                            />
                            <input
                              className="text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.buttonHref ?? "")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { buttonHref: e.target.value })}
                              placeholder="Link"
                            />
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ color: BUILDER.orange }}>Image</p>
                          <SectionPhotoField
                            projectId={projectId}
                            label="Photo"
                            value={String(section.props.image ?? "")}
                            onChange={(url) => updateSectionPropsForDevice(section.id, { image: url })}
                          />
                          <label className="block text-[10px] uppercase tracking-wider">
                            Image side
                            <select
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.imagePosition ?? "left")}
                              onChange={(e) => updateSectionPropsForDevice(section.id, { imagePosition: e.target.value })}
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
                      </SidebarDetails>
                      <SidebarDetails title="Layout & Visibility" defaultOpen={false} group="section-inspector">
                        {/* Section vertical spacing control */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.muted }}>
                            Section height
                          </p>
                          <div className="flex gap-1">
                            {(["tight", "normal", "spacious", "open"] as const).map((id) => {
                              const on = (section.props.sectionPaddingY ?? "normal") === id;
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => updateSectionPropsForDevice(section.id, { sectionPaddingY: id })}
                                  className="flex-1 rounded py-1 text-[9px] font-bold uppercase"
                                  style={{
                                    background: on ? BUILDER.ink : BUILDER.surfaceMuted,
                                    color: on ? "#fff" : BUILDER.muted,
                                    border: `1px solid ${BUILDER.border}`,
                                  }}
                                >
                                  {id}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-[11px]">
                          <input
                            type="checkbox"
                            checked={Boolean(section.props.hidden)}
                            onChange={(e) => updateSectionPropsForDevice(section.id, { hidden: e.target.checked })}
                          />
                          Hide section (all devices)
                        </label>
                        {/* Per-device visibility — writes to _visibility.hideOn */}
                        {!isChromeSectionId(section.id) && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.muted }}>
                              Show on device
                            </p>
                            {(
                              [
                                ["desktop", "Desktop"],
                                ["tablet", "Tablet"],
                                ["mobile", "Phone"],
                              ] as const
                            ).map(([dev, label]) => {
                              const vis = (section.props._visibility as { hideOn?: string[]; showOn?: string[] } | undefined) ?? {};
                              const isHidden = (vis.hideOn ?? []).includes(dev);
                              return (
                                <label key={dev} className="flex items-center gap-2 text-[11px]">
                                  <input
                                    type="checkbox"
                                    checked={!isHidden}
                                    onChange={(e) => {
                                      const cur = (section.props._visibility as { hideOn?: string[]; showOn?: string[] } | undefined) ?? {};
                                      const hideOn = (cur.hideOn ?? []).filter((d) => d !== dev);
                                      if (!e.target.checked) hideOn.push(dev);
                                      updateSectionPropsForDevice(section.id, {
                                        _visibility: hideOn.length > 0 ? { hideOn } : null,
                                      });
                                    }}
                                  />
                                  {label}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </SidebarDetails>
                      {/* Motion entrance animation controls */}
                      {!isChromeSectionId(section.id) && (
                      <SidebarDetails title="Motion" defaultOpen={false} group="section-inspector">
                        {(() => {
                          const motionProp = section.props._motion as { specs?: { trigger?: string; transform?: Record<string, unknown>; durationMs?: number; delayMs?: number; easing?: string; reducedMotionFallback?: string }[]; reducedMotionFallback?: string } | undefined;
                          const enabled = Boolean(motionProp?.specs?.length);
                          const spec = motionProp?.specs?.[0];
                          const opFrom = typeof spec?.transform?.opacityFrom === "number" ? spec.transform.opacityFrom : 0;
                          const tyFrom = typeof spec?.transform?.translateYFrom === "string" ? parseFloat(spec.transform.translateYFrom as string) : 24;
                          const dur = spec?.durationMs ?? 600;
                          const del = spec?.delayMs ?? 0;
                          const rmf = (motionProp?.reducedMotionFallback ?? "instant") as "instant" | "none";

                          function writeMotion(patch: Partial<{ opacityFrom: number; tyFrom: number; durationMs: number; delayMs: number; rmf: "instant" | "none" }>) {
                            const next = {
                              specs: [{
                                target: "self",
                                trigger: "scroll-enter" as const,
                                transform: {
                                  opacityFrom: patch.opacityFrom ?? opFrom,
                                  opacityTo: 1,
                                  translateYFrom: `${patch.tyFrom ?? tyFrom}px`,
                                  translateYTo: "0px",
                                },
                                durationMs: patch.durationMs ?? dur,
                                delayMs: patch.delayMs ?? del,
                                easing: "ease-out" as const,
                                scrollThreshold: 0.15,
                                replay: false,
                              }],
                              reducedMotionFallback: patch.rmf ?? rmf,
                            };
                            updateSectionPropsForDevice(section.id, { _motion: next });
                          }

                          return (
                            <div className="space-y-3">
                              <label className="flex items-center gap-2 text-[11px]">
                                <input
                                  type="checkbox"
                                  checked={enabled}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      writeMotion({});
                                    } else {
                                      updateSectionPropsForDevice(section.id, { _motion: null });
                                    }
                                  }}
                                />
                                Scroll-enter entrance
                              </label>
                              {enabled && (
                                <>
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.muted }}>
                                      Fade in (opacity start)
                                    </p>
                                    <input
                                      type="range"
                                      min={0} max={1} step={0.05}
                                      value={opFrom}
                                      onChange={(e) => writeMotion({ opacityFrom: parseFloat(e.target.value) })}
                                      className="w-full"
                                      aria-label="Fade start opacity"
                                    />
                                    <div className="flex justify-between text-[9px]" style={{ color: BUILDER.muted }}>
                                      <span>Invisible (0)</span><span>Opaque (1)</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.muted }}>
                                      Slide up (px)
                                    </p>
                                    <input
                                      type="range"
                                      min={0} max={80} step={4}
                                      value={tyFrom}
                                      onChange={(e) => writeMotion({ tyFrom: parseInt(e.target.value) })}
                                      className="w-full"
                                      aria-label="Slide up distance"
                                    />
                                    <div className="flex justify-between text-[9px]" style={{ color: BUILDER.muted }}>
                                      <span>None (0px)</span><span>Far (80px)</span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.muted }}>
                                        Duration (ms)
                                      </p>
                                      <input
                                        type="number"
                                        min={100} max={2000} step={50}
                                        value={dur}
                                        onChange={(e) => writeMotion({ durationMs: Math.max(100, Math.min(2000, parseInt(e.target.value) || 600)) })}
                                        className="w-full rounded px-2 py-1 text-[11px]"
                                        style={{ border: `1px solid ${BUILDER.border}` }}
                                        aria-label="Duration in milliseconds"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.muted }}>
                                        Delay (ms)
                                      </p>
                                      <input
                                        type="number"
                                        min={0} max={1500} step={50}
                                        value={del}
                                        onChange={(e) => writeMotion({ delayMs: Math.max(0, Math.min(1500, parseInt(e.target.value) || 0)) })}
                                        className="w-full rounded px-2 py-1 text-[11px]"
                                        style={{ border: `1px solid ${BUILDER.border}` }}
                                        aria-label="Delay in milliseconds"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.muted }}>
                                      Reduced motion
                                    </p>
                                    <div className="flex gap-1">
                                      {(["instant", "none"] as const).map((id) => (
                                        <button
                                          key={id}
                                          type="button"
                                          onClick={() => writeMotion({ rmf: id })}
                                          className="flex-1 rounded py-1 text-[9px] font-bold uppercase"
                                          style={{
                                            background: rmf === id ? BUILDER.ink : BUILDER.surfaceMuted,
                                            color: rmf === id ? "#fff" : BUILDER.muted,
                                            border: `1px solid ${BUILDER.border}`,
                                          }}
                                        >
                                          {id === "instant" ? "Instant" : "Skip"}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </SidebarDetails>
                      )}
                    </div>
                  ))}
              </>
              )}
            </aside>

            <section
              aria-label="Site canvas"
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
                  wideCanvas ? "overflow-y-auto p-0" : "overflow-y-auto items-start p-5 sm:pb-8 sm:p-8"
                }`}
                style={
                  // On mobile (<sm), add safe-area padding so content clears MobileActionBar
                  // (≈52px) + device home indicator. Inline style only applied below sm breakpoint.
                  (bp === "xs" || bp === "sm") ? {
                    paddingBottom: wideCanvas
                      ? "calc(4rem + env(safe-area-inset-bottom, 0px))"
                      : "calc(5rem + env(safe-area-inset-bottom, 0px))",
                  } : undefined
                }
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
                          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
                        }
                  }
                >
                {kcdRenderError ? (
                  <div role="alert" className="m-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
                    <p className="font-semibold">This page could not be displayed.</p>
                    <p className="mt-1">{kcdRenderError}</p>
                  </div>
                ) : null}
                {canvasDefinition && wideCanvas && (
                  <BuilderEditablePreview
                    definition={canvasDefinition}
                    nativeDocument={kcdView?.ok && !aiPreview ? kcdView.nativeDocument : undefined}
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
                {/* Always-visible "+ Add section" strip at the bottom of the canvas */}
                {canvasDefinition && (
                  <div className="border-t border-dashed border-black/15 bg-[#FAFAF8] px-4 py-5">
                    <div className="mx-auto max-w-md">
                      <AddSectionPicker
                        pageTitle={
                          pages.find((p) => p.slug === previewPageSlug)?.title ??
                          pages.find((p) => p.id === editPageId)?.title ??
                          "Home"
                        }
                        onAdd={async (type) => { await addSection(type); }}
                      />
                      <p className="mt-2 text-center text-[11px] text-black/40">
                        Add sections to make this page longer. Remove a section by clicking it and pressing Remove.
                      </p>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </section>
          </>
        )}

        {/* Dial backdrop — captures click-outside to dismiss speed-dial */}
        {yandeDialOpen && !yandeOpen ? (
          <div
            className="absolute inset-0 z-20"
            onClick={() => setYandeDialOpen(false)}
            aria-hidden="true"
          />
        ) : null}

        {/* Yande FAB + speed-dial — bottom-right; on mobile lift above MobileActionBar */}
        <BuilderPanelScope><div
          className="absolute right-5 z-30 flex flex-col items-end gap-2"
          style={{
            bottom: (bp === "xs" || bp === "sm")
              ? "calc(3.75rem + env(safe-area-inset-bottom, 0px))"
              : "1.25rem",
          }}
        >

          {/* Speed-dial mini-buttons — open by default on builder load */}
          {yandeDialOpen && !yandeOpen ? (
            <>
              {(
                [
                  { label: "Redesign page", mode: "redesign" as const, color: "#7C3AED" },
                  { label: "Improve content", mode: "free" as const, color: "#FF5500" },
                  { label: "Ask Yande", mode: "free" as const, color: "#0F0D33" },
                ] as const
              ).map(({ label, mode, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-semibold shadow-lg whitespace-nowrap"
                    style={{ background: BUILDER_PANEL.surface, color: BUILDER_PANEL.ink, boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}
                  >
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setImproveMode(mode);
                      setYandeOpen(true);
                      setYandeDialOpen(false);
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-105 active:scale-95"
                    style={{ background: color }}
                    aria-label={label}
                  >
                    {mode === "redesign" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M12 3l1.9 5.8h6.1l-4.9 3.6 1.9 5.7L12 14.5l-5 3.6 1.9-5.7L4 8.8h6.1z" strokeLinejoin="round" />
                      </svg>
                    ) : mode === "free" && label === "Ask Yande" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </>
          ) : null}

          {/* Main FAB button */}
          <button
            ref={yandeTriggerRef}
            type="button"
            aria-label={yandeOpen ? "Close Yande" : yandeDialOpen ? "Close menu" : "Open Yande"}
            onClick={() => {
              if (yandeOpen) {
                setYandeOpen(false);
              } else {
                setYandeDialOpen((o) => !o);
              }
            }}
            className="rounded-full transition-transform hover:scale-105 active:scale-95"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}
          >
            <YandeMark size={48} />
          </button>
        </div>

        </BuilderPanelScope>

        {/* Yande right-side panel — absolute on sm+, Sheet on xs (phone) */}
        {yandeOpen && bp !== "xs" ? (
          <>
            {/* click-outside backdrop (transparent) */}
            <div
              className="absolute inset-0 z-30"
              onClick={() => setYandeOpen(false)}
              aria-hidden="true"
            />
            <BuilderPanelScope><div
              className="absolute bottom-0 right-0 top-0 z-40 flex flex-col overflow-hidden border-l"
              style={{
                width: 300,
                background: BUILDER_PANEL.surface,
                color: BUILDER_PANEL.ink,
                colorScheme: BUILDER_PANEL.colorScheme,
                borderColor: BUILDER_PANEL.border,
                boxShadow: "-4px 0 24px rgba(0,0,0,0.10)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* panel header */}
              <div
                className="flex shrink-0 items-center justify-between border-b px-3 py-2.5"
                style={{ borderColor: BUILDER_PANEL.border }}
              >
                <div className="flex items-center gap-2">
                  <YandeMark size={28} />
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: BUILDER_PANEL.ink }}
                  >
                    Yande AI
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Close Yande"
                  onClick={() => setYandeOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-md"
                  style={{ color: BUILDER_PANEL.muted }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              {/* Mode selector + AI preview + assistant — shared with Sheet below */}
              <YandePanelBody
                aiPreview={aiPreview}
                improving={improving}
                improveMode={improveMode}
                improveInstruction={improveInstruction}
                improveNote={improveNote}
                setImproveMode={setImproveMode}
                setImproveInstruction={setImproveInstruction}
                setAiPreview={setAiPreview}
                applyAiPreview={() => void applyAiPreview()}
                discardAiPreview={discardAiPreview}
                previewWithAi={() => void previewWithAi()}
              />
            </div></BuilderPanelScope>
          </>
        ) : null}
        {/* On xs (phone) Yande opens as a bottom Sheet so it doesn't cover the canvas */}
        <Sheet
          open={yandeOpen && bp === "xs"}
          onClose={() => setYandeOpen(false)}
          title="Yande AI"
          triggerRef={yandeTriggerRef}
          maxHeight="80dvh"
          editorAppearance
        >
          <YandePanelBody
            aiPreview={aiPreview}
            improving={improving}
            improveMode={improveMode}
            improveInstruction={improveInstruction}
            improveNote={improveNote}
            setImproveMode={setImproveMode}
            setImproveInstruction={setImproveInstruction}
            setAiPreview={setAiPreview}
            applyAiPreview={() => void applyAiPreview()}
            discardAiPreview={discardAiPreview}
            previewWithAi={() => void previewWithAi()}
          />
        </Sheet>
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
                minHeight: "calc(100dvh - 6rem)",
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
      {/* Mobile action bar — surfaces Undo/Redo/Add on phones where the header controls are sm:hidden */}
      {project && !flagshipCanvas && !draftReloadRequired ? (
        <MobileActionBar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          pageTitle={pages.find((p) => p.id === editPageId)?.title ?? "Page"}
          onPagePicker={() => { setSidebarTab("pages"); setLeftPanelOpen(true); }}
          onAddSection={() => setMobileAddSectionOpen(true)}
        />
      ) : null}
      <Sheet
        open={mobileAddSectionOpen}
        onClose={() => setMobileAddSectionOpen(false)}
        title="Add section"
        editorAppearance
        maxHeight="70dvh"
        triggerRef={mobileAddSectionTriggerRef}
      >
        <AddSectionPicker
          pageTitle={pages.find((p) => p.id === editPageId)?.title ?? "Page"}
          onAdd={async (type) => { setMobileAddSectionOpen(false); await addSection(type); }}
        />
      </Sheet>
      {kbSaveNote ? (
        <p
          className="pointer-events-none fixed left-3 z-[55] max-w-xs rounded-lg px-2 py-1 text-[10px]"
          style={{
            bottom: (bp === "xs" || bp === "sm")
              ? "calc(3.75rem + env(safe-area-inset-bottom, 0px))"
              : "0.75rem",
            background: "rgba(255,251,247,0.95)",
            color: "#166534",
            border: "1px solid #E8E6DF",
          }}
        >
          {kbSaveNote}
        </p>
      ) : null}
    </div>
    </BuilderAppearanceProvider>
    </DataModeProvider>
  );
}

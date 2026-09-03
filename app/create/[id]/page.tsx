"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CreateShell } from "@/app/components/create/create-shell";
import { YandeAssistant } from "@/app/components/create/yande-assistant";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { buildDefinitionFromProjectParts } from "@/lib/create/editor-definition";
import { BUILDER, BUILDER_QUICK_SECTIONS } from "@/lib/create/builder-ui";
import type { SiteSeo } from "@/lib/create/site-seo";
import { defaultSiteSeo } from "@/lib/create/site-seo";
import type { PublishState } from "@/lib/create/publish-state";
import { SiteAssetsPanel } from "@/app/components/create/site-assets-panel";
import { SectionPhotoField } from "@/app/components/create/section-photo-field";
import { BuilderBusinessNudge } from "@/app/components/create/builder-business-nudge";
import { BuilderEditablePreview } from "@/app/components/create/builder-editable-preview";
import { BuilderSectionListDnd } from "@/app/components/create/builder-section-list-dnd";
import { SiteMediaUpload } from "@/app/components/create/site-media-upload";
import { NavLinksEditor } from "@/app/components/create/nav-links-editor";
import { SocialLinksEditor } from "@/app/components/create/social-links-editor";
import { BuilderColorPanel } from "@/app/components/create/builder-color-panel";
import type { ThemeTokens } from "@/lib/create/website-schema";
import { KEBU } from "@/lib/kebu-brand";
import {
  planMediaAssetApply,
  type KebuDragAsset,
} from "@/lib/create/builder-media-drop";
import { BUILDER_DEVICE_FRAME } from "@/lib/create/builder-device";
import { projectUsesMaylecorRussianLayout } from "@/lib/create/maylecor-russian-hero";
import { projectUsesKdirectionLayout } from "@/lib/create/kdirection-local-assets";

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
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [publishing, setPublishing] = useState(false);
  const [payingHosting, setPayingHosting] = useState(false);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [subdomainInput, setSubdomainInput] = useState("");
  const [seoSettings, setSeoSettings] = useState<SiteSeo>(() => defaultSiteSeo());
  const [settingsState, setSettingsState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [settingsNote, setSettingsNote] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"content" | "media" | "design">("content");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [billing, setBilling] = useState<{
    canPublish: boolean;
    label: string;
    periodEnd?: string | null;
  } | null>(null);
  const [improving, setImproving] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [improveOpen, setImproveOpen] = useState(false);
  const [improveInstruction, setImproveInstruction] = useState("");
  const [improveNote, setImproveNote] = useState<string | null>(null);
  const [history, setHistory] = useState<Section[][]>([]);
  const [future, setFuture] = useState<Section[][]>([]);
  const [pages, setPages] = useState<Array<{ id: string; slug: string; title: string; sort_order: number }>>([]);
  const [previewPageSlug, setPreviewPageSlug] = useState("home");
  const [editPageId, setEditPageId] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [newPageTitle, setNewPageTitle] = useState("");
  const [pageBusy, setPageBusy] = useState(false);
  const [publishState, setPublishState] = useState<PublishState | null>(null);
  const [appOrigin, setAppOrigin] = useState("");
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setAppOrigin(window.location.origin);
  }, []);

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
        setBilling({
          canPublish: Boolean(billingData.canPublish),
          label: typeof billingData.label === "string" ? billingData.label : "$3/month",
          periodEnd: billingData.subscription?.periodEnd ?? null,
        });
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
    };
  }, [load]);

  function pushHistory(prev: Section[]) {
    setHistory((h) => [...h.slice(-19), prev]);
    setFuture([]);
  }

  async function persistProps(sectionId: string, props: Record<string, unknown>) {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/projects/${projectId}/sections`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, props }),
      });
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
      setSaveState("error");
      setError("Network error while saving.");
    }
  }

  function updateProps(sectionId: string, patch: Record<string, unknown>) {
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

  async function addSection(type: string, props?: Record<string, unknown>): Promise<Section | null> {
    const page = pages.find((p) => p.id === editPageId) ?? pages[0];
    const res = await fetch(`/api/projects/${projectId}/sections`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        pageSlug: page?.slug ?? "home",
        ...(props ? { props } : {}),
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
      return [...prev, section];
    });
    return section;
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
    const ordered = [...sections].sort((a, b) => a.sort_order - b.sort_order);
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

  async function addPage() {
    const slug = newPageSlug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "");
    const title = newPageTitle.trim();
    if (!slug || !title) {
      setError("Page slug and title are required.");
      return;
    }
    setPageBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not add page.");
        return;
      }
      setNewPageSlug("");
      setNewPageTitle("");
      await load();
      if (data.page?.id) setEditPageId(data.page.id);
      if (data.page?.slug) setPreviewPageSlug(data.page.slug);
    } finally {
      setPageBusy(false);
    }
  }

  async function removePage(pageId: string) {
    if (!confirm("Delete this page and all its sections?")) return;
    setPageBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not delete page.");
        return;
      }
      await load();
    } finally {
      setPageBusy(false);
    }
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

  async function payHostingWithJoko() {
    if (payingHosting) return;
    setPayingHosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/billing/subscribe`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/create/${projectId}`);
        return;
      }
      if (data.alreadyActive) {
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
    if (patch.theme && project) {
      setProject({ ...project, theme: { ...(project.theme as ThemeTokens), ...patch.theme } });
    }
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => {
      const subdomainValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSubdomain.trim()) && nextSubdomain.trim().length >= 3;
      void persistSiteSettings(
        subdomainValid ? nextSubdomain.trim().toLowerCase() : subdomainInput.trim().toLowerCase(),
        nextSeo,
        patch.theme,
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
      if (res.status === 402 && data.billingRequired) {
        setError(
          `Live hosting is ${data.monthlyLabel ?? "$3/month"} via JOKO mobile money. Pay below, then publish again.`,
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

  async function improveWithAi() {
    if (improving) return;
    setImproving(true);
    setError(null);
    setImproveNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-improve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: improveInstruction.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/create/${projectId}`);
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not improve with AI.");
        return;
      }
      setImproveNote(
        typeof data.message === "string"
          ? data.message
          : "Draft updated. Publish again to update your live site."
      );
      setImproveOpen(false);
      setHistory([]);
      setFuture([]);
      await load();
      setSaveState("saved");
    } catch {
      setError("Network error while improving. Retry.");
    } finally {
      setImproving(false);
    }
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

  const previewDefinition: WebsiteDefinition | null = project
    ? { ...buildDefinitionFromProjectParts({ ...project, seo: seoSettings }, pages, sections) }
    : null;

  const previewSiteBase = project?.subdomain ? `/sites/${project.subdomain}` : "";
  const maylecorRussianLayout = projectUsesMaylecorRussianLayout(
    project?.description,
    sections.map((s) => s.section_type),
  );
  const kdirectionLayout = projectUsesKdirectionLayout(
    project?.description,
    sections.map((s) => s.section_type),
  );

  const editPageSections = sections
    .filter((s) => s.page_id === editPageId)
    .sort((a, b) => a.sort_order - b.sort_order);

  const saveStatusLabel =
    saveState === "saving"
      ? "Saving draft…"
      : saveState === "saved"
        ? "Draft saved"
        : saveState === "error"
          ? "Save failed"
          : "";

  return (
    <div className="min-h-screen" style={{ background: BUILDER.bg, color: BUILDER.ink }}>
      <CreateShell
        step="edit"
        projectId={projectId}
        title={project?.title ?? "Editor"}
        backHref="/create/sites"
        actions={
          <>
            {publishState ? (
              <span
                className="hidden md:inline rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider"
                style={{
                  background: publishState.hasUnpublishedChanges ? "#FFF8E8" : "#E8F8EE",
                  color: publishState.hasUnpublishedChanges ? "#8B6914" : "#1B6B3A",
                }}
              >
                {publishState.hasUnpublishedChanges
                  ? publishState.isLive
                    ? "Unpublished changes"
                    : "Draft"
                  : "Live"}
              </span>
            ) : null}
            <span className="text-white/50 hidden lg:inline text-[10px]">{saveStatusLabel}</span>
            <Link
              href={`/create/sites/${projectId}`}
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "#ECEAE4", color: "#0F0D33" }}
            >
              Domain &amp; SEO
            </Link>
            <Link
              href={`/create/${projectId}/themes`}
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "#FFF0E8", color: "#9A3412" }}
            >
              Templates
            </Link>
            <Link
              href={`/create/${projectId}/preview`}
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ background: "#1C1A45" }}
            >
              Preview
            </Link>
            {maylecorRussianLayout || kdirectionLayout ? (
              <button
                type="button"
                onClick={() => void repairLayout()}
                disabled={repairing || loading}
                className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                style={{ background: "#FFE4F0", color: "#8B1A4A" }}
              >
                {repairing ? "Repairing…" : "Repair layout"}
              </button>
            ) : null}
            {!billing?.canPublish ? (
              <button
                type="button"
                onClick={() => void payHostingWithJoko()}
                disabled={payingHosting}
                className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                style={{ background: "#FFF4EC", color: "#C2410C", border: "1px solid rgba(255,85,0,0.35)" }}
                title="Hosting required before publish"
              >
                {payingHosting ? "…" : "Pay hosting"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void publish()}
              disabled={publishing || improving}
              className="rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
              style={{ background: "#00C851", color: "#0F0D33" }}
            >
              {publishing ? "…" : publishState?.hasUnpublishedChanges ? "Publish updates" : "Publish"}
            </button>
          </>
        }
      />

      {supportAssist ? (
        <div
          className="border-b px-4 py-2.5 text-center text-xs font-semibold"
          style={{ background: "#FF5500", color: "#fff" }}
        >
          Support assist mode — you are helping edit someone else’s site. Changes are audited.
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
            <Link href={`/create/sites/${projectId}`} className="font-bold underline">
              Open Domain &amp; SEO
            </Link>
          ) : null}
        </div>
      ) : null}

      {improveNote ? (
        <div
          className="border-b px-4 py-2 text-center text-[11px] font-medium"
          style={{ background: "#FFF4EC", color: "#C2410C" }}
          role="status"
        >
          {improveNote}
        </div>
      ) : null}

      {publishState?.hasUnpublishedChanges ? (
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
      ) : publishState?.isLive ? (
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

      {!loading && project && !project.business_id ? (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <BuilderBusinessNudge compact />
        </div>
      ) : null}

      <main className="flex h-[calc(100dvh-56px)] w-full overflow-hidden">
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
            <aside
              className="w-full max-w-[min(420px,40vw)] shrink-0 overflow-y-auto border-r px-4 py-4 space-y-4"
              style={{ borderColor: BUILDER.border, background: BUILDER.surface }}
            >
              <div
                className="flex rounded-xl p-1 gap-1"
                style={{ background: "#0F0D33" }}
                role="tablist"
                aria-label="Editor panels"
              >
                {(
                  [
                    ["content", "Pages"],
                    ["media", "Media"],
                    ["design", "Colors"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={sidebarTab === id}
                    onClick={() => setSidebarTab(id)}
                    className="flex-1 rounded-lg py-2 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: sidebarTab === id ? "#00C851" : "transparent",
                      color: sidebarTab === id ? "#0F0D33" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {sidebarTab === "media" && (
                <div className="rounded-2xl p-4" style={{ background: BUILDER.surfaceMuted, border: `1px solid ${BUILDER.border}` }}>
                  <SiteAssetsPanel
                    projectId={projectId}
                    onUseOnSite={(asset) => void applyMediaAsset(asset)}
                  />
                </div>
              )}

              {sidebarTab === "design" && (
                <div className="rounded-2xl p-4" style={{ background: BUILDER.surfaceMuted, border: `1px solid ${BUILDER.border}` }}>
                  <BuilderColorPanel
                    theme={(project?.theme as ThemeTokens) ?? previewDefinition?.theme ?? {
                      primary: "#0F0D33",
                      accent: "#E9006B",
                      background: "#FAFAF8",
                      text: "#0F0D33",
                      fontDisplay: "Fraunces",
                      fontBody: "system-ui",
                      spacing: "comfortable",
                    }}
                    heroAccent={String(
                      sections.find((s) => s.section_type === "legally-blonde-hero")?.props?.accentColor ?? "#E9006B",
                    )}
                    onThemeChange={(patch) => queueSiteSettingsSave({ theme: patch })}
                    onHeroAccentChange={(color) => {
                      const hero = sections.find((s) => s.section_type === "legally-blonde-hero");
                      if (hero) updateProps(hero.id, { accentColor: color });
                    }}
                  />
                </div>
              )}

              {sidebarTab === "content" && (
              <>
              <div className="rounded-2xl p-3 flex flex-wrap items-center gap-2" style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.08)", boxShadow: "0 4px 20px rgba(10,10,10,0.03)" }}>
                <button type="button" onClick={undo} className="text-xs px-3 py-1.5 rounded-full" style={{ background: "#FFF8F2" }} disabled={history.length === 0}>
                  Undo
                </button>
                <button type="button" onClick={redo} className="text-xs px-3 py-1.5 rounded-full" style={{ background: "#FFF8F2" }} disabled={future.length === 0}>
                  Redo
                </button>
                {!improveOpen ? (
                  <YandeAssistant
                    variant="improve"
                    value={improveInstruction}
                    onChange={setImproveInstruction}
                    onSubmit={() => {}}
                    collapsed
                    onExpand={() => setImproveOpen(true)}
                    busy={improving}
                  />
                ) : null}
              </div>

              {improveOpen && (
                <YandeAssistant
                  variant="improve"
                  value={improveInstruction}
                  onChange={setImproveInstruction}
                  onSubmit={() => void improveWithAi()}
                  onCancel={() => setImproveOpen(false)}
                  busy={improving}
                />
              )}

              <div className="rounded-2xl p-4" style={{ background: BUILDER.surface, border: `1px solid ${BUILDER.border}`, boxShadow: BUILDER.shadowSoft }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: BUILDER.orange }}>
                  Edit your site
                </p>
                <p className="text-xs mb-3 leading-relaxed" style={{ color: BUILDER.muted }}>
                  Pick a page, change words and photos — preview updates live. Use{" "}
                  <strong>Publish</strong> (top right) when ready. Domain &amp; SEO are outside this editor.
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: BUILDER.faint }}>
                  Add block
                </p>
                {pages.length > 1 && (
                  <label className="block text-[10px] uppercase tracking-wider mb-2">
                    Page
                    <select
                      value={editPageId}
                      onChange={(e) => {
                        setEditPageId(e.target.value);
                        const match = pages.find((p) => p.id === e.target.value);
                        if (match) setPreviewPageSlug(match.slug);
                      }}
                      className="mt-1 w-full rounded-lg px-2 py-1 text-xs"
                      style={{ border: "1px solid #DDE0F0" }}
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
                )}
                <div className="flex flex-wrap gap-1.5">
                  {BUILDER_QUICK_SECTIONS.map(({ type, label }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => void addSection(type)}
                      className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1.5 rounded-full transition-opacity hover:opacity-80"
                      style={{ background: BUILDER.surfaceMuted, color: BUILDER.ink, border: `1px solid ${BUILDER.border}` }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-4 space-y-3" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider">Pages</p>
                <ul className="space-y-1 text-xs">
                  {pages
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="font-semibold text-left truncate"
                          onClick={() => {
                            setEditPageId(p.id);
                            setPreviewPageSlug(p.slug);
                          }}
                        >
                          {p.title} <span className="opacity-50">/{p.slug}</span>
                        </button>
                        {pages.length > 1 && (
                          <button
                            type="button"
                            className="text-[10px] opacity-60 hover:opacity-100"
                            disabled={pageBusy}
                            onClick={() => void removePage(p.id)}
                          >
                            Remove
                          </button>
                        )}
                      </li>
                    ))}
                </ul>
                <div className="grid gap-2 pt-2 border-t border-[#E8E6DF]">
                  <input
                    className="w-full text-xs rounded-lg px-2 py-1.5"
                    style={{ border: "1px solid #DDE0F0" }}
                    placeholder="Page title (e.g. Shop)"
                    value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)}
                  />
                  <input
                    className="w-full text-xs rounded-lg px-2 py-1.5"
                    style={{ border: "1px solid #DDE0F0" }}
                    placeholder="Slug (e.g. shop)"
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={pageBusy}
                    onClick={() => void addPage()}
                    className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                    style={{ background: "#FF5500", color: "#0A0A0A" }}
                  >
                    Add page
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <BuilderSectionListDnd
                  sections={editPageSections}
                  selectedSectionId={selectedSectionId}
                  onSelect={(id) => setSelectedSectionId(id)}
                  onReorder={(ids) => void reorderSections(ids)}
                  onMoveUp={(id) => void moveSection(id, -1)}
                  onMoveDown={(id) => void moveSection(id, 1)}
                />
                {editPageSections.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-2xl p-3"
                      style={{
                        background: selectedSectionId === section.id ? "#FFF3EB" : "#fff",
                        border: selectedSectionId === section.id ? "2px solid #FF5500" : "1px solid #DDE0F0",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider">{section.section_type}</span>
                        <div className="flex gap-1">
                          <button type="button" className="text-[10px] px-1" onClick={() => void moveSection(section.id, -1)}>
                            ↑
                          </button>
                          <button type="button" className="text-[10px] px-1" onClick={() => void moveSection(section.id, 1)}>
                            ↓
                          </button>
                          <button type="button" className="text-[10px] px-1" onClick={() => void deleteSection(section.id)}>
                            Del
                          </button>
                        </div>
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
                            Russian layout — swap photos & font
                          </p>
                          <button
                            type="button"
                            className="w-full rounded-lg px-2 py-1.5 text-[11px] font-semibold"
                            style={{ border: "1px solid #FF5500", color: "#FF5500" }}
                            onClick={() =>
                              updateProps(section.id, {
                                backgroundLayer: "/templates/legally-blonde/background.png",
                                titleLogo: "/templates/legally-blonde/title-logo.svg",
                                cutoutLeft: "/templates/legally-blonde/cutout-left.png",
                                cutoutRight: "/templates/legally-blonde/cutout-right.png",
                                cutoutAccent: "/templates/legally-blonde/cutout-accent.png",
                                cutoutSparkle: "/templates/legally-blonde/cutout-sparkle.png",
                                macbook: "/templates/legally-blonde/macbook.png",
                                sparkleGif: "/templates/legally-blonde/cutout-sparkle.png",
                                heroPhoto: "/templates/legally-blonde/hero-photo.png",
                                displayFont: "Steelfish",
                                accentColor: "#E9006B",
                                scrollMode: "parallax",
                                appearance: "light",
                              })
                            }
                          >
                            Reset cutouts / bg / font to Russian original
                          </button>
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.title ?? "")}
                            onChange={(e) => updateProps(section.id, { title: e.target.value })}
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
                          <label className="block text-[10px] uppercase tracking-wider">
                            Display font (Steelfish = Russian)
                            <input
                              className="mt-1 w-full text-sm rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.displayFont ?? "Steelfish")}
                              onChange={(e) => updateProps(section.id, { displayFont: e.target.value })}
                              placeholder="Steelfish"
                            />
                          </label>
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: "#FF5500" }}>
                            Russian cutouts — keep Elle / Legally Blonde, or swap
                          </p>
                          <p className="text-[10px] leading-relaxed" style={{ color: "#6B5B45" }}>
                            Upload a transparent PNG to replace a cutout. On the preview: click a cutout → Upload, then drag it. Use + Add my cutout for extra photos. Remove clears that layer (does not fall back to the old image).
                          </p>
                          {(
                            [
                              ["titleLogo", "Spinning logo (SVG/PNG)"],
                              ["backgroundLayer", "Background layer"],
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
                            One-screen home (off = full Russian scroll)
                          </label>
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: "#FF5500" }}>
                            Music / social links
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
                            links={((section.props.navLinks as { label?: string; href?: string }[]) ?? []).map((l) => ({
                              label: String(l.label ?? ""),
                              href: String(l.href ?? ""),
                            }))}
                            onChange={(navLinks) => updateProps(section.id, { navLinks })}
                          />
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: "#FF5500" }}>
                            Social / music links
                          </p>
                          <button
                            type="button"
                            className="w-full rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ border: "1px solid #DDE0F0" }}
                            onClick={() => {
                              const next = [
                                ...((section.props.socialLinks as { label: string; href: string; iconUrl: string }[]) ??
                                  []),
                                { label: "Instagram", href: "https://instagram.com/", iconUrl: "" },
                              ];
                              updateProps(section.id, { socialLinks: next });
                            }}
                          >
                            + Add social / music link
                          </button>
                          {((section.props.socialLinks as { label?: string; href?: string; iconUrl?: string }[]) ?? []).map(
                            (link, idx) => (
                              <div key={idx} className="space-y-1 rounded-lg p-2" style={{ border: "1px solid #EEE" }}>
                                <input
                                  className="w-full text-xs rounded px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  value={link.label ?? ""}
                                  placeholder="Label (Spotify, Instagram…)"
                                  onChange={(e) => {
                                    const next = [...((section.props.socialLinks as typeof link[]) ?? [])];
                                    next[idx] = { ...next[idx]!, label: e.target.value };
                                    updateProps(section.id, { socialLinks: next });
                                  }}
                                />
                                <input
                                  className="w-full text-xs rounded px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  value={link.href ?? ""}
                                  placeholder="https://..."
                                  onChange={(e) => {
                                    const next = [...((section.props.socialLinks as typeof link[]) ?? [])];
                                    next[idx] = { ...next[idx]!, href: e.target.value };
                                    updateProps(section.id, { socialLinks: next });
                                  }}
                                />
                                <SectionPhotoField
                                  projectId={projectId}
                                  label="Icon"
                                  value={String(link.iconUrl ?? "")}
                                  onChange={(url) => {
                                    const next = [...((section.props.socialLinks as typeof link[]) ?? [])];
                                    next[idx] = { ...next[idx]!, iconUrl: url };
                                    updateProps(section.id, { socialLinks: next });
                                  }}
                                />
                                <button
                                  type="button"
                                  className="text-[10px] font-bold uppercase text-red-600"
                                  onClick={() => {
                                    const next = (
                                      (section.props.socialLinks as typeof link[]) ?? []
                                    ).filter((_, i) => i !== idx);
                                    updateProps(section.id, { socialLinks: next });
                                  }}
                                >
                                  Remove link
                                </button>
                              </div>
                            ),
                          )}
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
                            links={((section.props.navLinks as { label?: string; href?: string }[]) ?? []).map((l) => ({
                              label: String(l.label ?? ""),
                              href: String(l.href ?? ""),
                            }))}
                            onChange={(navLinks) => updateProps(section.id, { navLinks })}
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
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                            aria-label="Hero heading"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.subheading ?? "")}
                            onChange={(e) => updateProps(section.id, { subheading: e.target.value })}
                            aria-label="Hero subheading"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.buttonLabel ?? "")}
                            onChange={(e) => updateProps(section.id, { buttonLabel: e.target.value })}
                            aria-label="Button label"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.buttonHref ?? "")}
                            onChange={(e) => updateProps(section.id, { buttonHref: e.target.value })}
                            aria-label="Button link"
                          />
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
                            links={((section.props.links as { label?: string; href?: string }[]) ?? []).map((l) => ({
                              label: String(l.label ?? ""),
                              href: String(l.href ?? ""),
                            }))}
                            onChange={(links) => updateProps(section.id, { links })}
                          />
                        </div>
                      )}
                      {section.section_type === "footer" && (
                        <input
                          className="w-full text-sm rounded-lg px-2 py-1.5"
                          style={{ border: "1px solid #DDE0F0" }}
                          value={String(section.props.text ?? "")}
                          onChange={(e) => updateProps(section.id, { text: e.target.value })}
                        />
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
                          />
                          {(Array.isArray(section.props.items) ? section.props.items : []).map(
                            (item: { title?: string; body?: string }, idx: number) => (
                              <div key={idx} className="space-y-1 rounded-lg p-2" style={{ background: "#F4F2EC" }}>
                                <input
                                  className="w-full text-sm rounded-lg px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  value={String(item?.title ?? "")}
                                  onChange={(e) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], title: e.target.value };
                                    updateProps(section.id, { items });
                                  }}
                                  aria-label={`Feature ${idx + 1} title`}
                                  placeholder="Title"
                                />
                                <textarea
                                  className="w-full text-sm rounded-lg px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  value={String(item?.body ?? "")}
                                  onChange={(e) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], body: e.target.value };
                                    updateProps(section.id, { items });
                                  }}
                                  aria-label={`Feature ${idx + 1} body`}
                                  placeholder="Short description"
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
                            + Add offer
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
                            aria-label="Testimonials heading"
                          />
                          {(Array.isArray(section.props.items) ? section.props.items : []).map(
                            (item: { quote?: string; name?: string }, idx: number) => (
                              <div key={idx} className="space-y-1 rounded-lg p-2" style={{ background: "#F4F2EC" }}>
                                <textarea
                                  className="w-full text-sm rounded-lg px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  value={String(item?.quote ?? "")}
                                  onChange={(e) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], quote: e.target.value };
                                    updateProps(section.id, { items });
                                  }}
                                  aria-label={`Testimonial ${idx + 1} quote`}
                                  placeholder="Customer quote"
                                />
                                <input
                                  className="w-full text-sm rounded-lg px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  value={String(item?.name ?? "")}
                                  onChange={(e) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], name: e.target.value };
                                    updateProps(section.id, { items });
                                  }}
                                  aria-label={`Testimonial ${idx + 1} name`}
                                  placeholder="Name"
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
                                { quote: "Great experience.", name: "Customer" },
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
                          <SiteMediaUpload
                            projectId={projectId}
                            kind="video"
                            value={String(section.props.src ?? "")}
                            onChange={(src) => updateProps(section.id, { src })}
                            label="Video file"
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            placeholder="Or YouTube URL"
                            value={String(section.props.src ?? "")}
                            onChange={(e) => updateProps(section.id, { src: e.target.value })}
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            placeholder="Heading (optional)"
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                          />
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
                        <div className="space-y-2">
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.heading ?? "")}
                            onChange={(e) => updateProps(section.id, { heading: e.target.value })}
                            placeholder="Section heading"
                          />
                          <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
                            Catalog lives in{" "}
                            <Link href={`/shop/${projectId}`} className="font-bold underline" style={{ color: "#FF5500" }}>
                              Kebu Shop
                            </Link>{" "}
                            (separate from this builder). Add or edit products there, then publish this site.
                          </p>
                          <Link
                            href={`/shop/${projectId}`}
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
                        <div className="space-y-2">
                          <p className="text-[10px] leading-relaxed" style={{ color: BUILDER.muted }}>
                            Shopify-style layout — click text in the preview to edit, drag blocks to move.
                          </p>
                          <button
                            type="button"
                            className="text-[11px] font-semibold underline"
                            onClick={() => {
                              const blocks = [
                                ...(Array.isArray(section.props.blocks) ? section.props.blocks : []),
                                {
                                  id: `text-${Date.now()}`,
                                  text: "New text block",
                                  x: 10,
                                  y: 20,
                                  width: 80,
                                  fontSize: "md",
                                  align: "left",
                                  color: "",
                                },
                              ];
                              updateProps(section.id, { blocks });
                            }}
                          >
                            + Add text block
                          </button>
                        </div>
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
                      {!["hero", "text", "free-text", "navigation", "footer", "whatsapp", "contact", "features", "faq", "testimonials", "video", "audio", "map", "events", "image", "gallery", "products", "newsletter", "maylecor-home", "maylecor-music", "legally-blonde-hero", "kdirection-home", "kdirection-page"].includes(
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
              </div>
              </>
              )}
            </aside>

            <section
              className="flex min-w-0 flex-1 flex-col overflow-hidden"
              style={{
                background: maylecorRussianLayout
                  ? "#FFE4F0"
                  : sections.some(
                        (s) =>
                          s.section_type === "kdirection-home" ||
                          s.section_type === "kdirection-page",
                      )
                    ? "#f5f5f5"
                    : "#0a0a0a",
              }}
            >
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2"
                style={{
                  borderColor: maylecorRussianLayout
                    ? "rgba(233,0,107,0.25)"
                    : "rgba(255,255,255,0.1)",
                }}
              >
                {pages.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {pages
                      .slice()
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPreviewPageSlug(p.slug);
                            setEditPageId(p.id);
                          }}
                          className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                          style={{
                            background: previewPageSlug === p.slug ? "#0F0D33" : "#fff",
                            color: previewPageSlug === p.slug ? "#fff" : "#0F0D33",
                            border: "1px solid #DDE0F0",
                          }}
                        >
                          {p.title}
                        </button>
                      ))}
                  </div>
                ) : (
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{
                      color: maylecorRussianLayout
                        ? "#8B1A4A"
                        : "#8A8578",
                    }}
                  >
                    Live preview
                  </span>
                )}
                <div className="flex items-center gap-1 rounded-full p-0.5" style={{ background: "#ECEAE4" }}>
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
                        background: device === id ? "#0F0D33" : "transparent",
                        color: device === id ? "#fff" : "#5C5348",
                      }}
                      aria-pressed={device === id}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mx-auto flex-1 w-full overflow-y-auto p-3 sm:p-4">
                <div
                  className="mx-auto overflow-hidden bg-white"
                  style={{
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
                  }}
                >
                {previewDefinition && (
                  <BuilderEditablePreview
                    definition={previewDefinition}
                    pageSlug={previewPageSlug}
                    siteBase={previewSiteBase || undefined}
                    projectId={projectId}
                    device={device}
                    onAssetDrop={(asset, drop) => void applyMediaAsset(asset, drop)}
                    editor={{
                      selectedSectionId,
                      onSelectSection: (id) => {
                        setSelectedSectionId(id);
                        const match = sections.find((s) => s.id === id);
                        if (match) setEditPageId(match.page_id);
                      },
                      onPatchSection: updateProps,
                      onMoveFreeTextBlock: (sectionId, blockId, x, y) => {
                        const section = sections.find((s) => s.id === sectionId);
                        if (!section || section.section_type !== "free-text") return;
                        const blocks = Array.isArray(section.props.blocks) ? [...section.props.blocks] : [];
                        const idx = blocks.findIndex((b: { id?: string }) => b.id === blockId);
                        if (idx < 0) return;
                        blocks[idx] = { ...blocks[idx], x, y };
                        updateProps(sectionId, { blocks });
                      },
                    }}
                  />
                )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

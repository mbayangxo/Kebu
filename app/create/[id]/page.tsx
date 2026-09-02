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
import { customDomainDnsTarget, isObsoleteDnsTarget } from "@/lib/create/dns-target";
import { SiteProductsPanel } from "@/app/components/create/site-products-panel";
import { SectionPhotoField } from "@/app/components/create/section-photo-field";
import { BuilderBusinessNudge } from "@/app/components/create/builder-business-nudge";
import { BuilderEditablePreview } from "@/app/components/create/builder-editable-preview";
import { BuilderSectionListDnd } from "@/app/components/create/builder-section-list-dnd";
import { SiteMediaUpload } from "@/app/components/create/site-media-upload";
import { productRowToSectionItem, type ProjectProductRow } from "@/lib/create/project-products";
import { SiteAssetsPanel } from "@/app/components/create/site-assets-panel";
import { BuilderColorPanel } from "@/app/components/create/builder-color-panel";
import { SiteDomainSeoPanel } from "@/app/components/create/site-domain-seo-panel";
import type { ThemeTokens } from "@/lib/create/website-schema";
import { KEBU } from "@/lib/kebu-brand";

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
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [publishing, setPublishing] = useState(false);
  const [payingHosting, setPayingHosting] = useState(false);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [httpsLiveUrl, setHttpsLiveUrl] = useState<string | null>(null);
  const [subdomainInput, setSubdomainInput] = useState("");
  const [seoSettings, setSeoSettings] = useState<SiteSeo>(() => defaultSiteSeo());
  const [settingsState, setSettingsState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [settingsNote, setSettingsNote] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"content" | "media" | "design" | "products" | "site" | "launch">("content");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [billing, setBilling] = useState<{
    canPublish: boolean;
    label: string;
    periodEnd?: string | null;
  } | null>(null);
  const [improving, setImproving] = useState(false);
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
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [customDomains, setCustomDomains] = useState<
    Array<{
      id: string;
      hostname: string;
      status: string;
      is_primary: boolean;
      dns_target?: string | null;
      last_error?: string | null;
    }>
  >([]);
  const [domainBusy, setDomainBusy] = useState(false);
  const [domainNote, setDomainNote] = useState<string | null>(null);
  const [domainSteps, setDomainSteps] = useState<string[]>([]);
  const [domainDnsTarget, setDomainDnsTarget] = useState<string | null>(null);
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
      if (typeof data.project?.description === "string" && data.project.description.includes("portfolio:maylecor")) {
        const upRes = await fetch(`/api/projects/${projectId}/upgrade-maylecor`, {
          method: "POST",
          credentials: "include",
        });
        const upData = (await upRes.json().catch(() => ({}))) as { upgraded?: boolean };
        if (upRes.ok && upData.upgraded) {
          const res2 = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
          const data2 = await res2.json().catch(() => ({}));
          if (res2.ok) projectPayload = data2;
        }
      }
      setProject(projectPayload.project ?? data.project);
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
      setHttpsLiveUrl(sub ? `/sites/${sub}` : null);
      setSeoSettings(defaultSiteSeo(data.project?.title ?? "My website"));
      if (data.project?.seo && typeof data.project.seo === "object") {
        setSeoSettings((prev) => ({ ...prev, ...(data.project.seo as SiteSeo) }));
      }

      const billingRes = await fetch(`/api/projects/${projectId}/billing`, { credentials: "include" });
      const billingData = await billingRes.json().catch(() => ({}));
      if (billingRes.ok) {
        setBilling({
          canPublish: Boolean(billingData.canPublish),
          label: typeof billingData.label === "string" ? billingData.label : "$4/month",
          periodEnd: billingData.subscription?.periodEnd ?? null,
        });
      }

      const domainsRes = await fetch(`/api/projects/${projectId}/domains`, { credentials: "include" });
      const domainsData = await domainsRes.json().catch(() => ({}));
      if (domainsRes.ok) {
        const list = Array.isArray(domainsData.domains) ? domainsData.domains : [];
        setCustomDomains(list);
        if (typeof domainsData.dnsTarget === "string") {
          const canonical = customDomainDnsTarget(sub);
          setDomainDnsTarget(
            isObsoleteDnsTarget(domainsData.dnsTarget) ? canonical : domainsData.dnsTarget,
          );
        } else if (domainsData.instructions?.dnsTarget) {
          const raw = domainsData.instructions.dnsTarget as string;
          setDomainDnsTarget(isObsoleteDnsTarget(raw) ? customDomainDnsTarget(sub) : raw);
        } else if (sub) {
          setDomainDnsTarget(customDomainDnsTarget(sub));
        }
        if (domainsData.instructions?.steps) {
          setDomainSteps(domainsData.instructions.steps);
        } else {
          setDomainSteps([]);
        }
        const verified = list.find(
          (d: { status?: string; hostname?: string }) => d.status === "verified",
        );
        if (verified?.hostname) {
          setHttpsLiveUrl(`https://www.${verified.hostname}`);
        } else if (sub) {
          setHttpsLiveUrl(`/sites/${sub}`);
        }
        const pending = list.find(
          (d: { status?: string; id?: string }) => d.status === "pending" || d.status === "failed",
        );
        if (pending?.id) {
          void fetch(`/api/projects/${projectId}/domains/${pending.id}/verify`, {
            method: "POST",
            credentials: "include",
          })
            .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
            .then(({ ok, data }) => {
              if (!ok || !data.domain) return;
              setCustomDomains((prev) =>
                prev.map((d) => (d.id === pending.id ? { ...d, ...data.domain } : d)),
              );
              if (data.ok && data.liveUrl) {
                setHttpsLiveUrl(data.liveUrl);
                setDomainNote(`Domain verified — live at ${data.liveUrl}`);
              } else if (data.detail) {
                setDomainNote(data.detail);
              }
            })
            .catch(() => {});
        }
      } else if (typeof domainsData.error === "string") {
        setDomainNote(domainsData.error);
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

  function syncProductsPreview(rows: ProjectProductRow[]) {
    const items = rows.filter((r) => r.is_active).map(productRowToSectionItem);
    setSections((prev) =>
      prev.map((s) =>
        s.section_type === "products"
          ? { ...s, props: { ...(s.props ?? {}), heading: (s.props?.heading as string) || "Shop", items } }
          : s,
      ),
    );
  }

  async function ensureProductsSection() {
    const hasProducts = sections.some((s) => s.section_type === "products");
    if (!hasProducts) {
      await addSection("products");
    }
  }

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
        setError(typeof data.error === "string" ? data.error : "Save failed.");
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
    } catch {
      setSaveState("error");
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

  async function addSection(type: string) {
    const page = pages.find((p) => p.id === editPageId) ?? pages[0];
    const res = await fetch(`/api/projects/${projectId}/sections`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, pageSlug: page?.slug ?? "home" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not add section.");
      return;
    }
    setSections((prev) => {
      pushHistory(prev);
      return [...prev, data.section];
    });
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
      if (typeof data.httpsUrl === "string") setHttpsLiveUrl(data.httpsUrl);
      if (data.project?.subdomain) {
        setPublishUrl(`/sites/${data.project.subdomain}`);
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

  async function addCustomDomain() {
    if (domainBusy) return;
    const hostname = customDomainInput.trim();
    if (!hostname) {
      setDomainNote("Enter your domain, e.g. mybrand.com");
      return;
    }
    if (!subdomainInput.trim()) {
      setDomainNote("Pick a Kebu subdomain first — it connects to your real domain.");
      return;
    }
    setDomainBusy(true);
    setDomainNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/domains`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname, isPrimary: true, provider: "manual" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDomainNote(typeof data.error === "string" ? data.error : "Could not save domain.");
        return;
      }
      setCustomDomains((prev) => {
        if (!data.domain) return prev;
        const rest = prev.filter((d) => d.id !== data.domain.id);
        return [data.domain, ...rest];
      });
      if (data.instructions?.steps) {
        setDomainSteps(data.instructions.steps);
        setDomainDnsTarget(data.instructions.dnsTarget ?? null);
      }
      setDomainNote(data.message ?? "Domain saved. Update DNS at your registrar, then verify.");
      setCustomDomainInput("");
    } catch {
      setDomainNote("Network error. Retry.");
    } finally {
      setDomainBusy(false);
    }
  }

  async function verifyCustomDomain(domainId: string) {
    if (domainBusy) return;
    setDomainBusy(true);
    setDomainNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/domains/${domainId}/verify`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDomainNote(typeof data.error === "string" ? data.error : "Verify failed.");
        return;
      }
      if (data.domain) {
        setCustomDomains((prev) => prev.map((d) => (d.id === domainId ? { ...d, ...data.domain } : d)));
      }
      if (data.liveUrl) setHttpsLiveUrl(data.liveUrl);
      const noteParts = [data.detail];
      if (typeof data.sslNote === "string") noteParts.push(data.sslNote);
      setDomainNote(noteParts.filter(Boolean).join(" · ") || (data.ok ? "Domain verified!" : "DNS not ready yet."));
      if (data.instructions?.steps) {
        setDomainSteps(data.instructions.steps);
        setDomainDnsTarget(data.instructions.dnsTarget ?? null);
      }
      if (data.ok) await load();
    } catch {
      setDomainNote("Network error. Retry.");
    } finally {
      setDomainBusy(false);
    }
  }

  function copyDnsTarget() {
    const target = customDomainDnsTarget(subdomainInput || "site");
    void navigator.clipboard?.writeText(target);
    setDomainNote(`Copied: ${target}`);
  }

  const canonicalDnsTarget = customDomainDnsTarget(subdomainInput || "site");

  const livePath = subdomainInput.trim() ? `/sites/${subdomainInput.trim().toLowerCase()}` : null;
  const fullLiveUrl = livePath && appOrigin ? `${appOrigin}${livePath}` : livePath;

  async function removeCustomDomain(domainId: string) {
    if (domainBusy) return;
    setDomainBusy(true);
    setDomainNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/domains`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDomainNote(typeof data.error === "string" ? data.error : "Could not remove domain.");
        return;
      }
      setCustomDomains((prev) => prev.filter((d) => d.id !== domainId));
      setDomainSteps([]);
      setDomainDnsTarget(null);
      if (subdomainInput.trim()) {
        setHttpsLiveUrl(`/sites/${subdomainInput.trim().toLowerCase()}`);
      }
      setDomainNote("Domain removed.");
    } catch {
      setDomainNote("Network error. Retry.");
    } finally {
      setDomainBusy(false);
    }
  }

  async function publish() {
    if (publishing) return;
    if (!subdomainInput.trim()) {
      setError("Choose a subdomain before publishing (e.g. my-brand).");
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
          `Live hosting is ${data.monthlyLabel ?? "$4/month"} via JOKO mobile money. Pay below, then publish again.`,
        );
        setBilling((b) => (b ? { ...b, canPublish: false } : b));
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Publish failed.");
        return;
      }
      setPublishUrl(data.deployment?.public_path ?? data.liveUrl);
      if (typeof data.liveUrl === "string") setHttpsLiveUrl(data.liveUrl);
      else if (typeof data.publicPath === "string") setHttpsLiveUrl(data.publicPath);
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

  const previewDefinition: WebsiteDefinition | null = project
    ? { ...buildDefinitionFromProjectParts({ ...project, seo: seoSettings }, pages, sections) }
    : null;

  const previewSiteBase = project?.subdomain ? `/sites/${project.subdomain}` : "";

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
            <span className="text-white/50 hidden md:inline text-[10px]">{saveStatusLabel}</span>
            <Link
              href={`/create/${projectId}/preview`}
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ background: "#1C1A45" }}
            >
              Preview
            </Link>
            <button
              type="button"
              onClick={() => void publish()}
              disabled={publishing || improving}
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
              style={{ background: "#00C851", color: "#0F0D33" }}
            >
              {publishing ? "…" : publishState?.hasUnpublishedChanges ? "Publish updates" : "Publish"}
            </button>
          </>
        }
      />

      {publishState?.hasUnpublishedChanges ? (
        <div
          className="border-b px-4 py-2.5 text-center text-xs leading-relaxed"
          style={{ background: "#FFF8E8", borderColor: "#F0E4C8", color: "#6B5B45" }}
        >
          <strong style={{ color: "#0F0D33" }}>You are editing a draft.</strong> Changes save automatically but{" "}
          <strong>visitors only see your last published version</strong> until you click{" "}
          <strong>Publish updates</strong>.
          {publishState.isLive && publishState.livePublicPath ? (
            <>
              {" "}
              Live site:{" "}
              <a href={publishState.livePublicPath} target="_blank" rel="noreferrer" className="underline font-semibold">
                {publishState.livePublicPath}
              </a>
            </>
          ) : null}
        </div>
      ) : publishState?.isLive ? (
        <div
          className="border-b px-4 py-2 text-center text-[11px]"
          style={{ background: "#E8F8EE", borderColor: "#C8E8D4", color: "#1B6B3A" }}
        >
          Live and up to date. Edit anytime — publish again when you want changes to go public.
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
                    ["products", "Shop"],
                    ["site", "Domain"],
                    ["launch", "Publish"],
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

              {sidebarTab === "launch" && (
              <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
                <h1 className="font-bold text-lg mb-1">{project?.title}</h1>
                <p className="text-xs uppercase tracking-wider" style={{ color: "#8A8578" }}>
                  {project?.status}
                  {project?.subdomain ? ` · ${project.subdomain}` : ""}
                </p>
                <p className="text-xs mt-2" style={{ color: "#6B5B45" }}>
                  Edit freely — everything saves as a draft. Only <strong>Publish</strong> pushes changes to your live
                  site.
                </p>
                <div
                  className="mt-3 rounded-xl p-3 text-xs leading-relaxed"
                  style={{ background: "#F4F2EC", color: "#6B5B45" }}
                >
                  <p className="font-semibold mb-1" style={{ color: "#0F0D33" }}>
                    Live hosting · JOKO · {billing?.label ?? "$4/month"}
                  </p>
                  {billing?.canPublish ? (
                    <p>
                      Hosting active
                      {billing.periodEnd
                        ? ` until ${new Date(billing.periodEnd).toLocaleDateString()}`
                        : ""}
                      . Publish goes live at <strong>/sites/your-name</strong> on this Vercel app — no custom domain needed.
                    </p>
                  ) : (
                    <>
                      <p className="mb-2">
                        Publish needs active hosting (JOKO mobile money in production). Without it you get
                        402 — editing stays free.
                      </p>
                      <button
                        type="button"
                        onClick={() => void payHostingWithJoko()}
                        disabled={payingHosting}
                        className="rounded-full px-3 py-1.5 font-bold uppercase tracking-wider disabled:opacity-50"
                        style={{ background: "#00C851", color: "#0F0D33" }}
                      >
                        {payingHosting ? "Opening JOKO…" : "Pay with JOKO"}
                      </button>
                    </>
                  )}
                </div>
                {fullLiveUrl && (
                  <a href={fullLiveUrl} target="_blank" rel="noreferrer" className="block text-sm mt-2 font-bold underline break-all" style={{ color: "#0A0A0A" }}>
                    Live URL: {fullLiveUrl}
                  </a>
                )}
                {publishUrl && !fullLiveUrl && (
                  <a href={publishUrl} target="_blank" rel="noreferrer" className="block text-xs mt-2 font-semibold underline" style={{ color: "#FF5500" }}>
                    Open on Kebu: {publishUrl}
                  </a>
                )}
                {fullLiveUrl && (
                  <p className="text-[11px] mt-1" style={{ color: "#5C5348" }}>
                    Public URL: <strong>{fullLiveUrl}</strong>. Custom domain: open the <strong>Domain</strong> tab —
                    CNAME <strong>www</strong> → <strong>{canonicalDnsTarget}</strong> at
                    Namecheap.
                  </p>
                )}
                {improveNote && (
                  <p className="text-xs mt-2 font-medium" style={{ color: "#FF5500" }} role="status">
                    {improveNote}
                  </p>
                )}
                {error && (
                  <p role="alert" className="text-xs mt-2" style={{ color: "#8B1E1E" }}>
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void publish()}
                  disabled={publishing || improving}
                  className="mt-4 w-full rounded-full py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                  style={{ background: "#00C851", color: "#0F0D33" }}
                >
                  {publishing ? "Publishing…" : "Publish to Kebu"}
                </button>
              </div>
              )}

              {sidebarTab === "products" && (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider">Site catalog</p>
                <button
                  type="button"
                  onClick={() => void ensureProductsSection()}
                  className="text-[10px] underline"
                  style={{ color: "#FF5500" }}
                >
                  Add products section to page (if missing)
                </button>
                <SiteProductsPanel
                  projectId={projectId}
                  merchantWhatsApp={seoSettings.commerce?.merchantWhatsApp ?? ""}
                  onMerchantWhatsAppChange={(merchantWhatsApp) =>
                    queueSiteSettingsSave({
                      seo: {
                        commerce: {
                          merchantWhatsApp,
                          preferJokoCheckout: seoSettings.commerce?.preferJokoCheckout ?? false,
                        },
                      },
                    })
                  }
                  onSyncedToSite={syncProductsPreview}
                />
              </div>
              )}

              {sidebarTab === "site" && <SiteDomainSeoPanel projectId={projectId} />}

              {sidebarTab === "media" && (
                <div className="rounded-2xl p-4" style={{ background: BUILDER.surfaceMuted, border: `1px solid ${BUILDER.border}` }}>
                  <SiteAssetsPanel projectId={projectId} />
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
                  Pick a page, change words and photos — preview updates live. Publish when you are happy.
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
                        </div>
                      )}
                      {section.section_type === "legally-blonde-hero" && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>
                            Words
                          </p>
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
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.ctaLabel ?? "")}
                            onChange={(e) => updateProps(section.id, { ctaLabel: e.target.value })}
                            placeholder="Button text"
                          />
                          <p className="text-[10px] font-bold uppercase tracking-wider pt-2" style={{ color: "#FF5500" }}>
                            Photos — tap upload
                          </p>
                          {(
                            [
                              ["titleLogo", "Logo in navigation"],
                              ["backgroundLayer", "Background layer"],
                              ["cutoutLeft", "Cutout left"],
                              ["cutoutRight", "Cutout right"],
                              ["cutoutAccent", "Center portrait"],
                              ["cutoutSparkle", "Sparkle / small logo"],
                              ["macbook", "Album / MacBook mockup"],
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
                            One-screen home (navigate with top menu — no scroll)
                          </label>
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
                        <input
                          className="w-full text-sm rounded-lg px-2 py-1.5"
                          style={{ border: "1px solid #DDE0F0" }}
                          value={String(section.props.brand ?? "")}
                          onChange={(e) => updateProps(section.id, { brand: e.target.value })}
                        />
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
                            Use the <strong>Products</strong> tab for your full catalog. Edit quick items here — customers
                            order via WhatsApp; store checkout with JOKO mobile money is coming soon.
                          </p>
                          {(Array.isArray(section.props.items) ? section.props.items : []).map(
                            (
                              item: {
                                name?: string;
                                description?: string;
                                priceLabel?: string;
                                imageUrl?: string;
                                whatsappMessage?: string;
                              },
                              idx: number,
                            ) => (
                              <div key={idx} className="space-y-1 rounded-lg p-2" style={{ background: BUILDER.surfaceMuted }}>
                                <input
                                  className="w-full text-sm rounded-lg px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  value={String(item?.name ?? "")}
                                  placeholder="Product name"
                                  onChange={(e) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], name: e.target.value };
                                    updateProps(section.id, { items });
                                  }}
                                />
                                <input
                                  className="w-full text-sm rounded-lg px-2 py-1"
                                  style={{ border: "1px solid #DDE0F0" }}
                                  value={String(item?.priceLabel ?? "")}
                                  placeholder="Price (e.g. 5 000 XOF)"
                                  onChange={(e) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], priceLabel: e.target.value };
                                    updateProps(section.id, { items });
                                  }}
                                />
                                <SectionPhotoField
                                  projectId={projectId}
                                  label="Product image"
                                  value={String(item?.imageUrl ?? "")}
                                  onChange={(url) => {
                                    const items = [...(Array.isArray(section.props.items) ? section.props.items : [])];
                                    items[idx] = { ...items[idx], imageUrl: url };
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
                                  Remove product
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
                                { name: "New product", description: "", priceLabel: "", imageUrl: "", whatsappMessage: "" },
                              ];
                              updateProps(section.id, { items });
                            }}
                          >
                            + Add product
                          </button>
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
                      {!["hero", "text", "free-text", "navigation", "footer", "whatsapp", "contact", "features", "faq", "testimonials", "video", "audio", "map", "events", "image", "gallery", "products", "newsletter", "maylecor-home", "maylecor-music", "legally-blonde-hero"].includes(
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

            <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0a0a0a]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
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
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8A8578" }}>
                    Live preview
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setDevice(device === "desktop" ? "mobile" : "desktop")}
                  className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "#0F0D33", color: "#fff" }}
                >
                  {device} view
                </button>
              </div>
              <div
                className="mx-auto flex-1 w-full overflow-y-auto"
                style={{
                  maxWidth: device === "mobile" ? 390 : "100%",
                }}
              >
                <div
                  className="mx-auto overflow-hidden"
                  style={{
                    minHeight: "100%",
                    border: device === "mobile" ? "1px solid #333" : undefined,
                    borderRadius: device === "mobile" ? 16 : 0,
                  }}
                >
                {previewDefinition && (
                  <BuilderEditablePreview
                    definition={previewDefinition}
                    pageSlug={previewPageSlug}
                    siteBase={previewSiteBase || undefined}
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

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CreateShell } from "@/app/components/create/create-shell";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { buildDefinitionFromProjectParts } from "@/lib/create/editor-definition";
import { SECTION_TYPES } from "@/lib/create/website-schema";
import type { SiteSeo } from "@/lib/create/site-seo";
import { defaultSiteSeo } from "@/lib/create/site-seo";

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
  const [sidebarTab, setSidebarTab] = useState<"content" | "site" | "launch">("content");
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
  const [namecheapUrl, setNamecheapUrl] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
      setProject(data.project);
      setPages(Array.isArray(data.pages) ? data.pages : []);
      setSections(Array.isArray(data.sections) ? data.sections : []);
      const firstPage = Array.isArray(data.pages) ? data.pages[0] : null;
      if (firstPage?.slug) {
        setPreviewPageSlug(firstPage.slug);
        setEditPageId(firstPage.id);
      }
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
        if (domainsData.instructions?.steps) {
          setDomainSteps(domainsData.instructions.steps);
          setDomainDnsTarget(domainsData.instructions.dnsTarget ?? null);
          setNamecheapUrl(domainsData.instructions.namecheapUrl ?? null);
        } else {
          setDomainSteps([]);
          setDomainDnsTarget(null);
          setNamecheapUrl(null);
        }
        const verified = list.find(
          (d: { status?: string; hostname?: string }) => d.status === "verified",
        );
        if (verified?.hostname) {
          setHttpsLiveUrl(`https://www.${verified.hostname}`);
        } else if (sub) {
          setHttpsLiveUrl(`/sites/${sub}`);
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
    const slug = newPageSlug.trim().toLowerCase().replace(/\s+/g, "-");
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

  async function persistSiteSettings(nextSubdomain: string, nextSeo: SiteSeo) {
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

  function queueSiteSettingsSave(patch: { subdomain?: string; seo?: Partial<SiteSeo> }) {
    const nextSubdomain = patch.subdomain ?? subdomainInput;
    const nextSeo = { ...seoSettings, ...(patch.seo ?? {}) };
    if (patch.subdomain !== undefined) setSubdomainInput(patch.subdomain);
    if (patch.seo) setSeoSettings(nextSeo);
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => {
      const subdomainValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSubdomain.trim()) && nextSubdomain.trim().length >= 3;
      void persistSiteSettings(
        subdomainValid ? nextSubdomain.trim().toLowerCase() : subdomainInput.trim().toLowerCase(),
        nextSeo,
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
        setNamecheapUrl(data.instructions.namecheapUrl ?? null);
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
      setDomainNote(data.detail ?? (data.ok ? "Domain verified!" : "DNS not ready yet."));
    } catch {
      setDomainNote("Network error. Retry.");
    } finally {
      setDomainBusy(false);
    }
  }

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
      else if (typeof data.kebuAfricaUrl === "string") setHttpsLiveUrl(data.kebuAfricaUrl);
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
    ? buildDefinitionFromProjectParts(project, pages, sections)
    : null;

  const previewSiteBase = project?.subdomain ? `/sites/${project.subdomain}` : "";

  const editPageSections = sections
    .filter((s) => s.page_id === editPageId)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", color: "#0F0D33" }}>
      <CreateShell
        step="edit"
        projectId={projectId}
        title={project?.title ?? "Editor"}
        actions={
          <>
            <span className="text-white/50 hidden md:inline text-[10px]">
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Error" : ""}
            </span>
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
              {publishing ? "…" : "Publish"}
            </button>
          </>
        }
      />

      <main className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-[340px_1fr] gap-6">
        {loading ? (
          <p className="text-sm" style={{ color: "#6B5B45" }}>
            Loading…
          </p>
        ) : error && !project ? (
          <div role="alert" className="rounded-xl p-4" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
            {error}
            <button type="button" className="underline ml-2" onClick={() => void load()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <aside className="space-y-4">
              <div
                className="flex rounded-xl p-1 gap-1"
                style={{ background: "#0F0D33" }}
                role="tablist"
                aria-label="Editor panels"
              >
                {(
                  [
                    ["content", "Content"],
                    ["site", "Site & SEO"],
                    ["launch", "Go live"],
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
                  Next: edit your pages, improve with AI if you want, then publish when ready.
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
                      . Publish writes a live deployment at <strong>/sites/your-name</strong>.{" "}
                      <strong>*.kebu.africa</strong> is planned after that domain is owned.
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
                {publishUrl && (
                  <a href={publishUrl} target="_blank" rel="noreferrer" className="block text-xs mt-2 font-semibold underline" style={{ color: "#FF5500" }}>
                    Open on Kebu: {publishUrl}
                  </a>
                )}
                {httpsLiveUrl && (
                  <a href={httpsLiveUrl} target="_blank" rel="noreferrer" className="block text-sm mt-2 font-bold underline break-all" style={{ color: "#0A0A0A" }}>
                    {httpsLiveUrl.includes("kebu.africa")
                      ? "Planned (domain not owned): "
                      : httpsLiveUrl.startsWith("/sites/")
                        ? "Live path: "
                        : "Your domain: "}
                    {httpsLiveUrl}
                  </a>
                )}
                {httpsLiveUrl?.startsWith("/sites/") && (
                  <p className="text-[11px] mt-1" style={{ color: "#5C5348" }}>
                    Open this on your real app host (Vercel / alkebulan). maylecor.kebu.africa will not work until
                    you own kebu.africa.
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

              {sidebarTab === "site" && (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider">Site address · DNS · SEO</p>
                <p className="text-xs leading-relaxed" style={{ color: "#6B5B45" }}>
                  Live today: <strong>/sites/your-name</strong> on this app. Slug label{" "}
                  <strong>your-name.kebu.africa</strong> is reserved for later — Kebu does not own that domain yet.
                  Path preview always works at <strong>/sites/your-name</strong>. Connect your own domain when
                  ready — DNS verify here ≠ HTTPS done.
                </p>
                <label className="block text-[10px] uppercase tracking-wider">
                  Subdomain (required to publish)
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    <input
                      className="w-full rounded-lg px-2 py-1.5"
                      style={{ border: "1px solid #DDE0F0" }}
                      value={subdomainInput}
                      onChange={(e) => queueSiteSettingsSave({ subdomain: e.target.value.toLowerCase() })}
                      placeholder="my-brand"
                      aria-label="Site subdomain"
                    />
                    <span className="whitespace-nowrap text-[10px]" style={{ color: "#8A8578" }}>
                      → /sites/{subdomainInput || "…"}
                    </span>
                  </div>
                </label>

                <div className="rounded-xl p-3 space-y-2" style={{ background: "#F8F7F4", border: "1px solid #E8E4DC" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider">Your real domain</p>
                  <p className="text-[10px] leading-relaxed" style={{ color: "#6B5B45" }}>
                    Verify checks DNS only. Attaching the domain for HTTPS on Vercel/host is still a manual
                    ops step after DNS is correct. Kebu does not sell domains yet — buy at{" "}
                    <a
                      href={
                        namecheapUrl ??
                        `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(customDomainInput || "mybrand.com")}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-semibold"
                      style={{ color: "#FF5500" }}
                    >
                      Namecheap
                    </a>{" "}
                    (or any registrar), then connect it here.
                  </p>
                  <label className="block text-[10px] uppercase tracking-wider">
                    Domain you own
                    <input
                      className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
                      style={{ border: "1px solid #DDE0F0" }}
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value.toLowerCase())}
                      placeholder="mybrand.com"
                      aria-label="Custom domain"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void addCustomDomain()}
                    disabled={domainBusy}
                    className="w-full rounded-full py-2 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                    style={{ background: "#FF5500", color: "#fff" }}
                  >
                    {domainBusy ? "Saving…" : "Connect domain"}
                  </button>
                  {customDomains.length === 0 ? (
                    <p className="text-[10px] leading-relaxed" style={{ color: "#8A8578" }}>
                      No custom domain yet. Set your Kebu subdomain above, then connect a domain you already own.
                    </p>
                  ) : null}
                  {customDomains.map((d) => (
                    <div key={d.id} className="rounded-lg p-2 text-[10px]" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
                      <p className="font-semibold">
                        www.{d.hostname}{" "}
                        <span
                          style={{
                            color: d.status === "verified" ? "#009E40" : d.status === "failed" ? "#8B1E1E" : "#8A8578",
                          }}
                        >
                          · {d.status}
                        </span>
                      </p>
                      {d.dns_target ? (
                        <p className="mt-1" style={{ color: "#6B5B45" }}>
                          CNAME <strong>www</strong> → <strong>{d.dns_target}</strong>
                        </p>
                      ) : null}
                      {d.last_error ? (
                        <p className="mt-1" style={{ color: "#8B1E1E" }}>
                          {d.last_error}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void verifyCustomDomain(d.id)}
                          disabled={domainBusy}
                          className="rounded-full px-3 py-1 text-[10px] font-bold uppercase disabled:opacity-50"
                          style={{ background: "#00C851", color: "#0F0D33" }}
                        >
                          Verify DNS
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeCustomDomain(d.id)}
                          disabled={domainBusy}
                          className="rounded-full px-3 py-1 text-[10px] font-bold uppercase disabled:opacity-50"
                          style={{ background: "#F4F2EC", color: "#8B1E1E" }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {domainSteps.length > 0 ? (
                    <ol className="list-decimal pl-4 text-[10px] space-y-1" style={{ color: "#6B5B45" }}>
                      {domainSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  ) : null}
                  {domainDnsTarget ? (
                    <p className="text-[10px]" style={{ color: "#8A8578" }}>
                      Quick copy: CNAME www → {domainDnsTarget}
                    </p>
                  ) : null}
                  {domainNote ? (
                    <p className="text-[10px]" style={{ color: domainNote.includes("verified") ? "#009E40" : "#6B5B45" }}>
                      {domainNote}
                    </p>
                  ) : null}
                </div>

                <label className="block text-[10px] uppercase tracking-wider">
                  SEO title
                  <input
                    className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
                    style={{ border: "1px solid #DDE0F0" }}
                    value={seoSettings.metaTitle}
                    onChange={(e) => queueSiteSettingsSave({ seo: { metaTitle: e.target.value } })}
                  />
                </label>
                <label className="block text-[10px] uppercase tracking-wider">
                  SEO description
                  <textarea
                    className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
                    style={{ border: "1px solid #DDE0F0" }}
                    rows={3}
                    maxLength={320}
                    value={seoSettings.metaDescription}
                    onChange={(e) => queueSiteSettingsSave({ seo: { metaDescription: e.target.value } })}
                  />
                </label>
                <label className="block text-[10px] uppercase tracking-wider">
                  Favicon URL
                  <input
                    className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
                    style={{ border: "1px solid #DDE0F0" }}
                    value={seoSettings.faviconUrl}
                    onChange={(e) => queueSiteSettingsSave({ seo: { faviconUrl: e.target.value } })}
                    placeholder="https://…/favicon.ico"
                  />
                </label>
                <label className="block text-[10px] uppercase tracking-wider">
                  Social share image (Open Graph)
                  <input
                    className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
                    style={{ border: "1px solid #DDE0F0" }}
                    value={seoSettings.ogImageUrl}
                    onChange={(e) => queueSiteSettingsSave({ seo: { ogImageUrl: e.target.value } })}
                    placeholder="https://…/cover.jpg"
                  />
                </label>
                <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={Boolean(seoSettings.noIndex)}
                    onChange={(e) => queueSiteSettingsSave({ seo: { noIndex: e.target.checked } })}
                  />
                  Hide from Google (noindex)
                </label>
                <p className="text-[10px]" style={{ color: "#8A8578" }}>
                  {settingsState === "saving"
                    ? "Saving settings…"
                    : settingsState === "saved"
                      ? "Settings saved"
                      : settingsState === "error"
                        ? "Settings save failed"
                        : "Autosaves to Supabase"}
                </p>
                {settingsNote ? (
                  <p className="text-[10px]" style={{ color: "#009E40" }}>
                    {settingsNote}
                  </p>
                ) : null}
                <p className="text-[10px] leading-relaxed" style={{ color: "#6B5B45" }}>
                  Security: Kebu blocks script injection in site content, rate-limits saves, and serves live sites over HTTPS.
                  Publish again after changing SEO so your live site updates.
                </p>
              </div>
              )}

              {sidebarTab === "content" && (
              <>
              <div className="rounded-2xl p-4 flex flex-wrap gap-2" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
                <button type="button" onClick={undo} className="text-xs px-2 py-1 rounded-lg" style={{ background: "#F4F2EC" }} disabled={history.length === 0}>
                  Undo
                </button>
                <button type="button" onClick={redo} className="text-xs px-2 py-1 rounded-lg" style={{ background: "#F4F2EC" }} disabled={future.length === 0}>
                  Redo
                </button>
                <button
                  type="button"
                  onClick={() => setImproveOpen((v) => !v)}
                  disabled={improving || !project}
                  className="text-xs px-3 py-1 rounded-full font-semibold disabled:opacity-50"
                  style={{ background: "#0F0D33", color: "#fff" }}
                >
                  {improving ? "Yande…" : "Improve with Yande"}
                </button>
              </div>

              {improveOpen && (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: "#0F0D33", color: "#FAFAF8" }}>
                  <p className="text-sm font-bold">Yande — your site assistant</p>
                  <p className="text-xs text-white/70">
                    Tell Yande what to change in plain words. Your draft updates on the server — your live site stays the same until you publish again.
                  </p>
                  <textarea
                    className="w-full text-sm rounded-lg px-3 py-2 min-h-[88px] text-[#0F0D33]"
                    placeholder="Example: Make the hero clearer for university students in Dakar. Add a WhatsApp call to action."
                    value={improveInstruction}
                    onChange={(e) => setImproveInstruction(e.target.value)}
                    maxLength={800}
                    disabled={improving}
                    aria-label="What should AI improve"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void improveWithAi()}
                      disabled={improving}
                      className="rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50"
                      style={{ background: "#00C851", color: "#0F0D33" }}
                    >
                      {improving ? "Working…" : "Apply with Yande"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setImproveOpen(false)}
                      disabled={improving}
                      className="rounded-full px-4 py-2 text-sm text-white/80"
                      style={{ background: "#1C1A45" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2">Add section</p>
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
                <div className="flex flex-wrap gap-1">
                  {SECTION_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => void addSection(t)}
                      className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full"
                      style={{ background: "#F4F2EC" }}
                    >
                      {t}
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
                {editPageSections.map((section) => (
                    <div key={section.id} className="rounded-2xl p-3" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
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
                            <label key={key} className="block text-[10px] uppercase tracking-wider">
                              {label} URL
                              <input
                                className="mt-1 w-full text-xs rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={String(section.props[key] ?? "")}
                                onChange={(e) => updateProps(section.id, { [key]: e.target.value })}
                              />
                            </label>
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
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.title ?? "")}
                            onChange={(e) => updateProps(section.id, { title: e.target.value })}
                            aria-label="Title"
                          />
                          <textarea
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            rows={3}
                            value={String(section.props.subtitle ?? "")}
                            onChange={(e) => updateProps(section.id, { subtitle: e.target.value })}
                            aria-label="Subtitle"
                          />
                          {(
                            [
                              ["backgroundLayer", "Background layer"],
                              ["titleLogo", "Title logo"],
                              ["cutoutLeft", "Cutout left"],
                              ["cutoutRight", "Cutout right"],
                              ["cutoutAccent", "Cutout accent (center wobble)"],
                              ["cutoutSparkle", "Sparkle portrait"],
                              ["macbook", "MacBook mockup"],
                              ["sparkleGif", "Sparkle GIF"],
                              ["heroPhoto", "Story photo"],
                            ] as const
                          ).map(([key, label]) => (
                            <label key={key} className="block text-[10px] uppercase tracking-wider">
                              {label} URL
                              <input
                                className="mt-1 w-full text-xs rounded-lg px-2 py-1.5"
                                style={{ border: "1px solid #DDE0F0" }}
                                value={String(section.props[key] ?? "")}
                                onChange={(e) => updateProps(section.id, { [key]: e.target.value })}
                              />
                            </label>
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
                            Scroll layers + floating cutouts
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
                          <label className="block text-[10px] uppercase tracking-wider">
                            Album art URL
                            <input
                              className="mt-1 w-full text-xs rounded-lg px-2 py-1.5"
                              style={{ border: "1px solid #DDE0F0" }}
                              value={String(section.props.albumArt ?? "")}
                              onChange={(e) => updateProps(section.id, { albumArt: e.target.value })}
                            />
                          </label>
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
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            placeholder="YouTube URL or video ID"
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
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            placeholder="Spotify / SoundCloud / MP3 URL"
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
                      {!["hero", "text", "navigation", "footer", "whatsapp", "contact", "features", "faq", "testimonials", "video", "audio", "map", "events", "image", "gallery"].includes(
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

            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                {pages.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {pages
                      .slice()
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPreviewPageSlug(p.slug)}
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
                className="mx-auto overflow-hidden rounded-2xl shadow-sm"
                style={{
                  maxWidth: device === "mobile" ? 390 : "100%",
                  border: "1px solid #DDE0F0",
                  background: "#000",
                }}
              >
                {previewDefinition && (
                  <SiteRenderer
                    definition={previewDefinition}
                    mode="preview"
                    pageSlug={previewPageSlug}
                    siteBase={previewSiteBase || undefined}
                  />
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

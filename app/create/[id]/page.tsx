"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlkebulanLion } from "@/app/components/panther-motif";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { SECTION_TYPES } from "@/lib/create/website-schema";

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
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<Section[][]>([]);
  const [future, setFuture] = useState<Section[][]>([]);
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
      setSections(Array.isArray(data.sections) ? data.sections : []);
      setPublishUrl(data.project?.subdomain ? `/sites/${data.project.subdomain}` : null);
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
    const res = await fetch(`/api/projects/${projectId}/sections`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
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

  async function publish() {
    if (publishing) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Publish failed.");
        return;
      }
      setPublishUrl(data.deployment?.public_path ?? data.liveUrl);
      await load();
    } catch {
      setError("Network error while publishing.");
    } finally {
      setPublishing(false);
    }
  }

  const previewDefinition: WebsiteDefinition | null = project
    ? {
        schemaVersion: "website-v1",
        title: project.title,
        theme: project.theme ?? {
          primary: "#0F0D33",
          accent: "#00C851",
          background: "#FAFAF8",
          text: "#0F0D33",
          fontDisplay: "Fraunces",
          fontBody: "system-ui",
          spacing: "comfortable",
        },
        pages: [
          {
            slug: "home",
            title: "Home",
            sections: [...sections]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((s) => ({
                id: s.id,
                type: s.section_type as WebsiteDefinition["pages"][0]["sections"][0]["type"],
                props: s.props,
              })),
          },
        ],
      }
    : null;

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", color: "#0F0D33" }}>
      <header className="sticky top-0 z-40" style={{ background: "#0F0D33" }}>
        <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #009E40, #00C851)" }} />
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/create" className="flex items-center gap-2 text-white text-sm">
            <AlkebulanLion size={24} />
            <span className="font-bold tracking-[0.1em]">Editor</span>
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-white/50 hidden sm:inline">
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save error" : ""}
            </span>
            <button type="button" onClick={undo} className="text-white/70 px-2 py-1" disabled={history.length === 0}>
              Undo
            </button>
            <button type="button" onClick={redo} className="text-white/70 px-2 py-1" disabled={future.length === 0}>
              Redo
            </button>
            <button
              type="button"
              onClick={() => setDevice(device === "desktop" ? "mobile" : "desktop")}
              className="rounded-full px-3 py-1 text-white/80"
              style={{ background: "#1C1A45" }}
            >
              {device}
            </button>
            <Link
              href={`/create/${projectId}/preview`}
              className="rounded-full px-3 py-1 text-white"
              style={{ background: "#1C1A45" }}
            >
              Preview
            </Link>
            <button
              type="button"
              onClick={() => void publish()}
              disabled={publishing}
              className="rounded-full px-3 py-1 font-bold disabled:opacity-50"
              style={{ background: "#00C851", color: "#0F0D33" }}
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-[320px_1fr] gap-6">
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
              <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
                <h1 className="font-bold text-lg mb-1">{project?.title}</h1>
                <p className="text-xs uppercase tracking-wider" style={{ color: "#8A8578" }}>
                  {project?.status}
                  {project?.subdomain ? ` · ${project.subdomain}` : ""}
                </p>
                {publishUrl && (
                  <a href={publishUrl} target="_blank" rel="noreferrer" className="block text-xs mt-2 font-semibold underline" style={{ color: "#009E40" }}>
                    Live: {publishUrl}
                  </a>
                )}
                {error && (
                  <p role="alert" className="text-xs mt-2" style={{ color: "#8B1E1E" }}>
                    {error}
                  </p>
                )}
              </div>

              <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #DDE0F0" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2">Add section</p>
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

              <div className="space-y-3">
                {[...sections]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((section) => (
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
                          />
                          <input
                            className="w-full text-sm rounded-lg px-2 py-1.5"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={String(section.props.label ?? "")}
                            onChange={(e) => updateProps(section.id, { label: e.target.value })}
                          />
                        </div>
                      )}
                      {!["hero", "text", "navigation", "footer", "whatsapp"].includes(section.section_type) && (
                        <p className="text-[11px]" style={{ color: "#8A8578" }}>
                          Structured section — edit via props in later polish; reorder/delete supported.
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
            </aside>

            <section>
              <div
                className="mx-auto overflow-hidden rounded-2xl shadow-sm"
                style={{
                  maxWidth: device === "mobile" ? 390 : "100%",
                  border: "1px solid #DDE0F0",
                  background: "#fff",
                }}
              >
                {previewDefinition && <SiteRenderer definition={previewDefinition} mode="preview" />}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

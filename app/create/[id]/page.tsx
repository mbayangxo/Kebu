"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlkebulanLion } from "@/app/components/panther-motif";
import type { HeroProps } from "@/lib/create/schemas";

type Section = {
  id: string;
  page_id: string;
  section_type: string;
  sort_order: number;
  props: Partial<HeroProps>;
  updated_at?: string;
};

type Project = {
  id: string;
  title: string;
  project_type: string;
  status: string;
};

export default function ProjectEditorPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
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

  async function addHero() {
    if (adding) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/sections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace(`/login?next=/create/${projectId}`);
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not add hero.");
        return;
      }
      setSections((prev) => [...prev, data.section]);
    } catch {
      setError("Network error while adding hero.");
    } finally {
      setAdding(false);
    }
  }

  function updateLocalProps(sectionId: string, patch: Partial<HeroProps>) {
    setSections((prev) => {
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

  async function persistProps(sectionId: string, props: Partial<HeroProps>) {
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/sections`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          props,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveState("error");
        setSaveError(typeof data.error === "string" ? data.error : "Save failed.");
        return;
      }
      if (data.section) {
        setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...data.section } : s)));
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
      setSaveError("Network error while saving.");
    }
  }

  const heroes = sections.filter((s) => s.section_type === "hero");

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", color: "#0F0D33" }}>
      <header className="sticky top-0 z-40" style={{ background: "#0F0D33" }}>
        <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #009E40, #00C851)" }} />
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <Link href="/create" className="flex items-center gap-2 text-white text-sm">
            <AlkebulanLion size={28} />
            <span className="font-bold tracking-[0.12em]">← Projects</span>
          </Link>
          <p className="text-xs text-white/50" aria-live="polite">
            {saveState === "saving" && "Saving…"}
            {saveState === "saved" && "Saved"}
            {saveState === "error" && (saveError || "Save failed")}
            {saveState === "idle" && "Autosave on"}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 sm:py-12">
        {loading ? (
          <p className="text-sm" style={{ color: "#6B5B45" }}>
            Loading editor…
          </p>
        ) : error && !project ? (
          <div role="alert" className="rounded-xl p-4" style={{ background: "#FFF1F0", color: "#8B1E1E" }}>
            <p className="mb-3">{error}</p>
            <button type="button" className="underline font-semibold" onClick={() => void load()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: "#009E40" }}>
                  Website editor
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {project?.title}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => void addHero()}
                disabled={adding}
                className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                style={{ background: "#00C851", color: "#0F0D33" }}
              >
                {adding ? "Adding…" : "Add hero section"}
              </button>
            </div>

            {error && (
              <div role="alert" className="mb-4 text-sm" style={{ color: "#8B1E1E" }}>
                {error}
              </div>
            )}

            {heroes.length === 0 ? (
              <div
                className="rounded-2xl px-6 py-14 text-center"
                style={{ border: "1px dashed #DDE0F0", background: "#fff" }}
              >
                <p className="font-semibold mb-2">No sections yet</p>
                <p className="text-sm mb-6" style={{ color: "#6B5B45" }}>
                  Add a hero block. Edits autosave to your database.
                </p>
                <button
                  type="button"
                  onClick={() => void addHero()}
                  disabled={adding}
                  className="rounded-full px-6 py-3 text-sm font-bold"
                  style={{ background: "#0F0D33", color: "#FAFAF8" }}
                >
                  {adding ? "Adding…" : "Add hero"}
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {heroes.map((section) => {
                  const props = section.props ?? {};
                  return (
                    <article
                      key={section.id}
                      className="rounded-2xl overflow-hidden"
                      style={{ border: "1px solid #DDE0F0", background: "#fff" }}
                    >
                      <div
                        className="px-6 sm:px-10 py-14 text-white"
                        style={{
                          background: props.background || "#0F0D33",
                          textAlign: props.align === "left" ? "left" : "center",
                        }}
                      >
                        <h2
                          className="text-3xl sm:text-5xl font-bold mb-4"
                          style={{ fontFamily: "var(--font-fraunces)" }}
                        >
                          {props.heading || "Your business name"}
                        </h2>
                        <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-6">
                          {props.subheading || "Tell customers what you offer."}
                        </p>
                        <span
                          className="inline-block rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider"
                          style={{ background: "#00C851", color: "#0F0D33" }}
                        >
                          {props.buttonLabel || "Get started"}
                        </span>
                      </div>

                      <div className="p-5 sm:p-6 grid sm:grid-cols-2 gap-4">
                        <label className="block text-xs font-semibold uppercase tracking-wider">
                          Heading
                          <input
                            className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={props.heading ?? ""}
                            onChange={(e) => updateLocalProps(section.id, { heading: e.target.value })}
                            maxLength={160}
                          />
                        </label>
                        <label className="block text-xs font-semibold uppercase tracking-wider">
                          Button label
                          <input
                            className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={props.buttonLabel ?? ""}
                            onChange={(e) => updateLocalProps(section.id, { buttonLabel: e.target.value })}
                            maxLength={60}
                          />
                        </label>
                        <label className="block text-xs font-semibold uppercase tracking-wider sm:col-span-2">
                          Subheading
                          <textarea
                            className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm min-h-[80px]"
                            style={{ border: "1px solid #DDE0F0" }}
                            value={props.subheading ?? ""}
                            onChange={(e) => updateLocalProps(section.id, { subheading: e.target.value })}
                            maxLength={400}
                          />
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlkebulanLion } from "@/app/components/panther-motif";

type ProjectRow = {
  id: string;
  title: string;
  project_type: string;
  status: string;
  updated_at: string;
};

export default function CreateHubPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("My website");
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/create");
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load projects.");
        setProjects([]);
        return;
      }
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch {
      setError("Network error. Check your connection and retry.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load, retryToken]);

  async function createProject() {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || "My website", projectType: "website" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login?next=/create");
        return;
      }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create project.");
        return;
      }
      router.push(`/create/${data.project.id}`);
    } catch {
      setError("Network error while creating. Retry.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", color: "#0F0D33" }}>
      <header className="sticky top-0 z-40" style={{ background: "#0F0D33" }}>
        <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #009E40, #00C851)" }} />
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white">
            <AlkebulanLion size={28} />
            <span className="font-bold tracking-[0.12em] text-sm">KEBU CREATE</span>
          </Link>
          <Link href="/ka-score" className="text-white/50 text-xs uppercase tracking-wider hover:text-[#00C851]">
            Ka Score
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "#009E40" }}>
          African Cloud · Create Mode
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>
          Your projects
        </h1>
        <p className="text-sm mb-8 max-w-xl" style={{ color: "#6B5B45", lineHeight: 1.7 }}>
          Build from a template, AI, or blank — edit visually, save, preview, and publish to a Kebu site URL.
          Linked to your Kebu business.
        </p>

        <div className="mb-10 flex flex-wrap gap-3">
          <Link
            href="/create/new"
            className="inline-block rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider"
            style={{ background: "#00C851", color: "#0F0D33" }}
          >
            Build Website
          </Link>
        </div>

        <section
          className="rounded-2xl p-5 sm:p-6 mb-10"
          style={{ background: "#0F0D33", color: "#FAFAF8" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: "#00C851" }}>
            Site #1 on Kebu
          </p>
          <h2 className="text-lg font-bold mb-2">K-Direction</h2>
          <p className="text-sm mb-4 text-white/75 leading-relaxed">
            The first full brand site built with Kebu — label website, portal CMS, careers, and Joko tickets.
            Lives in this repo at <code className="text-white/90">kebu-sites/k-direction</code> (separate deploy from this builder).
          </p>
          <p className="text-xs text-white/50 mb-3">
            Local: run <code className="text-white/70">npm run dev</code> in that folder → port 3100
          </p>
        </section>

        <section
          className="rounded-2xl p-5 sm:p-6 mb-10"
          style={{ background: "#fff", border: "1px solid #DDE0F0" }}
        >
          <label htmlFor="project-title" className="block text-xs font-semibold uppercase tracking-wider mb-2">
            Quick blank (legacy)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
              style={{ border: "1px solid #DDE0F0", background: "#FAFAF8" }}
              disabled={creating}
            />
            <button
              type="button"
              onClick={() => void createProject()}
              disabled={creating || !title.trim()}
              className="rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
              style={{ background: "#0F0D33", color: "#fff" }}
            >
              {creating ? "Creating…" : "Blank project"}
            </button>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center gap-3"
            style={{ background: "#FFF1F0", border: "1px solid #F5C2C0", color: "#8B1E1E" }}
          >
            <span className="flex-1">{error}</span>
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => setRetryToken((n) => n + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: "#6B5B45" }} aria-live="polite">
            Loading your projects…
          </p>
        ) : projects.length === 0 && !error ? (
          <div
            className="rounded-2xl px-6 py-12 text-center"
            style={{ border: "1px dashed #DDE0F0", background: "#fff" }}
          >
            <p className="font-semibold mb-2">No projects yet</p>
            <p className="text-sm" style={{ color: "#6B5B45" }}>
              Create your first blank website above. You&apos;ll add a hero next.
            </p>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Your projects">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/create/${p.id}`}
                  className="block rounded-2xl px-5 py-4 transition-colors hover:border-[#00C851]"
                  style={{ background: "#fff", border: "1px solid #DDE0F0" }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{p.title}</p>
                      <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: "#8A8578" }}>
                        {p.project_type} · {p.status}
                      </p>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: "#00C851" }}>
                      Edit →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

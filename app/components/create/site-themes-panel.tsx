"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KEBU } from "@/lib/kebu-brand";

type ThemeRow = {
  id: string;
  name: string;
  status: "live" | "draft";
  source: "current" | "catalog" | "upload" | "marketplace" | "library";
  catalogSlug: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CatalogRow = { slug: string; name: string; category: string };

/** Shopify-style Current theme + library for one Online Store. */
export function SiteThemesPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [catalogSlug, setCatalogSlug] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/themes`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load themes.");
        return;
      }
      setThemes(Array.isArray(data.themes) ? data.themes : []);
    } catch {
      setError("Network error while loading themes.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch("/api/templates", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.templates)) {
          setCatalog(data.templates.map((t: CatalogRow) => ({ slug: t.slug, name: t.name, category: t.category })));
        }
      })
      .catch(() => {});
  }, []);

  async function add(source: "current" | "catalog" | "upload", extra?: { catalogSlug?: string; fileJson?: unknown }) {
    const name = newName.trim();
    if (!name) {
      setError("Give this theme a name first.");
      return;
    }
    setBusyId("add");
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/themes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          source,
          catalogSlug: extra?.catalogSlug,
          fileJson: extra?.fileJson,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not add theme.");
        return;
      }
      setNewName("");
      setNote("Added to draft themes.");
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  async function patch(themeId: string, body: Record<string, unknown>) {
    setBusyId(themeId);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/themes/${themeId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Action failed.");
        return;
      }
      if (body.action === "edit") {
        router.push(`/create/${projectId}`);
        return;
      }
      if (typeof data.message === "string") setNote(data.message);
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(themeId: string) {
    if (!confirm("Delete this draft theme? This cannot be undone.")) return;
    setBusyId(themeId);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/themes/${themeId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not delete.");
        return;
      }
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  function onPickFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Upload a Kebu .json theme — not a zip or HTML file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? ""));
        void add("upload", { fileJson: parsed });
      } catch {
        setError("That file is not valid JSON.");
      }
    };
    reader.readAsText(file);
  }

  const live = themes.find((t) => t.status === "live");
  const drafts = themes.filter((t) => t.status === "draft");
  const current = live ?? drafts[0] ?? null;

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }}>
          {error}
        </p>
      ) : null}
      {note ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "#E8F8EE", color: "#1B6B3A" }}>
          {note}
        </p>
      ) : null}

      {loading ? <p className="text-sm" style={{ color: KEBU.muted }}>Loading themes…</p> : null}

      {current ? (
        <section className="overflow-hidden rounded-xl border border-[#E3E3E3] bg-[#F6F6F7]">
          <div className="flex min-h-[160px] items-end bg-gradient-to-br from-[#1a1a1a] via-[#333] to-[#FF5500]/80 p-5 sm:min-h-[200px]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Current theme</p>
              <p className="mt-1 text-lg font-semibold text-white">{current.name}</p>
              <p className="mt-0.5 text-[11px] text-white/65">
                {current.status === "live" ? "Live on your site" : "Draft — publish when ready"}
                {current.catalogSlug ? ` · ${current.catalogSlug}` : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3">
            <p className="text-[11px]" style={{ color: KEBU.muted }}>
              {current.status === "live" ? "Published theme" : "Open Customize to edit this draft"}
            </p>
            <div className="flex flex-wrap gap-2">
              {current.status === "draft" ? (
                <button
                  type="button"
                  disabled={busyId === current.id}
                  onClick={() => void patch(current.id, { action: "publish" })}
                  className="rounded-lg px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"
                  style={{ background: KEBU.black }}
                >
                  Publish
                </button>
              ) : null}
              <button
                type="button"
                disabled={busyId === current.id}
                onClick={() => void patch(current.id, { action: "edit" })}
                className="rounded-lg px-3 py-2 text-[11px] font-bold disabled:opacity-50"
                style={{ border: `1px solid ${KEBU.border}`, background: "#fff" }}
              >
                Edit theme
              </button>
              <Link
                href={`/create/${projectId}`}
                className="rounded-lg px-3 py-2 text-[11px] font-bold text-white"
                style={{ background: KEBU.orange }}
              >
                Customize
              </Link>
            </div>
          </div>
        </section>
      ) : !loading ? (
        <section className="rounded-xl border border-dashed border-[#D4D4D8] bg-[#FAFAFA] px-5 py-10 text-center">
          <p className="text-sm font-semibold" style={{ color: KEBU.black }}>
            No themes on this site yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed" style={{ color: KEBU.muted }}>
            Save your current look, add from the gallery ($5), or upload Kebu JSON.
          </p>
        </section>
      ) : null}

      {drafts.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold" style={{ color: KEBU.black }}>
              Theme library
            </p>
            <Link href="/create/aesthetics" className="text-[11px] font-bold" style={{ color: KEBU.orange }}>
              Discover →
            </Link>
          </div>
          <ul className="divide-y divide-[#EBEBEB] rounded-xl border border-[#E3E3E3] bg-white">
            {drafts.map((theme) => (
              <li key={theme.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{theme.name}</p>
                  <p className="text-[10px]" style={{ color: KEBU.faint }}>
                    Draft · Added {new Date(theme.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    disabled={busyId === theme.id}
                    onClick={() => void patch(theme.id, { action: "publish" })}
                    className="rounded-md px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
                    style={{ background: KEBU.black }}
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    disabled={busyId === theme.id}
                    onClick={() => void patch(theme.id, { action: "edit" })}
                    className="rounded-md px-2.5 py-1.5 text-[10px] font-bold disabled:opacity-50"
                    style={{ border: `1px solid ${KEBU.border}` }}
                  >
                    Edit theme
                  </button>
                  <button
                    type="button"
                    disabled={busyId === theme.id}
                    onClick={() => void remove(theme.id)}
                    className="rounded-md px-2 py-1.5 text-[10px] font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-[#E3E3E3] bg-white p-4">
        <h3 className="text-[12px] font-semibold">Add a theme</h3>
        <label className="mt-2 block text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
          Name
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={80}
            placeholder="e.g. Summer look"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal normal-case tracking-normal"
            style={{ borderColor: KEBU.border }}
          />
        </label>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={busyId === "add"}
            onClick={() => void add("current")}
            className="rounded-lg px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"
            style={{ background: KEBU.black }}
          >
            Save current as draft
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={catalogSlug}
              onChange={(e) => setCatalogSlug(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border px-2 py-2 text-xs"
              style={{ borderColor: KEBU.border }}
            >
              <option value="">From gallery…</option>
              {catalog.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busyId === "add" || !catalogSlug}
              onClick={() => void add("catalog", { catalogSlug })}
              className="rounded-lg px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"
              style={{ background: KEBU.orange }}
            >
              Add from gallery
            </button>
          </div>
          <button
            type="button"
            disabled={busyId === "add"}
            onClick={() => fileRef.current?.click()}
            className="rounded-lg px-3 py-2 text-[11px] font-bold disabled:opacity-50"
            style={{ border: `1px solid ${KEBU.border}` }}
          >
            Upload JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              onPickFile(e.target.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </section>
    </div>
  );
}

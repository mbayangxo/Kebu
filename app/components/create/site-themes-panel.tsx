"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KEBU } from "@/lib/kebu-brand";

type ThemeRow = {
  id: string;
  name: string;
  status: "live" | "draft";
  source: "current" | "catalog" | "upload";
  catalogSlug: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CatalogRow = { slug: string; name: string; category: string };

export function SiteThemesPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [liveThemeId, setLiveThemeId] = useState<string | null>(null);
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
        setError(typeof data.error === "string" ? data.error : "Could not load templates.");
        return;
      }
      setThemes(Array.isArray(data.themes) ? data.themes : []);
      setActiveThemeId(data.activeThemeId ?? null);
      setLiveThemeId(data.liveThemeId ?? null);
    } catch {
      setError("Network error while loading templates.");
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
      setError("Give this template a name first.");
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
        setError(typeof data.error === "string" ? data.error : "Could not add template.");
        return;
      }
      setNewName("");
      setNote("Draft saved. Edit it, then publish when you want it live.");
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
    if (!confirm("Delete this draft template? This cannot be undone.")) return;
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

  async function download(theme: ThemeRow) {
    const res = await fetch(`/api/projects/${projectId}/themes/${theme.id}`, { credentials: "include" });
    if (!res.ok) {
      setError("Could not export this template.");
      return;
    }
    const json = await res.json();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${theme.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "kebu-template"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onPickFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Upload a Kebu .json template — not a zip, HTML, or WordPress/ThemeForest file.");
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

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
          Templates for this site
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>
          Like Shopify themes: each template has a name. One is <strong>live</strong> (public if you published the site).
          The rest are <strong>drafts</strong>. Edit a draft, then publish it — the old live template becomes a draft.
          You can copy this site, pick a Kebu gallery template, or upload a Kebu JSON file. HTML / ThemeForest zips
          cannot run here.
        </p>
      </header>

      {error ? (
        <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }}>
          {error}
        </p>
      ) : null}
      {note ? (
        <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "#E8F8EE", color: "#1B6B3A" }}>
          {note}
        </p>
      ) : null}

      {loading ? <p className="text-sm" style={{ color: KEBU.muted }}>Loading templates…</p> : null}

      {live ? (
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
            Live
          </p>
          <ThemeCard
            theme={live}
            isActive={activeThemeId === live.id}
            busy={busyId === live.id}
            onEdit={() => void patch(live.id, { action: "edit" })}
            onPublish={() => void patch(live.id, { action: "publish" })}
            onRename={(name) => void patch(live.id, { action: "rename", name })}
            onDownload={() => void download(live)}
          />
        </section>
      ) : null}

      {drafts.length ? (
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
            Drafts
          </p>
          <div className="space-y-3">
            {drafts.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isActive={activeThemeId === theme.id}
                busy={busyId === theme.id}
                onEdit={() => void patch(theme.id, { action: "edit" })}
                onPublish={() => void patch(theme.id, { action: "publish" })}
                onRename={(name) => void patch(theme.id, { action: "rename", name })}
                onDownload={() => void download(theme)}
                onDelete={() => void remove(theme.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl bg-white p-4 sm:p-6" style={{ border: `1px solid ${KEBU.border}` }}>
        <h3 className="text-sm font-bold" style={{ color: KEBU.black }}>
          Add a named template
        </h3>
        <label className="mt-3 block text-[11px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
          Template name
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={80}
            placeholder="e.g. Summer 2026, Dark look, Gallery import"
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal normal-case tracking-normal"
            style={{ borderColor: KEBU.border, color: KEBU.black }}
          />
        </label>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={busyId === "add"}
            onClick={() => void add("current")}
            className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
            style={{ background: KEBU.black }}
          >
            Save current site as draft
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={catalogSlug}
              onChange={(e) => setCatalogSlug(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: KEBU.border }}
            >
              <option value="">Kebu gallery template…</option>
              {catalog.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busyId === "add" || !catalogSlug}
              onClick={() => void add("catalog", { catalogSlug })}
              className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              Add from gallery
            </button>
          </div>
          <button
            type="button"
            disabled={busyId === "add"}
            onClick={() => fileRef.current?.click()}
            className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
            style={{ border: `2px solid ${KEBU.black}`, color: KEBU.black }}
          >
            Upload Kebu JSON
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

      <p className="text-xs" style={{ color: KEBU.muted }}>
        Live template id: {liveThemeId ?? "—"}.{" "}
        <Link href={`/create/${projectId}`} className="font-semibold underline" style={{ color: KEBU.orange }}>
          Open editor
        </Link>
      </p>
    </div>
  );
}

function ThemeCard({
  theme,
  isActive,
  busy,
  onEdit,
  onPublish,
  onRename,
  onDownload,
  onDelete,
}: {
  theme: ThemeRow;
  isActive: boolean;
  busy: boolean;
  onEdit: () => void;
  onPublish: () => void;
  onRename: (name: string) => void;
  onDownload: () => void;
  onDelete?: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(theme.name);

  useEffect(() => {
    setName(theme.name);
  }, [theme.name]);

  return (
    <article
      className="rounded-2xl bg-white p-4"
      style={{ border: `1px solid ${KEBU.border}` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {editingName ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                onRename(name);
                setEditingName(false);
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="rounded-lg border px-2 py-1 text-sm"
                style={{ borderColor: KEBU.border }}
              />
              <button type="submit" className="text-xs font-bold uppercase" style={{ color: KEBU.orange }}>
                Save name
              </button>
            </form>
          ) : (
            <h3 className="text-base font-bold" style={{ color: KEBU.black }}>
              {theme.name}
            </h3>
          )}
          <p className="mt-1 text-[11px]" style={{ color: KEBU.muted }}>
            {theme.status === "live" ? "Live" : "Draft"}
            {isActive ? " · editing now" : ""}
            {theme.source === "catalog" ? " · from gallery" : theme.source === "upload" ? " · uploaded" : " · from this site"}
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider"
          style={{
            background: theme.status === "live" ? "#E8F8EE" : "#F4F1EA",
            color: theme.status === "live" ? "#1B6B3A" : "#5C5348",
          }}
        >
          {theme.status}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onEdit}
          className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
          style={{ background: KEBU.black, color: KEBU.white }}
        >
          {theme.status === "live" ? "Edit live" : "Edit draft"}
        </button>
        {theme.status === "draft" ? (
          <button
            type="button"
            disabled={busy}
            onClick={onPublish}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
            style={{ background: KEBU.orange, color: KEBU.white }}
          >
            Publish (old live → draft)
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditingName((v) => !v)}
          className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ border: `1px solid ${KEBU.border}` }}
        >
          Rename
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDownload}
          className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ border: `1px solid ${KEBU.border}` }}
        >
          Download JSON
        </button>
        {onDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-700"
            style={{ border: "1px solid #FECACA" }}
          >
            Delete draft
          </button>
        ) : null}
      </div>
    </article>
  );
}

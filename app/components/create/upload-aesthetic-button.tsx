"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KEBU } from "@/lib/kebu-brand";

type SiteOption = { id: string; title: string };

/** Upload aesthetic on My sites → library + draft on chosen site → editor. */
export function UploadAestheticButton({ sites }: { sites: SiteOption[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(sites[0]?.id ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!projectId) {
      setError("Create a site first.");
      return;
    }
    if (!name.trim()) {
      setError("Give this aesthetic a name.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Upload Kebu .json only — not HTML or ThemeForest zips.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fileJson = JSON.parse(await file.text()) as unknown;
      const libRes = await fetch("/api/aesthetics/library", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), fileJson }),
      });
      const libData = await libRes.json().catch(() => ({}));
      if (!libRes.ok) {
        setError(typeof libData.error === "string" ? libData.error : "Upload failed.");
        return;
      }
      const applyRes = await fetch("/api/aesthetics/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryId: libData.item.id,
          projectId,
          openInEditor: true,
        }),
      });
      const applyData = await applyRes.json().catch(() => ({}));
      if (!applyRes.ok) {
        setError(typeof applyData.error === "string" ? applyData.error : "Saved to library but could not add to site.");
        return;
      }
      setOpen(false);
      setName("");
      router.push(typeof applyData.editorPath === "string" ? applyData.editorPath : `/create/${projectId}`);
    } catch {
      setError("Invalid JSON or network error.");
    } finally {
      setBusy(false);
    }
  }

  if (sites.length === 0) {
    return (
      <a
        href="/create/new"
        className="inline-flex rounded-full px-5 py-2.5 text-sm font-bold border"
        style={{ borderColor: KEBU.border }}
      >
        Create a site to upload aesthetics
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex rounded-full px-5 py-2.5 text-sm font-bold text-white"
        style={{ background: KEBU.black }}
      >
        Upload new aesthetic
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Upload new aesthetic"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            style={{ border: `2px solid ${KEBU.black}` }}
          >
            <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
              Upload new aesthetic
            </h2>
            <p className="text-xs mt-2" style={{ color: KEBU.muted }}>
              Kebu JSON only. Saves to Owned, adds a draft on your site, opens the editor — publish when ready.
            </p>
            {error ? (
              <p className="mt-3 text-sm rounded-lg px-3 py-2" style={{ background: "#FEE2E2", color: "#991B1B" }}>
                {error}
              </p>
            ) : null}
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal normal-case tracking-normal"
                style={{ borderColor: KEBU.border }}
              />
            </label>
            <label className="mt-3 block text-[11px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
              Site
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-normal normal-case tracking-normal"
                style={{ borderColor: KEBU.border }}
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                style={{ background: KEBU.orange }}
              >
                {busy ? "Uploading…" : "Choose JSON file"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
                style={{ border: `1px solid ${KEBU.border}` }}
              >
                Cancel
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

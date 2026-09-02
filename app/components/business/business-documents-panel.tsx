"use client";

import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type DocRow = {
  id: string;
  document_type: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  downloadUrl: string | null;
};

type DocDef = { type: string; label: string; note?: string };

export function BusinessDocumentsPanel({
  businessId,
  publicKebuId,
  canEdit,
  onProgressChange,
}: {
  businessId: string;
  publicKebuId?: string;
  canEdit: boolean;
  onProgressChange?: () => void;
}) {
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [required, setRequired] = useState<DocDef[]>([]);
  const [government, setGovernment] = useState<DocDef[]>([]);
  const [westAfrica, setWestAfrica] = useState<DocDef[]>([]);
  const [uploadable, setUploadable] = useState<DocDef[]>([]);
  const [uploadedTypes, setUploadedTypes] = useState<string[]>([]);
  const [stepComplete, setStepComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [documentType, setDocumentType] = useState("founder_id");
  const [kebuRecordUrl, setKebuRecordUrl] = useState<string | null>(null);
  const [kebuRecordAt, setKebuRecordAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const loadKebuRecord = useCallback(async () => {
    try {
      const res = await fetch(`/api/businesses/${businessId}/kebu-record`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.record) {
        setKebuRecordUrl(data.record.downloadUrl ?? null);
        setKebuRecordAt(data.record.generated_at ?? null);
      }
    } catch {
      /* optional */
    }
  }, [businessId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/documents`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not load documents. Apply migration 017 + 021 in Supabase if this is a new project.",
        );
        return;
      }
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
      setRequired(Array.isArray(data.required) ? data.required : []);
      setGovernment(Array.isArray(data.government) ? data.government : []);
      setWestAfrica(Array.isArray(data.westAfrica) ? data.westAfrica : []);
      setUploadable(Array.isArray(data.uploadable) ? data.uploadable : []);
      setUploadedTypes(Array.isArray(data.uploadedTypes) ? data.uploadedTypes : []);
      setStepComplete(Boolean(data.documentsStepComplete));
      await loadKebuRecord();
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, [businessId, loadKebuRecord]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File) {
    if (!canEdit || uploading) return;
    setUploading(true);
    setError(null);
    setNote(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("documentType", documentType);
      const res = await fetch(`/api/businesses/${businessId}/documents`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Upload failed.");
        return;
      }
      setStepComplete(Boolean(data.documentsStepComplete));
      setUploadedTypes(Array.isArray(data.uploadedTypes) ? data.uploadedTypes : []);
      setNote(
        data.documentsStepComplete
          ? "Required gov-prep documents uploaded — readiness will refresh."
          : "File saved. Upload remaining required documents.",
      );
      await load();
      onProgressChange?.();
    } catch {
      setError("Network error during upload.");
    } finally {
      setUploading(false);
    }
  }

  async function generateKebuRecord() {
    if (!canEdit || generating) return;
    setGenerating(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/kebu-record`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not generate Kebu record.");
        return;
      }
      setKebuRecordUrl(data.downloadUrl ?? null);
      setKebuRecordAt(data.snapshot?.generatedAt ?? new Date().toISOString());
      setNote("Official Kebu Business Record generated — download and keep for your files.");
      await load();
      onProgressChange?.();
    } catch {
      setError("Network error while generating record.");
    } finally {
      setGenerating(false);
    }
  }

  async function remove(docId: string) {
    if (!canEdit || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/documents/${docId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not remove file.");
        return;
      }
      setStepComplete(Boolean(data.documentsStepComplete));
      await load();
      onProgressChange?.();
    } catch {
      setError("Network error.");
    } finally {
      setUploading(false);
    }
  }

  function renderChecklist(items: DocDef[], requiredOnly = false) {
    return (
      <ul className="space-y-2 text-xs">
        {items.map((req) => {
          const done = uploadedTypes.includes(req.type);
          const isRequired = required.some((r) => r.type === req.type);
          if (requiredOnly && !isRequired) return null;
          return (
            <li
              key={req.type}
              className="flex items-start gap-2"
              style={{ color: done ? KEBU.orange : KEBU.muted }}
            >
              <span aria-hidden className="mt-0.5">{done ? "✓" : "⬜"}</span>
              <span>
                {req.label}
                {isRequired ? <span className="text-[10px] ml-1">(required)</span> : null}
                {"note" in req && req.note ? (
                  <span className="block text-[10px] mt-0.5" style={{ color: "#8A8578" }}>
                    {req.note}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  if (loading) {
    return (
      <p className="text-sm" style={{ color: "#6B5B45" }}>
        Loading documents…
      </p>
    );
  }

  const userDocs = documents.filter((d) => d.document_type !== "kebu_official_record");
  const kebuDoc = documents.find((d) => d.document_type === "kebu_official_record");

  return (
    <div className="space-y-6">
      {/* Kebu ID lane */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "#FFF8F2", border: "1px solid rgba(255,85,0,0.25)" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
          1 · Kebu ID {publicKebuId ? `· ${publicKebuId}` : ""}
        </p>
        <p className="text-[11px] leading-relaxed" style={{ color: "#5C5348" }}>
          Your <strong>Kebu ID</strong> is your permanent business identifier inside Kebu — similar to an{" "}
          <strong>EIN</strong> in the United States. Generate the official Kebu record so we document your business
          in our registry and analytics.
        </p>
        {canEdit ? (
          <button
            type="button"
            onClick={() => void generateKebuRecord()}
            disabled={generating}
            className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
            style={{ background: KEBU.black, color: KEBU.white }}
          >
            {generating ? "Generating…" : kebuDoc || kebuRecordUrl ? "Refresh Kebu record" : "Generate Kebu record"}
          </button>
        ) : null}
        {(kebuRecordUrl || kebuDoc?.downloadUrl) && (
          <p className="text-xs">
            <a
              href={kebuRecordUrl ?? kebuDoc?.downloadUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
              style={{ color: KEBU.orange }}
            >
              Download official Kebu Business Record
            </a>
            {kebuRecordAt ? (
              <span className="block text-[10px] mt-1" style={{ color: "#8A8578" }}>
                Generated {new Date(kebuRecordAt).toLocaleString()}
              </span>
            ) : null}
          </p>
        )}
      </div>

      {/* Government lane */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider">2 · Government registration prep</p>
        <p className="text-[10px] leading-relaxed" style={{ color: "#8A8578" }}>
          Upload PDF or images (max 10 MB). These help you register with your national authorities — not with Kebu
          directly.
          {stepComplete ? " Required documents complete." : " Upload founder ID + business plan to advance."}
        </p>
        {renderChecklist(government, true)}
        <div className="mt-2">{renderChecklist(government.filter((g) => !required.some((r) => r.type === g.type)))}</div>
      </div>

      {/* West Africa lane */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider">3 · West Africa trade readiness</p>
        <p className="text-[10px] leading-relaxed" style={{ color: "#8A8578" }}>
          For selling across ECOWAS / the region — <strong>Requires validation</strong>. Kebu will help package this in
          a later slice; upload drafts now if you have them.
        </p>
        {renderChecklist(westAfrica)}
      </div>

      {canEdit ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className="rounded-lg px-2 py-2 text-xs flex-1"
            style={{ border: "1px solid #DDE0F0" }}
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            aria-label="Document type"
          >
            {uploadable.map((u) => (
              <option key={u.type} value={u.type}>
                {u.label}
              </option>
            ))}
          </select>
          <label
            className="inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider shrink-0"
            style={{ background: KEBU.black, color: KEBU.white, opacity: uploading ? 0.5 : 1 }}
          >
            {uploading ? "Uploading…" : "Choose file"}
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      ) : null}

      {userDocs.length === 0 ? (
        <p className="text-sm" style={{ color: "#6B5B45" }}>
          No uploaded documents yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {userDocs.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs"
              style={{ background: "#F8F7F4", border: "1px solid #E8E4DC" }}
            >
              <span>
                <strong>{doc.document_type.replace(/_/g, " ")}</strong> · {doc.file_name}
              </span>
              <span className="flex gap-2">
                {doc.downloadUrl ? (
                  <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                    Download
                  </a>
                ) : null}
                {canEdit ? (
                  <button type="button" className="underline" style={{ color: "#8B1E1E" }} onClick={() => void remove(doc.id)}>
                    Remove
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p role="alert" className="text-xs" style={{ color: "#8B1E1E" }}>
          {error}
        </p>
      ) : null}
      {note ? (
        <p className="text-xs" style={{ color: KEBU.orange }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

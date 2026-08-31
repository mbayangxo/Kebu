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

type RequiredDoc = { type: string; label: string };

export function BusinessDocumentsPanel({
  businessId,
  canEdit,
  onProgressChange,
}: {
  businessId: string;
  canEdit: boolean;
  onProgressChange?: () => void;
}) {
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [required, setRequired] = useState<RequiredDoc[]>([]);
  const [uploadedTypes, setUploadedTypes] = useState<string[]>([]);
  const [stepComplete, setStepComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState("founder_id");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/documents`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load documents.");
        return;
      }
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
      setRequired(Array.isArray(data.required) ? data.required : []);
      setUploadedTypes(Array.isArray(data.uploadedTypes) ? data.uploadedTypes : []);
      setStepComplete(Boolean(data.documentsStepComplete));
    } catch {
      setError("Network error. Retry.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

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
          ? "Required documents uploaded — registration step updated."
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

  if (loading) {
    return (
      <p className="text-sm" style={{ color: "#6B5B45" }}>
        Loading documents…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[10px] leading-relaxed" style={{ color: "#8A8578" }}>
        Upload PDF or images (max 10 MB). Files are stored in Supabase — private to your business team.
        {stepComplete ? " Required documents complete." : " Upload all required types to advance registration."}
      </p>

      <ul className="space-y-2 text-xs">
        {required.map((req) => {
          const done = uploadedTypes.includes(req.type);
          return (
            <li
              key={req.type}
              className="flex items-center gap-2"
              style={{ color: done ? KEBU.orange : KEBU.muted }}
            >
              <span aria-hidden>{done ? "✓" : "⬜"}</span>
              {req.label}
            </li>
          );
        })}
      </ul>

      {canEdit ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className="rounded-lg px-2 py-2 text-xs"
            style={{ border: "1px solid #DDE0F0" }}
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            aria-label="Document type"
          >
            <option value="founder_id">Founder ID</option>
            <option value="business_plan">Business plan</option>
            <option value="address_proof">Address proof</option>
            <option value="registration_form">Registration form</option>
            <option value="other">Other</option>
          </select>
          <label
            className="inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
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

      {documents.length === 0 ? (
        <p className="text-sm" style={{ color: "#6B5B45" }}>
          No documents uploaded yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
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

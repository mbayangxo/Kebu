"use client";

import { useState, useRef } from "react";

type Props = {
  projectId: string;
  productId: string;
  currentFileName?: string | null;
  currentIsDigital?: boolean;
  dlLimit?: number;
  expiresHours?: number;
  onSaved?: (opts: { filePath: string; fileName: string }) => void;
  onRemoved?: () => void;
};

const ACCEPT = [
  ".pdf", ".zip", ".epub",
  ".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac",
  ".mp4", ".webm",
  ".png", ".jpg", ".jpeg", ".webp", ".svg",
].join(",");

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProductDigitalFileUpload({
  projectId,
  productId,
  currentFileName,
  currentIsDigital,
  onSaved,
  onRemoved,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const hasFile = currentIsDigital && currentFileName;

  async function upload(file: File) {
    if (file.size > 200 * 1024 * 1024) {
      setError("Fichier trop volumineux — maximum 200 MB.");
      return;
    }
    setSelectedFile(file);
    setUploading(true);
    setError(null);
    setProgress(0);

    const form = new FormData();
    form.append("file", file);

    // Use XHR for upload progress
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener("load", () => {
        setUploading(false);
        if (xhr.status === 200) {
          let data: { ok?: boolean; path?: string; name?: string; error?: string } = {};
          try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
          if (data.ok && data.path && data.name) {
            onSaved?.({ filePath: data.path, fileName: data.name });
          } else {
            setError(data.error ?? "Erreur lors de l'envoi.");
          }
        } else {
          let data: { error?: string } = {};
          try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
          setError(data.error ?? `Erreur ${xhr.status}`);
        }
        resolve();
      });
      xhr.addEventListener("error", () => {
        setUploading(false);
        setError("Connexion interrompue.");
        resolve();
      });
      xhr.open("POST", `/api/projects/${projectId}/products/${productId}/digital-file`);
      xhr.send(form);
    });
  }

  async function remove() {
    if (!confirm("Supprimer le fichier numérique de ce produit ?")) return;
    setRemoving(true);
    const res = await fetch(`/api/projects/${projectId}/products/${productId}/digital-file`, {
      method: "DELETE",
    });
    setRemoving(false);
    if (res.ok) onRemoved?.();
    else {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setError(d.error ?? "Suppression échouée.");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void upload(file);
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
          Fichier numérique
        </span>
        {hasFile ? (
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              background: "#ECFDF5",
              color: "#10B981",
              borderRadius: 999,
              padding: "2px 8px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            ACTIF
          </span>
        ) : null}
      </div>

      {hasFile ? (
        /* Existing file */
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderRadius: 8,
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>{fileEmoji(currentFileName)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#166534", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentFileName}
            </p>
            <p style={{ fontSize: 10, color: "#6B7280", margin: 0 }}>
              Lien de téléchargement envoyé automatiquement après achat
            </p>
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={removing}
            style={{
              flexShrink: 0,
              fontSize: 11,
              color: "#DC2626",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 4px",
            }}
          >
            {removing ? "…" : "Supprimer"}
          </button>
        </div>
      ) : null}

      {/* Drop zone */}
      {!uploading ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "#6366F1" : "#D1D5DB"}`,
            borderRadius: 10,
            padding: "20px 16px",
            textAlign: "center",
            cursor: "pointer",
            background: dragging ? "#EEF2FF" : "transparent",
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          <p style={{ fontSize: 24, margin: "0 0 6px" }}>📁</p>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>
            {hasFile ? "Remplacer le fichier" : "Déposer ou cliquer pour choisir"}
          </p>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
            PDF, ZIP, EPUB, MP3, MP4 — max 200 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        /* Upload progress */
        <div style={{ border: "1px solid #E5E7EB", borderRadius: 10, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedFile?.name} ({formatBytes(selectedFile?.size ?? 0)})
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", flexShrink: 0 }}>
              {progress}%
            </span>
          </div>
          <div style={{ height: 6, background: "#E5E7EB", borderRadius: 999, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "#6366F1",
                borderRadius: 999,
                transition: "width 0.2s",
              }}
            />
          </div>
          <p style={{ fontSize: 10, color: "#9CA3AF", margin: "6px 0 0" }}>
            Envoi en cours… ne fermez pas cette page.
          </p>
        </div>
      )}

      {error ? (
        <p style={{ fontSize: 11, color: "#DC2626", margin: "6px 0 0" }}>{error}</p>
      ) : null}

      {!hasFile && !uploading ? (
        <p style={{ fontSize: 10, color: "#9CA3AF", margin: "6px 0 0" }}>
          Une fois activé, chaque acheteur reçoit automatiquement un lien sécurisé par email.
        </p>
      ) : null}
    </div>
  );
}

function fileEmoji(name: string | null | undefined): string {
  const ext = (name ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (["mp3", "m4a", "wav", "ogg", "aac", "flac"].includes(ext)) return "🎵";
  if (["mp4", "webm"].includes(ext)) return "🎬";
  if (ext === "pdf") return "📄";
  if (["zip", "gz", "tar"].includes(ext)) return "📦";
  if (ext === "epub") return "📚";
  if (["png", "jpg", "jpeg", "webp", "svg"].includes(ext)) return "🖼";
  return "📁";
}

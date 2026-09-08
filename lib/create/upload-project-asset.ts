/** Headless upload used by on-canvas Shopify-style clicks (no form UI). */
export async function uploadProjectAsset(
  projectId: string,
  file: File,
  kind: "section" | "logo" | "product" = "section",
  dataMode?: string,
): Promise<{ ok: true; url: string; transferKb?: string } | { ok: false; error: string }> {
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    const res = await fetch(`/api/projects/${projectId}/assets/upload`, {
      method: "POST",
      credentials: "include",
      headers: dataMode ? { "X-Kebu-Data-Mode": dataMode } : undefined,
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = [data.error, data.detail].filter(Boolean).join(" — ");
      return { ok: false, error: msg || "Upload failed." };
    }
    if (typeof data.url !== "string" || !data.url) {
      return { ok: false, error: "Upload returned no URL." };
    }
    return {
      ok: true,
      url: data.url,
      transferKb: typeof data.transferKb === "string" ? data.transferKb : undefined,
    };
  } catch {
    return { ok: false, error: "Network error during upload." };
  }
}

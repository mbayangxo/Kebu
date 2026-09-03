import { z } from "zod";
import { validateWebsiteDefinition, type WebsiteDefinition } from "./website-schema";
import { containsUnsafeSiteContent } from "./site-seo";

export const KEBU_TEMPLATE_FILE_KIND = "kebu-template-website-v1";

export type KebuTemplateFile = {
  kebuTemplate: typeof KEBU_TEMPLATE_FILE_KIND;
  name: string;
  definition: WebsiteDefinition;
};

const envelopeSchema = z.object({
  kebuTemplate: z.literal(KEBU_TEMPLATE_FILE_KIND).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  definition: z.unknown().optional(),
});

export function serializeKebuTemplateFile(name: string, definition: WebsiteDefinition): KebuTemplateFile {
  return {
    kebuTemplate: KEBU_TEMPLATE_FILE_KIND,
    name: name.trim().slice(0, 80) || definition.title,
    definition,
  };
}

/**
 * Parse an uploaded personal template.
 * Accepts Kebu envelope JSON or a raw website-v1 definition.
 * Rejects HTML/zip/script payloads.
 */
export function parseKebuTemplateFile(raw: unknown, fallbackName = "Uploaded template"): {
  ok: true;
  name: string;
  definition: WebsiteDefinition;
} | { ok: false; error: string } {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: false, error: "File is empty." };
    if (trimmed.startsWith("<") || trimmed.toLowerCase().includes("<!doctype")) {
      return {
        ok: false,
        error:
          "This looks like HTML. Kebu cannot run ThemeForest, WordPress, or HTML zip themes. Export or upload a Kebu template JSON (website-v1).",
      };
    }
    try {
      raw = JSON.parse(trimmed) as unknown;
    } catch {
      return {
        ok: false,
        error:
          "Not valid JSON. Upload a Kebu template file (.json), not a zip, HTML, or Shopify/WordPress theme.",
      };
    }
  }

  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Template file must be a JSON object." };
  }

  const blob = JSON.stringify(raw);
  if (blob.length > 1_500_000) {
    return { ok: false, error: "Template file is too large (max 1.5 MB)." };
  }
  if (containsUnsafeSiteContent(blob)) {
    return { ok: false, error: "Unsafe content in template file." };
  }

  const env = envelopeSchema.safeParse(raw);
  const candidate = env.success && env.data.definition != null ? env.data.definition : raw;
  const validated = validateWebsiteDefinition(candidate);
  if (!validated.ok) {
    return {
      ok: false,
      error:
        "This file is not a Kebu website template. Use website-v1 JSON (approved sections only) — not ThemeForest HTML or a zip.",
    };
  }

  const name =
    (env.success && env.data.name ? env.data.name : validated.data.title)?.trim() || fallbackName;
  return { ok: true, name: name.slice(0, 80), definition: validated.data };
}

export function statusesAfterPublish<T extends { id: string; status: "live" | "draft" }>(
  themes: T[],
  publishId: string,
): T[] {
  return themes.map((t) => ({
    ...t,
    status: t.id === publishId ? "live" : "draft",
  }));
}

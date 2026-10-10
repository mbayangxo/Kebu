/**
 * The canonical save boundary for a section's props — used by every route that writes
 * `project_sections.props` from the Builder (PATCH /sections, POST /sections/batch for Undo/Redo).
 *
 * Input is the section's complete next props (PATCH merges the patch onto the stored props first;
 * Undo/Redo sends full snapshots). Output is what may be stored:
 *   - `deviceOverrides: null` means "no device overrides" (Reset to Auto) and is removed;
 *   - the section type's props schema validates and normalizes (unknown keys stripped, legacy
 *     Hero fields mapped, invalid optional values dropped where the schema says so);
 *   - extension keys (_motion, _a11y, _visibility, _interaction, _dataBinding) are validated
 *     separately and kept (the type schemas do not declare them);
 *   - script-like / unsafe content is rejected.
 */
import { sectionPropsSchemas, type sectionTypeSchema } from "@/lib/create/website-schema";
import { containsUnsafeSiteContent } from "@/lib/create/site-seo";
import {
  dataBindingSchema,
  responsiveVisibilitySchema,
  sectionA11ySchema,
  sectionInteractionSchema,
  sectionMotionSchema,
} from "@/lib/create/website-extensions";
import type { z } from "zod";

type SectionType = z.infer<typeof sectionTypeSchema>;

const SECTION_EXT_VALIDATORS: Record<string, (v: unknown) => unknown> = {
  _motion: (v) => { const r = sectionMotionSchema.safeParse(v); return r.success ? r.data : undefined; },
  _a11y: (v) => { const r = sectionA11ySchema.optional().safeParse(v); return r.success ? r.data : undefined; },
  _visibility: (v) => { const r = responsiveVisibilitySchema.safeParse(v); return r.success ? r.data : undefined; },
  _interaction: (v) => { const r = sectionInteractionSchema.safeParse(v); return r.success ? r.data : undefined; },
  _dataBinding: (v) => { const r = dataBindingSchema.safeParse(v); return r.success ? r.data : undefined; },
};

export type SectionPropsForSave =
  | { ok: true; props: Record<string, unknown> }
  | { ok: false; error: string; issues?: unknown };

export function sectionPropsForSave(type: SectionType, nextProps: Record<string, unknown>): SectionPropsForSave {
  const input: Record<string, unknown> = { ...nextProps };
  if (input.deviceOverrides === null) delete input.deviceOverrides;

  const parsed = sectionPropsSchemas[type].safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid props.", issues: parsed.error.flatten() };
  if (containsUnsafeSiteContent(JSON.stringify(parsed.data))) {
    return { ok: false, error: "Content blocked for security (scripts or unsafe embeds are not allowed)." };
  }

  const ext: Record<string, unknown> = {};
  for (const [key, validate] of Object.entries(SECTION_EXT_VALIDATORS)) {
    if (input[key] === undefined) continue;
    const valid = validate(input[key]);
    if (valid !== undefined) ext[key] = valid;
  }
  return { ok: true, props: { ...(parsed.data as Record<string, unknown>), ...ext } };
}

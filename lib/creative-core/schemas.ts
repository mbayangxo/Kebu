/**
 * Zod schemas for the model's leaf values. Constraints for fields inherited from 3B mirror
 * lib/create/website-extensions.ts (verified by tests/creative-core/schema-parity.test.ts).
 * One deliberate difference: the model rejects unknown keys where 3B strips them — the legacy
 * adapter lifts 3B's normalized value, so stored data that 3B accepts is never refused.
 */
import { z } from "zod";
import { DEVICES } from "./model";

export const deviceSchema = z.enum(DEVICES as ["desktop", "tablet", "mobile"]);

/** Same rules as 3B `responsiveVisibilitySchema`. */
export const nodeVisibilitySchema = z
  .strictObject({
    showOn: z.array(deviceSchema).min(1).max(3).optional(),
    hideOn: z.array(deviceSchema).min(1).max(3).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.showOn && val.hideOn) {
      const hide = new Set(val.hideOn);
      const overlap = [...new Set(val.showOn)].filter((d) => hide.has(d));
      if (overlap.length > 0) {
        ctx.addIssue({ code: "custom", message: `Contradictory visibility: ${overlap.join(", ")} in both showOn and hideOn`, path: ["hideOn"] });
      }
    }
    if (val.showOn?.length === 3) ctx.addIssue({ code: "custom", message: "showOn with all 3 devices is redundant", path: ["showOn"] });
    if (val.hideOn?.length === 3) ctx.addIssue({ code: "custom", message: "hideOn with all 3 devices hides the element everywhere", path: ["hideOn"] });
  });

const headingLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]);

/** NodeA11y. The 3B section fields (landmark/label/headingLevel/skipTarget/liveRegion) keep 3B's rules. */
export const nodeA11ySchema = z
  .strictObject({
    role: z.enum(["region", "banner", "contentinfo", "navigation", "heading", "img", "presentation", "none"]).optional(),
    label: z.string().trim().max(120).optional(),
    headingLevel: headingLevelSchema.optional(),
    alt: z.string().max(500).optional(),
    decorative: z.boolean().optional(),
    lang: z.string().regex(/^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/).optional(),
    landmark: z.enum(["main", "nav", "banner", "complementary", "contentinfo", "region"]).optional(),
    skipTarget: z.boolean().optional(),
    liveRegion: z.enum(["polite", "assertive"]).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.landmark === "region" && !val.label) {
      ctx.addIssue({ code: "custom", message: 'label is required when landmark is "region"', path: ["label"] });
    }
    if (val.role === "region" && !val.label) {
      ctx.addIssue({ code: "custom", message: 'label is required when role is "region"', path: ["label"] });
    }
    if (val.decorative === true && val.alt) {
      ctx.addIssue({ code: "custom", message: "Decorative media must not have alt text", path: ["alt"] });
    }
  });

/** Same bounds as 3B `deviceLayoutSchema` (40 ids per list, no id both ordered and hidden). */
export const MAX_DEVICE_COMPOSITION_IDS = 40;
export const deviceCompositionSchema = z
  .strictObject({
    order: z.array(z.string().trim().min(1).max(80)).max(MAX_DEVICE_COMPOSITION_IDS).optional(),
    hidden: z.array(z.string().trim().min(1).max(80)).max(MAX_DEVICE_COMPOSITION_IDS).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.order && val.hidden) {
      const order = new Set(val.order);
      const conflicts = [...new Set(val.hidden)].filter((id) => order.has(id));
      if (conflicts.length > 0) {
        ctx.addIssue({ code: "custom", message: `Ids both ordered and hidden: ${conflicts.join(", ")}`, path: ["hidden"] });
      }
    }
  });

export const responsiveStateSchema = z.strictObject({
  mode: z.enum(["auto", "custom", "needs-review"]),
  baseHash: z.string().max(32).optional(),
});

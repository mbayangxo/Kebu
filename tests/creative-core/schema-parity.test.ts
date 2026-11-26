/**
 * The model's leaf schemas mirror 3B's (lib/create/website-extensions.ts, website-schema.ts):
 *
 *   for every candidate built from 3B's own keys:  model accepts ⇔ 3B accepts, same parsed value
 *   with an unknown key added:                     the model rejects (strict), and accepts 3B's
 *                                                  normalized value exactly when 3B accepts
 *
 * Candidates are enumerated combinatorially from valid and invalid values per key, so every
 * cross-field rule (region needs a label, showOn/hideOn overlap, all-three-devices) is hit.
 */
import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import { deviceCompositionSchema, nodeA11ySchema, nodeVisibilitySchema, responsiveStateSchema } from "@/lib/creative-core";
import { deviceLayoutSchema, responsiveVisibilitySchema, sectionA11ySchema } from "@/lib/create/website-extensions";
import { deviceOverridesSchema } from "@/lib/create/website-schema";

type Values = Record<string, unknown[]>;
const ABSENT = Symbol("absent");

/** Every combination of per-key values (ABSENT = key omitted). */
function combos(values: Values): Record<string, unknown>[] {
  let out: Record<string, unknown>[] = [{}];
  for (const [key, options] of Object.entries(values)) {
    out = out.flatMap((base) => [ABSENT, ...options].map((v) => (v === ABSENT ? base : { ...base, [key]: v })));
  }
  return out;
}

function checkParity(model: ZodType, threeB: ZodType, candidates: Record<string, unknown>[], toModel: (v: Record<string, unknown>) => unknown = (v) => v) {
  let accepted = 0;
  for (const c of candidates) {
    const m = model.safeParse(toModel(c));
    const t = threeB.safeParse(c);
    expect(m.success, `${JSON.stringify(c)} model=${m.success} 3B=${t.success}`).toBe(t.success);
    if (m.success && t.success) {
      expect(m.data).toEqual(toModel(t.data as Record<string, unknown>));
      accepted++;
    }
    const withExtra = { ...c, futureKey: 1 };
    expect(model.safeParse(toModel(withExtra)).success, "unknown keys are rejected by the model").toBe(false);
    const t2 = threeB.safeParse(withExtra);
    if (t2.success) expect(model.safeParse(toModel(t2.data as Record<string, unknown>)).success).toBe(true);
  }
  return accepted;
}

const DEVICE_LISTS = [[], ["desktop"], ["mobile"], ["tablet", "mobile"], ["desktop", "tablet", "mobile"], ["phone"], "mobile"];

describe("schema parity with 3B", () => {
  it("section a11y (_a11y)", () => {
    const candidates = combos({
      landmark: ["main", "nav", "banner", "complementary", "contentinfo", "region", "footer"],
      label: ["", "Main", "  Padded  ", "x".repeat(120), "x".repeat(121), 5],
      headingLevel: [1, 6, 0, 7, "2"],
      skipTarget: [true, "yes"],
      liveRegion: ["polite", "assertive", "off"],
    });
    expect(checkParity(nodeA11ySchema, sectionA11ySchema, candidates)).toBeGreaterThan(500);
  });

  it("responsive visibility (_visibility)", () => {
    const candidates = combos({ showOn: DEVICE_LISTS, hideOn: DEVICE_LISTS });
    expect(checkParity(nodeVisibilitySchema, responsiveVisibilitySchema, candidates)).toBeGreaterThan(10);
  });

  it("responsive state (deviceOverrides._state)", () => {
    const threeB = deviceOverridesSchema.unwrap().shape._state.unwrap();
    const candidates = combos({
      mode: ["auto", "custom", "needs-review", "manual"],
      baseHash: ["", "a1b2c3d4", "x".repeat(32), "x".repeat(33), 7],
    });
    expect(checkParity(responsiveStateSchema, threeB, candidates)).toBeGreaterThan(5);
  });

  it("device composition (project_pages.device_layouts[device])", () => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => `id-${i}`);
    const candidates = combos({
      sectionOrder: [[], ids(3), ids(40), ids(41), ["a", "a"], [""], ["y".repeat(81)], "id-0"],
      hiddenSections: [[], ["id-1"], ids(41), ["b"]],
    });
    const toModel = (v: Record<string, unknown>) => {
      const { sectionOrder, hiddenSections, ...rest } = v;
      return { ...rest, ...(sectionOrder !== undefined ? { order: sectionOrder } : {}), ...(hiddenSections !== undefined ? { hidden: hiddenSections } : {}) };
    };
    expect(checkParity(deviceCompositionSchema, deviceLayoutSchema, candidates, toModel)).toBeGreaterThan(10);
  });
});

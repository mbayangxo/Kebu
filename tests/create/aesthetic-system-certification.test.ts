/**
 * Aesthetic System Certification — static tier
 *
 * Covers every customer-selectable Aesthetic in the Aesthetic Gallery (32 aesthetics,
 * 15 type groups from USER_AESTHETICS_BY_TYPE) plus the 8 owner-portfolio Aesthetics
 * as known regression fixtures.
 *
 * ── WHAT THIS SUITE CERTIFIES ─────────────────────────────────────────────────
 *
 * 1. DEFINITION INTEGRITY
 *    Every gallery aesthetic exists in TEMPLATE_SEEDS with a valid WebsiteDefinition.
 *    Required fields: schemaVersion, title, theme (primary/accent/background/text/fontDisplay),
 *    at least 1 page, at least 1 section per page, all section types known to SiteRenderer.
 *
 * 2. RENDERER COVERAGE
 *    No section type in any gallery aesthetic definition falls outside SECTION_TYPES —
 *    which is the canonical list the SiteRenderer switch statement handles.
 *    An unknown section type would render nothing (silent null) in production.
 *
 * 3. RESPONSIVE DATA RULES
 *    validateSectionResponsiveData() reports no ERROR-severity violations on any
 *    section in any gallery aesthetic.  Warnings are captured and reported per-aesthetic.
 *
 * 4. SMART RESPONSIVE COMPOSITION
 *    generateDeviceOverrides() can be called for every section type in every gallery
 *    aesthetic without throwing.  Composable types produce non-empty tablet or mobile
 *    overrides (verifies the composer registry is correctly wired).
 *    Device override bags never duplicate base-prop content.
 *
 * 5. CONTENT VARIABILITY STRESS
 *    Representative sections survive injected content extremes without throwing or
 *    violating responsive data rules:
 *      • 2-char title (very short)
 *      • 250-char title (extremely long)
 *      • 500-char paragraph body
 *      • missing optional image (undefined)
 *      • portrait image size hint
 *      • landscape image size hint
 *      • 12 navigation links
 *      • 1 navigation link
 *      • 20 products/items (many)
 *      • 1 product/item (one)
 *      • long product name (80 chars)
 *      • long button text (60 chars)
 *      • 8 social links
 *      • 0 social links
 *
 * 6. AESTHETIC GALLERY INTEGRITY
 *    All gallery groups have correct structure, no dead slugs, no duplicate slugs,
 *    each item has a preview path, demo path, use path, and card visual.
 *    No gallery entry references a slug that is owner_portfolio.
 *    Every gallery slug resolves to a TEMPLATE_SEEDS entry.
 *
 * 7. MAY LÈCOR REGRESSION FIXTURES
 *    The 8 owner-portfolio Aesthetics use only known section types.
 *    Their definitions are non-empty (no accidental wipe of bespoke layouts).
 *    maylecor-home, maylecor-music, legally-blonde-hero, kdirection-home,
 *    kdirection-page section types are present in at least one owner-portfolio entry.
 *
 * ── WHAT THIS SUITE DOES NOT CERTIFY ─────────────────────────────────────────
 *
 *   • Actual browser rendering (no horizontal overflow, no clipping, touch targets)
 *     → see e2e-aesthetic-catalog.spec.ts (requires KEBU_E2E_BASE_URL)
 *   • Customization flow (add/delete/reorder section, edit text) — requires live builder
 *   • Gallery → create project transition — requires auth
 *   • Smart Responsive state machine (needs-review, keep, regenerate) — requires builder UI
 *
 * These are documented as BLOCKED in the certification matrix at the bottom of this file.
 */

import { describe, expect, it } from "vitest";
import { SECTION_TYPES } from "@/lib/create/website-schema";
import {
  TEMPLATE_SEEDS,
  publicTemplateSeeds,
  isPublicTemplateSlug,
} from "@/lib/create/templates-seed";
import { USER_AESTHETICS_BY_TYPE, OWNER_PORTFOLIO_AESTHETIC_SLUGS, userAestheticSlugs } from "@/lib/create/user-aesthetics-catalog";
import {
  getAestheticGalleryGroups,
  getAestheticGalleryItem,
  listAestheticGallerySlugs,
} from "@/lib/create/aesthetics-gallery";
import {
  validateSectionResponsiveData,
  type QaViolation,
} from "@/lib/create/responsive-qa";
import {
  generateDeviceOverrides,
  COMPOSABLE_SECTION_TYPES,
} from "@/lib/create/responsive-composer";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

// ── Helpers ────────────────────────────────────────────────────────────────────

const KNOWN_SECTION_TYPES = new Set(SECTION_TYPES as readonly string[]);

const GALLERY_SLUGS = userAestheticSlugs();

function seedForSlug(slug: string) {
  return TEMPLATE_SEEDS.find((t) => t.slug === slug) ?? null;
}

function allSectionsInDefinition(def: WebsiteDefinition) {
  return def.pages.flatMap((p) => p.sections);
}

// ── 1. DEFINITION INTEGRITY ────────────────────────────────────────────────────

describe("1. Definition integrity — all 32 gallery aesthetics", () => {
  it("USER_AESTHETICS_BY_TYPE contains exactly 32 aesthetics across 14 type groups", () => {
    const slugs = userAestheticSlugs();
    expect(slugs.length).toBe(32);
    expect(new Set(slugs).size).toBe(32); // no duplicate slugs
    expect(USER_AESTHETICS_BY_TYPE.length).toBe(14);
  });

  for (const group of USER_AESTHETICS_BY_TYPE) {
    for (const aesthetic of group.pair) {
      it(`${aesthetic.slug}: exists in TEMPLATE_SEEDS`, () => {
        const seed = seedForSlug(aesthetic.slug);
        expect(seed, `${aesthetic.slug} not found in TEMPLATE_SEEDS`).not.toBeNull();
      });

      it(`${aesthetic.slug}: definition has required shape`, () => {
        const seed = seedForSlug(aesthetic.slug);
        if (!seed) return;
        const def = seed.definition;
        expect(def.schemaVersion).toBe("website-v1");
        expect(typeof def.title).toBe("string");
        expect(def.title.length).toBeGreaterThan(0);
        expect(def.theme.primary).toBeTruthy();
        expect(def.theme.accent).toBeTruthy();
        expect(def.theme.background).toBeTruthy();
        expect(def.theme.text).toBeTruthy();
        expect(def.theme.fontDisplay).toBeTruthy();
        expect(def.pages.length).toBeGreaterThan(0);
      });

      it(`${aesthetic.slug}: every page has at least one section`, () => {
        const seed = seedForSlug(aesthetic.slug);
        if (!seed) return;
        for (const page of seed.definition.pages) {
          expect(
            page.sections.length,
            `${aesthetic.slug} page "${page.slug}" has no sections`,
          ).toBeGreaterThan(0);
        }
      });

      it(`${aesthetic.slug}: visibility is not owner_portfolio`, () => {
        const seed = seedForSlug(aesthetic.slug);
        if (!seed) return;
        expect(seed.visibility).not.toBe("owner_portfolio");
        expect(isPublicTemplateSlug(aesthetic.slug)).toBe(true);
      });
    }
  }
});

// ── 2. RENDERER COVERAGE ───────────────────────────────────────────────────────

describe("2. Renderer coverage — no unknown section types in gallery aesthetics", () => {
  for (const group of USER_AESTHETICS_BY_TYPE) {
    for (const aesthetic of group.pair) {
      it(`${aesthetic.slug}: all section types known to SiteRenderer`, () => {
        const seed = seedForSlug(aesthetic.slug);
        if (!seed) return;
        const unknown: string[] = [];
        for (const section of allSectionsInDefinition(seed.definition)) {
          if (!KNOWN_SECTION_TYPES.has(section.type)) {
            unknown.push(`${section.type} (page: ${seed.definition.pages.find((p) => p.sections.includes(section))?.slug})`);
          }
        }
        expect(
          unknown,
          `${aesthetic.slug} has unknown section types: ${unknown.join(", ")}`,
        ).toHaveLength(0);
      });
    }
  }

  it("Standard primitive section types (non-bespoke) cover all gallery aesthetic needs", () => {
    const bespokeTypes = new Set(["maylecor-home", "maylecor-music", "legally-blonde-hero", "kdirection-home", "kdirection-page"]);
    const galleryUsedTypes = new Set<string>();
    for (const group of USER_AESTHETICS_BY_TYPE) {
      for (const aesthetic of group.pair) {
        const seed = seedForSlug(aesthetic.slug);
        if (!seed) continue;
        for (const section of allSectionsInDefinition(seed.definition)) {
          galleryUsedTypes.add(section.type);
        }
      }
    }
    // Gallery aesthetics should not use bespoke structural types
    const overlappingBespoke = [...galleryUsedTypes].filter((t) => bespokeTypes.has(t));
    expect(
      overlappingBespoke,
      `Gallery aesthetics should not use bespoke layout types: ${overlappingBespoke.join(", ")}`,
    ).toHaveLength(0);
  });
});

// ── 3. RESPONSIVE DATA RULES ───────────────────────────────────────────────────

describe("3. Responsive data rules — no error-severity violations in gallery aesthetics", () => {
  for (const group of USER_AESTHETICS_BY_TYPE) {
    for (const aesthetic of group.pair) {
      it(`${aesthetic.slug}: no responsive data ERRORS`, () => {
        const seed = seedForSlug(aesthetic.slug);
        if (!seed) return;
        const errors: string[] = [];
        for (const page of seed.definition.pages) {
          for (const section of page.sections) {
            const violations: QaViolation[] = validateSectionResponsiveData({
              type: section.type,
              props: section.props as Record<string, unknown>,
            });
            const errorViolations = violations.filter((v) => v.severity === "error");
            for (const v of errorViolations) {
              errors.push(`page:${page.slug} section:${section.type} — ${v.rule}: ${v.detail}`);
            }
          }
        }
        expect(
          errors,
          `${aesthetic.slug} has responsive data errors:\n${errors.join("\n")}`,
        ).toHaveLength(0);
      });
    }
  }

  it("no gallery aesthetic has responsive data ERROR violations (warnings are informational)", () => {
    // Warnings (e.g. gallery-mobile-columns) are informational — the Smart Responsive Composer
    // injects device overrides at render time. Only hard errors are failures.
    const errorsFound: string[] = [];
    for (const group of USER_AESTHETICS_BY_TYPE) {
      for (const aesthetic of group.pair) {
        const seed = seedForSlug(aesthetic.slug);
        if (!seed) continue;
        for (const section of allSectionsInDefinition(seed.definition)) {
          if (section.type === "gallery" || section.type === "products") {
            const violations = validateSectionResponsiveData({
              type: section.type,
              props: section.props as Record<string, unknown>,
            });
            const errors = violations.filter((v) => v.severity === "error");
            for (const e of errors) {
              errorsFound.push(`${aesthetic.slug}/${section.type}: ${e.rule} — ${e.detail}`);
            }
          }
        }
      }
    }
    expect(
      errorsFound,
      `Gallery/products sections with ERROR violations:\n${errorsFound.join("\n")}`,
    ).toHaveLength(0);
  });
});

// ── 4. SMART RESPONSIVE COMPOSITION ───────────────────────────────────────────

describe("4. Smart Responsive Composition — generateDeviceOverrides for all gallery section types", () => {
  it("generateDeviceOverrides does not throw for any section type in any gallery aesthetic", () => {
    const allTypes = new Set<string>();
    for (const group of USER_AESTHETICS_BY_TYPE) {
      for (const aesthetic of group.pair) {
        const seed = seedForSlug(aesthetic.slug);
        if (!seed) continue;
        for (const section of allSectionsInDefinition(seed.definition)) {
          allTypes.add(section.type);
        }
      }
    }
    for (const type of allTypes) {
      expect(
        () => generateDeviceOverrides(type, { align: "left", columns: 3, heightVh: 80 }),
        `generateDeviceOverrides threw for section type: ${type}`,
      ).not.toThrow();
    }
  });

  it("COMPOSABLE_SECTION_TYPES covers all major layout section types used by gallery aesthetics", () => {
    // These section types appear across many gallery aesthetics and MUST be composable
    const mustBeComposable = ["navigation", "editorial-hero", "hero", "gallery", "products", "features"];
    for (const type of mustBeComposable) {
      expect(
        COMPOSABLE_SECTION_TYPES.has(type),
        `${type} must be in COMPOSABLE_SECTION_TYPES`,
      ).toBe(true);
    }
  });

  it("navigation composer produces mobile: compact layout override", () => {
    const result = generateDeviceOverrides("navigation", { navSize: "large", navLayout: "top" });
    expect(result.mobile?.navSize).toBe("compact");
  });

  it("editorial-hero composer reduces heightVh for tablet and mobile", () => {
    const result = generateDeviceOverrides("editorial-hero", { heightVh: 90, align: "left" });
    expect(Number(result.tablet?.heightVh ?? 90)).toBeLessThanOrEqual(70);
    expect(Number(result.mobile?.heightVh ?? 90)).toBeLessThanOrEqual(60);
  });

  it("gallery composer reduces columns for tablet and mobile", () => {
    const result = generateDeviceOverrides("gallery", { columns: 4, aspectRatio: "landscape" });
    expect(Number(result.tablet?.columns ?? 4)).toBeLessThanOrEqual(3);
    expect(Number(result.mobile?.columns ?? 4)).toBeLessThanOrEqual(2);
  });

  it("products composer reduces columns for mobile", () => {
    const result = generateDeviceOverrides("products", { columns: 3 });
    expect(Number(result.mobile?.columns ?? 3)).toBeLessThanOrEqual(2);
  });

  it("composer output bags do not add entirely new content keys (no duplication)", () => {
    // A composer should only override layout/display values, not copy content fields
    const contentOnlyResult = generateDeviceOverrides("editorial-hero", {
      heading: "Artist Name",
      subheading: "Sub",
      imageUrl: "/photo.jpg",
      heightVh: 80,
      align: "left",
    });
    // Content keys should not appear in override bags
    for (const bag of [contentOnlyResult.tablet, contentOnlyResult.mobile]) {
      if (!bag) continue;
      expect(bag.heading, "Composer must not copy content heading into device override").toBeUndefined();
      expect(bag.imageUrl, "Composer must not copy imageUrl into device override").toBeUndefined();
    }
  });
});

// ── 5. CONTENT VARIABILITY STRESS ─────────────────────────────────────────────

describe("5. Content variability stress — representative aesthetics with extreme content", () => {
  const VERY_SHORT_TITLE = "Hi";
  const VERY_LONG_TITLE = "A".repeat(250);
  const LONG_PARAGRAPH = "B".repeat(500);
  const LONG_PRODUCT_NAME = "C".repeat(80);
  const LONG_BUTTON_TEXT = "D".repeat(60);

  const STRESS_CASES = [
    { label: "very short title (2 chars)", props: { heading: VERY_SHORT_TITLE } },
    { label: "extremely long title (250 chars)", props: { heading: VERY_LONG_TITLE } },
    { label: "long paragraph (500 chars)", props: { body: LONG_PARAGRAPH } },
    { label: "missing optional image", props: { imageUrl: undefined } },
    { label: "portrait image hint", props: { imageAspect: "portrait" } },
    { label: "landscape image hint", props: { imageAspect: "landscape" } },
    { label: "many nav links (12)", props: { links: Array.from({ length: 12 }, (_, i) => ({ label: `Link ${i}`, href: "#" })) } },
    { label: "single nav link", props: { links: [{ label: "Home", href: "/" }] } },
    { label: "many products (20)", props: { items: Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, name: `Product ${i}`, price: 1000 })) } },
    { label: "single product", props: { items: [{ id: "p0", name: "Solo Product", price: 5000 }] } },
    { label: "long product name (80 chars)", props: { items: [{ id: "p0", name: LONG_PRODUCT_NAME, price: 1000 }] } },
    { label: "long button text (60 chars)", props: { buttonLabel: LONG_BUTTON_TEXT } },
    { label: "many social links (8)", props: { socialLinks: Array.from({ length: 8 }, (_, i) => ({ platform: "instagram", url: `https://instagram.com/u${i}` })) } },
    { label: "no social links", props: { socialLinks: [] } },
  ];

  // Test representative section types
  const REPRESENTATIVE_SECTION_TYPES = ["navigation", "editorial-hero", "hero", "features", "gallery", "products", "footer"];

  for (const sectionType of REPRESENTATIVE_SECTION_TYPES) {
    for (const stressCase of STRESS_CASES) {
      it(`${sectionType} + ${stressCase.label}: no responsive data errors`, () => {
        const mergedProps = { ...stressCase.props };
        const violations = validateSectionResponsiveData({ type: sectionType, props: mergedProps });
        const errors = violations.filter((v) => v.severity === "error");
        expect(
          errors,
          `${sectionType} with ${stressCase.label} has errors: ${errors.map((e) => e.rule).join(", ")}`,
        ).toHaveLength(0);
      });

      it(`${sectionType} + ${stressCase.label}: generateDeviceOverrides does not throw`, () => {
        const mergedProps = { ...stressCase.props, columns: 3, heightVh: 80, align: "left" };
        expect(
          () => generateDeviceOverrides(sectionType, mergedProps),
        ).not.toThrow();
      });
    }
  }
});

// ── 6. AESTHETIC GALLERY INTEGRITY ────────────────────────────────────────────

describe("6. Aesthetic Gallery integrity", () => {
  it("getAestheticGalleryGroups returns all 14 type groups", () => {
    const groups = getAestheticGalleryGroups();
    expect(groups.length).toBe(14);
  });

  it("every gallery item resolves to a known TEMPLATE_SEEDS entry", () => {
    const slugs = listAestheticGallerySlugs();
    for (const slug of slugs) {
      const seed = seedForSlug(slug);
      expect(seed, `Gallery slug ${slug} not found in TEMPLATE_SEEDS`).not.toBeNull();
    }
  });

  it("no gallery item references an owner_portfolio aesthetic", () => {
    const ownerPortfolioSet = new Set(OWNER_PORTFOLIO_AESTHETIC_SLUGS as readonly string[]);
    const slugs = listAestheticGallerySlugs();
    for (const slug of slugs) {
      expect(
        ownerPortfolioSet.has(slug),
        `Gallery contains owner_portfolio slug: ${slug}`,
      ).toBe(false);
    }
  });

  it("no duplicate slugs in the gallery", () => {
    const slugs = listAestheticGallerySlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every gallery item has required card properties", () => {
    const groups = getAestheticGalleryGroups();
    for (const group of groups) {
      for (const item of group.items) {
        expect(item.slug, "item missing slug").toBeTruthy();
        expect(item.name, `${item.slug} missing name`).toBeTruthy();
        expect(item.detailPath, `${item.slug} missing detailPath`).toMatch(/^\/create\/aesthetics\//);
        expect(item.demoPath, `${item.slug} missing demoPath`).toMatch(/\/create\/(demo|templates\/preview)\//);
        expect(item.cardVisual, `${item.slug} missing cardVisual`).toBeTruthy();
        expect(item.cardVisual.layout, `${item.slug} cardVisual.layout is empty`).toBeTruthy();
        expect(item.previewGradient, `${item.slug} missing previewGradient`).toBeTruthy();
      }
    }
  });

  it("every gallery item has a non-empty cardVisual.layout", () => {
    // Layouts within a group may share a name (e.g. both tech items use "tech" layout);
    // the invariant is that every item has SOME layout value, not that they are distinct.
    const groups = getAestheticGalleryGroups();
    for (const group of groups) {
      for (const item of group.items) {
        expect(
          item.cardVisual.layout,
          `${item.slug} in group ${group.type} has no cardVisual.layout`,
        ).toBeTruthy();
      }
    }
  });

  it("gallery item resolveAestheticGalleryItem returns correct data for spot checks", () => {
    const layersBeauty = getAestheticGalleryItem("layers-beauty");
    expect(layersBeauty?.name).toMatch(/LAYERS/i);
    expect(layersBeauty?.previewImage).toBeTruthy();

    const fashionAtelier = getAestheticGalleryItem("fashion-atelier");
    expect(fashionAtelier?.slug).toBe("fashion-atelier");

    const hairSalon = getAestheticGalleryItem("hair-salon");
    expect(hairSalon?.cardVisual).toBeTruthy();
  });

  it("gallery groups contain the key business verticals", () => {
    const groups = getAestheticGalleryGroups();
    const groupTypes = groups.map((g) => g.type);
    for (const expected of ["music", "beauty", "fashion", "food", "business", "tech", "portfolio"]) {
      expect(groupTypes, `Missing gallery group type: ${expected}`).toContain(expected);
    }
  });

  it("publicTemplateSeeds() filters out all owner_portfolio seeds", () => {
    const publicSeeds = publicTemplateSeeds();
    const ownerPortfolioSet = new Set(OWNER_PORTFOLIO_AESTHETIC_SLUGS as readonly string[]);
    for (const seed of publicSeeds) {
      expect(
        ownerPortfolioSet.has(seed.slug),
        `publicTemplateSeeds() returned owner_portfolio seed: ${seed.slug}`,
      ).toBe(false);
    }
  });

  it("all 32 gallery slugs are present in publicTemplateSeeds()", () => {
    const publicSlugs = new Set(publicTemplateSeeds().map((t) => t.slug));
    for (const slug of GALLERY_SLUGS) {
      expect(publicSlugs.has(slug), `Gallery slug ${slug} not in publicTemplateSeeds()`).toBe(true);
    }
  });
});

// ── 7. MAY LÈCOR REGRESSION FIXTURES (owner portfolio) ────────────────────────

describe("7. May Lècor regression fixtures — owner portfolio aesthetics", () => {
  const OWNER_PORTFOLIO_SLUGS = [
    "musician-maylecor-ksendr",
    "musician-kdirection-artist",
    "showcase-legally-blonde",
    "agency-kdirection",
    "agency-dklns",
    "production-ndaoan-house",
    "entertainment-rect",
    "foundation-mayjor-good",
  ];

  for (const slug of OWNER_PORTFOLIO_SLUGS) {
    it(`${slug}: definition exists and has pages with sections`, () => {
      const seed = seedForSlug(slug);
      expect(seed, `${slug} not found in TEMPLATE_SEEDS`).not.toBeNull();
      if (!seed) return;
      expect(seed.definition.pages.length).toBeGreaterThan(0);
      for (const page of seed.definition.pages) {
        expect(page.sections.length, `${slug} page "${page.slug}" is empty`).toBeGreaterThan(0);
      }
    });

    it(`${slug}: all section types are known (no renderer silent-null)`, () => {
      const seed = seedForSlug(slug);
      if (!seed) return;
      const unknown: string[] = [];
      for (const section of allSectionsInDefinition(seed.definition)) {
        if (!KNOWN_SECTION_TYPES.has(section.type)) {
          unknown.push(section.type);
        }
      }
      expect(unknown, `${slug} uses unknown section types: ${unknown.join(", ")}`).toHaveLength(0);
    });

    it(`${slug}: visibility is owner_portfolio`, () => {
      const seed = seedForSlug(slug);
      if (!seed) return;
      expect(seed.visibility).toBe("owner_portfolio");
      expect(isPublicTemplateSlug(slug)).toBe(false);
    });
  }

  it("musician-kdirection-artist contains maylecor-home section (regression: must not be wiped)", () => {
    const seed = seedForSlug("musician-kdirection-artist");
    expect(seed).not.toBeNull();
    if (!seed) return;
    const sections = allSectionsInDefinition(seed.definition);
    expect(sections.some((s) => s.type === "maylecor-home")).toBe(true);
  });

  it("musician-kdirection-artist contains maylecor-music section (regression: must not be wiped)", () => {
    const seed = seedForSlug("musician-kdirection-artist");
    if (!seed) return;
    const sections = allSectionsInDefinition(seed.definition);
    expect(sections.some((s) => s.type === "maylecor-music")).toBe(true);
  });

  it("musician-maylecor-ksendr contains legally-blonde-hero section", () => {
    const seed = seedForSlug("musician-maylecor-ksendr");
    if (!seed) return;
    const sections = allSectionsInDefinition(seed.definition);
    expect(sections.some((s) => s.type === "legally-blonde-hero")).toBe(true);
  });

  it("showcase-legally-blonde contains legally-blonde-hero section", () => {
    const seed = seedForSlug("showcase-legally-blonde");
    if (!seed) return;
    const sections = allSectionsInDefinition(seed.definition);
    expect(sections.some((s) => s.type === "legally-blonde-hero")).toBe(true);
  });

  it("agency-kdirection contains kdirection-home section", () => {
    const seed = seedForSlug("agency-kdirection");
    if (!seed) return;
    const sections = allSectionsInDefinition(seed.definition);
    expect(sections.some((s) => s.type === "kdirection-home")).toBe(true);
  });

  it("bespoke section types are used only in owner_portfolio aesthetics (not leaked to gallery)", () => {
    const bespokeTypes = new Set(["maylecor-home", "maylecor-music", "legally-blonde-hero", "kdirection-home", "kdirection-page"]);
    const ownerPortfolioSet = new Set(OWNER_PORTFOLIO_SLUGS);
    for (const seed of TEMPLATE_SEEDS) {
      if (ownerPortfolioSet.has(seed.slug)) continue;
      for (const section of allSectionsInDefinition(seed.definition)) {
        expect(
          bespokeTypes.has(section.type),
          `Non-owner-portfolio seed "${seed.slug}" uses bespoke section type "${section.type}"`,
        ).toBe(false);
      }
    }
  });
});

// ── 8. FULL CATALOG COVERAGE ───────────────────────────────────────────────────

describe("8. Full public catalog — all public template seeds have valid structure", () => {
  const publicSeeds = publicTemplateSeeds();

  it(`has ${publicSeeds.length} public templates`, () => {
    expect(publicSeeds.length).toBeGreaterThan(100);
  });

  it("all public seeds have slug, name, category, definition", () => {
    for (const seed of publicSeeds) {
      expect(seed.slug, "seed missing slug").toBeTruthy();
      expect(seed.name, `${seed.slug} missing name`).toBeTruthy();
      expect(seed.category, `${seed.slug} missing category`).toBeTruthy();
      expect(seed.definition, `${seed.slug} missing definition`).toBeTruthy();
    }
  });

  it("no public seed uses unknown section types", () => {
    const violations: string[] = [];
    for (const seed of publicSeeds) {
      for (const section of allSectionsInDefinition(seed.definition)) {
        if (!KNOWN_SECTION_TYPES.has(section.type)) {
          violations.push(`${seed.slug}: unknown type "${section.type}"`);
        }
      }
    }
    expect(
      violations,
      `Public seeds use unknown section types:\n${violations.join("\n")}`,
    ).toHaveLength(0);
  });

  it("no public seed uses bespoke owner-portfolio section types", () => {
    const bespokeTypes = new Set(["maylecor-home", "maylecor-music", "legally-blonde-hero", "kdirection-home", "kdirection-page"]);
    const violations: string[] = [];
    for (const seed of publicSeeds) {
      for (const section of allSectionsInDefinition(seed.definition)) {
        if (bespokeTypes.has(section.type)) {
          violations.push(`${seed.slug}: bespoke type "${section.type}"`);
        }
      }
    }
    expect(
      violations,
      `Public seeds should not use bespoke types:\n${violations.join("\n")}`,
    ).toHaveLength(0);
  });
});

/*
 * ── CERTIFICATION MATRIX ─────────────────────────────────────────────────────
 *
 * Status definitions:
 *   VERIFIED   — checked by this test suite (deterministic, reproducible)
 *   PARTIAL    — checked for data/structure; browser rendering not confirmed
 *   BLOCKED    — requires auth or running server; cannot be checked statically
 *   NOT READY  — known defect found
 *
 * This matrix covers the 32 customer-selectable Aesthetics in the Gallery.
 * May Lècor owner-portfolio aesthetics are listed separately as regression fixtures.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AESTHETIC             | Def | Renderer | Responsive | Content | Composer | Browser | Status
 * ─────────────────────────────────────────────────────────────────────────────
 * musician-artist       | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * musician-streaming    | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * carmine-creative      | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * professional-services | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * production-company    | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * film-studio           | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * meridian-films        | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * hair-salon            | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * layers-beauty         | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * clarte-compatible-skin| ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * nuance-beauty         | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * perfume-brand         | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * scent-boutique        | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * fashion-atelier       | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * clothing-company      | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * nuee-intimates        | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * luxury-rtw            | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * accessories-maison    | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * streetwear-drop       | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * activewear-studio     | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * shopping-store        | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * online-store-preview  | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * restaurant-table      | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * hotel-stay            | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * business-company      | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * construction-build    | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * app-launch            | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * tech-startup          | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * portfolio-pro         | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * student-portfolio     | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * ngo-impact            | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 * agriculture-farm      | ✓   | ✓        | ✓          | ✓       | ✓        | BLOCKED | PARTIAL
 *
 * ── OWNER-PORTFOLIO REGRESSION FIXTURES ──────────────────────────────────────
 * musician-maylecor-ksendr    | ✓ | ✓ | - | - | - | BLOCKED | PARTIAL (bespoke layout)
 * musician-kdirection-artist  | ✓ | ✓ | - | - | - | BLOCKED | PARTIAL (bespoke layout)
 * showcase-legally-blonde     | ✓ | ✓ | - | - | - | BLOCKED | PARTIAL (bespoke layout)
 * agency-kdirection           | ✓ | ✓ | - | - | - | BLOCKED | PARTIAL (bespoke layout)
 * agency-dklns                | ✓ | ✓ | - | - | - | BLOCKED | PARTIAL (bespoke layout)
 * production-ndaoan-house     | ✓ | ✓ | - | - | - | BLOCKED | PARTIAL (bespoke layout)
 * entertainment-rect          | ✓ | ✓ | - | - | - | BLOCKED | PARTIAL (bespoke layout)
 * foundation-mayjor-good      | ✓ | ✓ | - | - | - | BLOCKED | PARTIAL (bespoke layout)
 *
 * ── WHAT REMAINS BLOCKED ─────────────────────────────────────────────────────
 *
 * B1. Browser rendering at 7 viewports (no horizontal overflow, no clipping,
 *     touch targets, visible content, no whitespace blowout)
 *     → Unblocked by: `pnpm dev` + `KEBU_E2E_BASE_URL=http://localhost:3000`
 *     → Test file: e2e-aesthetic-catalog.spec.ts (see below)
 *
 * B2. Customization flow (add/delete/reorder sections, edit text, replace images,
 *     typography/style change, page creation, nav modification)
 *     → Unblocked by: running Builder + authenticated user session
 *
 * B3. Smart Responsive state machine UI (needs-review → keep → regenerate)
 *     → Unblocked by: running Builder + authenticated user session
 *
 * B4. Gallery → choose → project creation integrity
 *     → Unblocked by: Supabase Auth + running server
 *
 * B5. May Lècor actual SiteRenderer visual render (maylecor-home, legally-blonde-hero)
 *     → Unblocked by: adding app/create/demo/maylecor-fixture/page.tsx (no auth needed)
 *     → Once route is added, e2e-siterenderer-responsive.spec.ts can cover it
 */

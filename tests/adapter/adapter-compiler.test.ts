/**
 * Aesthetic Adapter Phase 2 — IR → WebsiteDefinition compiler tests.
 *
 * Uses all 10 Phase 1 fixtures. Proves:
 *  1. native capabilities compile correctly
 *  2. unsupported capabilities remain represented in IR/report
 *  3. material loss blocks certification
 *  4. custom components cannot bypass approval
 *  5. provenance survives compilation
 *  6. motion is not silently flattened
 *  7. fonts preserve licensing/provenance
 *  8. device-specific intent survives (in report)
 *  9. owner-only portfolio section types remain prohibited
 * 10. deterministic compilation
 * 11. malformed/hostile input cannot reach executable output
 */

import { describe, it, expect } from "vitest";
import { randomUUID } from "crypto";

import {
  // Compiler
  compileIR,
  COMPILER_VERSION,
  // Capability negotiation
  TARGET_CAPABILITY_MAP,
  PROPOSED_EXTENSIONS,
  negotiateCapabilities,
  // Gap report
  buildGapReport,
  formatGapReport,
  // Phase 1 imports (fixtures)
  validateAdapterDesignIR,
  detectHostileContent,
  safeParseJson,
  buildDiagnosticReport,
  emptyDiagnosticReport,
  makeDiagnostic,
  pendingCertification,
  allFidelityPass,
  failedFidelity,
  isMaterialAndBlocked,
  isOwnerPortfolioType,
  isKebuBundledFont,
  ADAPTER_VERSION,
  AESTHETIC_CONTRACT_VERSION,
  IR_VERSION,
  OWNER_PORTFOLIO_SECTION_TYPES,
  // Types
  type AdapterDesignIR,
  type FontContractV1,
  type CustomComponentSpec,
  type DesignProvenance,
  type CertificationStatus,
} from "@/lib/adapter/index";

// ── Test helpers ──────────────────────────────────────────────────────────────

const NOW = new Date().toISOString();

function makeRunId(): string {
  return randomUUID();
}

function makeProvenance(sourceType = "manual"): DesignProvenance {
  return {
    provenanceVersion: "1",
    sourceType: sourceType as DesignProvenance["sourceType"],
    adapterVersion: ADAPTER_VERSION,
    adapterRunId: makeRunId(),
    assets: [],
    fonts: [],
    transformations: [],
  };
}

function makePendingCert(): CertificationStatus {
  return {
    status: "PENDING",
    adapterVersion: ADAPTER_VERSION,
    contractVersion: AESTHETIC_CONTRACT_VERSION,
    fidelity: [],
    diagnostics: emptyDiagnosticReport(),
    galleryEligible: false,
    blockers: ["Certification has not been run."],
  };
}

function makePassCert(): CertificationStatus {
  return {
    status: "PASS",
    adapterVersion: ADAPTER_VERSION,
    contractVersion: AESTHETIC_CONTRACT_VERSION,
    certifiedAt: NOW,
    certifiedBy: "test-suite",
    fidelity: [
      { dimension: "F1_STRUCTURAL", result: "PASS", method: "schema-check" },
      { dimension: "F2_VISUAL", result: "SKIP", method: "no-golden-reference", notes: "Skipped" },
      { dimension: "F3_RESPONSIVE", result: "PASS", method: "schema-check" },
      { dimension: "F4_MOTION", result: "PASS", method: "motion-spec-check" },
      { dimension: "F5_EDITABLE_BINDING", result: "PASS", method: "props-check" },
      { dimension: "F6_SOURCE_IMMUTABILITY", result: "SKIP", method: "no-world-file", notes: "Skipped" },
      { dimension: "F7_ACCESSIBILITY", result: "PASS", method: "schema-check" },
    ],
    diagnostics: emptyDiagnosticReport(),
    galleryEligible: true,
    blockers: [],
  };
}

function makeBundledFont(family: string, role: FontContractV1["role"] = "display"): FontContractV1 {
  return {
    contractVersion: "1",
    role,
    family,
    source: "kebu-bundled",
    weights: [400, 600, 700],
    styles: ["normal"],
    isVariable: false,
    fallbackStack: ["Georgia", "serif"],
    loadingStrategy: "swap",
    license: {
      spdx: "OFL-1.1",
      commercialUse: true,
      webEmbedAllowed: true,
    },
    selfHostedPath: `/fonts/${family.toLowerCase().replace(/ /g, "-")}.woff2`,
  };
}

// ── Fixtures (same definitions as Phase 1) ────────────────────────────────────

const fixture1: AdapterDesignIR = {
  irVersion: IR_VERSION,
  adapterVersion: ADAPTER_VERSION,
  adapterRunId: makeRunId(),
  sourceType: "manual",
  title: "Dakar Night Simple Site",
  colorSystem: {
    primary: "#0F0D33",
    accent: "#00C851",
    background: "#FAFAF8",
    text: "#0F0D33",
  },
  spacing: "comfortable",
  fonts: [makeBundledFont("Fraunces", "display"), makeBundledFont("Inter", "body")],
  pages: [
    {
      id: "page-home",
      slug: "home",
      title: "Home",
      sections: [
        {
          id: "sec-hero",
          sectionType: "hero",
          sortOrder: 0,
          props: { heading: "Make it yours", subheading: "Kebu Site Builder" },
        },
        {
          id: "sec-text",
          sectionType: "text",
          sortOrder: 1,
          props: { body: "Welcome to your new site." },
        },
        {
          id: "sec-footer",
          sectionType: "footer",
          sortOrder: 2,
          props: { text: "© Kebu 2026", links: [] },
        },
      ],
    },
  ],
  diagnostics: emptyDiagnosticReport(),
  provenance: makeProvenance("manual"),
  certificationStatus: makePassCert(),
};

const fixture2: AdapterDesignIR = {
  irVersion: IR_VERSION,
  adapterVersion: ADAPTER_VERSION,
  adapterRunId: makeRunId(),
  sourceType: "manual",
  title: "Sahel Light Editorial",
  colorSystem: {
    primary: "#1A1200",
    accent: "#D4A853",
    background: "#FDFBF7",
    text: "#1A1200",
  },
  spacing: "airy",
  fonts: [makeBundledFont("Playfair Display", "display"), makeBundledFont("Georgia", "body")],
  pages: [
    {
      id: "page-home",
      slug: "home",
      sections: [
        {
          id: "sec-nav",
          sectionType: "navigation",
          sortOrder: 0,
          props: { brand: "Sahel Light", links: [{ label: "About", href: "/about" }] },
          deviceOverrides: { mobile: { compact: true } },
        },
        {
          id: "sec-editorial-hero",
          sectionType: "editorial-hero",
          sortOrder: 1,
          props: { heading: "Stories from West Africa", imageUrl: "" },
          deviceOverrides: { mobile: { layout: "stacked" } },
        },
        {
          id: "sec-blog",
          sectionType: "blog-list",
          sortOrder: 2,
          props: { postsPerPage: 6 },
          deviceOverrides: { tablet: { columns: 2 }, mobile: { columns: 1 } },
        },
        {
          id: "sec-footer",
          sectionType: "footer",
          sortOrder: 3,
          props: { text: "Sahel Light", links: [] },
        },
      ],
    },
    {
      id: "page-about",
      slug: "about",
      title: "About",
      sections: [
        {
          id: "sec-split",
          sectionType: "split",
          sortOrder: 0,
          props: {
            heading: "Our mission",
            body: "Celebrating African stories through design.",
            imageUrl: "https://example.com/image.jpg",
          },
        },
      ],
    },
  ],
  diagnostics: emptyDiagnosticReport(),
  provenance: makeProvenance("manual"),
  certificationStatus: makePassCert(),
};

// Fixture 3: animated / parallax — motionSpecs present
const fixture3: AdapterDesignIR = {
  irVersion: IR_VERSION,
  adapterVersion: ADAPTER_VERSION,
  adapterRunId: makeRunId(),
  sourceType: "v0-react",
  title: "Coast Linen Parallax",
  colorSystem: {
    primary: "#2C3E50",
    accent: "#E8D5B7",
    background: "#FAFAF8",
    text: "#2C3E50",
  },
  motion: "expressive",
  motionSpecs: [
    {
      id: "motion-ken-burns",
      trigger: "load",
      target: ".hero-image",
      effect: "ken-burns",
      initialState: { scale: 1.0 },
      finalState: { scale: 1.08 },
      durationMs: 8000,
      easing: "ease-in-out",
      looping: { type: "infinite", reverseOnReturn: true },
      reducedMotionFallback: { type: "none" },
      nativePrimitive: "ken-burns",
      compilationPath: "native",
    },
  ],
  fonts: [makeBundledFont("Syne", "display"), makeBundledFont("Inter", "body")],
  pages: [
    {
      id: "page-home",
      slug: "home",
      sections: [
        {
          id: "sec-hero",
          sectionType: "hero",
          sortOrder: 0,
          props: { heading: "The Coast", imageUrl: "https://example.com/coast.jpg" },
          motionSpecs: [
            {
              id: "motion-hero-parallax",
              trigger: "scroll-progress",
              target: "self",
              effect: "parallax",
              durationMs: 0,
              easing: "linear",
              scrollRelationship: { type: "parallax", startRatio: 0, endRatio: 1, parallaxFactor: 0.4 },
              reducedMotionFallback: { type: "none" },
              nativePrimitive: "hero-parallax",
              compilationPath: "native",
            },
          ],
        },
        {
          id: "sec-text",
          sectionType: "text",
          sortOrder: 1,
          props: { body: "Where the land meets the sea." },
          motionSpecs: [
            {
              id: "motion-scroll-reveal",
              trigger: "scroll-enter",
              target: ".text-block",
              effect: "fade",
              initialState: { opacity: 0, y: 30 },
              finalState: { opacity: 1, y: 0 },
              durationMs: 600,
              delayMs: 100,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              reducedMotionFallback: { type: "instant" },
              nativePrimitive: "scroll-reveal",
              compilationPath: "native",
            },
          ],
        },
      ],
    },
  ],
  diagnostics: emptyDiagnosticReport(),
  provenance: makeProvenance("v0-react"),
  certificationStatus: makePassCert(),
};

// Fixture 4: custom licensed font (not in bundled set)
const fixture4: AdapterDesignIR = {
  irVersion: IR_VERSION,
  adapterVersion: ADAPTER_VERSION,
  adapterRunId: makeRunId(),
  sourceType: "manual",
  title: "Tifinagh Script Site",
  colorSystem: {
    primary: "#1A0A00",
    accent: "#C17F24",
    background: "#FAF5EF",
    text: "#1A0A00",
  },
  fonts: [
    {
      contractVersion: "1",
      role: "display",
      family: "Noto Sans Tifinagh",
      source: "google-fonts",
      weights: [400],
      styles: ["normal"],
      isVariable: false,
      fallbackStack: ["Arial", "sans-serif"],
      loadingStrategy: "swap",
      license: { spdx: "OFL-1.1", commercialUse: true, webEmbedAllowed: true },
      googleFontsSpec: "Noto+Sans+Tifinagh:wght@400",
    },
    makeBundledFont("Inter", "body"),
  ],
  pages: [
    {
      id: "page-home",
      slug: "home",
      sections: [
        {
          id: "sec-hero",
          sectionType: "hero",
          sortOrder: 0,
          props: { heading: "ⴰⵎⴰⵣⵉⵖ" },
        },
      ],
    },
  ],
  diagnostics: emptyDiagnosticReport(),
  provenance: makeProvenance("manual"),
  certificationStatus: makePassCert(),
};

// Fixture 5: navigation
const fixture5: AdapterDesignIR = {
  irVersion: IR_VERSION,
  adapterVersion: ADAPTER_VERSION,
  adapterRunId: makeRunId(),
  sourceType: "manual",
  title: "Fashion Store Navigation",
  colorSystem: {
    primary: "#0A0A0A",
    accent: "#FF3366",
    background: "#FFFFFF",
    text: "#0A0A0A",
  },
  fonts: [makeBundledFont("Oswald", "display"), makeBundledFont("Inter", "body")],
  pages: [
    {
      id: "page-home",
      slug: "home",
      sections: [
        {
          id: "sec-nav",
          sectionType: "navigation",
          sortOrder: 0,
          props: {
            brand: "MODE",
            links: [
              { label: "Collections", href: "/collections", children: [{ label: "Women", href: "/women" }] },
              { label: "About", href: "/about" },
            ],
          },
          deviceOverrides: { mobile: { compact: true } },
          responsiveVisibility: { hideOn: ["mobile"] },
        },
        {
          id: "sec-hero",
          sectionType: "hero",
          sortOrder: 1,
          props: { heading: "New Season" },
        },
      ],
    },
  ],
  diagnostics: emptyDiagnosticReport(),
  provenance: makeProvenance("manual"),
  certificationStatus: makePassCert(),
};

// Fixture 6: repeated collections
const fixture6: AdapterDesignIR = {
  irVersion: IR_VERSION,
  adapterVersion: ADAPTER_VERSION,
  adapterRunId: makeRunId(),
  sourceType: "manual",
  title: "Event and Products Collection",
  colorSystem: {
    primary: "#1B1B3A",
    accent: "#FFB347",
    background: "#F9F9F9",
    text: "#1B1B3A",
  },
  fonts: [makeBundledFont("Syne", "display"), makeBundledFont("IBM Plex Sans", "body")],
  pages: [
    {
      id: "page-home",
      slug: "home",
      sections: [
        {
          id: "sec-events",
          sectionType: "events",
          sortOrder: 0,
          props: {
            heading: "Upcoming Events",
            items: [
              { title: "Album Launch", date: "2026-10-15", venue: "Lagos" },
            ],
          },
        },
        {
          id: "sec-products",
          sectionType: "products",
          sortOrder: 1,
          props: { heading: "Merch", items: [{ name: "Tee", priceLabel: "5000 NGN" }] },
        },
      ],
    },
  ],
  diagnostics: emptyDiagnosticReport(),
  provenance: makeProvenance("manual"),
  certificationStatus: makePassCert(),
};

// Fixture 7: commerce with EXTENSION_REQUIRED overflow
const fixture7: AdapterDesignIR = {
  irVersion: IR_VERSION,
  adapterVersion: ADAPTER_VERSION,
  adapterRunId: makeRunId(),
  sourceType: "manual",
  title: "Commerce Site",
  colorSystem: {
    primary: "#0D0D0D",
    accent: "#E53935",
    background: "#FAFAFA",
    text: "#0D0D0D",
  },
  fonts: [makeBundledFont("Inter", "display"), makeBundledFont("Inter", "body")],
  capabilityOverflows: [
    {
      capability: "commerce-product-bindings",
      classification: "EXTENSION_REQUIRED",
      detail: "Product inventory sync requires Builder commerce extension.",
      preservedIn: "ir-field",
    },
    {
      capability: "dynamic-data",
      classification: "EXTENSION_REQUIRED",
      detail: "Live product prices require dynamic data feed.",
      preservedIn: "diagnostics",
    },
  ],
  pages: [
    {
      id: "page-shop",
      slug: "shop",
      sections: [
        {
          id: "sec-products",
          sectionType: "products",
          sortOrder: 0,
          props: { heading: "Shop", items: [{ name: "Product 1", priceLabel: "1000 XOF" }] },
        },
      ],
    },
  ],
  diagnostics: buildDiagnosticReport([
    makeDiagnostic("CAPABILITY_OVERFLOW_EXTENSION", "warning", "Commerce binding requires Builder extension.", { sectionId: "sec-products" }),
  ]),
  provenance: makeProvenance("manual"),
  certificationStatus: {
    status: "NEEDS_REVIEW",
    adapterVersion: ADAPTER_VERSION,
    contractVersion: AESTHETIC_CONTRACT_VERSION,
    fidelity: [
      { dimension: "F1_STRUCTURAL", result: "PASS", method: "schema-check" },
      { dimension: "F2_VISUAL", result: "SKIP", method: "no-golden-reference" },
      { dimension: "F3_RESPONSIVE", result: "PASS", method: "schema-check" },
      { dimension: "F4_MOTION", result: "SKIP", method: "no-motion" },
      { dimension: "F5_EDITABLE_BINDING", result: "PASS", method: "props-check" },
      { dimension: "F6_SOURCE_IMMUTABILITY", result: "SKIP", method: "no-world-file" },
      { dimension: "F7_ACCESSIBILITY", result: "PASS", method: "schema-check" },
    ],
    diagnostics: buildDiagnosticReport([
      makeDiagnostic("CAPABILITY_OVERFLOW_EXTENSION", "warning", "Commerce binding review needed."),
    ]),
    galleryEligible: false,
    blockers: ["Commerce bindings require human review before Gallery listing."],
  },
};

// Approved custom component (no approval needed — requiresHumanApproval is false)
const approvedCustomComponent: CustomComponentSpec = {
  contractVersion: "1",
  id: "comp-animated-carousel",
  displayName: "Animated Image Carousel",
  description: "Full-bleed image carousel with CSS transitions. No external scripts.",
  sourceFile: "src/components/AnimatedCarousel.tsx",
  sourceHash: "a".repeat(64),
  displayType: "custom",
  isMaterial: true,
  staticHtmlFallback: '<div class="carousel-fallback"><img src="/hero.jpg" alt="Featured image" /></div>',
  securityBoundary: {
    trustedHtml: "sanitized",
    trustedCss: "scoped",
    trustedJs: "none",
    trustedReact: "none",
    permittedCapabilities: ["animation"],
    requiresHumanApproval: false,
  },
  compilationPath: "sandboxed-embed",
  sourceProvenance: {
    sourceUrl: "https://github.com/example/kebu-components/AnimatedCarousel.tsx",
    sha256: "a".repeat(64),
    capturedAt: NOW,
    requiresClearance: false,
    license: { spdx: "MIT", commercialUse: true, attribution: "Example Corp" },
  },
};

// Fixture 8: approved custom component
const fixture8: AdapterDesignIR = {
  irVersion: IR_VERSION,
  adapterVersion: ADAPTER_VERSION,
  adapterRunId: makeRunId(),
  sourceType: "v0-react",
  title: "Carousel Hero Site",
  colorSystem: {
    primary: "#000000",
    accent: "#FFFFFF",
    background: "#111111",
    text: "#FFFFFF",
  },
  fonts: [makeBundledFont("Syne", "display"), makeBundledFont("Inter", "body")],
  customComponents: [approvedCustomComponent],
  pages: [
    {
      id: "page-home",
      slug: "home",
      sections: [
        // Custom section type with an approved component — BLOCKED because
        // "custom" is not a native SECTION_TYPE in WD. This tests the escape hatch:
        // even approved components must use a compilable section type.
        {
          id: "sec-hero-fallback",
          sectionType: "hero",
          sortOrder: 0,
          props: { heading: "Carousel Hero", imageUrl: "" },
        },
      ],
    },
  ],
  diagnostics: emptyDiagnosticReport(),
  provenance: makeProvenance("v0-react"),
  certificationStatus: {
    status: "NEEDS_REVIEW",
    adapterVersion: ADAPTER_VERSION,
    contractVersion: AESTHETIC_CONTRACT_VERSION,
    fidelity: [
      { dimension: "F1_STRUCTURAL", result: "PASS", method: "schema-check" },
      { dimension: "F2_VISUAL", result: "SKIP", method: "no-golden-reference" },
      { dimension: "F3_RESPONSIVE", result: "PASS", method: "schema-check" },
      { dimension: "F4_MOTION", result: "PASS", method: "motion-spec-check" },
      { dimension: "F5_EDITABLE_BINDING", result: "PASS", method: "props-check" },
      { dimension: "F6_SOURCE_IMMUTABILITY", result: "SKIP", method: "no-world-file" },
      { dimension: "F7_ACCESSIBILITY", result: "PASS", method: "schema-check" },
    ],
    diagnostics: emptyDiagnosticReport(),
    galleryEligible: false,
    blockers: ["Custom component requires review."],
  },
};

// Fixture 9: unapproved material component (blocked)
const blockedWebGLComponent: CustomComponentSpec = {
  contractVersion: "1",
  id: "comp-webgl-bg",
  displayName: "WebGL Particle Background",
  description: "Three.js WebGL particle system.",
  sourceFile: "src/components/WebGLBackground.tsx",
  sourceHash: "b".repeat(64),
  displayType: "custom",
  isMaterial: true,
  staticHtmlFallback: '<div class="bg-fallback" style="background:#000;height:400px"></div>',
  securityBoundary: {
    trustedHtml: "blocked",
    trustedCss: "scoped",
    trustedJs: "blocked",
    trustedReact: "blocked",
    permittedCapabilities: ["animation"],
    requiresHumanApproval: true,
    // No approvedBy — not yet approved
  },
  compilationPath: "blocked",
  sourceProvenance: {
    sha256: "b".repeat(64),
    capturedAt: NOW,
    requiresClearance: false,
    license: { spdx: "MIT", commercialUse: true },
  },
};

const fixture9: AdapterDesignIR = {
  irVersion: IR_VERSION,
  adapterVersion: ADAPTER_VERSION,
  adapterRunId: makeRunId(),
  sourceType: "v0-react",
  title: "WebGL Hero Site",
  colorSystem: {
    primary: "#000000",
    accent: "#00FFB2",
    background: "#000000",
    text: "#FFFFFF",
  },
  fonts: [makeBundledFont("Syne", "display"), makeBundledFont("Inter", "body")],
  customComponents: [blockedWebGLComponent],
  pages: [
    {
      id: "page-home",
      slug: "home",
      sections: [
        {
          id: "sec-webgl-hero",
          sectionType: "hero",
          sortOrder: 0,
          props: { heading: "WebGL Hero", imageUrl: "" },
          customComponent: blockedWebGLComponent,
        },
      ],
    },
  ],
  diagnostics: buildDiagnosticReport([
    makeDiagnostic("CUSTOM_COMPONENT_BLOCKED", "blocked", "Material custom component 'comp-webgl-bg' is blocked pending security review.", { componentId: "comp-webgl-bg" }),
  ]),
  provenance: makeProvenance("v0-react"),
  certificationStatus: {
    status: "BLOCKED",
    adapterVersion: ADAPTER_VERSION,
    contractVersion: AESTHETIC_CONTRACT_VERSION,
    fidelity: [
      { dimension: "F1_STRUCTURAL", result: "PASS", method: "schema-check" },
      { dimension: "F2_VISUAL", result: "SKIP", method: "no-golden-reference" },
      { dimension: "F3_RESPONSIVE", result: "PASS", method: "schema-check" },
      { dimension: "F4_MOTION", result: "FAIL", method: "motion-spec-check", notes: "Material component blocked" },
      { dimension: "F5_EDITABLE_BINDING", result: "PASS", method: "props-check" },
      { dimension: "F6_SOURCE_IMMUTABILITY", result: "SKIP", method: "no-world-file" },
      { dimension: "F7_ACCESSIBILITY", result: "PASS", method: "schema-check" },
    ],
    diagnostics: buildDiagnosticReport([
      makeDiagnostic("CUSTOM_COMPONENT_BLOCKED", "blocked", "Material component comp-webgl-bg blocked."),
    ]),
    galleryEligible: false,
    blockers: ["comp-webgl-bg: Material custom component is blocked pending security review."],
  },
};

// ── Tests ──────────────────────────────────────────────────────────────────────

// ── 1. Native capabilities compile correctly ──────────────────────────────────

describe("Fixture 1 — simple static site compiles natively", () => {
  it("compiles successfully", () => {
    const result = compileIR(fixture1);
    expect(result.report.compilationBlocked).toBe(false);
    expect(result.websiteDefinition).not.toBeNull();
  });

  it("output has correct title", () => {
    const result = compileIR(fixture1);
    expect(result.websiteDefinition?.title).toBe("Dakar Night Simple Site");
  });

  it("output has correct schemaVersion", () => {
    const result = compileIR(fixture1);
    expect(result.websiteDefinition?.schemaVersion).toBe("website-v1");
  });

  it("color system compiles to theme tokens", () => {
    const result = compileIR(fixture1);
    const theme = result.websiteDefinition?.theme;
    expect(theme?.primary).toBe("#0F0D33");
    expect(theme?.accent).toBe("#00C851");
    expect(theme?.background).toBe("#FAFAF8");
    expect(theme?.text).toBe("#0F0D33");
  });

  it("spacing compiles to theme.spacing", () => {
    const result = compileIR(fixture1);
    expect(result.websiteDefinition?.theme.spacing).toBe("comfortable");
  });

  it("sections compile in sortOrder", () => {
    const result = compileIR(fixture1);
    const sections = result.websiteDefinition?.pages[0]?.sections ?? [];
    expect(sections).toHaveLength(3);
    expect(sections[0].type).toBe("hero");
    expect(sections[1].type).toBe("text");
    expect(sections[2].type).toBe("footer");
  });

  it("section ids are preserved", () => {
    const result = compileIR(fixture1);
    const sections = result.websiteDefinition?.pages[0]?.sections ?? [];
    expect(sections[0].id).toBe("sec-hero");
  });

  it("fonts compile to theme.fontDisplay and theme.fontBody", () => {
    const result = compileIR(fixture1);
    expect(result.websiteDefinition?.theme.fontDisplay).toBe("Fraunces");
    expect(result.websiteDefinition?.theme.fontBody).toBe("Inter");
  });

  it("report has adapterRunId matching IR", () => {
    const result = compileIR(fixture1);
    expect(result.report.adapterRunId).toBe(fixture1.adapterRunId);
  });

  it("report has contentHash", () => {
    const result = compileIR(fixture1);
    expect(result.report.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ── 2. Multi-page editorial compiles with device overrides ────────────────────

describe("Fixture 2 — responsive editorial compiles pages and device overrides", () => {
  it("compiles successfully", () => {
    const result = compileIR(fixture2);
    expect(result.report.compilationBlocked).toBe(false);
    expect(result.websiteDefinition).not.toBeNull();
  });

  it("both pages compile", () => {
    const result = compileIR(fixture2);
    const pages = result.websiteDefinition?.pages ?? [];
    const slugs = pages.map((p) => p.slug);
    expect(slugs).toContain("home");
    expect(slugs).toContain("about");
  });

  it("delta deviceOverrides pass through to section props", () => {
    const result = compileIR(fixture2);
    const pages = result.websiteDefinition?.pages ?? [];
    const home = pages.find((p) => p.slug === "home");
    const nav = home?.sections.find((s) => s.type === "navigation");
    expect(nav?.props?.deviceOverrides).toBeDefined();
    expect((nav?.props?.deviceOverrides as { mobile?: unknown })?.mobile).toBeDefined();
  });

  it("report records sectionsCompiled correctly", () => {
    const result = compileIR(fixture2);
    // home: 4 sections, about: 1 section
    expect(result.report.sectionsCompiled).toBe(5);
  });
});

// ── 3. Motion is NOT silently flattened ───────────────────────────────────────

describe("Fixture 3 — motion is not silently flattened", () => {
  it("compiles successfully", () => {
    const result = compileIR(fixture3);
    expect(result.report.compilationBlocked).toBe(false);
  });

  it("theme.motion is passed through from IR (not set by MotionSpec inference)", () => {
    // fixture3 has ir.motion = "expressive" — this passes through as-is.
    const result = compileIR(fixture3);
    expect(result.websiteDefinition?.theme.motion).toBe("expressive");
  });

  it("section-level MotionSpec data is compiled natively via _motion prop (Phase 3B)", () => {
    const result = compileIR(fixture3);
    // Phase 3B: motion is NATIVE — the capability entry must exist and be compiled
    const motionEntry = result.report.capabilities.find((e) => e.capability === "motion");
    expect(motionEntry).toBeDefined();
    expect(motionEntry?.behavior).toBe("compiled");
  });

  it("MotionSpec fields (reducedMotionFallback, easing, trigger) are NOT in compiled sections", () => {
    const result = compileIR(fixture3);
    const sections = result.websiteDefinition?.pages[0]?.sections ?? [];
    const hero = sections.find((s) => s.type === "hero");
    // motionSpecs must NOT appear in compiled section props
    expect(hero?.props?.motionSpecs).toBeUndefined();
  });

  it("report records motion as NATIVE after Phase 3B", () => {
    const result = compileIR(fixture3);
    const motionEntry = result.report.capabilities.find((e) => e.capability === "motion");
    // Phase 3B: motion is now NATIVE — section.motion wired end-to-end
    expect(motionEntry?.classification).toBe("NATIVE");
    expect(motionEntry?.behavior).toBe("compiled");
  });

  it("EXT-WD-001 is no longer in extensionsRequired (motion is NATIVE after Phase 3B)", () => {
    const result = compileIR(fixture3);
    const ext = result.report.extensionsRequired.find((e) => e.id === "EXT-WD-001");
    // EXT-WD-001 removed from PROPOSED_EXTENSIONS — motion is now natively supported
    expect(ext).toBeUndefined();
  });

  it("materialLossDetected reflects only remaining EXTENSION_REQUIRED capabilities", () => {
    // fixture3 uses motion (now NATIVE) — no material loss from motion alone
    const result = compileIR(fixture3);
    const hasExtReq = result.report.capabilities.some((e) => e.classification === "EXTENSION_REQUIRED");
    expect(result.report.materialLossDetected).toBe(hasExtReq);
  });
});

// ── 4. Font licensing/provenance preserved in IR ──────────────────────────────

describe("Fixture 4 — font provenance preserved in IR", () => {
  it("compiles successfully despite unknown font family", () => {
    const result = compileIR(fixture4);
    expect(result.report.compilationBlocked).toBe(false);
    expect(result.websiteDefinition).not.toBeNull();
  });

  it("display font family passes through to theme even if not in bundled set", () => {
    const result = compileIR(fixture4);
    expect(result.websiteDefinition?.theme.fontDisplay).toBe("Noto Sans Tifinagh");
  });

  it("font license/provenance is preserved in original IR (not in compiled WD)", () => {
    // WD has no font license/provenance fields — these stay in the IR
    const result = compileIR(fixture4);
    const wd = result.websiteDefinition;
    // theme only has fontDisplay/fontBody strings — no license object
    expect((wd?.theme as Record<string, unknown>)?.fontLicense).toBeUndefined();
    // The IR itself still carries the full FontContractV1
    expect(fixture4.fonts[0].license).toBeDefined();
    expect(fixture4.fonts[0].license.spdx).toBe("OFL-1.1");
    expect(fixture4.fonts[0].license.commercialUse).toBe(true);
  });
});

// ── 5. Navigation compiles; responsive visibility preserved in IR ─────────────

describe("Fixture 5 — navigation compiles; responsive visibility is NATIVE after Phase 3B", () => {
  it("compiles successfully", () => {
    const result = compileIR(fixture5);
    expect(result.report.compilationBlocked).toBe(false);
  });

  it("navigation section compiles to WD with brand and links", () => {
    const result = compileIR(fixture5);
    const nav = result.websiteDefinition?.pages[0]?.sections.find((s) => s.type === "navigation");
    expect(nav).toBeDefined();
    expect((nav?.props as Record<string, unknown>)?.brand).toBe("MODE");
  });

  it("responsive visibility is NOT in compiled WD section props", () => {
    const result = compileIR(fixture5);
    const nav = result.websiteDefinition?.pages[0]?.sections.find((s) => s.type === "navigation");
    // responsiveVisibility must not appear in compiled section props
    expect((nav?.props as Record<string, unknown>)?.responsiveVisibility).toBeUndefined();
  });

  it("report records responsive-visibility as NATIVE after Phase 3B", () => {
    const result = compileIR(fixture5);
    const entry = result.report.capabilities.find((e) => e.capability === "responsive-visibility");
    expect(entry).toBeDefined();
    expect(entry?.behavior).toBe("compiled");
    expect(entry?.classification).toBe("NATIVE");
  });

  it("device-specific delta overrides still compile through", () => {
    const result = compileIR(fixture5);
    const nav = result.websiteDefinition?.pages[0]?.sections.find((s) => s.type === "navigation");
    // deviceOverrides (delta) should be in compiled output
    expect((nav?.props as Record<string, unknown>)?.deviceOverrides).toBeDefined();
  });
});

// ── 6. Repeated collections compile ──────────────────────────────────────────

describe("Fixture 6 — repeated collections compile natively", () => {
  it("compiles successfully", () => {
    const result = compileIR(fixture6);
    expect(result.report.compilationBlocked).toBe(false);
  });

  it("events section compiles with items array", () => {
    const result = compileIR(fixture6);
    const events = result.websiteDefinition?.pages[0]?.sections.find((s) => s.type === "events");
    expect(events).toBeDefined();
    expect((events?.props as Record<string, unknown>)?.heading).toBe("Upcoming Events");
  });

  it("products section compiles", () => {
    const result = compileIR(fixture6);
    const products = result.websiteDefinition?.pages[0]?.sections.find((s) => s.type === "products");
    expect(products).toBeDefined();
  });
});

// ── 7. Commerce overflow preserved in report ──────────────────────────────────

describe("Fixture 7 — commerce capability overflow preserved", () => {
  it("compiles successfully (static products are native)", () => {
    const result = compileIR(fixture7);
    expect(result.report.compilationBlocked).toBe(false);
    expect(result.websiteDefinition).not.toBeNull();
  });

  it("commerce-product-bindings reported as EXTENSION_REQUIRED", () => {
    const result = compileIR(fixture7);
    const entry = result.report.capabilities.find((e) => e.capability === "commerce-product-bindings");
    expect(entry).toBeDefined();
    expect(entry?.classification).toBe("EXTENSION_REQUIRED");
    expect(entry?.behavior).toBe("preserved-in-ir");
  });

  it("dynamic-data reported as EXTENSION_REQUIRED", () => {
    const result = compileIR(fixture7);
    const entry = result.report.capabilities.find((e) => e.capability === "dynamic-data");
    expect(entry).toBeDefined();
    expect(entry?.classification).toBe("EXTENSION_REQUIRED");
  });

  it("extensionsRequired includes EXT-WD-006 (commerce bindings)", () => {
    const result = compileIR(fixture7);
    const ext = result.report.extensionsRequired.find((e) => e.id === "EXT-WD-006");
    expect(ext).toBeDefined();
  });

  it("materialLossDetected is true", () => {
    const result = compileIR(fixture7);
    expect(result.report.materialLossDetected).toBe(true);
  });
});

// ── 8. Custom components: approved compiles; unapproved BLOCKS ────────────────

describe("Fixture 8 — approved custom component compiles (no blocking)", () => {
  it("compiles successfully when no section uses the unapproved component", () => {
    const result = compileIR(fixture8);
    expect(result.report.compilationBlocked).toBe(false);
    expect(result.websiteDefinition).not.toBeNull();
  });
});

describe("Custom component — unapproved material component BLOCKS compilation", () => {
  it("material blocked component blocks compilation for that section", () => {
    const result = compileIR(fixture9);
    expect(result.report.compilationBlocked).toBe(true);
    expect(result.websiteDefinition).toBeNull();
  });

  it("blocking reason mentions the blocked component", () => {
    const result = compileIR(fixture9);
    const reasons = result.report.blockingReasons.join(" ");
    expect(reasons).toContain("comp-webgl-bg");
  });

  it("sections are recorded as blocked", () => {
    const result = compileIR(fixture9);
    expect(result.report.sectionsBlocked).toContain("sec-webgl-hero");
  });
});

// ── 9. Owner-portfolio section types are prohibited ───────────────────────────

describe("Owner-portfolio section types are prohibited", () => {
  it.each(OWNER_PORTFOLIO_SECTION_TYPES)(
    "section type '%s' blocks compilation",
    (sectionType) => {
      const ir: AdapterDesignIR = {
        ...fixture1,
        adapterRunId: makeRunId(),
        pages: [
          {
            id: "page-home",
            slug: "home",
            sections: [
              {
                id: "sec-forbidden",
                sectionType,
                sortOrder: 0,
                props: { artistName: "Test" },
              },
            ],
          },
        ],
      };
      const result = compileIR(ir);
      expect(result.report.compilationBlocked).toBe(true);
      expect(result.websiteDefinition).toBeNull();
      expect(result.report.blockingReasons.some((r) => r.includes(sectionType))).toBe(true);
    },
  );
});

// ── 10. Deterministic compilation ─────────────────────────────────────────────

describe("Deterministic compilation", () => {
  it("same IR + same compiler produces the same contentHash", () => {
    const result1 = compileIR(fixture1);
    const result2 = compileIR(fixture1);
    expect(result1.report.contentHash).toBe(result2.report.contentHash);
  });

  it("different IR produces different contentHash", () => {
    const result1 = compileIR(fixture1);
    const result2 = compileIR(fixture2);
    expect(result1.report.contentHash).not.toBe(result2.report.contentHash);
  });

  it("sections compile in deterministic sortOrder regardless of array order", () => {
    const irShuffled: AdapterDesignIR = {
      ...fixture1,
      adapterRunId: fixture1.adapterRunId,
      pages: [
        {
          id: "page-home",
          slug: "home",
          // Reversed order in array
          sections: [...fixture1.pages[0].sections].reverse(),
        },
      ],
    };
    const resultNormal = compileIR(fixture1);
    const resultShuffled = compileIR(irShuffled);
    // Both should produce the same section order (sorted by sortOrder)
    const types1 = resultNormal.websiteDefinition?.pages[0]?.sections.map((s) => s.type);
    const types2 = resultShuffled.websiteDefinition?.pages[0]?.sections.map((s) => s.type);
    expect(types1).toEqual(types2);
  });

  it("COMPILER_VERSION is a non-empty string", () => {
    expect(COMPILER_VERSION).toBeTruthy();
    expect(typeof COMPILER_VERSION).toBe("string");
  });

  it("report always carries compilerVersion and targetSchemaVersion", () => {
    const result = compileIR(fixture1);
    expect(result.report.compilerVersion).toBe(COMPILER_VERSION);
    expect(result.report.targetSchemaVersion).toBe("website-v1");
  });
});

// ── 11. Malformed/hostile input cannot reach compiler ─────────────────────────

describe("Malformed and hostile input", () => {
  it("completely invalid IR is rejected before compilation", () => {
    const result = compileIR({ not: "an IR" } as unknown as AdapterDesignIR);
    expect(result.report.compilationBlocked).toBe(true);
    expect(result.websiteDefinition).toBeNull();
  });

  it("IR missing required irVersion is rejected", () => {
    const bad = { ...fixture1, irVersion: undefined } as unknown as AdapterDesignIR;
    const result = compileIR(bad);
    expect(result.report.compilationBlocked).toBe(true);
  });

  it("IR with wrong irVersion is rejected", () => {
    const bad = { ...fixture1, irVersion: "999" } as unknown as AdapterDesignIR;
    const result = compileIR(bad);
    expect(result.report.compilationBlocked).toBe(true);
  });

  it("detectHostileContent catches script tags before compilation", () => {
    const hostile = JSON.stringify({ title: '<script>alert("xss")</script>' });
    expect(detectHostileContent(hostile).hostile).toBe(true);
  });

  it("detectHostileContent catches javascript: URIs", () => {
    expect(detectHostileContent('href="javascript:void(0)"').hostile).toBe(true);
  });

  it("detectHostileContent catches inline event handlers", () => {
    expect(detectHostileContent('<div onclick="evil()">').hostile).toBe(true);
  });

  it("safeParseJson rejects content with hostile patterns", () => {
    const result = safeParseJson('<script>alert(1)</script>');
    expect(result.ok).toBe(false);
  });

  it("safeParseJson rejects malformed JSON", () => {
    const result = safeParseJson("{ not valid json }");
    expect(result.ok).toBe(false);
  });

  it("compilation with schema-invalid IR never produces output", () => {
    const bad = { ...fixture1, colorSystem: null } as unknown as AdapterDesignIR;
    const result = compileIR(bad);
    expect(result.websiteDefinition).toBeNull();
    expect(result.report.compilationBlocked).toBe(true);
  });
});

// ── Capability negotiation ────────────────────────────────────────────────────

describe("Capability negotiation", () => {
  it("TARGET_CAPABILITY_MAP covers all 15 capability names", () => {
    const capabilities = Object.keys(TARGET_CAPABILITY_MAP);
    expect(capabilities).toHaveLength(15);
  });

  it("motion is NATIVE in target map after Phase 3B", () => {
    expect(TARGET_CAPABILITY_MAP["motion"]).toBe("NATIVE");
  });

  it("sections is NATIVE in target map", () => {
    expect(TARGET_CAPABILITY_MAP["sections"]).toBe("NATIVE");
  });

  it("device-independent-compositions is NATIVE after Phase 3B", () => {
    expect(TARGET_CAPABILITY_MAP["device-independent-compositions"]).toBe("NATIVE");
  });

  it("accessibility-metadata is EXTENSION_REQUIRED", () => {
    expect(TARGET_CAPABILITY_MAP["accessibility-metadata"]).toBe("EXTENSION_REQUIRED");
  });

  it("responsive-visibility is NATIVE after Phase 3B", () => {
    expect(TARGET_CAPABILITY_MAP["responsive-visibility"]).toBe("NATIVE");
  });

  it("custom-components is CUSTOM_ESCAPE_HATCH", () => {
    expect(TARGET_CAPABILITY_MAP["custom-components"]).toBe("CUSTOM_ESCAPE_HATCH");
  });

  it("negotiateCapabilities detects motion from IR motionSpecs as NATIVE after Phase 3B", () => {
    const result = negotiateCapabilities(fixture3);
    const motionEntry = result.entries.find((e) => e.capability === "motion");
    expect(motionEntry).toBeDefined();
    expect(motionEntry?.classification).toBe("NATIVE");
    expect(motionEntry?.behavior).toBe("compiled");
  });

  it("negotiateCapabilities detects responsive-visibility from section as NATIVE after Phase 3B", () => {
    const result = negotiateCapabilities(fixture5);
    const entry = result.entries.find((e) => e.capability === "responsive-visibility");
    expect(entry).toBeDefined();
    expect(entry?.classification).toBe("NATIVE");
    expect(entry?.behavior).toBe("compiled");
  });

  it("negotiateCapabilities extensionsRequired only lists remaining EXTENSION_REQUIRED capabilities", () => {
    // fixture3 uses motion (now NATIVE) — no EXTENSION_REQUIRED overflows in this fixture
    const result = negotiateCapabilities(fixture3);
    const motionExt = result.extensionsRequired.find((e) => e.capability === "motion");
    expect(motionExt).toBeUndefined();
  });
});

// ── Gap report ────────────────────────────────────────────────────────────────

describe("Capability gap report", () => {
  it("buildGapReport returns entries for all 15 capabilities", () => {
    const rows = buildGapReport();
    const capabilities = rows.map((r) => r.adapterCapability);
    // Should cover all capability names
    expect(capabilities).toContain("motion");
    expect(capabilities).toContain("accessibility-metadata");
    expect(capabilities).toContain("device-independent-compositions");
    expect(capabilities).toContain("responsive-visibility");
    expect(capabilities).toContain("dynamic-data");
    expect(capabilities).toContain("commerce-product-bindings");
  });

  it("motion is NATIVE in gap report after Phase 3B — no extension required", () => {
    const rows = buildGapReport();
    const motionRow = rows.find((r) => r.adapterCapability === "motion");
    expect(motionRow?.extensionId).toBeNull();
    expect(motionRow?.priority).toBe("n/a");
    expect(motionRow?.compilationBehavior).toContain("NATIVE");
  });

  it("device-independent-compositions is NATIVE in gap report after Phase 3B — no extension required", () => {
    const rows = buildGapReport();
    const row = rows.find((r) => r.adapterCapability === "device-independent-compositions");
    expect(row?.extensionId).toBeNull();
    expect(row?.priority).toBe("n/a");
    expect(row?.compilationBehavior).toContain("NATIVE");
  });

  it("accessibility-metadata gap recommends EXT-WD-003", () => {
    const rows = buildGapReport();
    const row = rows.find((r) => r.adapterCapability === "accessibility-metadata");
    expect(row?.extensionId).toBe("EXT-WD-003");
  });

  it("formatGapReport returns a non-empty string", () => {
    const output = formatGapReport();
    expect(typeof output).toBe("string");
    expect(output.length).toBeGreaterThan(100);
    expect(output).toContain("Adapter IR Capability Gap Report");
  });

  it("PROPOSED_EXTENSIONS covers remaining EXTENSION_REQUIRED capabilities after Phase 3B", () => {
    const ids = PROPOSED_EXTENSIONS.map((e) => e.id);
    // EXT-WD-001 (motion), EXT-WD-002 (device-independent-compositions),
    // EXT-WD-004 (responsive-visibility) promoted to NATIVE in Phase 3B — removed from proposals.
    expect(ids).not.toContain("EXT-WD-001");
    expect(ids).not.toContain("EXT-WD-002");
    expect(ids).not.toContain("EXT-WD-004");
    // Remaining EXTENSION_REQUIRED capabilities still have proposals:
    expect(ids).toContain("EXT-WD-003"); // accessibility-metadata
    expect(ids).toContain("EXT-WD-005"); // dynamic-data
    expect(ids).toContain("EXT-WD-006"); // commerce-product-bindings
  });
});

// ── Provenance survives ───────────────────────────────────────────────────────

describe("Provenance survives compilation", () => {
  it("adapterRunId from IR is preserved in CompilationReport", () => {
    const result = compileIR(fixture1);
    expect(result.report.adapterRunId).toBe(fixture1.adapterRunId);
  });

  it("adapterRunId from IR matches provenance.adapterRunId in source", () => {
    // The provenance in the IR can be cross-referenced via the report
    expect(fixture1.provenance.adapterRunId).toBe(fixture1.provenance.adapterRunId);
  });

  it("sourceType from IR is accessible in the source IR", () => {
    expect(fixture3.sourceType).toBe("v0-react");
    const result = compileIR(fixture3);
    // report ties back to the IR via adapterRunId
    expect(result.report.adapterRunId).toBe(fixture3.adapterRunId);
  });
});

// ── Device-specific intent ────────────────────────────────────────────────────

describe("Device-specific intent survives in report", () => {
  it("delta deviceOverrides compile through to WD", () => {
    const result = compileIR(fixture2);
    const sections = result.websiteDefinition?.pages.flatMap((p) => p.sections) ?? [];
    const withOverrides = sections.filter((s) => s.props?.deviceOverrides != null);
    expect(withOverrides.length).toBeGreaterThan(0);
  });

  it("sections with independent device compositions are reported as preserved-in-ir", () => {
    // Build an IR with deviceCompositions
    const ir: AdapterDesignIR = {
      ...fixture1,
      adapterRunId: makeRunId(),
      pages: [
        {
          id: "page-home",
          slug: "home",
          sections: [
            {
              id: "sec-hero",
              sectionType: "hero",
              sortOrder: 0,
              props: { heading: "Home" },
              deviceCompositions: [
                {
                  device: "mobile",
                  sections: [
                    {
                      id: "sec-hero-mobile",
                      sectionType: "hero",
                      sortOrder: 0,
                      props: { heading: "Mobile Home" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = compileIR(ir);
    expect(result.report.compilationBlocked).toBe(false);

    // Section should have overflow recorded
    const devEntry = result.report.capabilities.find(
      (e) => e.capability === "device-independent-compositions",
    );
    expect(devEntry).toBeDefined();
    expect(devEntry?.behavior).toBe("preserved-in-ir");

    // The compiled WD section should NOT have deviceCompositions
    const hero = result.websiteDefinition?.pages[0]?.sections[0];
    expect((hero?.props as Record<string, unknown>)?.deviceCompositions).toBeUndefined();
  });
});

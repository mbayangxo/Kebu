/**
 * Aesthetic Adapter Phase 1 — contract and IR tests.
 *
 * 10 fixtures covering the full breadth of the contract layer:
 *   1. simple-static         — hero + text + footer, bundled fonts, no motion
 *   2. responsive-editorial  — multi-page, device overrides, navigation
 *   3. animated-parallax     — MotionSpec with reducedMotionFallback, ken-burns
 *   4. custom-licensed-font  — self-hosted font outside bundled list
 *   5. navigation            — mega-nav, dropdown, responsive visibility
 *   6. collection-content    — products, events, testimonials (repeated content)
 *   7. commerce-bound        — commerce capability declaration and overflow
 *   8. custom-component      — React component with security boundary
 *   9. unsupported-material  — WebGL animation: BLOCKED, certification MUST NOT be PASS
 *  10. malformed-hostile      — invalid/hostile input: all validators must reject
 */

import { describe, it, expect } from "vitest";
import { randomUUID } from "crypto";

import {
  // Validators
  validateMotionSpec,
  validateMotionContractV1,
  validateFontContractV1,
  validateAssetSpec,
  validateCustomComponentSpec,
  validateIRSection,
  validateAdapterDesignIR,
  validateAestheticContractV1,
  detectHostileContent,
  safeParseJson,
  // Builders
  buildDiagnosticReport,
  emptyDiagnosticReport,
  makeDiagnostic,
  pendingCertification,
  allFidelityPass,
  failedFidelity,
  isMaterialAndBlocked,
  isOwnerPortfolioType,
  isKebuBundledFont,
  // Constants
  ADAPTER_VERSION,
  AESTHETIC_CONTRACT_VERSION,
  IR_VERSION,
  OWNER_PORTFOLIO_SECTION_TYPES,
  KEBU_BUNDLED_FONTS,
  // Types (used for construction only)
  type AdapterDesignIR,
  type AestheticContractV1,
  type MotionSpec,
  type FontContractV1,
  type AssetSpec,
  type CustomComponentSpec,
  type DesignProvenance,
  type CertificationStatus,
  type DiagnosticEntry,
} from "@/lib/adapter/index";

// ── Test fixtures ─────────────────────────────────────────────────────────────

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
      { dimension: "F2_VISUAL", result: "SKIP", method: "no-golden-reference", notes: "Skipped in unit tests" },
      { dimension: "F3_RESPONSIVE", result: "PASS", method: "schema-check" },
      { dimension: "F4_MOTION", result: "PASS", method: "motion-spec-check" },
      { dimension: "F5_EDITABLE_BINDING", result: "PASS", method: "props-check" },
      { dimension: "F6_SOURCE_IMMUTABILITY", result: "SKIP", method: "no-world-file", notes: "Skipped in unit tests" },
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

// ── Fixture 1: Simple static site ─────────────────────────────────────────────

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
          props: {
            heading: "Make it yours",
            subheading: "Kebu Site Builder",
            ctaLabel: "Get started",
            ctaHref: "/create",
          },
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
          props: { brand: "Kebu", links: [] },
        },
      ],
    },
  ],
  diagnostics: emptyDiagnosticReport(),
  provenance: makeProvenance("manual"),
  certificationStatus: makePassCert(),
};

// ── Fixture 2: Responsive editorial site ──────────────────────────────────────

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
          deviceOverrides: {
            mobile: { compact: true },
          },
        },
        {
          id: "sec-editorial-hero",
          sectionType: "editorial-hero",
          sortOrder: 1,
          props: { heading: "Stories from West Africa", layout: "left" },
          deviceOverrides: {
            mobile: { layout: "stacked" },
          },
          responsiveVisibility: undefined,
        },
        {
          id: "sec-blog",
          sectionType: "blog-list",
          sortOrder: 2,
          props: { columns: 3 },
          deviceOverrides: {
            tablet: { columns: 2 },
            mobile: { columns: 1 },
          },
        },
        {
          id: "sec-footer",
          sectionType: "footer",
          sortOrder: 3,
          props: { brand: "Sahel Light", links: [] },
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

// ── Fixture 3: Animated / parallax site ───────────────────────────────────────

const heroParallaxSpec: MotionSpec = {
  id: "motion-hero-parallax",
  trigger: "scroll-progress",
  target: "self",
  effect: "parallax",
  durationMs: 0,
  easing: "linear",
  scrollRelationship: {
    type: "parallax",
    startRatio: 0,
    endRatio: 1,
    parallaxFactor: 0.4,
  },
  reducedMotionFallback: { type: "none" },
  nativePrimitive: "hero-parallax",
  compilationPath: "native",
  fidelityNote: undefined,
};

const scrollRevealSpec: MotionSpec = {
  id: "motion-scroll-reveal-text",
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
};

const kenBurnsSpec: MotionSpec = {
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
};

const fixture3: AdapterDesignIR = {
  irVersion: IR_VERSION,
  adapterVersion: ADAPTER_VERSION,
  adapterRunId: makeRunId(),
  sourceType: "v0-react",
  sourceRef: "https://v0.dev/t/example-parallax",
  title: "Coast Linen Parallax",
  colorSystem: {
    primary: "#2C3E50",
    accent: "#E8D5B7",
    background: "#FAFAF8",
    text: "#2C3E50",
  },
  motion: "expressive",
  motionSpecs: [kenBurnsSpec],
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
          motionSpecs: [heroParallaxSpec, kenBurnsSpec],
        },
        {
          id: "sec-text",
          sectionType: "text",
          sortOrder: 1,
          props: { body: "Where the land meets the sea." },
          motionSpecs: [scrollRevealSpec],
        },
      ],
    },
  ],
  diagnostics: emptyDiagnosticReport(),
  provenance: makeProvenance("v0-react"),
  certificationStatus: makePassCert(),
};

// ── Fixture 4: Custom licensed font ──────────────────────────────────────────

const customFont: FontContractV1 = {
  contractVersion: "1",
  role: "display",
  family: "Noto Sans Tifinagh",
  source: "google-fonts",
  weights: [400],
  styles: ["normal"],
  isVariable: false,
  fallbackStack: ["Arial", "sans-serif"],
  loadingStrategy: "swap",
  license: {
    spdx: "OFL-1.1",
    commercialUse: true,
    webEmbedAllowed: true,
    notes: "OFL font — free for commercial web use.",
  },
  googleFontsSpec: "Noto+Sans+Tifinagh:wght@400",
};

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
  fonts: [customFont, makeBundledFont("Inter", "body")],
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

// ── Fixture 5: Navigation ─────────────────────────────────────────────────────

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
              {
                label: "Collections",
                href: "/collections",
                children: [
                  { label: "Women", href: "/collections/women" },
                  { label: "Men", href: "/collections/men" },
                  { label: "Accessories", href: "/collections/accessories" },
                ],
              },
              { label: "About", href: "/about" },
              { label: "Contact", href: "/contact" },
            ],
          },
          deviceOverrides: {
            mobile: { compact: true, hamburger: true },
          },
          responsiveVisibility: undefined,
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

// ── Fixture 6: Collection / repeated content ──────────────────────────────────

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
              { title: "Live Session", date: "2026-11-02", venue: "Abuja" },
            ],
          },
          deviceOverrides: { mobile: { columns: 1 } },
        },
        {
          id: "sec-testimonials",
          sectionType: "testimonials",
          sortOrder: 1,
          props: {
            items: [
              { quote: "Exceptional design.", author: "Amira K." },
              { quote: "Beautiful and functional.", author: "Kofi A." },
            ],
          },
        },
        {
          id: "sec-products",
          sectionType: "products",
          sortOrder: 2,
          props: {
            heading: "Merch",
            items: [
              { id: "p1", name: "Tee", price: 5000, currency: "NGN" },
            ],
          },
        },
      ],
    },
  ],
  diagnostics: emptyDiagnosticReport(),
  provenance: makeProvenance("manual"),
  certificationStatus: makePassCert(),
};

// ── Fixture 7: Commerce-bound section ─────────────────────────────────────────

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
  pages: [
    {
      id: "page-shop",
      slug: "shop",
      sections: [
        {
          id: "sec-products",
          sectionType: "products",
          sortOrder: 0,
          props: { heading: "Shop", currency: "XOF" },
          capabilityOverflows: [
            {
              capability: "commerce-product-bindings",
              classification: "EXTENSION_REQUIRED",
              detail: "Product inventory sync requires Builder commerce extension.",
              preservedIn: "ir-field",
            },
          ],
        },
      ],
    },
  ],
  capabilityOverflows: [
    {
      capability: "dynamic-data",
      classification: "EXTENSION_REQUIRED",
      detail: "Live product prices require dynamic data feed.",
      preservedIn: "diagnostics",
    },
  ],
  diagnostics: buildDiagnosticReport([
    makeDiagnostic(
      "CAPABILITY_OVERFLOW_EXTENSION",
      "warning",
      "Commerce binding requires Builder extension.",
      { sectionId: "sec-products" },
    ),
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

// ── Fixture 8: Custom component ───────────────────────────────────────────────

const customComponent: CustomComponentSpec = {
  contractVersion: "1",
  id: "comp-animated-carousel",
  displayName: "Animated Image Carousel",
  description: "Full-bleed image carousel with CSS transitions. No external scripts.",
  sourceFile: "src/components/AnimatedCarousel.tsx",
  sourceHash: "a".repeat(64),
  displayType: "custom",
  isMaterial: true,
  staticHtmlFallback:
    '<div class="carousel-fallback"><img src="/hero.jpg" alt="Featured image" /></div>',
  motionSpecs: [
    {
      id: "motion-carousel-slide",
      trigger: "click",
      target: ".carousel-track",
      effect: "slide",
      initialState: { x: 0 },
      finalState: { x: -100 },
      durationMs: 400,
      easing: "ease-in-out",
      reducedMotionFallback: { type: "instant" },
      compilationPath: "custom-component",
      fidelityNote: "Slide transition preserved in custom component.",
    },
  ],
  securityBoundary: {
    trustedHtml: "sanitized",
    trustedCss: "scoped",
    trustedJs: "none",
    trustedReact: "none",
    permittedCapabilities: ["animation", "read-dom"],
    requiresHumanApproval: false,
  },
  compilationPath: "sandboxed-embed",
  fidelityNote: "Compiled as sandboxed component; full interactivity preserved.",
  sourceProvenance: {
    sourceUrl: "https://github.com/example/kebu-components/AnimatedCarousel.tsx",
    sha256: "a".repeat(64),
    capturedAt: NOW,
    requiresClearance: false,
    license: {
      spdx: "MIT",
      commercialUse: true,
      attribution: "Example Corp",
    },
  },
};

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
  customComponents: [customComponent],
  pages: [
    {
      id: "page-home",
      slug: "home",
      sections: [
        {
          id: "sec-carousel",
          sectionType: "custom",
          sortOrder: 0,
          props: { images: ["/img1.jpg", "/img2.jpg"] },
          customComponent,
        },
      ],
    },
  ],
  diagnostics: buildDiagnosticReport([
    makeDiagnostic(
      "MOTION_CUSTOM_COMPONENT",
      "info",
      "Carousel motion preserved in custom component.",
      { componentId: "comp-animated-carousel" },
    ),
  ]),
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
    blockers: ["Custom component 'comp-animated-carousel' requires human review before Gallery listing."],
  },
};

// ── Fixture 9: Unsupported material behavior (WebGL) ──────────────────────────

const blockedWebGLComponent: CustomComponentSpec = {
  contractVersion: "1",
  id: "comp-webgl-bg",
  displayName: "WebGL Particle Background",
  description: "Three.js WebGL particle system. Requires browser WebGL support.",
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
  fidelityNote:
    "WebGL canvas animation cannot be compiled to native Kebu primitives. " +
    "Requires human approval for sandboxed deployment.",
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
          sectionType: "custom",
          sortOrder: 0,
          props: { particleCount: 500 },
          customComponent: blockedWebGLComponent,
        },
      ],
    },
  ],
  // Diagnostics record the blocked material component
  diagnostics: buildDiagnosticReport([
    makeDiagnostic(
      "CUSTOM_COMPONENT_BLOCKED",
      "blocked",
      "Material custom component 'comp-webgl-bg' is blocked pending security review.",
      { componentId: "comp-webgl-bg" },
    ),
  ]),
  provenance: makeProvenance("v0-react"),
  // CRITICAL: status must NOT be PASS — material blocked component
  certificationStatus: {
    status: "BLOCKED",
    adapterVersion: ADAPTER_VERSION,
    contractVersion: AESTHETIC_CONTRACT_VERSION,
    fidelity: [
      { dimension: "F1_STRUCTURAL", result: "PASS", method: "schema-check" },
      { dimension: "F2_VISUAL", result: "SKIP", method: "no-golden-reference" },
      { dimension: "F3_RESPONSIVE", result: "PASS", method: "schema-check" },
      {
        dimension: "F4_MOTION",
        result: "FAIL",
        method: "motion-spec-check",
        notes: "Material component comp-webgl-bg is blocked; WebGL animation cannot be compiled.",
      },
      { dimension: "F5_EDITABLE_BINDING", result: "PASS", method: "props-check" },
      { dimension: "F6_SOURCE_IMMUTABILITY", result: "SKIP", method: "no-world-file" },
      { dimension: "F7_ACCESSIBILITY", result: "PASS", method: "schema-check" },
    ],
    diagnostics: buildDiagnosticReport([
      makeDiagnostic(
        "CUSTOM_COMPONENT_BLOCKED",
        "blocked",
        "Material component comp-webgl-bg blocked.",
      ),
    ]),
    galleryEligible: false,
    blockers: [
      "comp-webgl-bg: Material custom component is blocked pending security review.",
      "F4_MOTION: WebGL animation cannot be compiled to a native Kebu primitive.",
    ],
  },
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("Fixture 1 — simple static site", () => {
  it("validates successfully", () => {
    const result = validateAdapterDesignIR(fixture1);
    expect(result.ok).toBe(true);
  });

  it("serializes and deserializes without data loss", () => {
    const json = JSON.stringify(fixture1);
    const parsed = JSON.parse(json);
    const result = validateAdapterDesignIR(parsed);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe(fixture1.title);
      expect(result.data.pages).toHaveLength(1);
      expect(result.data.pages[0].sections).toHaveLength(3);
    }
  });

  it("has no diagnostics errors", () => {
    expect(fixture1.diagnostics.hasBlockers).toBe(false);
    expect(fixture1.diagnostics.errorCount).toBe(0);
  });

  it("uses only bundled fonts", () => {
    for (const font of fixture1.fonts) {
      expect(isKebuBundledFont(font.family)).toBe(true);
    }
  });

  it("has no owner-portfolio section types", () => {
    for (const page of fixture1.pages) {
      for (const section of page.sections) {
        expect(isOwnerPortfolioType(section.sectionType)).toBe(false);
      }
    }
  });

  it("certificationStatus is PASS", () => {
    expect(fixture1.certificationStatus.status).toBe("PASS");
    expect(fixture1.certificationStatus.galleryEligible).toBe(true);
  });
});

describe("Fixture 2 — responsive editorial site", () => {
  it("validates successfully", () => {
    const result = validateAdapterDesignIR(fixture2);
    expect(result.ok).toBe(true);
  });

  it("has multi-page structure", () => {
    expect(fixture2.pages).toHaveLength(2);
    const slugs = fixture2.pages.map((p) => p.slug);
    expect(slugs).toContain("home");
    expect(slugs).toContain("about");
  });

  it("navigation section has mobile deviceOverrides", () => {
    const nav = fixture2.pages[0].sections.find((s) => s.sectionType === "navigation");
    expect(nav?.deviceOverrides?.mobile).toBeDefined();
  });

  it("blog section has both tablet and mobile overrides", () => {
    const blog = fixture2.pages[0].sections.find((s) => s.sectionType === "blog-list");
    expect(blog?.deviceOverrides?.tablet).toBeDefined();
    expect(blog?.deviceOverrides?.mobile).toBeDefined();
  });

  it("serializes and deserializes deterministically", () => {
    const json1 = JSON.stringify(fixture2);
    const json2 = JSON.stringify(JSON.parse(json1));
    expect(json1).toBe(json2);
  });
});

describe("Fixture 3 — animated / parallax site", () => {
  it("validates successfully", () => {
    const result = validateAdapterDesignIR(fixture3);
    expect(result.ok).toBe(true);
  });

  it("all motion specs have reducedMotionFallback", () => {
    const allSpecs = [
      ...(fixture3.motionSpecs ?? []),
      ...fixture3.pages.flatMap((p) => p.sections.flatMap((s) => s.motionSpecs ?? [])),
    ];
    expect(allSpecs.length).toBeGreaterThan(0);
    for (const spec of allSpecs) {
      expect(spec.reducedMotionFallback).toBeDefined();
      expect(spec.reducedMotionFallback.type).toBeDefined();
    }
  });

  it("motion specs validate individually", () => {
    const specs = [heroParallaxSpec, scrollRevealSpec, kenBurnsSpec];
    for (const spec of specs) {
      const result = validateMotionSpec(spec);
      expect(result.ok).toBe(true);
    }
  });

  it("native primitive specs have nativePrimitive set", () => {
    const nativeSpecs = [heroParallaxSpec, scrollRevealSpec, kenBurnsSpec];
    for (const spec of nativeSpecs) {
      expect(spec.nativePrimitive).toBeDefined();
      expect(spec.compilationPath).toBe("native");
    }
  });

  it("invalid motion spec missing reducedMotionFallback is rejected", () => {
    const badSpec = { ...kenBurnsSpec, reducedMotionFallback: undefined };
    const result = validateMotionSpec(badSpec);
    expect(result.ok).toBe(false);
  });
});

describe("Fixture 4 — custom licensed font", () => {
  it("validates successfully", () => {
    const result = validateAdapterDesignIR(fixture4);
    expect(result.ok).toBe(true);
  });

  it("custom font validates on its own", () => {
    const result = validateFontContractV1(customFont);
    expect(result.ok).toBe(true);
  });

  it("font with commercialUse=false is rejected", () => {
    const blocked = {
      ...customFont,
      license: { ...customFont.license, commercialUse: false },
    };
    const result = validateFontContractV1(blocked);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("commercialUse"))).toBe(true);
    }
  });

  it("font with webEmbedAllowed=false is rejected", () => {
    const blocked = {
      ...customFont,
      license: { ...customFont.license, webEmbedAllowed: false },
    };
    const result = validateFontContractV1(blocked);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("webEmbedAllowed"))).toBe(true);
    }
  });

  it("google-fonts font without googleFontsSpec produces a warning", () => {
    const noSpec = { ...customFont, googleFontsSpec: undefined };
    const result = validateFontContractV1(noSpec);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const hasWarning = result.warnings.some((w) => w.code === "FONT_GOOGLE_SPEC_MISSING");
      expect(hasWarning).toBe(true);
    }
  });

  it("font outside bundled list is not marked as bundled", () => {
    expect(isKebuBundledFont("Noto Sans Tifinagh")).toBe(false);
  });

  it("bundled fonts are correctly identified", () => {
    expect(isKebuBundledFont("Fraunces")).toBe(true);
    expect(isKebuBundledFont("Inter")).toBe(true);
    expect(isKebuBundledFont("Steelfish")).toBe(true);
  });
});

describe("Fixture 5 — navigation", () => {
  it("validates successfully", () => {
    const result = validateAdapterDesignIR(fixture5);
    expect(result.ok).toBe(true);
  });

  it("navigation section has nested links", () => {
    const nav = fixture5.pages[0].sections[0];
    expect(nav.sectionType).toBe("navigation");
    const links = (nav.props.links as { label: string; children?: unknown[] }[]);
    expect(links.some((l) => l.children && l.children.length > 0)).toBe(true);
  });

  it("navigation has mobile overrides", () => {
    const nav = fixture5.pages[0].sections[0];
    expect(nav.deviceOverrides?.mobile).toBeDefined();
  });
});

describe("Fixture 6 — collection / repeated content", () => {
  it("validates successfully", () => {
    const result = validateAdapterDesignIR(fixture6);
    expect(result.ok).toBe(true);
  });

  it("events section has multiple items", () => {
    const events = fixture6.pages[0].sections[0];
    expect(events.sectionType).toBe("events");
    const items = events.props.items as unknown[];
    expect(items).toHaveLength(2);
  });

  it("products section is present", () => {
    const products = fixture6.pages[0].sections.find((s) => s.sectionType === "products");
    expect(products).toBeDefined();
  });
});

describe("Fixture 7 — commerce-bound section", () => {
  it("validates (with warnings)", () => {
    const result = validateAdapterDesignIR(fixture7);
    expect(result.ok).toBe(true);
  });

  it("has capability overflow for commerce binding", () => {
    const products = fixture7.pages[0].sections[0];
    const overflow = products.capabilityOverflows?.find(
      (o) => o.capability === "commerce-product-bindings",
    );
    expect(overflow).toBeDefined();
    expect(overflow?.classification).toBe("EXTENSION_REQUIRED");
    expect(overflow?.preservedIn).toBe("ir-field");
  });

  it("is not gallery eligible", () => {
    expect(fixture7.certificationStatus.galleryEligible).toBe(false);
  });

  it("has NEEDS_REVIEW certification", () => {
    expect(fixture7.certificationStatus.status).toBe("NEEDS_REVIEW");
  });
});

describe("Fixture 8 — custom component", () => {
  it("validates successfully", () => {
    const result = validateAdapterDesignIR(fixture8);
    expect(result.ok).toBe(true);
  });

  it("custom component validates on its own", () => {
    const result = validateCustomComponentSpec(customComponent);
    expect(result.ok).toBe(true);
  });

  it("custom component has static fallback", () => {
    expect(customComponent.staticHtmlFallback).toBeDefined();
    expect(customComponent.staticHtmlFallback!.length).toBeGreaterThan(0);
  });

  it("custom component has security boundary", () => {
    expect(customComponent.securityBoundary).toBeDefined();
    expect(customComponent.securityBoundary.trustedJs).toBe("none");
    expect(customComponent.securityBoundary.trustedReact).toBe("none");
    expect(customComponent.securityBoundary.requiresHumanApproval).toBe(false);
  });

  it("motion inside custom component has reducedMotionFallback", () => {
    for (const spec of customComponent.motionSpecs ?? []) {
      expect(spec.reducedMotionFallback).toBeDefined();
    }
  });

  it("component is not blocked (approved and sanitized HTML)", () => {
    expect(customComponent.securityBoundary.trustedHtml).toBe("sanitized");
    expect(customComponent.securityBoundary.trustedCss).toBe("scoped");
    expect(isMaterialAndBlocked(customComponent)).toBe(false);
  });
});

describe("Fixture 9 — unsupported material behavior (WebGL)", () => {
  it("the WebGL component is material and blocked", () => {
    expect(isMaterialAndBlocked(blockedWebGLComponent)).toBe(true);
  });

  it("certificationStatus is BLOCKED, not PASS", () => {
    expect(fixture9.certificationStatus.status).toBe("BLOCKED");
    expect(fixture9.certificationStatus.galleryEligible).toBe(false);
  });

  it("PASS certification with a material blocked component fails validation", () => {
    const withFakePass: AdapterDesignIR = {
      ...fixture9,
      certificationStatus: { ...makePassCert(), galleryEligible: true },
      diagnostics: emptyDiagnosticReport(),
    };
    const result = validateAdapterDesignIR(withFakePass);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => e.includes("material") || e.includes("blocked")),
      ).toBe(true);
    }
  });

  it("validates correctly with BLOCKED status", () => {
    const result = validateAdapterDesignIR(fixture9);
    expect(result.ok).toBe(true); // IR is valid — status is BLOCKED, which is correct
  });

  it("F4_MOTION is FAIL", () => {
    const f4 = fixture9.certificationStatus.fidelity.find(
      (f) => f.dimension === "F4_MOTION",
    );
    expect(f4?.result).toBe("FAIL");
  });

  it("diagnostics has a BLOCKED entry", () => {
    expect(fixture9.diagnostics.blockedCount).toBeGreaterThan(0);
    expect(fixture9.diagnostics.hasBlockers).toBe(true);
  });

  it("WebGL component missing approvedBy is not deployed-ready", () => {
    expect(blockedWebGLComponent.securityBoundary.requiresHumanApproval).toBe(true);
    expect(blockedWebGLComponent.securityBoundary.approvedBy).toBeUndefined();
  });
});

describe("Fixture 10 — malformed / hostile input", () => {
  it("null input is rejected by AdapterDesignIR validator", () => {
    const result = validateAdapterDesignIR(null);
    expect(result.ok).toBe(false);
  });

  it("empty object is rejected", () => {
    const result = validateAdapterDesignIR({});
    expect(result.ok).toBe(false);
  });

  it("wrong irVersion is rejected", () => {
    const bad = { ...fixture1, irVersion: "99" };
    const result = validateAdapterDesignIR(bad);
    expect(result.ok).toBe(false);
  });

  it("owner-portfolio section type is rejected", () => {
    const bad: AdapterDesignIR = {
      ...fixture1,
      pages: [
        {
          id: "p",
          slug: "home",
          sections: [
            {
              id: "s1",
              sectionType: "maylecor-home",
              sortOrder: 0,
              props: {},
            },
          ],
        },
      ],
    };
    const result = validateAdapterDesignIR(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("owner-portfolio"))).toBe(true);
    }
  });

  it("font with commercialUse=false is rejected", () => {
    const bad: AdapterDesignIR = {
      ...fixture1,
      fonts: [
        {
          ...makeBundledFont("Fraunces"),
          license: { spdx: "Proprietary", commercialUse: false, webEmbedAllowed: true },
        },
      ],
    };
    const result = validateAdapterDesignIR(bad);
    expect(result.ok).toBe(false);
  });

  it("motion spec missing reducedMotionFallback is rejected", () => {
    const bad = {
      id: "m1",
      trigger: "load" as const,
      target: "self",
      effect: "fade" as const,
      compilationPath: "native" as const,
      // reducedMotionFallback is intentionally missing
    };
    const result = validateMotionSpec(bad);
    expect(result.ok).toBe(false);
  });

  it("IRSection with owner-portfolio type fails validateIRSection", () => {
    const section = {
      id: "s",
      sectionType: "kdirection-home",
      sortOrder: 0,
      props: {},
    };
    const { errors } = validateIRSection(section);
    expect(errors.some((e) => e.includes("owner-portfolio"))).toBe(true);
  });

  it("all owner-portfolio types are rejected", () => {
    for (const ownerType of OWNER_PORTFOLIO_SECTION_TYPES) {
      expect(isOwnerPortfolioType(ownerType)).toBe(true);
      const section = { id: "s", sectionType: ownerType, sortOrder: 0, props: {} };
      const { errors } = validateIRSection(section);
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  it("safeParseJson rejects malformed JSON", () => {
    const result = safeParseJson("{invalid json}");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("malformed");
  });

  it("safeParseJson detects hostile script injection", () => {
    const hostile = JSON.stringify({ title: "<script>alert(1)</script>" });
    const result = safeParseJson(hostile);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("hostile");
  });

  it("safeParseJson detects javascript: URI", () => {
    const hostile = JSON.stringify({ href: "javascript:void(0)" });
    const result = safeParseJson(hostile);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("hostile");
  });

  it("safeParseJson detects credential fishing attempts", () => {
    const hostile = JSON.stringify({ key: "SUPABASE_SERVICE_ROLE_KEY=abc123" });
    const result = safeParseJson(hostile);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("hostile");
  });

  it("detectHostileContent finds inline event handlers", () => {
    const { hostile } = detectHostileContent('<div onclick="evil()">');
    expect(hostile).toBe(true);
  });

  it("detectHostileContent passes clean content", () => {
    const { hostile } = detectHostileContent('{"title": "Welcome to Kebu"}');
    expect(hostile).toBe(false);
  });

  it("PASS certification with diagnostic blockers fails validation", () => {
    const bad: AdapterDesignIR = {
      ...fixture1,
      diagnostics: buildDiagnosticReport([
        makeDiagnostic("CERTIFICATION_F4_FAIL", "error", "F4 failed."),
      ]),
      certificationStatus: makePassCert(),
    };
    const result = validateAdapterDesignIR(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("hasBlockers"))).toBe(true);
    }
  });
});

describe("Version handling", () => {
  it("IR_VERSION is a known constant", () => {
    expect(IR_VERSION).toBe("1");
  });

  it("AESTHETIC_CONTRACT_VERSION is a known constant", () => {
    expect(AESTHETIC_CONTRACT_VERSION).toBe("1");
  });

  it("ADAPTER_VERSION matches semver pattern", () => {
    expect(ADAPTER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("IR with wrong irVersion fails validation", () => {
    const bad = { ...fixture1, irVersion: "2" };
    const result = validateAdapterDesignIR(bad);
    expect(result.ok).toBe(false);
  });
});

describe("Provenance preservation", () => {
  it("provenance is preserved through JSON round-trip", () => {
    const json = JSON.stringify(fixture3.provenance);
    const parsed = JSON.parse(json);
    expect(parsed.adapterVersion).toBe(fixture3.provenance.adapterVersion);
    expect(parsed.adapterRunId).toBe(fixture3.provenance.adapterRunId);
    expect(parsed.sourceType).toBe(fixture3.provenance.sourceType);
    expect(parsed.sourceRef).toBe(fixture3.provenance.sourceRef);
  });

  it("provenance adapterRunId is a UUID", () => {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRe.test(fixture1.provenance.adapterRunId)).toBe(true);
  });

  it("transformation entries preserve step names", () => {
    const prov = makeProvenance("v0-react");
    prov.transformations = [
      {
        step: "color-normalize",
        adapterVersion: ADAPTER_VERSION,
        timestamp: NOW,
        lossy: false,
      },
      {
        step: "motion-classify",
        adapterVersion: ADAPTER_VERSION,
        timestamp: NOW,
        lossy: false,
      },
    ];
    const json = JSON.stringify(prov);
    const parsed = JSON.parse(json);
    expect(parsed.transformations).toHaveLength(2);
    expect(parsed.transformations[0].step).toBe("color-normalize");
    expect(parsed.transformations[1].step).toBe("motion-classify");
  });
});

describe("Diagnostic model", () => {
  it("buildDiagnosticReport counts correctly", () => {
    const report = buildDiagnosticReport([
      makeDiagnostic("SECTION_TYPE_UNKNOWN", "error", "Unknown section."),
      makeDiagnostic("FONT_LICENSE_UNKNOWN", "warning", "Font license unknown."),
      makeDiagnostic("MOTION_NATIVE_PRIMITIVE", "info", "Native primitive used."),
      makeDiagnostic("CUSTOM_COMPONENT_BLOCKED", "blocked", "Component blocked."),
    ]);
    expect(report.errorCount).toBe(1);
    expect(report.warningCount).toBe(1);
    expect(report.infoCount).toBe(1);
    expect(report.blockedCount).toBe(1);
    expect(report.hasBlockers).toBe(true);
  });

  it("emptyDiagnosticReport has no blockers", () => {
    const report = emptyDiagnosticReport();
    expect(report.hasBlockers).toBe(false);
    expect(report.entries).toHaveLength(0);
  });

  it("makeDiagnostic produces correct shape", () => {
    const entry = makeDiagnostic(
      "FONT_LICENSE_BLOCKED",
      "error",
      "Font blocked.",
      { fontFamily: "CustomFont" },
    );
    expect(entry.code).toBe("FONT_LICENSE_BLOCKED");
    expect(entry.severity).toBe("error");
    expect(entry.location?.fontFamily).toBe("CustomFont");
  });
});

describe("Certification model", () => {
  it("pendingCertification has PENDING status and is not gallery eligible", () => {
    const cert = pendingCertification(ADAPTER_VERSION);
    expect(cert.status).toBe("PENDING");
    expect(cert.galleryEligible).toBe(false);
    expect(cert.blockers.length).toBeGreaterThan(0);
  });

  it("allFidelityPass returns true when all pass or skip", () => {
    const cert = makePassCert();
    expect(allFidelityPass(cert.fidelity)).toBe(true);
  });

  it("allFidelityPass returns false when any fail", () => {
    const cert = makePassCert();
    cert.fidelity[0].result = "FAIL";
    expect(allFidelityPass(cert.fidelity)).toBe(false);
  });

  it("failedFidelity identifies failing entries", () => {
    const cert = makePassCert();
    cert.fidelity[3].result = "FAIL";
    const failed = failedFidelity(cert.fidelity);
    expect(failed).toHaveLength(1);
    expect(failed[0].dimension).toBe("F4_MOTION");
  });
});

describe("AestheticContractV1 validation", () => {
  it("builds a valid contract from fixture1 data", () => {
    const contract: AestheticContractV1 = {
      contractVersion: AESTHETIC_CONTRACT_VERSION,
      adapterVersion: ADAPTER_VERSION,
      title: "Simple Aesthetic",
      colorSystem: fixture1.colorSystem,
      spacing: "comfortable",
      fonts: fixture1.fonts,
      pages: fixture1.pages.map((p) => ({
        slug: p.slug,
        title: p.title,
        sections: p.sections.map((s) => ({
          sectionType: s.sectionType,
          sortOrder: s.sortOrder,
          props: s.props,
        })),
      })),
      provenance: makeProvenance("manual"),
    };
    const result = validateAestheticContractV1(contract);
    expect(result.ok).toBe(true);
  });

  it("rejects a contract with owner-portfolio section type", () => {
    const bad: AestheticContractV1 = {
      contractVersion: AESTHETIC_CONTRACT_VERSION,
      adapterVersion: ADAPTER_VERSION,
      title: "Bad Contract",
      colorSystem: fixture1.colorSystem,
      fonts: fixture1.fonts,
      pages: [
        {
          slug: "home",
          sections: [{ sectionType: "maylecor-music", sortOrder: 0, props: {} }],
        },
      ],
      provenance: makeProvenance("manual"),
    };
    const result = validateAestheticContractV1(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("owner-portfolio"))).toBe(true);
    }
  });
});

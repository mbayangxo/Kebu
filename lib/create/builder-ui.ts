/** Builder UI tokens — warm, modern, not generic SaaS gray/navy. */
export const BUILDER = {
  bg: "#FFFBF7",
  surface: "#FFFFFF",
  surfaceMuted: "#FFF8F2",
  ink: "#0A0A0A",
  muted: "#5C5348",
  faint: "#8A8074",
  border: "rgba(10,10,10,0.08)",
  borderStrong: "rgba(10,10,10,0.12)",
  shadow: "0 12px 40px rgba(255, 85, 0, 0.07)",
  shadowSoft: "0 4px 24px rgba(10, 10, 10, 0.04)",
  orange: "#FF5500",
  orangeGlow: "rgba(255, 85, 0, 0.12)",
  gradient: "linear-gradient(135deg, #FF5500 0%, #FF7733 50%, #E10600 100%)",
  yandeGradient: "linear-gradient(160deg, #FFF8F2 0%, #FFFFFF 45%, #FFF3EB 100%)",
} as const;

export const YANDE_SUGGESTIONS_CREATE = [
  "Create a Senegalese fashion store. Luxury African fashion magazine feel. Sand, deep green and gold. Founder story under the hero. Large editorial product cards.",
  "Beauty brand in Dakar — soft pink and black, big product photos, WhatsApp to order",
  "Music artist site with streaming links and tour dates",
  "Neighborhood shop — XOF prices, Wave + WhatsApp checkout",
] as const;

export const YANDE_SUGGESTIONS_IMPROVE = [
  "Make it less Shopify-looking and more like a high-end fashion website",
  "Add a wholesale section",
  "Make the mobile version completely different from desktop",
  "Make the homepage feel more expensive",
  "Add a WhatsApp call-to-action on every page",
  "Put the founder story immediately below the hero",
] as const;

/** AI builder modes A5–A8 (inside existing site editor). */
export const YANDE_IMPROVE_MODES = [
  {
    id: "redesign" as const,
    label: "A5 Redesign",
    hint: "Restyle the whole look — keep your facts & photos",
    seed: "Redesign this site to feel more premium and mobile-ready for customers in Senegal.",
  },
  {
    id: "page" as const,
    label: "A6 Page",
    hint: "Generate or strengthen a page / section",
    seed: "Add or strengthen a clear page with hero, proof, and WhatsApp contact.",
  },
  {
    id: "rewrite" as const,
    label: "A7 Rewrite",
    hint: "Improve headlines and body copy only",
    seed: "Rewrite the copy so it is clearer and more persuasive — do not change photos or layout.",
  },
  {
    id: "convert" as const,
    label: "A8 Convert",
    hint: "Optimize CTAs & mobile conversion",
    seed: "Optimize for mobile conversion — clearer CTAs, WhatsApp / Wave order path, less fluff.",
  },
] as const;

export {
  BUILDER_QUICK_SECTIONS,
  BUILDER_SECTION_CATALOG,
  BUILDER_SECTION_CATEGORIES,
  labelForSectionType,
} from "./builder-section-catalog";

/**
 * Builder UI tokens — theme-editor chrome (Shopify admin density).
 * Neutral gray workspace; accent reserved for primary actions.
 */
export const BUILDER = {
  bg: "#F1F1F1",
  surface: "#FFFFFF",
  surfaceMuted: "#F6F6F7",
  ink: "#0A0A0A",
  muted: "#616161",
  faint: "#8C8C8C",
  border: "#E3E3E3",
  borderStrong: "#C9CCCF",
  shadow: "0 1px 0 rgba(0,0,0,0.04)",
  shadowSoft: "0 1px 2px rgba(0,0,0,0.04)",
  orange: "#FF5500",
  orangeGlow: "rgba(255, 85, 0, 0.10)",
  gradient: "linear-gradient(135deg, #FF5500 0%, #FF7733 50%, #E10600 100%)",
  yandeGradient: "linear-gradient(160deg, #F6F6F7 0%, #FFFFFF 45%, #F1F1F1 100%)",
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

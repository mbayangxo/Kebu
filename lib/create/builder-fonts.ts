export const BUILDER_FONT_OPTIONS = [
  "Satoshi",
  "Inter",
  "DM Sans",
  "Space Grotesk",
  "Manrope",
  "IBM Plex Sans",
  "Helvetica Neue",
  "Arial",
  "Georgia",
  "Playfair Display",
  "Cormorant Garamond",
  "Libre Baskerville",
  "Fraunces",
  "Oswald",
  "Bebas Neue",
  "Syne",
  "Abril Fatface",
  "Lobster",
  "Dancing Script",
  "Great Vibes",
  "Pacifico",
  "Steelfish",
] as const;

export type BuilderFontFamily = (typeof BUILDER_FONT_OPTIONS)[number];

export const BUILDER_FONT_WEIGHT_OPTIONS = [
  { value: 300, label: "Light" },
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Extra bold" },
  { value: 900, label: "Black" },
] as const;

export const BUILDER_FONT_GROUPS = [
  { label: "Clean", fonts: ["Satoshi","Inter","DM Sans","Space Grotesk","Manrope","IBM Plex Sans","Helvetica Neue","Arial"] },
  { label: "Editorial", fonts: ["Georgia","Playfair Display","Cormorant Garamond","Libre Baskerville","Fraunces"] },
  { label: "Display", fonts: ["Oswald","Bebas Neue","Syne","Abril Fatface","Steelfish"] },
  { label: "Script", fonts: ["Lobster","Dancing Script","Great Vibes","Pacifico"] },
] as const;

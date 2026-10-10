/**
 * Theme fonts, self-hosted by next/font (downloaded at build time, served from /_next/static).
 *
 * Site themes pick display/body fonts by name. These used to be loaded at runtime from
 * fonts.googleapis.com, which the app's CSP (style-src 'self') correctly blocks — themes
 * silently fell back to system fonts and every page logged a CSP error.
 *
 * Each family exposes a CSS variable; cssFontStack() (lib/create/site-theme-fonts.ts) refers to
 * it, and THEME_FONT_VARIABLE_CLASSES must be applied to an ancestor of themed content.
 * `preload: false`: a page downloads only the faces it actually renders.
 *
 * The variable names are mirrored in THEME_FONT_VARIABLES (lib/create/site-theme-fonts.ts);
 * tests/create/site-theme-fonts.test.ts checks the two stay in sync.
 */
import {
  Abril_Fatface,
  Bebas_Neue,
  Dancing_Script,
  Fraunces,
  Great_Vibes,
  IBM_Plex_Sans,
  Inter,
  Lobster,
  Oswald,
  Pacifico,
  Playfair_Display,
  Syne,
} from "next/font/google";

const fraunces = Fraunces({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], display: "swap", preload: false, variable: "--kebu-font-fraunces" });
const playfairDisplay = Playfair_Display({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], display: "swap", preload: false, variable: "--kebu-font-playfair-display" });
const oswald = Oswald({ subsets: ["latin", "latin-ext"], display: "swap", preload: false, variable: "--kebu-font-oswald" });
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin", "latin-ext"], display: "swap", preload: false, variable: "--kebu-font-bebas-neue" });
const ibmPlexSans = IBM_Plex_Sans({ weight: ["300", "400", "500", "600", "700"], subsets: ["latin", "latin-ext"], display: "swap", preload: false, variable: "--kebu-font-ibm-plex-sans" });
const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap", preload: false, variable: "--kebu-font-inter" });
const syne = Syne({ subsets: ["latin", "latin-ext"], display: "swap", preload: false, variable: "--kebu-font-syne" });
const lobster = Lobster({ weight: "400", subsets: ["latin", "latin-ext"], display: "swap", preload: false, variable: "--kebu-font-lobster" });
const dancingScript = Dancing_Script({ subsets: ["latin", "latin-ext"], display: "swap", preload: false, variable: "--kebu-font-dancing-script" });
const greatVibes = Great_Vibes({ weight: "400", subsets: ["latin", "latin-ext"], display: "swap", preload: false, variable: "--kebu-font-great-vibes" });
const pacifico = Pacifico({ weight: "400", subsets: ["latin", "latin-ext"], display: "swap", preload: false, variable: "--kebu-font-pacifico" });
const abrilFatface = Abril_Fatface({ weight: "400", subsets: ["latin", "latin-ext"], display: "swap", preload: false, variable: "--kebu-font-abril-fatface" });

/** Classes that define every --kebu-font-* variable; apply to an ancestor of themed content. */
export const THEME_FONT_VARIABLE_CLASSES = [
  fraunces,
  playfairDisplay,
  oswald,
  bebasNeue,
  ibmPlexSans,
  inter,
  syne,
  lobster,
  dancingScript,
  greatVibes,
  pacifico,
  abrilFatface,
]
  .map((font) => font.variable)
  .join(" ");

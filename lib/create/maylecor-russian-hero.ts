import {
  LEGALLY_BLONDE_ASSETS,
  localizeLegallyBlondeAssetUrl,
} from "./legally-blonde-defaults";
import { defaultMaylecorKsendrProps, mergeMaylecorLogoExtras } from "./maylecor-ksendr-defaults";
import {
  MAYLECOR_FIGURE_ASSETS,
  MAYLECOR_LOCAL_ASSETS,
  MAYLECOR_SEED_REVISION,
  isElleStockCutout,
  isMaylecorStockTemplateAsset,
} from "./maylecor-defaults";
import { sanitizeMaylecorNavLinks } from "./maylecor-nav";

const HERO_ASSET_KEYS = [
  "backgroundLayer",
  "titleLogo",
  "cutoutLeft",
  "cutoutRight",
  "cutoutAccent",
  "cutoutSparkle",
  "macbook",
  "sparkleGif",
  "heroPhoto",
] as const;

const MAYLECOR_FIGURE_KEYS = [
  "cutoutLeft",
  "cutoutRight",
  "cutoutAccent",
  "heroPhoto",
] as const;

/** User-uploaded assets must not be overwritten by Russian restore. */
export function isUserUploadedSiteAsset(url: string): boolean {
  const u = url.trim();
  if (!u || u.startsWith("blob:")) return Boolean(u);
  // Stock /templates/maylecor/* are NOT user uploads — upgrade may refresh them.
  if (isMaylecorStockTemplateAsset(u)) return false;
  return (
    u.includes("/storage/v1/object/public/site-assets/") ||
    u.includes("/api/projects/") ||
    u.includes("/site-assets/")
  );
}

export function remapHeroAssetUrls(props: Record<string, unknown>): Record<string, unknown> {
  const next = { ...props };
  for (const key of HERO_ASSET_KEYS) {
    const raw = next[key];
    if (typeof raw !== "string") continue;
    const localized = localizeLegallyBlondeAssetUrl(raw);
    if (localized != null) next[key] = localized;
  }
  return next;
}

/** Force Kebu-hosted Russian cutouts unless the founder uploaded a custom file. */
export function normalizeMaylecorRussianHeroProps(
  props: Record<string, unknown>,
  artistName = "MAY LECOR",
): Record<string, unknown> {
  const base = defaultMaylecorKsendrProps(artistName);
  const staleSeed = String(props.seedRevision ?? "") !== MAYLECOR_SEED_REVISION;
  const userExtras = Array.isArray(props.extraCutouts) ? props.extraCutouts : null;
  /** On seed bump, re-merge logo/city from current defaults so Cursor edits land in the draft. */
  const extrasSource =
    staleSeed || !userExtras || userExtras.length === 0
      ? (base.extraCutouts ?? [])
      : userExtras;
  const merged = {
    ...base,
    ...props,
    title: String(props.title ?? props.brandLabel ?? base.title),
    brandLabel: String(props.brandLabel ?? props.title ?? base.brandLabel ?? artistName),
    subtitle: String(props.subtitle ?? base.subtitle),
    socialLinks: Array.isArray(props.socialLinks) ? props.socialLinks : base.socialLinks,
    navLinks: sanitizeMaylecorNavLinks(
      (Array.isArray(props.navLinks) ? props.navLinks : base.navLinks) as {
        label?: string;
        href?: string;
      }[],
    ),
    scrollMode: "parallax" as const,
    showExtras: false,
    appearance: "light" as const,
    displayFont: "Steelfish",
    motionEnabled: props.motionEnabled !== false,
    /** Always prefer circle seal image — never Russian wordmark / text ring by default. */
    titleAsText: false,
    layerScales: staleSeed
      ? { ...(base.layerScales as Record<string, number>) }
      : {
          ...(base.layerScales as Record<string, number>),
          ...((props.layerScales as Record<string, number> | undefined) ?? {}),
        },
    layerMotions: {
      ...((base.layerMotions as Record<string, string> | undefined) ?? {}),
      ...((props.layerMotions as Record<string, string> | undefined) ?? {}),
    },
    layerLinks: {
      ...((props.layerLinks as Record<string, string> | undefined) ?? {}),
    },
    hiddenLayers: (() => {
      const fromProps = Array.isArray(props.hiddenLayers) ? (props.hiddenLayers as string[]) : [];
      const fromBase = Array.isArray(base.hiddenLayers) ? (base.hiddenLayers as string[]) : [];
      // On seed bump, hide Russian glitter/MacBook; keep any founder-hidden layers.
      return staleSeed ? [...new Set([...fromBase, ...fromProps])] : fromProps.length ? fromProps : fromBase;
    })(),
    extraCutouts: mergeMaylecorLogoExtras(
      extrasSource as {
        id: string;
        src: string;
        alt?: string;
        href?: string;
        topPct: number;
        leftPct: number;
        widthPct: number;
        rotate?: number;
        zIndex?: number;
        parallaxRole?: "city" | "figure" | "none";
      }[],
    ),
    chromeLogo: staleSeed
      ? MAYLECOR_LOCAL_ASSETS.logoStacked
      : String(props.chromeLogo ?? "").trim() || MAYLECOR_LOCAL_ASSETS.logoStacked,
    seedRevision: MAYLECOR_SEED_REVISION,
  } as Record<string, unknown>;

  const remapped = remapHeroAssetUrls(merged);

  for (const key of HERO_ASSET_KEYS) {
    const val = String(remapped[key] ?? "").trim();
    const fallback = base[key as keyof typeof base];
    const localDefault =
      typeof fallback === "string"
        ? fallback
        : LEGALLY_BLONDE_ASSETS[key as keyof typeof LEGALLY_BLONDE_ASSETS];
    if (key === "titleLogo") {
      const asText = remapped.titleAsText === true;
      if (asText) {
        remapped[key] = "";
        remapped.titleAsText = true;
        continue;
      }
      // Force May Lècor circle seal (not Russian Cyrillic SVG / Elle title-logo).
      if (
        staleSeed ||
        !val ||
        val.includes("logo-banner.svg") ||
        val.includes("logo-small.svg") ||
        val.includes("title-logo.svg") ||
        val.includes("/templates/legally-blonde/") ||
        val.includes("tildacdn.com") ||
        val.includes("Group_557") ||
        val.includes("wixstatic.com") ||
        isMaylecorStockTemplateAsset(val)
      ) {
        remapped[key] = MAYLECOR_LOCAL_ASSETS.logoCircleSeal;
        remapped.titleAsText = false;
      }
      continue;
    }
    if (key === "backgroundLayer") {
      const hidden =
        remapped.backgroundHidden === true ||
        (Array.isArray(remapped.hiddenLayers) &&
          (remapped.hiddenLayers as string[]).includes("backgroundLayer"));
      // User cleared or hid background — never restore stock pink scene.
      if (hidden || props.backgroundLayer === "" || remapped.backgroundLayer === "") {
        remapped.backgroundLayer = "";
        remapped.backgroundHidden = true;
        const hl = Array.isArray(remapped.hiddenLayers)
          ? [...(remapped.hiddenLayers as string[])]
          : [];
        if (!hl.includes("backgroundLayer")) hl.push("backgroundLayer");
        remapped.hiddenLayers = hl;
        continue;
      }
      if (isUserUploadedSiteAsset(val)) continue;
      if (
        staleSeed ||
        !val ||
        val.includes("tildacdn.com") ||
        val.includes("wixstatic.com") ||
        isMaylecorStockTemplateAsset(val)
      ) {
        remapped[key] = localDefault;
      }
      continue;
    }
    const isFigure = (MAYLECOR_FIGURE_KEYS as readonly string[]).includes(key);
    if (staleSeed && !isUserUploadedSiteAsset(val)) {
      if (isFigure) {
        remapped[key] = MAYLECOR_FIGURE_ASSETS[key as keyof typeof MAYLECOR_FIGURE_ASSETS];
      } else {
        remapped[key] = localDefault;
      }
      continue;
    }
    if (!val || !isUserUploadedSiteAsset(val)) {
      const shouldReplaceFigure =
        isFigure &&
        (isElleStockCutout(val) ||
          !val ||
          isMaylecorStockTemplateAsset(val) ||
          !val.includes("/templates/maylecor/"));
      const shouldReplaceDecor =
        !isFigure &&
        (!val ||
          val.includes("tildacdn.com") ||
          val.includes("wixstatic.com") ||
          isMaylecorStockTemplateAsset(val));
      if (shouldReplaceFigure) {
        remapped[key] = MAYLECOR_FIGURE_ASSETS[key as keyof typeof MAYLECOR_FIGURE_ASSETS];
      } else if (shouldReplaceDecor) {
        remapped[key] = localDefault;
      }
    }
  }

  remapped.seedRevision = MAYLECOR_SEED_REVISION;
  return remapped;
}

export function projectUsesMaylecorRussianLayout(
  description: string | null | undefined,
  sectionTypes: string[],
): boolean {
  if (description?.includes("portfolio:maylecor")) return true;
  return sectionTypes.some((t) => t === "legally-blonde-hero" || t === "maylecor-home");
}

import {
  LEGALLY_BLONDE_ASSETS,
  localizeLegallyBlondeAssetUrl,
} from "./legally-blonde-defaults";
import { defaultMaylecorKsendrProps } from "./maylecor-ksendr-defaults";

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

/** User-uploaded assets must not be overwritten by Russian restore. */
export function isUserUploadedSiteAsset(url: string): boolean {
  const u = url.trim();
  if (!u || u.startsWith("blob:")) return Boolean(u);
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
  const merged = {
    ...base,
    ...props,
    title: String(props.title ?? props.brandLabel ?? base.title),
    brandLabel: String(props.brandLabel ?? props.title ?? base.brandLabel ?? artistName),
    subtitle: String(props.subtitle ?? base.subtitle),
    socialLinks: Array.isArray(props.socialLinks) ? props.socialLinks : base.socialLinks,
    scrollMode: "parallax" as const,
    showExtras: false,
    appearance: "light" as const,
    displayFont: "Steelfish",
    motionEnabled: props.motionEnabled !== false,
  } as Record<string, unknown>;

  const remapped = remapHeroAssetUrls(merged);

  for (const key of HERO_ASSET_KEYS) {
    const val = String(remapped[key] ?? "").trim();
    const fallback = base[key as keyof typeof base];
    const localDefault =
      typeof fallback === "string"
        ? fallback
        : LEGALLY_BLONDE_ASSETS[key as keyof typeof LEGALLY_BLONDE_ASSETS];
    if (!val || !isUserUploadedSiteAsset(val)) {
      if (
        !val ||
        val.includes("tildacdn.com") ||
        val.includes("wixstatic.com") ||
        !val.includes("/templates/legally-blonde/")
      ) {
        remapped[key] = localDefault;
      }
    }
  }

  return remapped;
}

export function projectUsesMaylecorRussianLayout(
  description: string | null | undefined,
  sectionTypes: string[],
): boolean {
  if (description?.includes("portfolio:maylecor")) return true;
  return sectionTypes.some((t) => t === "legally-blonde-hero" || t === "maylecor-home");
}

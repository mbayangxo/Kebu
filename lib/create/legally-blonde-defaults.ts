/**
 * Russian Legally Blonde / Elle assets — hosted on Kebu so the builder
 * does not depend on Tilda CDN (hotlink 403 → black empty layers).
 */
export const LEGALLY_BLONDE_ASSET_DIR = "/templates/legally-blonde";

export const LEGALLY_BLONDE_ASSETS = {
  backgroundLayer: `${LEGALLY_BLONDE_ASSET_DIR}/background.png`,
  titleLogo: `${LEGALLY_BLONDE_ASSET_DIR}/title-logo.svg`,
  cutoutLeft: `${LEGALLY_BLONDE_ASSET_DIR}/cutout-left.png`,
  cutoutRight: `${LEGALLY_BLONDE_ASSET_DIR}/cutout-right.png`,
  cutoutAccent: `${LEGALLY_BLONDE_ASSET_DIR}/cutout-accent.png`,
  cutoutSparkle: `${LEGALLY_BLONDE_ASSET_DIR}/cutout-sparkle.png`,
  macbook: `${LEGALLY_BLONDE_ASSET_DIR}/macbook.png`,
  sparkleGif: `${LEGALLY_BLONDE_ASSET_DIR}/cutout-sparkle.png`,
  heroPhoto: `${LEGALLY_BLONDE_ASSET_DIR}/hero-photo.png`,
} as const;

/** Map historic Tilda CDN URLs → local copies (existing sites keep working). */
export const LEGALLY_BLONDE_TILDA_TO_LOCAL: Record<string, string> = {
  "https://static.tildacdn.com/tild3639-6261-4261-b361-646339346430/_1.png":
    LEGALLY_BLONDE_ASSETS.backgroundLayer,
  "https://static.tildacdn.com/tild6237-6230-4862-b263-393533656538/Group_557.svg":
    LEGALLY_BLONDE_ASSETS.titleLogo,
  "https://static.tildacdn.com/tild6538-3665-4232-b661-376339363635/Group_556.png":
    LEGALLY_BLONDE_ASSETS.cutoutLeft,
  "https://static.tildacdn.com/tild3466-3462-4430-a336-313662643530/Group_555.png":
    LEGALLY_BLONDE_ASSETS.cutoutRight,
  "https://static.tildacdn.com/tild3333-3236-4631-a431-346338396264/Group_546_1.png":
    LEGALLY_BLONDE_ASSETS.cutoutAccent,
  "https://static.tildacdn.com/tild6339-6666-4433-b930-346262333339/Group_523_1.png":
    LEGALLY_BLONDE_ASSETS.cutoutSparkle,
  "https://static.tildacdn.com/tild3538-3362-4431-b431-373663306261/Group_569.png":
    LEGALLY_BLONDE_ASSETS.macbook,
  "https://static.tildacdn.com/tild3437-6635-4035-a165-323763313632/4.gif":
    LEGALLY_BLONDE_ASSETS.cutoutSparkle,
  "https://static.tildacdn.com/tild3063-6230-4137-a233-626364346663/photo.png":
    LEGALLY_BLONDE_ASSETS.heroPhoto,
};

export function localizeLegallyBlondeAssetUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const trimmed = url.trim();
  if (!trimmed) return "";
  return LEGALLY_BLONDE_TILDA_TO_LOCAL[trimmed] ?? trimmed;
}

export function defaultLegallyBlondeHeroProps() {
  return {
    title: "блондинка в законе",
    subtitle:
      "Как наивная блондинка преобразилась в успешную юристку, разрушив стереотипы",
    backgroundLayer: LEGALLY_BLONDE_ASSETS.backgroundLayer,
    titleLogo: LEGALLY_BLONDE_ASSETS.titleLogo,
    cutoutLeft: LEGALLY_BLONDE_ASSETS.cutoutLeft,
    cutoutRight: LEGALLY_BLONDE_ASSETS.cutoutRight,
    cutoutAccent: LEGALLY_BLONDE_ASSETS.cutoutAccent,
    cutoutSparkle: LEGALLY_BLONDE_ASSETS.cutoutSparkle,
    macbook: LEGALLY_BLONDE_ASSETS.macbook,
    sparkleGif: LEGALLY_BLONDE_ASSETS.sparkleGif,
    heroPhoto: LEGALLY_BLONDE_ASSETS.heroPhoto,
    accentColor: "#e9006b",
    displayFont: "Steelfish",
    motionEnabled: true,
    showExtras: false,
    appearance: "light" as const,
  };
}

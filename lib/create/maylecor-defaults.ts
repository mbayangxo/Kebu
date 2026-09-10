import { LEGALLY_BLONDE_ASSETS } from "./legally-blonde-defaults";

/**
 * Bump when Cursor updates stock May assets / hero composition.
 * Drafts auto-sync on editor load when this does not match section props.seedRevision.
 * Publish is still required only for the *live* public site.
 */
export const MAYLECOR_SEED_REVISION = "2026-09-10b";

/** Bump when replacing files under /public/templates/maylecor so CDN/browser caches refresh. */
const MAY_ASSET_V = "20260910b";

function mayAsset(path: string): string {
  return `${path}?v=${MAY_ASSET_V}`;
}

export const MAYLECOR_LOCAL_ASSETS = {
  /** Full-body cutout — May only (replaces Elle Woods stock). */
  mayCutoutFull: mayAsset("/templates/maylecor/may-cutout-full.jpg"),
  mayFigure: mayAsset("/templates/maylecor/may-figure.png"),
  /** NYC skyline cutout — scrolls behind May (no “May” wordmark on top). */
  citySkyline: mayAsset("/templates/maylecor/city-skyline.png"),
  portrait: mayAsset("/templates/maylecor/portrait.jpg"),
  /** Stacked MA LÈCOR + rose (correct brand logo). */
  logoBanner: mayAsset("/templates/maylecor/logo-stacked.png"),
  logoSmall: mayAsset("/templates/maylecor/logo-stacked.png"),
  logoStacked: mayAsset("/templates/maylecor/logo-stacked.png"),
  /** Circular MAY LÈCOR seal — replaces Russian circle wordmark. */
  logoCircleSeal: mayAsset("/templates/maylecor/logo-circle-seal.png"),
  /** Gallery/marketing collage: figure + city + May logo (reference composite). */
  heroCollage: mayAsset("/templates/maylecor/hero-collage.png"),
} as const;

/** Figure layers on the Russian-style May Lecor hero — prefer distinct local files when available. */
export const MAYLECOR_FIGURE_ASSETS = {
  cutoutLeft: MAYLECOR_LOCAL_ASSETS.mayCutoutFull,
  cutoutRight: MAYLECOR_LOCAL_ASSETS.portrait,
  cutoutAccent: MAYLECOR_LOCAL_ASSETS.mayFigure,
  heroPhoto: MAYLECOR_LOCAL_ASSETS.portrait,
} as const;

/** True when a hero layer still points at Elle / Legally Blonde / Russian stock cutouts. */
export function isElleStockCutout(url: string | null | undefined): boolean {
  const u = String(url ?? "").trim();
  if (!u) return false;
  return (
    u.includes("/templates/legally-blonde/") ||
    u.includes("tildacdn.com") ||
    u.includes("Group_55") ||
    u.includes("Group_546") ||
    u.includes("Group_523") ||
    u.includes("Group_557")
  );
}

/** Stock May template files we may refresh on upgrade (not founder Storage uploads). */
export function isMaylecorStockTemplateAsset(url: string | null | undefined): boolean {
  const u = String(url ?? "").trim().split("?")[0] ?? "";
  return u.includes("/templates/maylecor/");
}

/** Default May Lecor gallery/shop media — local assets only (no fragile Wix CDN). */
export const MAYLECOR_WIX = {
  backgroundBlur: LEGALLY_BLONDE_ASSETS.backgroundLayer,
  portraitMain: MAYLECOR_LOCAL_ASSETS.mayFigure,
  collageTop: MAYLECOR_LOCAL_ASSETS.portrait,
  collageMiddle: MAYLECOR_LOCAL_ASSETS.mayFigure,
  logoBanner: MAYLECOR_LOCAL_ASSETS.logoBanner,
  bottomLeft: MAYLECOR_LOCAL_ASSETS.portrait,
  bottomRight: MAYLECOR_LOCAL_ASSETS.mayFigure,
  logoSmall: MAYLECOR_LOCAL_ASSETS.logoSmall,
  albumArt: MAYLECOR_LOCAL_ASSETS.logoStacked,
} as const;

export const MAYLECOR_SOCIAL_DEFAULTS = [
  {
    label: "SoundCloud",
    iconUrl:
      "https://static.wixstatic.com/media/e3496b0865884e4ca74ea5377ed41068.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/e3496b0865884e4ca74ea5377ed41068.png",
    href: "https://soundcloud.com/maylecor",
  },
  {
    label: "Apple Music",
    iconUrl:
      "https://static.wixstatic.com/media/b2a4e7e9c56a45df9961c749501f1139.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/b2a4e7e9c56a45df9961c749501f1139.png",
    href: "https://music.apple.com/",
  },
  {
    label: "Spotify",
    iconUrl:
      "https://static.wixstatic.com/media/e18eec328e7446079b7c7cef09488b18.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/e18eec328e7446079b7c7cef09488b18.png",
    href: "https://open.spotify.com/",
  },
  {
    label: "Instagram",
    iconUrl:
      "https://static.wixstatic.com/media/81af6121f84c41a5b4391d7d37fce12a.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/81af6121f84c41a5b4391d7d37fce12a.png",
    href: "https://instagram.com/maylecor",
  },
  {
    label: "Facebook",
    iconUrl:
      "https://static.wixstatic.com/media/23fd2a2be53141ed810f4d3dcdcd01fa.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/23fd2a2be53141ed810f4d3dcdcd01fa.png",
    href: "https://www.facebook.com/maylecor",
  },
  {
    label: "YouTube",
    iconUrl:
      "https://static.wixstatic.com/media/203dcdc2ac8b48de89313f90d2a4cda1.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/203dcdc2ac8b48de89313f90d2a4cda1.png",
    href: "https://youtube.com/user/maylecor",
  },
] as const;

/** Per-song listen destinations (icons in Music page). Paste real track URLs in the editor. */
export const MAYLECOR_LISTEN_PLATFORMS = [
  { id: "spotify", label: "Spotify", icon: "spotify" },
  { id: "apple", label: "Apple Music", icon: "apple" },
  { id: "youtube", label: "YouTube", icon: "youtube" },
  { id: "soundcloud", label: "SoundCloud", icon: "soundcloud" },
] as const;

export function defaultMaylecorTracks() {
  return [
    {
      id: "track-1",
      title: "New single",
      coverUrl: MAYLECOR_LOCAL_ASSETS.logoStacked,
      links: [
        { platform: "spotify", href: "" },
        { platform: "apple", href: "" },
        { platform: "youtube", href: "" },
        { platform: "soundcloud", href: "https://soundcloud.com/maylecor" },
      ],
    },
    {
      id: "track-2",
      title: "Track 2",
      coverUrl: MAYLECOR_LOCAL_ASSETS.mayFigure,
      links: [
        { platform: "spotify", href: "" },
        { platform: "apple", href: "" },
        { platform: "youtube", href: "" },
        { platform: "soundcloud", href: "" },
      ],
    },
    {
      id: "track-3",
      title: "Track 3",
      coverUrl: MAYLECOR_LOCAL_ASSETS.portrait,
      links: [
        { platform: "spotify", href: "" },
        { platform: "apple", href: "" },
        { platform: "youtube", href: "" },
        { platform: "soundcloud", href: "" },
      ],
    },
  ];
}

/** For The Mayjor Good — separate foundation site (edit URL in nav). */
export const MAYJOR_GOOD_SITE_HREF = "https://forthemayjorgood.com";

export function defaultMaylecorHomeProps(artistName = "MAY LECOR") {
  return {
    artistName,
    backgroundImage: MAYLECOR_WIX.backgroundBlur,
    portraitMain: MAYLECOR_WIX.portraitMain,
    collageTop: MAYLECOR_WIX.collageTop,
    collageMiddle: MAYLECOR_WIX.collageMiddle,
    logoBanner: MAYLECOR_WIX.logoBanner,
    bottomLeft: MAYLECOR_WIX.bottomLeft,
    bottomRight: MAYLECOR_WIX.bottomRight,
    logoSmall: MAYLECOR_WIX.logoSmall,
    ctaLabel: "LISTEN TO MAY'S NEW SINGLE",
    musicPageSlug: "music",
    homeLogoHref: "#top",
    socialLinks: MAYLECOR_SOCIAL_DEFAULTS.map((s) => ({ ...s })),
    socialRailVisible: true,
    socialRailBg: "rgba(0,0,0,0.85)",
    socialRailLeftPct: 0,
    socialRailTopPct: 12,
    socialRailIconSize: 40,
    motionEnabled: true,
  };
}

export function defaultMaylecorMusicProps(artistName = "MAY LECOR") {
  return {
    artistName,
    albumArt: MAYLECOR_WIX.albumArt,
    homePageSlug: "home",
    tracks: defaultMaylecorTracks(),
    socialLinks: MAYLECOR_SOCIAL_DEFAULTS.map((s) => ({ ...s })),
    socialRailVisible: true,
    socialRailBg: "rgba(0,0,0,0.85)",
    socialRailLeftPct: 0,
    socialRailTopPct: 12,
    socialRailIconSize: 40,
    motionEnabled: true,
  };
}

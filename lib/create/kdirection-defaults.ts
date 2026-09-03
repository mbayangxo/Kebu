import { defaultDeviceLayoutsForCollage } from "@/lib/create/builder-device";
import {
  isBlockedRemoteMedia,
  isUserUploadedSiteAsset,
  KDIRECTION_ICON_ASSETS,
  KDIRECTION_PORTRAIT,
  localizeKdirectionAssetUrl,
  localizeKdirectionIconUrl,
} from "@/lib/create/kdirection-local-assets";

/**
 * Exact Wix home look from kdirectionartistry.wixsite.com/k-direction:
 * multi-radial soft gradient, Oswald wordmark + mirror, yellow pill nav,
 * scattered tilted photo collage (editable).
 *
 * Collage photos + social icons are Kebu-hosted — Wix CDN returns 403 in the builder.
 */
export const KDIRECTION_WIX_GRADIENT =
  "radial-gradient(circle at 11.6667% 0%, rgb(248, 188, 250) 0%, 17.5%, rgba(248, 188, 250, 0) 35%), " +
  "radial-gradient(circle at 0% 80.8333%, rgb(77, 96, 1) 0%, 17.5%, rgba(77, 96, 1, 0) 35%), " +
  "radial-gradient(circle at 3.67513% 6.9401%, rgb(77, 96, 1) 0%, 11.55%, rgba(77, 96, 1, 0) 35%), " +
  "radial-gradient(circle at 6.25% 9.16667%, rgb(250, 170, 99) 0%, 17.5%, rgba(250, 170, 99, 0) 35%), " +
  "radial-gradient(circle at 95.2067% 90.4818%, rgb(201, 198, 255) 0%, 34.1%, rgba(201, 198, 255, 0) 55%), " +
  "radial-gradient(circle at 4.31315% 93.3464%, rgb(151, 180, 157) 0%, 29.9%, rgba(151, 180, 157, 0) 65%), " +
  "radial-gradient(circle at 55.4167% 60%, rgba(242, 153, 244, 0.99) 0%, 25%, rgba(242, 153, 244, 0) 50%), " +
  "radial-gradient(circle at 51.1214% 89.987%, rgb(147, 195, 255) 0%, 42%, rgba(147, 195, 255, 0) 70%), " +
  "radial-gradient(circle at 48.9014% 49.5215%, rgb(0, 0, 0) 0%, 100%, rgba(0, 0, 0, 0) 100%)";

export const KDIRECTION_DEFAULTS = {
  navButtonBg: "#FFF86B",
  logoColor: "#FFFFFF",
  logoMirrorColor: "#F5C4B8",
  displayFont: "Oswald",
  footerText: "2024 ©K-Direction. All Rights Reserved.",
  featuredArtistName: "MAY L'ECOR",
} as const;

/** Default collage photos — swap each URL in the editor (Shopify-style). Includes tablet/phone layouts. */
export function defaultKdirectionCollagePhotos() {
  const base = [
    {
      src: KDIRECTION_PORTRAIT,
      alt: "Artist portrait",
      rotate: -18,
      topPct: 12,
      leftPct: 8,
      widthPct: 18,
      zIndex: 4,
    },
    {
      src: KDIRECTION_PORTRAIT,
      alt: "Studio pose",
      rotate: 12,
      topPct: 8,
      leftPct: 58,
      widthPct: 16,
      zIndex: 5,
    },
    {
      src: KDIRECTION_PORTRAIT,
      alt: "Texture detail",
      rotate: -8,
      topPct: 42,
      leftPct: 72,
      widthPct: 15,
      zIndex: 3,
    },
    {
      src: KDIRECTION_PORTRAIT,
      alt: "Portrait",
      rotate: 22,
      topPct: 48,
      leftPct: 14,
      widthPct: 17,
      zIndex: 6,
    },
    {
      src: KDIRECTION_PORTRAIT,
      alt: "Pose",
      rotate: -25,
      topPct: 58,
      leftPct: 48,
      widthPct: 14,
      zIndex: 4,
    },
    {
      src: KDIRECTION_PORTRAIT,
      alt: "Detail",
      rotate: 8,
      topPct: 28,
      leftPct: 38,
      widthPct: 13,
      zIndex: 2,
    },
  ];
  return base.map((photo, index) => ({
    ...photo,
    ...defaultDeviceLayoutsForCollage(photo, index),
  }));
}

export const KDIRECTION_NAV_DEFAULTS = [
  { label: "Artist", href: "/artists" },
  { label: "Events", href: "/events" },
  { label: "News", href: "/news" },
  { label: "Contact", href: "/contact" },
  { label: "About us", href: "/about" },
  { label: "Services", href: "/services" },
] as const;

export const KDIRECTION_SOCIAL_DEFAULTS = [
  {
    label: "Instagram",
    iconUrl: KDIRECTION_ICON_ASSETS.Instagram,
    href: "https://instagram.com/",
  },
  {
    label: "YouTube",
    iconUrl: KDIRECTION_ICON_ASSETS.YouTube,
    href: "https://youtube.com/",
  },
  {
    label: "Spotify",
    iconUrl: KDIRECTION_ICON_ASSETS.Spotify,
    href: "https://open.spotify.com/",
  },
] as const;

export function defaultKdirectionHomeProps() {
  return {
    brandLine1: "K",
    brandLine2: "DIRECTION",
    showMirrorLogo: true,
    mission: "",
    backgroundImage: "",
    backgroundCss: KDIRECTION_WIX_GRADIENT,
    showOverlay: false,
    overlayOpacity: 0,
    gradientFrom: "#f8bcfa",
    gradientVia: "#c9c6ff",
    gradientTo: "#93c3ff",
    logoColor: KDIRECTION_DEFAULTS.logoColor,
    logoMirrorColor: KDIRECTION_DEFAULTS.logoMirrorColor,
    displayFont: KDIRECTION_DEFAULTS.displayFont,
    navButtonBg: KDIRECTION_DEFAULTS.navButtonBg,
    logoImage: "",
    showHomeIcon: true,
    showArrows: true,
    featuredArtistName: KDIRECTION_DEFAULTS.featuredArtistName,
    featuredArtistImage: KDIRECTION_PORTRAIT,
    featuredArtistHref: "/artists",
    newsCardLabel: "News",
    newsCardHref: "/news",
    brandCardLabel: "K-DIRECTION",
    brandCardHref: "/about",
    collagePhotos: defaultKdirectionCollagePhotos(),
    navLinks: KDIRECTION_NAV_DEFAULTS.map((l) => ({ ...l })),
    socialLinks: KDIRECTION_SOCIAL_DEFAULTS.map((s) => ({ ...s })),
    footerText: KDIRECTION_DEFAULTS.footerText,
    motionEnabled: true,
  };
}

export function defaultKdirectionPageProps(title = "About us") {
  return {
    title,
    subtitle: "",
    body:
      title === "About us"
        ? "K-Direction is a creative label and artistry house — artist development, visual direction, and campaigns from Dakar to the world."
        : title === "Services"
          ? "Artist development, creative direction, label operations, and campaigns tailored to each artist."
          : title === "Contact"
            ? "Bookings and management inquiries — we reply on email."
            : "Update this page in the editor — swap photos, text, and links.",
    heroImage: "",
    showOverlay: false,
    overlayOpacity: 0.35,
    backgroundImage: "",
    backgroundCss: KDIRECTION_WIX_GRADIENT,
    displayFont: KDIRECTION_DEFAULTS.displayFont,
    navButtonBg: KDIRECTION_DEFAULTS.navButtonBg,
    ctaLabel: title === "Contact" ? "Email management" : "",
    ctaHref: title === "Contact" ? "mailto:mgmt@k-direction.com" : "",
    navLinks: KDIRECTION_NAV_DEFAULTS.map((l) => ({ ...l })),
    socialLinks: KDIRECTION_SOCIAL_DEFAULTS.map((s) => ({ ...s })),
    footerText: KDIRECTION_DEFAULTS.footerText,
  };
}

function ensureCollageDeviceLayouts(photos: unknown): unknown {
  if (!Array.isArray(photos)) return photos;
  return photos.map((photo, index) => {
    if (!photo || typeof photo !== "object") return photo;
    const p = photo as Record<string, unknown>;
    const src = localizeKdirectionAssetUrl(String(p.src ?? ""));
    const base = {
      src: src || KDIRECTION_PORTRAIT,
      alt: typeof p.alt === "string" ? p.alt : "",
      rotate: Number(p.rotate ?? 0),
      topPct: Number(p.topPct ?? 10),
      leftPct: Number(p.leftPct ?? 10),
      widthPct: Number(p.widthPct ?? 16),
      zIndex: typeof p.zIndex === "number" ? p.zIndex : 3,
    };
    if (p.tablet && p.mobile && !isBlockedRemoteMedia(String(p.src ?? ""))) {
      return { ...p, src: base.src };
    }
    return {
      ...p,
      ...defaultDeviceLayoutsForCollage(base, index),
      src: base.src,
      tablet: p.tablet ?? defaultDeviceLayoutsForCollage(base, index).tablet,
      mobile: p.mobile ?? defaultDeviceLayoutsForCollage(base, index).mobile,
    };
  });
}

/** Force local collage/social when Wix CDN URLs would 403 → black empty builder. */
export function normalizeKdirectionHomeProps(props: Record<string, unknown>): Record<string, unknown> {
  const next = defaultKdirectionHomeProps();
  const missingCollage =
    !Array.isArray(props.collagePhotos) || (props.collagePhotos as unknown[]).length === 0;
  const collageHasBlocked =
    Array.isArray(props.collagePhotos) &&
    (props.collagePhotos as { src?: string }[]).some((p) => isBlockedRemoteMedia(String(p?.src ?? "")));
  const missingWixBg = !String(props.backgroundCss ?? "").includes("radial-gradient");

  const socialLinks = Array.isArray(props.socialLinks)
    ? (props.socialLinks as { label?: string; iconUrl?: string; href?: string }[]).map((link) => ({
        ...link,
        iconUrl: localizeKdirectionIconUrl(String(link.label ?? ""), link.iconUrl),
      }))
    : next.socialLinks;

  let featuredArtistImage = localizeKdirectionAssetUrl(String(props.featuredArtistImage ?? ""));
  if (!featuredArtistImage || isBlockedRemoteMedia(String(props.featuredArtistImage ?? ""))) {
    featuredArtistImage = next.featuredArtistImage;
  }

  let backgroundImage = String(props.backgroundImage ?? "");
  if (isBlockedRemoteMedia(backgroundImage) && !isUserUploadedSiteAsset(backgroundImage)) {
    backgroundImage = "";
  }

  return {
    ...next,
    ...props,
    backgroundCss: missingWixBg ? next.backgroundCss : props.backgroundCss,
    backgroundImage,
    collagePhotos: missingCollage || collageHasBlocked
      ? missingCollage
        ? next.collagePhotos
        : ensureCollageDeviceLayouts(props.collagePhotos)
      : ensureCollageDeviceLayouts(props.collagePhotos),
    displayFont: props.displayFont ?? next.displayFont,
    navButtonBg: props.navButtonBg ?? next.navButtonBg,
    logoColor: props.logoColor ?? next.logoColor,
    logoMirrorColor: props.logoMirrorColor ?? next.logoMirrorColor,
    logoImage: props.logoImage ?? "",
    showHomeIcon: props.showHomeIcon ?? true,
    showArrows: props.showArrows ?? true,
    showOverlay: props.showOverlay ?? false,
    featuredArtistImage,
    socialLinks,
  };
}

export function normalizeKdirectionPageProps(props: Record<string, unknown>): Record<string, unknown> {
  const next = defaultKdirectionPageProps(String(props.title ?? "About us"));
  const missingWixBg = !String(props.backgroundCss ?? "").includes("radial-gradient");
  let heroImage = localizeKdirectionAssetUrl(String(props.heroImage ?? ""));
  if (isBlockedRemoteMedia(String(props.heroImage ?? "")) && !isUserUploadedSiteAsset(String(props.heroImage ?? ""))) {
    heroImage = KDIRECTION_PORTRAIT;
  }
  let backgroundImage = String(props.backgroundImage ?? "");
  if (isBlockedRemoteMedia(backgroundImage) && !isUserUploadedSiteAsset(backgroundImage)) {
    backgroundImage = "";
  }
  const socialLinks = Array.isArray(props.socialLinks)
    ? (props.socialLinks as { label?: string; iconUrl?: string; href?: string }[]).map((link) => ({
        ...link,
        iconUrl: localizeKdirectionIconUrl(String(link.label ?? ""), link.iconUrl),
      }))
    : next.socialLinks;

  return {
    ...next,
    ...props,
    backgroundCss: missingWixBg ? next.backgroundCss : props.backgroundCss,
    backgroundImage,
    heroImage,
    socialLinks,
    displayFont: props.displayFont ?? next.displayFont,
    navButtonBg: props.navButtonBg ?? next.navButtonBg,
  };
}

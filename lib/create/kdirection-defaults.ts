import { MAYLECOR_WIX } from "@/lib/create/maylecor-defaults";
import { defaultDeviceLayoutsForCollage } from "@/lib/create/builder-device";

/**
 * Exact Wix home look from kdirectionartistry.wixsite.com/k-direction:
 * multi-radial soft gradient, Oswald wordmark + mirror, yellow pill nav,
 * scattered tilted photo collage (editable).
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
      src: MAYLECOR_WIX.portraitMain,
      alt: "Artist portrait",
      rotate: -18,
      topPct: 12,
      leftPct: 8,
      widthPct: 18,
      zIndex: 4,
    },
    {
      src: MAYLECOR_WIX.bottomLeft,
      alt: "Studio pose",
      rotate: 12,
      topPct: 8,
      leftPct: 58,
      widthPct: 16,
      zIndex: 5,
    },
    {
      src: MAYLECOR_WIX.bottomRight,
      alt: "Texture detail",
      rotate: -8,
      topPct: 42,
      leftPct: 72,
      widthPct: 15,
      zIndex: 3,
    },
    {
      src: MAYLECOR_WIX.collageTop,
      alt: "Portrait",
      rotate: 22,
      topPct: 48,
      leftPct: 14,
      widthPct: 17,
      zIndex: 6,
    },
    {
      src: MAYLECOR_WIX.bottomLeft,
      alt: "Pose",
      rotate: -25,
      topPct: 58,
      leftPct: 48,
      widthPct: 14,
      zIndex: 4,
    },
    {
      src: MAYLECOR_WIX.bottomRight,
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
    iconUrl:
      "https://static.wixstatic.com/media/81af6121f84c41a5b4391d7d37fce12a.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/81af6121f84c41a5b4391d7d37fce12a.png",
    href: "https://instagram.com/",
  },
  {
    label: "YouTube",
    iconUrl:
      "https://static.wixstatic.com/media/203dcdc2ac8b48de89313f90d2a4cda1.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/203dcdc2ac8b48de89313f90d2a4cda1.png",
    href: "https://youtube.com/",
  },
  {
    label: "Spotify",
    iconUrl:
      "https://static.wixstatic.com/media/e18eec328e7446079b7c7cef09488b18.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/e18eec328e7446079b7c7cef09488b18.png",
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
    featuredArtistImage: MAYLECOR_WIX.portraitMain,
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

import type { WebsiteDefinition } from "./website-schema";

/**
 * RECT — music platform + music label (Kebu portfolio site).
 * Not a Netflix clone, not a social app — those stay off this codebase.
 * Brand: lime green · black · orange.
 */
export const RECT_AESTHETIC_ID = "rect-signal" as const;

export const RECT_LIME = "#B8FF00";
export const RECT_BLACK = "#050505";
export const RECT_ORANGE = "#FF5500";

export function rectBrandTheme(): WebsiteDefinition["theme"] {
  return {
    primary: RECT_BLACK,
    accent: RECT_LIME,
    background: RECT_BLACK,
    text: "#F5F5F0",
    fontDisplay: "Oswald",
    fontBody: "system-ui",
    spacing: "airy",
    bodySize: "md",
    headingScale: "xl",
    letterSpacing: "wide",
    aestheticId: RECT_AESTHETIC_ID,
  };
}

export const RECT_NAV = [
  { label: "Home", href: "/" },
  { label: "Music", href: "/music" },
  { label: "Label", href: "/label" },
  { label: "Company", href: "/company" },
  { label: "Contact", href: "/contact" },
] as const;

function navSection(pageId: string) {
  return {
    id: `rect-nav-${pageId}`,
    type: "navigation" as const,
    props: { brand: "RECT", links: [...RECT_NAV] },
  };
}

function footerSection(pageId: string) {
  return {
    id: `rect-footer-${pageId}`,
    type: "footer" as const,
    props: {
      text: "RECT — music platform · label. Lime. Black. Orange.",
      links: [
        { label: "Music", href: "/music" },
        { label: "Company", href: "/company" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

/** Multi-page RECT entertainment tech site — owner portfolio on Kebu. */
export function rectWebsiteDefinition(): WebsiteDefinition {
  const theme = rectBrandTheme();
  return {
    schemaVersion: "website-v1",
    title: "RECT",
    theme,
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          navSection("home"),
          {
            id: "rect-hero",
            type: "hero",
            props: {
              heading: "RECT",
              subheading:
                "Entertainment tech for Africa and the world — music streaming and a real label. Lime. Black. Orange.",
              buttonLabel: "Enter music",
              buttonHref: "/music",
              align: "left",
              background: RECT_BLACK,
            },
          },
          {
            id: "rect-home-signal",
            type: "text",
            props: {
              heading: "Music first.",
              body:
                "RECT is entertainment technology focused on music — streaming and a label under one roof. This Kebu site is that music/label presence only — not a social app or Watch product.",
            },
          },
          {
            id: "rect-home-pillars",
            type: "features",
            props: {
              heading: "The RECT stack",
              items: [
                {
                  title: "Music",
                  body: "Streaming and discovery — listen, follow artists, and feel the catalog as a living platform.",
                },
                {
                  title: "Label",
                  body: "RECT owns a music label: A&R, releases, campaigns, and artist careers under one roof.",
                },
              ],
            },
          },
          {
            id: "rect-home-cta",
            type: "features",
            props: {
              heading: "Brand system",
              items: [
                {
                  title: "Lime",
                  body: "Signal and energy — the color of go. Accents, CTAs, and live moments.",
                },
                {
                  title: "Black",
                  body: "Stage and night — the canvas for music, film, and focus.",
                },
                {
                  title: "Orange",
                  body: `Heat and motion — secondary punch (${RECT_ORANGE}) beside lime on black.`,
                },
              ],
            },
          },
          {
            id: "rect-home-whatsapp",
            type: "whatsapp",
            props: {
              label: "Talk to RECT",
              phone: "+221770000000",
              message: "Hello RECT — I want to connect about music / label / partnerships.",
            },
          },
          footerSection("home"),
        ],
      },
      {
        slug: "music",
        title: "Music",
        sections: [
          navSection("music"),
          {
            id: "rect-music-hero",
            type: "hero",
            props: {
              heading: "Music first",
              subheading:
                "RECT is a music platform — streaming, discovery, and artist presence. This is the product we lead with.",
              buttonLabel: "Label roster",
              buttonHref: "/label",
              align: "left",
              background: RECT_BLACK,
            },
          },
          {
            id: "rect-music-body",
            type: "text",
            props: {
              heading: "Stream the culture",
              body:
                "RECT Music is built for African youth and global listeners who want catalogs that feel alive — singles, albums, playlists, and artist pages tied to a real label. Replace this copy with your live catalog, featured releases, and listen links when you connect players.",
            },
          },
          {
            id: "rect-music-features",
            type: "features",
            props: {
              heading: "Platform pillars",
              items: [
                {
                  title: "Listen",
                  body: "High-quality audio experiences on phone and web — low-data modes matter for Africa.",
                },
                {
                  title: "Discover",
                  body: "Editorial and algorithmic discovery that respects taste, language, and region.",
                },
                {
                  title: "Artists",
                  body: "Profiles, drops, and tours connected to RECT Label operations.",
                },
              ],
            },
          },
          {
            id: "rect-music-audio",
            type: "audio",
            props: {
              heading: "Featured drop",
              title: "RECT Signal — preview",
              artist: "RECT",
              src: "",
            },
          },
          footerSection("music"),
        ],
      },
      {
        slug: "label",
        title: "Label",
        sections: [
          navSection("label"),
          {
            id: "rect-label-hero",
            type: "hero",
            props: {
              heading: "RECT Label",
              subheading:
                "We own a music label — signing, developing, releasing, and campaigning for artists who want a real machine behind the music.",
              buttonLabel: "Contact A&R",
              buttonHref: "/contact",
              align: "left",
              background: RECT_BLACK,
            },
          },
          {
            id: "rect-label-body",
            type: "text",
            props: {
              heading: "House of artists",
              body:
                "RECT Label sits inside the same company as the streaming platform. Releases can move from studio to catalog without a dozen disconnected vendors. Swap this for your real roster, imprint names, and release calendar.",
            },
          },
          {
            id: "rect-label-services",
            type: "features",
            props: {
              heading: "Label work",
              items: [
                { title: "A&R", body: "Find and develop talent with long-game careers, not one-hit noise." },
                { title: "Releases", body: "Singles, EPs, albums — distribution into RECT Music and partners." },
                { title: "Campaigns", body: "Visuals, press, playlists, and tour support under one brand." },
              ],
            },
          },
          footerSection("label"),
        ],
      },

      {
        slug: "company",
        title: "Company",
        sections: [
          navSection("company"),
          {
            id: "rect-company-hero",
            type: "hero",
            props: {
              heading: "Entertainment tech company",
              subheading:
                "RECT is a music platform and label company — built on Kebu, not a fake streaming or social network.",
              buttonLabel: "Work with us",
              buttonHref: "/contact",
              align: "left",
              background: RECT_BLACK,
            },
          },
          {
            id: "rect-company-body",
            type: "text",
            props: {
              heading: "Mission",
              body:
                "Build African-rooted music infrastructure: catalog, artists, and label ops first. Brand colors — lime, black, orange — signal energy and stage heat.",
            },
          },
          {
            id: "rect-company-roadmap",
            type: "faq",
            props: {
              heading: "Roadmap (honest)",
              items: [
                {
                  question: "What is live now?",
                  answer:
                    "This RECT website on Kebu, music platform positioning, and RECT Label identity. Connect real catalog and listen links as products ship.",
                },
                {
                  question: "What is next?",
                  answer:
                    "Deeper music streaming product and label operations. Film or social products are not built on this Kebu site.",
                },
                {
                  question: "What is not here?",
                  answer:
                    "No Netflix-style Watch app and no social network in this codebase — Kebu hosts the RECT music/label site only.",
                },
              ],
            },
          },
          footerSection("company"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          navSection("contact"),
          {
            id: "rect-contact-hero",
            type: "hero",
            props: {
              heading: "Contact RECT",
              subheading: "Label, partnerships, press, tech — send a clear note. We reply on WhatsApp or email.",
              buttonLabel: "WhatsApp",
              buttonHref: "#whatsapp",
              align: "left",
              background: RECT_BLACK,
            },
          },
          {
            id: "rect-contact",
            type: "contact",
            props: {
              heading: "Reach the team",
              email: "hello@rect.africa",
              phone: "+221 77 000 00 00",
              address: "Dakar · Africa · worldwide",
            },
          },
          {
            id: "rect-contact-whatsapp",
            type: "whatsapp",
            props: {
              label: "Chat on WhatsApp",
              phone: "+221770000000",
              message: "Hello RECT —",
            },
          },
          {
            id: "rect-contact-newsletter",
            type: "newsletter",
            props: {
              heading: "RECT signal",
              subheading: "Drops and label news — no spam.",
              buttonLabel: "Subscribe",
              successMessage: "You're on the RECT list.",
            },
          },
          footerSection("contact"),
        ],
      },
    ],
  };
}

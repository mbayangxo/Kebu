import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Fashion Atelier — editorial lookbook design world (public template).
 * Archetype: fashion brand · IA = Home · Lookbook · About · Contact
 * No May Lecor assets — Unsplash editorial frames (editable in Media).
 */

const LOOKS = [
  {
    src: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    alt: "Look 01 — studio frame",
  },
  {
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
    alt: "Look 02 — fitting",
  },
  {
    src: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80",
    alt: "Look 03 — film still",
  },
  {
    src: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80",
    alt: "Look 04 — runway light",
  },
] as const;

const NAV = [
  { label: "Lookbook", href: "/lookbook" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export function fashionAtelierWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Fashion Atelier",
    theme: {
      primary: "#1A1410",
      accent: "#C45C6E",
      background: "#FBF7F2",
      text: "#1A1410",
      fontDisplay: "Fraunces",
      fontBody: "IBM Plex Sans",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "rose-atelier",
    },
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "nav-atelier",
            type: "navigation",
            props: {
              brand: "Atelier Brume",
              links: [...NAV],
            },
          },
          {
            id: "hero-atelier",
            type: "hero",
            props: {
              heading: "Crafted for the modern African wardrobe",
              subheading:
                "Ready-to-wear and made-to-measure with local textiles — seasonal drops, not endless inventory.",
              buttonLabel: "View lookbook",
              buttonHref: "/lookbook",
              align: "left",
              background: "#FBF7F2",
            },
          },
          {
            id: "gallery-atelier",
            type: "gallery",
            props: {
              heading: "Season One",
              layout: "featured",
              columns: 3,
              items: LOOKS.map((l) => ({ ...l, href: "/lookbook" })),
            },
          },
          {
            id: "features-atelier",
            type: "features",
            props: {
              heading: "Why Atelier Brume",
              items: [
                { title: "Local textiles", body: "Sourcing from regional weavers and makers." },
                { title: "Made to measure", body: "Fits that respect your style and climate." },
                { title: "Seasonal drops", body: "Limited collections — when it's gone, it's gone." },
              ],
            },
          },
          {
            id: "footer-atelier",
            type: "footer",
            props: {
              text: "© Atelier Brume",
              links: [
                { label: "Lookbook", href: "/lookbook" },
                { label: "Contact", href: "/contact" },
              ],
            },
          },
        ],
      },
      {
        slug: "lookbook",
        title: "Lookbook",
        sections: [
          {
            id: "lookbook-nav",
            type: "navigation",
            props: { brand: "Atelier Brume", links: [...NAV] },
          },
          {
            id: "lookbook-hero",
            type: "hero",
            props: {
              heading: "Lookbook",
              subheading: "Editorial frames from our latest collection.",
              buttonLabel: "Book a fitting",
              buttonHref: "/contact",
              align: "center",
              background: "#FBF7F2",
            },
          },
          {
            id: "lookbook-gallery",
            type: "gallery",
            props: {
              heading: "Collection frames",
              layout: "grid",
              columns: 2,
              items: [...LOOKS],
            },
          },
          {
            id: "lookbook-text",
            type: "text",
            props: {
              heading: "Made in Dakar",
              body: "Each piece is cut, fitted, and finished in our studio. WhatsApp for made-to-measure.",
            },
          },
          {
            id: "lookbook-footer",
            type: "footer",
            props: {
              text: "© Atelier Brume",
              links: [{ label: "Contact", href: "/contact" }],
            },
          },
        ],
      },
      {
        slug: "about",
        title: "About",
        sections: [
          {
            id: "about-nav",
            type: "navigation",
            props: { brand: "Atelier Brume", links: [...NAV] },
          },
          {
            id: "about-hero",
            type: "hero",
            props: {
              heading: "About the atelier",
              subheading: "A fashion house built around climate, craft, and real fittings.",
              buttonLabel: "See the lookbook",
              buttonHref: "/lookbook",
              align: "left",
              background: "#FBF7F2",
            },
          },
          {
            id: "about-body",
            type: "text",
            props: {
              heading: "Our story",
              body: "Atelier Brume exists so African fashion brands get a lookbook site — not a generic three-card template. Edit this page, swap photos, add or remove sections until the scroll feels right.",
            },
          },
          {
            id: "about-footer",
            type: "footer",
            props: {
              text: "© Atelier Brume",
              links: [{ label: "Contact", href: "/contact" }],
            },
          },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          {
            id: "contact-nav",
            type: "navigation",
            props: { brand: "Atelier Brume", links: [...NAV] },
          },
          {
            id: "contact-hero",
            type: "hero",
            props: {
              heading: "Visit the atelier",
              subheading: "Appointments, fittings, and wholesale inquiries.",
              buttonLabel: "WhatsApp us",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#FBF7F2",
            },
          },
          {
            id: "contact-form",
            type: "form",
            props: {
              heading: "Book a fitting",
              subheading: "Tell us what you need — we reply on WhatsApp or email.",
              buttonLabel: "Send",
              successMessage: "Thanks — Atelier Brume received your note.",
              fields: [
                { id: "name", label: "Name", type: "text", required: true, placeholder: "", options: [] },
                { id: "email", label: "Email", type: "email", required: true, placeholder: "", options: [] },
                {
                  id: "message",
                  label: "Message",
                  type: "textarea",
                  required: true,
                  placeholder: "Fitting, wholesale, or press?",
                  options: [],
                },
              ],
            },
          },
          {
            id: "contact-block",
            type: "contact",
            props: {
              heading: "Studio",
              email: "hello@atelierbrume.example",
              phone: "+221770000000",
              address: "Plateau, Dakar — edit in editor",
            },
          },
          {
            id: "contact-wa",
            type: "whatsapp",
            props: {
              label: "Chat on WhatsApp",
              phone: "+221770000000",
              message: "Hello Atelier Brume — I'd like to book a fitting.",
            },
          },
          {
            id: "contact-footer",
            type: "footer",
            props: {
              text: "© Atelier Brume",
              links: [{ label: "Home", href: "/home" }],
            },
          },
        ],
      },
    ],
  };
}

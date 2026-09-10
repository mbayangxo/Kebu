import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Perfume Maison — fragrance house design world (public aesthetic).
 * Archetype: scent brand · IA = Home · Shop · Story · Stockists · FAQ · Contact
 */

const BOTTLE = "";
const COLLECTION = "";
const FLAT = "";
const MIST = "";
const GIFT = "";

const NAV = [
  { label: "Shop", href: "/shop" },
  { label: "Story", href: "/story" },
  { label: "Stockists", href: "/stockists" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
] as const;

const PRODUCTS = [
  {
    name: "Signature 50ml",
    description: "Day to night — citrus, amber, musk.",
    priceLabel: "45,000 FCFA",
    imageUrl: BOTTLE,
    whatsappMessage: "Hi Maison — I want Signature 50ml.",
  },
  {
    name: "Coastal 30ml",
    description: "Salt air, baobab flower, light woods.",
    priceLabel: "32,000 FCFA",
    imageUrl: COLLECTION,
    whatsappMessage: "Hi Maison — I want Coastal 30ml.",
  },
  {
    name: "Discovery kit",
    description: "Three 5ml samples + story card.",
    priceLabel: "18,000 FCFA",
    imageUrl: FLAT,
    whatsappMessage: "Hi Maison — I want the Discovery kit.",
  },
] as const;

function nav(id: string) {
  return { id, type: "navigation" as const, props: { brand: "Maison Brume", links: [...NAV] } };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Maison Brume — scents inspired by Africa.",
      links: [
        { label: "Shop", href: "/shop" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function perfumeMaisonWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Maison Brume",
    theme: {
      primary: "#1A0A14",
      accent: "#C9A962",
      background: "#F7F2EC",
      text: "#1A0A14",
      fontDisplay: "Playfair Display",
      fontBody: "IBM Plex Sans",
      spacing: "airy",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "wide",
      aestheticId: "coast-linen",
    },
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          nav("maison-nav-home"),
          {
            id: "maison-hero",
            type: "hero",
            props: {
              heading: "Scents inspired by Africa",
              subheading:
                "Eau de parfum in limited batches — oud, baobab flower, and coastal notes. Shop, discover stockists, gift someone.",
              buttonLabel: "Shop collection",
              buttonHref: "/shop",
              align: "center",
              background: "#1A0A14",
            },
          },
          {
            id: "maison-hero-img",
            type: "image",
            props: { src: BOTTLE, alt: "Maison Brume signature bottle", caption: "Signature · 50ml" },
          },
          {
            id: "maison-bestsellers",
            type: "products",
            props: {
              heading: "Bestsellers",
              layout: "grid",
              columns: 3,
              orderStyle: "card",
              orderCtaLabel: "Order",
              items: [...PRODUCTS],
            },
          },
          {
            id: "maison-gallery",
            type: "gallery",
            props: {
              heading: "Atmosphere",
              layout: "featured",
              columns: 3,
              items: [
                { src: COLLECTION, alt: "Collection", href: "/shop" },
                { src: MIST, alt: "Mist", href: "/shop" },
                { src: GIFT, alt: "Gift", href: "/shop" },
              ],
            },
          },
          {
            id: "maison-reviews",
            type: "testimonials",
            props: {
              heading: "Reviews",
              items: [
                { quote: "Lasts all day — compliments every time.", name: "Customer, Dakar" },
                { quote: "Luxury that feels African, not copied.", name: "Boutique owner" },
              ],
            },
          },
          {
            id: "maison-newsletter",
            type: "newsletter",
            props: {
              heading: "Batch alerts",
              subheading: "Be first when limited drops restock.",
              buttonLabel: "Join",
            },
          },
          {
            id: "maison-popup",
            type: "email-popup",
            props: {
              enabled: true,
              mode: "email",
              heading: "Discover the house",
              body: "Get drop notes and stockist news.",
              buttonLabel: "Subscribe",
              dismissLabel: "No thanks",
              delaySeconds: 6,
            },
          },
          footer("maison-footer-home"),
        ],
      },
      {
        slug: "shop",
        title: "Shop",
        sections: [
          nav("maison-nav-shop"),
          {
            id: "maison-shop-hero",
            type: "hero",
            props: {
              heading: "Shop",
              subheading: "Full catalog — edit prices and photos after you add the aesthetic.",
              buttonLabel: "Ask a nose question",
              buttonHref: "/contact",
              align: "center",
              background: "#F7F2EC",
            },
          },
          {
            id: "maison-shop-products",
            type: "products",
            props: {
              heading: "All scents",
              layout: "grid",
              columns: 3,
              orderStyle: "sheet",
              items: [
                ...PRODUCTS,
                {
                  name: "Gift set",
                  description: "Signature + Discovery kit.",
                  priceLabel: "58,000 FCFA",
                  imageUrl: GIFT,
                  whatsappMessage: "Hi Maison — gift set please.",
                },
              ],
            },
          },
          footer("maison-footer-shop"),
        ],
      },
      {
        slug: "story",
        title: "Story",
        sections: [
          nav("maison-nav-story"),
          {
            id: "maison-story-hero",
            type: "hero",
            props: {
              heading: "Our story",
              subheading: "A fragrance house built for African climate and taste — not winter-only formulas.",
              buttonLabel: "Shop",
              buttonHref: "/shop",
              align: "left",
              background: "#F7F2EC",
            },
          },
          {
            id: "maison-story-img",
            type: "image",
            props: { src: FLAT, alt: "Ingredients flat lay", caption: "Notes you can smell" },
          },
          {
            id: "maison-story-body",
            type: "text",
            props: {
              heading: "The nose",
              body: "Maison Brume is a multipage fragrance world — shop, story, stockists, FAQ, contact — so scent brands can edit length (add/remove sections) without becoming a one-page brochure.",
            },
          },
          footer("maison-footer-story"),
        ],
      },
      {
        slug: "stockists",
        title: "Stockists",
        sections: [
          nav("maison-nav-stockists"),
          {
            id: "maison-stockists-hero",
            type: "hero",
            props: {
              heading: "Stockists",
              subheading: "Find Maison Brume in boutiques — or order direct.",
              buttonLabel: "Order WhatsApp",
              buttonHref: "/contact",
              align: "center",
              background: "#F7F2EC",
            },
          },
          {
            id: "maison-stockists-list",
            type: "features",
            props: {
              heading: "Where to find us",
              items: [
                { title: "Dakar · Plateau", body: "Edit your real boutique names and hours." },
                { title: "Abidjan · Cocody", body: "Add partner addresses in the editor." },
                { title: "Online", body: "WhatsApp + site checkout when payments are connected." },
              ],
            },
          },
          footer("maison-footer-stockists"),
        ],
      },
      {
        slug: "faq",
        title: "FAQ",
        sections: [
          nav("maison-nav-faq"),
          {
            id: "maison-faq",
            type: "faq",
            props: {
              heading: "Orders & shipping",
              items: [
                {
                  question: "How do I order?",
                  answer: "Shop on the site or WhatsApp your scent and size — we confirm stock and delivery.",
                },
                {
                  question: "International shipping?",
                  answer: "Edit this answer for the countries you ship to.",
                },
                {
                  question: "Returns?",
                  answer: "Unopened bottles within 7 days — hygiene policy.",
                },
              ],
            },
          },
          footer("maison-footer-faq"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("maison-nav-contact"),
          {
            id: "maison-contact-hero",
            type: "hero",
            props: {
              heading: "Contact",
              subheading: "Orders, press, wholesale.",
              buttonLabel: "WhatsApp Maison",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#F7F2EC",
            },
          },
          {
            id: "maison-form",
            type: "form",
            props: {
              heading: "Send a note",
              buttonLabel: "Send",
              successMessage: "Maison received your message.",
              fields: [
                { id: "name", label: "Name", type: "text", required: true, placeholder: "", options: [] },
                { id: "email", label: "Email", type: "email", required: true, placeholder: "", options: [] },
                {
                  id: "message",
                  label: "Message",
                  type: "textarea",
                  required: true,
                  placeholder: "Order, press, or wholesale?",
                  options: [],
                },
              ],
            },
          },
          {
            id: "maison-contact",
            type: "contact",
            props: {
              heading: "House",
              email: "orders@maisonbrume.example",
              phone: "+221770000000",
              address: "Dakar — edit address",
            },
          },
          {
            id: "maison-wa",
            type: "whatsapp",
            props: {
              label: "Order on WhatsApp",
              phone: "+221770000000",
              message: "Hi Maison Brume — I want to order.",
            },
          },
          footer("maison-footer-contact"),
        ],
      },
    ],
  };
}

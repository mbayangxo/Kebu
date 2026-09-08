import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Marché Boutique — Senegal neighborhood shop design world (public aesthetic).
 * Type A for `store`: physical/local shop that also sells online.
 * IA: Home · Shop · About · Contact · FAQ
 * Commerce: products + WhatsApp / Wave / Orange Money language — not fake card checkout.
 */

const P1 = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=70";
const P2 = "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=70";
const P3 = "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=70";

const NAV = [
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
] as const;

function nav(id: string, brand = "Marché") {
  return { id, type: "navigation" as const, props: { brand, links: [...NAV] } };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Marché — neighborhood shop · Dakar & delivery zones",
      links: [
        { label: "Shop", href: "/shop" },
        { label: "WhatsApp", href: "/contact" },
      ],
    },
  };
}

export function marcheBoutiqueWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Marché Boutique",
    theme: {
      primary: "#1B4332",
      accent: "#D4A373",
      background: "#F7F3EC",
      text: "#1B4332",
      fontDisplay: "Fraunces",
      fontBody: "IBM Plex Sans",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "sahel-light",
    },
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          nav("marche-nav-home"),
          {
            id: "marche-hero",
            type: "hero",
            props: {
              heading: "Your neighborhood shop — online",
              subheading:
                "Browse in CFA, order on WhatsApp, pay with Wave or Orange Money. Built for Dakar streets and delivery zones.",
              buttonLabel: "See products",
              buttonHref: "/shop",
              align: "left",
              background: "#F7F3EC",
            },
          },
          {
            id: "marche-image",
            type: "image",
            props: { src: P1, alt: "Boutique shelves", caption: "Open today" },
          },
          {
            id: "marche-features",
            type: "features",
            props: {
              heading: "How shopping works",
              items: [
                { title: "Pick what you need", body: "Clear prices in XOF — no confusing currency games." },
                { title: "Message on WhatsApp", body: "Confirm stock, size, and delivery in one chat." },
                { title: "Pay your way", body: "Wave, Orange Money, or cash on delivery where you enable it." },
              ],
            },
          },
          {
            id: "marche-gallery",
            type: "gallery",
            props: {
              heading: "In the shop",
              layout: "grid",
              items: [
                { src: P1, alt: "Display" },
                { src: P2, alt: "New arrivals" },
                { src: P3, alt: "Counter" },
              ],
            },
          },
          footer("marche-footer-home"),
        ],
      },
      {
        slug: "shop",
        title: "Shop",
        sections: [
          nav("marche-nav-shop"),
          {
            id: "marche-shop-hero",
            type: "hero",
            props: {
              heading: "Products",
              subheading: "Replace these with your real catalog in Shop → Products, then publish.",
              buttonLabel: "Contact to order",
              buttonHref: "/contact",
              align: "left",
              background: "#E8F0E9",
            },
          },
          {
            id: "marche-products",
            type: "products",
            props: {
              heading: "This week",
              layout: "grid",
              columns: 2,
              orderStyle: "sheet",
              orderCtaLabel: "Order",
              items: [
                {
                  name: "Everyday essential",
                  description: "Sample item — set real price in XOF.",
                  priceLabel: "5 000 XOF",
                },
                {
                  name: "Popular pick",
                  description: "WhatsApp to confirm stock.",
                  priceLabel: "12 000 XOF",
                },
                {
                  name: "Gift ready",
                  description: "Add your photo in Media.",
                  priceLabel: "8 500 XOF",
                },
              ],
            },
          },
          footer("marche-footer-shop"),
        ],
      },
      {
        slug: "about",
        title: "About",
        sections: [
          nav("marche-nav-about"),
          {
            id: "marche-about",
            type: "text",
            props: {
              heading: "Who we are",
              body: "A neighborhood boutique serving families and small businesses nearby. We keep prices honest, stock visible, and delivery clear — so customers trust us without a complicated app.",
            },
          },
          {
            id: "marche-about-img",
            type: "image",
            props: { src: P2, alt: "Shop team", caption: "Your team photo here" },
          },
          footer("marche-footer-about"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("marche-nav-contact"),
          {
            id: "marche-contact",
            type: "contact",
            props: {
              heading: "Visit or message",
              email: "hello@example.com",
              phone: "+221 77 000 00 00",
              address: "Quartier · Dakar, Sénégal",
            },
          },
          {
            id: "marche-wa",
            type: "whatsapp",
            props: {
              phone: "+221770000000",
              message: "Salut — je veux commander depuis Marché Boutique.",
              label: "WhatsApp the shop",
            },
          },
          footer("marche-footer-contact"),
        ],
      },
      {
        slug: "faq",
        title: "FAQ",
        sections: [
          nav("marche-nav-faq"),
          {
            id: "marche-faq",
            type: "faq",
            props: {
              heading: "Questions",
              items: [
                {
                  question: "Do you deliver outside Dakar?",
                  answer: "Yes in listed zones — message us with your area and we confirm fees in XOF.",
                },
                {
                  question: "How do I pay?",
                  answer: "Wave, Orange Money, or cash on delivery where enabled. Never pay strangers off-platform.",
                },
                {
                  question: "Can I reserve an item?",
                  answer: "WhatsApp us with the product name — we hold stock for a short window.",
                },
              ],
            },
          },
          footer("marche-footer-faq"),
        ],
      },
    ],
  };
}

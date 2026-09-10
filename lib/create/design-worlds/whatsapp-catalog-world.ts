import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * WhatsApp Catalog — Senegal mobile-first seller world (public aesthetic).
 * Type B for `store`: informal / Instagram seller who needs a clean catalog + chat order.
 * IA: Home · Catalog · How to order · Contact
 * Light assets — Data Saver friendly (few images, system-readable type).
 */

const C1 = "";
const C2 = "";

const NAV = [
  { label: "Catalog", href: "/catalog" },
  { label: "How to order", href: "/order" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string, brand = "Catalog") {
  return { id, type: "navigation" as const, props: { brand, links: [...NAV] } };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Catalog — order on WhatsApp · pay Wave / Orange Money",
      links: [{ label: "WhatsApp", href: "/contact" }],
    },
  };
}

export function whatsappCatalogWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "WhatsApp Catalog",
    theme: {
      primary: "#0F766E",
      accent: "#25D366",
      background: "#F8FAF9",
      text: "#134E4A",
      fontDisplay: "Syne",
      fontBody: "system-ui",
      spacing: "compact",
      headingScale: "md",
      bodySize: "sm",
      letterSpacing: "tight",
      aestheticId: "sahel-light",
    },
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          nav("wac-nav-home"),
          {
            id: "wac-hero",
            type: "hero",
            props: {
              heading: "Shop the catalog. Chat to buy.",
              subheading:
                "For sellers who already sell on WhatsApp or Instagram — one link with clear photos and prices in XOF.",
              buttonLabel: "Open catalog",
              buttonHref: "/catalog",
              align: "center",
              background: "#0F766E",
            },
          },
          {
            id: "wac-steps",
            type: "features",
            props: {
              heading: "Three steps",
              items: [
                { title: "1 · Browse", body: "See photos and prices without downloading a heavy app." },
                { title: "2 · WhatsApp", body: "Tap order — your chat opens with the product name ready." },
                { title: "3 · Pay", body: "Wave or Orange Money when you confirm with the seller." },
              ],
            },
          },
          {
            id: "wac-preview",
            type: "gallery",
            props: {
              heading: "Sample looks",
              layout: "featured",
              items: [
                { src: C1, alt: "Look 1" },
                { src: C2, alt: "Look 2" },
              ],
            },
          },
          footer("wac-footer-home"),
        ],
      },
      {
        slug: "catalog",
        title: "Catalog",
        sections: [
          nav("wac-nav-catalog"),
          {
            id: "wac-cat-hero",
            type: "hero",
            props: {
              heading: "Catalog",
              subheading: "Replace samples with your real products in Shop → Products.",
              buttonLabel: "How to order",
              buttonHref: "/order",
              align: "left",
              background: "#F8FAF9",
            },
          },
          {
            id: "wac-products",
            type: "products",
            props: {
              heading: "Available now",
              layout: "list",
              columns: 2,
              orderStyle: "minimal",
              orderCtaLabel: "WhatsApp order",
              items: [
                {
                  name: "Drop item A",
                  description: "Size notes · colour · stock",
                  priceLabel: "15 000 XOF",
                  imageUrl: C1,
                },
                {
                  name: "Drop item B",
                  description: "Message for remaining sizes",
                  priceLabel: "9 500 XOF",
                  imageUrl: C2,
                },
              ],
            },
          },
          footer("wac-footer-catalog"),
        ],
      },
      {
        slug: "order",
        title: "How to order",
        sections: [
          nav("wac-nav-order"),
          {
            id: "wac-order-text",
            type: "text",
            props: {
              heading: "How to order",
              body: "1) Open Catalog. 2) Tap WhatsApp order on the item. 3) Send your name, size, and area. 4) We confirm stock and share Wave / Orange Money details. No silent card charge — you approve every payment.",
            },
          },
          {
            id: "wac-order-faq",
            type: "faq",
            props: {
              heading: "Quick answers",
              items: [
                {
                  question: "Is this a full supermarket checkout?",
                  answer: "No — this world is built for chat commerce common in Senegal. Cart checkout can be added when you enable Shop features.",
                },
                {
                  question: "Does Offline / Data Saver work?",
                  answer: "Yes. Visitors can use Data Saver on your live site; photos stay lazy-loaded.",
                },
              ],
            },
          },
          footer("wac-footer-order"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("wac-nav-contact"),
          {
            id: "wac-contact",
            type: "whatsapp",
            props: {
              phone: "+221770000000",
              message: "Salut — je viens du catalogue en ligne.",
              label: "Message on WhatsApp",
            },
          },
          {
            id: "wac-contact-block",
            type: "contact",
            props: {
              heading: "Seller",
              email: "",
              phone: "+221 77 000 00 00",
              address: "Sénégal",
            },
          },
          footer("wac-footer-contact"),
        ],
      },
    ],
  };
}

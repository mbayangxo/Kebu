import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Restaurant Table — hospitality design world (public aesthetic).
 * Archetype: restaurant / café · IA = Home · Menu · About · Reserve · FAQ
 */

const FOOD1 = "";
const FOOD2 = "";
const FOOD3 = "";

const NAV = [
  { label: "Menu", href: "/menu" },
  { label: "About", href: "/about" },
  { label: "Reserve", href: "/reserve" },
  { label: "FAQ", href: "/faq" },
] as const;

function nav(id: string) {
  return { id, type: "navigation" as const, props: { brand: "Table", links: [...NAV] } };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Table — seasonal plates, warm hospitality.",
      links: [
        { label: "Menu", href: "/menu" },
        { label: "Reserve", href: "/reserve" },
      ],
    },
  };
}

export function restaurantTableWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Restaurant Table",
    theme: {
      primary: "#2C1810",
      accent: "#BC6C25",
      background: "#FBF6F0",
      text: "#2C1810",
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
          nav("table-nav-home"),
          {
            id: "table-hero",
            type: "hero",
            props: {
              heading: "Flavours from our kitchen to your table",
              subheading: "Seasonal menus, warm hospitality, and dishes worth sharing — reserve on WhatsApp.",
              buttonLabel: "See the menu",
              buttonHref: "/menu",
              align: "left",
              background: "#FBF6F0",
            },
          },
          {
            id: "table-image",
            type: "image",
            props: { src: FOOD1, alt: "Restaurant atmosphere", caption: "Tonight’s room" },
          },
          {
            id: "table-features",
            type: "features",
            props: {
              heading: "On the menu",
              items: [
                { title: "Daily specials", body: "Market-fresh plates that change with the season." },
                { title: "Catering", body: "Events and offices — ask via WhatsApp." },
                { title: "Private dining", body: "Intimate spaces for celebrations." },
              ],
            },
          },
          {
            id: "table-gallery",
            type: "gallery",
            props: {
              heading: "From the kitchen",
              layout: "featured",
              columns: 3,
              items: [
                { src: FOOD1, alt: "Plate", href: "/menu" },
                { src: FOOD2, alt: "Room", href: "/about" },
                { src: FOOD3, alt: "Service", href: "/reserve" },
              ],
            },
          },
          {
            id: "table-popup",
            type: "email-popup",
            props: {
              enabled: true,
              mode: "email",
              heading: "Tonight’s specials",
              body: "Get the weekly menu by email.",
              buttonLabel: "Join",
              dismissLabel: "No thanks",
              delaySeconds: 7,
            },
          },
          footer("table-footer-home"),
        ],
      },
      {
        slug: "menu",
        title: "Menu",
        sections: [
          nav("table-nav-menu"),
          {
            id: "table-menu-hero",
            type: "hero",
            props: {
              heading: "Menu",
              subheading: "Edit dishes and prices — or remove sections to keep it short.",
              buttonLabel: "Reserve a table",
              buttonHref: "/reserve",
              align: "center",
              background: "#FBF6F0",
            },
          },
          {
            id: "table-menu-features",
            type: "features",
            props: {
              heading: "Tonight",
              items: [
                { title: "Starters", body: "Soup, salad, grilled plantain — swap for your real menu." },
                { title: "Mains", body: "Catch of the day, grilled meats, vegetarian plate." },
                { title: "Sweets", body: "House dessert and seasonal fruit." },
              ],
            },
          },
          {
            id: "table-menu-gallery",
            type: "gallery",
            props: {
              heading: "Plates",
              layout: "grid",
              columns: 3,
              items: [
                { src: FOOD1, alt: "Dish 1" },
                { src: FOOD2, alt: "Dish 2" },
                { src: FOOD3, alt: "Dish 3" },
              ],
            },
          },
          footer("table-footer-menu"),
        ],
      },
      {
        slug: "about",
        title: "About",
        sections: [
          nav("table-nav-about"),
          {
            id: "table-about-hero",
            type: "hero",
            props: {
              heading: "About Table",
              subheading: "A restaurant site with real pages — menu, reserve, FAQ — not a flyer.",
              buttonLabel: "Book",
              buttonHref: "/reserve",
              align: "left",
              background: "#FBF6F0",
            },
          },
          {
            id: "table-about-body",
            type: "text",
            props: {
              heading: "Our kitchen",
              body: "Tell guests where you cook, who leads the kitchen, and what makes your table different. Add or remove sections so the page scrolls as long as you need.",
            },
          },
          footer("table-footer-about"),
        ],
      },
      {
        slug: "reserve",
        title: "Reserve",
        sections: [
          nav("table-nav-reserve"),
          {
            id: "table-reserve-hero",
            type: "hero",
            props: {
              heading: "Reserve",
              subheading: "Book via form or WhatsApp — we confirm your table.",
              buttonLabel: "WhatsApp us",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#FBF6F0",
            },
          },
          {
            id: "table-reserve-form",
            type: "form",
            props: {
              heading: "Request a table",
              subheading: "Date, party size, and time — we reply quickly.",
              buttonLabel: "Send request",
              successMessage: "Got it — we’ll confirm your table.",
              fields: [
                { id: "name", label: "Name", type: "text", required: true, placeholder: "", options: [] },
                { id: "phone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                {
                  id: "party",
                  label: "Party size",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["2", "3–4", "5–6", "7+"],
                },
                {
                  id: "message",
                  label: "Date & notes",
                  type: "textarea",
                  required: true,
                  placeholder: "Friday 8pm · window seat if possible",
                  options: [],
                },
              ],
            },
          },
          {
            id: "table-reserve-wa",
            type: "whatsapp",
            props: {
              label: "Reserve on WhatsApp",
              phone: "+221770000000",
              message: "Hi Table — I’d like to reserve a table.",
            },
          },
          {
            id: "table-reserve-contact",
            type: "contact",
            props: {
              heading: "Find us",
              email: "hello@table.example",
              phone: "+221770000000",
              address: "Your street, city — edit in editor",
            },
          },
          footer("table-footer-reserve"),
        ],
      },
      {
        slug: "faq",
        title: "FAQ",
        sections: [
          nav("table-nav-faq"),
          {
            id: "table-faq",
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                {
                  question: "Do I need a reservation?",
                  answer: "Walk-ins welcome when we have space; weekends prefer booking.",
                },
                {
                  question: "Payment methods?",
                  answer: "Cash, mobile money, and cards — update for your restaurant.",
                },
                {
                  question: "Dietary needs?",
                  answer: "Tell us when you reserve — we accommodate when we can.",
                },
              ],
            },
          },
          footer("table-footer-faq"),
        ],
      },
    ],
  };
}

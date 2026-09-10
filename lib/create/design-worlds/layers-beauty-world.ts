import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * LAYERS Beauty — organic skincare / beauty shop design world (public aesthetic).
 * Archetype: beauty e-commerce · IA = Home · Shop · About · Gallery · FAQ · Journal · Contact · Gifts
 * Not a generic hero + three cards stack. Mock catalog photos are Unsplash beauty/skincare (editable).
 */

/** Mock catalog photos — Unsplash IDs already used elsewhere in Kebu seeds (editable in Media). */
const IMG = {
  hero: "",
  serum: "",
  cream: "",
  oil: "",
  mist: "",
  ritual: "",
  botanicals: "",
  texture: "",
  hands: "",
  shelf: "",
  gift: "",
} as const;

const NAV = [
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "Gallery", href: "/gallery" },
  { label: "FAQ", href: "/faq" },
  { label: "Journal", href: "/journal" },
  { label: "Gifts", href: "/gifts" },
  { label: "Contact", href: "/contact" },
] as const;

const PRODUCTS = [
  {
    name: "Dew Serum",
    description: "Lightweight hyaluronic layers for morning glow — humid climates welcome.",
    priceLabel: "18,000 FCFA",
    imageUrl: IMG.serum,
    whatsappMessage: "Hi LAYERS — I want the Dew Serum.",
  },
  {
    name: "Barrier Cream",
    description: "Ceramide-rich cream that seals moisture without heavy shine.",
    priceLabel: "22,000 FCFA",
    imageUrl: IMG.cream,
    whatsappMessage: "Hi LAYERS — I want the Barrier Cream.",
  },
  {
    name: "Golden Face Oil",
    description: "Evening oil with baobab and marula — 3 drops, press, sleep.",
    priceLabel: "24,000 FCFA",
    imageUrl: IMG.oil,
    whatsappMessage: "Hi LAYERS — I want the Golden Face Oil.",
  },
  {
    name: "Rose Mist",
    description: "Cooling mist for desks, taxis, and midday resets.",
    priceLabel: "12,000 FCFA",
    imageUrl: IMG.mist,
    whatsappMessage: "Hi LAYERS — I want the Rose Mist.",
  },
] as const;

function navSection(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: {
      brand: "LAYERS",
      links: [...NAV],
    },
  };
}

function footerSection(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© LAYERS Beauty — clean rituals, real skin.",
      links: [
        { label: "Shop", href: "/shop" },
        { label: "FAQ", href: "/faq" },
        { label: "Contact", href: "/contact" },
        { label: "Gifts", href: "/gifts" },
      ],
    },
  };
}

export function layersBeautyWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "LAYERS Beauty",
    theme: {
      primary: "#1F1A17",
      accent: "#C4786A",
      background: "#F7F1EB",
      text: "#1F1A17",
      fontDisplay: "Playfair Display",
      fontBody: "IBM Plex Sans",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "layers-beauty",
    },
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          navSection("layers-nav-home"),
          {
            id: "layers-announce",
            type: "text",
            props: {
              heading: "Free shipping over 40,000 FCFA · Wave & Orange Money ready",
              body: "New: Dew Serum restock — limited batch this month. Edit this strip in the editor for your drop.",
            },
          },
          {
            id: "layers-hero-image",
            type: "image",
            props: {
              src: IMG.hero,
              alt: "LAYERS skincare ritual flatlay",
              caption: "Layered rituals for African skin & climate",
            },
          },
          {
            id: "layers-hero",
            type: "hero",
            props: {
              heading: "Skin in layers, not filters",
              subheading:
                "Clean skincare built for heat, humidity, and real routines — shop bestsellers, learn your ritual, gift someone glow.",
              buttonLabel: "Shop bestsellers",
              buttonHref: "/shop",
              align: "left",
              background: "#F7F1EB",
            },
          },
          {
            id: "layers-bestsellers",
            type: "products",
            props: {
              heading: "Bestsellers",
              layout: "grid",
              columns: 4,
              orderStyle: "sheet",
              orderCtaLabel: "Add to order",
              items: [...PRODUCTS],
            },
          },
          {
            id: "layers-collections",
            type: "gallery",
            props: {
              heading: "Shop by ritual",
              layout: "featured",
              columns: 3,
              items: [
                { src: IMG.ritual, alt: "Morning dew", href: "/shop" },
                { src: IMG.botanicals, alt: "Barrier repair", href: "/shop" },
                { src: IMG.texture, alt: "Night oil", href: "/shop" },
                { src: IMG.hands, alt: "Gift sets", href: "/gifts" },
              ],
            },
          },
          {
            id: "layers-story-tease",
            type: "text",
            props: {
              heading: "Why LAYERS",
              body: "We reverse-engineered what a beauty shop needs online: clear products, honest climate advice, easy WhatsApp / mobile-money checkout, a journal for education, and gifts that feel personal — not a generic spa landing page.",
            },
          },
          {
            id: "layers-features",
            type: "features",
            props: {
              heading: "Built for how you actually live",
              items: [
                {
                  title: "Climate-smart",
                  body: "Formulas and tips that respect heat, dust, and humidity — not winter-only routines.",
                },
                {
                  title: "Pay your way",
                  body: "WhatsApp orders + mobile money when you connect JOKO / Wave / Paystack.",
                },
                {
                  title: "Gift-ready",
                  body: "Sets and gift cards for birthdays, bridal parties, and diaspora care packages.",
                },
              ],
            },
          },
          {
            id: "layers-newsletter",
            type: "newsletter",
            props: {
              heading: "Rituals in your inbox",
              subheading: "Drops, how-tos, and member-only restocks — no spam.",
              buttonLabel: "Join the list",
              successMessage: "You're on the LAYERS list.",
            },
          },
          {
            id: "layers-popup",
            type: "email-popup",
            props: {
              enabled: true,
              mode: "both",
              heading: "10% off your first order",
              body: "Join the list for rituals, restocks, and a welcome offer. Unsubscribe anytime.",
              buttonLabel: "Get the code",
              dismissLabel: "Maybe later",
              delaySeconds: 5,
              remindAfterDays: 14,
            },
          },
          {
            id: "layers-wa-home",
            type: "whatsapp",
            props: {
              label: "Ask a skin question",
              phone: "+221770000000",
              message: "Hi LAYERS — I need help picking a ritual.",
            },
          },
          footerSection("layers-footer-home"),
        ],
      },
      {
        slug: "shop",
        title: "Shop",
        sections: [
          navSection("layers-nav-shop"),
          {
            id: "layers-shop-hero",
            type: "hero",
            props: {
              heading: "Shop",
              subheading: "Full catalog — edit prices, photos, and variants in Shop after you publish.",
              buttonLabel: "Need advice?",
              buttonHref: "/contact",
              align: "center",
            },
          },
          {
            id: "layers-shop-products",
            type: "products",
            props: {
              heading: "All products",
              layout: "grid",
              columns: 3,
              orderStyle: "sheet",
              orderCtaLabel: "Place order",
              items: [
                ...PRODUCTS,
                {
                  name: "Morning Ritual Set",
                  description: "Dew Serum + Rose Mist — desk-to-door glow.",
                  priceLabel: "28,000 FCFA",
                  imageUrl: IMG.shelf,
                  whatsappMessage: "Hi LAYERS — I want the Morning Ritual Set.",
                },
                {
                  name: "Night Restore Duo",
                  description: "Barrier Cream + Golden Face Oil.",
                  priceLabel: "42,000 FCFA",
                  imageUrl: IMG.gift,
                  whatsappMessage: "Hi LAYERS — I want the Night Restore Duo.",
                },
              ],
            },
          },
          {
            id: "layers-shop-faq-tease",
            type: "text",
            props: {
              heading: "Shipping & returns",
              body: "See FAQ for cities we ship to, exchange windows, and how mobile-money orders work. Contact us for wholesale.",
            },
          },
          footerSection("layers-footer-shop"),
        ],
      },
      {
        slug: "about",
        title: "About",
        sections: [
          navSection("layers-nav-about"),
          {
            id: "layers-about-hero",
            type: "hero",
            props: {
              heading: "About LAYERS",
              subheading: "A beauty brand that treats skin like climate — layered, honest, local.",
              buttonLabel: "Meet the ritual",
              buttonHref: "/journal",
              align: "left",
            },
          },
          {
            id: "layers-about-image",
            type: "image",
            props: {
              src: IMG.botanicals,
              alt: "Botanical ingredients for LAYERS",
              caption: "Ingredients you can pronounce — stories you can verify",
            },
          },
          {
            id: "layers-about-body",
            type: "text",
            props: {
              heading: "Our story",
              body: "LAYERS started from a simple frustration: most “clean beauty” sites looked the same and ignored African weather, payment rails, and gift culture. We built a shop IA around rituals, education, and real checkout — then made it beautiful enough to feel like a brand, not a template clone.",
            },
          },
          {
            id: "layers-about-values",
            type: "features",
            props: {
              heading: "What we stand for",
              items: [
                { title: "Transparency", body: "Ingredient lists and climate notes on every hero SKU." },
                { title: "Local first", body: "Pricing and WhatsApp support that work where you live." },
                { title: "No theater", body: "If a page says it sells, the cart path is real after you connect payments." },
              ],
            },
          },
          footerSection("layers-footer-about"),
        ],
      },
      {
        slug: "gallery",
        title: "Gallery",
        sections: [
          navSection("layers-nav-gallery"),
          {
            id: "layers-gallery-hero",
            type: "hero",
            props: {
              heading: "Gallery",
              subheading: "Textures, rituals, and shelf moments — replace with your own photos in Media.",
              buttonLabel: "Shop the look",
              buttonHref: "/shop",
              align: "center",
            },
          },
          {
            id: "layers-gallery-grid",
            type: "gallery",
            props: {
              heading: "In the wild",
              layout: "grid",
              columns: 3,
              items: [
                { src: IMG.hero, alt: "Flatlay" },
                { src: IMG.serum, alt: "Serum bottle" },
                { src: IMG.cream, alt: "Cream jar" },
                { src: IMG.oil, alt: "Face oil" },
                { src: IMG.mist, alt: "Mist" },
                { src: IMG.ritual, alt: "Ritual" },
                { src: IMG.texture, alt: "Texture" },
                { src: IMG.hands, alt: "Application" },
                { src: IMG.shelf, alt: "Shelf" },
              ],
            },
          },
          footerSection("layers-footer-gallery"),
        ],
      },
      {
        slug: "faq",
        title: "FAQ",
        sections: [
          navSection("layers-nav-faq"),
          {
            id: "layers-faq",
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                {
                  question: "Which products for oily / humid skin?",
                  answer:
                    "Start with Dew Serum + Rose Mist. Skip heavy night creams until your barrier needs Barrier Cream. Edit answers for your formulas.",
                },
                {
                  question: "How do I pay?",
                  answer:
                    "Place order on the site or WhatsApp. Connect Wave, Paystack, PayPal, or JOKO in Shop → Payments so money lands in your account.",
                },
                {
                  question: "Do you ship outside Dakar?",
                  answer:
                    "Yes — update cities and fees in FAQ once you set shipping. Diaspora gift sets ship when you enable international rates.",
                },
                {
                  question: "Can I return opened products?",
                  answer:
                    "Unopened within 7 days — hygiene policy. Damaged in transit: photo + WhatsApp for replacement.",
                },
                {
                  question: "Do you offer wholesale?",
                  answer: "Yes — Contact us with your salon or retail details.",
                },
              ],
            },
          },
          {
            id: "layers-faq-cta",
            type: "whatsapp",
            props: {
              label: "Still stuck? WhatsApp us",
              phone: "+221770000000",
              message: "Hi LAYERS — I have a product question.",
            },
          },
          footerSection("layers-footer-faq"),
        ],
      },
      {
        slug: "journal",
        title: "Journal",
        sections: [
          navSection("layers-nav-journal"),
          {
            id: "layers-journal-intro",
            type: "text",
            props: {
              heading: "Journal",
              body: "Education is part of the beauty shop — publish posts from Blog in the builder. This list pulls live posts after you write them.",
            },
          },
          {
            id: "layers-blog-list",
            type: "blog-list",
            props: {
              heading: "From the lab",
              subheading: "Rituals, ingredient notes, and climate tips.",
              postsPerPage: 6,
            },
          },
          footerSection("layers-footer-journal"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          navSection("layers-nav-contact"),
          {
            id: "layers-contact-hero",
            type: "hero",
            props: {
              heading: "Contact",
              subheading: "Orders, wholesale, press — we reply on email or WhatsApp.",
              buttonLabel: "Chat on WhatsApp",
              buttonHref: "#whatsapp",
              align: "center",
            },
          },
          {
            id: "layers-contact-form",
            type: "form",
            props: {
              heading: "Send a message",
              subheading: "We read every note — usually within one business day.",
              buttonLabel: "Send",
              successMessage: "Thanks — LAYERS got your message.",
              fields: [
                { id: "name", label: "Your name", type: "text", required: true, placeholder: "Amina", options: [] },
                { id: "email", label: "Email", type: "email", required: true, placeholder: "you@email.com", options: [] },
                { id: "phone", label: "WhatsApp", type: "phone", required: false, placeholder: "+221…", options: [] },
                {
                  id: "topic",
                  label: "Topic",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Order help", "Skin advice", "Wholesale", "Press", "Other"],
                },
                {
                  id: "message",
                  label: "Message",
                  type: "textarea",
                  required: true,
                  placeholder: "How can we help?",
                  options: [],
                },
              ],
            },
          },
          {
            id: "layers-contact-details",
            type: "contact",
            props: {
              heading: "Visit / write",
              email: "hello@layers.example",
              phone: "+221770000000",
              address: "Dakar — edit your studio address",
            },
          },
          {
            id: "layers-contact-wa",
            type: "whatsapp",
            props: {
              label: "WhatsApp LAYERS",
              phone: "+221770000000",
              message: "Hi LAYERS — contacting from the website.",
            },
          },
          footerSection("layers-footer-contact"),
        ],
      },
      {
        slug: "gifts",
        title: "Gifts",
        sections: [
          navSection("layers-nav-gifts"),
          {
            id: "layers-gifts-hero",
            type: "hero",
            props: {
              heading: "Gifts & cards",
              subheading: "Sets for people you love — gift cards unlock when you enable them in Shop.",
              buttonLabel: "Shop sets",
              buttonHref: "/shop",
              align: "center",
            },
          },
          {
            id: "layers-gifts-image",
            type: "image",
            props: {
              src: IMG.gift,
              alt: "Gift-wrapped beauty set",
              caption: "Bridal · birthday · diaspora care",
            },
          },
          {
            id: "layers-gifts-sets",
            type: "products",
            props: {
              heading: "Gift sets",
              layout: "featured",
              columns: 2,
              orderStyle: "card",
              orderCtaLabel: "Gift this",
              items: [
                {
                  name: "Morning Ritual Set",
                  description: "Dew + Mist — the desk glow kit.",
                  priceLabel: "28,000 FCFA",
                  imageUrl: IMG.shelf,
                  whatsappMessage: "Hi LAYERS — gift the Morning Ritual Set.",
                },
                {
                  name: "Night Restore Duo",
                  description: "Cream + Oil — overnight restore.",
                  priceLabel: "42,000 FCFA",
                  imageUrl: IMG.gift,
                  whatsappMessage: "Hi LAYERS — gift the Night Restore Duo.",
                },
              ],
            },
          },
          {
            id: "layers-gifts-note",
            type: "text",
            props: {
              heading: "Digital gift cards",
              body: "Issue and redeem gift cards from Shop → Gift cards after migration 066. Until then, sell sets here and note “gift” in the WhatsApp order message.",
            },
          },
          footerSection("layers-footer-gifts"),
        ],
      },
    ],
  };
}

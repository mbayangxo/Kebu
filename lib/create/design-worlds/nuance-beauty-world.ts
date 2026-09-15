import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * NUANCE — shade-inclusive color cosmetics (public aesthetic).
 * Archetype: bold, editorial color-cosmetics shop built around a real shade-matching tool —
 * distinct from every other Beauty & salon look (hair-salon's booking menu, LAYERS' ritual
 * skincare, CLARTÉ's clinical compatibility angle). NUANCE's whole reason for existing is the
 * Shade Finder: undertone + depth questions that end in a specific recommendation on WhatsApp,
 * not a color wheel nobody trusts on a phone screen. Deep near-black surfaces, a confident red
 * accent, and a literal shade-swatch row as the signature UI element.
 * IA = Home · Shop · Shade Finder · Looks · Reviews · About · FAQ.
 * All imagery is an empty slot (editable in Media) — no reference-site or stock URLs baked in.
 */

const IMG = {
  hero: "",
  foundation: "",
  concealer: "",
  cheekTint: "",
  lipOil: "",
  settingPowder: "",
  everydayFive: "",
  shadeWall: "",
  founder: "",
  studio: "",
  lookOne: "",
  lookTwo: "",
  lookThree: "",
} as const;

const PHONE = "+2348100000000";

const NAV = [
  { label: "Shop", href: "/shop" },
  { label: "Shade Finder", href: "/shade-finder" },
  { label: "Looks", href: "/looks" },
  { label: "Reviews", href: "/reviews" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
] as const;

const PRODUCTS = [
  {
    name: "Second Skin Foundation",
    description: "Buildable, breathable foundation formulated across 50 shades — from the palest cool undertone to the deepest warm.",
    priceLabel: "15,000 FCFA",
    imageUrl: IMG.foundation,
    whatsappMessage: "Hi NUANCE — I'd like to order the Second Skin Foundation.",
    badge: "50 SHADES",
    goodFor: ["All skin tones and undertones", "Medium, buildable coverage"],
    notGoodFor: ["Full-coverage, long-wear event makeup — see Vanish Concealer to spot-correct"],
    attributes: [
      { icon: "🎨", label: "50 shades" },
      { icon: "🌤️", label: "Warm, cool & neutral undertones" },
    ],
    crossSells: ["Vanish Concealer", "Soft Focus Setting Powder"],
    filterTags: ["face", "foundation"],
  },
  {
    name: "Vanish Concealer",
    description: "High-pigment concealer that spot-corrects without settling into fine lines by midday.",
    priceLabel: "9,000 FCFA",
    imageUrl: IMG.concealer,
    whatsappMessage: "Hi NUANCE — I'd like to order the Vanish Concealer.",
    goodFor: ["Under-eye brightening", "Spot correction"],
    notGoodFor: ["Full-face coverage alone — pair with foundation"],
    attributes: [{ icon: "💧", label: "Crease-resistant" }],
    crossSells: ["Second Skin Foundation"],
    filterTags: ["face", "concealer"],
  },
  {
    name: "Cheek Tint Duo",
    description: "Cream blush in two shades per pot — blend together or wear solo, warms up with body heat.",
    priceLabel: "8,500 FCFA",
    imageUrl: IMG.cheekTint,
    whatsappMessage: "Hi NUANCE — I'd like to order the Cheek Tint Duo.",
    goodFor: ["Natural flush", "Layering over foundation"],
    notGoodFor: [],
    attributes: [{ icon: "🖐️", label: "Finger or brush application" }],
    crossSells: ["Glass Lip Oil"],
    filterTags: ["cheeks", "cream"],
  },
  {
    name: "Glass Lip Oil",
    description: "Non-sticky, high-shine lip oil with a hint of tint — the finishing step in every NUANCE look.",
    priceLabel: "7,000 FCFA",
    imageUrl: IMG.lipOil,
    whatsappMessage: "Hi NUANCE — I'd like to order the Glass Lip Oil.",
    goodFor: ["Daily wear", "Layering over lipstick"],
    notGoodFor: [],
    attributes: [{ icon: "✨", label: "Non-sticky finish" }],
    crossSells: ["Cheek Tint Duo"],
    filterTags: ["lips"],
  },
  {
    name: "Soft Focus Setting Powder",
    description: "Translucent, blurring powder that locks everything in place without the flashback in photos.",
    priceLabel: "10,500 FCFA",
    imageUrl: IMG.settingPowder,
    whatsappMessage: "Hi NUANCE — I'd like to order the Soft Focus Setting Powder.",
    goodFor: ["All-day wear", "Photo and video"],
    notGoodFor: ["Very dry skin wanting a dewy finish"],
    attributes: [
      { icon: "📸", label: "No flash-back" },
      { icon: "🌫️", label: "Translucent — works on every shade" },
    ],
    crossSells: ["Second Skin Foundation"],
    filterTags: ["face", "powder"],
  },
] as const;

function nav(id: string) {
  return { id, type: "navigation" as const, props: { brand: "NUANCE", links: [...NAV] } };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© NUANCE — 50 shades, one shade finder. Formulated in Lagos for every undertone.",
      links: [
        { label: "Shop", href: "/shop" },
        { label: "Shade Finder", href: "/shade-finder" },
        { label: "FAQ", href: "/faq" },
      ],
    },
  };
}

export function nuanceBeautyWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "NUANCE",
    theme: {
      primary: "#1A0508",
      accent: "#D62839",
      background: "#FFF6E9",
      text: "#1A0508",
      surface: "#FFFFFF",
      link: "#A31E2C",
      fontDisplay: "Archivo",
      fontBody: "Inter",
      spacing: "comfortable",
      contentWidth: "default",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "tight",
      radius: "sharp",
      buttonStyle: "solid",
      aestheticId: "nuance-beauty",
      motion: "expressive",
    },
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          nav("nuance-nav-home"),
          {
            id: "nuance-announce",
            type: "announcement-bar",
            props: {
              text: "New: Second Skin Foundation — 50 shades, one formula. Find yours →",
              background: "#1A0508",
              color: "#FFF6E9",
              freeShippingThreshold: 22000,
              freeShippingCurrency: "FCFA",
              freeShippingAchievedText: "Free delivery unlocked 🎉",
            },
          },
          {
            id: "nuance-hero",
            type: "hero",
            props: {
              heading: "Find your exact shade. Not close — exact.",
              subheading: "50 foundation shades built across every undertone. Answer three questions and we'll tell you exactly which one is yours.",
              buttonLabel: "Find my shade",
              buttonHref: "/shade-finder",
              align: "left",
              background: "#FFF6E9",
            },
          },
          {
            id: "nuance-hero-image",
            type: "image",
            props: {
              src: IMG.hero,
              alt: "NUANCE product edit against a bold red backdrop",
              caption: "Five products. Fifty shades. One shade finder that actually works.",
            },
          },
          {
            id: "nuance-trust",
            type: "trust-badges",
            props: {
              items: [
                { icon: "🎨", label: "50 shades", description: "Every undertone, not just the middle ones" },
                { icon: "🔍", label: "Real shade matching", description: "Undertone + depth, not a color wheel" },
                { icon: "🚚", label: "Delivery across West Africa", description: "Wave · Orange Money · JOKO" },
                { icon: "💬", label: "Ask before you buy", description: "WhatsApp reply under 1h" },
              ],
              layout: "strip",
            },
          },
          {
            id: "nuance-bestsellers",
            type: "products",
            props: {
              heading: "Start here",
              subheading: "The five products most first orders build around.",
              layout: "grid",
              columns: 4,
              orderStyle: "sheet",
              orderCtaLabel: "Add to order",
              items: [...PRODUCTS],
            },
          },
          {
            id: "nuance-method",
            type: "features",
            props: {
              heading: "The NUANCE approach",
              subheading: "Three rules behind every shade we mix.",
              items: [
                { icon: "🎨", title: "Depth before undertone", body: "We formulate the deepest and lightest shades at the same time as the middle ones — not as a later 'extended range'." },
                { icon: "🔬", title: "Undertone-first matching", body: "Two people with the same depth can need completely different shades. The Shade Finder asks about undertone first." },
                { icon: "🗣️", title: "A real answer, not a guess", body: "The Shade Finder ends in a specific shade name from our team on WhatsApp — not a 'shades may vary' disclaimer." },
              ],
            },
          },
          {
            id: "nuance-social-proof",
            type: "social-proof",
            props: {
              items: [
                { name: "Amara", location: "Lagos", product: "Second Skin Foundation", minutesAgo: 5 },
                { name: "Efe", location: "Accra", product: "Glass Lip Oil", minutesAgo: 12 },
                { name: "Salamatu", location: "Abuja", product: "Cheek Tint Duo", minutesAgo: 21 },
              ],
              interval: 9,
              position: "bottom-left",
            },
          },
          {
            id: "nuance-reviews-tease",
            type: "testimonials",
            props: {
              heading: "What an exact match looks like",
              topics: ["Shade match", "Wear time", "Finish", "Undertone"],
              items: [
                {
                  quote: "I've bought 'my shade' from six brands and always had to mix two. The Shade Finder got it right in one try — first time that's ever happened.",
                  name: "Bisola A.",
                  role: "Deep, warm undertone — Lagos",
                  skinType: "",
                  skinConcern: "",
                  reviewTopics: ["Shade match"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Soft Focus Setting Powder is the first translucent powder that didn't turn ashy in photos. Actually translucent.",
                  name: "Yaa B.",
                  role: "Deep, neutral undertone — Accra",
                  skinType: "",
                  skinConcern: "",
                  reviewTopics: ["Finish"],
                  verified: true,
                  rating: 5,
                },
              ],
            },
          },
          {
            id: "nuance-newsletter",
            type: "newsletter",
            props: {
              heading: "Get restock alerts on your shade",
              subheading: "Tell us your shade once — we'll message you the moment it's back.",
              buttonLabel: "Notify me",
              successMessage: "You're on the list — we'll message you when your shade restocks.",
            },
          },
          {
            id: "nuance-popup",
            type: "email-popup",
            props: {
              enabled: true,
              mode: "both",
              heading: "10% off your first order",
              body: "Join the list for restock alerts, new shade launches, and a welcome code.",
              buttonLabel: "Get the code",
              dismissLabel: "Not now",
              delaySeconds: 6,
              remindAfterDays: 14,
            },
          },
          {
            id: "nuance-wa-home",
            type: "whatsapp",
            props: {
              label: "Ask about your shade",
              phone: PHONE,
              message: "Hi NUANCE — I have a question about a shade.",
            },
          },
          footer("nuance-footer-home"),
        ],
      },
      {
        slug: "shop",
        title: "Shop",
        sections: [
          nav("nuance-nav-shop"),
          {
            id: "nuance-shop-hero",
            type: "hero",
            props: {
              heading: "Shop the full line",
              subheading: "Face, cheek, and lip — built to be worn together or picked one at a time.",
              buttonLabel: "Not sure on your shade?",
              buttonHref: "/shade-finder",
              align: "center",
            },
          },
          {
            id: "nuance-shop-products",
            type: "products",
            props: {
              heading: "All products",
              layout: "grid",
              columns: 3,
              orderStyle: "sheet",
              orderCtaLabel: "Place order",
              filterLabel: "Filter by category",
              promoBanner: {
                text: "Build The Everyday Five → free delivery + a shade-matching session included",
                subtext: "Or message us your shade for a personal recommendation",
                background: "#D62839",
                color: "#FFF6E9",
                insertAfterIndex: 2,
              },
              items: [
                ...PRODUCTS,
                {
                  name: "The Everyday Five",
                  description: "Second Skin Foundation, Vanish Concealer, Cheek Tint Duo, Glass Lip Oil, and Soft Focus Powder — matched to your shade, pre-paired.",
                  priceLabel: "42,000 FCFA",
                  valuePriceLabel: "50,000 FCFA",
                  imageUrl: IMG.everydayFive,
                  whatsappMessage: "Hi NUANCE — I'd like to order The Everyday Five.",
                  badge: "SET",
                  goodFor: ["First-time customers", "Simplifying a routine"],
                  notGoodFor: [],
                  attributes: [{ icon: "🎁", label: "16% cheaper than buying separately" }],
                  filterTags: ["face", "cheeks", "lips"],
                },
              ],
            },
          },
          {
            id: "nuance-shop-trust",
            type: "trust-badges",
            props: {
              items: [
                { icon: "🔒", label: "Secure checkout", description: "Wave · Orange Money · card" },
                { icon: "🚚", label: "Delivery", description: "Lagos next-day · regional 2–4 days" },
                { icon: "↩️", label: "7-day exchange", description: "Wrong shade — full swap, no fee" },
              ],
              layout: "grid",
            },
          },
          footer("nuance-footer-shop"),
        ],
      },
      {
        slug: "shade-finder",
        title: "Shade Finder",
        sections: [
          nav("nuance-nav-shade-finder"),
          {
            id: "nuance-shade-hero",
            type: "hero",
            props: {
              heading: "Stop guessing your shade.",
              subheading: "Three questions — we'll send your exact match and a starting recommendation straight to WhatsApp.",
              buttonLabel: "Start the quiz",
              buttonHref: "#quiz",
              align: "center",
              background: "#1A0508",
            },
          },
          {
            id: "nuance-quiz",
            type: "quiz",
            props: {
              heading: "Find your shade",
              subheading: "Takes under a minute.",
              ctaLabel: "Send my shade on WhatsApp",
              whatsappPhone: PHONE,
              whatsappIntro: "Hi NUANCE — here are my Shade Finder answers:",
              steps: [
                {
                  id: "undertone",
                  question: "Do your veins look more green or blue?",
                  options: ["Green — likely warm undertone", "Blue — likely cool undertone", "Both / hard to tell — likely neutral", "Not sure yet"],
                  icon: "🌤️",
                },
                {
                  id: "depth",
                  question: "How would you describe your depth in natural light?",
                  options: ["Fair", "Light-medium", "Medium-tan", "Deep", "Very deep"],
                  icon: "🎨",
                },
                {
                  id: "finish",
                  question: "What finish do you usually reach for?",
                  options: ["Natural, skin-like", "Full coverage, matte", "Dewy, glowing", "Depends on the day"],
                  icon: "✨",
                },
              ],
            },
          },
          {
            id: "nuance-shade-image",
            type: "image",
            props: {
              src: IMG.shadeWall,
              alt: "NUANCE 50-shade wall arranged by depth and undertone",
              caption: "The shade wall our team checks your answers against before replying",
            },
          },
          {
            id: "nuance-shade-tips",
            type: "features",
            props: {
              heading: "Reading your own undertone",
              items: [
                { title: "Jewelry test", body: "Look better in gold? Likely warm. Silver? Likely cool. Both equally? You're probably neutral — the most common undertone." },
                { title: "Depth changes with the season", body: "If you tan easily, your summer and winter shades may differ by half a step — tell us your current depth, not your 'usual' one." },
                { title: "Two shades, one bottle", body: "Between two depths? Most people size down for a natural finish and up for full coverage — the Shade Finder accounts for this." },
              ],
            },
          },
          footer("nuance-footer-shade-finder"),
        ],
      },
      {
        slug: "looks",
        title: "Looks",
        sections: [
          nav("nuance-nav-looks"),
          {
            id: "nuance-looks-hero",
            type: "hero",
            props: {
              heading: "Five products, endless looks",
              subheading: "How three shade-matched customers wear the same five products differently.",
              buttonLabel: "Shop this edit",
              buttonHref: "/shop",
              align: "center",
            },
          },
          {
            id: "nuance-looks-gallery",
            type: "gallery",
            props: {
              heading: "Recent looks",
              items: [
                { src: IMG.lookOne, alt: "Natural everyday NUANCE look", href: "/shop" },
                { src: IMG.lookTwo, alt: "Full-coverage matte NUANCE look", href: "/shop" },
                { src: IMG.lookThree, alt: "Dewy glow NUANCE look", href: "/shop" },
              ],
              layout: "featured",
              columns: 3,
              followLabel: "Suivez-nous",
            },
          },
          {
            id: "nuance-looks-features",
            type: "features",
            props: {
              heading: "How to build each look",
              items: [
                { title: "Natural, skin-like", body: "One layer of Second Skin Foundation, Vanish only where needed, Cheek Tint blended with fingers, Glass Lip Oil to finish." },
                { title: "Full coverage, matte", body: "Two thin layers of foundation set with Soft Focus Powder before and after concealer for a longer wear time." },
                { title: "Dewy glow", body: "Foundation mixed with a drop of Glass Lip Oil for sheen, Cheek Tint high on the cheekbone, powder only where needed." },
              ],
            },
          },
          footer("nuance-footer-looks"),
        ],
      },
      {
        slug: "reviews",
        title: "Reviews",
        sections: [
          nav("nuance-nav-reviews"),
          {
            id: "nuance-reviews-hero",
            type: "hero",
            props: {
              heading: "Real shades, real skin",
              subheading: "Verified reviews with shade and undertone attached — so you're comparing against someone with a similar match.",
              buttonLabel: "Leave a review",
              buttonHref: "/faq",
              align: "center",
              background: "#1A0508",
            },
          },
          {
            id: "nuance-reviews-list",
            type: "testimonials",
            props: {
              heading: "Verified reviews",
              topics: ["Shade match", "Wear time", "Finish", "Undertone", "Delivery"],
              items: [
                {
                  quote: "First foundation that didn't oxidize orange by 2pm. The Shade Finder even asked about my depth changing in the dry season — no other brand thinks about that.",
                  name: "Ifeoma C.",
                  role: "Medium-tan, warm undertone — Lagos",
                  skinType: "",
                  skinConcern: "",
                  reviewTopics: ["Shade match", "Wear time"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Ordered the Everyday Five as a gift for my sister and included her Shade Finder answers — the recommendation was spot on without her trying anything first.",
                  name: "Wema T.",
                  role: "Gift order — Accra",
                  skinType: "",
                  skinConcern: "",
                  reviewTopics: ["Shade match"],
                  verified: true,
                  rating: 5,
                },
              ],
            },
          },
          footer("nuance-footer-reviews"),
        ],
      },
      {
        slug: "about",
        title: "About",
        sections: [
          nav("nuance-nav-about"),
          {
            id: "nuance-about-hero",
            type: "hero",
            props: {
              heading: "We built the deepest shades first",
              subheading: "NUANCE started because the deepest and lightest shades of most ranges are always the last ones formulated — and it shows.",
              buttonLabel: "Take the Shade Finder",
              buttonHref: "/shade-finder",
              align: "left",
            },
          },
          {
            id: "nuance-about-image",
            type: "image",
            props: {
              src: IMG.studio,
              alt: "NUANCE color lab, Lagos",
              caption: "Every shade is matched against real skin, not a swatch under studio light",
            },
          },
          {
            id: "nuance-about-body",
            type: "text",
            props: {
              heading: "Our story",
              body: "NUANCE started in a color lab in Lagos with a simple complaint: the deepest and palest shades in most ranges are usually formulated last, as an extension of a smaller core range — and it shows in how they oxidize, how they photograph, and how often they're out of stock. We built our 50 shades together from the start, tested against real skin across every undertone, and put a real shade-matching quiz in front of the guesswork instead of a swatch chart that looks nothing like a phone screen in real light.",
            },
          },
          {
            id: "nuance-about-values",
            type: "features",
            props: {
              heading: "What we stand for",
              items: [
                { title: "Formulated in Lagos", body: "Every shade is developed and tested locally, against the skin tones our customers actually have." },
                { title: "Undertone before depth", body: "We match undertone first because two people with the same depth often need completely different shades." },
                { title: "Cruelty-free", body: "Never tested on animals, at any stage of formulation." },
                { title: "A person replies", body: "The Shade Finder ends with a real shade name from our team, not an automated color match." },
              ],
            },
          },
          footer("nuance-footer-about"),
        ],
      },
      {
        slug: "faq",
        title: "FAQ",
        sections: [
          nav("nuance-nav-faq"),
          {
            id: "nuance-faq",
            type: "faq",
            props: {
              heading: "Frequently asked",
              items: [
                {
                  question: "What if my Shade Finder match isn't quite right?",
                  answer: "Message us on WhatsApp with a photo in natural light — we'll recommend an adjacent shade at no extra cost, and it's usually a half-shade adjustment.",
                },
                {
                  question: "Do you carry shades for very deep or very fair skin?",
                  answer: "Yes — our 50-shade range was built across the full depth spectrum from the start, not added on later as an 'extended' range.",
                },
                {
                  question: "How is the Shade Finder different from a color chart?",
                  answer: "It asks about undertone first, then depth, then finish preference — the same order a makeup artist would ask, instead of asking you to match a swatch under different lighting than you'll actually wear it in.",
                },
                {
                  question: "Where do you deliver?",
                  answer: "Lagos next-day, regional Nigeria and neighboring countries in 2–4 days. International shipping on request via WhatsApp.",
                },
                {
                  question: "Can I exchange a shade that doesn't match?",
                  answer: "Yes, within 7 days, opened or unopened. Message us on WhatsApp with a photo and we'll send the corrected shade before you send anything back.",
                },
              ],
              contactPanel: {
                heading: "Still not sure on your shade?",
                body: "Our team answers shade-matching questions directly on WhatsApp, usually within the hour.",
                buttonLabel: "Message us",
                buttonHref: "#whatsapp",
                imageUrl: IMG.founder,
              },
            },
          },
          {
            id: "nuance-faq-contact",
            type: "contact",
            props: {
              heading: "Get in touch",
              email: "hello@nuancebeauty.example",
              phone: PHONE,
              address: "Ikoyi, Lagos — shade-matching by appointment",
            },
          },
          {
            id: "nuance-faq-form",
            type: "form",
            props: {
              heading: "Send a message",
              subheading: "Orders, shade questions, wholesale — we read every note.",
              buttonLabel: "Send",
              successMessage: "Thanks — NUANCE received your message.",
              fields: [
                { id: "name", label: "Your name", type: "text", required: true, placeholder: "", options: [] },
                { id: "email", label: "Email", type: "email", required: true, placeholder: "you@email.com", options: [] },
                { id: "phone", label: "WhatsApp", type: "phone", required: false, placeholder: "+234…", options: [] },
                {
                  id: "topic",
                  label: "Topic",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Shade question", "Order help", "Wholesale", "Press", "Other"],
                },
                { id: "message", label: "Message", type: "textarea", required: true, placeholder: "How can we help?", options: [] },
              ],
            },
          },
          {
            id: "nuance-faq-wa",
            type: "whatsapp",
            props: {
              label: "WhatsApp NUANCE",
              phone: PHONE,
              message: "Hi NUANCE — I have a question.",
            },
          },
          footer("nuance-footer-faq"),
        ],
      },
    ],
  };
}

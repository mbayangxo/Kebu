import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * CLARTÉ — compatibility-first clinical skincare (public aesthetic).
 * Archetype: bright, ingredient-transparent skincare shop — distinct from LAYERS Beauty
 * (warm ritual/climate positioning) and the broader LUMIÈRE catalog seed (hyperpigmentation,
 * earthy French-language brand). CLARTÉ leans bold color-blocked accents on a paper-white base,
 * big confident sans display type, and a signature "Compatibility" page that teaches which
 * actives layer well together and which need space — the brand's whole reason for existing.
 * IA = Home · Shop · Compatibility · Routine · Reviews · About · FAQ.
 * All imagery is an empty slot (editable in Media) — no reference-site or stock URLs baked in.
 */

const IMG = {
  hero: "",
  barrierBalm: "",
  clarityDrops: "",
  cleanser: "",
  glowOil: "",
  shield: "",
  set: "",
  texture: "",
  lab: "",
  founder: "",
  chart: "",
  beforeAfterBefore: "",
  beforeAfterAfter: "",
} as const;

const PHONE = "+2250700000000";

const NAV = [
  { label: "Shop", href: "/shop" },
  { label: "Compatibility", href: "/compatibility" },
  { label: "Routine", href: "/routine" },
  { label: "Reviews", href: "/reviews" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
] as const;

const PRODUCTS = [
  {
    name: "Barrier Balm",
    description: "Ceramide + squalane recovery cream that reseals a stressed barrier without a heavy finish.",
    priceLabel: "21,000 FCFA",
    imageUrl: IMG.barrierBalm,
    whatsappMessage: "Hi CLARTÉ — I'd like to order the Barrier Balm.",
    goodFor: ["Reactive or compromised barrier", "Over-exfoliated skin", "Dry patches"],
    notGoodFor: ["Very oily skin wanting a mattifying step"],
    attributes: [
      { icon: "🛡️", label: "Fragrance-free" },
      { icon: "🧬", label: "5 ceramides" },
      { icon: "🔁", label: "Safe with actives" },
    ],
    crossSells: ["Clarity Drops", "Featherweight Cleanser"],
  },
  {
    name: "Clarity Drops",
    description: "10% niacinamide + zinc serum for congestion and oil balance — no tingling, no purge drama.",
    priceLabel: "19,500 FCFA",
    imageUrl: IMG.clarityDrops,
    whatsappMessage: "Hi CLARTÉ — I'd like to order Clarity Drops.",
    isSubscription: true,
    subscriptionInterval: "monthly",
    subscriptionDiscount: 10,
    goodFor: ["Oily or congested skin", "Visible pores", "Uneven texture"],
    notGoodFor: ["Same routine as our exfoliating serum — space them out"],
    attributes: [
      { icon: "🧪", label: "10% niacinamide" },
      { icon: "🌿", label: "No drying alcohol" },
    ],
    crossSells: ["Featherweight Cleanser", "Daily Shield SPF 30"],
  },
  {
    name: "Featherweight Cleanser",
    description: "pH 5.5 gel cleanser that lifts sunscreen and city dust without stripping the barrier underneath.",
    priceLabel: "10,500 FCFA",
    imageUrl: IMG.cleanser,
    whatsappMessage: "Hi CLARTÉ — I'd like to order the Featherweight Cleanser.",
    goodFor: ["All skin types", "Morning and evening use"],
    notGoodFor: ["Full waterproof makeup removal alone — balm first"],
    attributes: [
      { icon: "⚖️", label: "pH 5.5" },
      { icon: "🚫", label: "No SLS/SLES" },
    ],
    crossSells: ["Barrier Balm", "Compatible Glow Oil"],
  },
  {
    name: "Compatible Glow Oil",
    description: "Baobab and rosehip finishing oil built to layer on top of actives instead of fighting them.",
    priceLabel: "23,000 FCFA",
    imageUrl: IMG.glowOil,
    whatsappMessage: "Hi CLARTÉ — I'd like to order the Compatible Glow Oil.",
    goodFor: ["Dull or dehydrated skin", "Sealing in evening actives"],
    notGoodFor: ["Acne-prone skin wanting a fully oil-free routine"],
    attributes: [
      { icon: "🌍", label: "Baobab from Casamance" },
      { icon: "🔁", label: "Layers under or over actives" },
    ],
    crossSells: ["Barrier Balm", "Clarity Drops"],
  },
  {
    name: "Daily Shield SPF 30",
    description: "Lightweight, no-white-cast sunscreen-moisturizer built for humidity and daily wear under makeup.",
    priceLabel: "17,000 FCFA",
    imageUrl: IMG.shield,
    whatsappMessage: "Hi CLARTÉ — I'd like to order Daily Shield SPF 30.",
    goodFor: ["Daily wear, all skin tones", "Layering over Clarity Drops"],
    notGoodFor: ["Replacing reapplication after heavy sweating"],
    attributes: [
      { icon: "☀️", label: "SPF 30 broad spectrum" },
      { icon: "🎭", label: "No white cast" },
    ],
    crossSells: ["Clarity Drops", "Featherweight Cleanser"],
  },
] as const;

function nav(id: string) {
  return { id, type: "navigation" as const, props: { brand: "CLARTÉ", links: [...NAV] } };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© CLARTÉ Skin — compatible skincare, nothing to hide. Formulated & bottled in Abidjan.",
      links: [
        { label: "Shop", href: "/shop" },
        { label: "Compatibility", href: "/compatibility" },
        { label: "FAQ", href: "/faq" },
      ],
    },
  };
}

export function clarteSkincareWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "CLARTÉ",
    theme: {
      primary: "#141414",
      accent: "#FF5A36",
      background: "#FBF6EE",
      text: "#141414",
      surface: "#FFFFFF",
      link: "#2FA786",
      fontDisplay: "Archivo",
      fontBody: "Inter",
      spacing: "airy",
      contentWidth: "default",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "tight",
      radius: "round",
      buttonStyle: "solid",
      aestheticId: "clarte-compatible-skin",
      motion: "expressive",
    },
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          nav("clarte-nav-home"),
          {
            id: "clarte-announce",
            type: "announcement-bar",
            props: {
              text: "New: Clarity Drops — 10% niacinamide, zero purge drama. Shop now →",
              background: "#141414",
              color: "#FBF6EE",
              freeShippingThreshold: 25000,
              freeShippingCurrency: "FCFA",
              freeShippingAchievedText: "Free delivery unlocked 🎉",
            },
          },
          {
            id: "clarte-hero",
            type: "hero",
            props: {
              heading: "Skincare that plays nice together.",
              subheading:
                "Every CLARTÉ formula is built to be biocompatible — with your skin barrier, and with everything else in your routine. No guessing which serums fight each other.",
              buttonLabel: "Shop the edit",
              buttonHref: "/shop",
              align: "left",
              background: "#FBF6EE",
            },
          },
          {
            id: "clarte-hero-image",
            type: "image",
            props: {
              src: IMG.hero,
              alt: "CLARTÉ product edit on a bright color-blocked surface",
              caption: "Five formulas. One compatibility chart. No fragrance, no guesswork.",
            },
          },
          {
            id: "clarte-trust",
            type: "trust-badges",
            props: {
              items: [
                { icon: "🧬", label: "Biocompatible formulas", description: "Barrier-first, always" },
                { icon: "🔍", label: "Full ingredient lists", description: "On every product page" },
                { icon: "🚚", label: "Delivery across West Africa", description: "Wave · Orange Money · JOKO" },
                { icon: "💬", label: "Ask a formulator", description: "WhatsApp reply under 1h" },
              ],
              layout: "strip",
            },
          },
          {
            id: "clarte-bestsellers",
            type: "products",
            props: {
              heading: "Start here",
              subheading: "The five formulas that make up a full compatible routine.",
              layout: "grid",
              columns: 4,
              orderStyle: "sheet",
              orderCtaLabel: "Add to order",
              items: [...PRODUCTS],
            },
          },
          {
            id: "clarte-method",
            type: "features",
            props: {
              heading: "The CLARTÉ method",
              subheading: "Three rules behind every formula we ship.",
              items: [
                { icon: "🧬", title: "Barrier first", body: "If a formula weakens the skin barrier to get results, we don't ship it — no matter how good the before/after looks." },
                { icon: "🔎", title: "Nothing to hide", body: "Full concentration and ingredient lists on every product page. If we can't explain why it's in there, it's not in there." },
                { icon: "🔁", title: "Built to layer", body: "Every formula is tested against the rest of the line so you're not guessing what fights what at 7am." },
              ],
            },
          },
          {
            id: "clarte-in-out",
            type: "features",
            props: {
              heading: "In the formula / Left out on purpose",
              items: [
                { title: "✓ Ceramides & ceramide precursors", body: "Rebuild the barrier instead of just coating it." },
                { title: "✓ Baobab, moringa, marula oils", body: "Regionally sourced, cold-pressed, no synthetic fragrance masking their natural scent." },
                { title: "✗ Synthetic fragrance & dyes", body: "The #1 cause of reactions we saw before starting CLARTÉ — left out of every formula." },
                { title: "✗ Drying alcohols & sulfates", body: "They give an instant matte feel and a compromised barrier a week later. Not worth the trade." },
              ],
            },
          },
          {
            id: "clarte-before-after",
            type: "before-after",
            props: {
              heading: "The 7-day barrier reset",
              subheading: "Cleanser + Barrier Balm, morning and night, nothing else — most redness and tightness eases within a week.",
              beforeImageUrl: IMG.beforeAfterBefore,
              afterImageUrl: IMG.beforeAfterAfter,
              beforeLabel: "Day 1",
              afterLabel: "Day 7",
              initialPosition: 50,
            },
          },
          {
            id: "clarte-reviews-tease",
            type: "testimonials",
            props: {
              heading: "What compatible skin feels like",
              topics: ["Barrier repair", "Oil balance", "Texture", "Sensitivity"],
              items: [
                {
                  quote: "I stopped mixing five different serums and started using three that were actually built to work together. My skin has never been calmer.",
                  name: "Awa T.",
                  role: "Combination skin — Abidjan",
                  skinType: "Combination",
                  skinConcern: "Sensitivity from over-exfoliating",
                  reviewTopics: ["Barrier repair", "Sensitivity"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Clarity Drops is the first niacinamide serum that didn't make me pick between shine control and comfort. Repurchased twice.",
                  name: "Nana B.",
                  role: "Oily skin — Accra",
                  skinType: "Oily",
                  skinConcern: "Congestion and shine",
                  reviewTopics: ["Oil balance", "Texture"],
                  verified: true,
                  rating: 5,
                },
              ],
            },
          },
          {
            id: "clarte-social-proof",
            type: "social-proof",
            props: {
              items: [
                { name: "Fatou", location: "Abidjan", product: "Barrier Balm", minutesAgo: 4 },
                { name: "Kwame", location: "Accra", product: "Clarity Drops", minutesAgo: 9 },
                { name: "Mariam", location: "Dakar", product: "Compatible Glow Oil", minutesAgo: 14 },
              ],
              interval: 9,
              position: "bottom-left",
            },
          },
          {
            id: "clarte-newsletter",
            type: "newsletter",
            props: {
              heading: "Get the compatibility chart",
              subheading: "New formulas, restocks, and the full pairing guide — straight to your inbox.",
              buttonLabel: "Send it to me",
              successMessage: "You're in — check your inbox for the chart.",
            },
          },
          {
            id: "clarte-popup",
            type: "email-popup",
            props: {
              enabled: true,
              mode: "both",
              heading: "Get 10% off your first routine",
              body: "Join the list for the compatibility chart, restocks, and a welcome code.",
              buttonLabel: "Get the code",
              dismissLabel: "Not now",
              delaySeconds: 6,
              remindAfterDays: 14,
            },
          },
          {
            id: "clarte-wa-home",
            type: "whatsapp",
            props: {
              label: "Ask a formulator",
              phone: PHONE,
              message: "Hi CLARTÉ — I have a question about a formula.",
            },
          },
          footer("clarte-footer-home"),
        ],
      },
      {
        slug: "shop",
        title: "Shop",
        sections: [
          nav("clarte-nav-shop"),
          {
            id: "clarte-shop-hero",
            type: "hero",
            props: {
              heading: "Shop the full line",
              subheading: "Five formulas, built to be used together. Filter by what your skin needs.",
              buttonLabel: "Not sure where to start?",
              buttonHref: "/routine",
              align: "center",
            },
          },
          {
            id: "clarte-shop-products",
            type: "products",
            props: {
              heading: "All products",
              layout: "grid",
              columns: 3,
              orderStyle: "sheet",
              orderCtaLabel: "Place order",
              promoBanner: {
                text: "Order the full 5-step set → free delivery + compatibility chart included",
                subtext: "Or subscribe to any serum for 10% off, every month",
                background: "#FF5A36",
                color: "#FBF6EE",
                insertAfterIndex: 2,
              },
              items: [
                ...PRODUCTS,
                {
                  name: "The Compatible Set",
                  description: "Cleanser, Clarity Drops, Barrier Balm, Glow Oil, Daily Shield — the whole routine, pre-paired.",
                  priceLabel: "78,000 FCFA",
                  valuePriceLabel: "91,000 FCFA",
                  imageUrl: IMG.set,
                  whatsappMessage: "Hi CLARTÉ — I'd like to order The Compatible Set.",
                  badge: "SET",
                  goodFor: ["First-time customers", "Simplifying an over-crowded routine"],
                  notGoodFor: [],
                  attributes: [{ icon: "🎁", label: "14% cheaper than buying separately" }],
                },
              ],
            },
          },
          {
            id: "clarte-shop-trust",
            type: "trust-badges",
            props: {
              items: [
                { icon: "🔒", label: "Secure checkout", description: "Wave · Orange Money · card" },
                { icon: "🚚", label: "Delivery", description: "Abidjan next-day · regional 2–4 days" },
                { icon: "↩️", label: "7-day exchange", description: "Unopened items, no questions" },
              ],
              layout: "grid",
            },
          },
          footer("clarte-footer-shop"),
        ],
      },
      {
        slug: "compatibility",
        title: "Compatibility",
        sections: [
          nav("clarte-nav-compatibility"),
          {
            id: "clarte-compat-hero",
            type: "hero",
            props: {
              heading: "Know what you're layering.",
              subheading:
                "Most skin irritation isn't one bad product — it's two good products used at the same time. Here's what pairs well, and what needs space.",
              buttonLabel: "Shop compatible formulas",
              buttonHref: "/shop",
              align: "left",
              background: "#141414",
            },
          },
          {
            id: "clarte-compat-image",
            type: "image",
            props: {
              src: IMG.chart,
              alt: "CLARTÉ compatibility chart showing which actives pair well",
              caption: "The chart we hand every first-time customer",
            },
          },
          {
            id: "clarte-compat-pairs",
            type: "features",
            props: {
              heading: "Pairs well together",
              items: [
                { title: "Clarity Drops + Daily Shield", body: "Niacinamide in the morning, sealed under SPF — no pilling, no sensitivity." },
                { title: "Barrier Balm + Compatible Glow Oil", body: "Cream first, oil to seal it in at night. Built to layer in that order." },
                { title: "Featherweight Cleanser + anything", body: "Gentle enough to be the first step in any routine, ours or not." },
              ],
            },
          },
          {
            id: "clarte-compat-space",
            type: "features",
            props: {
              heading: "Give it space",
              items: [
                { title: "Clarity Drops + exfoliating acids", body: "Both can sting on their own. Use one in the morning, the other at night — not stacked." },
                { title: "Retinol alternatives + vitamin C", body: "Both are actives your skin has to adjust to. Alternate nights for the first month." },
                { title: "Two rich creams at once", body: "More isn't more here — it just sits on top and does less. One barrier step is usually enough." },
              ],
            },
          },
          {
            id: "clarte-compat-glossary",
            type: "text",
            props: {
              heading: "The short ingredient glossary",
              body: "We keep this list short on purpose — every ingredient below is doing one clear job, not padding a label.",
            },
          },
          {
            id: "clarte-compat-ingredients",
            type: "features",
            props: {
              heading: "What's actually in the bottle",
              items: [
                { title: "Ceramides", body: "The lipids your barrier is made of — replacing what harsh cleansing strips away." },
                { title: "Niacinamide (10%)", body: "Calms visible redness and helps regulate oil without a drying effect." },
                { title: "Baobab seed oil", body: "Cold-pressed in Casamance. Absorbs fast, doesn't clog, layers under makeup." },
                { title: "Zinc PCA", body: "Helps keep congestion down without the harshness of older acne actives." },
                { title: "Squalane", body: "A weightless moisture layer that won't compete with active ingredients underneath." },
              ],
            },
          },
          {
            id: "clarte-compat-wa",
            type: "whatsapp",
            props: {
              label: "Ask our formulator about your routine",
              phone: PHONE,
              message: "Hi CLARTÉ — I want to check if my routine is compatible. Here's what I currently use:",
            },
          },
          footer("clarte-footer-compatibility"),
        ],
      },
      {
        slug: "routine",
        title: "Routine",
        sections: [
          nav("clarte-nav-routine"),
          {
            id: "clarte-routine-hero",
            type: "hero",
            props: {
              heading: "Build a routine that won't fight itself",
              subheading: "Answer three questions — we'll send a routine and the order to apply it in, straight to WhatsApp.",
              buttonLabel: "Start the quiz",
              buttonHref: "#quiz",
              align: "center",
              background: "#141414",
            },
          },
          {
            id: "clarte-quiz",
            type: "quiz",
            props: {
              heading: "Find your routine",
              subheading: "Takes under a minute.",
              ctaLabel: "Send my routine on WhatsApp",
              whatsappPhone: PHONE,
              whatsappIntro: "Hi CLARTÉ — here are my quiz answers:",
              steps: [
                {
                  id: "skin_type",
                  question: "How would you describe your skin?",
                  options: ["Dry", "Oily", "Combination", "Sensitive / reactive", "Not sure yet"],
                  icon: "🧴",
                },
                {
                  id: "concern",
                  question: "What's the main thing you'd change?",
                  options: ["Redness or sensitivity", "Oil and congestion", "Dullness", "Fine lines", "Just want a simple routine"],
                  icon: "🎯",
                },
                {
                  id: "current_routine",
                  question: "How many products are you using right now?",
                  options: ["None — starting fresh", "1–2 products", "3–5 products", "6 or more — it's a lot"],
                  icon: "🗂️",
                },
              ],
            },
          },
          {
            id: "clarte-routine-steps",
            type: "features",
            props: {
              heading: "The default order",
              items: [
                { title: "1. Cleanse", body: "Morning and night — Featherweight Cleanser removes the day without stripping." },
                { title: "2. Treat", body: "Clarity Drops in the morning, alternated with Compatible Glow Oil at night." },
                { title: "3. Repair", body: "Barrier Balm wherever skin feels tight, dry, or reactive — layer it last at night." },
                { title: "4. Protect", body: "Daily Shield SPF 30 every morning, rain or shine — non-negotiable in this climate." },
              ],
            },
          },
          footer("clarte-footer-routine"),
        ],
      },
      {
        slug: "reviews",
        title: "Reviews",
        sections: [
          nav("clarte-nav-reviews"),
          {
            id: "clarte-reviews-hero",
            type: "hero",
            props: {
              heading: "Real routines, real skin",
              subheading: "Verified reviews with skin type and concern attached — so you're comparing against someone like you.",
              buttonLabel: "Leave a review",
              buttonHref: "/faq",
              align: "center",
              background: "#141414",
            },
          },
          {
            id: "clarte-reviews-list",
            type: "testimonials",
            props: {
              heading: "Verified reviews",
              topics: ["Barrier repair", "Oil balance", "Texture", "Sensitivity", "Long-term results"],
              items: [
                {
                  quote: "Three months on the Compatible Set. My skin stopped reacting to everything — turns out it was never one product, it was three fighting each other.",
                  name: "Rokhaya D.",
                  role: "Sensitive skin · 3 months — Dakar",
                  skinType: "Sensitive",
                  skinConcern: "Reactivity",
                  reviewTopics: ["Barrier repair", "Sensitivity"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Daily Shield is the only SPF I've worn every day without a white cast or breakouts. Simple as that.",
                  name: "Adjoa M.",
                  role: "Combination skin — Accra",
                  skinType: "Combination",
                  skinConcern: "Sun protection without residue",
                  reviewTopics: ["Texture"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "The compatibility chart alone was worth signing up for the newsletter. I finally understand why my old routine wasn't working.",
                  name: "Bineta S.",
                  role: "Oily skin — Abidjan",
                  skinType: "Oily",
                  skinConcern: "Oil balance",
                  reviewTopics: ["Oil balance", "Long-term results"],
                  verified: true,
                  rating: 5,
                },
              ],
            },
          },
          footer("clarte-footer-reviews"),
        ],
      },
      {
        slug: "about",
        title: "About",
        sections: [
          nav("clarte-nav-about"),
          {
            id: "clarte-about-hero",
            type: "hero",
            props: {
              heading: "We got tired of routines that fought each other",
              subheading: "CLARTÉ started in a small formulation lab in Abidjan with one question: why does more skincare so often mean worse skin?",
              buttonLabel: "See the compatibility chart",
              buttonHref: "/compatibility",
              align: "left",
            },
          },
          {
            id: "clarte-about-image",
            type: "image",
            props: {
              src: IMG.lab,
              alt: "CLARTÉ formulation lab, Abidjan",
              caption: "Small-batch, tested together — not just tested alone",
            },
          },
          {
            id: "clarte-about-body",
            type: "text",
            props: {
              heading: "Our story",
              body: "CLARTÉ was started by a cosmetic chemist who kept seeing the same pattern: customers layering four or five well-reviewed products, each fine on its own, that added up to redness, breakouts, or a barrier that couldn't keep up. Instead of launching one more serum into that pile, we built a small line designed to be used as a set — and published exactly how the pieces fit together. No mystery blends, no filler ingredients, and a compatibility chart before a marketing tagline.",
            },
          },
          {
            id: "clarte-about-values",
            type: "features",
            props: {
              heading: "What we stand for",
              items: [
                { title: "Formulated & bottled in Abidjan", body: "Regional sourcing for baobab, moringa, and marula — shorter supply chain, fresher oils." },
                { title: "Full transparency", body: "Every concentration we can legally disclose, disclosed. No 'proprietary blend' hiding a short ingredient list." },
                { title: "Cruelty-free", body: "Never tested on animals, at any stage of formulation." },
                { title: "Compatible by design", body: "Every new formula is tested alongside the rest of the line before it ships, not just alone." },
              ],
            },
          },
          footer("clarte-footer-about"),
        ],
      },
      {
        slug: "faq",
        title: "FAQ",
        sections: [
          nav("clarte-nav-faq"),
          {
            id: "clarte-faq",
            type: "faq",
            props: {
              heading: "Frequently asked",
              items: [
                {
                  question: "Do I need to buy the whole set to see results?",
                  answer: "No — Featherweight Cleanser and Barrier Balm alone cover most reactive-skin concerns. The set is a convenience, not a requirement.",
                },
                {
                  question: "How do I know if two products are compatible?",
                  answer: "Check the Compatibility page — it covers our own line and the most common actives (retinol alternatives, vitamin C, exfoliating acids) you might already be using.",
                },
                {
                  question: "Is CLARTÉ safe for sensitive or reactive skin?",
                  answer: "Every formula is fragrance-free and tested for compatibility with the rest of the line. If you're currently reacting to something, start with Featherweight Cleanser + Barrier Balm alone for a week.",
                },
                {
                  question: "Where do you deliver?",
                  answer: "Abidjan next-day, regional Côte d'Ivoire and neighboring countries in 2–4 days. International shipping on request via WhatsApp.",
                },
                {
                  question: "Can I return an opened product?",
                  answer: "Unopened items within 7 days, no questions asked. Reaction to an opened product — message us on WhatsApp with a photo and we'll sort it out directly.",
                },
              ],
              contactPanel: {
                heading: "Still have a question?",
                body: "Our formulator answers routine and compatibility questions directly on WhatsApp — usually within the hour.",
                buttonLabel: "Message us",
                buttonHref: "#whatsapp",
                imageUrl: IMG.founder,
              },
            },
          },
          {
            id: "clarte-faq-contact",
            type: "contact",
            props: {
              heading: "Get in touch",
              email: "hello@clarteskin.example",
              phone: PHONE,
              address: "Cocody, Abidjan — showroom by appointment",
            },
          },
          {
            id: "clarte-faq-form",
            type: "form",
            props: {
              heading: "Send a message",
              subheading: "Orders, wholesale, press — we read every note.",
              buttonLabel: "Send",
              successMessage: "Thanks — CLARTÉ received your message.",
              fields: [
                { id: "name", label: "Your name", type: "text", required: true, placeholder: "", options: [] },
                { id: "email", label: "Email", type: "email", required: true, placeholder: "you@email.com", options: [] },
                { id: "phone", label: "WhatsApp", type: "phone", required: false, placeholder: "+225…", options: [] },
                {
                  id: "topic",
                  label: "Topic",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Routine question", "Order help", "Wholesale", "Press", "Other"],
                },
                { id: "message", label: "Message", type: "textarea", required: true, placeholder: "How can we help?", options: [] },
              ],
            },
          },
          {
            id: "clarte-faq-wa",
            type: "whatsapp",
            props: {
              label: "WhatsApp CLARTÉ",
              phone: PHONE,
              message: "Hi CLARTÉ — I have a question.",
            },
          },
          footer("clarte-footer-faq"),
        ],
      },
    ],
  };
}

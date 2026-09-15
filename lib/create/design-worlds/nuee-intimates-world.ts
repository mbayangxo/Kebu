import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * NUÉE — foundations-first intimates & loungewear (public aesthetic).
 * Archetype: confident, size-inclusive DTC intimates shop — distinct from the existing Fashion
 * pair (fashion-atelier's editorial lookbook, clothing-company's catalog-first ready-to-wear).
 * NUÉE's whole reason for existing is a signature "Fit Finder" quiz that routes a real band/cup/
 * coverage answer straight to a human on WhatsApp instead of a generic size chart nobody trusts.
 * Soft blush surfaces, a confident coral accent, editorial serif display type against a plain sans
 * body — premium-DTC-intimates without borrowing any single brand's actual mark, name, or copy.
 * IA = Home · Shop · Fit Finder · Reviews · About · FAQ.
 * All imagery is an empty slot (editable in Media) — no reference-site or stock URLs baked in.
 */

const IMG = {
  hero: "",
  secondSkinBra: "",
  noRulesBrief: "",
  holdEverythingCorset: "",
  offDutySet: "",
  bareLayerCami: "",
  drawer: "",
  fitChart: "",
  founder: "",
  studio: "",
} as const;

const PHONE = "+2348000000000";

const NAV = [
  { label: "Shop", href: "/shop" },
  { label: "Fit Finder", href: "/fit-finder" },
  { label: "Reviews", href: "/reviews" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
] as const;

const PRODUCTS = [
  {
    name: "Second Skin Bra",
    description: "Wireless everyday bra molded to sit flat under everything — no underwire dig, no seam show-through.",
    priceLabel: "12,000 FCFA",
    imageUrl: IMG.secondSkinBra,
    whatsappMessage: "Hi NUÉE — I'd like to order the Second Skin Bra.",
    goodFor: ["Everyday wear under fitted tops", "Sensitive skin around the band"],
    notGoodFor: ["Maximum lift for larger cup sizes — see Hold Everything"],
    attributes: [
      { icon: "🪶", label: "Wireless" },
      { icon: "📏", label: "12 band/cup sizes" },
    ],
    crossSells: ["No-Rules Brief", "Bare Layer Cami"],
    filterTags: ["bras", "everyday"],
  },
  {
    name: "No-Rules Brief",
    description: "Seamless brief in three cuts — full, mid, and cheeky — cut from the same soft, breathable knit.",
    priceLabel: "6,500 FCFA",
    imageUrl: IMG.noRulesBrief,
    whatsappMessage: "Hi NUÉE — I'd like to order the No-Rules Brief.",
    hasVariants: false,
    goodFor: ["Daily wear", "Under fitted or light-colored bottoms"],
    notGoodFor: [],
    attributes: [{ icon: "🧵", label: "Seamless" }],
    crossSells: ["Second Skin Bra"],
    filterTags: ["underwear", "everyday"],
  },
  {
    name: "Hold Everything Corset",
    description: "Structured shaping corset with real boning — built for going out, not for holding your breath.",
    priceLabel: "24,000 FCFA",
    imageUrl: IMG.holdEverythingCorset,
    whatsappMessage: "Hi NUÉE — I'd like to order the Hold Everything Corset.",
    badge: "BEST SELLER",
    goodFor: ["Fuller busts wanting real lift", "Occasion wear"],
    notGoodFor: ["All-day desk wear — this one's for going out"],
    attributes: [
      { icon: "🦴", label: "Flexible boning" },
      { icon: "🎯", label: "True lift, not just compression" },
    ],
    crossSells: ["Off-Duty Set"],
    filterTags: ["shaping", "occasion"],
  },
  {
    name: "Off-Duty Set",
    description: "Matching rib-knit top and short — soft enough for the sofa, put-together enough for the door.",
    priceLabel: "19,000 FCFA",
    imageUrl: IMG.offDutySet,
    whatsappMessage: "Hi NUÉE — I'd like to order the Off-Duty Set.",
    goodFor: ["Loungewear", "Travel"],
    notGoodFor: [],
    attributes: [{ icon: "🌙", label: "Sold as a set or separates" }],
    crossSells: ["Bare Layer Cami"],
    filterTags: ["loungewear"],
  },
  {
    name: "Bare Layer Cami",
    description: "A camisole thin enough to layer, sturdy enough to wear alone — built-in shelf bra, no bulk.",
    priceLabel: "9,500 FCFA",
    imageUrl: IMG.bareLayerCami,
    whatsappMessage: "Hi NUÉE — I'd like to order the Bare Layer Cami.",
    goodFor: ["Layering under blazers or sheer tops", "Warm-weather sleep"],
    notGoodFor: [],
    attributes: [{ icon: "🎀", label: "Built-in shelf bra" }],
    crossSells: ["Off-Duty Set", "Second Skin Bra"],
    filterTags: ["loungewear", "everyday"],
  },
] as const;

function nav(id: string) {
  return { id, type: "navigation" as const, props: { brand: "NUÉE", links: [...NAV] } };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© NUÉE — foundations for real bodies. Designed in Lagos, fit-tested on 40+ body types before a single seam shipped.",
      links: [
        { label: "Shop", href: "/shop" },
        { label: "Fit Finder", href: "/fit-finder" },
        { label: "FAQ", href: "/faq" },
      ],
    },
  };
}

export function nueeIntimatesWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "NUÉE",
    theme: {
      primary: "#2B1218",
      accent: "#E85B4A",
      background: "#FDF3EF",
      text: "#2B1218",
      surface: "#FFFFFF",
      link: "#B4483A",
      fontDisplay: "Fraunces",
      fontBody: "Inter",
      spacing: "airy",
      contentWidth: "default",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "round",
      buttonStyle: "solid",
      aestheticId: "nuee-intimates",
    },
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          nav("nuee-nav-home"),
          {
            id: "nuee-announce",
            type: "announcement-bar",
            props: {
              text: "New in: Off-Duty Set. 40+ sizes, one fit finder that actually works. Shop now →",
              background: "#2B1218",
              color: "#FDF3EF",
              freeShippingThreshold: 20000,
              freeShippingCurrency: "FCFA",
              freeShippingAchievedText: "Free delivery unlocked 🎉",
            },
          },
          {
            id: "nuee-hero",
            type: "hero",
            props: {
              heading: "Foundations that fit the body you actually have.",
              subheading:
                "Forty-plus band and cup combinations, a two-minute fit finder, and a real person on WhatsApp when the chart still isn't enough.",
              buttonLabel: "Find my fit",
              buttonHref: "/fit-finder",
              align: "left",
              background: "#FDF3EF",
            },
          },
          {
            id: "nuee-hero-image",
            type: "image",
            props: {
              src: IMG.hero,
              alt: "NUÉE intimates on a soft blush studio background",
              caption: "Five essentials. One size range that doesn't stop at a large.",
            },
          },
          {
            id: "nuee-trust",
            type: "trust-badges",
            props: {
              items: [
                { icon: "📏", label: "40+ sizes", description: "Not just S–XL relabeled" },
                { icon: "🧑‍🎨", label: "Fit-tested, not just sized", description: "On real bodies before launch" },
                { icon: "🚚", label: "Delivery across West Africa", description: "Wave · Orange Money · JOKO" },
                { icon: "💬", label: "Ask about your fit", description: "WhatsApp reply under 1h" },
              ],
              layout: "strip",
            },
          },
          {
            id: "nuee-bestsellers",
            type: "products",
            props: {
              heading: "Start here",
              subheading: "The five pieces most first orders build around.",
              layout: "grid",
              columns: 4,
              orderStyle: "sheet",
              orderCtaLabel: "Add to order",
              items: [...PRODUCTS],
            },
          },
          {
            id: "nuee-method",
            type: "features",
            props: {
              heading: "The NUÉE approach",
              subheading: "Three rules behind every piece we cut.",
              items: [
                { icon: "📐", title: "Size range first", body: "We design the largest and smallest sizes at the same time as the sample size — not as an afterthought scaled up." },
                { icon: "🙅", title: "No underwire tax", body: "Support doesn't have to mean wire. Our best sellers are wireless because that's what actually gets worn twice." },
                { icon: "🗣️", title: "A real fit answer", body: "The Fit Finder ends in a WhatsApp message from a person, not a size chart you have to interpret yourself." },
              ],
            },
          },
          {
            id: "nuee-social-proof",
            type: "social-proof",
            props: {
              items: [
                { name: "Chidinma", location: "Lagos", product: "Hold Everything Corset", minutesAgo: 6 },
                { name: "Efua", location: "Accra", product: "Second Skin Bra", minutesAgo: 11 },
                { name: "Aissatou", location: "Dakar", product: "Off-Duty Set", minutesAgo: 19 },
              ],
              interval: 9,
              position: "bottom-left",
            },
          },
          {
            id: "nuee-reviews-tease",
            type: "testimonials",
            props: {
              heading: "What actually fitting feels like",
              topics: ["Fit", "Comfort", "Support", "Sizing"],
              items: [
                {
                  quote: "I filled out the Fit Finder half expecting nothing to come of it. Got a WhatsApp message twenty minutes later with the exact size and it was right.",
                  name: "Zainab O.",
                  role: "Full bust — Lagos",
                  skinType: "",
                  skinConcern: "",
                  reviewTopics: ["Fit", "Support"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "First bra in years without a red mark on my shoulders by 3pm. Ordering three more.",
                  name: "Precious A.",
                  role: "Everyday wear — Abuja",
                  skinType: "",
                  skinConcern: "",
                  reviewTopics: ["Comfort"],
                  verified: true,
                  rating: 5,
                },
              ],
            },
          },
          {
            id: "nuee-newsletter",
            type: "newsletter",
            props: {
              heading: "Get restock alerts on your size",
              subheading: "Tell us your fit once — we'll tell you the moment it's back.",
              buttonLabel: "Notify me",
              successMessage: "You're on the list — we'll message you when your size restocks.",
            },
          },
          {
            id: "nuee-popup",
            type: "email-popup",
            props: {
              enabled: true,
              mode: "both",
              heading: "10% off your first order",
              body: "Join the list for restock alerts and a welcome code — no spam, just sizes.",
              buttonLabel: "Get the code",
              dismissLabel: "Not now",
              delaySeconds: 6,
              remindAfterDays: 14,
            },
          },
          {
            id: "nuee-wa-home",
            type: "whatsapp",
            props: {
              label: "Ask about your fit",
              phone: PHONE,
              message: "Hi NUÉE — I have a question about sizing.",
            },
          },
          footer("nuee-footer-home"),
        ],
      },
      {
        slug: "shop",
        title: "Shop",
        sections: [
          nav("nuee-nav-shop"),
          {
            id: "nuee-shop-hero",
            type: "hero",
            props: {
              heading: "Shop the full range",
              subheading: "Bras, underwear, shapewear, and loungewear — filter by what you're dressing for.",
              buttonLabel: "Not sure on sizing?",
              buttonHref: "/fit-finder",
              align: "center",
            },
          },
          {
            id: "nuee-shop-products",
            type: "products",
            props: {
              heading: "All products",
              layout: "grid",
              columns: 3,
              orderStyle: "sheet",
              orderCtaLabel: "Place order",
              filterLabel: "Filter by category",
              promoBanner: {
                text: "Build The Starter Drawer → 3 briefs + 1 bra, free delivery included",
                subtext: "Or message us your fit for a personal recommendation",
                background: "#E85B4A",
                color: "#FDF3EF",
                insertAfterIndex: 2,
              },
              items: [
                ...PRODUCTS,
                {
                  name: "The Starter Drawer",
                  description: "Second Skin Bra, three No-Rules Briefs in your cut of choice, and a Bare Layer Cami — the everyday drawer, pre-built.",
                  priceLabel: "34,000 FCFA",
                  valuePriceLabel: "40,500 FCFA",
                  imageUrl: IMG.drawer,
                  whatsappMessage: "Hi NUÉE — I'd like to order The Starter Drawer.",
                  badge: "SET",
                  goodFor: ["First-time customers", "Restocking basics"],
                  notGoodFor: [],
                  attributes: [{ icon: "🎁", label: "16% cheaper than buying separately" }],
                  filterTags: ["bras", "underwear", "everyday"],
                },
              ],
            },
          },
          {
            id: "nuee-shop-trust",
            type: "trust-badges",
            props: {
              items: [
                { icon: "🔒", label: "Secure checkout", description: "Wave · Orange Money · card" },
                { icon: "🚚", label: "Delivery", description: "Lagos next-day · regional 2–4 days" },
                { icon: "↩️", label: "7-day exchange", description: "Unworn items, tags on" },
              ],
              layout: "grid",
            },
          },
          footer("nuee-footer-shop"),
        ],
      },
      {
        slug: "fit-finder",
        title: "Fit Finder",
        sections: [
          nav("nuee-nav-fit-finder"),
          {
            id: "nuee-fit-hero",
            type: "hero",
            props: {
              heading: "Stop guessing your size.",
              subheading: "Three questions, no measuring tape required — we'll send your fit and a starting recommendation straight to WhatsApp.",
              buttonLabel: "Start the quiz",
              buttonHref: "#quiz",
              align: "center",
              background: "#2B1218",
            },
          },
          {
            id: "nuee-quiz",
            type: "quiz",
            props: {
              heading: "Find your fit",
              subheading: "Takes under a minute.",
              ctaLabel: "Send my fit on WhatsApp",
              whatsappPhone: PHONE,
              whatsappIntro: "Hi NUÉE — here are my Fit Finder answers:",
              steps: [
                {
                  id: "current_bra",
                  question: "What's not working about your current bra?",
                  options: ["Band rides up", "Straps dig in", "Cups gap or spill", "Nothing's wrong, just exploring", "I don't currently wear one that fits well"],
                  icon: "🎗️",
                },
                {
                  id: "coverage",
                  question: "What coverage do you usually reach for?",
                  options: ["Full coverage, everyday", "Light, barely-there", "Structured, extra lift", "Depends on the outfit"],
                  icon: "🧺",
                },
                {
                  id: "priority",
                  question: "What matters most right now?",
                  options: ["All-day comfort", "Support for a fuller bust", "Building a basics drawer", "Something for a specific occasion"],
                  icon: "🎯",
                },
              ],
            },
          },
          {
            id: "nuee-fit-image",
            type: "image",
            props: {
              src: IMG.fitChart,
              alt: "NUÉE fit range chart across band and cup sizes",
              caption: "The chart our team checks your answers against before replying",
            },
          },
          {
            id: "nuee-fit-tips",
            type: "features",
            props: {
              heading: "Reading your own fit",
              items: [
                { title: "The band does the work", body: "If your shoulders hurt by afternoon, it's almost always the band riding up, not the straps — size down the band before sizing up the cup." },
                { title: "Cups shouldn't gap or spill", body: "Gapping at the top means the cup's too big; spilling at the sides means it's too small. Both usually mean a half-size, not a full jump." },
                { title: "Sizes vary by style", body: "A corset and a wireless bra fit differently by design — that's why the Fit Finder asks about the piece, not just your measurements." },
              ],
            },
          },
          footer("nuee-footer-fit-finder"),
        ],
      },
      {
        slug: "reviews",
        title: "Reviews",
        sections: [
          nav("nuee-nav-reviews"),
          {
            id: "nuee-reviews-hero",
            type: "hero",
            props: {
              heading: "Real fits, real bodies",
              subheading: "Verified reviews, size worn included — so you're comparing against someone built like you.",
              buttonLabel: "Leave a review",
              buttonHref: "/faq",
              align: "center",
              background: "#2B1218",
            },
          },
          {
            id: "nuee-reviews-list",
            type: "testimonials",
            props: {
              heading: "Verified reviews",
              topics: ["Fit", "Comfort", "Support", "Sizing", "Delivery"],
              items: [
                {
                  quote: "Ordered a size I'd never normally try because the Fit Finder recommended it. First bra that's ever actually fit both the band and the cup at once.",
                  name: "Halima Y.",
                  role: "Fit Finder customer — Kano",
                  skinType: "",
                  skinConcern: "",
                  reviewTopics: ["Fit", "Sizing"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "The Starter Drawer set is genuinely all I wear now. Soft enough for bed, structured enough that I don't think about it under clothes.",
                  name: "Ngozi K.",
                  role: "Everyday wear — Lagos",
                  skinType: "",
                  skinConcern: "",
                  reviewTopics: ["Comfort"],
                  verified: true,
                  rating: 5,
                },
              ],
            },
          },
          footer("nuee-footer-reviews"),
        ],
      },
      {
        slug: "about",
        title: "About",
        sections: [
          nav("nuee-nav-about"),
          {
            id: "nuee-about-hero",
            type: "hero",
            props: {
              heading: "We measured the sample size last, not first",
              subheading: "NUÉE started with a simple complaint: most 'inclusive sizing' just scales one pattern up and down instead of fitting each size on its own body.",
              buttonLabel: "Take the Fit Finder",
              buttonHref: "/fit-finder",
              align: "left",
            },
          },
          {
            id: "nuee-about-image",
            type: "image",
            props: {
              src: IMG.studio,
              alt: "NUÉE fit studio, Lagos",
              caption: "Every size is fit-tested on its own body, not extrapolated from a medium",
            },
          },
          {
            id: "nuee-about-body",
            type: "text",
            props: {
              heading: "Our story",
              body: "NUÉE was started after one too many 'extended size' bras that were really just a medium with a longer strap. We rebuilt the pattern-making process from the smallest size up, fit-testing each size range on its own body instead of grading one sample size mathematically across the rest. The Fit Finder exists because a size chart alone was never going to fix that — someone still has to look at the actual answer and reply.",
            },
          },
          {
            id: "nuee-about-values",
            type: "features",
            props: {
              heading: "What we stand for",
              items: [
                { title: "Designed & sampled in Lagos", body: "Every pattern is graded and sample-tested locally before it goes into production." },
                { title: "Fit before fashion", body: "A piece doesn't ship until it's been tested across our full size range, not just the sample size." },
                { title: "No wire tax", body: "Support and comfort aren't a trade-off we ask you to accept — most of the range is wireless by design." },
                { title: "A person replies", body: "The Fit Finder ends with a real answer from our team, not an automated size chart." },
              ],
            },
          },
          footer("nuee-footer-about"),
        ],
      },
      {
        slug: "faq",
        title: "FAQ",
        sections: [
          nav("nuee-nav-faq"),
          {
            id: "nuee-faq",
            type: "faq",
            props: {
              heading: "Frequently asked",
              items: [
                {
                  question: "What if the Fit Finder recommendation still doesn't fit?",
                  answer: "Message us on WhatsApp with a photo of how it sits — we'll recommend an exchange size at no extra cost, and it's usually a half-size adjustment.",
                },
                {
                  question: "Do you carry sizes beyond a standard chart?",
                  answer: "Yes — our range covers 40+ band and cup combinations. If you don't see your size listed on a specific style, message us; some pieces are made to order at the edges of the range.",
                },
                {
                  question: "How do I know which cut of underwear to pick?",
                  answer: "Full covers the most, mid sits mid-hip, cheeky sits highest — all three are cut from the same knit, so it's really just a coverage preference, not a fit difference.",
                },
                {
                  question: "Where do you deliver?",
                  answer: "Lagos next-day, regional Nigeria and neighboring countries in 2–4 days. International shipping on request via WhatsApp.",
                },
                {
                  question: "Can I exchange an item I've tried on?",
                  answer: "Yes, within 7 days, as long as tags are still attached. Message us on WhatsApp to start an exchange — no returns form to fill out.",
                },
              ],
              contactPanel: {
                heading: "Still not sure on sizing?",
                body: "Our team answers fit questions directly on WhatsApp, usually within the hour.",
                buttonLabel: "Message us",
                buttonHref: "#whatsapp",
                imageUrl: IMG.founder,
              },
            },
          },
          {
            id: "nuee-faq-contact",
            type: "contact",
            props: {
              heading: "Get in touch",
              email: "hello@nueeintimates.example",
              phone: PHONE,
              address: "Victoria Island, Lagos — fittings by appointment",
            },
          },
          {
            id: "nuee-faq-form",
            type: "form",
            props: {
              heading: "Send a message",
              subheading: "Orders, fit questions, wholesale — we read every note.",
              buttonLabel: "Send",
              successMessage: "Thanks — NUÉE received your message.",
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
                  options: ["Fit question", "Order help", "Wholesale", "Press", "Other"],
                },
                { id: "message", label: "Message", type: "textarea", required: true, placeholder: "How can we help?", options: [] },
              ],
            },
          },
          {
            id: "nuee-faq-wa",
            type: "whatsapp",
            props: {
              label: "WhatsApp NUÉE",
              phone: PHONE,
              message: "Hi NUÉE — I have a question.",
            },
          },
          footer("nuee-footer-faq"),
        ],
      },
    ],
  };
}

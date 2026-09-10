import type { WebsiteDefinition } from "./website-schema";

/**
 * Distinct public gallery seeds — different IA + section mix + theme per archetype.
 * Replaces shared simpleSite / buildCompleteSite clones.
 */

function theme(partial: Partial<WebsiteDefinition["theme"]> & { primary: string; accent: string }): WebsiteDefinition["theme"] {
  return {
    background: "#FAFAF8",
    text: "#0F0D33",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    spacing: "comfortable",
    headingScale: "md",
    bodySize: "md",
    letterSpacing: "normal",
    ...partial,
  };
}

/** Beauty Studio — ritual menu + gallery + FAQ booking (not LAYERS shop clone). */
export function beautyStudioDistinctDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Beauty Studio",
    theme: theme({
      primary: "#3D2C2E",
      accent: "#C4786A",
      background: "#FBF7F4",
      fontDisplay: "Cormorant Garamond",
      spacing: "airy",
    }),
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "nav",
            type: "navigation",
            props: {
              brand: "Beauty Studio",
              links: [
                { label: "Rituals", href: "/rituals" },
                { label: "Gallery", href: "/gallery" },
                { label: "Book", href: "/book" },
              ],
            },
          },
          {
            id: "hero",
            type: "hero",
            props: {
              heading: "Glow that starts with care",
              subheading: "Skin and hair rituals for Dakar weather — consult first, then treat.",
              buttonLabel: "See rituals",
              buttonHref: "/rituals",
              align: "left",
            },
          },
          {
            id: "proof",
            type: "testimonials",
            props: {
              heading: "Clients say",
              items: [
                { quote: "My skin finally stopped reacting to the heat.", name: "Awa, Plateau" },
                { quote: "Braids that lasted through rainy season.", name: "Fatou, Almadies" },
              ],
            },
          },
          {
            id: "wa",
            type: "whatsapp",
            props: { label: "Ask about your skin", phone: "+221770000000", message: "Hi — I want a consultation." },
          },
          { id: "footer", type: "footer", props: { text: "© Beauty Studio", links: [] } },
        ],
      },
      {
        slug: "rituals",
        title: "Rituals",
        sections: [
          {
            id: "menu",
            type: "features",
            props: {
              heading: "Ritual menu",
              items: [
                { title: "Skin consult", body: "30 min assessment before any treatment — 5,000 FCFA credited to your first visit." },
                { title: "Glow facial", body: "Cleanse · steam · massage · SPF for coastal sun." },
                { title: "Protective styles", body: "Braids and locs by appointment — patch test for colour." },
              ],
            },
          },
          {
            id: "faq",
            type: "faq",
            props: {
              heading: "Before you book",
              items: [
                { question: "Do you take walk-ins?", answer: "Prefer appointments. WhatsApp same-day if a chair opens." },
                { question: "What products do you use?", answer: "Clean formulas suited for humid climates — ask for the list." },
              ],
            },
          },
        ],
      },
      {
        slug: "gallery",
        title: "Gallery",
        sections: [
          {
            id: "gal",
            type: "gallery",
            props: {
              heading: "Work",
              items: [
                { src: "", alt: "Salon chair" },
                { src: "", alt: "Hair detail" },
                { src: "", alt: "Skincare shelf" },
              ],
            },
          },
        ],
      },
      {
        slug: "book",
        title: "Book",
        sections: [
          {
            id: "book-text",
            type: "text",
            props: {
              heading: "Book a chair",
              body: "Tell us your name, preferred day, and ritual. We reply on WhatsApp with confirmation.",
            },
          },
          {
            id: "book-wa",
            type: "whatsapp",
            props: { label: "Book on WhatsApp", phone: "+221770000000", message: "I want to book a ritual." },
          },
          {
            id: "contact",
            type: "contact",
            props: { heading: "Studio", email: "hello@beautystudio.sn", phone: "+221 77 000 00 00", address: "Dakar" },
          },
        ],
      },
    ],
  };
}

/** Artist gallery — works-first grid, not a services flyer. */
export function artistGalleryDistinctDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Artist Gallery",
    theme: theme({
      primary: "#111111",
      accent: "#E8D5A3",
      background: "#0a0a0a",
      text: "#F5F5F0",
      fontDisplay: "Oswald",
      spacing: "compact",
    }),
    pages: [
      {
        slug: "home",
        title: "Works",
        sections: [
          {
            id: "nav",
            type: "navigation",
            props: {
              brand: "Studio",
              links: [
                { label: "Works", href: "/" },
                { label: "About", href: "/about" },
                { label: "Shows", href: "/shows" },
                { label: "Contact", href: "/contact" },
              ],
            },
          },
          {
            id: "gal",
            type: "gallery",
            props: {
              heading: "Selected works",
              items: [
                { src: "", alt: "Work 1" },
                { src: "", alt: "Work 2" },
                { src: "", alt: "Work 3" },
                { src: "", alt: "Work 4" },
              ],
            },
          },
          { id: "footer", type: "footer", props: { text: "© Artist", links: [] } },
        ],
      },
      {
        slug: "about",
        title: "About",
        sections: [
          {
            id: "bio",
            type: "text",
            props: {
              heading: "About the artist",
              body: "Write your practice, materials, and cities you work in. Collectors and curators read this page first.",
            },
          },
        ],
      },
      {
        slug: "shows",
        title: "Shows",
        sections: [
          {
            id: "events",
            type: "events",
            props: {
              heading: "Exhibitions",
              items: [
                {
                  title: "Open studio",
                  date: "2026-06-01",
                  location: "Dakar",
                  description: "New series — limited editions.",
                  ticketUrl: "/contact",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          {
            id: "wa",
            type: "whatsapp",
            props: { label: "Commission or press", phone: "+221770000000", message: "Hello — inquiry from your site." },
          },
          {
            id: "contact",
            type: "contact",
            props: { heading: "Studio", email: "studio@artist.sn", phone: "", address: "Dakar" },
          },
        ],
      },
    ],
  };
}

/** Event night — lineup + doors + tickets (events section, not features flyer). */
export function eventNightDistinctDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Event Night",
    theme: theme({
      primary: "#0B0B0F",
      accent: "#A78BFA",
      background: "#0B0B0F",
      text: "#F8F7FF",
      fontDisplay: "Bebas Neue",
      spacing: "compact",
    }),
    pages: [
      {
        slug: "home",
        title: "Tonight",
        sections: [
          {
            id: "nav",
            type: "navigation",
            props: {
              brand: "Event Night",
              links: [
                { label: "Line-up", href: "#lineup" },
                { label: "Tickets", href: "#tickets" },
                { label: "Map", href: "#map" },
              ],
            },
          },
          {
            id: "hero",
            type: "hero",
            props: {
              heading: "One night. Unforgettable.",
              subheading: "Doors 22:00 · 18+ · dress code smart casual",
              buttonLabel: "Get tickets",
              buttonHref: "#tickets",
              align: "center",
            },
          },
          {
            id: "lineup",
            type: "events",
            props: {
              heading: "Line-up",
              items: [
                {
                  title: "Headliner",
                  date: "2026-09-20",
                  location: "Main stage",
                  description: "Replace with your artist name and set time.",
                  ticketUrl: "#tickets",
                },
                {
                  title: "Support",
                  date: "2026-09-20",
                  location: "Warm-up",
                  description: "Local openers — edit in the builder.",
                  ticketUrl: "#tickets",
                },
              ],
            },
          },
          {
            id: "tickets",
            type: "whatsapp",
            props: {
              label: "Reserve on WhatsApp",
              phone: "+221770000000",
              message: "I want tickets for Event Night.",
            },
          },
          {
            id: "map",
            type: "map",
            props: {
              heading: "Venue",
              address: "Dakar — add street + landmark",
              latitude: 14.7167,
              longitude: -17.4677,
              zoom: 14,
            },
          },
          { id: "footer", type: "footer", props: { text: "© Event Night", links: [] } },
        ],
      },
    ],
  };
}

/** Hair salon — service menu page + before/after gallery + book (distinct from beauty-studio). */
export function hairSalonDistinctDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Hair Studio",
    theme: theme({
      primary: "#2C1810",
      accent: "#D4A574",
      background: "#FFF9F3",
      fontDisplay: "Playfair Display",
      spacing: "comfortable",
    }),
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "nav",
            type: "navigation",
            props: {
              brand: "Hair Studio",
              links: [
                { label: "Menu", href: "/menu" },
                { label: "Looks", href: "/looks" },
                { label: "Book", href: "/book" },
              ],
            },
          },
          {
            id: "hero",
            type: "hero",
            props: {
              heading: "Your hair, our craft",
              subheading: "Cuts, colour, braids — walk-ins welcome when the board is open.",
              buttonLabel: "Price menu",
              buttonHref: "/menu",
              align: "center",
            },
          },
          {
            id: "hours",
            type: "features",
            props: {
              heading: "Today",
              items: [
                { title: "Open", body: "Tue–Sat 09:00–19:00 · Sun by appointment" },
                { title: "Team", body: "Name your stylists here so clients can request them." },
              ],
            },
          },
          {
            id: "wa",
            type: "whatsapp",
            props: { label: "WhatsApp the chair", phone: "+221770000000", message: "Book a cut / braids." },
          },
          { id: "footer", type: "footer", props: { text: "© Hair Studio", links: [] } },
        ],
      },
      {
        slug: "menu",
        title: "Menu",
        sections: [
          {
            id: "prices",
            type: "features",
            props: {
              heading: "Services & prices",
              items: [
                { title: "Cut & style", body: "From 5,000 FCFA — edit your real menu." },
                { title: "Braids & locs", body: "Protective styles by appointment." },
                { title: "Colour", body: "Consultation + patch test when needed." },
              ],
            },
          },
        ],
      },
      {
        slug: "looks",
        title: "Looks",
        sections: [
          {
            id: "gal",
            type: "gallery",
            props: {
              heading: "Before / after",
              items: [
                { src: "", alt: "Salon" },
                { src: "", alt: "Finish" },
              ],
            },
          },
        ],
      },
      {
        slug: "book",
        title: "Book",
        sections: [
          {
            id: "book",
            type: "text",
            props: {
              heading: "Book",
              body: "Send name · service · preferred time. We confirm on WhatsApp.",
            },
          },
          {
            id: "wa",
            type: "whatsapp",
            props: { label: "Book now", phone: "+221770000000", message: "I want to book." },
          },
        ],
      },
    ],
  };
}

/** Scent boutique — fragrance stories + products + stockists (not perfume-brand world clone). */
export function scentBoutiqueDistinctDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Scent Boutique",
    theme: theme({
      primary: "#2A1F24",
      accent: "#8B5E6B",
      background: "#F7F1F3",
      fontDisplay: "Cormorant Garamond",
      spacing: "airy",
    }),
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "nav",
            type: "navigation",
            props: {
              brand: "Scent Boutique",
              links: [
                { label: "Scents", href: "/scents" },
                { label: "Story", href: "/story" },
                { label: "Visit", href: "/visit" },
              ],
            },
          },
          {
            id: "hero",
            type: "hero",
            props: {
              heading: "Notes you can wear",
              subheading: "Intimate fragrance counter — sample before you buy.",
              buttonLabel: "Browse scents",
              buttonHref: "/scents",
              align: "left",
            },
          },
          {
            id: "notes",
            type: "features",
            props: {
              heading: "How we help you choose",
              items: [
                { title: "Smell strip first", body: "We never spray without asking." },
                { title: "Climate-aware", body: "Suggestions for heat and humidity." },
              ],
            },
          },
          { id: "footer", type: "footer", props: { text: "© Scent Boutique", links: [] } },
        ],
      },
      {
        slug: "scents",
        title: "Scents",
        sections: [
          {
            id: "products",
            type: "products",
            props: {
              heading: "On the counter",
              layout: "grid",
              items: [
                { name: "Dawn Bloom", priceLabel: "25,000 FCFA", description: "Citrus · white flowers", imageUrl: "" },
                { name: "Sahel Smoke", priceLabel: "28,000 FCFA", description: "Wood · incense", imageUrl: "" },
                { name: "Night Salt", priceLabel: "30,000 FCFA", description: "Marine · musk", imageUrl: "" },
              ],
            },
          },
          {
            id: "wa",
            type: "whatsapp",
            props: { label: "Order / reserve a bottle", phone: "+221770000000", message: "I want a scent." },
          },
        ],
      },
      {
        slug: "story",
        title: "Story",
        sections: [
          {
            id: "story",
            type: "text",
            props: {
              heading: "Why we opened",
              body: "A small counter for people who want to smell before they buy — not a warehouse catalogue.",
            },
          },
        ],
      },
      {
        slug: "visit",
        title: "Visit",
        sections: [
          {
            id: "contact",
            type: "contact",
            props: {
              heading: "Counter hours",
              email: "hello@scent.sn",
              phone: "+221 77 000 00 00",
              address: "Dakar — add your street",
            },
          },
          {
            id: "map",
            type: "map",
            props: { heading: "Find us", address: "Dakar", latitude: 14.7167, longitude: -17.4677, zoom: 14 },
          },
        ],
      },
    ],
  };
}

/** Agency creative — case studies + process + brief (distinct from Carmine world). */
export function agencyCreativeDistinctDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Creative Agency",
    theme: theme({
      primary: "#111827",
      accent: "#F97316",
      background: "#FFFFFF",
      fontDisplay: "Space Grotesk",
      spacing: "comfortable",
    }),
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "nav",
            type: "navigation",
            props: {
              brand: "Agency",
              links: [
                { label: "Work", href: "/work" },
                { label: "Process", href: "/process" },
                { label: "Brief", href: "/brief" },
              ],
            },
          },
          {
            id: "hero",
            type: "hero",
            props: {
              heading: "Brand systems that ship",
              subheading: "Identity, campaign, and web — one team from brief to launch.",
              buttonLabel: "See work",
              buttonHref: "/work",
              align: "left",
            },
          },
          {
            id: "clients",
            type: "testimonials",
            props: {
              heading: "Clients",
              items: [
                { quote: "They delivered the campaign in three weeks.", name: "Founder, retail" },
                { quote: "Clear process — we always knew the next step.", name: "CMO, fintech" },
              ],
            },
          },
          { id: "footer", type: "footer", props: { text: "© Agency", links: [] } },
        ],
      },
      {
        slug: "work",
        title: "Work",
        sections: [
          {
            id: "cases",
            type: "features",
            props: {
              heading: "Case studies",
              items: [
                { title: "Retail rebrand", body: "Logo · packaging · launch site — 8 weeks." },
                { title: "App launch kit", body: "Motion · landing · paid creative." },
                { title: "Festival identity", body: "Wayfinding · merch · social system." },
              ],
            },
          },
          {
            id: "gal",
            type: "gallery",
            props: {
              heading: "Selected frames",
              items: [
                { src: "", alt: "Studio" },
                { src: "", alt: "Board" },
              ],
            },
          },
        ],
      },
      {
        slug: "process",
        title: "Process",
        sections: [
          {
            id: "steps",
            type: "features",
            props: {
              heading: "How we work",
              items: [
                { title: "1 · Brief", body: "Goals, audience, budget, deadline." },
                { title: "2 · Direction", body: "Two visual routes — you pick one." },
                { title: "3 · Build", body: "Assets + site sections in Kebu." },
                { title: "4 · Launch", body: "Handoff checklist + WhatsApp support week." },
              ],
            },
          },
        ],
      },
      {
        slug: "brief",
        title: "Brief",
        sections: [
          {
            id: "brief",
            type: "text",
            props: {
              heading: "Send a brief",
              body: "Company · what you need · when you need it. We reply with a scope and fee range.",
            },
          },
          {
            id: "wa",
            type: "whatsapp",
            props: { label: "Send brief on WhatsApp", phone: "+221770000000", message: "Brief: " },
          },
          {
            id: "contact",
            type: "contact",
            props: { heading: "Studio", email: "hello@agency.sn", phone: "", address: "Dakar" },
          },
        ],
      },
    ],
  };
}

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
      text: "#1A0E0F",
      surface: "#fff",
      fontDisplay: "Cormorant Garamond",
      spacing: "airy",
    }),
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "bar",
            type: "announcement-bar",
            props: {
              text: "New: Ritual skin assessment — 5,000 FCFA · Book on WhatsApp",
              background: "#3D2C2E",
              color: "#F7E4D8",
            },
          },
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
            type: "editorial-hero",
            props: {
              heading: "Glow that starts\nwith care.",
              subheading: "Skin and hair rituals formulated for West African climate — consult first, then treat.",
              buttonLabel: "Book a ritual",
              buttonHref: "/book",
              align: "left",
              minHeight: "90vh",
              overlayOpacity: 0.55,
            },
          },
          {
            id: "intro-split",
            type: "split",
            props: {
              heading: "Beauty that belongs to you",
              body: "We study your skin tone, climate, and lifestyle before touching a brush. Every ritual is personalised — no shelf products, no guesswork.",
              buttonLabel: "See rituals",
              buttonHref: "/rituals",
              imagePosition: "right",
              background: "#FBF7F4",
            },
          },
          {
            id: "services",
            type: "features",
            props: {
              heading: "Rituals",
              items: [
                { title: "Skin assessment", body: "30 min deep-dive — every first visit starts here. FCFA 5,000 credited to your treatment." },
                { title: "Glow facial", body: "Cleanse, steam, massage + broad-spectrum SPF for coastal sun." },
                { title: "Protective styles", body: "Braids and locs by appointment — patch test required for colour." },
              ],
            },
          },
          {
            id: "proof",
            type: "testimonials",
            props: {
              heading: "Clients say",
              items: [
                { quote: "My skin finally stopped reacting to the heat. I've tried everything else.", name: "Awa", role: "Plateau, Dakar" },
                { quote: "Braids that lasted through the whole rainy season — not one strand out of place.", name: "Fatou", role: "Almadies" },
                { quote: "The assessment changed how I think about my skincare. Worth every franc.", name: "Mariama", role: "Sacré-Cœur" },
              ],
            },
          },
          {
            id: "wa",
            type: "whatsapp",
            props: { label: "Ask about your skin", phone: "+221770000000", message: "Hi — I want a consultation." },
          },
          {
            id: "newsletter",
            type: "newsletter",
            props: {
              heading: "Rituals, recipes, reminders",
              subheading: "Seasonal skin tips for Dakar weather, straight to your inbox.",
              buttonLabel: "Stay in touch",
            },
          },
          { id: "footer", type: "footer", props: { text: "© Beauty Studio · Dakar", links: [{ label: "Rituals", href: "/rituals" }, { label: "Gallery", href: "/gallery" }, { label: "Book", href: "/book" }] } },
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
      surface: "#161616",
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
            id: "hero",
            type: "editorial-hero",
            props: {
              heading: "Art that refuses\nto disappear.",
              subheading: "Selected works, open commissions, and upcoming exhibitions.",
              buttonLabel: "View works",
              buttonHref: "#gallery",
              align: "left",
              minHeight: "88vh",
              overlayOpacity: 0.6,
            },
          },
          {
            id: "marquee",
            type: "marquee",
            props: {
              items: ["Original works", "Limited editions", "Private commissions", "Studio visits by appointment"],
              background: "#E8D5A3",
              color: "#0a0a0a",
              separator: " ✦ ",
              speed: 35,
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
                { src: "", alt: "Work 5" },
                { src: "", alt: "Work 6" },
              ],
            },
          },
          {
            id: "about-split",
            type: "split",
            props: {
              heading: "About the practice",
              body: "Describe your medium, influences, and where you work. Collectors and curators read this section first — make it honest, not a résumé.",
              buttonLabel: "Full story",
              buttonHref: "/about",
              imagePosition: "left",
              background: "#111",
            },
          },
          {
            id: "proof",
            type: "testimonials",
            props: {
              heading: "Collectors say",
              items: [
                { quote: "One of the most original voices coming out of West Africa right now. I bought three pieces.", name: "M. Diallo", role: "Collector, Dakar" },
                { quote: "The commission process was clear and the work arrived immaculate.", name: "A. Camara", role: "Lagos" },
              ],
            },
          },
          { id: "footer", type: "footer", props: { text: "© Studio", links: [{ label: "Works", href: "/" }, { label: "Shows", href: "/shows" }, { label: "Contact", href: "/contact" }] } },
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
      surface: "#14141A",
      fontDisplay: "Bebas Neue",
      spacing: "compact",
    }),
    pages: [
      {
        slug: "home",
        title: "Tonight",
        sections: [
          {
            id: "bar",
            type: "announcement-bar",
            props: {
              text: "Early bird tickets available — limited spots · Reserve on WhatsApp now",
              background: "#A78BFA",
              color: "#0B0B0F",
            },
          },
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
            type: "editorial-hero",
            props: {
              heading: "One night.\nUnforgettable.",
              subheading: "Doors 22:00 · 18+ · dress code: bold",
              buttonLabel: "Get tickets",
              buttonHref: "#tickets",
              align: "center",
              minHeight: "95vh",
              overlayOpacity: 0.5,
            },
          },
          {
            id: "marquee",
            type: "marquee",
            props: {
              items: ["Live music", "DJ set", "Afrobeats · Afro-house · Amapiano", "Rooftop venue", "Limited capacity"],
              background: "#A78BFA",
              color: "#0B0B0F",
              separator: " · ",
              speed: 22,
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
                  date: "Sep 20, 2026 — 23:30",
                  location: "Main stage",
                  description: "Replace with your headliner name and set time.",
                  ticketUrl: "#tickets",
                },
                {
                  title: "Support act",
                  date: "Sep 20, 2026 — 22:00",
                  location: "Warm-up",
                  description: "Local openers — edit in the builder.",
                  ticketUrl: "#tickets",
                },
                {
                  title: "DJ closing set",
                  date: "Sep 21, 2026 — 01:00",
                  location: "After party",
                  description: "Till late.",
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
          { id: "footer", type: "footer", props: { text: "© Event Night", links: [{ label: "Line-up", href: "#lineup" }, { label: "Tickets", href: "#tickets" }] } },
        ],
      },
    ],
  };
}

/** Hair salon — premium Dakar salon: tresses, balayage, soins. Multi-page with rich section mix. */
export function hairSalonDistinctDefinition(): WebsiteDefinition {
  const BRAND = "CHEZ AMARA";
  const NAV_LINKS = [
    { label: "Services", href: "/services" },
    { label: "Gallery", href: "/gallery" },
    { label: "Book", href: "/book" },
  ] as const;

  function nav(id: string) {
    return { id, type: "navigation" as const, props: { brand: BRAND, links: [...NAV_LINKS] } };
  }
  function footer(id: string) {
    return { id, type: "footer" as const, props: { text: `© ${BRAND} · Dakar`, links: [...NAV_LINKS] } };
  }

  return {
    schemaVersion: "website-v1",
    title: BRAND,
    theme: theme({
      primary: "#1A0F0A",
      accent: "#D4A574",
      background: "#FFF9F3",
      text: "#1A0F0A",
      surface: "#FFF3E8",
      fontDisplay: "Playfair Display",
      fontBody: "IBM Plex Sans",
      spacing: "comfortable",
      headingScale: "xl",
    }),
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "cs-bar",
            type: "announcement-bar",
            props: {
              text: "✦ Nouveau : Balayage & soins locs naturels — consultation gratuite ce mois · Réservez sur WhatsApp",
              background: "#1A0F0A",
              color: "#D4A574",
            },
          },
          nav("cs-nav-home"),
          {
            id: "cs-hero",
            type: "editorial-hero",
            props: {
              heading: "Votre look.\nNotre art.",
              subheading: "Coupes, couleurs, tresses — pensés pour vos textures, au cœur de Dakar.",
              buttonLabel: "Réserver une séance",
              buttonHref: "/book",
              align: "left",
              minHeight: "88vh",
              overlayOpacity: 0.45,
            },
          },
          {
            id: "cs-cats",
            type: "category-tiles",
            props: {
              title: "Nos services",
              columns: 4,
              items: [
                { label: "Coupes", href: "/services" },
                { label: "Tresses & Locs", href: "/services" },
                { label: "Couleur", href: "/services" },
                { label: "Soins", href: "/services" },
              ],
            },
          },
          {
            id: "cs-marquee",
            type: "marquee",
            props: {
              items: [
                "Coupes naturelles",
                "Balayage & ombré",
                "Box braids",
                "Locs dreadlocks",
                "Kératin",
                "Tresses sénégalaises",
                "Consultation gratuite",
              ],
              separator: " · ",
              background: "#D4A574",
              color: "#1A0F0A",
              speed: 25,
            },
          },
          {
            id: "cs-services-home",
            type: "products",
            props: {
              heading: "Réservez votre service",
              currency: "XOF",
              whatsappPhone: "+221770000000",
              items: [
                { name: "Coupe & Brushing naturel", price: "12000", description: "Toutes textures — cheveux naturels, défrisés, bouclés" },
                { name: "Box braids (moyen)", price: "40000", description: "Extension incluse · durée 4–6h" },
                { name: "Balayage / ombré", price: "60000", description: "Test patch inclus · rendez-vous requis" },
                { name: "Tresses sénégalaises", price: "45000", description: "Longueur au choix · extension au choix" },
                { name: "Soin kératin (lissage)", price: "55000", description: "Semi-permanent · 3 mois de tenue" },
                { name: "Soin profond + vapeur", price: "10000", description: "Masque nourrissant maison · 45 min" },
              ],
            },
          },
          {
            id: "cs-split-story",
            type: "split",
            props: {
              heading: "Un salon pensé pour vos cheveux",
              body: "Chez Amara est né d'une frustration simple : les salons de Dakar traitaient les cheveux naturels comme une exception. Chaque styliste ici est spécialisé dans les textures africaines — que vous portiez naturel, tressé, coloré ou lissé, votre look est notre priorité.",
              imagePosition: "right",
              buttonLabel: "Réserver sur WhatsApp",
              buttonHref: "/book",
            },
          },
          {
            id: "cs-testimonials",
            type: "testimonials",
            props: {
              heading: "Ce que nos clientes disent",
              items: [
                {
                  quote: "Les meilleures tresses que j'ai eu à Dakar — elle a compris ma texture dès le premier regard.",
                  name: "Aissatou B.",
                  role: "Plateau",
                },
                {
                  quote: "J'ai demandé un balayage sur cheveux naturels et j'ai eu exactement ce que je voulais. Rare.",
                  name: "Mariama D.",
                  role: "Almadies",
                },
                {
                  quote: "Je suis arrivée avec une photo, je suis repartie mieux que la photo.",
                  name: "Khady N.",
                  role: "Point E",
                },
              ],
            },
          },
          {
            id: "cs-wa",
            type: "whatsapp",
            props: {
              label: "Réserver sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour Chez Amara — je voudrais réserver une séance.",
            },
          },
          {
            id: "cs-newsletter",
            type: "newsletter",
            props: {
              heading: "Tendances & promos",
              subheading: "Nouvelles techniques, offres membres, rappels de rdv — rien de superflu.",
              buttonLabel: "S'abonner",
              successMessage: "Bienvenue chez Chez Amara.",
            },
          },
          footer("cs-footer-home"),
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          nav("cs-nav-services"),
          {
            id: "cs-svc-hero",
            type: "hero",
            props: {
              heading: "Menu & Tarifs",
              subheading:
                "Tous nos prix incluent consultation et finition. Payez avec Wave, Orange Money ou Joko — aucun terminal carte nécessaire.",
              buttonLabel: "Réserver",
              buttonHref: "/book",
              align: "left",
            },
          },
          {
            id: "cs-svc-cuts",
            type: "features",
            props: {
              heading: "Coupes & Brushing",
              items: [
                { title: "Coupe naturelle + brushing", body: "12 000 – 18 000 FCFA selon épaisseur" },
                { title: "Coupe + défrisage + mise en plis", body: "22 000 – 32 000 FCFA" },
                { title: "Barber (coupe homme + contour)", body: "6 000 – 10 000 FCFA" },
                { title: "Coupe enfant (moins de 10 ans)", body: "5 000 FCFA" },
              ],
            },
          },
          {
            id: "cs-svc-braids",
            type: "features",
            props: {
              heading: "Tresses & Styles Protecteurs",
              items: [
                { title: "Box braids (moyen)", body: "40 000 – 60 000 FCFA selon longueur" },
                { title: "Tresses sénégalaises", body: "45 000 – 65 000 FCFA" },
                { title: "Cornrows", body: "10 000 – 22 000 FCFA" },
                { title: "Locs démarrantes (freeform)", body: "28 000 FCFA" },
                { title: "Crochet braids", body: "30 000 – 45 000 FCFA" },
              ],
            },
          },
          {
            id: "cs-svc-colour",
            type: "features",
            props: {
              heading: "Couleur",
              items: [
                { title: "Balayage / ombré", body: "À partir de 60 000 FCFA — consultation requise, patch test inclus" },
                { title: "Couleur complète", body: "À partir de 45 000 FCFA + toner" },
                { title: "Mèches & highlights", body: "35 000 – 55 000 FCFA" },
                { title: "Correction couleur", body: "Devis sur consultation" },
              ],
            },
          },
          {
            id: "cs-svc-treatments",
            type: "features",
            props: {
              heading: "Soins & Traitements",
              items: [
                { title: "Soin kératin (lissage semi-permanent)", body: "55 000 FCFA · 3 mois de tenue" },
                { title: "Soin protéiné anti-casse", body: "14 000 FCFA · 50 min" },
                { title: "Masque profond + vapeur", body: "10 000 FCFA · 45 min" },
                { title: "Huile chaude + massage cuir chevelu", body: "7 000 FCFA · recommandé avant lavage" },
              ],
            },
          },
          {
            id: "cs-svc-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Faut-il un acompte pour réserver ?",
                  answer:
                    "Oui — les prestations de 30 000 FCFA et plus nécessitent un acompte de 50 % via Wave ou Orange Money pour confirmer le rdv.",
                },
                {
                  question: "Puis-je apporter ma propre extension ?",
                  answer:
                    "Oui — précisez la marque et la quantité dans votre message WhatsApp. Nous travaillons avec kanekalon, marley et cheveux naturels.",
                },
                {
                  question: "Comment payer ?",
                  answer: "Espèces, Wave, Orange Money et Joko acceptés. Aucun terminal carte nécessaire.",
                },
                {
                  question: "Acceptez-vous les walk-ins ?",
                  answer: "Préférez les rdv. WhatsApp-nous le matin si une plage s'ouvre dans la journée.",
                },
              ],
            },
          },
          footer("cs-footer-services"),
        ],
      },
      {
        slug: "gallery",
        title: "Gallery",
        sections: [
          nav("cs-nav-gallery"),
          {
            id: "cs-gal-hero",
            type: "hero",
            props: {
              heading: "Nos réalisations",
              subheading:
                "Avant / après de nos fauteuils — ajoutez vos propres photos depuis votre téléphone dans Médias.",
              buttonLabel: "Réserver votre look",
              buttonHref: "/book",
              align: "center",
            },
          },
          {
            id: "cs-gal-grid",
            type: "gallery",
            props: {
              heading: "",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Coupe naturelle" },
                { src: "", alt: "Box braids" },
                { src: "", alt: "Balayage" },
                { src: "", alt: "Cornrows" },
                { src: "", alt: "Locs" },
                { src: "", alt: "Brushing final" },
                { src: "", alt: "Mèches" },
                { src: "", alt: "Style protecteur" },
                { src: "", alt: "Après séance" },
              ],
            },
          },
          footer("cs-footer-gallery"),
        ],
      },
      {
        slug: "book",
        title: "Book",
        sections: [
          nav("cs-nav-book"),
          {
            id: "cs-book-hero",
            type: "hero",
            props: {
              heading: "Réservez une séance",
              subheading:
                "Envoyez-nous votre nom, le service souhaité et votre disponibilité. Nous confirmons et collectons l'acompte le cas échéant.",
              buttonLabel: "WhatsApp",
              buttonHref: "#cs-wa",
              align: "center",
            },
          },
          {
            id: "cs-book-wa",
            type: "whatsapp",
            props: {
              label: "Réserver sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour Chez Amara — je voudrais réserver : [service] pour [date/heure].",
            },
          },
          {
            id: "cs-book-hours",
            type: "text",
            props: {
              heading: "Horaires",
              body: "Mardi – Samedi 09h00–19h00 · Dimanche sur rendez-vous · Lundi fermé. Mettez à jour vos horaires dans le builder après publication.",
            },
          },
          {
            id: "cs-book-contact",
            type: "contact",
            props: {
              heading: "Nous trouver",
              email: "contact@chezamara.sn",
              phone: "+221770000000",
              address: "Dakar — éditez votre adresse dans le builder",
            },
          },
          {
            id: "cs-book-map",
            type: "map",
            props: {
              heading: "Localisation",
              address: "Dakar, Sénégal",
              latitude: 14.6928,
              longitude: -17.4467,
              zoom: 14,
            },
          },
          footer("cs-footer-book"),
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

/** Street food / fast casual — announcement bar, category tiles, product grid. Vibrant urban feel. */
export function streetFoodDistinctDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Yaye Fatou Grill",
    theme: theme({
      primary: "#1A0A00",
      accent: "#FF6B00",
      background: "#FFF8F2",
      text: "#1A0A00",
      surface: "#FFEDE0",
      fontDisplay: "Montserrat",
      fontBody: "system-ui",
      spacing: "compact",
      radius: "round",
      buttonStyle: "solid",
    }),
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "bar",
            type: "announcement-bar",
            props: {
              text: "Livraison Dakar Plateau & Medina  ·  Commandez sur WhatsApp",
              background: "#FF6B00",
              color: "#fff",
            },
          },
          {
            id: "nav",
            type: "navigation",
            props: {
              brand: "Yaye Fatou Grill",
              links: [
                { label: "Menu", href: "#menu" },
                { label: "Commander", href: "#order" },
                { label: "A propos", href: "#about" },
              ],
            },
          },
          {
            id: "hero",
            type: "hero",
            props: {
              heading: "Grillades & thiebou dieune — livrés chauds",
              subheading: "Plats du jour, brochettes maison, jus frais. Payez avec Wave ou à la livraison.",
              buttonLabel: "Voir le menu",
              buttonHref: "#menu",
              align: "left",
            },
          },
          {
            id: "ticker",
            type: "marquee",
            props: {
              items: ["Thiebou Yapp", "Mafé Boulettes", "Brochettes Agneau", "Dibi", "Jus de Ditax", "Attaya offert"],
              separator: " · ",
              background: "#1A0A00",
              color: "#FF6B00",
              speed: 22,
            },
          },
          {
            id: "cats",
            type: "category-tiles",
            props: {
              title: "Notre carte",
              columns: 3,
              items: [
                { label: "Riz & plats", href: "#riz" },
                { label: "Grillades", href: "#grillades" },
                { label: "Boissons", href: "#boissons" },
              ],
            },
          },
          {
            id: "products",
            type: "products",
            props: {
              heading: "Commandez maintenant",
              currency: "XOF",
              whatsappPhone: "+221770000000",
              items: [
                { name: "Thiebou Dieune complet", price: "3500", description: "Riz au poisson, légumes, sauce tamarin" },
                { name: "Brochettes agneau x5", price: "4000", description: "Marinées, grillées, avec pain & sauce" },
                { name: "Mafé boulettes", price: "3000", description: "Sauce arachide maison, riz blanc" },
                { name: "Dibi", price: "3500", description: "Côtes grillées, oignons, moutarde" },
                { name: "Jus de bissap 50cl", price: "800", description: "Frais du jour" },
                { name: "Jus de ditax 50cl", price: "1000", description: "Spécialité maison" },
              ],
            },
          },
          {
            id: "split",
            type: "split",
            props: {
              heading: "Notre histoire",
              body: "Yaye Fatou cuisine depuis 1997. Ce qui a commencé comme un taller dans le Plateau est devenu l'adresse préférée des bureaux du centre-ville.",
              imagePosition: "right",
              buttonLabel: "Commander sur WhatsApp",
              buttonHref: "#order",
            },
          },
          {
            id: "contact",
            type: "contact",
            props: { heading: "Nous trouver", email: "yayefatou@example.com", address: "Rue 12 × Rue 14, Plateau, Dakar", phone: "+221770000000" },
          },
          {
            id: "footer",
            type: "footer",
            props: { brand: "Yaye Fatou Grill", tagline: "Cuisine maison depuis 1997" },
          },
        ],
      },
    ],
  };
}

/** Digital art collective — editorial dark, gallery-first. Distinct from artistGallery (which is light). */
export function digitalArtCollectiveDistinctDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Collectif Ndank Ndank",
    theme: theme({
      primary: "#FFFBF7",
      accent: "#7CFC00",
      background: "#0A0A0A",
      text: "#FFFBF7",
      surface: "#161616",
      fontDisplay: "Space Grotesk",
      fontBody: "system-ui",
      spacing: "airy",
      radius: "sharp",
      buttonStyle: "outline",
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
              brand: "Ndank Ndank",
              links: [
                { label: "Works", href: "/works" },
                { label: "Members", href: "/members" },
                { label: "Exhibitions", href: "/exhibitions" },
                { label: "Contact", href: "/contact" },
              ],
            },
          },
          {
            id: "hero",
            type: "editorial-hero",
            props: {
              heading: "Art from the continent — unfiltered",
              subheading: "A collective of digital artists from Dakar, Abidjan, Lagos, and Nairobi",
              buttonLabel: "See the works",
              buttonHref: "/works",
              overlayOpacity: 0.5,
              align: "left",
              minHeight: "80vh",
            },
          },
          {
            id: "marquee",
            type: "marquee",
            props: {
              items: ["Digital", "3D", "Print", "Motion", "Identity", "Illustration", "Photography"],
              separator: " — ",
              background: "#7CFC00",
              color: "#0A0A0A",
              speed: 20,
            },
          },
          {
            id: "gallery",
            type: "gallery",
            props: {
              heading: "Selected works",
              layout: "grid",
              items: [],
            },
          },
          {
            id: "split-about",
            type: "split",
            props: {
              heading: "About the collective",
              body: "We are 12 artists across 4 cities. We share tools, clients, and exhibitions. No middlemen — direct commissions through WhatsApp.",
              imagePosition: "left",
              buttonLabel: "Meet the members",
              buttonHref: "/members",
            },
          },
          {
            id: "features",
            type: "features",
            props: {
              heading: "What we do",
              items: [
                { title: "Brand identity", description: "Logos, systems, campaigns for African brands" },
                { title: "Digital illustration", description: "Editorial, covers, NFTs, prints" },
                { title: "Motion & 3D", description: "Short films, title sequences, product renders" },
                { title: "Exhibitions", description: "Physical + virtual shows in Dakar and online" },
              ],
            },
          },
          {
            id: "whatsapp",
            type: "whatsapp",
            props: { label: "Commission a work on WhatsApp", phone: "+221770000000", message: "Hello, I'd like to commission: " },
          },
          {
            id: "footer",
            type: "footer",
            props: { brand: "Ndank Ndank", tagline: "Digital art from Africa" },
          },
        ],
      },
    ],
  };
}

/** Streetwear shop — dark urban, announcement bar, category tiles, product grid. Distinct from fashion-atelier (editorial light). */
export function streetwearShopDistinctDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "WAKH Streetwear",
    theme: theme({
      primary: "#FFFBF7",
      accent: "#FF3B3B",
      background: "#0D0D0D",
      text: "#FFFBF7",
      surface: "#1A1A1A",
      fontDisplay: "Montserrat",
      fontBody: "system-ui",
      spacing: "compact",
      radius: "sharp",
      buttonStyle: "solid",
    }),
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "bar",
            type: "announcement-bar",
            props: {
              text: "SOLDES — 20% sur tout avec le code WAKH20  ·  Livraison gratuite Dakar",
              background: "#FF3B3B",
              color: "#fff",
            },
          },
          {
            id: "nav",
            type: "navigation",
            props: {
              brand: "WAKH",
              links: [
                { label: "Shop", href: "#shop" },
                { label: "Lookbook", href: "#lookbook" },
                { label: "About", href: "#about" },
              ],
            },
          },
          {
            id: "hero",
            type: "editorial-hero",
            props: {
              heading: "Wear the street",
              subheading: "Dakar-born. Africa-wide.",
              buttonLabel: "Shop now",
              buttonHref: "#shop",
              overlayOpacity: 0.45,
              align: "left",
              minHeight: "90vh",
            },
          },
          {
            id: "cats",
            type: "category-tiles",
            props: {
              title: "Shop by category",
              columns: 4,
              items: [
                { label: "Tees", href: "#tees" },
                { label: "Hoodies", href: "#hoodies" },
                { label: "Caps", href: "#caps" },
                { label: "Accessories", href: "#acc" },
              ],
            },
          },
          {
            id: "ticker",
            type: "marquee",
            props: {
              items: ["New drop every Friday", "Limited runs", "Made in Senegal", "No restock", "Order on WhatsApp"],
              separator: " / ",
              background: "#FFFBF7",
              color: "#0D0D0D",
              speed: 18,
            },
          },
          {
            id: "products",
            type: "products",
            props: {
              heading: "Latest drops",
              currency: "XOF",
              whatsappPhone: "+221770000000",
              items: [
                { name: "WAKH Classic Tee", price: "15000", description: "100% cotton, oversized cut" },
                { name: "WAKH Hoodie", price: "28000", description: "Heavyweight fleece" },
                { name: "5-panel cap", price: "8000", description: "Embroidered logo" },
                { name: "Crossbody bag", price: "18000", description: "Canvas, adjustable strap" },
              ],
            },
          },
          {
            id: "split",
            type: "split",
            props: {
              heading: "Built in Dakar",
              body: "WAKH started as a screen-printing operation in Medina in 2020. Every piece is designed and printed locally. No fast fashion, no middlemen.",
              imagePosition: "right",
              buttonLabel: "Order on WhatsApp",
              buttonHref: "#order",
            },
          },
          {
            id: "testimonials",
            type: "testimonials",
            props: {
              heading: "The street speaks",
              items: [
                { quote: "WAKH is the only brand I wear when I want to represent Dakar.", name: "Ibrahima D.", title: "Customer" },
                { quote: "La qualite est incroyable pour le prix. Je recommande.", name: "Aminata F.", title: "Customer" },
              ],
            },
          },
          {
            id: "footer",
            type: "footer",
            props: { brand: "WAKH", tagline: "Streetwear. Dakar-born." },
          },
        ],
      },
    ],
  };
}

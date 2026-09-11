import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * VOLTA — urban streetwear brand from Dakar.
 * Dark editorial palette: near-black ground, crimson accent, bold condensed type.
 * IA: Home · Collections · About · Order
 * Payments: Wave · Orange Money · cash on delivery · WhatsApp order
 */

const NAV = [
  { label: "Collections", href: "/collections" },
  { label: "About", href: "/about" },
  { label: "Order", href: "/order" },
] as const;

const PRODUCTS_MEN = [
  {
    name: "Kankam Tee",
    description: "Heavyweight 280g cotton tee — dropped shoulders, garment-washed. Dakar-born, globally worn.",
    priceLabel: "18 500 F CFA",
    imageUrl: "",
    whatsappMessage: "Bonjour VOLTA — je veux le Kankam Tee. Taille:",
    whatsappPhone: "+221770000000",
    currency: "XOF",
  },
  {
    name: "Série Noire Hoodie",
    description: "400g fleece pullover hoodie. Broderie avant-cœur, dos imprimé pleine largeur. Unisexe.",
    priceLabel: "38 000 F CFA",
    imageUrl: "",
    whatsappMessage: "Bonjour VOLTA — je veux le Série Noire Hoodie. Taille:",
    whatsappPhone: "+221770000000",
    currency: "XOF",
  },
  {
    name: "Cargo Plateau",
    description: "Pantalon cargo technique — 6 poches, ceinture élastiquée. Coupe large, tissu ripstop.",
    priceLabel: "44 000 F CFA",
    imageUrl: "",
    whatsappMessage: "Bonjour VOLTA — je veux le Cargo Plateau. Taille:",
    whatsappPhone: "+221770000000",
    currency: "XOF",
  },
  {
    name: "Medina Cap",
    description: "Casquette 6 panels laine avec broderie VOLTA. Taille unique réglable.",
    priceLabel: "12 000 F CFA",
    imageUrl: "",
    whatsappMessage: "Bonjour VOLTA — je veux la Medina Cap.",
    whatsappPhone: "+221770000000",
    currency: "XOF",
  },
] as const;

const PRODUCTS_WOMEN = [
  {
    name: "Flamme Crop Tee",
    description: "Crop tee cintrée en coton épais. Graphique flamme dos intégral — pièce signature.",
    priceLabel: "16 500 F CFA",
    imageUrl: "",
    whatsappMessage: "Bonjour VOLTA — je veux le Flamme Crop Tee. Taille:",
    whatsappPhone: "+221770000000",
    currency: "XOF",
  },
  {
    name: "Diouf Vest",
    description: "Gilet oversize sans manches. Tissu denim lourd, poches cargo latérales.",
    priceLabel: "29 000 F CFA",
    imageUrl: "",
    whatsappMessage: "Bonjour VOLTA — je veux le Diouf Vest. Taille:",
    whatsappPhone: "+221770000000",
    currency: "XOF",
  },
  {
    name: "Baye Jogger",
    description: "Jogging large en jersey côtelé — taille haute, ourlet à côte. Coton 100% sénégalais.",
    priceLabel: "26 000 F CFA",
    imageUrl: "",
    whatsappMessage: "Bonjour VOLTA — je veux le Baye Jogger. Taille:",
    whatsappPhone: "+221770000000",
    currency: "XOF",
  },
  {
    name: "VOLTA Tote",
    description: "Tote bag résistant imprimé sérigraphie — 100% coton canvas 400g. Double bandoulière.",
    priceLabel: "8 000 F CFA",
    imageUrl: "",
    whatsappMessage: "Bonjour VOLTA — je veux le VOLTA Tote.",
    whatsappPhone: "+221770000000",
    currency: "XOF",
  },
] as const;

const THEME = {
  primary: "#0D0D0D",
  accent: "#B91C1C",
  background: "#0D0D0D",
  text: "#F5F5F5",
  fontDisplay: "Oswald",
  fontBody: "IBM Plex Sans",
  spacing: "comfortable",
  headingScale: "xl",
  bodySize: "md",
  letterSpacing: "wide",
  aestheticId: "clothing-company",
} as const;

function navSection(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: {
      brand: "VOLTA",
      links: [...NAV],
    },
  };
}

function footerSection(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© VOLTA Dakar — wear the bold.",
      links: [
        { label: "Collections", href: "/collections" },
        { label: "About", href: "/about" },
        { label: "Order", href: "/order" },
      ],
    },
  };
}

export function voltaClothingWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "VOLTA",
    theme: THEME,
    pages: [
      /* ── HOME ──────────────────────────────────────────────────────── */
      {
        slug: "home",
        title: "Home",
        sections: [
          {
            id: "volta-bar",
            type: "announcement-bar",
            props: {
              text: "LIVRAISON DAKAR · PAIEMENT WAVE · ORANGE MONEY · LIVRAISON À DOMICILE",
              background: "#B91C1C",
              color: "#FFFFFF",
            },
          },
          navSection("volta-nav-home"),
          {
            id: "volta-hero",
            type: "editorial-hero",
            props: {
              heading: "WEAR\nTHE\nBOLD",
              subheading: "Collection 2026 — fabriqué à Dakar, porté partout.",
              buttonLabel: "Voir la collection",
              buttonHref: "/collections",
              imageUrl: "",
              imageAlt: "VOLTA lookbook — collection 2026",
              overlayOpacity: 0.55,
              align: "left",
              heightVh: 90,
              background: "#0D0D0D",
            },
          },
          {
            id: "volta-marquee",
            type: "marquee",
            props: {
              items: [
                "VOLTA DAKAR",
                "COLLECTION 2026",
                "WAVE & ORANGE MONEY",
                "LIVRAISON DAKAR",
                "MADE IN SÉNÉGAL",
                "PAIEMENT À LA LIVRAISON",
                "WEAR THE BOLD",
              ],
              speed: 30,
              background: "#B91C1C",
              color: "#FFFFFF",
            },
          },
          {
            id: "volta-cats",
            type: "category-tiles",
            props: {
              heading: "Rayons",
              columns: 4,
              items: [
                { label: "Homme", href: "/collections", imageUrl: "" },
                { label: "Femme", href: "/collections", imageUrl: "" },
                { label: "Accessoires", href: "/collections", imageUrl: "" },
                { label: "Soldes", href: "/collections", imageUrl: "" },
              ],
            },
          },
          {
            id: "volta-men-products",
            type: "products",
            props: {
              heading: "Homme — essentiels",
              layout: "grid",
              columns: 4,
              orderStyle: "whatsapp",
              orderCtaLabel: "Commander",
              items: [...PRODUCTS_MEN],
            },
          },
          {
            id: "volta-women-products",
            type: "products",
            props: {
              heading: "Femme — pièces signature",
              layout: "grid",
              columns: 4,
              orderStyle: "whatsapp",
              orderCtaLabel: "Commander",
              items: [...PRODUCTS_WOMEN],
            },
          },
          {
            id: "volta-story",
            type: "split",
            props: {
              heading: "Né à Dakar, porté partout.",
              body: "VOLTA est une marque streetwear fondée à Dakar en 2022. Chaque pièce naît d'un atelier local — tissu sélectionné à la main, coupe revue en accord avec le mouvement urbain de la ville.\n\nNous croyons que la mode africaine n'a pas à s'excuser d'être ambitieuse. VOLTA, c'est l'audace au quotidien.",
              imageUrl: "",
              imageAlt: "Atelier VOLTA à Dakar",
              imagePosition: "right",
              buttonLabel: "Notre histoire",
              buttonHref: "/about",
            },
          },
          {
            id: "volta-testimonials",
            type: "testimonials",
            props: {
              heading: "Ce que disent nos clients",
              items: [
                {
                  quote: "Le Série Noire Hoodie est une pièce de collection. Le tissu est épais, la broderie est parfaite — je le porte partout.",
                  author: "Ibou D.",
                  role: "Dakar",
                },
                {
                  quote: "J'ai commandé via WhatsApp un soir et j'avais ma commande le lendemain matin. Qualité top, service sérieux.",
                  author: "Fatou S.",
                  role: "Pikine, Dakar",
                },
                {
                  quote: "VOLTA c'est la seule marque locale que je porte fièrement. Le Kankam Tee lave et reste parfait après 20 cycles.",
                  author: "Moussa K.",
                  role: "Plateau, Dakar",
                },
              ],
            },
          },
          {
            id: "volta-wa-home",
            type: "whatsapp",
            props: {
              label: "Commander sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour VOLTA — je veux passer une commande.",
            },
          },
          footerSection("volta-footer-home"),
        ],
      },

      /* ── COLLECTIONS ────────────────────────────────────────────────── */
      {
        slug: "collections",
        title: "Collections",
        sections: [
          {
            id: "volta-bar-coll",
            type: "announcement-bar",
            props: {
              text: "LIVRAISON DAKAR · PAIEMENT WAVE · ORANGE MONEY",
              background: "#B91C1C",
              color: "#FFFFFF",
            },
          },
          navSection("volta-nav-collections"),
          {
            id: "volta-coll-hero",
            type: "hero",
            props: {
              heading: "Collection 2026",
              subheading: "Chaque pièce est conçue à Dakar et limitée en quantité. Commandez vite — les stocks ne reviennent pas.",
              buttonLabel: "Commander sur WhatsApp",
              buttonHref: "/order",
              align: "center",
              background: "#0D0D0D",
            },
          },
          {
            id: "volta-coll-men",
            type: "products",
            props: {
              heading: "Homme",
              layout: "grid",
              columns: 4,
              orderStyle: "whatsapp",
              orderCtaLabel: "Commander",
              items: [...PRODUCTS_MEN],
            },
          },
          {
            id: "volta-coll-women",
            type: "products",
            props: {
              heading: "Femme",
              layout: "grid",
              columns: 4,
              orderStyle: "whatsapp",
              orderCtaLabel: "Commander",
              items: [...PRODUCTS_WOMEN],
            },
          },
          {
            id: "volta-coll-gallery",
            type: "gallery",
            props: {
              heading: "Lookbook 2026",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Look 1 — Kankam Tee + Cargo Plateau" },
                { src: "", alt: "Look 2 — Série Noire Hoodie" },
                { src: "", alt: "Look 3 — Flamme Crop + Baye Jogger" },
                { src: "", alt: "Look 4 — Medina Cap + Diouf Vest" },
                { src: "", alt: "Look 5 — Homme en blanc urbain" },
                { src: "", alt: "Look 6 — Femme streetwear Dakar" },
              ],
            },
          },
          {
            id: "volta-coll-wa",
            type: "whatsapp",
            props: {
              label: "Commande personnalisée ? Écrivez-nous",
              phone: "+221770000000",
              message: "Bonjour VOLTA — j'ai une commande ou une question sur une pièce.",
            },
          },
          footerSection("volta-footer-collections"),
        ],
      },

      /* ── ABOUT ──────────────────────────────────────────────────────── */
      {
        slug: "about",
        title: "À propos",
        sections: [
          navSection("volta-nav-about"),
          {
            id: "volta-about-hero",
            type: "hero",
            props: {
              heading: "L'audace au quotidien",
              subheading: "VOLTA est née d'une conviction : la mode urbaine africaine mérite d'être fabriquée ici, avec soin, et portée avec fierté.",
              align: "left",
              background: "#0D0D0D",
            },
          },
          {
            id: "volta-manifesto",
            type: "text",
            props: {
              heading: "Notre manifeste",
              body: "Nous sommes partis d'un atelier à Médina, Dakar, en 2022. Deux créateurs, une machine à coudre industrielle, et une idée simple : fabriquer les vêtements que nous voulions porter, avec les matières que nous respections.\n\nAujourd'hui VOLTA propose deux collections par an, fabriquées localement à partir de cotonnades sélectionnées à la main. Chaque pièce est limitée. Chaque série a un nom. Chaque vêtement est contrôlé avant expédition.\n\nNous ne faisons pas de mode rapide. Nous faisons de la mode juste.",
            },
          },
          {
            id: "volta-values",
            type: "features",
            props: {
              heading: "Ce qui nous guide",
              items: [
                {
                  title: "Fabrication locale",
                  body: "Chaque pièce est cousue à Dakar par des tailleurs formés dans l'atelier VOLTA. Pas de sous-traitance offshore.",
                },
                {
                  title: "Matières honnêtes",
                  body: "Coton lourd, ripstop technique, jersey côtelé — des tissus que nous testons nous-mêmes sur toute une saison.",
                },
                {
                  title: "Séries limitées",
                  body: "On ne réédite pas. Quand le stock est épuisé, il est épuisé. Cela nous oblige à la qualité, pas à la quantité.",
                },
                {
                  title: "Prix direct",
                  body: "Pas d'intermédiaire, pas de boutique avec marge. On vend directement — commande WhatsApp, paiement Wave ou à la livraison.",
                },
              ],
            },
          },
          {
            id: "volta-about-split",
            type: "split",
            props: {
              heading: "L'atelier",
              body: "Notre atelier est basé à Médina, Dakar. Cinq tailleurs, deux patronniers, et une équipe de contrôle qualité — toute l'équipe est dakaroise. Visites sur rendez-vous.",
              imageUrl: "",
              imageAlt: "Atelier VOLTA — Médina, Dakar",
              imagePosition: "left",
            },
          },
          footerSection("volta-footer-about"),
        ],
      },

      /* ── ORDER ──────────────────────────────────────────────────────── */
      {
        slug: "order",
        title: "Commander",
        sections: [
          navSection("volta-nav-order"),
          {
            id: "volta-order-hero",
            type: "hero",
            props: {
              heading: "Passer une commande",
              subheading: "Commandez via WhatsApp — nous répondons en moins de 2h en semaine. Livraison Dakar sous 24h.",
              buttonLabel: "WhatsApp maintenant",
              buttonHref: "https://wa.me/221770000000",
              align: "center",
              background: "#0D0D0D",
            },
          },
          {
            id: "volta-order-how",
            type: "features",
            props: {
              heading: "Comment ça marche",
              items: [
                {
                  title: "1 — Choisissez votre pièce",
                  body: "Parcourez les collections, notez le nom de la pièce et votre taille (XS · S · M · L · XL · XXL).",
                },
                {
                  title: "2 — Écrivez sur WhatsApp",
                  body: "Envoyez-nous le nom de la pièce, la taille, et votre adresse de livraison à Dakar.",
                },
                {
                  title: "3 — Payez via Wave ou Orange Money",
                  body: "Nous vous envoyons un lien de paiement Wave ou un numéro Orange Money. Paiement à la livraison possible pour Dakar.",
                },
                {
                  title: "4 — Livraison sous 24h",
                  body: "Livraison à domicile à Dakar. Hors Dakar (Thiès, Saint-Louis, Ziguinchor) — 3 à 5 jours ouvrés via Gaïndé Express.",
                },
              ],
            },
          },
          {
            id: "volta-order-wa",
            type: "whatsapp",
            props: {
              label: "Commander sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour VOLTA — je veux passer une commande.",
            },
          },
          {
            id: "volta-order-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Livrez-vous en dehors de Dakar ?",
                  answer: "Oui — Thiès, Saint-Louis, Ziguinchor et autres grandes villes via Gaïndé Express. Délai : 3 à 5 jours ouvrés. Frais de port selon la destination (1 500 à 3 500 F CFA).",
                },
                {
                  question: "Peut-on payer à la livraison ?",
                  answer: "Oui, pour les livraisons dans le Grand Dakar uniquement. Pour les autres régions, paiement Wave ou Orange Money requis avant expédition.",
                },
                {
                  question: "Les tailles correspondent-elles aux standards européens ?",
                  answer: "Nos pièces sont taillées large. Si vous hésitez entre deux tailles, prenez la plus petite pour un rendu ajusté ou la plus grande pour un rendu oversize. Guidez-vous avec notre guide des tailles disponible sur WhatsApp.",
                },
                {
                  question: "Peut-on retourner ou échanger un article ?",
                  answer: "Échange possible sous 7 jours si la pièce n'a pas été portée et est dans son état d'origine. Remboursement non disponible — échange uniquement. Contactez-nous via WhatsApp.",
                },
              ],
            },
          },
          {
            id: "volta-order-contact",
            type: "contact",
            props: {
              heading: "Nous contacter",
              email: "volta.dakar@gmail.com",
              phone: "+221 77 000 00 00",
              address: "Atelier VOLTA, Médina, Dakar, Sénégal",
            },
          },
          footerSection("volta-footer-order"),
        ],
      },
    ],
  };
}

import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * LUXORA BEAUTÉ — luxury lip & makeup brand, dark editorial.
 * Obsidian + gold aesthetic, editorial-hero full-bleed, curated product drops,
 * marquee of ingredients, limited editions, WhatsApp concierge.
 * No quiz — desire/aspiration shopping flow.
 */

const NAV = [
  { label: "Collections", href: "/collections" },
  { label: "Best-sellers", href: "/collections#bestsellers" },
  { label: "Histoire", href: "/histoire" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "LUXORA", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© LUXORA BEAUTÉ — Formules de luxe pour peaux africaines. Livraison Dakar, Abidjan, Paris.",
      links: [
        { label: "Collections", href: "/collections" },
        { label: "Histoire", href: "/histoire" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function luxuryLipWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "LUXORA BEAUTÉ",
    theme: {
      primary: "#0D0A08",
      accent: "#C9A96E",
      background: "#0D0A08",
      text: "#F5EDD6",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Inter",
      spacing: "airy",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      aestheticId: "dark-gold-luxury-beauty",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("lx-nav-home"),
          {
            id: "lx-announce",
            type: "announcement-bar",
            props: {
              text: "✨ COLLECTION LIMITÉE — VELVET NOIR · Édition 150 unités seulement",
              background: "#C9A96E",
              color: "#0D0A08",
            },
          },
          {
            id: "lx-hero",
            type: "editorial-hero",
            props: {
              heading: "LE LUXE\nQUI VOUS\nAPPARTIENT.",
              subheading:
                "LUXORA — formules pigmentées pour peaux de profondeur. Rouge à lèvres, gloss, eye-liner. Créé par et pour les femmes africaines.",
              buttonLabel: "Explorer la collection",
              buttonHref: "/collections",
              imageUrl: "",
              imageAlt: "LUXORA BEAUTÉ — campagne éditoriale",
              align: "left",
              overlayOpacity: 0.55,
              heightVh: 95,
              background: "#0D0A08",
            },
          },
          {
            id: "lx-marquee",
            type: "marquee",
            props: {
              items: [
                "PIGMENTS INTENSES",
                "FORMULE LONGUE TENUE",
                "BEURRE DE KARITÉ",
                "HUILE DE BAOBAB",
                "VEGAN",
                "CRUELTY-FREE",
                "PEAUX MÉLANISÉES",
                "DAKAR × ABIDJAN × PARIS",
              ],
              speed: 30,
              background: "#1A1410",
              color: "#C9A96E",
              separator: "◆",
            },
          },
          {
            id: "lx-drops",
            type: "products",
            props: {
              heading: "Nouveautés",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "Commander — WhatsApp",
              items: [
                {
                  name: "Rouge Velours — Bordeaux Nocturne",
                  description: "Rouge à lèvres mat longue tenue — pigmentation 100% opaque en 1 couche. Enrichi beurre de karité. Tenu 8h.",
                  priceLabel: "18 500 FCFA",
                  badge: "NOUVEAU",
                  imageUrl: "",
                  filterTags: ["Lèvres", "Mat", "Bordeaux"],
                  whatsappMessage: "Bonjour LUXORA — je veux commander Rouge Velours Bordeaux Nocturne (18 500 FCFA). Livraison à : [ville]. Paiement : [Wave / Orange Money].",
                },
                {
                  name: "Gloss Ambré — Or des Dunes",
                  description: "Gloss non-collant effet miroir. Reflets dorés sur peaux foncées — rendu spectaculaire. Soin lèvres + couleur.",
                  priceLabel: "15 000 FCFA",
                  badge: "BEST-SELLER",
                  imageUrl: "",
                  filterTags: ["Lèvres", "Gloss", "Doré"],
                  whatsappMessage: "Bonjour LUXORA — je veux Gloss Ambré Or des Dunes (15 000 FCFA). Livraison à : [ville].",
                },
                {
                  name: "Eye-liner Obsidian — Noir Profond",
                  description: "Feutre liner longue tenue 24h, waterproof. Pointe précise 0.5mm. Résiste chaleur et humidité.",
                  priceLabel: "12 000 FCFA",
                  imageUrl: "",
                  filterTags: ["Yeux", "Liner", "Noir"],
                  whatsappMessage: "Bonjour LUXORA — je veux Eye-liner Obsidian (12 000 FCFA). Livraison à : [ville].",
                },
                {
                  name: "Rouge Satiné — Prune Royale",
                  description: "Satiné lumineux, pigmentation dense, confort 8h. La teinte phare de la saison.",
                  priceLabel: "18 500 FCFA",
                  imageUrl: "",
                  filterTags: ["Lèvres", "Satiné", "Prune"],
                  whatsappMessage: "Bonjour LUXORA — je veux Rouge Satiné Prune Royale (18 500 FCFA). Livraison à : [ville].",
                },
                {
                  name: "Coffret Essentiels — 3 produits",
                  description: "Rouge mat + gloss doré + liner — les 3 indispensables LUXORA. Packaging cadeau inclus.",
                  priceLabel: "42 000 FCFA",
                  valuePriceLabel: "46 000 FCFA",
                  badge: "IDÉAL CADEAU",
                  imageUrl: "",
                  filterTags: ["Coffret", "Cadeau"],
                  whatsappMessage: "Bonjour LUXORA — je veux le Coffret Essentiels (42 000 FCFA). Livraison à : [ville]. C'est [pour moi / un cadeau pour].",
                },
                {
                  name: "Édition Limitée — VELVET NOIR",
                  description: "Rouge à lèvres mat velours noir profond. 150 unités numérotées. Flacon laqué noir + initiales dorées.",
                  priceLabel: "28 000 FCFA",
                  badge: "ÉDITION LIM.",
                  imageUrl: "",
                  filterTags: ["Édition limitée", "Noir"],
                  whatsappMessage: "Bonjour LUXORA — je veux l'Édition Limitée VELVET NOIR (28 000 FCFA). Unités restantes ? Livraison à : [ville].",
                },
              ],
            },
          },
          {
            id: "lx-story-split",
            type: "split",
            props: {
              heading: "POUR NOUS,\nPAR NOUS.",
              body: "LUXORA est née à Dakar en 2021 — fondée par Fatou Mbaye, maquilleuse professionnelle lassée de voir des teintes créées pour d'autres types de peaux.\n\nChaque formule est testée exclusivement sur peaux mélanisées de phototypes IV à VI. Le pigment, la tenue, le rendu — tout est pensé pour vous.",
              imageUrl: "",
              imageAlt: "Fatou Mbaye, fondatrice LUXORA",
              imagePosition: "right",
              buttonLabel: "Notre histoire complète",
              buttonHref: "/histoire",
            },
          },
          {
            id: "lx-gallery",
            type: "gallery",
            props: {
              heading: "Campagne & looks",
              layout: "featured",
              columns: 3,
              instagramHandle: "luxora.beaute",
              followLabel: "Suivre LUXORA",
              items: [
                { src: "", alt: "Campagne éditoriale LUXORA — prune et or" },
                { src: "", alt: "Rouge Velours Bordeaux Nocturne — gros plan" },
                { src: "", alt: "Gloss doré — reflets lumière" },
                { src: "", alt: "Look complet — liner + rouge mat" },
                { src: "", alt: "Coffret LUXORA — packaging noir" },
                { src: "", alt: "Modèle peau ébène — rouge prune" },
              ],
            },
          },
          {
            id: "lx-testimonials",
            type: "testimonials",
            props: {
              heading: "Ce qu'elles disent",
              items: [
                {
                  quote: "Enfin un rouge à lèvres conçu pour ma carnation. Le Bordeaux Nocturne est exactement ce que je cherchais depuis des années.",
                  name: "Aïssatou Diallo",
                  role: "Cliente · Dakar",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Packaging luxueux, formule qui tient vraiment 8h malgré la chaleur de Dakar. Je ne reviendrai plus en arrière.",
                  name: "Chloé Konan",
                  role: "Cliente · Abidjan",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Le Gloss Or des Dunes donne des reflets incroyables sur ma peau. Mes amies me demandent la marque à chaque fois.",
                  name: "Nadia Touré",
                  role: "Cliente · Paris",
                  rating: 5,
                  verified: true,
                },
              ],
            },
          },
          {
            id: "lx-cta-wa",
            type: "whatsapp",
            props: {
              label: "Commander — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour LUXORA — je voudrais commander. Produit(s) souhaité(s) : [nom + quantité]. Livraison à : [ville]. Paiement : [Wave / Orange Money / autre].",
            },
          },
          footer("lx-footer-home"),
        ],
      },
      {
        slug: "collections",
        title: "Collections",
        sections: [
          nav("lx-nav-collections"),
          {
            id: "lx-collections-hero",
            type: "hero",
            props: {
              heading: "Collections",
              subheading: "Lèvres · Yeux · Coffrets — formules longue tenue pour peaux de profondeur.",
              buttonLabel: "Commander par WhatsApp",
              buttonHref: "/contact",
              align: "left",
              background: "#0D0A08",
            },
          },
          {
            id: "lx-collections-filter",
            type: "category-tiles",
            props: {
              heading: "Par catégorie",
              columns: 3,
              items: [
                { label: "Lèvres", href: "/collections#levres", imageUrl: "", description: "Rouges mats, satinés, gloss" },
                { label: "Yeux", href: "/collections#yeux", imageUrl: "", description: "Liner, mascara, eye-shadow" },
                { label: "Coffrets & éditions limitées", href: "/collections#coffrets", imageUrl: "", description: "Cadeaux & drops exclusifs" },
              ],
            },
          },
          {
            id: "lx-all-products",
            type: "products",
            props: {
              heading: "Toute la gamme",
              layout: "grid",
              columns: 3,
              filterLabel: "Filtrer par",
              orderCtaLabel: "Commander",
              items: [
                {
                  name: "Rouge Velours — Bordeaux Nocturne",
                  description: "Mat longue tenue · Pigment opaque · Karité · 8h tenu",
                  priceLabel: "18 500 FCFA",
                  imageUrl: "",
                  filterTags: ["Lèvres", "Mat"],
                  whatsappMessage: "Bonjour LUXORA — je commande Rouge Velours Bordeaux Nocturne (18 500 FCFA).",
                },
                {
                  name: "Rouge Satiné — Prune Royale",
                  description: "Satiné lumineux · Pigmentation dense · Confort",
                  priceLabel: "18 500 FCFA",
                  imageUrl: "",
                  filterTags: ["Lèvres", "Satiné"],
                  whatsappMessage: "Bonjour LUXORA — je commande Rouge Satiné Prune Royale (18 500 FCFA).",
                },
                {
                  name: "Rouge Satiné — Terracotta Sahel",
                  description: "Brun-rouge chaud · Parfait pour peaux dorées et ambrées",
                  priceLabel: "18 500 FCFA",
                  imageUrl: "",
                  filterTags: ["Lèvres", "Satiné", "Brun"],
                  whatsappMessage: "Bonjour LUXORA — je commande Rouge Satiné Terracotta Sahel (18 500 FCFA).",
                },
                {
                  name: "Gloss Ambré — Or des Dunes",
                  description: "Gloss miroir · Non-collant · Soin + couleur",
                  priceLabel: "15 000 FCFA",
                  badge: "BEST-SELLER",
                  imageUrl: "",
                  filterTags: ["Lèvres", "Gloss"],
                  whatsappMessage: "Bonjour LUXORA — je commande Gloss Or des Dunes (15 000 FCFA).",
                },
                {
                  name: "Eye-liner Obsidian — Noir",
                  description: "Feutre 24h · Waterproof · Pointe 0.5mm",
                  priceLabel: "12 000 FCFA",
                  imageUrl: "",
                  filterTags: ["Yeux", "Liner"],
                  whatsappMessage: "Bonjour LUXORA — je commande Eye-liner Obsidian (12 000 FCFA).",
                },
                {
                  name: "Édition Limitée — VELVET NOIR",
                  description: "Rouge mat noir · 150 unités numérotées · Packaging laqué",
                  priceLabel: "28 000 FCFA",
                  badge: "ÉDITION LIM.",
                  imageUrl: "",
                  filterTags: ["Édition limitée"],
                  whatsappMessage: "Bonjour LUXORA — je commande VELVET NOIR édition limitée (28 000 FCFA).",
                },
                {
                  name: "Coffret Essentiels — 3 produits",
                  description: "Rouge mat + gloss + liner · Packaging cadeau",
                  priceLabel: "42 000 FCFA",
                  valuePriceLabel: "46 000 FCFA",
                  imageUrl: "",
                  filterTags: ["Coffret"],
                  whatsappMessage: "Bonjour LUXORA — je commande le Coffret Essentiels (42 000 FCFA).",
                },
                {
                  name: "Coffret Mariage — Bride Edition",
                  description: "Look jour J complet — rouge + gloss + liner + mascara noir · Mini fixateur inclus",
                  priceLabel: "58 000 FCFA",
                  imageUrl: "",
                  filterTags: ["Coffret", "Mariage"],
                  whatsappMessage: "Bonjour LUXORA — je commande le Coffret Mariage (58 000 FCFA). Date du mariage : [XX/XX].",
                },
              ],
            },
          },
          footer("lx-footer-collections"),
        ],
      },
      {
        slug: "histoire",
        title: "Notre histoire",
        sections: [
          nav("lx-nav-histoire"),
          {
            id: "lx-histoire-hero",
            type: "hero",
            props: {
              heading: "Notre histoire",
              subheading: "LUXORA est née d'une frustration simple : aucune marque de cosmétiques ne créait vraiment pour nous.",
              buttonLabel: "Découvrir la collection",
              buttonHref: "/collections",
              align: "center",
              background: "#0D0A08",
            },
          },
          {
            id: "lx-histoire-split",
            type: "split",
            props: {
              heading: "Fatou Mbaye\net le pouvoir\ndu bon pigment.",
              body: "Fatou Mbaye est maquilleuse professionnelle depuis 2012. Pendant 9 ans, elle a vu les mêmes rouges à lèvres tirer au violet sur les peaux foncées, les mêmes gloss qui rendaient « terne » sur ses clientes.\n\nEn 2021, elle lance LUXORA avec une obsession : formuler pour les phototypes IV à VI. Chaque produit est testé sur peaux mélanisées uniquement, ajusté jusqu'à ce que le rendu soit parfait.",
              imageUrl: "",
              imageAlt: "Fatou Mbaye — fondatrice LUXORA",
              imagePosition: "right",
              buttonLabel: "Voir les collections",
              buttonHref: "/collections",
            },
          },
          {
            id: "lx-formulation",
            type: "features",
            props: {
              heading: "Nos engagements",
              layout: "grid",
              background: "#1A1410",
              items: [
                {
                  icon: "🌿",
                  title: "Actifs africains",
                  body: "Beurre de karité du Burkina, huile de baobab du Sénégal, moringa. Efficacité clinique prouvée, provenance transparente.",
                },
                {
                  icon: "🦋",
                  title: "Vegan & cruelty-free",
                  body: "Aucun ingrédient d'origine animale, aucun test sur animaux. Certification Leaping Bunny en cours.",
                },
                {
                  icon: "🎨",
                  title: "Pigments testés peau foncée",
                  body: "Chaque teinte est validée uniquement sur phototypes IV à VI. Le rendu que vous voyez sur nos visuels est réel.",
                },
                {
                  icon: "📦",
                  title: "Packaging responsable",
                  body: "Étuis en carton recyclé, flacons rechargeables dès 2025. 5% des ventes reversées à des artisanes sénégalaises.",
                },
              ],
            },
          },
          footer("lx-footer-histoire"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("lx-nav-contact"),
          {
            id: "lx-contact-section",
            type: "contact",
            props: {
              heading: "Commander & nous contacter",
              email: "hello@luxorabeaute.example",
              phone: "+221770000000",
              address: "LUXORA BEAUTÉ — Dakar, Sénégal · Livraison Dakar, Abidjan, Paris · 48h–72h",
            },
          },
          {
            id: "lx-contact-wa",
            type: "whatsapp",
            props: {
              label: "Commander — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour LUXORA — je veux commander. Produit(s) : [nom + quantité]. Livraison à : [ville]. Paiement : [Wave / Orange Money / Virement].",
            },
          },
          {
            id: "lx-shipping-faq",
            type: "faq",
            props: {
              heading: "Livraison & retours",
              items: [
                {
                  question: "Quels délais de livraison ?",
                  answer: "Dakar : 24h. Abidjan / Bamako / Cotonou : 72h via DHL. France : 5–7 jours via colissimo. Suivi envoyé par WhatsApp.",
                },
                {
                  question: "Comment payer ?",
                  answer: "Wave, Orange Money, virement OM. Paiement à la commande, expédition sous 24h après confirmation.",
                },
                {
                  question: "Puis-je retourner un produit ?",
                  answer: "Produit défectueux ou erreur de commande : échange ou remboursement sous 48h. Cosmétiques ouverts non repris pour raisons d'hygiène.",
                },
                {
                  question: "Proposez-vous des testerez ?",
                  answer: "Kit découverte : 3 teintes en format mini (2 ml chacune) pour 8 000 FCFA. Idéal avant d'acheter le format complet.",
                },
              ],
            },
          },
          footer("lx-footer-contact"),
        ],
      },
    ],
  };
}

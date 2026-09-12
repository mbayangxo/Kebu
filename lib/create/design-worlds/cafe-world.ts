import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * MOKA HOUSE — specialty café, Sugar Baby editorial pattern.
 * Warm terracotta / cream aesthetic, hand-illustrated feel, menu with prices,
 * seasonal specials, loyalty card, catering for events.
 * No quiz — discovery browsing is the pattern.
 */

const NAV = [
  { label: "Menu", href: "/menu" },
  { label: "Notre histoire", href: "/histoire" },
  { label: "Traiteur", href: "/traiteur" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "MOKA HOUSE", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© MOKA HOUSE — Dakar. Café specialty & pâtisserie maison. Ouvert 7h–21h.",
      links: [
        { label: "Menu", href: "/menu" },
        { label: "Traiteur", href: "/traiteur" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function cafeWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "MOKA HOUSE",
    theme: {
      primary: "#2C1810",
      accent: "#D4612A",
      background: "#FDF6EE",
      text: "#2C1810",
      fontDisplay: "Playfair Display",
      fontBody: "Lato",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "warm-cafe-editorial",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("mh-nav-home"),
          {
            id: "mh-announce",
            type: "announcement-bar",
            props: {
              text: "☕ Carte fidélité — 10 cafés achetés = 1 offert · Demandez votre carte en caisse",
              background: "#D4612A",
              color: "#FDF6EE",
            },
          },
          {
            id: "mh-hero",
            type: "split",
            props: {
              heading: "Le café\nque Dakar\nattendait.",
              body: "Specialty coffee, grains sélectionnés, pâtisserie maison quotidienne. MOKA HOUSE — Plateau, Dakar.\n\nOuvert 7h–21h · 7 jours sur 7 · Wifi gratuit.",
              imageUrl: "",
              imageAlt: "MOKA HOUSE — café specialty Dakar",
              imagePosition: "right",
              buttonLabel: "Voir le menu",
              buttonHref: "/menu",
            },
          },
          {
            id: "mh-specials",
            type: "products",
            props: {
              heading: "Spéciaux du moment",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "Commander — WhatsApp",
              items: [
                {
                  name: "Café Baobab Latte",
                  description: "Espresso double, lait d'amande, sirop de baobab maison. Notre création signature — fraîche et caramelée.",
                  priceLabel: "3 000 FCFA",
                  badge: "SIGNATURE",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — je voudrais commander 1× Café Baobab Latte (3 000 FCFA). Je suis [sur place / à emporter]. Heure d'arrivée : [XX:XX].",
                },
                {
                  name: "Croissant beurre & chocolat noir",
                  description: "Pâte feuilletée maison, beurre extra-fin, chocolat 72% Côte d'Ivoire. Cuit à 7h — arrivez tôt.",
                  priceLabel: "2 500 FCFA",
                  badge: "FRAIS DU MATIN",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — je voudrais réserver [X] croissants chocolat (2 500 FCFA). Je passe à [XX:XX].",
                },
                {
                  name: "Box brunch du week-end",
                  description: "Café + jus d'orange frais + œufs brouillés + tartines + salade de fruits. Pour 1 ou 2 personnes.",
                  priceLabel: "À partir de 8 500 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — je veux réserver une Box Brunch pour [1/2] personne(s) (à partir de 8 500 FCFA). Samedi / dimanche à [XX:XX].",
                },
              ],
            },
          },
          {
            id: "mh-gallery",
            type: "gallery",
            props: {
              heading: "Chez MOKA",
              layout: "masonry",
              columns: 3,
              instagramHandle: "mokahouse.dk",
              followLabel: "Voir nos créations",
              items: [
                { src: "", alt: "Café Baobab Latte art" },
                { src: "", alt: "Pâtisseries du matin — plateau" },
                { src: "", alt: "Intérieur MOKA HOUSE — lumière naturelle" },
                { src: "", alt: "Cold brew sur glace — été" },
                { src: "", alt: "Brunch week-end" },
                { src: "", alt: "Terrasse extérieure — Plateau Dakar" },
                { src: "", alt: "Barista au travail" },
                { src: "", alt: "Gâteau au baobab" },
                { src: "", alt: "Café filtre single origin" },
              ],
            },
          },
          {
            id: "mh-values",
            type: "features",
            props: {
              heading: "Pourquoi MOKA HOUSE",
              layout: "grid",
              items: [
                {
                  icon: "🌍",
                  title: "Grains africains",
                  body: "100% arabica éthiopien et rwandais, torréfié artisanalement chaque semaine. Traçabilité complète de la ferme à la tasse.",
                },
                {
                  icon: "🥐",
                  title: "Pâtisserie quotidienne",
                  body: "Croissants, madeleines, gâteau baobab, et plats salés cuits en cuisine chaque matin à 5h30. Fini avant 14h.",
                },
                {
                  icon: "🌿",
                  title: "Laits végétaux maison",
                  body: "Lait d'amande, lait d'avoine, lait de coco. Tous préparés sur place — pas de conservateurs, pas d'additifs.",
                },
                {
                  icon: "💻",
                  title: "Espace de travail",
                  body: "WiFi fibre, prises à chaque table, son à 50 dB max. Réservation table silencieuse pour 4h de travail.",
                },
              ],
            },
          },
          {
            id: "mh-testimonials",
            type: "testimonials",
            props: {
              heading: "Ce qu'ils en disent",
              items: [
                {
                  quote: "Le meilleur café de Dakar — sans hésitation. Le Baobab Latte est une révélation. Je viens tous les matins.",
                  name: "Mame Diarra Sow",
                  role: "Cliente régulière",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Cadre parfait pour télétravailler. Connexion stable, ambiance calme, le personnel est discret et efficace.",
                  name: "Ibrahima Fall",
                  role: "Freelance digital",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "J'ai commandé le brunch de groupe pour 8 personnes — ponctuel, délicieux, présenté magnifiquement. Je recommande.",
                  name: "Astou Ndiaye",
                  role: "Événement privé",
                  rating: 5,
                  verified: true,
                },
              ],
            },
          },
          {
            id: "mh-cta-wa",
            type: "whatsapp",
            props: {
              label: "Commander ou réserver — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour MOKA HOUSE — je voudrais [commander à emporter / réserver une table / me renseigner sur le traiteur]. Ma demande :",
            },
          },
          footer("mh-footer-home"),
        ],
      },
      {
        slug: "menu",
        title: "Menu",
        sections: [
          nav("mh-nav-menu"),
          {
            id: "mh-menu-hero",
            type: "hero",
            props: {
              heading: "Notre menu",
              subheading: "Cafés · Jus · Pâtisseries · Salades · Sandwichs — tout préparé en cuisine, chaque jour.",
              buttonLabel: "Commander par WhatsApp",
              buttonHref: "/contact",
              align: "left",
              background: "#2C1810",
            },
          },
          {
            id: "mh-menu-cafes",
            type: "products",
            props: {
              heading: "Boissons chaudes",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "Commander",
              items: [
                {
                  name: "Espresso simple",
                  description: "Shot 30ml — arabica éthiopien Yirgacheffe, torréfié artisanalement.",
                  priceLabel: "1 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — 1× espresso simple (1 000 FCFA). Je suis [sur place / à emporter].",
                },
                {
                  name: "Americano",
                  description: "Espresso double allongé à l'eau chaude. Grand ou petit.",
                  priceLabel: "1 500 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — 1× Americano (1 500 FCFA). Sur place ou à emporter ?",
                },
                {
                  name: "Cappuccino",
                  description: "Espresso + mousse de lait onctueuse. Lait entier, d'amande ou d'avoine.",
                  priceLabel: "2 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — 1× Cappuccino (2 000 FCFA). Lait : [entier / amande / avoine].",
                },
                {
                  name: "Café Baobab Latte",
                  description: "Espresso double + lait + sirop baobab maison. Notre signature.",
                  priceLabel: "3 000 FCFA",
                  badge: "SIGNATURE",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — 1× Café Baobab Latte (3 000 FCFA).",
                },
                {
                  name: "Chocolat chaud",
                  description: "Chocolat 70% Côte d'Ivoire + lait entier. Sans sucre ajouté.",
                  priceLabel: "2 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — 1× Chocolat chaud (2 000 FCFA).",
                },
                {
                  name: "Thé à la menthe",
                  description: "Thé vert gunpowder + menthe fraîche + gingembre. Préparation 5 min.",
                  priceLabel: "1 500 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — 1× Thé à la menthe (1 500 FCFA).",
                },
              ],
            },
          },
          {
            id: "mh-menu-food",
            type: "products",
            props: {
              heading: "À manger",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "Commander",
              items: [
                {
                  name: "Croissant beurre",
                  description: "Pâte feuilletée maison — disponible 7h–14h. Avec ou sans beurre.",
                  priceLabel: "2 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — [X] croissants (2 000 FCFA).",
                },
                {
                  name: "Gâteau baobab",
                  description: "Cake moelleux aux fruits de baobab, miel local, noix de cajou. Tranche ou entier.",
                  priceLabel: "2 500 FCFA / tranche",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — [X] part(s) de gâteau baobab (2 500 FCFA).",
                },
                {
                  name: "Sandwich avocat-oeufs",
                  description: "Pain de mie artisanal + avocat Sénégal + oeufs brouillés + pesto. Servi chaud.",
                  priceLabel: "4 500 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — 1× sandwich avocat-oeufs (4 500 FCFA).",
                },
                {
                  name: "Bowl quinoa & légumes",
                  description: "Quinoa, légumes grillés, sauce tahini, herbes fraîches. Option vegan.",
                  priceLabel: "5 500 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — 1× bowl quinoa légumes (5 500 FCFA).",
                },
                {
                  name: "Box brunch — 1 personne",
                  description: "Café + jus + œufs + toast + fruit. Week-end uniquement 9h–14h.",
                  priceLabel: "8 500 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — 1× Box brunch (8 500 FCFA). Samedi ou dimanche à [heure].",
                },
                {
                  name: "Box brunch — 2 personnes",
                  description: "Double portion : 2 cafés, 2 jus, oeufs pour 2, fromage, pain, fruits. Week-end uniquement.",
                  priceLabel: "15 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — 1× Box brunch 2 personnes (15 000 FCFA). Samedi ou dimanche à [heure].",
                },
              ],
            },
          },
          footer("mh-footer-menu"),
        ],
      },
      {
        slug: "histoire",
        title: "Notre histoire",
        sections: [
          nav("mh-nav-histoire"),
          {
            id: "mh-histoire-hero",
            type: "hero",
            props: {
              heading: "Notre histoire",
              subheading: "MOKA HOUSE est née d'une conviction : le meilleur café du monde pousse en Afrique. Il mérite d'être bu en Afrique.",
              buttonLabel: "Commander un café",
              buttonHref: "/menu",
              align: "center",
              background: "#2C1810",
            },
          },
          {
            id: "mh-histoire-split",
            type: "split",
            props: {
              heading: "Aminata et le café africain.",
              body: "Aminata Diallo a découvert le specialty coffee en résidence au Rwanda en 2019. De retour à Dakar, elle réalise qu'on importe du café brésilien bas de gamme alors qu'à 3h d'avion, le Kenya et l'Éthiopie produisent certains des meilleurs cafés du monde.\n\nElle ouvre MOKA HOUSE en 2022. Aujourd'hui, 85% de ses approvisionnements viennent de producteurs africains. Elle travaille directement avec les fermes — pas d'intermédiaire.",
              imageUrl: "",
              imageAlt: "Aminata Diallo, fondatrice MOKA HOUSE",
              imagePosition: "left",
              buttonLabel: "Rencontrez-nous",
              buttonHref: "/contact",
            },
          },
          {
            id: "mh-sourcing",
            type: "features",
            props: {
              heading: "Nos origines",
              layout: "grid",
              items: [
                {
                  icon: "🇪🇹",
                  title: "Éthiopie — Yirgacheffe",
                  body: "Floral, fruits rouges, acidité brillante. Notre espresso principal. Producteur : Workineh Bekele, Guji zone.",
                },
                {
                  icon: "🇷🇼",
                  title: "Rwanda — Huye Mountain",
                  body: "Chocolat noir, orange, noisette. Parfait en filtre. Coopérative de 500 producteurs, altitude 1 700m.",
                },
                {
                  icon: "🇨🇮",
                  title: "Côte d'Ivoire — Chocolat",
                  body: "Notre chocolat chaud et nos pâtisseries utilisent du cacao 70% de la région de San-Pédro.",
                },
                {
                  icon: "🇸🇳",
                  title: "Sénégal — Ingrédients locaux",
                  body: "Baobab, bissap, ditakh, gingembre — nos saveurs signature viennent des marchés de Dakar.",
                },
              ],
            },
          },
          footer("mh-footer-histoire"),
        ],
      },
      {
        slug: "traiteur",
        title: "Traiteur",
        sections: [
          nav("mh-nav-traiteur"),
          {
            id: "mh-traiteur-hero",
            type: "hero",
            props: {
              heading: "Traiteur & événements",
              subheading: "Pauses café, brunchs d'entreprise, box cocktails — à partir de 5 personnes, livraison Dakar incluse.",
              buttonLabel: "Demander un devis",
              buttonHref: "/contact",
              align: "left",
              background: "#2C1810",
            },
          },
          {
            id: "mh-traiteur-products",
            type: "products",
            props: {
              heading: "Nos formules traiteur",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "Demander un devis",
              items: [
                {
                  name: "Pause café — 5 à 20 pers.",
                  description: "Café, thé, jus, 2 pâtisseries par personne. Service et matériel inclus. Livraison Dakar Plateau et Almadies.",
                  priceLabel: "À partir de 5 000 FCFA / pers",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — je veux organiser une pause café traiteur. Nombre de personnes : [X]. Date : [XX/XX]. Lieu : [adresse].",
                },
                {
                  name: "Brunch entreprise",
                  description: "Buffet brunch complet — sucré + salé + boissons chaudes et froides. Jusqu'à 50 personnes. Sur devis.",
                  priceLabel: "À partir de 12 000 FCFA / pers",
                  badge: "POPULAIRE",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — je veux un brunch entreprise. Nombre de personnes : [X]. Date : [XX/XX]. Budget indicatif : [FCFA].",
                },
                {
                  name: "Box cocktail dinatoire",
                  description: "Canapés, verrines sucrées-salées, boissons sans alcool artisanales. Livraison et installation.",
                  priceLabel: "À partir de 8 000 FCFA / pers",
                  imageUrl: "",
                  whatsappMessage: "Bonjour MOKA HOUSE — je veux une box cocktail dinatoire. Personnes : [X]. Événement : [XX/XX]. Je veux [livraison / livraison + service].",
                },
              ],
            },
          },
          {
            id: "mh-traiteur-stats",
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "200", suffix: "+", label: "Événements traiteur" },
                { value: "48", label: "Délai commande (h)" },
                { value: "5", label: "km livraison gratuite" },
                { value: "100", suffix: "%", label: "Ingrédients frais" },
              ],
            },
          },
          footer("mh-footer-traiteur"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("mh-nav-contact"),
          {
            id: "mh-contact-section",
            type: "contact",
            props: {
              heading: "Venez nous voir",
              email: "hello@mokahouse.example",
              phone: "+221770000000",
              address: "MOKA HOUSE — 12 Av. Pompidou, Plateau, Dakar · Ouvert lun–dim 7h–21h",
            },
          },
          {
            id: "mh-map",
            type: "map",
            props: {
              heading: "Nous trouver",
              address: "Plateau, Dakar, Sénégal",
              lat: 14.6928,
              lng: -17.4467,
              zoom: 15,
            },
          },
          {
            id: "mh-contact-wa",
            type: "whatsapp",
            props: {
              label: "Commander ou réserver — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour MOKA HOUSE — je voudrais [commander / réserver une table / demander un devis traiteur]. Détails :",
            },
          },
          footer("mh-footer-contact"),
        ],
      },
    ],
  };
}

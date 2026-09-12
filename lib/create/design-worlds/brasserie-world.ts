import type { WebsiteDefinition } from "../website-schema";

/**
 * LION BRASS — Brasserie artisanale & bar à bières
 * Bold industrial: jaune soleil + noir charbon + beige kraft
 * Bebas Neue (display) + DM Sans (body)
 * Bières artisanales locales, bar, événements, Dakar
 */
export function brasserieWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "LION BRASS",
    theme: {
      primary: "#1A1710",
      accent: "#F2C12E",
      background: "#F5F0E8",
      text: "#1A1710",
      surface: "#EDE7D9",
      fontDisplay: "Bebas Neue",
      fontBody: "DM Sans",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      radius: "sharp",
      aestheticId: "bold-industrial-brewery",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "🍺 Happy Hour 16h–19h du lundi au vendredi · Bières artisanales brassées à Dakar",
              background: "#F2C12E",
              color: "#1A1710",
              linkText: "Notre carte",
              linkUrl: "/bières",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Brasserie Artisanale · Dakar",
              heading: "Bière locale,\ncaractère\nsingulier.",
              subheading:
                "LION BRASS brasse ses propres bières à Dakar depuis 2019. Lager, IPA, stout et saisonnières — inspirées des céréales et saveurs de l'Afrique de l'Ouest.",
              primaryCta: { label: "Nos bières", href: "/bières" },
              secondaryCta: { label: "Réserver une table", href: "https://wa.me/221760000000" },
              backgroundImageUrl: "",
              overlay: 0.55,
              textAlign: "left",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "12", label: "Références en fût" },
                { value: "5", label: "Ans de brassage" },
                { value: "500", suffix: "+", label: "Litres/semaine" },
                { value: "4.8", prefix: "★", label: "Note Google" },
              ],
              background: "#F2C12E",
            },
          },
          {
            type: "products",
            props: {
              heading: "Nos bières signature",
              subheading: "Brassées artisanalement à Dakar. En fût, en bouteille, à emporter.",
              columns: 3,
              filterTags: ["Légères", "IPA", "Brunes", "Saisonnières"],
              items: [
                {
                  name: "DAKAR GOLD Lager",
                  description:
                    "Lager légère et rafraîchissante. Notes dorées, amertume équilibrée. Notre best-seller. 4,8% ABV.",
                  price: 3500,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Best-seller",
                  filterTags: ["Légères"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "SÉRÈRE IPA",
                  description:
                    "India Pale Ale brassée avec du gingembre du Sénégal. Florale, épicée, amère. 6,2% ABV.",
                  price: 4000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Signature",
                  filterTags: ["IPA"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "NUIT DE DAKAR Stout",
                  description:
                    "Stout sombre aux notes de café et cacao. Veloutée, intense. 5,5% ABV.",
                  price: 4200,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Brunes"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "MANGO WEISS",
                  description:
                    "Bière de blé à la mangue de Casamance. Fruitée, légère, effervescente. 4,4% ABV.",
                  price: 3800,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Saisonnière",
                  filterTags: ["Saisonnières", "Légères"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "BAOBAB AMBER",
                  description:
                    "Ale ambrée aux fruits de baobab séché. Caramélisée, ronde, africaine. 5,1% ABV.",
                  price: 3900,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Saisonnières"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Fût 30L — Événements",
                  description:
                    "Fût de 30 litres livré chez vous pour vos événements. Choisissez votre référence. Pompe incluse.",
                  price: 85000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Événements",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Notre histoire",
              heading: "Brassés localement,\nbu fièrement.",
              body: "LION BRASS est né d'une conviction : l'Afrique de l'Ouest mérite sa propre culture brassicole. Nous utilisons des céréales du Sénégal, du gingembre de Casamance, des fruits du baobab et de la mangue pour créer des bières qui parlent de notre territoire. Notre brasserie-bar à Dakar est ouverte tous les jours.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Visiter la brasserie", href: "/contact" },
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Les avis de nos clients",
              items: [
                {
                  quote:
                    "La SÉRÈRE IPA est une révélation. Ce mélange de houblon et de gingembre sénégalais est unique. On ne trouve ça nulle part ailleurs en Afrique de l'Ouest.",
                  author: "Cheikh T.",
                  role: "Amateur de craft beer, Dakar",
                },
                {
                  quote:
                    "On a pris un fût de 30L pour le lancement de notre startup. Tout le monde a adoré. Le service de livraison est impeccable, à l'heure et bien emballé.",
                  author: "Amina S.",
                  role: "Entrepreneuse, Dakar",
                },
                {
                  quote:
                    "Le bar est devenu notre QG le vendredi soir. L'ambiance est parfaite, les bières excellentes et le staff toujours souriant.",
                  author: "Moussa D.",
                  role: "Client régulier",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Réserver ou commander",
              subheading:
                "Réservations de tables, commandes en bouteille, fûts pour événements. Livraison Dakar disponible.",
              phoneNumber: "221760000000",
              message:
                "Bonjour LION BRASS, je souhaite [réserver une table pour X personnes / commander des bouteilles / louer un fût pour un événement]. Merci.",
              buttonLabel: "Nous contacter",
            },
          },
        ],
      },
      {
        slug: "bières",
        title: "Nos Bières",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Toutes nos bières",
              subheading: "12 références en fût. Brassées à Dakar, inspirées de l'Afrique.",
              backgroundImageUrl: "",
              overlay: 0.6,
            },
          },
          {
            type: "products",
            props: {
              heading: "",
              columns: 3,
              filterTags: ["Légères", "IPA", "Brunes", "Saisonnières", "Sans alcool"],
              items: [
                {
                  name: "DAKAR GOLD Lager",
                  description: "4,8% ABV — Lager légère et dorée. Best-seller.",
                  price: 3500,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Best-seller",
                  filterTags: ["Légères"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "SÉRÈRE IPA",
                  description: "6,2% ABV — IPA au gingembre du Sénégal.",
                  price: 4000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["IPA"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "NUIT DE DAKAR Stout",
                  description: "5,5% ABV — Stout café et cacao. Veloutée.",
                  price: 4200,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Brunes"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "MANGO WEISS",
                  description: "4,4% ABV — Bière blanche à la mangue de Casamance.",
                  price: 3800,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Saisonnières", "Légères"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "BAOBAB AMBER",
                  description: "5,1% ABV — Ale ambrée aux fruits de baobab.",
                  price: 3900,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Saisonnières"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "TÉRANGA 0% ",
                  description: "0% ABV — Sans alcool, tout le caractère. Menthe et citron vert.",
                  price: 2800,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Sans alcool"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221760000000",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "événements",
        title: "Événements",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Événements privés",
              heading: "Votre fête,\nnos bières.",
              body: "Anniversaires, lancements, mariages, soirées corporate : LION BRASS met sa brasserie et ses bières à votre disposition. Fûts à domicile, bar événementiel complet ou réservation privatisée de notre espace. Capacité jusqu'à 200 personnes.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Demander un devis", href: "https://wa.me/221760000000" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Options événementielles",
              layout: "grid",
              items: [
                {
                  icon: "🍺",
                  title: "Fût à domicile",
                  description: "Fût 30L ou 50L livré avec pompe et accessoires. Choix de la référence. Livraison Dakar.",
                },
                {
                  icon: "🏠",
                  title: "Privatisation du bar",
                  description: "Notre espace bar jusqu'à 80 personnes. Formule open bar ou à la consommation.",
                },
                {
                  icon: "🎪",
                  title: "Bar mobile",
                  description: "Notre équipe déplace un bar complet sur votre lieu d'événement. Dakar et environs.",
                },
                {
                  icon: "🎁",
                  title: "Pack cadeau",
                  description: "Coffrets de 6 ou 12 bouteilles assortiment. Gravure personnalisée sur étiquette.",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Organiser votre événement",
              subheading: "Date, nombre de personnes, lieu et type d'événement. Devis sous 24h.",
              phoneNumber: "221760000000",
              message:
                "Bonjour LION BRASS, je voudrais organiser [type d'événement] le [date] pour [nombre] personnes à [lieu]. Je suis intéressé(e) par [fût à domicile / privatisation / bar mobile].",
              buttonLabel: "Planifier l'événement",
            },
          },
        ],
      },
      {
        slug: "contact",
        title: "Trouver le bar",
        sections: [
          {
            type: "contact",
            props: {
              heading: "La brasserie & le bar",
              subheading: "Ouvert du mardi au dimanche 12h–00h. Happy hour 16h–19h.",
              address: "LION BRASS — Almadies, Dakar, Sénégal",
              phone: "+221 76 000 00 00",
              email: "coucou@lionbrass.sn",
              mapEmbedUrl: "",
            },
          },
        ],
      },
    ],
  };
}

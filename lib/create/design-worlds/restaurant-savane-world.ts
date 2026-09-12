import type { WebsiteDefinition } from "../website-schema";

/**
 * SAVANE DAKAR — Restaurant africain contemporain & fusion
 * Bold warm: rouille terracotta + jaune soleil + vert forêt
 * Unbounded (display) + Nunito (body)
 * Cuisine africaine contemporaine, brunch, cocktails, Dakar
 */
export function restaurantSavaneWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "SAVANE DAKAR",
    theme: {
      primary: "#C85C2D",
      accent: "#F5C842",
      background: "#FFFAF5",
      text: "#1C1008",
      surface: "#FDF0E5",
      fontDisplay: "Unbounded",
      fontBody: "Nunito",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "round",
      aestheticId: "bold-warm-african-contemporary-restaurant",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "🌞 BRUNCH DU DIMANCHE — 10h à 15h · Réservation conseillée · Terrasse ouverte",
              background: "#F5C842",
              color: "#1C1008",
              linkText: "Réserver",
              linkUrl: "/contact",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Cuisine Africaine Contemporaine · Dakar",
              heading: "La saveur\nde chez nous,\nréinventée.",
              subheading:
                "SAVANE DAKAR revisite la cuisine africaine avec créativité — plats de partage, brunchs généreux, cocktails aux fruits locaux. Une adresse qui rassemble.",
              primaryCta: { label: "Réserver une table", href: "/contact" },
              secondaryCta: { label: "Voir la carte", href: "/menu" },
              backgroundImageUrl: "",
              overlay: 0.25,
              textAlign: "left",
            },
          },
          {
            type: "marquee",
            props: {
              items: [
                "CUISINE AFRICAINE",
                "BRUNCH DIMANCHE",
                "PLATS DE PARTAGE",
                "COCKTAILS LOCAUX",
                "DAKAR",
                "TERRASSE",
                "RÉSERVATION",
              ],
              speed: 35,
              background: "#C85C2D",
              color: "#FFFAF5",
              separator: "◆",
            },
          },
          {
            type: "products",
            props: {
              heading: "Ce qu'on mange",
              subheading: "Des saveurs africaines, du partage, de la générosité.",
              columns: 3,
              items: [
                {
                  name: "Thiébou Dieune Réinventé",
                  description:
                    "Riz rouge, mérou entier, légumes du marché, sauce tamarin maison. Le plat national revisité avec soin.",
                  price: 9500,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Signature",
                  filterTags: ["Poisson", "Sénégalais", "Signature"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000003",
                },
                {
                  name: "Poulet Rôti Mafé",
                  description:
                    "Demi-poulet fermier rôti, sauce mafé arachide + gingembre, riz pilaf africain, attiéké.",
                  price: 11000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Poulet", "Africain"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000003",
                },
                {
                  name: "Bowl Yassa Crevettes",
                  description:
                    "Crevettes sautées, sauce yassa citron-oignons, riz quinoa, légumes marinés. Frais et complet.",
                  price: 13500,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Nouveau",
                  filterTags: ["Crevettes", "Contemporain"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000003",
                },
                {
                  name: "Planche de Partage Savane",
                  description:
                    "Pour 2-3 — accras de haricots, samossas bœuf, pastels, salade de mangue verte. L'entrée idéale.",
                  price: 12000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Partage", "Entrées"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000003",
                },
                {
                  name: "Brunch du Dimanche",
                  description:
                    "Formule illimitée — viennoiseries, œufs, thiébou dieune, jus de bissap, cocktail sans alcool. Dimanche 10h-15h.",
                  price: 18000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Dimanche",
                  filterTags: ["Brunch", "Formule"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000003",
                },
                {
                  name: "Cocktail Dakar Tropical",
                  description:
                    "Cocktail maison — bissap, tamarin, gingembre, jus de citron vert, sirop de canne. Avec ou sans alcool.",
                  price: 5500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Cocktails", "Boissons"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000003",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Notre approche",
              heading: "Africain.\nGénéreux.\nContemporain.",
              body: "SAVANE DAKAR est né d'une passion simple : la cuisine africaine est l'une des plus riches du monde, et elle mérite une scène à la hauteur de ses saveurs.\n\nNous cuisinons avec les produits du marché local — légumes, poissons, viandes sénégalaises — et nous les réinterpretons avec une touche contemporaine. Pas de fusion artificielle — une évolution naturelle.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Voir la carte", href: "/menu" },
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Chez nous",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Thiébou dieune réinventé — dressage chef" },
                { src: "", alt: "Brunch du dimanche — table dressée terrasse" },
                { src: "", alt: "Cocktail bissap — bar SAVANE" },
                { src: "", alt: "Planche de partage — détail accras" },
                { src: "", alt: "Ambiance terrasse — soir Dakar" },
                { src: "", alt: "Équipe SAVANE DAKAR — en cuisine" },
              ],
              instagramHandle: "@savanedakar",
              followLabel: "Voir notre quotidien",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ils en parlent",
              items: [
                {
                  quote:
                    "Le brunch du dimanche à SAVANE est devenu notre rituel familial. Le buffet est généreux, l'ambiance terrasse est parfaite, et les cocktails sans alcool sont excellents. Indispensable.",
                  author: "Awa D.",
                  role: "Cliente régulière, Dakar",
                },
                {
                  quote:
                    "J'ai amené des collègues étrangers chez SAVANE pour qu'ils découvrent la cuisine sénégalaise. Ils ont adoré le thiébou dieune réinventé. Le meilleur ambassadeur de notre cuisine.",
                  author: "Lamine K.",
                  role: "Client, Dakar",
                },
                {
                  quote:
                    "Les plats de partage sont généreux et vraiment bons. L'accueil est chaleureux, le cadre est beau. SAVANE DAKAR c'est l'endroit où on mange bien sans se ruiner.",
                  author: "Sokhna B.",
                  role: "Cliente, Dakar",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Réserver votre table",
              subheading:
                "Tables disponibles midi et soir, 7j/7. Brunch dimanche — réservation obligatoire.",
              phoneNumber: "221780000003",
              message:
                "Bonjour SAVANE DAKAR — je voudrais réserver une table. Date : [date]. Heure : [heure]. Nombre de personnes : [nombre]. Allergie ou occasion particulière : [préciser].",
              buttonLabel: "Réserver — WhatsApp",
            },
          },
        ],
      },
      {
        slug: "menu",
        title: "Menu",
        sections: [
          {
            type: "hero",
            props: {
              heading: "La carte",
              subheading: "Cuisine africaine contemporaine — midi et soir. Brunch le dimanche.",
              backgroundImageUrl: "",
              overlay: 0.3,
            },
          },
          {
            type: "products",
            props: {
              heading: "La carte complète",
              columns: 3,
              items: [
                {
                  name: "Thiébou Dieune Réinventé",
                  description: "Mérou, riz rouge, légumes, tamarin maison.",
                  price: 9500,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Signature",
                  filterTags: ["Poisson", "Signature"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000003",
                },
                {
                  name: "Poulet Rôti Mafé",
                  description: "Demi-poulet, sauce mafé, riz pilaf.",
                  price: 11000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Poulet"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000003",
                },
                {
                  name: "Bowl Yassa Crevettes",
                  description: "Crevettes, yassa citron, quinoa, légumes.",
                  price: 13500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Crevettes", "Contemporain"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000003",
                },
                {
                  name: "Mafé Bœuf Classique",
                  description: "Bœuf mijoté sauce arachide, riz blanc, légumes.",
                  price: 8500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Bœuf", "Africain"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000003",
                },
                {
                  name: "Attiéké Poisson Braisé",
                  description: "Attiéké ivoirien, poisson braisé, oignons, tomates fraîches.",
                  price: 8000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Poisson", "Africain"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000003",
                },
                {
                  name: "Planche de Partage Savane",
                  description: "Accras, samossas, pastels, salade mangue verte.",
                  price: 12000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Partage", "Entrées"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000003",
                },
                {
                  name: "Soupe Kandia",
                  description: "Soupe gombos sauce tomate, poisson fumé, huile de palme.",
                  price: 6500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Soupe", "Africain"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000003",
                },
                {
                  name: "Cocktail Dakar Tropical",
                  description: "Bissap, tamarin, gingembre, citron vert, canne.",
                  price: 5500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Cocktails"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000003",
                },
                {
                  name: "Brunch Dimanche (formule)",
                  description: "Tout inclus — viennoiseries + plat + cocktail. Dimanche seulement.",
                  price: 18000,
                  currency: "FCFA",
                  badge: "Dimanche",
                  imageUrl: "",
                  filterTags: ["Brunch", "Formule"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000003",
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
            type: "contact",
            props: {
              heading: "Nous trouver",
              subheading: "Ouvert 7j/7 — midi 12h-15h, soir 19h-23h. Brunch dimanche 10h-15h.",
              address: "SAVANE DAKAR — Rue 10 × Boulevard Dial Diop, Dakar, Sénégal",
              phone: "+221 78 000 00 03",
              email: "bonjour@savanedakar.sn",
              mapEmbedUrl: "",
            },
          },
          {
            type: "whatsapp",
            props: {
              label: "WhatsApp — réservation",
              phone: "+221780000003",
              message: "Bonjour SAVANE DAKAR — je voudrais réserver une table.",
            },
          },
        ],
      },
    ],
  };
}

import type { WebsiteDefinition } from "../website-schema";

/**
 * BRAISE DAKAR — Restaurant grill & steakhouse africain
 * Dark premium: charbon intense + rouge braise + or cuivré
 * Oswald (display) + Source Sans Pro (body)
 * Viandes grillées, brochettes, plats africains premium, Dakar
 */
export function restaurantGrillWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "BRAISE DAKAR",
    theme: {
      primary: "#C0392B",
      accent: "#D4A853",
      background: "#0E0C0A",
      text: "#F2EDE6",
      surface: "#1C1814",
      fontDisplay: "Oswald",
      fontBody: "Source Sans Pro",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "sharp",
      aestheticId: "dark-premium-grill-steakhouse",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Restaurant Grill · Dakar",
              heading: "LE FEU.\nLA VIANDE.\nL'ESSENTIEL.",
              subheading:
                "BRAISE DAKAR — viandes grillées au charbon de bois, brochettes maison, plats africains premium. Cuisine de feu depuis 2018. Almadies, Dakar.",
              primaryCta: { label: "Réserver une table", href: "/contact" },
              secondaryCta: { label: "Voir la carte", href: "/menu" },
              backgroundImageUrl: "",
              overlay: 0.7,
              textAlign: "center",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              background: "#C0392B",
              items: [
                { value: "100%", label: "Charbon de bois" },
                { value: "6", label: "Ans d'expérience" },
                { value: "4.8★", label: "Note Google" },
                { value: "Midi & Soir", label: "Service" },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "La carte",
              subheading: "Grillades, brochettes et plats africains — au charbon de bois.",
              columns: 3,
              items: [
                {
                  name: "Côte de Bœuf 800g",
                  description:
                    "Côte de bœuf importée, maturation 21 jours. Grillée au charbon, sauce chimichurri, frites maison. Pour 2 personnes.",
                  price: 35000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Spécialité",
                  filterTags: ["Grillades", "Bœuf", "Pour 2"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000002",
                },
                {
                  name: "Brochettes Agneau Épicées",
                  description:
                    "6 brochettes agneau marinade ras-el-hanout + miel + citron. Grillées minute. Riz basmati + salade tomates.",
                  price: 12000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Best-seller",
                  filterTags: ["Brochettes", "Agneau"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000002",
                },
                {
                  name: "Poulet Yassa Grillé",
                  description:
                    "Poulet entier mariné au yassa — oignons, citron, moutarde, piment. Grillé charbon, servi avec riz blanc.",
                  price: 9500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Poulet", "Africain"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000002",
                },
                {
                  name: "Thiéboudienne de Braise",
                  description:
                    "Notre réinterprétation du thiébou dieune — riz rouge, poisson grillé charbon, légumes maison. Le plat national, en mieux.",
                  price: 8500,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Signature",
                  filterTags: ["Poisson", "Africain"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000002",
                },
                {
                  name: "Plateau Grill Mix",
                  description:
                    "Pour 4 — côtes, brochettes agneau, poulet grillé, saucisses maison. Accompagnements: frites, salade, sauces maison.",
                  price: 55000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Pour 4",
                  filterTags: ["Grillades", "Pour 4", "Partagé"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000002",
                },
                {
                  name: "Crevettes Grillées à l'Ail",
                  description:
                    "Crevettes royales fraîches, beurre ail-persil, grillées minute. Riz pilaf + rouille maison.",
                  price: 14000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Fruits de mer", "Grillades"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000002",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Notre cuisine",
              heading: "Le charbon\nde bois\nc'est notre\nseul secret.",
              body: "Chez BRAISE DAKAR, rien ne sort d'un four électrique. Chaque viande, chaque poisson, chaque brochette passe sur le charbon de bois — pour ce goût fumé qu'on ne peut pas simuler.\n\nNous travaillons avec des éleveurs sénégalais et des importateurs sélectionnés pour les viandes premium. La qualité de la matière première d'abord — la maîtrise du feu ensuite.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Voir la carte complète", href: "/menu" },
            },
          },
          {
            type: "gallery",
            props: {
              heading: "La braise",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Côte de bœuf — braise charbon" },
                { src: "", alt: "Brochettes agneau — grillades Dakar" },
                { src: "", alt: "Plateau grill mix — pour 4" },
                { src: "", alt: "Intérieur BRAISE DAKAR — ambiance nuit" },
                { src: "", alt: "Thiéboudienne de braise — plat signature" },
                { src: "", alt: "Chef au travail — charbon de bois" },
              ],
              instagramHandle: "@braisedakar",
              followLabel: "Suivre BRAISE DAKAR",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ce qu'on dit de nous",
              items: [
                {
                  quote:
                    "La côte de bœuf est exceptionnelle — personne ne fait ça aussi bien à Dakar. Le charbon donne un goût fumé incomparable. On revient au moins une fois par mois.",
                  author: "Serigne D.",
                  role: "Client régulier, Dakar",
                },
                {
                  quote:
                    "Les brochettes agneau sont les meilleures que j'ai mangées. La marinade ras-el-hanout + miel est parfaite. Et l'ambiance la nuit est vraiment bonne.",
                  author: "Aïssatou B.",
                  role: "Cliente, Dakar",
                },
                {
                  quote:
                    "On a fêté l'anniversaire de mon mari avec le plateau grill pour 8. Service impeccable, qualité constante, prix justes. BRAISE DAKAR c'est la valeur sûre.",
                  author: "Mariama N.",
                  role: "Cliente, Dakar",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Réserver une table",
              subheading:
                "Réservation conseillée le week-end. Groupes de 8+ personnes : contactez-nous pour un espace privatif.",
              phoneNumber: "221780000002",
              message:
                "Bonjour BRAISE DAKAR — je voudrais réserver une table. Date : [date]. Heure : [heure]. Nombre de personnes : [nombre]. Occasion particulière : [oui/non].",
              buttonLabel: "Réserver sur WhatsApp",
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
              heading: "LA CARTE",
              subheading: "Grillades au charbon de bois. Plats africains. Fruits de mer.",
              backgroundImageUrl: "",
              overlay: 0.75,
            },
          },
          {
            type: "products",
            props: {
              heading: "Grillades",
              columns: 3,
              items: [
                {
                  name: "Entrecôte 350g",
                  description: "Entrecôte grain-fed, charbon, sauce au choix.",
                  price: 18500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Grillades", "Bœuf"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000002",
                },
                {
                  name: "Côte de Bœuf 800g (pour 2)",
                  description: "Maturation 21 jours, chimichurri, frites maison.",
                  price: 35000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Spécialité",
                  filterTags: ["Grillades", "Bœuf"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000002",
                },
                {
                  name: "Poulet Entier Grillé",
                  description: "Poulet fermier Sénégal, marinade yassa, riz blanc.",
                  price: 9500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Poulet", "Africain"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000002",
                },
                {
                  name: "Brochettes Agneau x6",
                  description: "Agneau mariné ras-el-hanout, miel, citron. Riz basmati.",
                  price: 12000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Brochettes", "Agneau"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000002",
                },
                {
                  name: "Brochettes Bœuf x6",
                  description: "Bœuf haché épicé, oignons caramélisés. Frites.",
                  price: 10000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Brochettes", "Bœuf"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000002",
                },
                {
                  name: "Crevettes Royales Grillées",
                  description: "Crevettes fraîches, beurre ail-persil, riz pilaf.",
                  price: 14000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Fruits de mer"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000002",
                },
                {
                  name: "Thiéboudienne de Braise",
                  description: "Poisson grillé charbon, riz rouge, légumes maison.",
                  price: 8500,
                  currency: "FCFA",
                  badge: "Signature",
                  filterTags: ["Poisson", "Africain"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000002",
                },
                {
                  name: "Mafé Bœuf Maison",
                  description: "Mafé sauce arachide, bœuf mijoté, légumes. Riz blanc.",
                  price: 7500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Africain"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000002",
                },
                {
                  name: "Plateau Grill Complet (4 pers.)",
                  description: "Côtes + brochettes + poulet + saucisses + accompagnements.",
                  price: 55000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Pour 4",
                  filterTags: ["Grillades", "Pour 4"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000002",
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
              subheading: "Ouvert midi et soir, 7j/7. Terrasse et salle intérieure climatisée.",
              address: "BRAISE DAKAR — Route des Almadies, Dakar, Sénégal",
              phone: "+221 78 000 00 02",
              email: "bonjour@braisedakar.sn",
              mapEmbedUrl: "",
            },
          },
          {
            type: "whatsapp",
            props: {
              label: "WhatsApp — réservation & commande",
              phone: "+221780000002",
              message: "Bonjour BRAISE DAKAR — je voudrais réserver / passer commande.",
            },
          },
        ],
      },
    ],
  };
}

import type { WebsiteDefinition } from "../website-schema";

/**
 * MIETTES & CO — Boulangerie artisanale & pâtisserie
 * Warm bake: lin doux + brun beurré + crème dorée
 * Fraunces (display) + Nunito (body)
 * Pains artisanaux, pâtisseries, commandes, Dakar
 */
export function boulangerieWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "MIETTES & CO",
    theme: {
      primary: "#5C3A1E",
      accent: "#D4A853",
      background: "#FBF8F2",
      text: "#2A1A08",
      surface: "#F3ECD8",
      fontDisplay: "Playfair Display",
      fontBody: "Nunito",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "round",
      aestheticId: "warm-artisan-bakery-patisserie",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "🥐 FRAIS DU JOUR — Croissants, baguettes et gâteaux prêts à 7h · Commandes personnalisées disponibles",
              background: "#5C3A1E",
              color: "#FBF8F2",
              linkText: "Commander",
              linkUrl: "/commandes",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Boulangerie Artisanale · Dakar",
              heading: "Fait avec\nles mains.\nCuit avec\nle cœur.",
              subheading:
                "MIETTES & CO est une boulangerie-pâtisserie artisanale à Dakar — pains au levain, croissants au beurre, gâteaux sur commande. Tout fait maison, chaque matin.",
              primaryCta: { label: "Voir les créations", href: "/carte" },
              secondaryCta: { label: "Commander un gâteau", href: "/commandes" },
              backgroundImageUrl: "",
              overlay: 0.15,
              textAlign: "left",
            },
          },
          {
            type: "products",
            props: {
              heading: "Ce qu'on fait",
              subheading: "Du lundi au samedi — tout frais, tout maison.",
              columns: 3,
              items: [
                {
                  name: "Pain au Levain Naturel",
                  description:
                    "Levain fermenté 24h, farine de blé T65. Croûte épaisse, mie aérée, goût légèrement acidulé. 500g.",
                  price: 2500,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Chaque matin",
                  filterTags: ["Pains", "Levain"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221770000004",
                },
                {
                  name: "Croissant Pur Beurre",
                  description:
                    "Croissant feuilleté pur beurre AOC — 48h de feuilletage. Dorure miel. Pièce.",
                  price: 1500,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Best-seller",
                  filterTags: ["Viennoiseries"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221770000004",
                },
                {
                  name: "Gâteau d'Anniversaire",
                  description:
                    "Gâteau personnalisé sur commande — génoises, entremets, gâteaux fondants. Visuels et parfums à choisir. 8-12 parts.",
                  priceLabel: "À partir de 35 000 FCFA",
                  imageUrl: "",
                  badge: "Sur commande",
                  filterTags: ["Gâteaux", "Commandes"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000004",
                },
                {
                  name: "Tarte Aux Fruits Frais",
                  description:
                    "Pâte sucrée maison, crème pâtissière vanille, fruits frais de saison. 6-8 parts.",
                  price: 18000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Tartes", "Gâteaux"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000004",
                },
                {
                  name: "Sandwich Boulanger",
                  description:
                    "Pain maison, jambon, fromage ou garniture locale. Midi uniquement. Fraîcheur garantie.",
                  price: 3500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Sandwichs", "Midi"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221770000004",
                },
                {
                  name: "Plateau Viennoiseries (10 pcs)",
                  description:
                    "Plateau mix — croissants, pains au chocolat, kouign-amann, palmiers. Idéal pour réunions et petits-déjeuners.",
                  price: 12000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Idéal bureau",
                  filterTags: ["Plateaux", "Viennoiseries"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000004",
                },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "Notre façon de travailler",
              layout: "grid",
              items: [
                {
                  icon: "🌾",
                  title: "Ingrédients sélectionnés",
                  description:
                    "Farine premium, beurre pur, œufs frais de ferme, sucre non raffiné. Aucun conservateur. Recettes simples et honnêtes.",
                },
                {
                  icon: "🕔",
                  title: "4h du matin, chaque jour",
                  description:
                    "Nos boulangers commencent à 4h pour que tout soit prêt à l'ouverture à 7h. Jamais de pain de la veille réchauffé.",
                },
                {
                  icon: "🎂",
                  title: "Commandes personnalisées",
                  description:
                    "Gâteaux d'anniversaire, pièces montées, plateaux événements. On crée ce que vous imaginez — donnez-nous 48h de préavis.",
                },
                {
                  icon: "🚗",
                  title: "Livraison Dakar",
                  description:
                    "Livraison à domicile disponible pour commandes de 15 000 FCFA minimum. Zone Dakar et banlieue proche.",
                },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Nos créations",
              layout: "masonry",
              columns: 3,
              items: [
                { src: "", alt: "Pain au levain — miettes boulangerie" },
                { src: "", alt: "Croissants pur beurre — dorés au four" },
                { src: "", alt: "Gâteau d'anniversaire — commande personnalisée" },
                { src: "", alt: "Tarte fruits frais — pâtisserie artisanale" },
                { src: "", alt: "Plateau viennoiseries — réunion bureau" },
                { src: "", alt: "Vitrine boulangerie — matin Dakar" },
              ],
              instagramHandle: "@miettesco.dakar",
              followLabel: "Voir nos créations du jour",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Nos fidèles",
              items: [
                {
                  quote:
                    "Le pain au levain de MIETTES & CO est le meilleur de Dakar — je dis ça sans exagérer. J'en commande 3 fois par semaine. La croûte, la mie, le goût — c'est du grand artisanat.",
                  author: "Amadou S.",
                  role: "Client régulier, Dakar",
                },
                {
                  quote:
                    "J'ai commandé le gâteau d'anniversaire pour mes 30 ans. Exactement ce que j'avais demandé — beau et délicieux. Toutes mes amies ont voulu le contact. MIETTES & CO c'est exceptionnel.",
                  author: "Fatoumata K.",
                  role: "Cliente, Dakar",
                },
                {
                  quote:
                    "On commande les plateaux viennoiseries pour nos réunions d'équipe chaque semaine. Croissants toujours croustillants, livraison ponctuelle. Un partenaire fiable.",
                  author: "Directrice RH",
                  role: "Entreprise, Dakar",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Commander ou réserver",
              subheading:
                "Pain du matin, gâteau sur commande, plateau bureau — on prépare pour vous.",
              phoneNumber: "221770000004",
              message:
                "Bonjour MIETTES & CO — je voudrais [commander / réserver]. Ce que je cherche : [pain au levain / croissants / gâteau anniversaire / plateau viennoiseries]. Pour : [date / heure de retrait ou livraison].",
              buttonLabel: "Commander sur WhatsApp",
            },
          },
        ],
      },
      {
        slug: "carte",
        title: "Carte",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Toutes nos créations",
              subheading: "Pains, viennoiseries, pâtisseries — tout frais, tout fait maison.",
              backgroundImageUrl: "",
              overlay: 0.2,
            },
          },
          {
            type: "products",
            props: {
              heading: "La carte complète",
              columns: 3,
              items: [
                {
                  name: "Pain au Levain 500g",
                  description: "Levain 24h, farine T65. Croûte épaisse.",
                  price: 2500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Pains"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221770000004",
                },
                {
                  name: "Baguette Tradition",
                  description: "Baguette fermentation lente, farine française.",
                  price: 800,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Pains"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221770000004",
                },
                {
                  name: "Pain Complet Graines",
                  description: "Pain blé entier, sésame, tournesol, graines de lin.",
                  price: 2200,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Pains", "Santé"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221770000004",
                },
                {
                  name: "Croissant Pur Beurre",
                  description: "Feuilletage 48h, beurre AOC, miel.",
                  price: 1500,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Best-seller",
                  filterTags: ["Viennoiseries"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221770000004",
                },
                {
                  name: "Pain au Chocolat",
                  description: "Feuilletage pur beurre, chocolat noir 70%.",
                  price: 1800,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Viennoiseries"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221770000004",
                },
                {
                  name: "Tarte Chocolat Intense",
                  description: "Pâte sablée, ganache chocolat noir 70%.",
                  price: 16000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Tartes", "Gâteaux"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000004",
                },
                {
                  name: "Tarte Fruits Frais",
                  description: "Crème pâtissière vanille, fruits de saison.",
                  price: 18000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Tartes", "Gâteaux"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000004",
                },
                {
                  name: "Gâteau Anniversaire",
                  description: "Personnalisé sur commande. 8-12 parts.",
                  priceLabel: "À partir de 35 000 FCFA",
                  imageUrl: "",
                  badge: "Sur commande",
                  filterTags: ["Gâteaux", "Commandes"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000004",
                },
                {
                  name: "Plateau Viennoiseries 10 pcs",
                  description: "Mix croissants + pains au chocolat + palmiers.",
                  price: 12000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Plateaux"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000004",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "commandes",
        title: "Commandes",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Commandes spéciales",
              heading: "On prépare\nce que vous\nimaginez.",
              body: "Gâteaux d'anniversaire, pièces montées pour mariages, plateaux petits-déjeuners d'entreprise, colis cadeaux — MIETTES & CO crée des pâtisseries sur mesure pour toutes vos occasions.\n\nContactez-nous 48h minimum à l'avance pour toute commande personnalisée. Pour les événements importants (mariages, cérémonies), prévoyez 2 semaines.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Passer commande", href: "https://wa.me/221770000004" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Comment commander",
              layout: "horizontal",
              items: [
                { icon: "💬", title: "WhatsApp", description: "Décrivez votre commande, l'occasion et la date souhaitée." },
                { icon: "🎨", title: "Design", description: "On vous propose des visuels et parfums selon votre demande." },
                { icon: "💳", title: "Acompte", description: "50% à la validation. Solde à la livraison ou au retrait." },
                { icon: "📦", title: "Prêt", description: "Retrait en boutique ou livraison à votre adresse." },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Passer une commande",
              subheading: "Gâteaux, plateaux, commandes spéciales — 48h de préavis minimum.",
              phoneNumber: "221770000004",
              message: "Bonjour MIETTES & CO — je voudrais passer une commande. Ce que je cherche : [gâteau anniversaire / plateau viennoiseries / autre]. Occasion : [occasion]. Date souhaitée : [date]. Budget indicatif :",
              buttonLabel: "Commander sur WhatsApp",
            },
          },
        ],
      },
    ],
  };
}

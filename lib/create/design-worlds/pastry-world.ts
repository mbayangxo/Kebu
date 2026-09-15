import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * SUCRÉ DAKAR — artisan pastry shop, USHA editorial pattern.
 * Warm cream / pastel pink aesthetic, product-first, custom orders,
 * wedding cakes, atelier visits, WhatsApp ordering. No quiz.
 */

const NAV = [
  { label: "Créations", href: "/creations" },
  { label: "Commande sur-mesure", href: "/surmesure" },
  { label: "Livraison", href: "/livraison" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "SUCRÉ DAKAR", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© SUCRÉ DAKAR — Pâtisserie artisanale. Commandes WhatsApp · Livraison Dakar.",
      links: [
        { label: "Créations", href: "/creations" },
        { label: "Sur-mesure", href: "/surmesure" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function pastryWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "SUCRÉ DAKAR",
    theme: {
      primary: "#2A1A1A",
      accent: "#E8877A",
      background: "#FDF8F4",
      text: "#2A1A1A",
      fontDisplay: "Playfair Display",
      fontBody: "Lato",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "warm-pastry-artisan",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("sd-nav-home"),
          {
            id: "sd-announce",
            type: "announcement-bar",
            props: {
              text: "🎂 Commandes spéciales pour la Korité et Tabaski — réservez 5 jours à l'avance · WhatsApp",
              background: "#E8877A",
              color: "#FDF8F4",
            },
          },
          {
            id: "sd-hero",
            type: "split",
            props: {
              heading: "La pâtisserie\nartisanale de\nDakar.",
              body: "SUCRÉ DAKAR — gâteaux personnalisés, wedding cakes, pâtisseries fines, desserts africains.\n\nCommande WhatsApp · Livraison Dakar · Atelier sur rendez-vous.",
              imageUrl: "",
              imageAlt: "SUCRÉ DAKAR — gâteau artisanal",
              imagePosition: "right",
              buttonLabel: "Voir les créations",
              buttonHref: "/creations",
            },
          },
          {
            id: "sd-bestsellers",
            type: "products",
            props: {
              heading: "Best-sellers",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "Commander — WhatsApp",
              items: [
                {
                  name: "Layer cake mangue & passion",
                  description: "Génoise légère, crème diplomate mangue, coulis de fruits de la passion, 20 cm. 12 parts.",
                  priceLabel: "35 000 FCFA",
                  badge: "BEST-SELLER",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux commander 1 Layer Cake Mangue Passion (35 000 FCFA). Date de livraison souhaitée : [XX/XX]. Adresse :",
                },
                {
                  name: "Tarte au citron meringée",
                  description: "Pâte sablée, crème citron vert, meringue italienne toastée. Taille 24 cm. Fraîcheur garantie 24h.",
                  priceLabel: "25 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux 1 Tarte Citron Meringée (25 000 FCFA). Date : [XX/XX].",
                },
                {
                  name: "Cheesecake bissap",
                  description: "Notre création signature — base speculoos, appareil crémeux, coulis de bissap. Un classique sénégalais revisité.",
                  priceLabel: "28 000 FCFA",
                  badge: "SIGNATURE",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux 1 Cheesecake Bissap (28 000 FCFA). Date souhaitée : [XX/XX].",
                },
                {
                  name: "Financiers à la noix de cajou",
                  description: "Box de 12 financiers moelleux, noix de cajou du Sénégal, beurre noisette. Idéal cadeau bureau.",
                  priceLabel: "12 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux 1 boîte de financiers cajou (12 000 FCFA). À récupérer [sur place / livraison à :]",
                },
                {
                  name: "Cake baobab & noix de coco",
                  description: "Cake moelleux aux fruits de baobab, noix de coco râpée, miel local. Slice ou entier.",
                  priceLabel: "8 000 FCFA / tranche · 30 000 FCFA / entier",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux [1 tranche / 1 Cake entier] baobab-coco. Date :",
                },
                {
                  name: "Box desserts assortis — 6 pièces",
                  description: "Sélection du jour : macarons, petits fours, mini éclairs, financiers. Emballage cadeau sur demande.",
                  priceLabel: "15 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux 1 Box 6 pièces assortis (15 000 FCFA). Date :",
                },
              ],
            },
          },
          {
            id: "sd-gallery",
            type: "gallery",
            props: {
              heading: "Nos créations",
              layout: "masonry",
              columns: 3,
              instagramHandle: "sucredakar",
              followLabel: "Suivre l'atelier",
              items: [
                { src: "", alt: "Wedding cake 4 étages — blanc et fleurs séchées" },
                { src: "", alt: "Layer cake mangue passion" },
                { src: "", alt: "Cheesecake bissap" },
                { src: "", alt: "Tarte citron meringée" },
                { src: "", alt: "Macarons colorés" },
                { src: "", alt: "Gâteau anniversaire personnalisé" },
                { src: "", alt: "Financiers cajou" },
                { src: "", alt: "Cake baobab-coco" },
                { src: "", alt: "Box desserts cadeau" },
              ],
            },
          },
          {
            id: "sd-about",
            type: "split",
            props: {
              heading: "Aminata et\nla pâtisserie\nde chez nous.",
              body: "SUCRÉ DAKAR, c'est Aminata Fall — pâtissière formée à Paris, revenue à Dakar avec une obsession : créer des pâtisseries françaises de qualité en y intégrant les saveurs du Sénégal.\n\nBissap, baobab, ditakh, moringa, noix de cajou — les produits du terroir sénégalais ont leur place dans chaque création.",
              imageUrl: "",
              imageAlt: "Aminata Fall, pâtissière fondatrice",
              imagePosition: "left",
              buttonLabel: "Commander sur-mesure",
              buttonHref: "/surmesure",
            },
          },
          {
            id: "sd-testimonials",
            type: "testimonials",
            props: {
              heading: "Ils ont goûté",
              items: [
                {
                  quote: "Le wedding cake de mon mariage était magnifique et délicieux. Tous mes invités ont demandé le contact. Aminata est exceptionnelle.",
                  name: "Mariama Sow",
                  role: "Mariée — janvier 2025",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Le cheesecake bissap est un chef-d'œuvre. La texture, l'acidité, la douceur — tout est parfait. Je commande tous les mois.",
                  name: "Ibrahima Diallo",
                  role: "Client régulier",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Box cadeau pour l'anniversaire de ma directrice — accueil incroyable. Livraison ponctuelle, présentation soignée. Je recommande sans hésiter.",
                  name: "Koumba Ndiaye",
                  role: "Client entreprise",
                  rating: 5,
                  verified: true,
                },
              ],
            },
          },
          {
            id: "sd-cta-wa",
            type: "whatsapp",
            props: {
              label: "Commander par WhatsApp",
              phone: "+221770000000",
              message: "Bonjour SUCRÉ DAKAR — je voudrais commander. Ce que je recherche : [gâteau / tarte / box / wedding cake]. Pour [X] personnes. Date souhaitée : [XX/XX].",
            },
          },
          footer("sd-footer-home"),
        ],
      },
      {
        slug: "creations",
        title: "Créations",
        sections: [
          nav("sd-nav-creations"),
          {
            id: "sd-creations-hero",
            type: "hero",
            props: {
              heading: "Toutes nos créations",
              subheading: "Gâteaux, tartes, petits fours, wedding cakes — livraison Dakar sous 24h.",
              buttonLabel: "Commander par WhatsApp",
              buttonHref: "/contact",
              align: "left",
              background: "#2A1A1A",
            },
          },
          {
            id: "sd-creations-categories",
            type: "category-tiles",
            props: {
              heading: "Explorer par catégorie",
              columns: 4,
              items: [
                { label: "Gâteaux", href: "/creations#gateaux", imageUrl: "", description: "Layer cakes, cheesecakes" },
                { label: "Tartes", href: "/creations#tartes", imageUrl: "", description: "Tartes fines et classiques" },
                { label: "Petits fours", href: "/creations#fours", imageUrl: "", description: "Macarons, financiers, éclairs" },
                { label: "Wedding & events", href: "/creations#wedding", imageUrl: "", description: "Pièces montées, cakes" },
              ],
            },
          },
          {
            id: "sd-all-products",
            type: "products",
            props: {
              heading: "Menu complet",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "Commander",
              items: [
                {
                  name: "Layer cake mangue & passion",
                  description: "12 parts · génoise, crème diplomate, coulis · 35 cm",
                  priceLabel: "35 000 FCFA",
                  imageUrl: "",
                  filterTags: ["Gâteaux"],
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux Layer Cake Mangue Passion (35 000 FCFA). Date :",
                },
                {
                  name: "Cheesecake bissap",
                  description: "Signature · base speculoos, coulis bissap · 8–10 parts",
                  priceLabel: "28 000 FCFA",
                  imageUrl: "",
                  filterTags: ["Gâteaux"],
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux Cheesecake Bissap (28 000 FCFA). Date :",
                },
                {
                  name: "Tarte citron meringée",
                  description: "8 parts · pâte sablée, crème citron vert, meringue italienne",
                  priceLabel: "25 000 FCFA",
                  imageUrl: "",
                  filterTags: ["Tartes"],
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux Tarte Citron Meringée (25 000 FCFA). Date :",
                },
                {
                  name: "Tarte framboise & litchi",
                  description: "Fruits frais, crème pâtissière légère, pâte sablée au beurre",
                  priceLabel: "28 000 FCFA",
                  imageUrl: "",
                  filterTags: ["Tartes"],
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux Tarte Framboise Litchi (28 000 FCFA). Date :",
                },
                {
                  name: "Box macarons — 12 pièces",
                  description: "Assortiment de 6 parfums : vanille, pistache, framboise, chocolat, citron, rose",
                  priceLabel: "18 000 FCFA",
                  imageUrl: "",
                  filterTags: ["Petits fours"],
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux Box Macarons 12 pièces (18 000 FCFA). Date :",
                },
                {
                  name: "Wedding cake — sur devis",
                  description: "Pièce montée 2 à 5 étages, personnalisée. Consultation gratuite 4 semaines avant.",
                  priceLabel: "À partir de 80 000 FCFA",
                  badge: "SUR MESURE",
                  imageUrl: "",
                  filterTags: ["Wedding"],
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux un wedding cake pour mon mariage le [date]. Personnes : [X]. Budget indicatif :",
                },
              ],
            },
          },
          footer("sd-footer-creations"),
        ],
      },
      {
        slug: "surmesure",
        title: "Sur-mesure",
        sections: [
          nav("sd-nav-surmesure"),
          {
            id: "sd-surmesure-hero",
            type: "hero",
            props: {
              heading: "Commandes sur-mesure",
              subheading: "Anniversaires, mariages, baptêmes, événements d'entreprise — chaque occasion mérite quelque chose d'unique.",
              buttonLabel: "Demander un devis",
              buttonHref: "/contact",
              align: "left",
              background: "#2A1A1A",
            },
          },
          {
            id: "sd-surmesure-products",
            type: "products",
            props: {
              heading: "Formules sur-mesure",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "Demander un devis",
              items: [
                {
                  name: "Gâteau anniversaire personnalisé",
                  description: "Votre design, vos saveurs, votre message. Livraison Dakar. 5 jours de préavis minimum.",
                  priceLabel: "À partir de 35 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux un gâteau anniversaire personnalisé. Pour [X] personnes. Date : [XX/XX]. Thème / design souhaité :",
                },
                {
                  name: "Wedding cake",
                  description: "Pièce maîtresse de votre mariage. Consultation incluse, goûter d'essai offert. 4 semaines minimum.",
                  priceLabel: "À partir de 80 000 FCFA",
                  badge: "CONSULTATION OFFERTE",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je me marie le [date] et je veux discuter du wedding cake. Personnes : [X]. Style envisagé :",
                },
                {
                  name: "Box cadeau entreprise",
                  description: "Assortiments de pâtisseries fines emballées aux couleurs de votre entreprise. À partir de 5 boxes.",
                  priceLabel: "À partir de 15 000 FCFA / box",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux des boxes cadeaux entreprise. Nombre de boxes : [X]. Logo/couleur de la marque :",
                },
                {
                  name: "Table de desserts événement",
                  description: "50 à 200+ pièces, thème personnalisé, installation incluse. Baptêmes, anniversaires, conférences.",
                  priceLabel: "Sur devis",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SUCRÉ DAKAR — je veux une table de desserts pour un événement. Date : [XX/XX]. Nombre d'invités : [X]. Événement : [baptême / anniversaire / autre].",
                },
              ],
            },
          },
          {
            id: "sd-surmesure-faq",
            type: "faq",
            props: {
              heading: "Tout savoir avant de commander",
              items: [
                {
                  question: "Quel délai minimum pour une commande sur-mesure ?",
                  answer: "Gâteau anniversaire : 5 jours. Wedding cake : 4 semaines minimum. Table de desserts : 2 semaines. Urgences possibles avec supplément.",
                },
                {
                  question: "Comment se passe le goûter d'essai wedding cake ?",
                  answer: "Séance de 45 min à l'atelier — vous goûtez 4 saveurs de génoise et 4 crèmes. Gratuit, sur RDV, minimum 4 semaines avant le mariage.",
                },
                {
                  question: "Livrez-vous en dehors de Dakar ?",
                  answer: "Livraison dans Dakar et Banlieue (Pikine, Guédiawaye, Rufisque). Pièces montées et wedding cakes livrés uniquement dans un rayon de 30 km.",
                },
                {
                  question: "Comment payer ?",
                  answer: "Acompte 50% à la commande (Wave ou Orange Money), solde à la livraison. Pas de cash pour les commandes au-dessus de 30 000 FCFA.",
                },
              ],
              contactPanel: {
                heading: "Projet spécial ?",
                body: "Vous avez une idée hors du commun ? Contactez-nous — on adore les défis créatifs.",
                buttonLabel: "Nous écrire",
                buttonHref: "/contact",
                background: "#E8877A",
              },
            },
          },
          footer("sd-footer-surmesure"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("sd-nav-contact"),
          {
            id: "sd-contact-section",
            type: "contact",
            props: {
              heading: "Commander ou nous contacter",
              email: "hello@sucredakar.example",
              phone: "+221770000000",
              address: "SUCRÉ DAKAR — Mermoz, Dakar · Atelier sur rendez-vous · Livraison 7j/7",
            },
          },
          {
            id: "sd-contact-wa",
            type: "whatsapp",
            props: {
              label: "Commander par WhatsApp",
              phone: "+221770000000",
              message: "Bonjour SUCRÉ DAKAR — je voudrais passer une commande. Ce que je recherche : [type de pâtisserie]. Pour [X] personnes. Date :",
            },
          },
          footer("sd-footer-contact"),
        ],
      },
    ],
  };
}

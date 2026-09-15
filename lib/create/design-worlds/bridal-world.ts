import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * IVORY BRIDE — African bridal styling studio, Vibi & Co pattern.
 * Soft ivory / champagne aesthetic, editorial photos, real FCFA pricing,
 * appointment-first flow, lookbook gallery, styling packages.
 * No quiz — appointment booking is the single CTA.
 */

const NAV = [
  { label: "Services", href: "/services" },
  { label: "Lookbook", href: "/lookbook" },
  { label: "Notre histoire", href: "/histoire" },
  { label: "Réserver", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "IVORY BRIDE", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© IVORY BRIDE — Dakar. Stylisme bridal africain sur-mesure. Sur rendez-vous uniquement.",
      links: [
        { label: "Services", href: "/services" },
        { label: "Lookbook", href: "/lookbook" },
        { label: "Réserver", href: "/contact" },
      ],
    },
  };
}

export function bridalWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "IVORY BRIDE",
    theme: {
      primary: "#2C2118",
      accent: "#C9A96E",
      background: "#FDFAF5",
      text: "#2C2118",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Lato",
      spacing: "airy",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "ivory-bridal-editorial",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("ib-nav-home"),
          {
            id: "ib-hero",
            type: "editorial-hero",
            props: {
              heading: "TON PLUS\nBEAU JOUR\nMÉRITE ÇA.",
              subheading:
                "Stylisme bridal africain — robes, accessoires, coiffure, maquillage. Tout coordonné pour votre grand jour.",
              buttonLabel: "Réserver une consultation",
              buttonHref: "/contact",
              imageUrl: "",
              imageAlt: "IVORY BRIDE — mariée africaine élégante",
              align: "left",
              overlayOpacity: 0.4,
              heightVh: 90,
              background: "#2C2118",
            },
          },
          {
            id: "ib-intro-split",
            type: "split",
            props: {
              heading: "Chaque mariée\nest unique.",
              body: "IVORY BRIDE accompagne les mariées africaines dans la création de leur look du jour J — qu'il s'agisse d'un style traditionnel, contemporain, ou d'une fusion des deux.\n\nNous travaillons avec les meilleurs ateliers de couture, maquilleurs et coiffeurs de Dakar — une seule interlocutrice, tout inclus.",
              imageUrl: "",
              imageAlt: "Styliste IVORY BRIDE avec mariée",
              imagePosition: "right",
              buttonLabel: "Notre approche",
              buttonHref: "/histoire",
            },
          },
          {
            id: "ib-stats",
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "320", suffix: "+", label: "Mariées accompagnées" },
                { value: "8", label: "Ans d'expérience" },
                { value: "4", label: "Pays d'intervention" },
                { value: "100", suffix: "%", label: "Mariées satisfaites" },
              ],
            },
          },
          {
            id: "ib-services-home",
            type: "features",
            props: {
              heading: "Ce qu'on fait",
              layout: "grid",
              items: [
                {
                  icon: "👗",
                  title: "Robe & tenue",
                  body: "Sélection de créateurs africains, couture sur-mesure, locations. Du wax au dentelle, du boubou au bustier.",
                },
                {
                  icon: "💐",
                  title: "Coordination stylistique",
                  body: "Moodboard complet, coordination couleurs des familles, accessoires bijoux, chaussures, voile.",
                },
                {
                  icon: "💄",
                  title: "Maquillage & coiffure",
                  body: "Équipe de maquilleurs et coiffeuses partenaires. Essai inclus dans le pack. Durée garantie 12h.",
                },
                {
                  icon: "📸",
                  title: "Shooting d'essayage",
                  body: "Séance photo professionnelle pendant l'essayage — pour valider le look et avoir des souvenirs.",
                },
              ],
            },
          },
          {
            id: "ib-gallery-home",
            type: "gallery",
            props: {
              heading: "Nos mariées",
              layout: "masonry",
              columns: 3,
              instagramHandle: "ivorybride.dk",
              followLabel: "Voir nos créations",
              items: [
                { src: "", alt: "Mariée en robe sur-mesure — fusion contemporaine" },
                { src: "", alt: "Look traditionnel tiacé blanc et or" },
                { src: "", alt: "Maquillage glam africain" },
                { src: "", alt: "Bouquet et accessoires dorés" },
                { src: "", alt: "Famille de la mariée — tenues coordonnées" },
                { src: "", alt: "Séance essayage — moments de complicité" },
                { src: "", alt: "Détail robe — broderies fil d'or" },
                { src: "", alt: "Coiffure tresse sculptée" },
                { src: "", alt: "Chaussures + voile + bijoux" },
              ],
            },
          },
          {
            id: "ib-testimonials",
            type: "testimonials",
            props: {
              heading: "Nos mariées témoignent",
              items: [
                {
                  quote: "IVORY BRIDE a géré tout le stylisme de mon mariage — robe, accessoires, maquillage, tenues des dames d'honneur. Je n'ai eu à me soucier de rien. Magnifique.",
                  name: "Aïssatou Diallo",
                  role: "Mariée — décembre 2024",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Khady a compris exactement mon style — ni trop classique, ni trop moderne. La fusion wax-dentelle était exactement moi. Toute ma famille a adoré.",
                  name: "Rokhaya Ndiaye",
                  role: "Mariée — septembre 2024",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Professionnalisme, ponctualité, créativité. Le shooting d'essayage inclus dans le pack était une belle surprise. Mes photos de mariage sont sublimes.",
                  name: "Mariama Sow",
                  role: "Mariée — janvier 2025",
                  rating: 5,
                  verified: true,
                },
              ],
            },
          },
          {
            id: "ib-cta-wa",
            type: "whatsapp",
            props: {
              label: "Consultation gratuite — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour IVORY BRIDE — je me marie le [date] et je voudrais une consultation gratuite pour discuter de mon look. Mes inspirations : [description ou photo envoyée].",
            },
          },
          footer("ib-footer-home"),
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          nav("ib-nav-services"),
          {
            id: "ib-services-hero",
            type: "hero",
            props: {
              heading: "Nos formules",
              subheading: "De la consultation découverte au service clé en main complet — choisissez votre niveau d'accompagnement.",
              buttonLabel: "Prendre rendez-vous",
              buttonHref: "/contact",
              align: "left",
              background: "#2C2118",
            },
          },
          {
            id: "ib-packages",
            type: "products",
            props: {
              heading: "Packs stylisme bridal",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "Réserver ce pack",
              items: [
                {
                  name: "Consultation Découverte",
                  description: "90 min avec votre styliste — moodboard, vision du look, sélection couleurs et silhouette. Sans engagement.",
                  priceLabel: "25 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour IVORY BRIDE — je voudrais réserver une Consultation Découverte (25 000 FCFA). Date de mariage : [XX/XX/XXXX]. Je suis disponible pour un RDV [dates].",
                },
                {
                  name: "Pack Essentiel",
                  description: "Sélection et coordination de la robe + accessoires (voile, bijoux, chaussures). 2 essayages inclus.",
                  priceLabel: "150 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour IVORY BRIDE — je suis intéressée par le Pack Essentiel (150 000 FCFA). Date de mariage : [XX/XX/XXXX].",
                },
                {
                  name: "Pack Complet",
                  description: "Robe + accessoires + maquillage + coiffure (essai inclus) + coordination tenues famille. Notre best-seller.",
                  priceLabel: "350 000 FCFA",
                  badge: "BEST-SELLER",
                  imageUrl: "",
                  whatsappMessage: "Bonjour IVORY BRIDE — je voudrais le Pack Complet (350 000 FCFA). Date de mariage : [XX/XX/XXXX]. Puis-je avoir plus d'informations ?",
                },
                {
                  name: "Pack Prestige",
                  description: "Tout le Pack Complet + shooting d'essayage pro + coordination des dames d'honneur (jusqu'à 6 personnes) + day-of styling.",
                  priceLabel: "650 000 FCFA",
                  badge: "CLÉS EN MAIN",
                  imageUrl: "",
                  whatsappMessage: "Bonjour IVORY BRIDE — je suis intéressée par le Pack Prestige (650 000 FCFA). Date de mariage : [XX/XX/XXXX].",
                },
                {
                  name: "Location robe uniquement",
                  description: "Location de robe (collection propre ou partenaires créateurs) sur 48h. Caution + assurance.",
                  priceLabel: "À partir de 75 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour IVORY BRIDE — je cherche à louer une robe uniquement. Budget : [FCFA]. Date du mariage : [XX/XX]. Style souhaité :",
                },
                {
                  name: "Styling dames d'honneur",
                  description: "Coordination tenues et accessoires pour vos dames d'honneur — de 2 à 10 personnes. Devis sur demande.",
                  priceLabel: "De 15 000 FCFA / pers",
                  imageUrl: "",
                  whatsappMessage: "Bonjour IVORY BRIDE — je veux un styling coordonné pour mes dames d'honneur. Nombre : [X]. Date : [XX/XX]. Couleurs envisagées :",
                },
              ],
            },
          },
          {
            id: "ib-process",
            type: "features",
            props: {
              heading: "Notre processus",
              layout: "grid",
              items: [
                {
                  icon: "1",
                  title: "Consultation (M-6 à M-3)",
                  body: "Réunion WhatsApp ou en studio — vision du mariage, style, couleurs, budget. Moodboard remis en 48h.",
                },
                {
                  icon: "2",
                  title: "Sélection (M-3 à M-2)",
                  body: "Essayages de robes, sélection accessoires, décisions finales. 2 essayages inclus dans tous les packs.",
                },
                {
                  icon: "3",
                  title: "Finalisation (M-1)",
                  body: "Essai maquillage et coiffure, validation look complet, brief équipe jour J. Check-list partagée WhatsApp.",
                },
                {
                  icon: "4",
                  title: "Jour J",
                  body: "Styliste présente le matin, habillage, coiffure, maquillage. Disponible toute la cérémonie pour retouches.",
                },
              ],
            },
          },
          footer("ib-footer-services"),
        ],
      },
      {
        slug: "lookbook",
        title: "Lookbook",
        sections: [
          nav("ib-nav-lookbook"),
          {
            id: "ib-lookbook-hero",
            type: "hero",
            props: {
              heading: "Lookbook",
              subheading: "Nos mariées — styles traditionnels, contemporains et fusion depuis 2017.",
              buttonLabel: "Réserver une consultation",
              buttonHref: "/contact",
              align: "left",
              background: "#2C2118",
            },
          },
          {
            id: "ib-lookbook-categories",
            type: "category-tiles",
            props: {
              heading: "Explorer par style",
              columns: 4,
              items: [
                { label: "Traditionnel", href: "/lookbook#traditionnel", imageUrl: "", description: "Tiacé, basin, wax" },
                { label: "Contemporain", href: "/lookbook#contemporain", imageUrl: "", description: "Dentelle, bustier, sirène" },
                { label: "Fusion", href: "/lookbook#fusion", imageUrl: "", description: "Wax + dentelle, moderne-africain" },
                { label: "Dames d'honneur", href: "/lookbook#dames", imageUrl: "", description: "Tenues coordonnées" },
              ],
            },
          },
          {
            id: "ib-lookbook-gallery",
            type: "gallery",
            props: {
              heading: "Mariées IVORY BRIDE",
              layout: "masonry",
              columns: 3,
              instagramHandle: "ivorybride.dk",
              followLabel: "Suivre IVORY BRIDE",
              items: [
                { src: "", alt: "Mariée traditionnelle — tiacé blanc brodé" },
                { src: "", alt: "Look contemporain — robe sirène dentelle" },
                { src: "", alt: "Fusion wax bleu roi et blanc" },
                { src: "", alt: "Mariée + dames d'honneur — rose poudré" },
                { src: "", alt: "Détail bijoux — parure or 18 carats" },
                { src: "", alt: "Coiffure chignon sculptée + diadème" },
                { src: "", alt: "Couple au coucher de soleil" },
                { src: "", alt: "Maquillage glamour africain" },
                { src: "", alt: "Bouquet et henne main" },
                { src: "", alt: "Famille entière — couleurs coordonnées" },
                { src: "", alt: "Backstage essayage" },
                { src: "", alt: "Détail broderies robe" },
              ],
            },
          },
          footer("ib-footer-lookbook"),
        ],
      },
      {
        slug: "histoire",
        title: "Notre histoire",
        sections: [
          nav("ib-nav-histoire"),
          {
            id: "ib-histoire-hero",
            type: "hero",
            props: {
              heading: "Notre histoire",
              subheading: "IVORY BRIDE est née d'une conviction : les mariées africaines méritent un stylisme à la hauteur de leur beauté.",
              buttonLabel: "Réserver une consultation",
              buttonHref: "/contact",
              align: "center",
              background: "#2C2118",
            },
          },
          {
            id: "ib-histoire-split",
            type: "split",
            props: {
              heading: "Khady Sall &\nla beauté du jour J.",
              body: "Khady Sall a commencé par styler les mariées de son quartier à Dakar en 2017 — sans grands moyens, mais avec un regard juste et beaucoup d'amour pour le détail.\n\nAujourd'hui, IVORY BRIDE accompagne plus de 320 mariées par an au Sénégal, en Côte d'Ivoire, au Gabon et en France.\n\nSon principe : écouter avant de proposer. Chaque mariée arrive avec son histoire — IVORY BRIDE la met en beauté.",
              imageUrl: "",
              imageAlt: "Khady Sall, fondatrice IVORY BRIDE",
              imagePosition: "left",
              buttonLabel: "Travailler avec Khady",
              buttonHref: "/contact",
            },
          },
          footer("ib-footer-histoire"),
        ],
      },
      {
        slug: "contact",
        title: "Réserver",
        sections: [
          nav("ib-nav-contact"),
          {
            id: "ib-contact-section",
            type: "contact",
            props: {
              heading: "Rencontrons-nous",
              email: "hello@ivorybride.example",
              phone: "+221770000000",
              address: "IVORY BRIDE — Mermoz, Dakar · Sur rendez-vous uniquement",
            },
          },
          {
            id: "ib-contact-wa",
            type: "whatsapp",
            props: {
              label: "Consultation gratuite — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour IVORY BRIDE — je me marie le [date] et j'aimerais une consultation gratuite. Mon style envisagé : [traditionnel / contemporain / fusion]. Mon budget approximatif :",
            },
          },
          {
            id: "ib-contact-form",
            type: "form",
            props: {
              heading: "Demande de rendez-vous",
              subheading: "Répondez en moins de 48h.",
              buttonLabel: "Envoyer ma demande",
              successMessage: "Demande reçue — nous vous contactons sous 48h pour fixer votre consultation.",
              fields: [
                { id: "prenom", label: "Prénom", type: "text", required: true, placeholder: "Votre prénom", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "date_mariage", label: "Date du mariage", type: "text", required: true, placeholder: "ex: 15 juin 2025", options: [] },
                {
                  id: "pack",
                  label: "Formule souhaitée",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Consultation découverte", "Pack Essentiel", "Pack Complet", "Pack Prestige", "Location robe uniquement", "Je ne sais pas encore"],
                },
                { id: "budget", label: "Budget indicatif", type: "text", required: false, placeholder: "Ex: 300 000 FCFA", options: [] },
                {
                  id: "style",
                  label: "Style envisagé",
                  type: "textarea",
                  required: false,
                  placeholder: "Traditionnel, contemporain, fusion, couleurs — partagez vos inspirations...",
                  options: [],
                },
              ],
            },
          },
          footer("ib-footer-contact"),
        ],
      },
    ],
  };
}

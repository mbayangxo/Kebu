import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * BLANC NAIL STUDIO — monochrome editorial nail studio.
 * Monotone B&W pattern: oversized serif headings, masonry gallery of nail art,
 * booking via WhatsApp, services with FCFA pricing, aftercare education.
 * No quiz — appointment booking is the conversion goal.
 */

const NAV = [
  { label: "Services", href: "/services" },
  { label: "Réalisations", href: "/realisations" },
  { label: "Réserver", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "BLANC", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© BLANC NAIL STUDIO — Dakar. Rendez-vous uniquement via WhatsApp.",
      links: [
        { label: "Services", href: "/services" },
        { label: "Réalisations", href: "/realisations" },
        { label: "Réserver", href: "/contact" },
      ],
    },
  };
}

export function nailStudioWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "BLANC Nail Studio",
    theme: {
      primary: "#0D0D0D",
      accent: "#F5F5F5",
      background: "#FAFAFA",
      text: "#0D0D0D",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Inter",
      spacing: "airy",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "bw-editorial-nail",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("bn-nav-home"),
          {
            id: "bn-hero",
            type: "editorial-hero",
            props: {
              heading: "L'ART\nA BOUT\nDES DOIGTS.",
              subheading:
                "Studio nail art à Dakar — manucures sur-mesure, gel uv, nail art éditorial. Rendez-vous en 24h.",
              buttonLabel: "Réserver un RDV",
              buttonHref: "/contact",
              imageUrl: "",
              imageAlt: "BLANC Nail Studio Dakar",
              align: "left",
              overlayOpacity: 0.3,
              heightVh: 88,
              background: "#0D0D0D",
            },
          },
          {
            id: "bn-marquee",
            type: "marquee",
            props: {
              items: [
                "MANUCURE",
                "GEL UV",
                "NAIL ART",
                "FRENCH",
                "OMBRÉ",
                "NAIL EXTENSION",
                "SPA MAINS",
                "DAKAR",
              ],
              speed: 32,
              background: "#0D0D0D",
              color: "#FAFAFA",
              separator: "·",
            },
          },
          {
            id: "bn-gallery-home",
            type: "gallery",
            props: {
              heading: "Réalisations",
              layout: "masonry",
              columns: 3,
              instagramHandle: "blanc.nailstudio",
              followLabel: "Voir plus de créations",
              items: [
                { src: "", alt: "Nail art floral minimaliste" },
                { src: "", alt: "French manucure allongée" },
                { src: "", alt: "Ombré rose gold gel" },
                { src: "", alt: "Nail art géométrique noir" },
                { src: "", alt: "Extensions naturelles gel builder" },
                { src: "", alt: "Nail art abstrait éditorial" },
                { src: "", alt: "Vernis semi-permanent bordeaux" },
                { src: "", alt: "Nail art marbre blanc" },
                { src: "", alt: "Encapsulation fleur séchée" },
              ],
            },
          },
          {
            id: "bn-split-founder",
            type: "split",
            props: {
              heading: "UN STUDIO,\nUNE VISION.",
              body: "BLANC, c'est Aminata Touré — nail artist formée à Abidjan et Paris. Spécialisée dans les créations sur-mesure pour mariages, shooting photo et événements.\n\nChaque set est unique. Chaque cliente repart avec quelque chose qu'elle n'a vu nulle part ailleurs.",
              imageUrl: "",
              imageAlt: "Aminata Touré, fondatrice BLANC",
              imagePosition: "right",
              buttonLabel: "Réserver avec Aminata",
              buttonHref: "/contact",
            },
          },
          {
            id: "bn-testimonials",
            type: "testimonials",
            props: {
              heading: "Ce qu'elles disent",
              items: [
                {
                  quote: "Le nail art le plus propre que j'ai eu à Dakar. Aminata comprend exactement ce qu'on veut. Mon set de mariage était parfait.",
                  name: "Rokhaya Diallo",
                  role: "Mariée, oct. 2025",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Hygiène impeccable, gel qui tient 4 semaines sans casse. Je ne vais plus nulle part ailleurs.",
                  name: "Coumba Niang",
                  role: "Cliente régulière",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "J'ai eu mon set pour un shooting mode — Aminata a reproduit exactement le moodboard. Résultat bluffant.",
                  name: "Khady Faye",
                  role: "Modèle & influenceuse",
                  rating: 5,
                  verified: true,
                },
              ],
            },
          },
          {
            id: "bn-cta-wa",
            type: "whatsapp",
            props: {
              label: "Réserver un rendez-vous",
              phone: "+221770000000",
              message: "Bonjour BLANC Nail Studio — je voudrais réserver un rendez-vous. Quels sont vos créneaux disponibles cette semaine ?",
            },
          },
          footer("bn-footer-home"),
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          nav("bn-nav-services"),
          {
            id: "bn-services-hero",
            type: "hero",
            props: {
              heading: "Nos services",
              subheading: "Chaque prestation inclut : bilan des ongles, nettoyage, soin, finition. Durée estimée honnêtement.",
              buttonLabel: "Réserver",
              buttonHref: "/contact",
              align: "left",
              background: "#0D0D0D",
            },
          },
          {
            id: "bn-services-list",
            type: "products",
            props: {
              heading: "Prestations",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "Réserver ce service",
              items: [
                {
                  name: "Manucure soin",
                  description: "Lime, repousse cuticules, soin hydratant, vernis simple ou french. Durée 45 min.",
                  priceLabel: "6 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour BLANC — je voudrais réserver une manucure soin (6 000 FCFA). Quelles sont vos disponibilités ?",
                },
                {
                  name: "Pose gel UV complète",
                  description: "Préparation ongles, pose gel couleur ou french, finition brillante ou mate. Tient 3–4 semaines. Durée 1h30.",
                  priceLabel: "18 000 FCFA",
                  badge: "POPULAIRE",
                  imageUrl: "",
                  whatsappMessage: "Bonjour BLANC — je voudrais une pose gel UV complète (18 000 FCFA). Disponible cette semaine ?",
                },
                {
                  name: "Nail art sur-mesure",
                  description: "Création unique — inspirations Pinterest, photos ou moodboard envoyé par WhatsApp. Durée 2h–3h selon complexité.",
                  priceLabel: "À partir de 25 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour BLANC — je veux un nail art sur-mesure. Je vous envoie mon inspiration. Quel est le tarif pour ce design ?",
                },
                {
                  name: "Extensions gel builder",
                  description: "Allongement naturel ou dramatique, gel rose ou lait. Idéal pour ongles cassés ou courts. Durée 2h.",
                  priceLabel: "22 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour BLANC — je voudrais des extensions gel builder (22 000 FCFA). Quand êtes-vous disponible ?",
                },
                {
                  name: "Remplissage gel 3 semaines",
                  description: "Retouche à la pousse, réparation si cassé, repose couleur. Prévoir toutes les 3 semaines. Durée 1h.",
                  priceLabel: "10 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour BLANC — je voudrais un remplissage gel (10 000 FCFA). Mes dernière pose date de 3 semaines.",
                },
                {
                  name: "Pack mariage ou événement",
                  description: "Manucure + pédicure + nail art coordonné. RDV la veille ou le jour J. Consultation gratuite 2 semaines avant.",
                  priceLabel: "À partir de 45 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour BLANC — je me marie / j'ai un événement et je voudrais un pack spécial. Date : [XX/XX]. Pouvons-nous discuter ?",
                },
              ],
            },
          },
          {
            id: "bn-aftercare",
            type: "features",
            props: {
              heading: "Aftercare — protégez votre pose",
              subheading: "Un bon aftercare double la durée de votre gel. Ces conseils viennent avec chaque prestation.",
              layout: "grid",
              items: [
                {
                  icon: "🧴",
                  title: "Hydratez les cuticules",
                  body: "Appliquez de l'huile de cuticules chaque soir. Sèche-la pas au soleil — ça craquelle le gel.",
                },
                {
                  icon: "🧤",
                  title: "Protégez-vous en cuisine",
                  body: "Portez des gants pour la vaisselle, les produits ménagers, et le chlore piscine.",
                },
                {
                  icon: "⛔",
                  title: "Ne grattez jamais",
                  body: "Un gel gratté arrache la couche kératine. Retournez en studio pour un retrait sécurisé gratuit.",
                },
                {
                  icon: "🔔",
                  title: "Rappel 3 semaines",
                  body: "On vous envoie un rappel WhatsApp pour votre remplissage. Répondez-y pour bloquer votre créneau.",
                },
              ],
            },
          },
          footer("bn-footer-services"),
        ],
      },
      {
        slug: "realisations",
        title: "Réalisations",
        sections: [
          nav("bn-nav-realisations"),
          {
            id: "bn-realisations-hero",
            type: "hero",
            props: {
              heading: "Portfolio",
              subheading: "Nail art · Gel UV · Extensions — réalisations récentes de BLANC Studio.",
              buttonLabel: "Réserver ce style",
              buttonHref: "/contact",
              align: "left",
              background: "#0D0D0D",
            },
          },
          {
            id: "bn-realisations-categories",
            type: "category-tiles",
            props: {
              heading: "Explorer par style",
              columns: 4,
              items: [
                { label: "Minimaliste", href: "/realisations#minimaliste", imageUrl: "", description: "Lignes nettes, couleurs neutres" },
                { label: "Nail art", href: "/realisations#nailart", imageUrl: "", description: "Motifs, illustrations, effets" },
                { label: "Gel couleur", href: "/realisations#gel", imageUrl: "", description: "Uni, ombré, french" },
                { label: "Événements", href: "/realisations#events", imageUrl: "", description: "Mariage, soirée, shooting" },
              ],
            },
          },
          {
            id: "bn-realisations-gallery",
            type: "gallery",
            props: {
              heading: "Tous les sets",
              layout: "masonry",
              columns: 3,
              instagramHandle: "blanc.nailstudio",
              followLabel: "Suivre BLANC",
              items: [
                { src: "", alt: "Set minimaliste nude" },
                { src: "", alt: "French allongée gel" },
                { src: "", alt: "Nail art floral pastel" },
                { src: "", alt: "Ombré lilas" },
                { src: "", alt: "Nail art éditorial noir" },
                { src: "", alt: "Encapsulation paillettes" },
                { src: "", alt: "Set mariage blanc ivoire" },
                { src: "", alt: "Nail art géométrique doré" },
                { src: "", alt: "Gel rouge vif" },
                { src: "", alt: "Extensions stiletto noires" },
                { src: "", alt: "Nail art marbre gris" },
                { src: "", alt: "Set shooting mode" },
              ],
            },
          },
          footer("bn-footer-realisations"),
        ],
      },
      {
        slug: "contact",
        title: "Réserver",
        sections: [
          nav("bn-nav-contact"),
          {
            id: "bn-contact-section",
            type: "contact",
            props: {
              heading: "Réserver un rendez-vous",
              email: "",
              phone: "+221770000000",
              address: "BLANC Nail Studio — Plateau, Dakar · Sur rendez-vous uniquement",
            },
          },
          {
            id: "bn-contact-wa",
            type: "whatsapp",
            props: {
              label: "Réserver via WhatsApp",
              phone: "+221770000000",
              message: "Bonjour BLANC Nail Studio — je voudrais réserver. Prestation souhaitée : [manucure / gel / nail art]. Date souhaitée : [XX/XX]. Je suis disponible à : [heure].",
            },
          },
          {
            id: "bn-booking-faq",
            type: "faq",
            props: {
              heading: "Avant votre RDV",
              items: [
                {
                  question: "Comment réserver ?",
                  answer: "Uniquement via WhatsApp. Envoyez votre prestation souhaitée, date et heure. Confirmation en moins de 2h.",
                },
                {
                  question: "Faut-il payer à l'avance ?",
                  answer: "Un acompte de 3 000 FCFA est demandé par Wave ou Orange Money pour confirmer le RDV. Déductible du total.",
                },
                {
                  question: "Et si je dois annuler ?",
                  answer: "Annulation gratuite jusqu'à 24h avant. Après ce délai, l'acompte n'est pas remboursable.",
                },
                {
                  question: "Puis-je apporter des photos d'inspiration ?",
                  answer: "Oui — envoyez-les par WhatsApp au moins la veille. On vous confirme la faisabilité et l'estimation de durée.",
                },
                {
                  question: "Acceptez-vous les groupes (EVG, EVJF) ?",
                  answer: "Oui, jusqu'à 6 personnes sur réservation 1 semaine à l'avance. Tarif groupé disponible.",
                },
              ],
            },
          },
          footer("bn-footer-contact"),
        ],
      },
    ],
  };
}

import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * SOMA STUDIO — yoga & wellness studio.
 * Soft sage / warm white aesthetic, wellness-first, flow-based navigation.
 * Classes, retreats, private sessions, online sessions, teacher bios.
 * No quiz — intuitive class discovery, WhatsApp booking.
 */

const NAV = [
  { label: "Cours", href: "/cours" },
  { label: "Retraites", href: "/retraites" },
  { label: "Coachs", href: "/coachs" },
  { label: "Réserver", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "SOMA STUDIO", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© SOMA STUDIO — Dakar. Yoga, méditation, bien-être. Ouvert 7 jours sur 7.",
      links: [
        { label: "Cours", href: "/cours" },
        { label: "Retraites", href: "/retraites" },
        { label: "Réserver", href: "/contact" },
      ],
    },
  };
}

export function yogaWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "SOMA STUDIO",
    theme: {
      primary: "#2D3A2E",
      accent: "#8FAF82",
      background: "#F7F4EF",
      text: "#2D3A2E",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Lato",
      spacing: "airy",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "soft-wellness-studio",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("ss-nav-home"),
          {
            id: "ss-hero",
            type: "split",
            props: {
              heading: "Trouvez\nvotre centre.",
              body: "SOMA STUDIO — espace yoga et bien-être à Dakar. Cours collectifs, sessions privées, retraites week-end.\n\nOuvert 7 jours sur 7 · 6h–21h · Niveaux tous.",
              imageUrl: "",
              imageAlt: "Cours de yoga SOMA STUDIO Dakar",
              imagePosition: "right",
              buttonLabel: "Voir les cours",
              buttonHref: "/cours",
            },
          },
          {
            id: "ss-disciplines",
            type: "features",
            props: {
              heading: "Nos pratiques",
              layout: "grid",
              items: [
                {
                  icon: "🧘",
                  title: "Hatha yoga",
                  body: "Postures classiques, respiration, alignement. Idéal pour débutants et pratiquants réguliers.",
                },
                {
                  icon: "🌊",
                  title: "Vinyasa flow",
                  body: "Enchaînements dynamiques synchronisés avec la respiration. Intermédiaire à avancé.",
                },
                {
                  icon: "🌙",
                  title: "Yin yoga",
                  body: "Postures tenues 3–5 min, relâchement profond des tissus conjonctifs. Parfait le soir.",
                },
                {
                  icon: "🌬️",
                  title: "Pranayama & méditation",
                  body: "Techniques de respiration, méditation guidée, cohérence cardiaque. Tous niveaux.",
                },
                {
                  icon: "🏋️",
                  title: "Yoga prénatal",
                  body: "Adapté à chaque trimestre. Renforcement, respiration, préparation à l'accouchement.",
                },
                {
                  icon: "👶",
                  title: "Yoga mère-bébé",
                  body: "0–12 mois. Éveil sensoriel pour bébé, récupération post-partum pour maman.",
                },
              ],
            },
          },
          {
            id: "ss-schedule-preview",
            type: "events",
            props: {
              heading: "Cours cette semaine",
              items: [
                {
                  title: "Hatha doux — débutants",
                  date: "Lun, Mer, Ven",
                  time: "07h00–08h15",
                  location: "Salle principale",
                  description: "Idéal pour commencer la journée. Tapis fournis. Max 12 participants.",
                  price: "3 500 FCFA",
                  href: "/contact",
                },
                {
                  title: "Vinyasa flow — intermédiaire",
                  date: "Mar, Jeu, Sam",
                  time: "06h30–07h45",
                  location: "Salle principale",
                  description: "Session matinale dynamique. Apportez votre tapis si possible.",
                  price: "4 000 FCFA",
                  href: "/contact",
                },
                {
                  title: "Yin relax — soir",
                  date: "Lun, Mer, Ven",
                  time: "19h30–20h45",
                  location: "Salle calme",
                  description: "Décompression en fin de journée. Bougies, son basse fréquence.",
                  price: "3 500 FCFA",
                  href: "/contact",
                },
                {
                  title: "Méditation guidée",
                  date: "Sam & Dim",
                  time: "08h00–09h00",
                  location: "Terrasse",
                  description: "Technique Vipassana simplifiée. Durée 60 min. Coussin fourni.",
                  price: "2 500 FCFA",
                  href: "/contact",
                },
              ],
            },
          },
          {
            id: "ss-gallery",
            type: "gallery",
            props: {
              heading: "L'espace SOMA",
              layout: "grid",
              columns: 3,
              instagramHandle: "somastudio.dk",
              followLabel: "Suivre notre pratique",
              items: [
                { src: "", alt: "Salle de yoga lumière naturelle" },
                { src: "", alt: "Cours vinyasa — groupe" },
                { src: "", alt: "Terrasse méditation" },
                { src: "", alt: "Espace détente tisanerie" },
                { src: "", alt: "Cours prénatal" },
                { src: "", alt: "Retraite week-end" },
              ],
            },
          },
          {
            id: "ss-testimonials",
            type: "testimonials",
            props: {
              heading: "Ce qu'ils vivent ici",
              items: [
                {
                  quote: "SOMA a changé mon rapport au stress. En 2 mois de Yin yoga le soir, je dors comme jamais. L'équipe est bienveillante.",
                  name: "Fatou Sall",
                  role: "Practicante depuis 6 mois",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Le cours prénatal était exactement ce dont j'avais besoin. Rokhaya est patiente, pédagogue, et ça m'a préparée sereinement.",
                  name: "Mariama Diaw",
                  role: "Maman, 8 mois de grossesse",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "J'ai fait la retraite week-end Sine-Saloum. Expérience transformatrice. Je reviens pour la prochaine.",
                  name: "Ibrahima Kouyaté",
                  role: "Participant retraite",
                  rating: 5,
                  verified: true,
                },
              ],
            },
          },
          {
            id: "ss-cta-wa",
            type: "whatsapp",
            props: {
              label: "Réserver un cours — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour SOMA STUDIO — je voudrais réserver un cours. Pratique souhaitée : [hatha / vinyasa / yin / méditation]. Je suis [débutant / intermédiaire / avancé].",
            },
          },
          footer("ss-footer-home"),
        ],
      },
      {
        slug: "cours",
        title: "Cours & tarifs",
        sections: [
          nav("ss-nav-cours"),
          {
            id: "ss-cours-hero",
            type: "hero",
            props: {
              heading: "Cours & tarifs",
              subheading: "Cours collectifs, sessions privées, et abonnements — paiement Wave ou Orange Money.",
              buttonLabel: "Réserver maintenant",
              buttonHref: "/contact",
              align: "left",
              background: "#2D3A2E",
            },
          },
          {
            id: "ss-packs",
            type: "products",
            props: {
              heading: "Formules",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "S'inscrire — WhatsApp",
              items: [
                {
                  name: "Cours à l'unité",
                  description: "Accès 1 cours au choix (hatha, vinyasa, yin, méditation). Valable 3 mois.",
                  priceLabel: "3 500–4 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SOMA — je veux réserver un cours à l'unité. Pratique : [hatha / vinyasa / yin / méditation]. Date souhaitée :",
                },
                {
                  name: "Pack 10 cours",
                  description: "10 crédits cours utilisables sur toutes les disciplines sur 3 mois. Économie de 20%.",
                  priceLabel: "28 000 FCFA",
                  valuePriceLabel: "35 000 FCFA",
                  badge: "POPULAIRE",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SOMA — je veux le Pack 10 cours (28 000 FCFA). Paiement Wave ou Orange Money.",
                },
                {
                  name: "Abonnement illimité",
                  description: "Cours collectifs illimités, accès 7j/7. Priorité de réservation, séance découverte offerte.",
                  priceLabel: "45 000 FCFA/mois",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SOMA — je veux l'abonnement illimité (45 000 FCFA/mois). Comment souscrire ?",
                },
                {
                  name: "Session privée",
                  description: "1h de coaching individuel avec un enseignant certifié. Programme adapté à vos objectifs.",
                  priceLabel: "20 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SOMA — je veux une session privée (20 000 FCFA). Disponibilités souhaitées :",
                },
                {
                  name: "Duo — 2 amies",
                  description: "Session privée pour 2 personnes. Même économie, double motivation.",
                  priceLabel: "30 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SOMA — je veux une session duo (30 000 FCFA pour 2 personnes). Disponibilités souhaitées :",
                },
                {
                  name: "Cours en ligne — live",
                  description: "Session Zoom interactive avec un enseignant en temps réel. 45 min. Lien envoyé par WhatsApp.",
                  priceLabel: "5 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour SOMA — je veux réserver un cours en ligne live (5 000 FCFA). Pratique et date souhaitée :",
                },
              ],
            },
          },
          {
            id: "ss-cours-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Faut-il apporter un tapis ?",
                  answer: "Nos tapis sont disponibles en prêt gratuit. Vous pouvez apporter le vôtre si vous préférez. Désinfection fournie.",
                },
                {
                  question: "Je suis débutante, quel cours choisir ?",
                  answer: "Le Hatha doux ou le Yin yoga sont parfaits pour commencer. Envoyez-nous un message et on vous oriente selon vos objectifs.",
                },
                {
                  question: "Comment annuler ma réservation ?",
                  answer: "Annulez par WhatsApp avant 6h le jour du cours. Votre crédit est conservé pour la prochaine session.",
                },
                {
                  question: "Proposez-vous des cours pour enfants ?",
                  answer: "Oui — yoga enfants (5–12 ans) le samedi à 10h. 2 000 FCFA / cours. 8 enfants maximum.",
                },
              ],
              contactPanel: {
                heading: "Essayez gratuitement",
                body: "Premier cours offert pour les nouveaux inscrits. Dites-le lors de votre réservation WhatsApp.",
                buttonLabel: "Réserver mon premier cours gratuit",
                buttonHref: "/contact",
                background: "#8FAF82",
              },
            },
          },
          footer("ss-footer-cours"),
        ],
      },
      {
        slug: "retraites",
        title: "Retraites",
        sections: [
          nav("ss-nav-retraites"),
          {
            id: "ss-retraites-hero",
            type: "hero",
            props: {
              heading: "Retraites bien-être",
              subheading: "Sine-Saloum, Cap Skirring, Saly — week-ends et séjours immersifs en pleine nature africaine.",
              buttonLabel: "Voir les prochaines dates",
              buttonHref: "#retraites-events",
              align: "left",
              background: "#2D3A2E",
            },
          },
          {
            id: "ss-retraites-events",
            type: "events",
            props: {
              heading: "Retraites à venir",
              items: [
                {
                  title: "Retraite Sine-Saloum — Week-end",
                  date: "21–23 mars 2025",
                  time: "Départ vendredi 15h",
                  location: "Sine-Saloum, Sénégal",
                  description: "2 nuits en lodge écologique, 6 sessions yoga, méditation lever de soleil, repas végétariens, pirogue au coucher de soleil.",
                  price: "185 000 FCFA tout inclus",
                  href: "/contact",
                },
                {
                  title: "Retraite Cap Skirring — 5 jours",
                  date: "15–20 avril 2025",
                  time: "Départ lundi matin",
                  location: "Cap Skirring, Casamance",
                  description: "5 jours immersifs — yoga 2×/jour, surf option, sound healing, alimentation végétale locale. Max 12 participants.",
                  price: "380 000 FCFA tout inclus",
                  href: "/contact",
                },
                {
                  title: "Retraite Saly — 3 jours",
                  date: "7–9 juin 2025",
                  time: "Départ samedi matin",
                  location: "Saly-Portudal, Sénégal",
                  description: "Week-end plage — yoga matinal face mer, méditation coucher de soleil, spa, repas en groupe. Accessible en 1h30.",
                  price: "120 000 FCFA tout inclus",
                  href: "/contact",
                },
              ],
            },
          },
          {
            id: "ss-retraites-gallery",
            type: "gallery",
            props: {
              heading: "Nos retraites en images",
              layout: "featured",
              columns: 3,
              items: [
                { src: "", alt: "Yoga au lever du soleil — Sine-Saloum" },
                { src: "", alt: "Méditation plage — Cap Skirring" },
                { src: "", alt: "Repas végétarien en groupe" },
                { src: "", alt: "Lodge écologique" },
                { src: "", alt: "Pirogue coucher de soleil" },
                { src: "", alt: "Session sound healing" },
              ],
            },
          },
          {
            id: "ss-retraites-cta",
            type: "whatsapp",
            props: {
              label: "Réserver une retraite — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour SOMA STUDIO — je suis intéressé(e) par une retraite. Destination / date souhaitée : [retraite / date]. Nombre de participants : [X].",
            },
          },
          footer("ss-footer-retraites"),
        ],
      },
      {
        slug: "coachs",
        title: "Nos enseignants",
        sections: [
          nav("ss-nav-coachs"),
          {
            id: "ss-coachs-hero",
            type: "hero",
            props: {
              heading: "Nos enseignants",
              subheading: "Certifiés Yoga Alliance 200h–500h, formés en Inde, au Maroc et à Dakar.",
              buttonLabel: "Réserver avec un enseignant",
              buttonHref: "/contact",
              align: "left",
              background: "#2D3A2E",
            },
          },
          {
            id: "ss-coachs-list",
            type: "features",
            props: {
              heading: "L'équipe SOMA",
              layout: "grid",
              items: [
                {
                  title: "Rokhaya Fall — Fondatrice & directrice",
                  body: "500h RYT · Rishikesh, Inde · 9 ans de pratique · spécialité hatha, prénatal, yoga thérapeutique.",
                  imageUrl: "",
                  icon: "🧘",
                },
                {
                  title: "Abdoulaye Sow — Vinyasa & force",
                  body: "300h RYT · Ashtanga Mysore-style · pratique depuis 2016 · sessions masculines et mixtes.",
                  imageUrl: "",
                  icon: "🌊",
                },
                {
                  title: "Mariama Kouyaté — Yin & méditation",
                  body: "200h RYT · Reiki niveau 2 · sound healing bols tibétains · ateliers collectifs et privés.",
                  imageUrl: "",
                  icon: "🌙",
                },
                {
                  title: "Adama Diallo — Enfants & famille",
                  body: "Yoga enfants 5–14 ans · yoga famille parent-enfant · ludique et bienveillant · 4 ans d'expérience.",
                  imageUrl: "",
                  icon: "👨‍👩‍👧",
                },
              ],
            },
          },
          footer("ss-footer-coachs"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("ss-nav-contact"),
          {
            id: "ss-contact-section",
            type: "contact",
            props: {
              heading: "Venez pratiquer",
              email: "hello@somastudio.example",
              phone: "+221770000000",
              address: "SOMA STUDIO — Mermoz, Dakar · Ouvert 7j/7 · 6h00–21h00",
            },
          },
          {
            id: "ss-contact-wa",
            type: "whatsapp",
            props: {
              label: "Réserver ou poser une question",
              phone: "+221770000000",
              message: "Bonjour SOMA STUDIO — je voudrais [réserver un cours / une session privée / une retraite / poser une question]. Détails :",
            },
          },
          footer("ss-footer-contact"),
        ],
      },
    ],
  };
}

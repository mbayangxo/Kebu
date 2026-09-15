import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Coaching — West African life/business/digital coach.
 * Course cards, enrollment CTA, mobile money per cohort, testimonials.
 * IA: Home · Programmes · À propos · Témoignages · Inscription
 */

const NAV = [
  { label: "Programmes", href: "/programmes" },
  { label: "À propos", href: "/a-propos" },
  { label: "Témoignages", href: "/temoignages" },
  { label: "S'inscrire", href: "/inscription" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "Coach", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Coach — formations, accompagnement, résultats concrets.",
      links: [
        { label: "Programmes", href: "/programmes" },
        { label: "S'inscrire", href: "/inscription" },
      ],
    },
  };
}

export function coachingWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Coaching",
    theme: {
      primary: "#0F2D40",
      accent: "#00A896",
      background: "#F8FAFB",
      text: "#0F2D40",
      fontDisplay: "Nunito",
      fontBody: "Open Sans",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "teal-professional",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("coach-nav-home"),
          {
            id: "coach-hero",
            type: "hero",
            props: {
              heading: "Transformez votre vie en 90 jours",
              subheading:
                "Coaching business, développement personnel, marketing digital — programmes adaptés à l'Afrique, paiement en plusieurs fois.",
              buttonLabel: "Voir les programmes",
              buttonHref: "/programmes",
              align: "left",
              background: "#0F2D40",
            },
          },
          {
            id: "coach-results",
            type: "features",
            props: {
              heading: "Ce que vous allez accomplir",
              items: [
                {
                  title: "Lancer votre business",
                  body: "De l'idée à la première vente — plan d'action, positionnement, premiers clients.",
                },
                {
                  title: "Booster vos revenus",
                  body: "Stratégies concrètes pour augmenter vos revenus en 60 jours.",
                },
                {
                  title: "Maîtriser le digital",
                  body: "WhatsApp Business, réseaux sociaux, publicité — outils pratiques, sans jargon.",
                },
              ],
            },
          },
          {
            id: "coach-programs-preview",
            type: "features",
            props: {
              heading: "Programmes phares",
              items: [
                {
                  title: "Business Launch 30J",
                  body: "Lancez votre activité en 30 jours — suivi individuel inclus. Cohorte : 10 personnes max.",
                },
                {
                  title: "Digital Boost 60J",
                  body: "Maîtrisez le marketing digital — WhatsApp, Instagram, publicités. 15 personnes max.",
                },
                {
                  title: "VIP 1-on-1",
                  body: "Accompagnement personnalisé — 12 sessions de 60 min, plan sur mesure.",
                },
              ],
            },
          },
          {
            id: "coach-testimonials-home",
            type: "testimonials",
            props: {
              heading: "Résultats réels",
              items: [
                {
                  quote: "En 30 jours j'ai lancé ma boutique et fait mes 3 premières ventes. Incroyable !",
                  name: "Aïssatou B.",
                  role: "Participante Business Launch",
                },
                {
                  quote: "Maintenant je maîtrise WhatsApp Business et mes clients reviennent. Merci !",
                  name: "Mamadou F.",
                  role: "Participant Digital Boost",
                },
              ],
            },
          },
          {
            id: "coach-cta",
            type: "whatsapp",
            props: {
              label: "Discutons de votre projet sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je suis intéressé(e) par votre programme de coaching. Pouvez-vous m'en dire plus ?",
            },
          },
          footer("coach-footer-home"),
        ],
      },
      {
        slug: "programmes",
        title: "Programmes",
        sections: [
          nav("coach-nav-programmes"),
          {
            id: "coach-prog-hero",
            type: "hero",
            props: {
              heading: "Nos programmes",
              subheading: "Formations en cohorte ou accompagnement individuel — paiement Wave / Orange Money.",
              buttonLabel: "S'inscrire",
              buttonHref: "/inscription",
              align: "center",
              background: "#0F2D40",
            },
          },
          {
            id: "coach-prog-list",
            type: "features",
            props: {
              heading: "Choisissez votre programme",
              items: [
                {
                  title: "Business Launch 30J — 75 000 FCFA",
                  body: "30 jours intensifs : idée → business plan → premiers clients. Cohorte de 10 personnes. Prochain départ : le 1er du mois.",
                },
                {
                  title: "Digital Boost 60J — 50 000 FCFA",
                  body: "60 jours : Instagram, WhatsApp Business, publicités Facebook. 15 participants. Démarrage mensuel.",
                },
                {
                  title: "Développement personnel 45J — 35 000 FCFA",
                  body: "45 jours pour construire des habitudes solides, gérer le temps, dépasser les blocages.",
                },
                {
                  title: "VIP 1-on-1 — sur devis",
                  body: "12 sessions individuelles de 60 min — plan entièrement sur mesure. Places très limitées.",
                },
              ],
            },
          },
          {
            id: "coach-prog-paiement",
            type: "text",
            props: {
              heading: "Paiement flexible",
              body: "Tous les programmes acceptent le paiement en 2 fois : 50% à l'inscription, 50% avant le début. Modes de paiement : Wave, Orange Money, virement — à adapter selon votre activité.",
            },
          },
          footer("coach-footer-programmes"),
        ],
      },
      {
        slug: "a-propos",
        title: "À propos",
        sections: [
          nav("coach-nav-about"),
          {
            id: "coach-about-hero",
            type: "hero",
            props: {
              heading: "Qui suis-je ?",
              subheading: "Coach certifié, entrepreneur, formateur — basé en Afrique de l'Ouest.",
              buttonLabel: "Travaillons ensemble",
              buttonHref: "/inscription",
              align: "left",
              background: "#0F2D40",
            },
          },
          {
            id: "coach-about-body",
            type: "text",
            props: {
              heading: "Mon parcours",
              body: "Racontez votre histoire ici — pourquoi vous avez commencé le coaching, vos certifications, vos résultats. Soyez concret : combien de personnes accompagnées, quels secteurs, quels pays. Les visiteurs ont besoin de vous faire confiance avant de s'inscrire.",
            },
          },
          {
            id: "coach-about-gallery",
            type: "gallery",
            props: {
              heading: "En formation",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Session de coaching" },
                { src: "", alt: "Atelier groupe" },
                { src: "", alt: "Conférence" },
              ],
            },
          },
          footer("coach-footer-about"),
        ],
      },
      {
        slug: "temoignages",
        title: "Témoignages",
        sections: [
          nav("coach-nav-temoignages"),
          {
            id: "coach-temoignages-hero",
            type: "hero",
            props: {
              heading: "Résultats de nos participants",
              subheading: "Des transformations réelles — pas des promesses.",
              buttonLabel: "Rejoindre la prochaine cohorte",
              buttonHref: "/inscription",
              align: "center",
              background: "#0F2D40",
            },
          },
          {
            id: "coach-temoignages-list",
            type: "testimonials",
            props: {
              heading: "",
              items: [
                {
                  quote: "Avant ce programme je n'avais aucun système. Maintenant j'ai 15 clients réguliers.",
                  name: "Rokhaya S.",
                  role: "Business Launch — promo mars",
                },
                {
                  quote: "J'ai doublé mon chiffre d'affaires en 60 jours grâce au Digital Boost.",
                  name: "Ibrahima D.",
                  role: "Digital Boost — promo février",
                },
                {
                  quote: "Le suivi individuel a changé ma façon de travailler. Résultats en moins d'un mois.",
                  name: "Ndeye F.",
                  role: "Programme VIP 1-on-1",
                },
              ],
            },
          },
          footer("coach-footer-temoignages"),
        ],
      },
      {
        slug: "inscription",
        title: "S'inscrire",
        sections: [
          nav("coach-nav-inscription"),
          {
            id: "coach-inscription-hero",
            type: "hero",
            props: {
              heading: "Réservez votre place",
              subheading:
                "Places limitées par cohorte — inscrivez-vous maintenant pour garantir votre place.",
              buttonLabel: "WhatsApp",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#0F2D40",
            },
          },
          {
            id: "coach-inscription-form",
            type: "form",
            props: {
              heading: "Formulaire d'inscription",
              subheading: "Remplissez le formulaire — nous vous contactons sous 24 h pour confirmer votre place.",
              buttonLabel: "Envoyer l'inscription",
              successMessage: "Inscription reçue — nous vous contactons sous 24 h.",
              fields: [
                { id: "nom", label: "Prénom et nom", type: "text", required: true, placeholder: "", options: [] },
                {
                  id: "telephone",
                  label: "WhatsApp",
                  type: "phone",
                  required: true,
                  placeholder: "+221…",
                  options: [],
                },
                {
                  id: "email",
                  label: "Email",
                  type: "email",
                  required: false,
                  placeholder: "votre@email.com",
                  options: [],
                },
                {
                  id: "programme",
                  label: "Programme souhaité",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: [
                    "Business Launch 30J",
                    "Digital Boost 60J",
                    "Développement personnel 45J",
                    "VIP 1-on-1",
                  ],
                },
                {
                  id: "objectif",
                  label: "Votre objectif principal",
                  type: "textarea",
                  required: false,
                  placeholder: "Lancer ma boutique de mode, doubler mes ventes, trouver mes premiers clients…",
                  options: [],
                },
              ],
            },
          },
          {
            id: "coach-inscription-wa",
            type: "whatsapp",
            props: {
              label: "S'inscrire sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais m'inscrire à un de vos programmes de coaching.",
            },
          },
          footer("coach-footer-inscription"),
        ],
      },
    ],
  };
}

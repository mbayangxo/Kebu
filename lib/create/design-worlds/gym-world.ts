import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * FORGE GYM — dark neon-green fitness club, Barliner pattern.
 * Aggressive, results-first. Stats strip, class schedule, trainer roster, memberships.
 * No quiz — straight to action.
 */

const NAV = [
  { label: "Séances", href: "/seances" },
  { label: "Coachs", href: "/coachs" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "FORGE GYM", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© FORGE GYM — Dakar, Sénégal. Résultats garantis ou remboursés.",
      links: [
        { label: "Séances", href: "/seances" },
        { label: "Coachs", href: "/coachs" },
        { label: "Tarifs", href: "/tarifs" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function gymWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "FORGE GYM",
    theme: {
      primary: "#0A0A0A",
      accent: "#AAFF00",
      background: "#111111",
      text: "#F0F0F0",
      fontDisplay: "Bebas Neue",
      fontBody: "Inter",
      spacing: "compact",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      aestheticId: "dark-neon-gym",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("fg-nav-home"),
          {
            id: "fg-announce",
            type: "announcement-bar",
            props: {
              text: "🔥 INSCRIPTIONS OUVERTES — 1er mois à 15 000 FCFA au lieu de 25 000 FCFA",
              background: "#AAFF00",
              color: "#0A0A0A",
            },
          },
          {
            id: "fg-hero",
            type: "editorial-hero",
            props: {
              heading: "FORGE\nTON\nCORPS.",
              subheading:
                "La salle de sport la plus sérieuse de Dakar. Équipement professionnel, coachs certifiés, résultats mesurables. Pas de distractions.",
              buttonLabel: "Démarrer maintenant",
              buttonHref: "/tarifs",
              imageUrl: "",
              imageAlt: "Salle FORGE GYM Dakar",
              align: "left",
              overlayOpacity: 0.7,
              heightVh: 95,
              background: "#0A0A0A",
            },
          },
          {
            id: "fg-stats",
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "850", suffix: "+", label: "Membres actifs" },
                { value: "12", label: "Coachs certifiés" },
                { value: "4", label: "Ans d'expérience" },
                { value: "97", suffix: "%", label: "Taux de satisfaction" },
              ],
              background: "#AAFF00",
            },
          },
          {
            id: "fg-marquee",
            type: "marquee",
            props: {
              items: [
                "MUSCULATION",
                "CROSSFIT",
                "CARDIO",
                "BOXE",
                "YOGA",
                "COACHING PERSO",
                "NUTRITION",
                "RÉSULTATS",
              ],
              speed: 40,
              background: "#0A0A0A",
              color: "#AAFF00",
              separator: "//",
            },
          },
          {
            id: "fg-disciplines",
            type: "features",
            props: {
              heading: "Disciplines",
              subheading: "CE QUE VOUS VOULEZ, ON LE FAIT.",
              layout: "grid",
              background: "#161616",
              items: [
                {
                  icon: "💪",
                  title: "Musculation",
                  body: "Bancs, câbles, machines Hammer Strength. Espace de 600m² entièrement climatisé. Ouvert de 5h à 23h.",
                },
                {
                  icon: "🥊",
                  title: "Boxe & MMA",
                  body: "Ring complet, sacs de frappe lourds, mitaines. Cours collectifs lu/me/ve. Sparring samedi sur inscription.",
                },
                {
                  icon: "⚡",
                  title: "CrossFit & HIIT",
                  body: "WOD quotidien, barres olympiques, kettlebells, cordes à grimper. Programme de 8 semaines inclus.",
                },
                {
                  icon: "🧘",
                  title: "Yoga & mobilité",
                  body: "Salle climatisée dédiée, tapis fournis. Cours matinaux 6h–7h30 · Cours du soir 19h–20h30.",
                },
                {
                  icon: "🏃",
                  title: "Cardio zone",
                  body: "20 tapis de course, vélos, elliptiques Technogym. Écrans Netflix. Idéal pour démarrer ou récupérer.",
                },
                {
                  icon: "🥗",
                  title: "Nutrition & suivi",
                  body: "Bilan corporel mensuel, plan alimentaire personnalisé, application de suivi. Protéines & suppléments en vente.",
                },
              ],
            },
          },
          {
            id: "fg-gallery",
            type: "gallery",
            props: {
              heading: "L'espace",
              layout: "grid",
              columns: 3,
              instagramHandle: "forgegym.dk",
              followLabel: "Voir les transformations",
              items: [
                { src: "", alt: "Zone musculation FORGE GYM" },
                { src: "", alt: "Ring de boxe" },
                { src: "", alt: "CrossFit zone" },
                { src: "", alt: "Cardio zone tapis de course" },
                { src: "", alt: "Vestiaires & douches" },
                { src: "", alt: "Transformation membre — avant/après" },
              ],
            },
          },
          {
            id: "fg-testimonials",
            type: "testimonials",
            props: {
              heading: "Leurs résultats",
              items: [
                {
                  quote: "En 3 mois j'ai perdu 12 kg. Les coachs sont sérieux, pas de blabla. Le programme nutrition a tout changé.",
                  name: "Ibrahima Sow",
                  role: "Membre depuis 8 mois",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "Meilleure salle de Dakar. Équipement pro, clim fonctionnelle, horaires étendus. Je paye 25 000 FCFA pour ça et c'est largement mérité.",
                  name: "Fatou Diallo",
                  role: "Membre depuis 14 mois",
                  rating: 5,
                  verified: true,
                },
                {
                  quote: "J'avais essayé 4 salles avant. FORGE c'est différent — les coachs te poussent vraiment. +8 kg de muscle en 5 mois.",
                  name: "Moussa Ndiaye",
                  role: "Membre depuis 18 mois",
                  rating: 5,
                  verified: true,
                },
              ],
            },
          },
          {
            id: "fg-cta-wa",
            type: "whatsapp",
            props: {
              label: "Prendre un essai gratuit — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour FORGE GYM — je voudrais essayer la salle gratuitement. Quels sont vos créneaux disponibles cette semaine ?",
            },
          },
          footer("fg-footer-home"),
        ],
      },
      {
        slug: "seances",
        title: "Séances",
        sections: [
          nav("fg-nav-seances"),
          {
            id: "fg-seances-hero",
            type: "hero",
            props: {
              heading: "Planning des séances",
              subheading: "Cours collectifs, coaching perso, et séances libres — choisissez votre rythme.",
              buttonLabel: "Réserver un cours",
              buttonHref: "/contact",
              align: "left",
              background: "#0A0A0A",
            },
          },
          {
            id: "fg-schedule",
            type: "events",
            props: {
              heading: "Semaine type",
              items: [
                {
                  title: "Musculation libre",
                  date: "Lun–Dim",
                  time: "05h00–23h00",
                  location: "Zone principale",
                  description: "Accès libre avec abonnement. Coachs disponibles pour conseils.",
                  price: "Inclus abonnement",
                  href: "/tarifs",
                },
                {
                  title: "CrossFit WOD",
                  date: "Lun, Mer, Ven",
                  time: "06h30 · 12h00 · 18h30",
                  location: "Salle CrossFit",
                  description: "WOD du jour, tout niveau. Max 12 participants par session.",
                  price: "Inclus abonnement",
                  href: "/contact",
                },
                {
                  title: "Boxe initiation",
                  date: "Mar, Jeu",
                  time: "07h00 · 19h00",
                  location: "Ring",
                  description: "Technique de base, mitaines, travail cardio. Gants fournis.",
                  price: "3 000 FCFA / séance",
                  href: "/contact",
                },
                {
                  title: "Yoga & étirements",
                  date: "Mar, Jeu, Sam",
                  time: "06h00 · 20h00",
                  location: "Salle calme",
                  description: "Hatha yoga, mobilité, récupération. Tapis fournis.",
                  price: "Inclus abonnement Premium",
                  href: "/tarifs",
                },
                {
                  title: "Coaching personnel",
                  date: "Sur RDV",
                  time: "Plages flexibles",
                  location: "Tout l'espace",
                  description: "Programme 100% personnalisé, bilan mensuel, suivi nutrition.",
                  price: "À partir de 60 000 FCFA/mois",
                  href: "/contact",
                },
              ],
            },
          },
          footer("fg-footer-seances"),
        ],
      },
      {
        slug: "coachs",
        title: "Coachs",
        sections: [
          nav("fg-nav-coachs"),
          {
            id: "fg-coachs-hero",
            type: "hero",
            props: {
              heading: "L'équipe FORGE",
              subheading: "12 coachs certifiés — musculation, boxe, CrossFit, nutrition, yoga. Tous passés par des compétitions.",
              buttonLabel: "Travailler avec un coach",
              buttonHref: "/contact",
              align: "left",
              background: "#0A0A0A",
            },
          },
          {
            id: "fg-coachs-list",
            type: "features",
            props: {
              heading: "Coachs disponibles",
              layout: "grid",
              items: [
                {
                  title: "Abdoulaye Diop — Head Coach",
                  body: "Certification BPJEPS · 8 ans d'expérience · spécialiste prise de masse et powerlifting. Médaillé national 2019.",
                  imageUrl: "",
                  icon: "💪",
                },
                {
                  title: "Mariama Baldé — CrossFit & HIIT",
                  body: "CrossFit Level 2 Trainer · recordwoman de Dakar au WOD. Spécialité : transformation en 8 semaines.",
                  imageUrl: "",
                  icon: "⚡",
                },
                {
                  title: "Ousmane Kouyaté — Boxe & MMA",
                  body: "Ex-champion national amateur · 6 ans de coaching. Initiation à l'avancé, tous âges, femmes bienvenues.",
                  imageUrl: "",
                  icon: "🥊",
                },
                {
                  title: "Aminata Fall — Yoga & nutrition",
                  body: "200h RYT · diététicienne certifiée. Plans alimentaires africains adaptés — yassa, thiéboudienne healthy.",
                  imageUrl: "",
                  icon: "🧘",
                },
              ],
            },
          },
          footer("fg-footer-coachs"),
        ],
      },
      {
        slug: "tarifs",
        title: "Tarifs",
        sections: [
          nav("fg-nav-tarifs"),
          {
            id: "fg-tarifs-hero",
            type: "hero",
            props: {
              heading: "Tarifs",
              subheading: "Sans contrat, sans frais cachés — résiliable à tout moment via WhatsApp.",
              buttonLabel: "S'inscrire maintenant",
              buttonHref: "/contact",
              align: "center",
              background: "#0A0A0A",
            },
          },
          {
            id: "fg-memberships",
            type: "products",
            props: {
              heading: "Abonnements",
              layout: "grid",
              columns: 3,
              orderCtaLabel: "S'inscrire — WhatsApp",
              items: [
                {
                  name: "Essential — 1 mois",
                  description: "Accès illimité musculation + cardio, du lundi au samedi 6h–22h. Vestiaires inclus.",
                  priceLabel: "25 000 FCFA/mois",
                  imageUrl: "",
                  whatsappMessage: "Bonjour FORGE GYM — je veux m'abonner au pack Essential (25 000 FCFA/mois). Comment procéder ?",
                },
                {
                  name: "Premium — 1 mois",
                  description: "Accès illimité 7j/7 5h–23h, cours collectifs CrossFit + yoga inclus, bilan mensuel, application de suivi.",
                  priceLabel: "40 000 FCFA/mois",
                  badge: "POPULAIRE",
                  imageUrl: "",
                  whatsappMessage: "Bonjour FORGE GYM — je veux m'abonner au pack Premium (40 000 FCFA/mois). Comment procéder ?",
                },
                {
                  name: "Elite — Coaching perso",
                  description: "Tout Premium + 8 séances coaching perso/mois, programme nutrition, accès prioritaire aux équipements.",
                  priceLabel: "85 000 FCFA/mois",
                  imageUrl: "",
                  whatsappMessage: "Bonjour FORGE GYM — je veux le pack Elite avec coaching perso (85 000 FCFA/mois). Disponible quand ?",
                },
                {
                  name: "Séance journalière",
                  description: "Accès 1 jour complet, sans engagement. Idéal pour tester ou visiteurs de passage.",
                  priceLabel: "3 500 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour FORGE GYM — je veux une séance journalière (3 500 FCFA). Je peux venir aujourd'hui ?",
                },
                {
                  name: "Pass 10 séances",
                  description: "10 accès valables 60 jours. Transférable à un proche. Sans contrainte d'horaire.",
                  priceLabel: "28 000 FCFA",
                  valuePriceLabel: "35 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour FORGE GYM — je veux le Pass 10 séances (28 000 FCFA). Comment ça marche ?",
                },
                {
                  name: "Abonnement famille",
                  description: "2 à 4 membres du même foyer. Tarif dégressif — idéal pour parents + enfants à partir de 16 ans.",
                  priceLabel: "À partir de 60 000 FCFA",
                  imageUrl: "",
                  whatsappMessage: "Bonjour FORGE GYM — je veux un abonnement famille. Nous sommes [X] personnes.",
                },
              ],
            },
          },
          {
            id: "fg-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Comment payer ?",
                  answer: "Wave, Orange Money, ou cash à la caisse. Pas de carte bancaire pour l'instant. Paiement mensuel ou trimestriel (réduction 10%).",
                },
                {
                  question: "Y a-t-il un engagement minimum ?",
                  answer: "Aucun. Résiliez à tout moment via WhatsApp avant le 25 du mois pour le mois suivant. Pas de frais de résiliation.",
                },
                {
                  question: "Les équipements sont-ils en bon état ?",
                  answer: "Nous investissons 1,5 million FCFA par an en maintenance. Chaque machine est vérifiée hebdomadairement. Signalement immédiat via WhatsApp.",
                },
                {
                  question: "À partir de quel âge peut-on s'inscrire ?",
                  answer: "16 ans minimum avec accord parental. Cours ados séparés les week-ends 10h–12h.",
                },
                {
                  question: "Y a-t-il des vestiaires et des douches ?",
                  answer: "Oui — vestiaires hommes et femmes séparés, douches chaudes, casiers individuels avec cadenas.",
                },
              ],
              contactPanel: {
                heading: "Essayez avant de payer",
                body: "Séance découverte gratuite — pas d'engagement, pas de carte bancaire. Présentez-vous avec ce message WhatsApp.",
                buttonLabel: "Réserver mon essai gratuit",
                buttonHref: "/contact",
                background: "#AAFF00",
              },
            },
          },
          footer("fg-footer-tarifs"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("fg-nav-contact"),
          {
            id: "fg-contact-section",
            type: "contact",
            props: {
              heading: "Nous trouver",
              email: "hello@forgegym.example",
              phone: "+221770000000",
              address: "FORGE GYM — Plateau, Dakar · Parking gratuit · Ouvert 5h–23h, 7j/7",
            },
          },
          {
            id: "fg-contact-wa",
            type: "whatsapp",
            props: {
              label: "WhatsApp — inscription ou question",
              phone: "+221770000000",
              message: "Bonjour FORGE GYM — je voudrais avoir plus d'informations sur vos abonnements. Pouvez-vous m'appeler ?",
            },
          },
          footer("fg-footer-contact"),
        ],
      },
    ],
  };
}

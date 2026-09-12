import type { WebsiteDefinition } from "../website-schema";

/**
 * LUMINA WELLNESS — Coaching bien-être & développement personnel
 * Soft feminine: bordeaux velouté + rose pâle + crème chaud
 * Cormorant Garamond (display) + DM Sans (body)
 * Coaching de vie, méditation, nutrition, femmes africaines
 */
export function wellnessCoachWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "LUMINA WELLNESS",
    theme: {
      primary: "#6B1F3A",
      accent: "#D4557A",
      background: "#FDF8F5",
      text: "#2E1A26",
      surface: "#F7EBF0",
      fontDisplay: "Cormorant Garamond",
      fontBody: "DM Sans",
      spacing: "airy",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "soft",
      aestheticId: "soft-wellness-feminine",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Coaching Bien-être · Dakar",
              heading: "Retrouvez\nl'équilibre qui\nvous ressemble.",
              subheading:
                "LUMINA WELLNESS accompagne les femmes africaines vers une vie plus alignée — corps, mental et âme. Coaching de vie, nutrition holistique et méditation guidée.",
              primaryCta: { label: "Commencer le voyage", href: "/programmes" },
              secondaryCta: { label: "Me contacter", href: "https://wa.me/221730000000" },
              backgroundImageUrl: "",
              overlay: 0.3,
              textAlign: "center",
            },
          },
          {
            type: "features",
            props: {
              heading: "Mon approche",
              layout: "grid",
              items: [
                {
                  icon: "🌸",
                  title: "Corps & Nutrition",
                  description:
                    "Alimentation intuitive ancrée dans notre culture culinaire africaine. Pas de régimes — une relation saine avec votre corps.",
                },
                {
                  icon: "🧘",
                  title: "Mental & Méditation",
                  description:
                    "Pleine conscience, gestion du stress, pratiques ancestrales africaines adaptées au quotidien moderne.",
                },
                {
                  icon: "✨",
                  title: "Vie & Purpose",
                  description:
                    "Clarifier vos valeurs, aligner vos choix, construire une vie qui vous ressemble. Coaching ICF certifié.",
                },
                {
                  icon: "🤝",
                  title: "Communauté féminine",
                  description:
                    "Rejoindre une communauté de femmes africaines qui s'élèvent ensemble. Cercles de parole mensuels.",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "À propos de Mariama",
              heading: "Votre guide vers une vie plus douce.",
              body: "Mariama Bah est coach certifiée ICF, nutritionniste holistique et praticienne en méditation. Après un burn-out professionnel à 32 ans, elle a reconstruit sa vie de l'intérieur. Aujourd'hui, elle accompagne les femmes à faire de même — avec bienveillance, profondeur et ancrage culturel africain.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Mon histoire", href: "/à-propos" },
            },
          },
          {
            type: "products",
            props: {
              heading: "Programmes",
              subheading: "Du coaching individuel aux retraites bien-être en groupe.",
              columns: 3,
              items: [
                {
                  name: "Session découverte",
                  description:
                    "60 min pour explorer où vous en êtes et ce que vous voulez vraiment. Gratuit et sans engagement.",
                  price: 0,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "GRATUIT",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221730000000",
                },
                {
                  name: "Coaching individuel 8 semaines",
                  description:
                    "8 sessions de 60 min, journal de bord guidé, support WhatsApp. Programme sur-mesure selon vos objectifs.",
                  price: 480000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Recommandé",
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221730000000",
                },
                {
                  name: "Retraite bien-être",
                  description:
                    "Week-end immersif à Saly (vendredi–dimanche). Yoga, méditation, nutrition, coaching de groupe. 12 femmes max.",
                  price: 250000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Prochain : mars 2025",
                  ctaLabel: "Réserver une place",
                  ctaHref: "https://wa.me/221730000000",
                },
                {
                  name: "Programme nutrition 4 semaines",
                  description:
                    "Rééquilibrage alimentaire adapté à la cuisine africaine. Menu hebdomadaire, courses guidées, suivi WhatsApp.",
                  price: 180000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Commencer",
                  ctaHref: "https://wa.me/221730000000",
                },
                {
                  name: "Cercle de femmes mensuel",
                  description:
                    "Espace de parole et de partage entre femmes. Thèmes : relationships, travail, corps, argent. 2h/mois.",
                  price: 25000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Rejoindre",
                  ctaHref: "https://wa.me/221730000000",
                },
                {
                  name: "Coaching couple & famille",
                  description:
                    "Accompagnement couple ou famille pour retrouver l'harmonie. 4 sessions de 75 min.",
                  price: 320000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Nous contacter",
                  ctaHref: "https://wa.me/221730000000",
                },
              ],
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ce que disent mes clientes",
              items: [
                {
                  quote:
                    "Mariama m'a aidée à sortir d'une dépression que je cachais à tout le monde. 8 semaines de coaching et j'ai retrouvé une joie que je ne connaissais plus. Je recommande à toutes les femmes.",
                  author: "Rokhaya D.",
                  role: "Directrice marketing, Dakar",
                },
                {
                  quote:
                    "La retraite à Saly était magique. Trois jours de déconnexion totale, de partage avec 11 femmes incroyables. Je suis rentrée différente, plus légère, plus alignée.",
                  author: "Aminata K.",
                  role: "Entrepreneur, Dakar",
                },
                {
                  quote:
                    "Le programme nutrition a changé ma relation à la nourriture. Plus de culpabilité, plus de régimes. Je mange bien, je me sens belle, et j'ai perdu 8 kilos en 3 mois.",
                  author: "Fatou S.",
                  role: "Maman de 3 enfants, Thiès",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Commençons votre chemin",
              subheading:
                "Une session découverte gratuite de 60 min. Dites-moi où vous en êtes.",
              phoneNumber: "221730000000",
              message:
                "Bonjour Mariama, je voudrais réserver une session découverte gratuite. En ce moment, je traverse [situation : stress / burnout / manque d'énergie / autre]. Je cherche [coaching / nutrition / méditation]. Merci.",
              buttonLabel: "Réserver la session gratuite",
            },
          },
        ],
      },
      {
        slug: "programmes",
        title: "Programmes",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Programmes bien-être",
              subheading: "Individuel, groupe, retraite. À votre rythme, à votre mesure.",
              backgroundImageUrl: "",
              overlay: 0.4,
            },
          },
          {
            type: "features",
            props: {
              heading: "Le chemin LUMINA",
              layout: "horizontal",
              items: [
                { icon: "🌱", title: "1. Découverte", description: "Session gratuite pour comprendre où vous en êtes et ce que vous voulez." },
                { icon: "🗺️", title: "2. Programme", description: "Je crée un plan sur-mesure adapté à vos besoins, votre agenda et votre budget." },
                { icon: "🌿", title: "3. Accompagnement", description: "Sessions régulières, outils pratiques, support WhatsApp entre les séances." },
                { icon: "🌸", title: "4. Intégration", description: "Ancrer les changements dans votre vie quotidienne. Autonomie et épanouissement durables." },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Le coaching est-il fait pour moi ?",
                  answer:
                    "Le coaching est pour vous si vous vous sentez bloquée, si vous cherchez votre direction, si vous voulez changer quelque chose dans votre vie mais ne savez pas comment. Ce n'est pas une thérapie : je travaille sur votre présent et votre futur, pas sur le passé.",
                },
                {
                  question: "Les séances se font comment ?",
                  answer:
                    "En visioconférence (Zoom ou WhatsApp), en présentiel à Dakar, ou lors des retraites en groupe. Vous choisissez ce qui vous convient le mieux.",
                },
                {
                  question: "Comment se passe le paiement ?",
                  answer:
                    "Wave, Orange Money, ou virement bancaire. Paiement en 2 fois possible pour les programmes de 8 semaines et plus.",
                },
              ],
              contactPanel: {
                heading: "Hésitez encore ?",
                body: "La session découverte est gratuite et sans engagement.",
                ctaLabel: "Réserver la session gratuite",
                ctaHref: "https://wa.me/221730000000",
              },
            },
          },
        ],
      },
      {
        slug: "à-propos",
        title: "À propos",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Mariama Bah",
              heading: "De burn-out\nà épanouissement.",
              body: "À 32 ans, Mariama Bah était directrice dans une multinationale. Épuisée, disconnectée, elle a tout arrêté pour se retrouver. Ce voyage l'a menée vers la méditation, la nutrition holistique et le coaching certifié ICF. Aujourd'hui, LUMINA WELLNESS est né de ce chemin — pour que d'autres femmes n'aient pas à attendre le fond pour se reconstruire.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Travailler avec moi", href: "/programmes" },
            },
          },
          {
            type: "contact",
            props: {
              heading: "Me trouver",
              subheading: "Dakar (consultations à domicile ou en cabinet). Remote available.",
              address: "LUMINA WELLNESS — Plateau, Dakar, Sénégal",
              phone: "+221 73 000 00 00",
              email: "mariama@luminawellness.sn",
              mapEmbedUrl: "",
            },
          },
        ],
      },
    ],
  };
}

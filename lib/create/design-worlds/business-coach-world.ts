import type { WebsiteDefinition } from "../website-schema";

/**
 * RISE CONSULTING — Coach business & entrepreneur
 * Bold authority: rouge sang de bœuf + blanc pur + noir intense
 * Playfair Display (display) + Inter (body)
 * Coaching individuel, formations, conférences, Dakar
 */
export function businessCoachWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "RISE CONSULTING",
    theme: {
      primary: "#0D0D0D",
      accent: "#C41E1E",
      background: "#FFFFFF",
      text: "#0D0D0D",
      fontDisplay: "Playfair Display",
      fontBody: "Inter",
      spacing: "airy",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "sharp",
      aestheticId: "bold-business-coach",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Coach Business & Entrepreneur · Dakar",
              heading: "Votre business\nmérite de\nbriller.",
              subheading:
                "Fatima Ndiaye — coach certifiée, ancienne directrice de startup et investisseure. 10 ans à transformer des entrepreneurs africains en leaders qui scalent leur business.",
              primaryCta: { label: "Travailler avec moi", href: "/coaching" },
              secondaryCta: { label: "Voir les résultats", href: "/témoignages" },
              backgroundImageUrl: "",
              overlay: 0.0,
              textAlign: "left",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "320", suffix: "+", label: "Entrepreneurs coachés" },
                { value: "10", label: "Ans d'expérience" },
                { value: "85%", label: "Revenus 2× en 6 mois" },
                { value: "15", label: "Pays représentés" },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Pourquoi RISE ?",
              heading: "Votre stratégie doit être aussi solide que votre ambition.",
              body: "Trop d'entrepreneurs africains ont des idées brillantes mais des structures fragiles. RISE Consulting vous aide à construire un business clair, rentable et scalable — avec un système, une équipe et une stratégie qui tiennent dans la durée. Pas de théorie creuse : des méthodes testées sur le terrain africain.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "En savoir plus", href: "/à-propos" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Ce sur quoi je vous aide",
              layout: "grid",
              items: [
                {
                  icon: "📈",
                  title: "Stratégie de croissance",
                  description:
                    "Positionnement, offre, pricing, acquisition clients. Un plan clair pour doubler votre chiffre d'affaires.",
                },
                {
                  icon: "🧠",
                  title: "Leadership & posture",
                  description:
                    "Devenir le leader que votre équipe attend. Prise de décision, délégation, management africain.",
                },
                {
                  icon: "💰",
                  title: "Finance d'entreprise",
                  description:
                    "Trésorerie, marges, investissements, levée de fonds. Comprendre ses chiffres pour mieux piloter.",
                },
                {
                  icon: "🌍",
                  title: "Expansion africaine",
                  description:
                    "Ouvrir dans un nouveau pays africain. Réseaux, partenaires, adaptation culturelle et légale.",
                },
              ],
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ils ont transformé leur business",
              items: [
                {
                  quote:
                    "En 6 mois de coaching avec Fatima, mon chiffre d'affaires a triplé. Elle m'a aidé à sortir du chaos opérationnel et à vraiment scaler. C'est le meilleur investissement de ma vie d'entrepreneur.",
                  author: "Aliou B.",
                  role: "Fondateur, plateforme e-commerce, Dakar",
                },
                {
                  quote:
                    "Fatima ne flatte pas l'ego. Elle identifie le vrai problème, souvent là où on ne le cherche pas. Grâce à elle, j'ai restructuré mon offre et recruté ma première vraie équipe.",
                  author: "Marie-Claire T.",
                  role: "CEO, agence de communication, Abidjan",
                },
                {
                  quote:
                    "Sa connaissance du marché sénégalais ET des pratiques internationales fait toute la différence. En 3 mois, elle m'a aidé à lever 30 millions FCFA auprès d'investisseurs locaux.",
                  author: "Mamadou S.",
                  role: "Fondateur, startup FinTech, Dakar",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Prêt(e) à passer au niveau supérieur ?",
              subheading:
                "Décrivez votre business en 2–3 lignes. Session de découverte gratuite de 30 min offerte.",
              phoneNumber: "221720000000",
              message:
                "Bonjour Fatima, je suis entrepreneur(e) dans [secteur]. Mon principal défi en ce moment est [challenge]. Je voudrais explorer la possibilité de travailler ensemble.",
              buttonLabel: "Demander une session découverte",
            },
          },
        ],
      },
      {
        slug: "coaching",
        title: "Coaching",
        sections: [
          {
            type: "products",
            props: {
              heading: "Programmes d'accompagnement",
              subheading:
                "Du coaching individuel intensif aux formations de groupe. Choisissez votre niveau d'engagement.",
              columns: 3,
              items: [
                {
                  name: "Session unique",
                  description:
                    "90 minutes de coaching stratégique. Problème précis, plan d'action concret, suivi WhatsApp 1 semaine.",
                  price: 150000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221720000000",
                },
                {
                  name: "Accompagnement 3 mois",
                  description:
                    "8 sessions bi-hebdomadaires, WhatsApp illimité, révision mensuelle de vos KPI. Résultats en 90 jours.",
                  price: 900000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Populaire",
                  ctaLabel: "S'inscrire",
                  ctaHref: "https://wa.me/221720000000",
                },
                {
                  name: "Mastermind 6 mois",
                  description:
                    "Programme groupe de 8 entrepreneurs. Sessions hebdomadaires + coaching individuel mensuel. Réseau et accountability.",
                  price: 750000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Recommandé",
                  ctaLabel: "Rejoindre la liste",
                  ctaHref: "https://wa.me/221720000000",
                },
                {
                  name: "Formation équipe",
                  description:
                    "Journée de formation pour votre équipe dirigeante. Leadership, stratégie, KPI et plan d'action collectif.",
                  price: 500000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221720000000",
                },
                {
                  name: "Conférence / Keynote",
                  description:
                    "Intervention lors d'un événement entrepreneurial. 45–90 min sur leadership, innovation ou expansion africaine.",
                  price: 350000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221720000000",
                },
                {
                  name: "Audit stratégique",
                  description:
                    "Analyse complète de votre business en 1 semaine. Rapport écrit + session de restitution 2h + plan d'action.",
                  price: 400000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "1ère étape idéale",
                  ctaLabel: "Commander l'audit",
                  ctaHref: "https://wa.me/221720000000",
                },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "À quel type d'entrepreneur vous adressez-vous ?",
                  answer:
                    "Entrepreneurs africains avec un business déjà lancé (au moins 6 mois d'activité) qui veulent structurer, scaler ou résoudre un blocage spécifique. Je ne travaille pas avec des porteurs de projet sans chiffre d'affaires.",
                },
                {
                  question: "Les séances se font en présentiel ou en ligne ?",
                  answer:
                    "Les deux. Les clients Dakar peuvent choisir. Les clients hors Sénégal travaillent via Zoom ou WhatsApp video. J'interviens aussi en présentiel dans certains pays sur invitation.",
                },
                {
                  question: "Comment se passe le paiement ?",
                  answer:
                    "Wave, Orange Money, virement bancaire ou paiement en 2 fois pour les programmes longs. Un acompte de 50% est demandé à l'inscription.",
                },
              ],
              contactPanel: {
                heading: "Session découverte gratuite",
                body: "30 min pour voir si on est faits pour travailler ensemble.",
                ctaLabel: "Réserver maintenant",
                ctaHref: "https://wa.me/221720000000",
              },
            },
          },
        ],
      },
      {
        slug: "témoignages",
        title: "Résultats",
        sections: [
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "320", suffix: "+", label: "Entrepreneurs coachés" },
                { value: "85%", label: "Doublent leur CA en 6 mois" },
                { value: "15", label: "Pays représentés" },
                { value: "₣30M", label: "Levés en financement client" },
              ],
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ils témoignent",
              items: [
                {
                  quote:
                    "En 6 mois de coaching avec Fatima, mon chiffre d'affaires a triplé. Elle m'a aidé à sortir du chaos opérationnel et à vraiment scaler.",
                  author: "Aliou B.",
                  role: "E-commerce, Dakar",
                },
                {
                  quote:
                    "Fatima ne flatte pas l'ego. Elle identifie le vrai problème, souvent là où on ne le cherche pas. Grâce à elle, j'ai restructuré mon offre.",
                  author: "Marie-Claire T.",
                  role: "Agence de communication, Abidjan",
                },
                {
                  quote:
                    "Sa connaissance du marché sénégalais ET des pratiques internationales fait toute la différence. J'ai levé 30 millions FCFA en 3 mois.",
                  author: "Mamadou S.",
                  role: "FinTech, Dakar",
                },
                {
                  quote:
                    "J'avais un business confus avec une offre floue. En 3 mois, j'ai un positionnement clair, des clients qui paient au bon prix et une équipe qui tourne.",
                  author: "Awa N.",
                  role: "Cabinet conseil RH, Dakar",
                },
                {
                  quote:
                    "Le Mastermind est la meilleure chose que j'ai faite pour mon business. La combinaison coaching individuel + groupe d'entrepreneurs, c'est une force incomparable.",
                  author: "Ibrahima D.",
                  role: "Agrobusiness, Saint-Louis",
                },
                {
                  quote:
                    "J'ai essayé plusieurs coachs. Fatima est la seule qui m'a donné des outils concrets adaptés au contexte africain, pas des frameworks copiés des USA.",
                  author: "Rokhaya F.",
                  role: "Fondatrice, formation professionnelle, Abidjan",
                },
              ],
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
              eyebrow: "Fatima Ndiaye",
              heading: "De directrice de startup\nà coach qui scalent.",
              body: "Diplômée de Sciences Po Paris et de HEC Montréal, Fatima Ndiaye a passé 6 ans à diriger la croissance d'une startup FinTech en Afrique de l'Ouest avant de co-fonder RISE Consulting en 2017. Certifiée ICF (International Coaching Federation) au niveau PCC, elle a accompagné plus de 320 entrepreneurs en Afrique subsaharienne et en diaspora. Elle est également investisseure ange dans 4 startups africaines.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Travailler avec moi", href: "/coaching" },
            },
          },
          {
            type: "contact",
            props: {
              heading: "Me contacter",
              subheading: "Basée à Dakar. Disponible en remote pour tous pays.",
              address: "RISE Consulting — Mermoz, Dakar, Sénégal",
              phone: "+221 72 000 00 00",
              email: "fatima@riseconsulting.africa",
              mapEmbedUrl: "",
            },
          },
        ],
      },
    ],
  };
}

import type { WebsiteDefinition } from "../website-schema";

/**
 * JULIA GYUT — Designer UI/UX & Visual Freelance
 * Cool minimal: blanc pur + noir + bleu électrique pop
 * Space Grotesk (display) + Inter (body)
 * Portfolio produit, case studies, freelance design
 */
export function designerPortfolioWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Julia Gyut — Designer",
    theme: {
      primary: "#0A0A0A",
      accent: "#2563EB",
      background: "#F9F9F9",
      text: "#0A0A0A",
      fontDisplay: "Space Grotesk",
      fontBody: "Inter",
      radius: "soft",
      spacing: "airy",
      headingScale: "md",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "cool-minimal-designer-portfolio",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Designer UI/UX & Visual · Dakar",
              heading: "Je crée des\ninterfaces qui\nconvertissent.",
              subheading:
                "Designer freelance spécialisé en produit digital, identité de marque et sites web. 5 ans d'expérience, 40+ projets livrés pour des startups africaines et européennes.",
              primaryCta: { label: "Voir mes projets", href: "/portfolio" },
              secondaryCta: { label: "Me contacter", href: "https://wa.me/221740000000" },
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
                { value: "40", suffix: "+", label: "Projets livrés" },
                { value: "5", label: "Ans d'expérience" },
                { value: "18", label: "Clients récurrents" },
                { value: "4.9", prefix: "★", label: "Note Upwork" },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "Ce que je fais",
              layout: "grid",
              items: [
                {
                  icon: "📱",
                  title: "Design de produit",
                  description:
                    "UX research, wireframes, prototypes Figma, design system. Apps mobiles et web app B2B/B2C.",
                },
                {
                  icon: "🎨",
                  title: "Identité visuelle",
                  description:
                    "Logo, charte graphique, brandbook, illustration. Du brief au fichier final.",
                },
                {
                  icon: "🌐",
                  title: "Design web",
                  description:
                    "Landing pages, sites marketing, e-commerce. Responsive, performant, bien référencé.",
                },
                {
                  icon: "📊",
                  title: "Design de contenu",
                  description:
                    "Decks de présentation, infographies, templates réseaux sociaux. Cohérent sur tous supports.",
                },
              ],
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Projets récents",
              tiles: [
                {
                  label: "FinTech — App Mobile",
                  description: "Refonte UX complète d'une app de paiement mobile. 180% de rétention.",
                  imageUrl: "",
                  href: "/portfolio",
                },
                {
                  label: "E-commerce Mode",
                  description: "Design + dev Figma pour boutique mode africaine. +40% de conversion.",
                  imageUrl: "",
                  href: "/portfolio",
                },
                {
                  label: "SaaS Dashboard",
                  description: "Design system + dashboard B2B pour startup RH. 3 sprints, 0 itération post-launch.",
                  imageUrl: "",
                  href: "/portfolio",
                },
                {
                  label: "Brand Identity",
                  description: "Identité complète pour agence de communication Abidjan.",
                  imageUrl: "",
                  href: "/portfolio",
                },
              ],
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ce qu'ils disent",
              items: [
                {
                  quote:
                    "Julia a refait entièrement notre app en 6 semaines. Résultat bluffant, les utilisateurs s'y retrouvent enfin. Le taux de rétention a grimpé de 180%.",
                  author: "Moussa Ndiaye",
                  role: "CEO, WalletSN",
                },
                {
                  quote:
                    "La meilleure designer avec qui j'aie travaillé. Elle comprend vite, propose des solutions élégantes et respecte les délais.",
                  author: "Amina Traoré",
                  role: "Fondatrice, Tiss Mode",
                },
                {
                  quote:
                    "Notre deck de présentation investisseurs a été félicité à chaque pitch. Julia a transformé nos données en storytelling visuel.",
                  author: "Ibrahima Fall",
                  role: "CTO, AgriData",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Démarrer un projet",
              subheading:
                "Brief, délai, budget — décrivez-moi votre projet en quelques lignes. Je réponds sous 4h.",
              phoneNumber: "221740000000",
              message:
                "Bonjour Julia, je voudrais discuter d'un projet de [design produit / identité / site web]. Mon budget est d'environ [montant] FCFA et le délai souhaité est [durée]. Merci.",
              buttonLabel: "Me contacter",
            },
          },
        ],
      },
      {
        slug: "portfolio",
        title: "Portfolio",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Portfolio",
              subheading: "40+ projets livrés. Produit digital, branding et web.",
              backgroundImageUrl: "",
              overlay: 0.0,
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Par discipline",
              tiles: [
                { label: "UX/UI Product", description: "Apps mobiles, web apps, design system", imageUrl: "", href: "/portfolio" },
                { label: "Branding", description: "Logos, chartes, brandbooks", imageUrl: "", href: "/portfolio" },
                { label: "Web Design", description: "Landing pages, e-commerce, marketing", imageUrl: "", href: "/portfolio" },
                { label: "Print & Social", description: "Affiches, decks, templates", imageUrl: "", href: "/portfolio" },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "",
              layout: "masonry",
              images: [
                { url: "", alt: "WalletSN App redesign" },
                { url: "", alt: "Tiss Mode e-commerce" },
                { url: "", alt: "AgriData dashboard" },
                { url: "", alt: "Brand identity Éclat" },
                { url: "", alt: "FinTech onboarding flow" },
                { url: "", alt: "Marketing deck startup" },
                { url: "", alt: "Design system components" },
                { url: "", alt: "Social media templates" },
              ],
            },
          },
        ],
      },
      {
        slug: "services",
        title: "Tarifs",
        sections: [
          {
            type: "products",
            props: {
              heading: "Mes forfaits",
              subheading:
                "Tarifs à titre indicatif. Devis précis sur brief. Paiement Wave / Orange Money / virement.",
              columns: 3,
              items: [
                {
                  name: "Logo & Identité",
                  description:
                    "Logo principal + déclinaisons, charte couleurs & typographies, règles d'usage. Livraison Figma + formats imprimables.",
                  price: 250000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Démarrer",
                  ctaHref: "https://wa.me/221740000000",
                },
                {
                  name: "Landing Page",
                  description:
                    "Design haute fidélité 1 page + mobile. Livraison Figma prêt à développer. Révisions illimitées pendant 2 semaines.",
                  price: 180000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Populaire",
                  ctaLabel: "Démarrer",
                  ctaHref: "https://wa.me/221740000000",
                },
                {
                  name: "App Mobile UX/UI",
                  description:
                    "UX research, wireframes, maquettes haute fidélité + prototype interactif. Design system inclus.",
                  price: 850000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221740000000",
                },
                {
                  name: "Site web complet",
                  description:
                    "Design 5–10 pages responsive, composants réutilisables, guide de style. Délai 3–4 semaines.",
                  price: 450000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Démarrer",
                  ctaHref: "https://wa.me/221740000000",
                },
                {
                  name: "Deck investisseurs",
                  description:
                    "Présentation 15–20 slides narratif + design premium. Template réutilisable livré avec.",
                  price: 150000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Démarrer",
                  ctaHref: "https://wa.me/221740000000",
                },
                {
                  name: "Mission longue durée",
                  description:
                    "Collaboration mensuelle dédiée : 80h/mois design produit ou marketing. Tarif journalier réduit.",
                  price: 700000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Meilleur rapport",
                  ctaLabel: "En discuter",
                  ctaHref: "https://wa.me/221740000000",
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
                  question: "Quel outil utilisez-vous ?",
                  answer:
                    "Figma pour tout le design produit et web, Illustrator pour le branding vectoriel, After Effects pour les animations.",
                },
                {
                  question: "Livrez-vous aussi le développement front-end ?",
                  answer:
                    "Je me concentre sur le design. Je peux recommander des développeurs Dakar/remote avec qui je collabore régulièrement.",
                },
                {
                  question: "Combien de révisions sont incluses ?",
                  answer:
                    "3 allers-retours par livrable. Au-delà, chaque révision est facturée 25 000 FCFA/heure.",
                },
                {
                  question: "Travaillez-vous avec des clients hors Sénégal ?",
                  answer:
                    "Oui. Je travaille en remote pour des clients en France, en Côte d'Ivoire, au Mali et aux États-Unis. Paiement international via PayPal ou virement SEPA.",
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
            type: "whatsapp",
            props: {
              heading: "Démarrer un projet",
              subheading: "Disponible pour de nouvelles missions. Réponse sous 4h en semaine.",
              phoneNumber: "221740000000",
              message: "Bonjour Julia, je voudrais discuter d'un projet de design.",
              buttonLabel: "Écrire un brief",
            },
          },
          {
            type: "contact",
            props: {
              heading: "Me retrouver",
              subheading: "Basée à Dakar. Disponible en remote pour tous pays.",
              address: "Dakar, Sénégal (remote-friendly)",
              phone: "+221 74 000 00 00",
              email: "julia@juliagyut.design",
              mapEmbedUrl: "",
            },
          },
        ],
      },
    ],
  };
}

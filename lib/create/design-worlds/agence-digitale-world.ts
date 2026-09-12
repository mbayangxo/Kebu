import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Agence Digitale — West African digital marketing & web agency.
 * Services, case studies, team, WhatsApp lead gen, mobile money.
 * IA: Home · Services · Réalisations · Équipe · Contact
 */

const NAV = [
  { label: "Services", href: "/services" },
  { label: "Réalisations", href: "/realisations" },
  { label: "Équipe", href: "/equipe" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "AgenceDigitale", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© AgenceDigitale — marketing digital, sites web, réseaux sociaux pour l'Afrique.",
      links: [
        { label: "Services", href: "/services" },
        { label: "Réalisations", href: "/realisations" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function agenceDigitaleWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Agence Digitale",
    theme: {
      primary: "#0A0F2C",
      accent: "#6C63FF",
      background: "#F6F7FB",
      text: "#0A0F2C",
      fontDisplay: "Nunito",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "deep-violet-tech",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("ag-nav-home"),
          {
            id: "ag-hero",
            type: "hero",
            props: {
              heading: "Votre marque, visible partout en Afrique",
              subheading:
                "Sites web, réseaux sociaux, publicités ciblées, WhatsApp Business — stratégies digitales adaptées au marché ouest-africain.",
              buttonLabel: "Discuter de votre projet",
              buttonHref: "/contact",
              align: "left",
              background: "#0A0F2C",
            },
          },
          {
            id: "ag-services-home",
            type: "features",
            props: {
              heading: "Ce que nous faisons",
              items: [
                {
                  title: "Sites web & e-commerce",
                  body: "Sites vitrine, boutiques en ligne, applications web — rapides, mobiles, connectés au mobile money.",
                },
                {
                  title: "Réseaux sociaux",
                  body: "Stratégie, création de contenu, animation — Instagram, Facebook, TikTok, WhatsApp Business.",
                },
                {
                  title: "Publicités ciblées",
                  body: "Campagnes Facebook Ads, Google Ads — ciblage par pays, ville, langue, centres d'intérêt locaux.",
                },
              ],
            },
          },
          {
            id: "ag-results",
            type: "features",
            props: {
              heading: "Résultats clients",
              items: [
                {
                  title: "+340 % de portée organique",
                  body: "En 3 mois pour une boutique de mode de Dakar — Instagram + WhatsApp Business.",
                },
                {
                  title: "Site livré en 10 jours",
                  body: "Pharmacie de Thiès — site vitrine + commandes WhatsApp intégrées, mobile money.",
                },
                {
                  title: "50 leads/mois en publicité",
                  body: "Agence immobilière — Facebook Ads géo-ciblées sur Dakar, coût par lead divisé par 3.",
                },
              ],
            },
          },
          {
            id: "ag-testimonials-home",
            type: "testimonials",
            props: {
              heading: "Ce que disent nos clients",
              items: [
                {
                  quote: "Mon site est professionnel, rapide et mes clients commandent directement depuis WhatsApp. Impeccable.",
                  name: "Marème S.",
                  role: "Boutique Mode — Dakar",
                },
                {
                  quote: "Nos ventes en ligne ont doublé en 2 mois après le lancement de notre campagne Facebook.",
                  name: "Kofi A.",
                  role: "Traiteur — Abidjan",
                },
              ],
            },
          },
          {
            id: "ag-whatsapp-home",
            type: "whatsapp",
            props: {
              label: "Parler de votre projet sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais en savoir plus sur vos services digitaux pour mon activité.",
            },
          },
          footer("ag-footer-home"),
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          nav("ag-nav-services"),
          {
            id: "ag-services-hero",
            type: "hero",
            props: {
              heading: "Nos services",
              subheading: "Chaque prestation est conçue pour le marché africain — mobile-first, WhatsApp, mobile money.",
              buttonLabel: "Nous contacter",
              buttonHref: "/contact",
              align: "center",
              background: "#0A0F2C",
            },
          },
          {
            id: "ag-services-web",
            type: "features",
            props: {
              heading: "Web & Technique",
              items: [
                { title: "Site vitrine", body: "Design sur mesure, rapide, optimisé mobile — livraison en 7 à 14 jours." },
                { title: "Boutique en ligne", body: "E-commerce avec paiement Wave, Orange Money, Joko — catalogue produits géré par vous." },
                { title: "WhatsApp Business Pro", body: "Configuration, catalogue produits, messages automatiques, bouton commande sur votre site." },
              ],
            },
          },
          {
            id: "ag-services-marketing",
            type: "features",
            props: {
              heading: "Marketing & Contenu",
              items: [
                { title: "Gestion réseaux sociaux", body: "Calendrier éditorial, visuels, légendes — 3 à 5 posts/semaine sur mesure." },
                { title: "Publicités Facebook & Google", body: "Campagnes ciblées par géolocalisation, budget adapté à votre marché." },
                { title: "Création de contenu", body: "Photos, vidéos courtes Reels/TikTok, affiches — identité visuelle cohérente." },
                { title: "Email & SMS marketing", body: "Campagnes newsletter, SMS promotionnels — listes segmentées, taux d'ouverture suivi." },
              ],
            },
          },
          {
            id: "ag-services-pricing",
            type: "text",
            props: {
              heading: "Tarification flexible",
              body: "Forfaits mensuels ou prestation ponctuelle — à adapter selon votre activité et votre budget.\nPaiement mensuel ou en 2 fois : Wave, Orange Money, virement bancaire.\nDevis personnalisé gratuit sous 24 h.",
            },
          },
          footer("ag-footer-services"),
        ],
      },
      {
        slug: "realisations",
        title: "Réalisations",
        sections: [
          nav("ag-nav-realisations"),
          {
            id: "ag-real-hero",
            type: "hero",
            props: {
              heading: "Nos réalisations",
              subheading: "Des projets concrets pour des entreprises africaines — résultats mesurables.",
              buttonLabel: "Démarrer votre projet",
              buttonHref: "/contact",
              align: "left",
              background: "#0A0F2C",
            },
          },
          {
            id: "ag-real-list",
            type: "features",
            props: {
              heading: "Études de cas",
              items: [
                {
                  title: "Boutique mode — Dakar",
                  body: "Création site e-commerce + gestion Instagram 6 mois. Résultat : 340 % de portée, 85 commandes/mois via WhatsApp.",
                },
                {
                  title: "Pharmacie — Thiès",
                  body: "Site vitrine + intégration WhatsApp livraison + SEO local. Résultat : 1er résultat Google sur 'pharmacie Thiès'.",
                },
                {
                  title: "Agence immobilière — Dakar",
                  body: "Facebook Ads + page annonces. Résultat : 50 leads qualifiés/mois, coût par lead réduit de 65 %.",
                },
                {
                  title: "Traiteur — Abidjan",
                  body: "Site devis + campagne Instagram. Résultat : 30 demandes de devis le premier mois, CA doublé en 2 mois.",
                },
              ],
            },
          },
          {
            id: "ag-real-gallery",
            type: "gallery",
            props: {
              heading: "Aperçu des projets",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Site boutique mode" },
                { src: "", alt: "Page Instagram" },
                { src: "", alt: "Site pharmacie" },
                { src: "", alt: "Campagne Facebook" },
                { src: "", alt: "Site immobilier" },
                { src: "", alt: "Contenu réseaux" },
              ],
            },
          },
          footer("ag-footer-realisations"),
        ],
      },
      {
        slug: "equipe",
        title: "Équipe",
        sections: [
          nav("ag-nav-equipe"),
          {
            id: "ag-equipe-hero",
            type: "hero",
            props: {
              heading: "Notre équipe",
              subheading: "Une équipe locale, formée au digital africain — nous comprenons votre marché.",
              buttonLabel: "Travaillons ensemble",
              buttonHref: "/contact",
              align: "left",
              background: "#0A0F2C",
            },
          },
          {
            id: "ag-equipe-list",
            type: "features",
            props: {
              heading: "L'équipe",
              items: [
                { title: "Directeur — Stratégie digitale", body: "10 ans d'expérience en marketing digital Afrique — ex-agences Dakar et Paris." },
                { title: "Développeur web", body: "Sites, boutiques, intégrations API — spécialiste mobile money et WhatsApp Business." },
                { title: "Content manager", body: "Création de contenu, réseaux sociaux, visuels — bilingue français / anglais / wolof." },
                { title: "Traffic manager", body: "Facebook Ads, Google Ads — spécialiste marché Sénégal, Côte d'Ivoire, Mali." },
              ],
            },
          },
          {
            id: "ag-equipe-gallery",
            type: "gallery",
            props: {
              heading: "L'équipe en action",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Réunion équipe" },
                { src: "", alt: "Présentation client" },
                { src: "", alt: "Atelier formation" },
              ],
            },
          },
          footer("ag-footer-equipe"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("ag-nav-contact"),
          {
            id: "ag-contact-form",
            type: "form",
            props: {
              heading: "Démarrer votre projet",
              subheading: "Décrivez votre besoin — nous vous répondons sous 24 h avec une proposition.",
              buttonLabel: "Envoyer",
              successMessage: "Message reçu — nous vous répondons sous 24 h.",
              fields: [
                { id: "nom", label: "Prénom et nom", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "email", label: "Email", type: "email", required: false, placeholder: "votre@email.com", options: [] },
                { id: "activite", label: "Type d'activité", type: "text", required: false, placeholder: "Boutique, restaurant, agence…", options: [] },
                {
                  id: "service",
                  label: "Service recherché",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: [
                    "Site web / e-commerce",
                    "Réseaux sociaux",
                    "Publicités Facebook / Google",
                    "WhatsApp Business Pro",
                    "Création de contenu",
                    "Offre complète — à définir",
                  ],
                },
                {
                  id: "budget",
                  label: "Budget mensuel envisagé",
                  type: "select",
                  required: false,
                  placeholder: "",
                  options: [
                    "Moins de 50 000 FCFA",
                    "50 000 – 150 000 FCFA",
                    "150 000 – 500 000 FCFA",
                    "Plus de 500 000 FCFA",
                  ],
                },
                {
                  id: "details",
                  label: "Décrivez votre projet",
                  type: "textarea",
                  required: false,
                  placeholder: "Objectifs, problèmes actuels, concurrents, marché cible…",
                  options: [],
                },
              ],
            },
          },
          {
            id: "ag-contact-info",
            type: "contact",
            props: {
              heading: "Nous trouver",
              email: "contact@agence-digitale.example",
              phone: "+221770000000",
              address: "Votre adresse — quartier, ville",
            },
          },
          {
            id: "ag-contact-wa",
            type: "whatsapp",
            props: {
              label: "Discuter sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais en savoir plus sur vos services digitaux.",
            },
          },
          footer("ag-footer-contact"),
        ],
      },
    ],
  };
}

import type { WebsiteDefinition } from "../website-schema";

/**
 * VOLTA STUDIO — Agence social media & création de contenu
 * Bold bright: noir + jaune éclair + blanc
 * Plus Jakarta Sans (display) + DM Sans (body)
 * Social media, contenu, reels, campagnes, Dakar
 */
export function agenceSocialMediaWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "VOLTA STUDIO",
    theme: {
      primary: "#1A1A1A",
      accent: "#FFD700",
      background: "#FAFAFA",
      text: "#1A1A1A",
      surface: "#F0F0F0",
      fontDisplay: "Plus Jakarta Sans",
      fontBody: "DM Sans",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "tight",
      radius: "soft",
      aestheticId: "bold-social-media-creative-agency",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "⚡ AUDIT GRATUIT — Analysez votre présence Instagram en 48h · Offre limitée",
              background: "#FFD700",
              color: "#1A1A1A",
              linkText: "Demander l'audit",
              linkUrl: "/contact",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Agence Social Media · Dakar",
              heading: "VOTRE MARQUE\nMÉRITE PLUS\nDE FOLLOWERS.",
              subheading:
                "VOLTA STUDIO crée du contenu qui engage, des campagnes qui convertissent et des communautés qui restent. Social media management, création de contenu, publicité digitale — pour les marques africaines qui veulent grandir.",
              primaryCta: { label: "Voir nos offres", href: "/services" },
              secondaryCta: { label: "Voir nos cas clients", href: "/portfolio" },
              backgroundImageUrl: "",
              overlay: 0.05,
              textAlign: "left",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              background: "#1A1A1A",
              items: [
                { value: "50", suffix: "+", label: "Clients actifs" },
                { value: "3M", suffix: "+", label: "Impressions/mois" },
                { value: "8%", label: "Taux engagement moyen" },
                { value: "4", label: "Ans d'expérience" },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "Ce qu'on fait",
              layout: "grid",
              items: [
                {
                  icon: "📱",
                  title: "Social media management",
                  description:
                    "Gestion complète Instagram, TikTok, Facebook — calendrier éditorial, création posts, stories, réponse commentaires. Abonnement mensuel.",
                },
                {
                  icon: "🎬",
                  title: "Création de contenu",
                  description:
                    "Reels, vidéos produits, photos lifestyle, UGC — contenu natif qui performe sur chaque plateforme.",
                },
                {
                  icon: "📣",
                  title: "Publicité Meta & TikTok Ads",
                  description:
                    "Campagnes publicitaires payantes — setup, ciblage, créatifs, optimisation. ROI mesuré, budget maîtrisé.",
                },
                {
                  icon: "📊",
                  title: "Analytics & reporting",
                  description:
                    "Rapport mensuel chiffré — portée, engagement, conversions, ROI. On vous montre ce que chaque euro/FCFA rapporte.",
                },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Nos offres",
              subheading: "Social media management — abonnements mensuels sans engagement.",
              columns: 3,
              items: [
                {
                  name: "Pack Starter",
                  description:
                    "1 réseau social. 12 posts/mois + 8 stories. Calendrier éditorial. Réponse aux commentaires. Rapport mensuel.",
                  priceLabel: "150 000 FCFA/mois",
                  imageUrl: "",
                  filterTags: ["Social Media", "Starter"],
                  ctaLabel: "Démarrer",
                  ctaHref: "https://wa.me/221780000006",
                },
                {
                  name: "Pack Growth",
                  description:
                    "2 réseaux. 20 posts + 16 stories/mois. Reels x4. Gestion publicités Meta (budget client). Rapport détaillé.",
                  priceLabel: "300 000 FCFA/mois",
                  imageUrl: "",
                  badge: "Populaire",
                  filterTags: ["Social Media", "Growth"],
                  ctaLabel: "Démarrer",
                  ctaHref: "https://wa.me/221780000006",
                },
                {
                  name: "Pack Premium",
                  description:
                    "3 réseaux. 30 posts + stories + reels + TikTok. Shooting mensuel inclus. Publicités Meta + TikTok. Stratégie complète.",
                  priceLabel: "600 000 FCFA/mois",
                  imageUrl: "",
                  filterTags: ["Social Media", "Premium"],
                  ctaLabel: "Démarrer",
                  ctaHref: "https://wa.me/221780000006",
                },
                {
                  name: "Shooting Contenu",
                  description:
                    "Session photo/vidéo demi-journée — 30 photos retouchées + 5 reels courts. Idéal pour alimenter 1 mois de contenu.",
                  priceLabel: "120 000 FCFA",
                  imageUrl: "",
                  filterTags: ["Contenu", "One-shot"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000006",
                },
                {
                  name: "Campagne Publicité Meta",
                  description:
                    "Setup + gestion publicités Facebook/Instagram — ciblage, créatifs, A/B test. Durée 1 mois. Budget min. 100 000 FCFA.",
                  priceLabel: "80 000 FCFA (gestion)",
                  imageUrl: "",
                  filterTags: ["Publicité", "One-shot"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000006",
                },
                {
                  name: "Audit Réseaux Sociaux",
                  description:
                    "Analyse complète de votre présence — compte, contenu, performances, audience. Rapport + recommandations. 48h.",
                  priceLabel: "Gratuit (offre limitée)",
                  imageUrl: "",
                  badge: "GRATUIT",
                  filterTags: ["Audit"],
                  ctaLabel: "Demander l'audit",
                  ctaHref: "https://wa.me/221780000006",
                },
              ],
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Résultats clients",
              items: [
                {
                  quote:
                    "En 3 mois avec VOLTA STUDIO, on est passé de 2 000 à 15 000 followers Instagram. Le taux d'engagement a triplé. Les commandes WhatsApp ont doublé. On n'aurait pas cru ça possible.",
                  author: "Ndéye D.",
                  role: "Fondatrice, marque beauté Dakar",
                },
                {
                  quote:
                    "VOLTA crée du contenu qui ressemble vraiment à notre marque. Les reels font 10x plus de vues qu'avant. Et leur rapport mensuel nous montre exactement où va chaque FCFA investi.",
                  author: "Seydou K.",
                  role: "Gérant, restaurant Dakar",
                },
                {
                  quote:
                    "On a lancé notre première campagne Meta avec VOLTA STUDIO. 300 000 FCFA de budget, 8 commandes directes. Le ROI était clair dès la première semaine.",
                  author: "Marème B.",
                  role: "Propriétaire, boutique mode",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Démarrer ou obtenir un audit",
              subheading:
                "Décrivez votre marque et vos objectifs. On vous répond avec une proposition sous 24h.",
              phoneNumber: "221780000006",
              message:
                "Bonjour VOLTA STUDIO — je voudrais [démarrer un abonnement / demander l'audit gratuit / autre]. Ma marque : [nom]. Réseaux actuels : [Instagram/TikTok/Facebook]. Nombre de followers actuels :",
              buttonLabel: "Nous écrire sur WhatsApp",
            },
          },
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Nos services",
              subheading: "Social media management, création de contenu, publicité digitale.",
              backgroundImageUrl: "",
              overlay: 0.5,
            },
          },
          {
            type: "features",
            props: {
              heading: "Comment on travaille",
              layout: "horizontal",
              items: [
                { icon: "🎯", title: "Audit & stratégie", description: "Analyse de votre situation, vos objectifs, votre audience. On définit la stratégie ensemble." },
                { icon: "📅", title: "Calendrier éditorial", description: "Planning de contenu mensuel validé avec vous avant publication. Aucune surprise." },
                { icon: "📲", title: "Publication & gestion", description: "On publie, on répond aux commentaires, on optimise en temps réel." },
                { icon: "📊", title: "Rapport mensuel", description: "Résultats chiffrés chaque mois — ce qui marche, ce qu'on améliore, les prochains objectifs." },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Peut-on arrêter l'abonnement à tout moment ?",
                  answer:
                    "Oui — nos abonnements sont sans engagement minimum. Préavis de 30 jours pour ne pas perturber le calendrier éditorial en cours.",
                },
                {
                  question: "On reste propriétaire de nos comptes ?",
                  answer:
                    "Toujours. Vous gardez accès admin à tous vos comptes. Nous gérons en tant qu'administrateurs délégués — jamais de prise en main exclusive.",
                },
                {
                  question: "Faites-vous les photos et vidéos aussi ?",
                  answer:
                    "Oui — notre équipe inclut photographes et vidéastes. Pack Growth et Premium incluent un shooting mensuel. Le pack Starter peut être complété par un shooting séparé.",
                },
              ],
              contactPanel: {
                heading: "Vous avez une autre question ?",
                body: "On répond sur WhatsApp sous 2h.",
                ctaLabel: "Nous écrire",
                ctaHref: "https://wa.me/221780000006",
              },
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
              heading: "Cas clients",
              subheading: "Résultats mesurables pour des marques africaines qui veulent grandir.",
              backgroundImageUrl: "",
              overlay: 0.5,
            },
          },
          {
            type: "features",
            props: {
              heading: "Secteurs",
              layout: "grid",
              items: [
                { icon: "👗", title: "Mode & beauté", description: "Marques mode, beauté, cosmétiques sénégalaises — Instagram et TikTok." },
                { icon: "🍽️", title: "Restauration", description: "Restaurants, traiteurs, food brands — contenu culinaire et géolocalisation." },
                { icon: "🏠", title: "Immobilier", description: "Agences et promoteurs — campagnes Meta ciblage Dakar + diaspora." },
                { icon: "💼", title: "Services B2B", description: "Cabinets, agences, prestataires — personal branding et génération de leads." },
                { icon: "🛒", title: "E-commerce", description: "Boutiques en ligne — campagnes conversions, retargeting, catalogue Ads." },
                { icon: "🎵", title: "Musique & culture", description: "Artistes, événements, labels — community building et promotion de sortie." },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Contenus créés",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Reels marque beauté — Instagram Dakar" },
                { src: "", alt: "Shooting contenu restaurant — VOLTA" },
                { src: "", alt: "Campagne Meta — mode sénégalaise" },
                { src: "", alt: "TikTok food — restaurant Dakar" },
                { src: "", alt: "Contenu produit — beauté africaine" },
                { src: "", alt: "Shooting lifestyle — marque locale" },
              ],
              instagramHandle: "@voltastudio.dk",
              followLabel: "Voir notre travail",
            },
          },
        ],
      },
    ],
  };
}

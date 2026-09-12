import type { WebsiteDefinition } from "../website-schema";

/**
 * OBLIQ STUDIO — Décoration d'intérieur & aménagement
 * Warm brutalist: beige béton + noir + terracotta
 * DM Serif Display (display) + Inter (body)
 * Studio distinct de architecture-world : focus décoration & mobilier
 */
export function decoInterieurWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: 1,
    title: "OBLIQ STUDIO",
    theme: {
      primary: "#1A1614",
      accent: "#C4694B",
      background: "#F2EDE8",
      text: "#1A1614",
      fontHeading: "DM Serif Display",
      fontBody: "Inter",
      borderRadius: "none",
      spacing: "airy",
      aestheticId: "warm-brutalist-interior-design",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Décoration d'intérieur · Dakar",
              heading: "Des espaces\ntaillés pour\nvotre vie.",
              subheading:
                "OBLIQ STUDIO conçoit et aménage des intérieurs résidentiels et commerciaux à Dakar. Du concept à la livraison clé en main.",
              primaryCta: { label: "Voir nos projets", href: "/projets" },
              secondaryCta: { label: "Consultation gratuite", href: "https://wa.me/221790000000" },
              backgroundImageUrl: "",
              overlay: 0.5,
              textAlign: "left",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "95", suffix: "+", label: "Projets livrés" },
                { value: "9", label: "Ans d'expérience" },
                { value: "100%", label: "Clé en main" },
                { value: "4.9", prefix: "★", label: "Clients satisfaits" },
              ],
            },
          },
          {
            type: "marquee",
            props: {
              items: [
                "Résidentiel",
                "Hôtellerie",
                "Bureaux & Coworking",
                "Boutiques",
                "Restaurants",
                "Villas & Appartements",
                "Espaces événementiels",
                "Mobilier sur-mesure",
              ],
              speed: "normal",
              separator: "·",
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Projets récents",
              layout: "masonry",
              images: [
                { url: "", alt: "Villa résidentielle Almadies — salon principal" },
                { url: "", alt: "Restaurant terracotta et béton ciré" },
                { url: "", alt: "Appartement minimaliste Plateau" },
                { url: "", alt: "Boutique mode Medina" },
                { url: "", alt: "Espace coworking Dakar" },
                { url: "", alt: "Suite hôtel balnéaire Saly" },
              ],
              instagramHandle: "@obliq.studio",
              followLabel: "Voir sur Instagram",
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Notre approche",
              heading: "Chaque projet commence par une écoute profonde.",
              body: "Chez OBLIQ STUDIO, nous ne plaquons pas un style prédéfini sur votre espace. Nous partons de votre mode de vie, de vos habitudes et de votre budget pour créer un intérieur qui vous ressemble — beau et fonctionnel. Notre équipe gère l'ensemble du chantier : plans, mobilier, matériaux, artisans.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Notre processus", href: "/services" },
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Nos spécialités",
              tiles: [
                {
                  label: "Résidentiel",
                  description: "Villas, appartements, maisons — des espaces qui racontent votre histoire",
                  imageUrl: "",
                  href: "/projets",
                },
                {
                  label: "Commercial",
                  description: "Boutiques, restaurants, hôtels — des espaces qui vendent",
                  imageUrl: "",
                  href: "/projets",
                },
                {
                  label: "Bureaux",
                  description: "Open spaces, salles de réunion, coworking — travailler mieux",
                  imageUrl: "",
                  href: "/projets",
                },
                {
                  label: "Mobilier Sur-Mesure",
                  description: "Meubles fabriqués par nos artisans partenaires au Sénégal",
                  imageUrl: "",
                  href: "/services",
                },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "Ce qui nous distingue",
              layout: "horizontal",
              items: [
                {
                  icon: "🎨",
                  title: "Design ancré localement",
                  description:
                    "Nous intégrons des matériaux, des artisanats et des artistes sénégalais dans chaque projet.",
                },
                {
                  icon: "🔨",
                  title: "Clé en main complet",
                  description:
                    "Plans, sourcing, artisans, suivi chantier et livraison finale. Vous n'avez rien à coordonner.",
                },
                {
                  icon: "💰",
                  title: "Budget transparent",
                  description:
                    "Devis détaillé poste par poste. Pas de surprise en cours de chantier.",
                },
                {
                  icon: "⏱️",
                  title: "Délais respectés",
                  description:
                    "Engagement contractuel sur les délais. Pénalité de retard appliquée si dépassement.",
                },
              ],
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ils vivent dans leurs espaces OBLIQ",
              items: [
                {
                  quote:
                    "OBLIQ a transformé notre appartement en quelque chose que nous n'aurions jamais imaginé. Chaque détail est pensé, chaque matière choisie avec soin.",
                  author: "Famille Diallo",
                  role: "Villa Almadies, Dakar",
                },
                {
                  quote:
                    "Notre restaurant a multiplié ses réservations par 3 après l'ouverture. L'espace est beau, fonctionnel et la clientèle adore partager des photos.",
                  author: "Chef Oumar",
                  role: "Restaurant Le Terracotta, Plateau",
                },
                {
                  quote:
                    "Livraison en 8 semaines comme promis, budget respecté à 100%. Je recommande OBLIQ à tous mes clients qui construisent.",
                  author: "Mme Ndiaye",
                  role: "Architecte, Dakar",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Consultation gratuite",
              subheading:
                "Décrivez votre espace et votre projet. Notre designer vous rappelle sous 24h.",
              phoneNumber: "221790000000",
              message:
                "Bonjour OBLIQ STUDIO, je souhaite une consultation pour [appartement / villa / boutique / bureau] de [superficie approximative] m² à [ville/quartier]. Budget indicatif : [montant] FCFA.",
              buttonLabel: "Demander une consultation",
            },
          },
        ],
      },
      {
        slug: "projets",
        title: "Projets",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Nos projets",
              subheading: "95+ projets résidentiels et commerciaux. Dakar et environs.",
              backgroundImageUrl: "",
              overlay: 0.5,
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Par type",
              tiles: [
                { label: "Résidentiel", description: "Villas, appartements, maisons", imageUrl: "", href: "/projets" },
                { label: "Commercial", description: "Restaurants, boutiques, hôtels", imageUrl: "", href: "/projets" },
                { label: "Bureaux", description: "Open spaces, coworking", imageUrl: "", href: "/projets" },
                { label: "Outdoor", description: "Terrasses, jardins, rooftops", imageUrl: "", href: "/projets" },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "",
              layout: "masonry",
              images: [
                { url: "", alt: "Projet résidentiel 1" },
                { url: "", alt: "Projet restaurant 1" },
                { url: "", alt: "Projet bureau 1" },
                { url: "", alt: "Projet résidentiel 2" },
                { url: "", alt: "Projet boutique 1" },
                { url: "", alt: "Projet hôtel 1" },
                { url: "", alt: "Projet résidentiel 3" },
                { url: "", alt: "Projet coworking 1" },
              ],
            },
          },
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          {
            type: "features",
            props: {
              heading: "Notre processus en 5 étapes",
              layout: "horizontal",
              items: [
                { icon: "🗣️", title: "1. Consultation", description: "Écoute de votre projet, visite de l'espace, analyse des contraintes et du budget." },
                { icon: "📐", title: "2. Concept", description: "Moodboard, plan d'aménagement, palette matières & couleurs. Présentation en 1 semaine." },
                { icon: "🛋️", title: "3. Sourcing", description: "Sélection mobilier, matériaux et artisans. Devis détaillé par poste." },
                { icon: "🔨", title: "4. Chantier", description: "Coordination des artisans, suivi quotidien, contrôle qualité à chaque étape." },
                { icon: "🗝️", title: "5. Livraison", description: "Visite finale, mise en scène photographique, guide d'entretien remis." },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Forfaits",
              subheading:
                "Honoraires design uniquement — hors mobilier, matériaux et travaux. Devis complet disponible après consultation.",
              columns: 3,
              items: [
                {
                  name: "Consultation Design",
                  description:
                    "2h de consultation, moodboard et liste d'achats recommandée. Idéal pour un rafraîchissement sans travaux.",
                  price: 75000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "Pièce unique",
                  description:
                    "Design complet d'une pièce (salon, chambre, cuisine). Plan, sourcing, suivi chantier.",
                  price: 300000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Démarrer",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "Appartement complet",
                  description:
                    "Design et coordination complète d'un appartement de 2–4 pièces. Clé en main.",
                  price: 750000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Recommandé",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221790000000",
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
                  question: "Intervenez-vous hors de Dakar ?",
                  answer:
                    "Oui, nous avons réalisé des projets à Saly, Saint-Louis et en Casamance. Des frais de déplacement s'appliquent selon la distance.",
                },
                {
                  question: "Puis-je garder mon mobilier existant ?",
                  answer:
                    "Absolument. Nous intégrons vos pièces existantes dans le nouveau concept. Nous proposons aussi une rénovation ou relooking de certains meubles.",
                },
                {
                  question: "Quelle est la durée minimale d'un chantier ?",
                  answer:
                    "Pour une pièce simple sans travaux lourds : 2 à 3 semaines. Un appartement complet prend généralement 6 à 12 semaines selon l'ampleur.",
                },
              ],
              contactPanel: {
                heading: "Un projet en tête ?",
                body: "Consultation initiale gratuite. Nous vous rappelons sous 24h.",
                ctaLabel: "Prendre rendez-vous",
                ctaHref: "https://wa.me/221790000000",
              },
            },
          },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          {
            type: "contact",
            props: {
              heading: "Notre studio",
              subheading: "Ouvert lundi–vendredi 9h–17h. Consultations sur rendez-vous.",
              address: "OBLIQ STUDIO — Mermoz, Dakar, Sénégal",
              phone: "+221 79 000 00 00",
              email: "bonjour@obliq.studio",
              mapEmbedUrl: "",
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Parlez-nous de votre espace",
              subheading: "Envoyez-nous des photos, un plan ou décrivez simplement votre projet.",
              phoneNumber: "221790000000",
              message: "Bonjour OBLIQ STUDIO, je voudrais discuter d'un projet de décoration pour [type d'espace] à [ville/quartier].",
              buttonLabel: "Nous écrire",
            },
          },
        ],
      },
    ],
  };
}

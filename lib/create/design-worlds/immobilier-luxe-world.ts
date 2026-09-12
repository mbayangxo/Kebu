import type { WebsiteDefinition } from "../website-schema";

/**
 * MAISON SALL PRESTIGE — Immobilier de luxe Dakar
 * Elegant monochrome: noir carbone + or champagne + blanc cassé
 * Playfair Display (display) + Inter (body)
 * Villas, appartements et terrains haut de gamme, Dakar Almadies / Ngor / Plateau
 */
export function immobilierLuxeWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: 1,
    title: "MAISON SALL Prestige",
    theme: {
      primary: "#111111",
      accent: "#B89E6A",
      background: "#F8F7F4",
      text: "#111111",
      fontHeading: "Playfair Display",
      fontBody: "Inter",
      borderRadius: "none",
      spacing: "airy",
      aestheticId: "luxury-real-estate-prestige",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Immobilier de prestige · Dakar",
              heading: "L'exception\nimmobilière\nà Dakar.",
              subheading:
                "Villas, penthouses et propriétés d'exception aux Almadies, Ngor, Plateau et Point E. Vente, location et gestion locative premium.",
              primaryCta: { label: "Voir les biens", href: "/biens" },
              secondaryCta: { label: "Estimation gratuite", href: "https://wa.me/221776000000" },
              backgroundImageUrl: "",
              overlay: 0.6,
              textAlign: "center",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "180", suffix: "+", label: "Propriétés vendues" },
                { value: "15", label: "Ans d'expertise" },
                { value: "XOF 2Mds", label: "Volume traité 2024" },
                { value: "98", suffix: "%", label: "Clients satisfaits" },
              ],
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Nos segments",
              tiles: [
                {
                  label: "Villas",
                  description: "Résidences privées avec piscine, jardin et vue mer",
                  imageUrl: "",
                  href: "/biens",
                },
                {
                  label: "Appartements",
                  description: "Penthouses et résidences de standing à Dakar",
                  imageUrl: "",
                  href: "/biens",
                },
                {
                  label: "Terrains",
                  description: "Parcelles titrées dans les zones résidentielles premiums",
                  imageUrl: "",
                  href: "/biens",
                },
                {
                  label: "Gestion locative",
                  description: "Confiez votre bien à nos gestionnaires certifiés",
                  imageUrl: "",
                  href: "/services",
                },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Biens en vedette",
              subheading: "Une sélection de nos propriétés exclusives actuellement disponibles.",
              columns: 3,
              items: [
                {
                  name: "Villa Vue Mer — Les Almadies",
                  description:
                    "5 chambres, 4 SDB, piscine à débordement, terrasse vue Atlantique, garage 3 voitures. 620m² habitable.",
                  price: 650000000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Exclusivité",
                  ctaLabel: "Demander une visite",
                  ctaHref: "https://wa.me/221776000000",
                },
                {
                  name: "Penthouse — Plateau",
                  description:
                    "Duplex 280m², rooftop privé, domotique intégrée, vue panoramique sur la Médina. Résidence sécurisée 24h.",
                  price: 280000000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander une visite",
                  ctaHref: "https://wa.me/221776000000",
                },
                {
                  name: "Villa Contemporary — Point E",
                  description:
                    "Architecture signée, 4 chambres en suite, cuisine ouverte Bulthaup, jardin paysagé et pool. 480m².",
                  price: 420000000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Coup de cœur",
                  ctaLabel: "Demander une visite",
                  ctaHref: "https://wa.me/221776000000",
                },
                {
                  name: "Appartement Ngor — Vue Île",
                  description:
                    "3 chambres, terrasse 50m², vue directe sur l'île de Ngor. Résidence fermée avec gardien.",
                  price: 120000000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander une visite",
                  ctaHref: "https://wa.me/221776000000",
                },
                {
                  name: "Terrain Titré — Saly Portudal",
                  description:
                    "1 000m² en zone R2, titre foncier disponible, accès bord de mer à 200m. Idéal villa ou résidence.",
                  price: 85000000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander des infos",
                  ctaHref: "https://wa.me/221776000000",
                },
                {
                  name: "Bien sur mandat",
                  description:
                    "Nous avons des biens non publiés disponibles selon vos critères. Partagez-nous votre projet.",
                  price: 0,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Sur demande",
                  ctaLabel: "Nous contacter",
                  ctaHref: "https://wa.me/221776000000",
                },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "L'accompagnement MAISON SALL",
              layout: "horizontal",
              items: [
                {
                  icon: "🔍",
                  title: "Recherche sur mesure",
                  description:
                    "Nous trouvons des biens non publiés correspondant exactement à vos critères.",
                },
                {
                  icon: "⚖️",
                  title: "Sécurité juridique",
                  description:
                    "Vérification des titres fonciers, purge des hypothèques et rédaction des actes.",
                },
                {
                  icon: "🏦",
                  title: "Financement",
                  description:
                    "Partenariats avec les principales banques du Sénégal pour faciliter votre crédit immobilier.",
                },
                {
                  icon: "🗝️",
                  title: "Gestion locative",
                  description:
                    "Mise en location, sélection des locataires, gestion des loyers et entretien.",
                },
              ],
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ils nous ont fait confiance",
              items: [
                {
                  quote:
                    "MAISON SALL a trouvé ma villa des Almadies en 3 semaines. Titre foncier vérifié, transaction sécurisée. Une équipe d'une grande compétence.",
                  author: "Ibrahima F.",
                  role: "Acquéreur, villa Almadies",
                },
                {
                  quote:
                    "J'avais un budget précis et des exigences strictes. Ils ont trouvé exactement ce que je cherchais à Point E. Très professionnel.",
                  author: "Mme Diallo",
                  role: "Acquéreur, appartement Point E",
                },
                {
                  quote:
                    "La gestion locative de mon appartement est irréprochable. Je reçois mon loyer chaque mois sans stress. Je recommande vivement.",
                  author: "Ousseynou N.",
                  role: "Propriétaire bailleur",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Décrire votre projet",
              subheading:
                "Partagez vos critères : type de bien, zone, budget, délai. Nous vous rappelons sous 24h.",
              phoneNumber: "221776000000",
              message:
                "Bonjour MAISON SALL, je recherche [villa / appartement / terrain] à [Almadies / Plateau / autre] avec un budget de [montant] FCFA. Je suis [acheteur / investisseur / locataire]. Merci.",
              buttonLabel: "Décrire votre projet",
            },
          },
        ],
      },
      {
        slug: "biens",
        title: "Nos biens",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Propriétés disponibles",
              subheading:
                "Villas, appartements et terrains. Vente et location longue durée.",
              backgroundImageUrl: "",
              overlay: 0.55,
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Galerie",
              layout: "masonry",
              images: [
                { url: "", alt: "Villa piscine Almadies" },
                { url: "", alt: "Penthouse Plateau" },
                { url: "", alt: "Villa Point E" },
                { url: "", alt: "Appartement Ngor" },
                { url: "", alt: "Terrain Saly" },
                { url: "", alt: "Intérieur villa" },
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
            type: "split",
            props: {
              eyebrow: "Gestion locative",
              heading: "Votre bien, bien géré.",
              body: "Confiez votre appartement ou villa à notre équipe. Nous nous chargeons de tout : sélection rigoureuse des locataires, états des lieux, encaissement des loyers et maintenance. Vous percevez votre revenu locatif nettement, sans contrainte.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "En savoir plus", href: "https://wa.me/221776000000" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Nos services complets",
              layout: "grid",
              items: [
                { icon: "🏠", title: "Achat & Vente", description: "Recherche, négociation, acte notarié et remise des clés." },
                { icon: "📋", title: "Estimation", description: "Évaluation précise de votre bien au prix du marché actuel." },
                { icon: "🔑", title: "Location", description: "Mise en location courte et longue durée avec sélection des locataires." },
                { icon: "🛠️", title: "Rénovation", description: "Réseau d'artisans certifiés pour valoriser votre bien avant vente." },
                { icon: "📊", title: "Conseil investissement", description: "Analyse de rentabilité et conseil patrimonial personnalisé." },
                { icon: "⚖️", title: "Suivi juridique", description: "Vérification titres, purge d'hypothèques, accompagnement notaire." },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Quels sont vos honoraires de vente ?",
                  answer:
                    "Nos honoraires sont à la charge du vendeur : 5% HT du prix de vente, payables uniquement à la signature de l'acte authentique.",
                },
                {
                  question: "Comment se déroule une estimation gratuite ?",
                  answer:
                    "Un expert visite votre bien, analyse les transactions récentes dans le quartier et vous remet un rapport d'estimation sous 48h.",
                },
                {
                  question: "Prenez-vous en charge les biens hors Dakar ?",
                  answer:
                    "Oui, nous intervenons à Thiès, Saint-Louis, Saly et dans les zones touristiques de Casamance.",
                },
              ],
              contactPanel: {
                heading: "Un projet immobilier ?",
                body: "Partagez vos critères et nous vous aidons à trouver la propriété idéale ou à vendre au meilleur prix.",
                ctaLabel: "Nous contacter",
                ctaHref: "https://wa.me/221776000000",
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
              heading: "Notre bureau",
              subheading: "Ouvert du lundi au vendredi 9h–18h, samedi 10h–14h. Visites sur rendez-vous.",
              address: "MAISON SALL Prestige — Almadies, Dakar, Sénégal",
              phone: "+221 77 600 00 00",
              email: "prestige@maisonsall.sn",
              mapEmbedUrl: "",
            },
          },
          {
            type: "form",
            props: {
              heading: "Décrire votre projet",
              subheading: "Remplissez ce formulaire et un conseiller vous contacte sous 24h.",
              submitLabel: "Envoyer ma demande",
              fields: [
                { name: "nom", label: "Nom complet", type: "text", required: true },
                { name: "telephone", label: "Téléphone", type: "tel", required: true },
                { name: "email", label: "Email", type: "email", required: false },
                {
                  name: "type_projet",
                  label: "Type de projet",
                  type: "select",
                  required: true,
                  options: [
                    { value: "achat", label: "Achat" },
                    { value: "vente", label: "Vente" },
                    { value: "location", label: "Location" },
                    { value: "gestion_locative", label: "Gestion locative" },
                    { value: "estimation", label: "Estimation gratuite" },
                    { value: "investissement", label: "Conseil investissement" },
                  ],
                },
                { name: "zone", label: "Zone / quartier souhaité", type: "text", required: false },
                { name: "budget", label: "Budget (FCFA)", type: "text", required: false },
                { name: "message", label: "Décrivez votre projet", type: "textarea", required: true },
              ],
            },
          },
        ],
      },
    ],
  };
}

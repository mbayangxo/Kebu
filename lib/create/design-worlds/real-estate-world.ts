import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Real Estate / Immobilier — West African property agency.
 * Property cards, agent WhatsApp per listing, map, mobile money deposit.
 * IA: Home · Vente · Location · Agents · Contact
 */

const NAV = [
  { label: "Vente", href: "/vente" },
  { label: "Location", href: "/location" },
  { label: "Agents", href: "/agents" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "Immo", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Immo — biens à vendre et à louer dans la région.",
      links: [
        { label: "Vente", href: "/vente" },
        { label: "Location", href: "/location" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function realEstateWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Immobilier",
    theme: {
      primary: "#1A2744",
      accent: "#2D7DD2",
      background: "#F5F7FA",
      text: "#1A2744",
      fontDisplay: "DM Sans",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "corporate-blue",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("immo-nav-home"),
          {
            id: "immo-hero",
            type: "hero",
            props: {
              heading: "Trouvez votre prochain bien",
              subheading:
                "Appartements, villas, terrains — achat ou location dans les meilleurs quartiers. Agent dédié sur WhatsApp.",
              buttonLabel: "Voir les annonces",
              buttonHref: "/vente",
              align: "left",
              background: "#1A2744",
            },
          },
          {
            id: "immo-types",
            type: "features",
            props: {
              heading: "Ce que nous proposons",
              items: [
                {
                  title: "Vente",
                  body: "Appartements F2 à F5, villas, terrains constructibles — propriétés vérifiées.",
                },
                {
                  title: "Location",
                  body: "Meublé ou non meublé — contrat mensuel ou annuel, état des lieux complet.",
                },
                {
                  title: "Gestion locative",
                  body: "On gère votre bien à votre place — loyers, réparations, locataires.",
                },
              ],
            },
          },
          {
            id: "immo-listings-preview",
            type: "features",
            props: {
              heading: "Annonces récentes",
              items: [
                {
                  title: "Villa F4 — Almadies",
                  body: "4 chambres, 2 salles de bain, jardin 300 m² — 85 M FCFA. Agent : +221 77 XXX XXXX",
                },
                {
                  title: "Appartement F3 — Plateau",
                  body: "3 chambres, parking, gardien — 350 000 FCFA/mois. Agent : +221 77 XXX XXXX",
                },
                {
                  title: "Terrain — Diamniadio",
                  body: "500 m², titre foncier, zone résidentielle — 25 M FCFA. Agent : +221 77 XXX XXXX",
                },
              ],
            },
          },
          {
            id: "immo-gallery",
            type: "gallery",
            props: {
              heading: "Nos biens",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Villa 1" },
                { src: "", alt: "Appartement" },
                { src: "", alt: "Terrain" },
              ],
            },
          },
          {
            id: "immo-whatsapp",
            type: "whatsapp",
            props: {
              label: "Parler à un agent sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je cherche un bien immobilier. Pouvez-vous m'aider ?",
            },
          },
          {
            id: "immo-testimonials",
            type: "testimonials",
            props: {
              heading: "Ils nous font confiance",
              items: [
                {
                  quote: "Appartement trouvé en 2 semaines. Agent très réactif sur WhatsApp.",
                  name: "Cheikh M.",
                  role: "Locataire",
                },
                {
                  quote: "Gestion locative sérieuse — loyers versés à temps chaque mois.",
                  name: "Mariama D.",
                  role: "Propriétaire",
                },
              ],
            },
          },
          footer("immo-footer-home"),
        ],
      },
      {
        slug: "vente",
        title: "Vente",
        sections: [
          nav("immo-nav-vente"),
          {
            id: "immo-vente-hero",
            type: "hero",
            props: {
              heading: "Biens à vendre",
              subheading: "Appartements, villas, terrains — contactez l'agent dédié par WhatsApp.",
              buttonLabel: "Parler à un agent",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#1A2744",
            },
          },
          {
            id: "immo-vente-list",
            type: "features",
            props: {
              heading: "Annonces à vendre",
              items: [
                {
                  title: "Villa F5 — Ngor",
                  body: "5 chambres, piscine, vue mer partielle, 2 garages — 150 M FCFA. WhatsApp agent : +221 77 000 0001",
                },
                {
                  title: "Appartement F3 — Mermoz",
                  body: "3 chambres, cuisine équipée, balcon — 45 M FCFA. WhatsApp agent : +221 77 000 0002",
                },
                {
                  title: "Terrain plat — Thiès",
                  body: "1 000 m², titre foncier, accès route — 8 M FCFA. WhatsApp agent : +221 77 000 0003",
                },
              ],
            },
          },
          {
            id: "immo-vente-gallery",
            type: "gallery",
            props: {
              heading: "Photos",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Villa Ngor" },
                { src: "", alt: "Appartement Mermoz" },
                { src: "", alt: "Terrain Thiès" },
              ],
            },
          },
          {
            id: "immo-vente-wa",
            type: "whatsapp",
            props: {
              label: "Demander plus d'informations",
              phone: "+221770000000",
              message: "Bonjour — je suis intéressé(e) par un bien en vente.",
            },
          },
          footer("immo-footer-vente"),
        ],
      },
      {
        slug: "location",
        title: "Location",
        sections: [
          nav("immo-nav-location"),
          {
            id: "immo-location-hero",
            type: "hero",
            props: {
              heading: "Biens à louer",
              subheading: "Meublés ou non meublés — contrat sérieux, état des lieux inclus.",
              buttonLabel: "Contacter un agent",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#1A2744",
            },
          },
          {
            id: "immo-location-list",
            type: "features",
            props: {
              heading: "Annonces à louer",
              items: [
                {
                  title: "Studio meublé — Dakar Plateau",
                  body: "Studio, cuisine équipée, clim — 150 000 FCFA/mois. Agent : +221 77 000 0001",
                },
                {
                  title: "Appartement F2 — Pikine",
                  body: "2 chambres, sécurisé, gardien — 80 000 FCFA/mois. Agent : +221 77 000 0002",
                },
                {
                  title: "Villa F4 — Sacré-Cœur",
                  body: "4 chambres, jardin, parking couvert — 600 000 FCFA/mois. Agent : +221 77 000 0003",
                },
              ],
            },
          },
          {
            id: "immo-location-wa",
            type: "whatsapp",
            props: {
              label: "Chercher une location sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je cherche un bien à louer.",
            },
          },
          footer("immo-footer-location"),
        ],
      },
      {
        slug: "agents",
        title: "Agents",
        sections: [
          nav("immo-nav-agents"),
          {
            id: "immo-agents-hero",
            type: "hero",
            props: {
              heading: "Notre équipe",
              subheading: "Des agents de terrain disponibles sur WhatsApp — réponse rapide garantie.",
              buttonLabel: "Nous contacter",
              buttonHref: "/contact",
              align: "left",
              background: "#1A2744",
            },
          },
          {
            id: "immo-agents-list",
            type: "features",
            props: {
              heading: "Nos agents",
              items: [
                { title: "Agent 1 — Dakar", body: "Spécialiste vente appartements et villas. WhatsApp : +221 77 000 0001" },
                { title: "Agent 2 — Rufisque", body: "Location et gestion locative. WhatsApp : +221 77 000 0002" },
                { title: "Agent 3 — Thiès", body: "Terrains et biens en région. WhatsApp : +221 77 000 0003" },
              ],
            },
          },
          footer("immo-footer-agents"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("immo-nav-contact"),
          {
            id: "immo-contact-section",
            type: "contact",
            props: {
              heading: "Agence immobilière",
              email: "contact@immo.example",
              phone: "+221770000000",
              address: "Votre adresse — quartier, ville",
            },
          },
          {
            id: "immo-faq",
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                {
                  question: "Comment visiter un bien ?",
                  answer: "Envoyez-nous un WhatsApp — l'agent vous propose un créneau sous 24 h.",
                },
                {
                  question: "Quels documents faut-il pour louer ?",
                  answer: "CNI ou passeport, fiche de paie ou justificatif de revenus — variable selon le bien.",
                },
                {
                  question: "Acceptez-vous le paiement Wave ?",
                  answer: "Oui — Wave, Orange Money et virement bancaire. Reçu fourni.",
                },
              ],
            },
          },
          footer("immo-footer-contact"),
        ],
      },
    ],
  };
}

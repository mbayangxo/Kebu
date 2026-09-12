import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Traiteur / Catering — West African event catering service.
 * Package-based pricing, event gallery, mobile money payment, WhatsApp quote.
 * IA: Home · Formules · Galerie · Devis · Contact
 */

const NAV = [
  { label: "Formules", href: "/formules" },
  { label: "Galerie", href: "/galerie" },
  { label: "Devis gratuit", href: "/devis" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "Traiteur", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Traiteur — mariages, baptêmes, événements d'entreprise.",
      links: [
        { label: "Formules", href: "/formules" },
        { label: "Devis", href: "/devis" },
      ],
    },
  };
}

export function traiteurWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Traiteur",
    theme: {
      primary: "#3D0C11",
      accent: "#C2854E",
      background: "#FDF9F5",
      text: "#3D0C11",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Lato",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "sahel-warm",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("traiteur-nav-home"),
          {
            id: "traiteur-hero",
            type: "hero",
            props: {
              heading: "Vos événements, nos recettes",
              subheading:
                "Mariage, baptême, cérémonie d'entreprise — menus sur mesure, livraison, montage sur place.",
              buttonLabel: "Demander un devis",
              buttonHref: "/devis",
              align: "left",
              background: "#3D0C11",
            },
          },
          {
            id: "traiteur-services",
            type: "features",
            props: {
              heading: "Ce que nous faisons",
              items: [
                {
                  title: "Mariages & cérémonies",
                  body: "Buffet complet, service à table, décoration des buffets — de 50 à 500 personnes.",
                },
                {
                  title: "Baptêmes & ngentés",
                  body: "Thiéboudienne, mafé, thiou boulettes — préparés le jour même.",
                },
                {
                  title: "Événements d'entreprise",
                  body: "Déjeuners, cocktails, formations — menus équilibrés, livraison ponctuelle.",
                },
              ],
            },
          },
          {
            id: "traiteur-gallery-home",
            type: "gallery",
            props: {
              heading: "Nos réalisations",
              layout: "featured",
              columns: 3,
              items: [
                { src: "", alt: "Mariage 1" },
                { src: "", alt: "Buffet baptême" },
                { src: "", alt: "Déjeuner entreprise" },
              ],
            },
          },
          {
            id: "traiteur-whatsapp",
            type: "whatsapp",
            props: {
              label: "Devis rapide sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je cherche un traiteur pour un événement. Pouvez-vous me faire un devis ?",
            },
          },
          {
            id: "traiteur-testimonials",
            type: "testimonials",
            props: {
              heading: "Ils nous ont fait confiance",
              items: [
                {
                  quote: "Mariage de 300 personnes, tout s'est passé parfaitement. Merci infiniment !",
                  name: "Aminata N.",
                  role: "Mariée",
                },
                {
                  quote: "Menus savoureux, service impeccable, livraison à l'heure.",
                  name: "Directeur RH, Entreprise XYZ",
                  role: "Client entreprise",
                },
              ],
            },
          },
          footer("traiteur-footer-home"),
        ],
      },
      {
        slug: "formules",
        title: "Formules",
        sections: [
          nav("traiteur-nav-formules"),
          {
            id: "traiteur-formules-hero",
            type: "hero",
            props: {
              heading: "Nos formules",
              subheading: "Des packages adaptés à chaque budget — paiement en plusieurs fois disponible.",
              buttonLabel: "Demander un devis",
              buttonHref: "/devis",
              align: "center",
              background: "#3D0C11",
            },
          },
          {
            id: "traiteur-formules-list",
            type: "features",
            props: {
              heading: "Ce que comprend chaque formule",
              items: [
                {
                  title: "Formule Essentiel",
                  body: "1 plat principal + riz ou attiéké + jus — idéal pour les petits budgets (min. 30 personnes).",
                },
                {
                  title: "Formule Confort",
                  body: "Entrée + 2 plats + dessert + jus — pour baptêmes et cérémonies familiales.",
                },
                {
                  title: "Formule Prestige",
                  body: "Menu complet 4 services + personnel de service + décoration buffet — mariages et galas.",
                },
              ],
            },
          },
          {
            id: "traiteur-paiement",
            type: "text",
            props: {
              heading: "Paiement flexible",
              body: "Nous acceptons le paiement en plusieurs fois : acompte de 50% à la commande, solde la veille de l'événement. Modes de paiement : Wave, Orange Money, espèces — à mettre à jour selon votre traiteur.",
            },
          },
          footer("traiteur-footer-formules"),
        ],
      },
      {
        slug: "galerie",
        title: "Galerie",
        sections: [
          nav("traiteur-nav-galerie"),
          {
            id: "traiteur-galerie-hero",
            type: "hero",
            props: {
              heading: "Galerie",
              subheading: "Ajoutez ici vos plus belles photos d'événements.",
              buttonLabel: "Demander un devis",
              buttonHref: "/devis",
              align: "left",
              background: "#3D0C11",
            },
          },
          {
            id: "traiteur-galerie-grid",
            type: "gallery",
            props: {
              heading: "Événements récents",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Mariage 1" },
                { src: "", alt: "Mariage 2" },
                { src: "", alt: "Baptême" },
                { src: "", alt: "Gala entreprise" },
                { src: "", alt: "Buffet" },
                { src: "", alt: "Service table" },
              ],
            },
          },
          footer("traiteur-footer-galerie"),
        ],
      },
      {
        slug: "devis",
        title: "Devis",
        sections: [
          nav("traiteur-nav-devis"),
          {
            id: "traiteur-devis-hero",
            type: "hero",
            props: {
              heading: "Devis gratuit",
              subheading:
                "Remplissez le formulaire — nous vous rappelons sous 24 h avec une proposition personnalisée.",
              buttonLabel: "WhatsApp",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#3D0C11",
            },
          },
          {
            id: "traiteur-devis-form",
            type: "form",
            props: {
              heading: "Demande de devis",
              subheading: "Plus vous donnez de détails, plus notre devis sera précis.",
              buttonLabel: "Envoyer la demande",
              successMessage: "Demande reçue — nous vous contactons dans les 24 h.",
              fields: [
                { id: "nom", label: "Prénom et nom", type: "text", required: true, placeholder: "", options: [] },
                {
                  id: "telephone",
                  label: "WhatsApp / téléphone",
                  type: "phone",
                  required: true,
                  placeholder: "+221…",
                  options: [],
                },
                {
                  id: "type_event",
                  label: "Type d'événement",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Mariage", "Baptême / Ngenté", "Anniversaire", "Événement entreprise", "Autre"],
                },
                {
                  id: "nb_personnes",
                  label: "Nombre de personnes",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Moins de 30", "30–100", "100–200", "200–500", "Plus de 500"],
                },
                {
                  id: "details",
                  label: "Date, lieu et plats souhaités",
                  type: "textarea",
                  required: true,
                  placeholder: "15 mars · Rufisque · Thiéboudienne + mafé + jus",
                  options: [],
                },
              ],
            },
          },
          {
            id: "traiteur-devis-wa",
            type: "whatsapp",
            props: {
              label: "Devis express sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je cherche un traiteur pour un événement. Pouvez-vous me faire un devis ?",
            },
          },
          footer("traiteur-footer-devis"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("traiteur-nav-contact"),
          {
            id: "traiteur-contact-section",
            type: "contact",
            props: {
              heading: "Nous contacter",
              email: "contact@traiteur.example",
              phone: "+221770000000",
              address: "Votre adresse — quartier, ville",
            },
          },
          footer("traiteur-footer-contact"),
        ],
      },
    ],
  };
}

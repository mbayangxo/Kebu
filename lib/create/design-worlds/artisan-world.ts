import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Artisan / Craftmaker — West African artisan: leather, weaving, woodwork, pottery.
 * Product catalog, custom orders, mobile money, WhatsApp direct.
 * IA: Home · Catalogue · Sur mesure · Boutique · Contact
 */

const NAV = [
  { label: "Catalogue", href: "/catalogue" },
  { label: "Sur mesure", href: "/sur-mesure" },
  { label: "Boutique", href: "/boutique" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "Artisan", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Artisan — savoir-faire local, pièces uniques.",
      links: [
        { label: "Catalogue", href: "/catalogue" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function artisanWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Artisan",
    theme: {
      primary: "#4A3728",
      accent: "#C68642",
      background: "#FBF7F2",
      text: "#2C1B0E",
      fontDisplay: "Playfair Display",
      fontBody: "Source Sans 3",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "sahel-earth",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("artisan-nav-home"),
          {
            id: "artisan-hero",
            type: "hero",
            props: {
              heading: "Pièces uniques, savoir-faire local",
              subheading:
                "Maroquinerie, tissage, sculpture — chaque pièce est faite à la main. Commandes sur mesure acceptées.",
              buttonLabel: "Voir le catalogue",
              buttonHref: "/catalogue",
              align: "left",
              background: "#4A3728",
            },
          },
          {
            id: "artisan-categories",
            type: "features",
            props: {
              heading: "Nos créations",
              items: [
                {
                  title: "Maroquinerie",
                  body: "Sacs, portefeuilles, ceintures en cuir teinté — travail à la main.",
                },
                {
                  title: "Tissage",
                  body: "Pagnes, nappes, coussins en tissu local — motifs traditionnels ou modernes.",
                },
                {
                  title: "Sculpture & bois",
                  body: "Statuettes, masques, mobilier en bois local — pièces de décoration uniques.",
                },
              ],
            },
          },
          {
            id: "artisan-gallery",
            type: "gallery",
            props: {
              heading: "Nos pièces",
              layout: "featured",
              columns: 3,
              items: [
                { src: "", alt: "Sac en cuir" },
                { src: "", alt: "Pagne tissé" },
                { src: "", alt: "Sculpture bois" },
                { src: "", alt: "Porte-monnaie" },
                { src: "", alt: "Nappe brodée" },
              ],
            },
          },
          {
            id: "artisan-custom",
            type: "text",
            props: {
              heading: "Commandes sur mesure",
              body: "Vous avez une idée, une couleur, des dimensions précises ? Nous réalisons vos pièces sur mesure. Envoyez-nous un message WhatsApp avec votre demande — devis sous 48 h.",
            },
          },
          {
            id: "artisan-whatsapp",
            type: "whatsapp",
            props: {
              label: "Commander ou demander un devis sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je suis intéressé(e) par une commande / un devis sur mesure.",
            },
          },
          footer("artisan-footer-home"),
        ],
      },
      {
        slug: "catalogue",
        title: "Catalogue",
        sections: [
          nav("artisan-nav-catalogue"),
          {
            id: "artisan-cat-hero",
            type: "hero",
            props: {
              heading: "Catalogue",
              subheading: "Parcourez nos créations disponibles — stock limité, chaque pièce est unique.",
              buttonLabel: "Commander sur WhatsApp",
              buttonHref: "/contact",
              align: "center",
              background: "#4A3728",
            },
          },
          {
            id: "artisan-cat-maroquinerie",
            type: "features",
            props: {
              heading: "Maroquinerie",
              items: [
                { title: "Sac tote cuir", body: "Cuir naturel teinté, anses tressées — disponible en brun et noir." },
                { title: "Portefeuille", body: "Porte-cartes et billets, cuir souple — plusieurs couleurs." },
                { title: "Ceinture artisanale", body: "Cuir pleine fleur, boucle métal — sur mesure." },
              ],
            },
          },
          {
            id: "artisan-cat-tissage",
            type: "features",
            props: {
              heading: "Tissage",
              items: [
                { title: "Pagne tissé", body: "Tissu wax local, motifs géométriques — 2 m ou 4 m." },
                { title: "Nappe brodée", body: "Nappe de table brodée à la main — 6 à 12 couverts." },
                { title: "Coussin", body: "Housse de coussin en tissu local — 40×40 cm." },
              ],
            },
          },
          {
            id: "artisan-cat-gallery",
            type: "gallery",
            props: {
              heading: "Photos",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Sac cuir" },
                { src: "", alt: "Pagne" },
                { src: "", alt: "Nappe" },
                { src: "", alt: "Ceinture" },
                { src: "", alt: "Coussin" },
                { src: "", alt: "Sculpture" },
              ],
            },
          },
          footer("artisan-footer-catalogue"),
        ],
      },
      {
        slug: "sur-mesure",
        title: "Sur mesure",
        sections: [
          nav("artisan-nav-custom"),
          {
            id: "artisan-custom-hero",
            type: "hero",
            props: {
              heading: "Commande sur mesure",
              subheading:
                "Vous avez une idée précise ? Décrivez-la — nous la réalisons dans les délais convenus.",
              buttonLabel: "Envoyer un message",
              buttonHref: "#form",
              align: "left",
              background: "#4A3728",
            },
          },
          {
            id: "artisan-custom-form",
            type: "form",
            props: {
              heading: "Votre commande sur mesure",
              subheading: "Donnez un maximum de détails — matière, couleur, dimensions, délai souhaité.",
              buttonLabel: "Envoyer",
              successMessage: "Demande reçue — nous vous répondons sous 48 h.",
              fields: [
                { id: "nom", label: "Prénom et nom", type: "text", required: true, placeholder: "", options: [] },
                {
                  id: "telephone",
                  label: "WhatsApp",
                  type: "phone",
                  required: true,
                  placeholder: "+221…",
                  options: [],
                },
                {
                  id: "categorie",
                  label: "Catégorie",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Maroquinerie", "Tissage / Pagne", "Sculpture / Bois", "Autre"],
                },
                {
                  id: "description",
                  label: "Description de la pièce",
                  type: "textarea",
                  required: true,
                  placeholder: "Sac en cuir brun, 30×20 cm, avec poche intérieure — livraison dans 3 semaines",
                  options: [],
                },
              ],
            },
          },
          {
            id: "artisan-custom-wa",
            type: "whatsapp",
            props: {
              label: "Commande express sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais une commande sur mesure. Voici ma demande :",
            },
          },
          footer("artisan-footer-custom"),
        ],
      },
      {
        slug: "boutique",
        title: "Boutique",
        sections: [
          nav("artisan-nav-boutique"),
          {
            id: "artisan-boutique-hero",
            type: "hero",
            props: {
              heading: "Boutique en ligne",
              subheading: "Commandez directement depuis la boutique — paiement Wave, Orange Money ou à la livraison.",
              buttonLabel: "Passer commande",
              buttonHref: "#produits",
              align: "center",
              background: "#4A3728",
            },
          },
          {
            id: "artisan-boutique-products",
            type: "products",
            props: {
              heading: "Disponible maintenant",
              layout: "grid",
              columns: 3,
              items: [],
            },
          },
          footer("artisan-footer-boutique"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("artisan-nav-contact"),
          {
            id: "artisan-contact-section",
            type: "contact",
            props: {
              heading: "Nous trouver",
              email: "artisan@example.com",
              phone: "+221770000000",
              address: "Marché des artisans — votre adresse, ville",
            },
          },
          {
            id: "artisan-faq",
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                {
                  question: "Quels délais pour une commande sur mesure ?",
                  answer: "En général 1 à 3 semaines selon la complexité — précisé dans le devis.",
                },
                {
                  question: "Livrez-vous ?",
                  answer: "Livraison possible dans la ville et environs — frais selon la distance.",
                },
                {
                  question: "Comment payer ?",
                  answer: "Wave, Orange Money, espèces à la livraison — à adapter selon votre activité.",
                },
              ],
            },
          },
          footer("artisan-footer-contact"),
        ],
      },
    ],
  };
}

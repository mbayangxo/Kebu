import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Photographe — West African professional photographer.
 * Portfolio gallery, service packages, WhatsApp booking, mobile money.
 * IA: Home · Portfolio · Formules · Réserver · Contact
 */

const NAV = [
  { label: "Portfolio", href: "/portfolio" },
  { label: "Formules", href: "/formules" },
  { label: "Réserver", href: "/reserver" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "Photo", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Photo — photographie professionnelle, portraits, événements.",
      links: [
        { label: "Portfolio", href: "/portfolio" },
        { label: "Formules", href: "/formules" },
        { label: "Réserver", href: "/reserver" },
      ],
    },
  };
}

export function photographeWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Photographe",
    theme: {
      primary: "#1A1A1A",
      accent: "#D4A017",
      background: "#FAFAF8",
      text: "#1A1A1A",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "wide",
      aestheticId: "dark-gold-editorial",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("photo-nav-home"),
          {
            id: "photo-hero",
            type: "hero",
            props: {
              heading: "La lumière raconte votre histoire",
              subheading:
                "Portraits, mariages, événements d'entreprise — photographie professionnelle en Afrique de l'Ouest. Paiement Wave ou Orange Money.",
              buttonLabel: "Voir le portfolio",
              buttonHref: "/portfolio",
              align: "left",
              background: "#1A1A1A",
            },
          },
          {
            id: "photo-specialites",
            type: "features",
            props: {
              heading: "Spécialités",
              items: [
                {
                  title: "Portraits & Lifestyle",
                  body: "Portraits professionnels, shooting mode, identité visuelle personnelle — en studio ou en extérieur.",
                },
                {
                  title: "Mariages & Cérémonies",
                  body: "Baptêmes, mariages, anniversaires — reportage complet du début à la fin de votre événement.",
                },
                {
                  title: "Entreprises & Marques",
                  body: "Photos produits, équipes, événements corporate, campagnes publicitaires locales.",
                },
              ],
            },
          },
          {
            id: "photo-gallery-home",
            type: "gallery",
            props: {
              heading: "Sélection",
              layout: "featured",
              columns: 3,
              items: [
                { src: "", alt: "Portrait femme" },
                { src: "", alt: "Mariage" },
                { src: "", alt: "Événement" },
                { src: "", alt: "Mode" },
                { src: "", alt: "Corporate" },
              ],
            },
          },
          {
            id: "photo-testimonials-home",
            type: "testimonials",
            props: {
              heading: "Ils me font confiance",
              items: [
                {
                  quote: "Photos de mariage magnifiques — chaque moment capturé avec émotion. Merci infiniment !",
                  name: "Mariama & Ibou",
                  role: "Clients mariage",
                },
                {
                  quote: "Shooting produit professionnel, livraison rapide. Mes ventes ont augmenté grâce aux photos.",
                  name: "Aïssatou D.",
                  role: "Boutique en ligne",
                },
              ],
            },
          },
          {
            id: "photo-whatsapp-home",
            type: "whatsapp",
            props: {
              label: "Réserver une séance sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais réserver une séance photo. Pouvez-vous me donner vos disponibilités ?",
            },
          },
          footer("photo-footer-home"),
        ],
      },
      {
        slug: "portfolio",
        title: "Portfolio",
        sections: [
          nav("photo-nav-portfolio"),
          {
            id: "photo-portfolio-hero",
            type: "hero",
            props: {
              heading: "Portfolio",
              subheading: "Chaque image est une histoire — parcourez mes travaux.",
              buttonLabel: "Réserver",
              buttonHref: "/reserver",
              align: "center",
              background: "#1A1A1A",
            },
          },
          {
            id: "photo-portfolio-portraits",
            type: "gallery",
            props: {
              heading: "Portraits",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Portrait 1" },
                { src: "", alt: "Portrait 2" },
                { src: "", alt: "Portrait 3" },
                { src: "", alt: "Portrait 4" },
                { src: "", alt: "Portrait 5" },
                { src: "", alt: "Portrait 6" },
              ],
            },
          },
          {
            id: "photo-portfolio-events",
            type: "gallery",
            props: {
              heading: "Événements",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Mariage 1" },
                { src: "", alt: "Baptême" },
                { src: "", alt: "Anniversaire" },
                { src: "", alt: "Mariage 2" },
                { src: "", alt: "Cérémonie" },
                { src: "", alt: "Dîner de gala" },
              ],
            },
          },
          {
            id: "photo-portfolio-corporate",
            type: "gallery",
            props: {
              heading: "Corporate & Produits",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Produit 1" },
                { src: "", alt: "Équipe" },
                { src: "", alt: "Produit 2" },
                { src: "", alt: "Bureau" },
                { src: "", alt: "Campagne" },
                { src: "", alt: "Event corpo" },
              ],
            },
          },
          footer("photo-footer-portfolio"),
        ],
      },
      {
        slug: "formules",
        title: "Formules",
        sections: [
          nav("photo-nav-formules"),
          {
            id: "photo-formules-hero",
            type: "hero",
            props: {
              heading: "Formules & Tarifs",
              subheading: "Des formules adaptées à chaque projet — paiement Wave, Orange Money ou espèces.",
              buttonLabel: "Réserver maintenant",
              buttonHref: "/reserver",
              align: "left",
              background: "#1A1A1A",
            },
          },
          {
            id: "photo-formules-list",
            type: "features",
            props: {
              heading: "Nos formules",
              items: [
                {
                  title: "Portrait Essentiel — 25 000 FCFA",
                  body: "1 h de shooting, 10 photos retouchées livrées en HD. Idéal : LinkedIn, réseaux sociaux, profil pro.",
                },
                {
                  title: "Portrait Signature — 45 000 FCFA",
                  body: "2 h, changements de tenue, 25 photos retouchées + 5 en noir & blanc. Livraison sous 5 jours.",
                },
                {
                  title: "Événement Essentiel — 75 000 FCFA",
                  body: "3 h de reportage, 50 photos retouchées. Mariages, baptêmes, anniversaires — couverture du moment fort.",
                },
                {
                  title: "Événement Complet — 150 000 FCFA",
                  body: "Journée complète (8 h max), 150 photos retouchées, galerie en ligne privée partageable. Mariage clés en main.",
                },
                {
                  title: "Corporate & Produits — sur devis",
                  body: "Shooting produit, photo d'équipe, événement d'entreprise — devis personnalisé selon les besoins.",
                },
              ],
            },
          },
          {
            id: "photo-formules-note",
            type: "text",
            props: {
              heading: "Livraison & paiement",
              body: "Photos livrées via lien de téléchargement sécurisé sous 5 à 10 jours ouvrables après la séance.\nAcompte de 50 % à la réservation pour bloquer la date — solde à la livraison.\nPaiement : Wave, Orange Money, espèces ou virement.",
            },
          },
          footer("photo-footer-formules"),
        ],
      },
      {
        slug: "reserver",
        title: "Réserver",
        sections: [
          nav("photo-nav-reserver"),
          {
            id: "photo-reserver-hero",
            type: "hero",
            props: {
              heading: "Réservez votre séance",
              subheading: "Choisissez votre formule, précisez la date souhaitée — nous confirmons sous 24 h.",
              buttonLabel: "WhatsApp",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#1A1A1A",
            },
          },
          {
            id: "photo-reserver-form",
            type: "form",
            props: {
              heading: "Formulaire de réservation",
              subheading: "Remplissez le formulaire — je vous confirme les disponibilités et le devis.",
              buttonLabel: "Envoyer ma demande",
              successMessage: "Demande reçue — je vous réponds sous 24 h.",
              fields: [
                { id: "nom", label: "Prénom et nom", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                {
                  id: "formule",
                  label: "Formule souhaitée",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: [
                    "Portrait Essentiel",
                    "Portrait Signature",
                    "Événement Essentiel",
                    "Événement Complet",
                    "Corporate & Produits — sur devis",
                  ],
                },
                { id: "date", label: "Date souhaitée", type: "text", required: false, placeholder: "Ex : samedi 15 mars", options: [] },
                { id: "lieu", label: "Lieu ou type de lieu souhaité", type: "text", required: false, placeholder: "Studio, extérieur, salle…", options: [] },
                {
                  id: "details",
                  label: "Détails supplémentaires",
                  type: "textarea",
                  required: false,
                  placeholder: "Nombre de personnes, ambiance souhaitée, contraintes particulières…",
                  options: [],
                },
              ],
            },
          },
          {
            id: "photo-reserver-wa",
            type: "whatsapp",
            props: {
              label: "Réserver sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais réserver une séance photo. Voici ma demande :",
            },
          },
          footer("photo-footer-reserver"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("photo-nav-contact"),
          {
            id: "photo-contact-section",
            type: "contact",
            props: {
              heading: "Me contacter",
              email: "photo@example.com",
              phone: "+221770000000",
              address: "Studio — votre adresse, quartier, ville",
            },
          },
          {
            id: "photo-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Comment se passe la réservation ?",
                  answer: "Remplissez le formulaire ou envoyez un WhatsApp — je vous confirme la date et la formule sous 24 h, et vous demande un acompte de 50 % pour bloquer.",
                },
                {
                  question: "Puis-je choisir le lieu du shooting ?",
                  answer: "Oui — studio, plage, quartier, domicile. Si le lieu nécessite un déplacement hors ville, des frais s'appliquent.",
                },
                {
                  question: "Sous quel format sont livrées les photos ?",
                  answer: "JPEG haute résolution via lien de téléchargement — valable 30 jours. Impression possible sur demande.",
                },
                {
                  question: "Puis-je modifier ou annuler ma réservation ?",
                  answer: "Modification possible jusqu'à 48 h avant la séance. Annulation tardive : l'acompte reste acquis.",
                },
              ],
            },
          },
          footer("photo-footer-contact"),
        ],
      },
    ],
  };
}

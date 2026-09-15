import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * BTP — Bâtiment / Travaux Publics (West African construction contractor).
 * Project portfolio, staged payment milestones, before/after gallery, devis form.
 * IA: Home · Réalisations · Services · Devis · Contact
 */

const NAV = [
  { label: "Réalisations", href: "/realisations" },
  { label: "Services", href: "/services" },
  { label: "Devis", href: "/devis" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "BTP Pro", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© BTP Pro — construction, rénovation, travaux publics. Devis gratuit.",
      links: [
        { label: "Réalisations", href: "/realisations" },
        { label: "Devis", href: "/devis" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function btpWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "BTP Pro",
    theme: {
      primary: "#1C2B1A",
      accent: "#F5A623",
      background: "#F7F5F2",
      text: "#1C2B1A",
      fontDisplay: "DM Sans",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "construction-amber",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("btp-nav-home"),
          {
            id: "btp-announce",
            type: "announcement-bar",
            props: {
              text: "Devis gratuit sous 48 h — appelez ou envoyez un message WhatsApp",
              background: "#F5A623",
              textColor: "#1C2B1A",
            },
          },
          {
            id: "btp-hero",
            type: "hero",
            props: {
              heading: "Vos travaux, notre expertise",
              subheading:
                "Construction neuve, rénovation, finition — entreprise BTP locale, délais tenus, paiement par tranches Wave ou Orange Money.",
              buttonLabel: "Demander un devis",
              buttonHref: "/devis",
              align: "left",
              background: "#1C2B1A",
            },
          },
          {
            id: "btp-services-home",
            type: "features",
            props: {
              heading: "Nos domaines",
              items: [
                {
                  title: "Construction neuve",
                  body: "Villas, immeubles, entrepôts — de la fondation à la livraison clés en main.",
                },
                {
                  title: "Rénovation & extension",
                  body: "Agrandissement, ravalement, aménagement intérieur — résultat garanti.",
                },
                {
                  title: "Travaux publics",
                  body: "Voirie, drainage, terrassement — chantiers municipaux et privés.",
                },
              ],
            },
          },
          {
            id: "btp-gallery-home",
            type: "gallery",
            props: {
              heading: "Quelques réalisations",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Villa avant" },
                { src: "", alt: "Villa après" },
                { src: "", alt: "Immeuble R+2" },
                { src: "", alt: "Chantier en cours" },
                { src: "", alt: "Finition intérieure" },
                { src: "", alt: "Terrassement" },
              ],
            },
          },
          {
            id: "btp-payment-info",
            type: "text",
            props: {
              heading: "Paiement par tranches",
              body: "Nous proposons un plan de paiement adapté à chaque projet :\n• Tranche 1 — 30 % à la signature du contrat\n• Tranche 2 — 40 % à mi-travaux\n• Tranche 3 — 30 % à la livraison\nPaiement par Wave, Orange Money ou virement bancaire.",
            },
          },
          {
            id: "btp-testimonials-home",
            type: "testimonials",
            props: {
              heading: "Ce que disent nos clients",
              items: [
                {
                  quote: "Villa livrée dans les délais, finitions impeccables. Je recommande sans hésiter.",
                  name: "Abdoulaye K.",
                  role: "Propriétaire — villa Almadies",
                },
                {
                  quote: "Chantier propre, équipe sérieuse, paiement flexible. Travail professionnel.",
                  name: "Fatou N.",
                  role: "Cliente — rénovation appartement",
                },
              ],
            },
          },
          {
            id: "btp-whatsapp-home",
            type: "whatsapp",
            props: {
              label: "Discuter de votre projet sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — j'ai un projet de construction / rénovation. Pouvez-vous me faire un devis ?",
            },
          },
          footer("btp-footer-home"),
        ],
      },
      {
        slug: "realisations",
        title: "Réalisations",
        sections: [
          nav("btp-nav-realisations"),
          {
            id: "btp-real-hero",
            type: "hero",
            props: {
              heading: "Nos réalisations",
              subheading: "Chaque projet témoigne de notre savoir-faire — constructions neuves, rénovations, travaux publics.",
              buttonLabel: "Demander un devis",
              buttonHref: "/devis",
              align: "center",
              background: "#1C2B1A",
            },
          },
          {
            id: "btp-real-construction",
            type: "features",
            props: {
              heading: "Construction neuve",
              items: [
                {
                  title: "Villa R+1 — Dakar",
                  body: "4 chambres, 3 salles de bain, garage double. Durée : 14 mois. Surface : 280 m².",
                },
                {
                  title: "Immeuble R+3 — Thiès",
                  body: "12 appartements, locaux commerciaux RDC. Durée : 24 mois. Surface : 1 200 m².",
                },
                {
                  title: "Entrepôt — Diamniadio",
                  body: "Zone industrielle — structure métallique, dalle béton. 800 m² utiles. Durée : 6 mois.",
                },
              ],
            },
          },
          {
            id: "btp-real-renovation",
            type: "features",
            props: {
              heading: "Rénovation",
              items: [
                {
                  title: "Rénovation complète — villa années 90",
                  body: "Carrelage, plomberie, électricité, façade — remise à neuf totale en 3 mois.",
                },
                {
                  title: "Extension cuisine / séjour",
                  body: "Agrandissement de 40 m² avec véranda vitrée — ossature béton + menuiserie aluminium.",
                },
              ],
            },
          },
          {
            id: "btp-real-gallery",
            type: "gallery",
            props: {
              heading: "Photos de chantiers",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Fondations" },
                { src: "", alt: "Gros œuvre" },
                { src: "", alt: "Toiture" },
                { src: "", alt: "Façade finie" },
                { src: "", alt: "Intérieur" },
                { src: "", alt: "Livraison" },
              ],
            },
          },
          footer("btp-footer-realisations"),
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          nav("btp-nav-services"),
          {
            id: "btp-services-hero",
            type: "hero",
            props: {
              heading: "Nos services",
              subheading: "Du terrassement à la remise des clés — nous gérons l'intégralité du chantier.",
              buttonLabel: "Demander un devis",
              buttonHref: "/devis",
              align: "left",
              background: "#1C2B1A",
            },
          },
          {
            id: "btp-services-list",
            type: "features",
            props: {
              heading: "Détail des prestations",
              items: [
                { title: "Étude & maîtrise d'œuvre", body: "Plans, permis de construire, suivi de chantier — architecte partenaire disponible." },
                { title: "Gros œuvre", body: "Fondations, dalles, murs porteurs, charpente — béton armé ou parpaing." },
                { title: "Second œuvre", body: "Plomberie, électricité, carrelage, peinture, menuiserie — corps de métier intégrés." },
                { title: "Ravalement & étanchéité", body: "Façades, toitures-terrasses, sous-sol — traitement anti-humidité garanti." },
                { title: "Voirie & réseaux", body: "Terrassement, canalisation, bitumage, clôtures — marchés publics et privés." },
              ],
            },
          },
          footer("btp-footer-services"),
        ],
      },
      {
        slug: "devis",
        title: "Devis",
        sections: [
          nav("btp-nav-devis"),
          {
            id: "btp-devis-hero",
            type: "hero",
            props: {
              heading: "Demandez votre devis gratuit",
              subheading: "Décrivez votre projet — nous vous rappelons sous 48 h avec une estimation.",
              buttonLabel: "Remplir le formulaire",
              buttonHref: "#form",
              align: "center",
              background: "#1C2B1A",
            },
          },
          {
            id: "btp-devis-form",
            type: "form",
            props: {
              heading: "Formulaire de devis",
              subheading: "Tous les champs marqués * sont obligatoires.",
              buttonLabel: "Envoyer ma demande",
              successMessage: "Demande reçue — nous vous contactons sous 48 h.",
              fields: [
                { id: "nom", label: "Prénom et nom *", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "Téléphone / WhatsApp *", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "email", label: "Email", type: "email", required: false, placeholder: "votre@email.com", options: [] },
                {
                  id: "type",
                  label: "Type de travaux *",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: [
                    "Construction neuve",
                    "Rénovation / extension",
                    "Travaux publics",
                    "Ravalement / étanchéité",
                    "Autre",
                  ],
                },
                { id: "surface", label: "Surface approximative (m²)", type: "text", required: false, placeholder: "Ex : 150 m²", options: [] },
                { id: "localite", label: "Localité / quartier", type: "text", required: false, placeholder: "Dakar, Thiès…", options: [] },
                {
                  id: "description",
                  label: "Description du projet *",
                  type: "textarea",
                  required: true,
                  placeholder: "Décrivez votre projet : type de bâtiment, surface, matériaux souhaités, délai…",
                  options: [],
                },
              ],
            },
          },
          {
            id: "btp-devis-wa",
            type: "whatsapp",
            props: {
              label: "Envoyer votre projet sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais un devis pour un projet de construction / rénovation.",
            },
          },
          footer("btp-footer-devis"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("btp-nav-contact"),
          {
            id: "btp-contact-section",
            type: "contact",
            props: {
              heading: "Contactez-nous",
              email: "btp@example.com",
              phone: "+221770000000",
              address: "Votre adresse — quartier, ville · Horaires : lun–sam 7h30–18h",
            },
          },
          {
            id: "btp-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Combien coûte un devis ?",
                  answer: "Le devis est entièrement gratuit et sans engagement — envoyez votre projet et nous vous rappelons.",
                },
                {
                  question: "Comment fonctionne le paiement par tranches ?",
                  answer: "30 % à la signature, 40 % à mi-chantier, 30 % à la livraison. Paiement Wave, Orange Money ou virement.",
                },
                {
                  question: "Travaillez-vous hors de Dakar ?",
                  answer: "Oui — nous intervenons dans tout le Sénégal. Des frais de déplacement peuvent s'appliquer selon la distance.",
                },
                {
                  question: "Fournissez-vous les matériaux ?",
                  answer: "Oui, achat et livraison des matériaux inclus — ou fourniture du client sur accord. Tout est précisé dans le devis.",
                },
              ],
            },
          },
          footer("btp-footer-contact"),
        ],
      },
    ],
  };
}

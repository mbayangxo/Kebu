import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Pharmacie — West African pharmacy / drugstore.
 * Services, ordonnances, livraison, mobile money, WhatsApp orders.
 * IA: Home · Services · Ordonnances · Livraison · Contact
 */

const NAV = [
  { label: "Services", href: "/services" },
  { label: "Ordonnances", href: "/ordonnances" },
  { label: "Livraison", href: "/livraison" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "Pharmacie", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Pharmacie — médicaments, conseils, livraison à domicile.",
      links: [
        { label: "Ordonnances", href: "/ordonnances" },
        { label: "Livraison", href: "/livraison" },
      ],
    },
  };
}

export function pharmacieWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Pharmacie",
    theme: {
      primary: "#006A4E",
      accent: "#00B274",
      background: "#F5FBF8",
      text: "#00231A",
      fontDisplay: "DM Sans",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "md",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "health-green",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("pharma-nav-home"),
          {
            id: "pharma-announce",
            type: "announcement-bar",
            props: {
              text: "Livraison à domicile disponible — commandez sur WhatsApp",
              background: "#006A4E",
              textColor: "#fff",
            },
          },
          {
            id: "pharma-hero",
            type: "hero",
            props: {
              heading: "Votre santé, notre priorité",
              subheading:
                "Médicaments, parapharmacie, conseils personnalisés — commandez sur WhatsApp, paiement Wave ou Orange Money.",
              buttonLabel: "Commander sur WhatsApp",
              buttonHref: "/ordonnances",
              align: "left",
              background: "#006A4E",
            },
          },
          {
            id: "pharma-services",
            type: "features",
            props: {
              heading: "Nos services",
              items: [
                {
                  title: "Médicaments sur ordonnance",
                  body: "Envoyez votre ordonnance sur WhatsApp — préparation rapide, livraison ou retrait.",
                },
                {
                  title: "Parapharmacie",
                  body: "Soins de la peau, vitamines, compléments — conseils de notre pharmacien.",
                },
                {
                  title: "Livraison à domicile",
                  body: "Livraison dans la ville — délai 2 à 4 heures selon l'adresse.",
                },
              ],
            },
          },
          {
            id: "pharma-whatsapp",
            type: "whatsapp",
            props: {
              label: "Envoyer votre ordonnance sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander / envoyer mon ordonnance.",
            },
          },
          {
            id: "pharma-faq-home",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Comment commander un médicament ?",
                  answer: "Envoyez une photo de votre ordonnance sur WhatsApp — nous préparons et vous livrons.",
                },
                {
                  question: "Quels moyens de paiement ?",
                  answer: "Wave, Orange Money, espèces — à adapter selon votre pharmacie.",
                },
                {
                  question: "Livrez-vous le soir ?",
                  answer: "Livraison jusqu'à 20h en semaine et 18h le week-end — à préciser selon vos horaires.",
                },
              ],
            },
          },
          footer("pharma-footer-home"),
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          nav("pharma-nav-services"),
          {
            id: "pharma-services-hero",
            type: "hero",
            props: {
              heading: "Nos services",
              subheading: "Au comptoir ou depuis votre téléphone — nous vous accompagnons.",
              buttonLabel: "Nous contacter",
              buttonHref: "/contact",
              align: "center",
              background: "#006A4E",
            },
          },
          {
            id: "pharma-services-list",
            type: "features",
            props: {
              heading: "Ce que nous proposons",
              items: [
                { title: "Médicaments génériques", body: "Alternatives moins chères aux marques — même efficacité, prix réduit." },
                { title: "Produits de puériculture", body: "Lait infantile, couches, thermomètres — conseils maternité." },
                { title: "Matériel médical", body: "Tensiomètres, seringues, pansements, béquilles — vente et location." },
                { title: "Vaccins & tests rapides", body: "Paludisme, grossesse, glycémie — résultats en quelques minutes." },
              ],
            },
          },
          footer("pharma-footer-services"),
        ],
      },
      {
        slug: "ordonnances",
        title: "Ordonnances",
        sections: [
          nav("pharma-nav-ord"),
          {
            id: "pharma-ord-hero",
            type: "hero",
            props: {
              heading: "Envoyez votre ordonnance",
              subheading: "Photo WhatsApp ou formulaire — préparation en moins d'une heure.",
              buttonLabel: "WhatsApp",
              buttonHref: "#whatsapp",
              align: "left",
              background: "#006A4E",
            },
          },
          {
            id: "pharma-ord-form",
            type: "form",
            props: {
              heading: "Demande de médicaments",
              subheading: "Décrivez votre besoin ou joignez une photo de l'ordonnance sur WhatsApp.",
              buttonLabel: "Envoyer",
              successMessage: "Demande reçue — nous vous répondons rapidement.",
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
                  id: "mode",
                  label: "Retrait ou livraison ?",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Retrait en pharmacie", "Livraison à domicile"],
                },
                {
                  id: "note",
                  label: "Médicaments ou note",
                  type: "textarea",
                  required: false,
                  placeholder: "Paracétamol 1g × 20, Amoxicilline 500mg… ou 'ordonnance jointe sur WhatsApp'",
                  options: [],
                },
              ],
            },
          },
          {
            id: "pharma-ord-wa",
            type: "whatsapp",
            props: {
              label: "Envoyer l'ordonnance par WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je vous envoie mon ordonnance.",
            },
          },
          footer("pharma-footer-ord"),
        ],
      },
      {
        slug: "livraison",
        title: "Livraison",
        sections: [
          nav("pharma-nav-livraison"),
          {
            id: "pharma-livraison-hero",
            type: "hero",
            props: {
              heading: "Livraison à domicile",
              subheading: "Commandez sur WhatsApp, payez Wave ou Orange Money, livraison sous 2–4 h.",
              buttonLabel: "Commander",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#006A4E",
            },
          },
          {
            id: "pharma-livraison-body",
            type: "text",
            props: {
              heading: "Comment ça marche",
              body: "1. Envoyez votre ordonnance ou la liste de médicaments sur WhatsApp.\n2. Notre pharmacien vérifie et prépare votre commande.\n3. Paiement par Wave, Orange Money ou à la livraison en espèces.\n4. Livraison à votre adresse en 2 à 4 heures (selon disponibilité).",
            },
          },
          {
            id: "pharma-livraison-wa",
            type: "whatsapp",
            props: {
              label: "Commander la livraison",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander des médicaments avec livraison.",
            },
          },
          footer("pharma-footer-livraison"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("pharma-nav-contact"),
          {
            id: "pharma-contact-section",
            type: "contact",
            props: {
              heading: "Nous trouver",
              email: "pharmacie@example.com",
              phone: "+221770000000",
              address: "Votre adresse — quartier, ville · Horaires : lun–sam 8h–20h",
            },
          },
          footer("pharma-footer-contact"),
        ],
      },
    ],
  };
}

import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Grossiste / Wholesale — West African B2B wholesale distributor.
 * Product catalog, bulk order minimums, price list on WhatsApp, mobile money.
 * IA: Home · Catalogue · Commander · Livraison · Contact
 */

const NAV = [
  { label: "Catalogue", href: "/catalogue" },
  { label: "Commander en gros", href: "/commander" },
  { label: "Livraison", href: "/livraison" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "Grossiste", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Grossiste — vente en gros, tarifs revendeurs, livraison rapide. Paiement Wave / Orange Money.",
      links: [
        { label: "Catalogue", href: "/catalogue" },
        { label: "Commander en gros", href: "/commander" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function wholesaleWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Grossiste",
    theme: {
      primary: "#1C2D3C",
      accent: "#E87722",
      background: "#F7F6F4",
      text: "#1C2D3C",
      fontDisplay: "DM Sans",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "md",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "b2b-slate-orange",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("gros-nav-home"),
          {
            id: "gros-announce",
            type: "announcement-bar",
            props: {
              text: "Nouveaux arrivages — catalogue et prix disponibles sur WhatsApp · Livraison J+1 Dakar",
              background: "#E87722",
              textColor: "#fff",
            },
          },
          {
            id: "gros-hero",
            type: "hero",
            props: {
              heading: "Vente en gros pour revendeurs",
              subheading:
                "Alimentaire, textile, électronique, cosmétiques — prix compétitifs, stock disponible, livraison rapide. Paiement Wave, Orange Money ou virement. Minimum de commande indiqué par catégorie.",
              buttonLabel: "Voir le catalogue",
              buttonHref: "/catalogue",
              align: "left",
              background: "#1C2D3C",
            },
          },
          {
            id: "gros-categories",
            type: "features",
            props: {
              heading: "Nos catégories",
              items: [
                {
                  title: "Alimentaire & épicerie",
                  body: "Huiles, sucre, farine, riz, conserves — marques locales et importées. Prix carton / palette.",
                },
                {
                  title: "Cosmétiques & hygiène",
                  body: "Savons, crèmes, shampooings, déodorants — lots de 12 à 144 unités. Tarifs revendeurs.",
                },
                {
                  title: "Textile & accessoires",
                  body: "Pagnes, vêtements, chaussures — lot minimum 10 pièces. Catalogue photos disponible sur WhatsApp.",
                },
                {
                  title: "Électronique & électroménager",
                  body: "Accessoires téléphone, batteries, éclairages LED — prix importateur direct.",
                },
              ],
            },
          },
          {
            id: "gros-avantages",
            type: "features",
            props: {
              heading: "Pourquoi passer par nous",
              items: [
                { title: "Prix importateur", body: "Marges revendeur préservées — prix départ entrepôt, sans intermédiaire supplémentaire." },
                { title: "Stock disponible", body: "Produits en stock permanent — pas d'attente. Disponibilités vérifiables sur WhatsApp." },
                { title: "Livraison rapide", body: "Livraison J+1 à Dakar, 2–5 jours en région. Véhicule propre ou transporteur partenaire." },
                { title: "Paiement flexible", body: "Wave, Orange Money, virement ou espèces à la livraison selon accord." },
              ],
            },
          },
          {
            id: "gros-testimonials",
            type: "testimonials",
            props: {
              heading: "Ils nous font confiance",
              items: [
                {
                  quote: "Prix imbattables sur les huiles et le riz. Livraison le lendemain — mon stock ne manque jamais.",
                  name: "Binta D.",
                  role: "Revendeuse — marché de Pikine",
                },
                {
                  quote: "Catalogue cosmétiques complet, tarifs revendeurs sérieux. Commande WhatsApp simple et rapide.",
                  name: "Moussa K.",
                  role: "Boutique de quartier",
                },
              ],
            },
          },
          {
            id: "gros-wa-home",
            type: "whatsapp",
            props: {
              label: "Demander le catalogue & les prix sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je suis revendeur et je voudrais recevoir votre catalogue et vos tarifs en gros.",
            },
          },
          footer("gros-footer-home"),
        ],
      },
      {
        slug: "catalogue",
        title: "Catalogue",
        sections: [
          nav("gros-nav-catalogue"),
          {
            id: "gros-cat-hero",
            type: "hero",
            props: {
              heading: "Catalogue grossiste",
              subheading: "Produits disponibles en stock — minimums et prix sur WhatsApp, mis à jour chaque semaine.",
              buttonLabel: "Commander",
              buttonHref: "/commander",
              align: "center",
              background: "#1C2D3C",
            },
          },
          {
            id: "gros-cat-alimentaire",
            type: "features",
            props: {
              heading: "Alimentaire & épicerie",
              items: [
                { title: "Huile végétale — carton 12 × 1 L", body: "Marques locales et importées. Minimum : 5 cartons. Prix : demander sur WhatsApp." },
                { title: "Riz brisé — sac 50 kg", body: "Riz brisé local et importé. Minimum : 2 sacs. Livraison incluse dès 10 sacs." },
                { title: "Sucre cristallisé — sac 50 kg", body: "Sucre local CSSF. Minimum : 2 sacs." },
                { title: "Farine de blé — sac 50 kg", body: "Grands Moulins de Dakar. Minimum : 2 sacs." },
              ],
            },
          },
          {
            id: "gros-cat-cosmetiques",
            type: "features",
            props: {
              heading: "Cosmétiques & hygiène",
              items: [
                { title: "Savons de toilette — lot 48 u.", body: "Marques locales et importées. Minimum : 2 lots. Parfums variables." },
                { title: "Crèmes hydratantes — lot 24 u.", body: "Format 200 ml. Différentes teintes. Minimum : 3 lots." },
                { title: "Shampooings — lot 12 u.", body: "Format 400 ml. Minimum : 5 lots." },
              ],
            },
          },
          {
            id: "gros-cat-note",
            type: "text",
            props: {
              heading: "Catalogue complet & prix",
              body: "Le catalogue complet avec les prix mis à jour est disponible sur WhatsApp — envoyez un message pour le recevoir.\nLes prix varient selon les quantités commandées — plus vous commandez, plus les tarifs sont avantageux.\nNouveaux arrivages annoncés chaque semaine.",
            },
          },
          {
            id: "gros-cat-wa",
            type: "whatsapp",
            props: {
              label: "Recevoir le catalogue complet sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais recevoir votre catalogue complet avec les prix en gros.",
            },
          },
          footer("gros-footer-catalogue"),
        ],
      },
      {
        slug: "commander",
        title: "Commander en gros",
        sections: [
          nav("gros-nav-commander"),
          {
            id: "gros-cmd-hero",
            type: "hero",
            props: {
              heading: "Passer une commande en gros",
              subheading: "Remplissez le formulaire ou envoyez un WhatsApp — devis sous 2 h, livraison rapide.",
              buttonLabel: "Formulaire de commande",
              buttonHref: "#form",
              align: "left",
              background: "#1C2D3C",
            },
          },
          {
            id: "gros-cmd-process",
            type: "features",
            props: {
              heading: "Comment commander",
              items: [
                { title: "1. Indiquez vos produits", body: "Remplissez le formulaire ou envoyez un WhatsApp avec la liste produits + quantités." },
                { title: "2. Recevez un devis", body: "Devis avec prix, délai de livraison et total sous 2 h ouvrées." },
                { title: "3. Confirmez et payez", body: "Acompte ou paiement intégral — Wave, Orange Money ou virement." },
                { title: "4. Livraison rapide", body: "J+1 à Dakar, 2–5 jours en région — confirmation par WhatsApp." },
              ],
            },
          },
          {
            id: "gros-cmd-form",
            type: "form",
            props: {
              heading: "Formulaire de commande",
              subheading: "Remplissez — nous vous envoyons le devis et la disponibilité par WhatsApp sous 2 h.",
              buttonLabel: "Envoyer la commande",
              successMessage: "Commande reçue — nous vous envoyons le devis sous 2 h.",
              fields: [
                { id: "nom", label: "Nom / Raison sociale", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "localite", label: "Ville / quartier de livraison", type: "text", required: true, placeholder: "Dakar — Pikine, Thiès…", options: [] },
                {
                  id: "categorie",
                  label: "Catégorie principale",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: [
                    "Alimentaire & épicerie",
                    "Cosmétiques & hygiène",
                    "Textile & accessoires",
                    "Électronique",
                    "Mixte — plusieurs catégories",
                  ],
                },
                {
                  id: "commande",
                  label: "Détail de la commande",
                  type: "textarea",
                  required: true,
                  placeholder: "Produit : Huile végétale 1 L — Quantité : 10 cartons\nProduit : Savons lot 48 u — Quantité : 5 lots",
                  options: [],
                },
                {
                  id: "paiement",
                  label: "Mode de paiement envisagé",
                  type: "select",
                  required: false,
                  placeholder: "",
                  options: ["Wave", "Orange Money", "Virement bancaire", "Espèces à la livraison"],
                },
              ],
            },
          },
          {
            id: "gros-cmd-wa",
            type: "whatsapp",
            props: {
              label: "Commander directement sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais passer une commande en gros. Voici ma liste :",
            },
          },
          footer("gros-footer-commander"),
        ],
      },
      {
        slug: "livraison",
        title: "Livraison",
        sections: [
          nav("gros-nav-livraison"),
          {
            id: "gros-livraison-hero",
            type: "hero",
            props: {
              heading: "Livraison",
              subheading: "J+1 à Dakar, 2–5 jours en région. Livraison à votre boutique ou entrepôt.",
              buttonLabel: "Commander",
              buttonHref: "/commander",
              align: "center",
              background: "#1C2D3C",
            },
          },
          {
            id: "gros-livraison-body",
            type: "text",
            props: {
              heading: "Conditions de livraison",
              body: "• Dakar et banlieue : livraison J+1 — commandes confirmées avant 16h. Livraison directe à votre adresse.\n• Régions (Thiès, Kaolack, Saint-Louis, Ziguinchor…) : 2 à 5 jours ouvrables selon les liaisons transporteur.\n• Minimum de commande pour la livraison gratuite : 150 000 FCFA. En dessous, frais de livraison selon la zone.\n• Livraison en dehors du Sénégal : sur accord préalable — contactez-nous.",
            },
          },
          {
            id: "gros-livraison-faq",
            type: "faq",
            props: {
              heading: "FAQ livraison",
              items: [
                {
                  question: "Comment suivre ma commande ?",
                  answer: "Nous vous envoyons un message WhatsApp à chaque étape : confirmation, départ entrepôt, livraison estimée.",
                },
                {
                  question: "Puis-je récupérer ma commande en entrepôt ?",
                  answer: "Oui — retrait possible à notre entrepôt à Dakar sur rendez-vous. Contactez-nous pour l'adresse.",
                },
                {
                  question: "Que se passe-t-il si un produit est manquant à la livraison ?",
                  answer: "Nous remboursons ou créditons la différence — signalez tout écart par WhatsApp dans les 24 h.",
                },
              ],
            },
          },
          footer("gros-footer-livraison"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("gros-nav-contact"),
          {
            id: "gros-contact-section",
            type: "contact",
            props: {
              heading: "Nous contacter",
              email: "grossiste@example.com",
              phone: "+221770000000",
              address: "Entrepôt — votre adresse, quartier, ville · Lun–sam 7h30–18h",
            },
          },
          {
            id: "gros-contact-wa",
            type: "whatsapp",
            props: {
              label: "Contacter un commercial sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je suis revendeur et je voudrais discuter de vos conditions tarifaires.",
            },
          },
          footer("gros-footer-contact"),
        ],
      },
    ],
  };
}

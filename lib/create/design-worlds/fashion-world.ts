import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Mode / Fashion — West African editorial fashion brand or boutique.
 * Editorial scroll, full-bleed model shot, WhatsApp "I want this" on every product.
 * IA: Accueil · Collection · Lookbook · Commander · Contact
 */

const NAV = [
  { label: "Collection", href: "/collection" },
  { label: "Lookbook", href: "/lookbook" },
  { label: "Commander", href: "/commander" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "MODE", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© MODE — pièces uniques, style africain contemporain. Livraison Dakar & international. Wave · Orange Money.",
      links: [
        { label: "Collection", href: "/collection" },
        { label: "Lookbook", href: "/lookbook" },
        { label: "Commander", href: "/commander" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function fashionWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Mode",
    theme: {
      primary: "#0A0A0A",
      accent: "#C9A84C",
      background: "#F5F3EF",
      text: "#0A0A0A",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Inter",
      spacing: "airy",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      aestheticId: "editorial-noir-gold",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("mode-nav-home"),
          {
            id: "mode-announce",
            type: "announcement-bar",
            props: {
              text: "Nouvelle collection disponible — livraison Dakar J+1 · Wave & Orange Money acceptés",
              background: "#0A0A0A",
              textColor: "#C9A84C",
            },
          },
          {
            id: "mode-hero",
            type: "hero",
            props: {
              heading: "Style africain,\naujourd'hui.",
              subheading:
                "Pièces uniques et collections capsule — mode contemporaine ancrée en Afrique. Chaque pièce est photographiée, stylistée et disponible sur WhatsApp.",
              buttonLabel: "Voir la collection",
              buttonHref: "/collection",
              align: "left",
              background: "#0A0A0A",
            },
          },
          {
            id: "mode-featured",
            type: "products",
            props: {
              heading: "Pièces phares",
              subheading: "Tap « Je le veux » — on vous répond en moins d'1h sur WhatsApp.",
              items: [],
            },
          },
          {
            id: "mode-editorial",
            type: "features",
            props: {
              heading: "Notre démarche",
              items: [
                {
                  title: "Pièces uniques",
                  body: "Chaque pièce est produite en quantité limitée — pour que vous soyez la seule à la porter.",
                },
                {
                  title: "Stylisme africain",
                  body: "Tissus wax, bazin, kente et matières nobles locales — portés avec une coupe contemporaine.",
                },
                {
                  title: "Commander sur WhatsApp",
                  body: "Choisissez, envoyez « Je le veux » avec votre taille. On confirme, on livre. Paiement Wave ou Orange Money.",
                },
                {
                  title: "Livraison rapide",
                  body: "Dakar J+1. Thiès, Saint-Louis, Kaolack en 2–3 jours. International sur devis.",
                },
              ],
            },
          },
          {
            id: "mode-testimonials",
            type: "testimonials",
            props: {
              heading: "Elles portent",
              items: [
                {
                  quote: "La robe bazin que j'ai commandée pour le mariage de ma sœur — des compliments toute la soirée. Livraison en 24h comme promis.",
                  name: "Aïssatou D.",
                  role: "Cliente fidèle — Dakar",
                },
                {
                  quote: "J'ai envoyé un WhatsApp le matin, j'avais ma commande le soir. Le wax est de qualité exceptionnelle.",
                  name: "Fatou M.",
                  role: "Cliente — Abidjan",
                },
              ],
            },
          },
          {
            id: "mode-wa-home",
            type: "whatsapp",
            props: {
              label: "Je le veux — Commander sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — j'ai vu votre collection et je voudrais commander une pièce. Pouvez-vous me donner les disponibilités ?",
            },
          },
          footer("mode-footer-home"),
        ],
      },
      {
        slug: "collection",
        title: "Collection",
        sections: [
          nav("mode-nav-collection"),
          {
            id: "mode-col-hero",
            type: "hero",
            props: {
              heading: "La collection",
              subheading: "Toutes les pièces disponibles maintenant. Tailles limitées — commandez vite.",
              buttonLabel: "Commander sur WhatsApp",
              buttonHref: "/commander",
              align: "left",
              background: "#0A0A0A",
            },
          },
          {
            id: "mode-col-products",
            type: "products",
            props: {
              heading: "Disponible maintenant",
              subheading: "Tap « Je le veux » sous chaque pièce pour commander directement sur WhatsApp.",
              items: [],
            },
          },
          {
            id: "mode-col-categories",
            type: "features",
            props: {
              heading: "Par catégorie",
              items: [
                {
                  title: "Robes & tenues de soirée",
                  body: "Wax, bazin, velours — des coupes longues aux modèles courts. Disponibles en plusieurs coloris.",
                },
                {
                  title: "Ensembles tailleur",
                  body: "Vestes + pantalons ou jupes — coupe cintrée, style professionnel et élégant.",
                },
                {
                  title: "Boubous contemporains",
                  body: "Le grand boubou réinventé — formes modernes, broderies fines, matières nobles.",
                },
                {
                  title: "Accessoires",
                  body: "Sacs, ceintures, turbans et bijoux assortis — pour compléter la tenue.",
                },
              ],
            },
          },
          {
            id: "mode-col-sizing",
            type: "text",
            props: {
              heading: "Tailles & mesures",
              body: "Nous travaillons en tailles XS à 3XL et acceptons les commandes sur mesure.\nEnvoyez vos mesures sur WhatsApp (tour de poitrine, tour de taille, longueur souhaitée) — nous vous indiquons quelle taille choisir ou confectionnons sur mesure pour un supplément à convenir.",
            },
          },
          {
            id: "mode-col-wa",
            type: "whatsapp",
            props: {
              label: "Je le veux — Commander sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander dans votre collection. Voici la pièce qui m'intéresse :",
            },
          },
          footer("mode-footer-collection"),
        ],
      },
      {
        slug: "lookbook",
        title: "Lookbook",
        sections: [
          nav("mode-nav-lookbook"),
          {
            id: "mode-look-hero",
            type: "hero",
            props: {
              heading: "Lookbook",
              subheading: "Comment porter nos pièces — inspiration, styling, et vraies clientes.",
              buttonLabel: "Commander",
              buttonHref: "/commander",
              align: "center",
              background: "#0A0A0A",
            },
          },
          {
            id: "mode-look-gallery1",
            type: "gallery",
            props: {
              heading: "Saison actuelle",
              layout: "featured",
              columns: 3,
              items: [
                { src: "", alt: "Look éditorial 1" },
                { src: "", alt: "Look éditorial 2" },
                { src: "", alt: "Look éditorial 3" },
                { src: "", alt: "Détail tissu wax" },
                { src: "", alt: "Styling complet" },
                { src: "", alt: "Accessoires" },
              ],
            },
          },
          {
            id: "mode-look-gallery2",
            type: "gallery",
            props: {
              heading: "Elles portent — clientes réelles",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Cliente 1" },
                { src: "", alt: "Cliente 2" },
                { src: "", alt: "Cliente 3" },
                { src: "", alt: "Cliente 4" },
                { src: "", alt: "Cliente 5" },
                { src: "", alt: "Cliente 6" },
              ],
            },
          },
          {
            id: "mode-look-wa",
            type: "whatsapp",
            props: {
              label: "Partagez votre photo — rejoignez le lookbook",
              phone: "+221770000000",
              message: "Bonjour — je voudrais partager ma photo pour votre lookbook. Je porte votre pièce :",
            },
          },
          footer("mode-footer-lookbook"),
        ],
      },
      {
        slug: "commander",
        title: "Commander",
        sections: [
          nav("mode-nav-commander"),
          {
            id: "mode-cmd-hero",
            type: "hero",
            props: {
              heading: "Commander",
              subheading: "Remplissez le formulaire ou envoyez un WhatsApp — réponse sous 1h, livraison rapide.",
              buttonLabel: "Formulaire de commande",
              buttonHref: "#form",
              align: "left",
              background: "#0A0A0A",
            },
          },
          {
            id: "mode-cmd-process",
            type: "features",
            props: {
              heading: "Comment ça marche",
              items: [
                { title: "1. Choisissez votre pièce", body: "Dans la collection ou le lookbook — notez le nom de la pièce et la taille souhaitée." },
                { title: "2. Envoyez votre commande", body: "Formulaire ou WhatsApp — indiquez pièce, taille, couleur et adresse de livraison." },
                { title: "3. Confirmez et payez", body: "Acompte 50% par Wave ou Orange Money. Le reste à la livraison ou à l'expédition." },
                { title: "4. Livraison rapide", body: "Dakar J+1. Régions 2–3 jours. International sur devis — suivi WhatsApp à chaque étape." },
              ],
            },
          },
          {
            id: "mode-cmd-form",
            type: "form",
            props: {
              heading: "Formulaire de commande",
              subheading: "Remplissez — nous vous contactons sous 1h pour confirmer disponibilité et paiement.",
              buttonLabel: "Envoyer ma commande",
              successMessage: "Commande reçue — nous vous répondons sous 1h sur WhatsApp.",
              fields: [
                { id: "nom", label: "Prénom et nom", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "email", label: "Email (optionnel)", type: "email", required: false, placeholder: "votre@email.com", options: [] },
                { id: "piece", label: "Pièce souhaitée", type: "text", required: true, placeholder: "Robe wax bordeaux, ensemble tailleur…", options: [] },
                {
                  id: "taille",
                  label: "Taille",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Sur mesure (envoyez vos mensurations)"],
                },
                { id: "adresse", label: "Ville de livraison", type: "text", required: true, placeholder: "Dakar — Plateau, Mermoz, Thiès…", options: [] },
                {
                  id: "paiement",
                  label: "Mode de paiement",
                  type: "select",
                  required: false,
                  placeholder: "",
                  options: ["Wave", "Orange Money", "Espèces à la livraison", "Virement bancaire"],
                },
                {
                  id: "note",
                  label: "Instructions spéciales (optionnel)",
                  type: "textarea",
                  required: false,
                  placeholder: "Couleur, longueur, modifications souhaitées, cadeau…",
                  options: [],
                },
              ],
            },
          },
          {
            id: "mode-cmd-wa",
            type: "whatsapp",
            props: {
              label: "Je le veux — Commander directement sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander. Voici ma commande :\n- Pièce :\n- Taille :\n- Ville de livraison :\n- Paiement :",
            },
          },
          footer("mode-footer-commander"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("mode-nav-contact"),
          {
            id: "mode-contact-section",
            type: "contact",
            props: {
              heading: "Nous contacter",
              email: "mode@example.com",
              phone: "+221770000000",
              address: "Showroom sur rendez-vous — Dakar · Lun–sam 10h–19h",
            },
          },
          {
            id: "mode-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Comment connaître ma taille ?",
                  answer: "Envoyez vos mesures (tour de poitrine, taille, hanches, longueur souhaitée) sur WhatsApp — nous vous conseillons la taille ou proposons du sur-mesure.",
                },
                {
                  question: "Faites-vous du sur-mesure ?",
                  answer: "Oui — supplément selon la complexité. Délai : 5 à 10 jours ouvrés après validation des mensurations et du tissu.",
                },
                {
                  question: "Quels sont les délais de livraison ?",
                  answer: "Dakar J+1. Régions (Thiès, Saint-Louis, Kaolack, Ziguinchor…) 2–3 jours. International sur devis — délai variable selon la destination.",
                },
                {
                  question: "Puis-je retourner une pièce ?",
                  answer: "Échange possible sous 48h si la pièce n'a pas été portée et est dans son état d'origine. Les commandes sur mesure ne sont pas reprises.",
                },
              ],
            },
          },
          {
            id: "mode-contact-wa",
            type: "whatsapp",
            props: {
              label: "Nous écrire sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — j'ai une question sur votre boutique :",
            },
          },
          footer("mode-footer-contact"),
        ],
      },
    ],
  };
}

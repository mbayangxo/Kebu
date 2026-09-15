import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Maquis / Restaurant — West African maquis & open-air eatery.
 * Menu-first layout, daily specials, WhatsApp reservation, mobile money.
 * IA: Home · Menu · Spécialités · Réserver · Contact
 */

const NAV = [
  { label: "Menu", href: "/menu" },
  { label: "Spécialités", href: "/specialites" },
  { label: "Réserver", href: "/reserver" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "Maquis", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Maquis — grillades, attiéké, bonne ambiance.",
      links: [
        { label: "Menu", href: "/menu" },
        { label: "Réserver", href: "/reserver" },
      ],
    },
  };
}

export function maquisWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Maquis",
    theme: {
      primary: "#1B3A1B",
      accent: "#E8A020",
      background: "#FFFBF2",
      text: "#1B3A1B",
      fontDisplay: "Playfair Display",
      fontBody: "IBM Plex Sans",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "sahel-light",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("maquis-nav-home"),
          {
            id: "maquis-announce",
            type: "announcement-bar",
            props: {
              text: "Spécial du jour : Thiéboudienne rouge · Disponible jusqu'à 21 h",
              background: "#E8A020",
              textColor: "#1B3A1B",
            },
          },
          {
            id: "maquis-hero",
            type: "hero",
            props: {
              heading: "Le goût de chez nous, à votre table",
              subheading:
                "Grillades au charbon, attiéké maison, jus naturels — réservez votre place sur WhatsApp.",
              buttonLabel: "Réserver sur WhatsApp",
              buttonHref: "/reserver",
              align: "left",
              background: "#1B3A1B",
            },
          },
          {
            id: "maquis-specials",
            type: "features",
            props: {
              heading: "Au menu ce soir",
              items: [
                {
                  title: "Thiéboudienne",
                  body: "Riz au poisson sénégalais — plat emblématique, servi avec légumes du marché.",
                },
                {
                  title: "Grillades mixtes",
                  body: "Poulet, agneau, brochettes de bœuf — marinés à l'ail et au persil.",
                },
                {
                  title: "Attiéké poisson",
                  body: "Semoule de manioc fraîche avec poisson braisé et sauce tomate.",
                },
              ],
            },
          },
          {
            id: "maquis-gallery",
            type: "gallery",
            props: {
              heading: "La cuisine",
              layout: "featured",
              columns: 3,
              items: [
                { src: "", alt: "Plat du jour" },
                { src: "", alt: "Grillades" },
                { src: "", alt: "Ambiance maquis" },
              ],
            },
          },
          {
            id: "maquis-whatsapp",
            type: "whatsapp",
            props: {
              label: "Commander ou réserver sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais réserver une table / passer commande.",
            },
          },
          {
            id: "maquis-testimonials",
            type: "testimonials",
            props: {
              heading: "Ce que disent nos clients",
              items: [
                {
                  quote: "Le meilleur thiébou dieun de la ville. On revient chaque semaine !",
                  name: "Fatou D.",
                  role: "Cliente fidèle",
                },
                {
                  quote: "Ambiance au top, grillades parfaites, service rapide.",
                  name: "Ibrahima S.",
                  role: "Client",
                },
              ],
            },
          },
          footer("maquis-footer-home"),
        ],
      },
      {
        slug: "menu",
        title: "Menu",
        sections: [
          nav("maquis-nav-menu"),
          {
            id: "maquis-menu-hero",
            type: "hero",
            props: {
              heading: "Notre menu",
              subheading: "Des plats préparés chaque matin avec des ingrédients frais du marché.",
              buttonLabel: "Commander sur WhatsApp",
              buttonHref: "/reserver",
              align: "center",
              background: "#1B3A1B",
            },
          },
          {
            id: "maquis-menu-entrees",
            type: "features",
            props: {
              heading: "Entrées",
              items: [
                { title: "Salade de gésiers", body: "Gésiers confits, feuilles fraîches, vinaigrette citron." },
                { title: "Accras de crevettes", body: "Beignets croustillants, sauce pimentée maison." },
                { title: "Soupe de poisson", body: "Bouillon de poisson, légumes, épices locales." },
              ],
            },
          },
          {
            id: "maquis-menu-plats",
            type: "features",
            props: {
              heading: "Plats",
              items: [
                { title: "Thiéboudienne rouge", body: "Riz au poisson, légumes du marché — plat national." },
                { title: "Yassa poulet", body: "Poulet mariné aux oignons et citron, riz blanc." },
                { title: "Mafé bœuf", body: "Bœuf en sauce d'arachide onctueuse, riz ou attiéké." },
                { title: "Grillades mixtes", body: "Poulet, agneau, brochettes — servies avec attiéké." },
              ],
            },
          },
          {
            id: "maquis-menu-boissons",
            type: "features",
            props: {
              heading: "Boissons",
              items: [
                { title: "Bissap", body: "Jus d'hibiscus frais — sucré ou nature." },
                { title: "Gingembre", body: "Jus de gingembre pressé, légèrement sucré." },
                { title: "Bouye", body: "Jus de pain de singe — doux et rafraîchissant." },
              ],
            },
          },
          footer("maquis-footer-menu"),
        ],
      },
      {
        slug: "specialites",
        title: "Spécialités",
        sections: [
          nav("maquis-nav-spec"),
          {
            id: "maquis-spec-hero",
            type: "hero",
            props: {
              heading: "Spécialités du maquis",
              subheading:
                "Recettes transmises de mère en fille — plats qui changent chaque semaine selon le marché.",
              buttonLabel: "Voir les disponibilités",
              buttonHref: "/reserver",
              align: "left",
              background: "#1B3A1B",
            },
          },
          {
            id: "maquis-spec-body",
            type: "text",
            props: {
              heading: "Plats du terroir",
              body: "Notre carte évolue chaque semaine selon les arrivages du marché Tilène et les saisons. Suivez notre WhatsApp pour le menu du jour. Nous proposons aussi des plats en grande quantité pour les cérémonies, baptêmes et mariages — contactez-nous pour un devis.",
            },
          },
          {
            id: "maquis-spec-gallery",
            type: "gallery",
            props: {
              heading: "Cette semaine",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Plat spécial 1" },
                { src: "", alt: "Plat spécial 2" },
                { src: "", alt: "Plat spécial 3" },
              ],
            },
          },
          footer("maquis-footer-spec"),
        ],
      },
      {
        slug: "reserver",
        title: "Réserver",
        sections: [
          nav("maquis-nav-reserve"),
          {
            id: "maquis-reserve-hero",
            type: "hero",
            props: {
              heading: "Réservez votre table",
              subheading: "Envoyez un message WhatsApp ou remplissez le formulaire — confirmation rapide.",
              buttonLabel: "WhatsApp direct",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#1B3A1B",
            },
          },
          {
            id: "maquis-reserve-form",
            type: "form",
            props: {
              heading: "Demande de réservation",
              subheading: "Nous vous confirmons en moins d'une heure.",
              buttonLabel: "Envoyer la demande",
              successMessage: "Reçu — nous confirmons votre table bientôt.",
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
                  id: "nbpersonnes",
                  label: "Nombre de personnes",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["1–2", "3–4", "5–6", "7–10", "10+"],
                },
                {
                  id: "message",
                  label: "Date, heure et souhaits",
                  type: "textarea",
                  required: true,
                  placeholder: "Vendredi 19 h · terrasse · table d'anniversaire",
                  options: [],
                },
              ],
            },
          },
          {
            id: "maquis-reserve-wa",
            type: "whatsapp",
            props: {
              label: "Réserver sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais réserver une table.",
            },
          },
          footer("maquis-footer-reserve"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("maquis-nav-contact"),
          {
            id: "maquis-contact-section",
            type: "contact",
            props: {
              heading: "Nous trouver",
              email: "maquis@example.com",
              phone: "+221770000000",
              address: "Votre adresse — marché, quartier, ville",
            },
          },
          {
            id: "maquis-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Acceptez-vous les réservations de groupe ?",
                  answer: "Oui — pour les cérémonies et événements, contactez-nous sur WhatsApp pour un devis.",
                },
                {
                  question: "Quels moyens de paiement ?",
                  answer: "Espèces, Wave, Orange Money — remplacez selon votre restaurant.",
                },
                {
                  question: "Y a-t-il un parking ?",
                  answer: "Oui, parking disponible devant le maquis — à remplir selon l'adresse réelle.",
                },
              ],
            },
          },
          footer("maquis-footer-contact"),
        ],
      },
    ],
  };
}

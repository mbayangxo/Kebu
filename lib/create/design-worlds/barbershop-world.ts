import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Barbershop — West African urban barbershop / salon homme.
 * Service tiles, before/after photos, WhatsApp appointment booking.
 * IA: Home · Services · Galerie · Réserver · FAQ
 */

const NAV = [
  { label: "Services", href: "/services" },
  { label: "Galerie", href: "/galerie" },
  { label: "Réserver", href: "/reserver" },
  { label: "FAQ", href: "/faq" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "Barber", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Barber — coupe propre, style affirmé.",
      links: [
        { label: "Services", href: "/services" },
        { label: "Réserver", href: "/reserver" },
      ],
    },
  };
}

export function barbershopWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Barbershop",
    theme: {
      primary: "#111827",
      accent: "#D4AF37",
      background: "#F9F8F5",
      text: "#111827",
      fontDisplay: "Bebas Neue",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      aestheticId: "noir-gold",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("barber-nav-home"),
          {
            id: "barber-hero",
            type: "hero",
            props: {
              heading: "Coupe nette. Style affirmé.",
              subheading:
                "Dégradés, rasage au couteau, barbe — réservez votre place en 30 secondes sur WhatsApp.",
              buttonLabel: "Réserver maintenant",
              buttonHref: "/reserver",
              align: "left",
              background: "#111827",
            },
          },
          {
            id: "barber-services-home",
            type: "features",
            props: {
              heading: "Nos services",
              items: [
                {
                  title: "Coupe + dégradé",
                  body: "Toutes textures — afro, dreadlocks, cheveux lisses. Finition parfaite.",
                },
                {
                  title: "Rasage barbe",
                  body: "Rasage au couteau chaud, soin barbe, tracé précis.",
                },
                {
                  title: "Coloration",
                  body: "Touches de couleur, teinture complète — produits de qualité.",
                },
              ],
            },
          },
          {
            id: "barber-gallery-home",
            type: "gallery",
            props: {
              heading: "Le travail parle",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Avant / Après 1" },
                { src: "", alt: "Avant / Après 2" },
                { src: "", alt: "Coupe dégradé" },
                { src: "", alt: "Barbe rasée" },
                { src: "", alt: "Style afro" },
                { src: "", alt: "Ambiance salon" },
              ],
            },
          },
          {
            id: "barber-whatsapp",
            type: "whatsapp",
            props: {
              label: "Réserver sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais prendre rendez-vous au barbershop.",
            },
          },
          {
            id: "barber-testimonials",
            type: "testimonials",
            props: {
              heading: "Ils en parlent",
              items: [
                {
                  quote: "Meilleur dégradé de la ville. Mon coiffeur depuis 2 ans.",
                  name: "Moussa K.",
                  role: "Client",
                },
                {
                  quote: "Rasage propre, finition impeccable — exactement ce que je voulais.",
                  name: "Abdou T.",
                  role: "Client fidèle",
                },
              ],
            },
          },
          footer("barber-footer-home"),
        ],
      },
      {
        slug: "services",
        title: "Services",
        sections: [
          nav("barber-nav-services"),
          {
            id: "barber-services-hero",
            type: "hero",
            props: {
              heading: "Services & Tarifs",
              subheading: "Tous les prix sont indicatifs — contactez-nous pour un devis précis.",
              buttonLabel: "Réserver",
              buttonHref: "/reserver",
              align: "center",
              background: "#111827",
            },
          },
          {
            id: "barber-services-list",
            type: "features",
            props: {
              heading: "Ce qu'on fait",
              items: [
                { title: "Coupe simple", body: "Coupe classique, finition tondeuse — rapide et nette." },
                { title: "Coupe + dégradé", body: "Dégradé bas, moyen ou haut — toutes textures." },
                { title: "Coupe + barbe", body: "Combo coupe et taille de barbe, tracé précis." },
                { title: "Rasage intégral", body: "Rasage crème chaude, couteau droit, serviette froide." },
                { title: "Soin cuir chevelu", body: "Traitement hydratant — cheveux secs ou abîmés." },
                { title: "Coloration", body: "Teinture noire, brun, ou touches de couleur." },
              ],
            },
          },
          footer("barber-footer-services"),
        ],
      },
      {
        slug: "galerie",
        title: "Galerie",
        sections: [
          nav("barber-nav-galerie"),
          {
            id: "barber-galerie-hero",
            type: "hero",
            props: {
              heading: "Avant / Après",
              subheading: "Chaque coupe est une signature — ajoutez vos meilleures photos ici.",
              buttonLabel: "Réserver une coupe",
              buttonHref: "/reserver",
              align: "left",
              background: "#111827",
            },
          },
          {
            id: "barber-galerie-grid",
            type: "gallery",
            props: {
              heading: "Le travail",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Photo 1" },
                { src: "", alt: "Photo 2" },
                { src: "", alt: "Photo 3" },
                { src: "", alt: "Photo 4" },
                { src: "", alt: "Photo 5" },
                { src: "", alt: "Photo 6" },
              ],
            },
          },
          footer("barber-footer-galerie"),
        ],
      },
      {
        slug: "reserver",
        title: "Réserver",
        sections: [
          nav("barber-nav-reserve"),
          {
            id: "barber-reserve-hero",
            type: "hero",
            props: {
              heading: "Prenez rendez-vous",
              subheading: "WhatsApp ou formulaire — on confirme votre créneau rapidement.",
              buttonLabel: "WhatsApp",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#111827",
            },
          },
          {
            id: "barber-reserve-form",
            type: "form",
            props: {
              heading: "Formulaire de réservation",
              subheading: "Indiquez le service souhaité et votre disponibilité.",
              buttonLabel: "Envoyer",
              successMessage: "Demande reçue — on vous confirme le créneau.",
              fields: [
                { id: "nom", label: "Prénom", type: "text", required: true, placeholder: "", options: [] },
                {
                  id: "telephone",
                  label: "WhatsApp",
                  type: "phone",
                  required: true,
                  placeholder: "+221…",
                  options: [],
                },
                {
                  id: "service",
                  label: "Service",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Coupe simple", "Coupe + dégradé", "Coupe + barbe", "Rasage barbe", "Coloration"],
                },
                {
                  id: "disponibilite",
                  label: "Jour et heure souhaitée",
                  type: "textarea",
                  required: false,
                  placeholder: "Samedi matin ou lundi après 16 h",
                  options: [],
                },
              ],
            },
          },
          {
            id: "barber-reserve-wa",
            type: "whatsapp",
            props: {
              label: "Réserver directement sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais prendre rendez-vous pour une coupe.",
            },
          },
          footer("barber-footer-reserve"),
        ],
      },
      {
        slug: "faq",
        title: "FAQ",
        sections: [
          nav("barber-nav-faq"),
          {
            id: "barber-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Comment réserver ?",
                  answer: "WhatsApp ou formulaire — confirmation en moins d'une heure.",
                },
                {
                  question: "Faut-il prendre rendez-vous ?",
                  answer: "Recommandé le week-end. En semaine, passage direct souvent possible.",
                },
                {
                  question: "Quels moyens de paiement ?",
                  answer: "Espèces, Wave, Orange Money — remplacez selon votre salon.",
                },
                {
                  question: "Faites-vous des coupes pour enfants ?",
                  answer: "Oui — tarif enfant disponible, précisez l'âge à la réservation.",
                },
              ],
            },
          },
          footer("barber-footer-faq"),
        ],
      },
    ],
  };
}

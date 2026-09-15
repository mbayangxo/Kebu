import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Église / Communauté de foi — West African church or faith community.
 * Service times, announcements, events, donations (mobile money), community.
 * IA: Home · Cultes & Horaires · Annonces · Donner · Contact
 */

const NAV = [
  { label: "Cultes & Horaires", href: "/cultes" },
  { label: "Annonces", href: "/annonces" },
  { label: "Donner", href: "/donner" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "Église", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Église — communauté de foi, cultes, annonces. Tous sont bienvenus.",
      links: [
        { label: "Cultes & Horaires", href: "/cultes" },
        { label: "Annonces", href: "/annonces" },
        { label: "Donner", href: "/donner" },
      ],
    },
  };
}

export function egliseWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Église",
    theme: {
      primary: "#2C1A5E",
      accent: "#C8A951",
      background: "#FDFBF7",
      text: "#1A1030",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Open Sans",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "faith-purple-gold",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("egl-nav-home"),
          {
            id: "egl-announce",
            type: "announcement-bar",
            props: {
              text: "Culte du dimanche — 9h00 & 11h00 · Culte de prière le mercredi à 18h30",
              background: "#2C1A5E",
              textColor: "#C8A951",
            },
          },
          {
            id: "egl-hero",
            type: "hero",
            props: {
              heading: "Venez tel que vous êtes",
              subheading:
                "Communauté de foi ouverte à tous — cultes le dimanche, groupes de prière, événements. Rejoignez-nous ou suivez en ligne.",
              buttonLabel: "Nos horaires de culte",
              buttonHref: "/cultes",
              align: "left",
              background: "#2C1A5E",
            },
          },
          {
            id: "egl-vie",
            type: "features",
            props: {
              heading: "La vie de l'église",
              items: [
                {
                  title: "Cultes du dimanche",
                  body: "Deux services — 9h00 et 11h00. Louange, prédication, prière. Crèche disponible pour les enfants.",
                },
                {
                  title: "Prière du mercredi",
                  body: "Culte de prière chaque mercredi à 18h30 — intercession, étude de la Parole, partage.",
                },
                {
                  title: "Groupes cellules",
                  body: "Réunions en petits groupes par quartier, chaque semaine. Fraternité, étude biblique, prière.",
                },
                {
                  title: "École du dimanche",
                  body: "Enseignement biblique pour les enfants (3–15 ans) pendant les cultes du dimanche.",
                },
              ],
            },
          },
          {
            id: "egl-annonces-recentes",
            type: "features",
            props: {
              heading: "Annonces récentes",
              items: [
                {
                  title: "Retraite spirituelle — date à préciser",
                  body: "Week-end de retraite pour toute la communauté — lieu et programme à venir. Inscriptions ouvertes.",
                },
                {
                  title: "Collecte spéciale — projet construction",
                  body: "Nous construisons une nouvelle salle de culte — chaque don compte. Wave, Orange Money ou remise en main propre.",
                },
                {
                  title: "Conférence jeunesse",
                  body: "Conférence pour les 15–30 ans — intervenants locaux et internationaux. Date à confirmer.",
                },
              ],
            },
          },
          {
            id: "egl-gallery-home",
            type: "gallery",
            props: {
              heading: "Notre communauté",
              layout: "featured",
              columns: 3,
              items: [
                { src: "", alt: "Culte dimanche" },
                { src: "", alt: "Chorale" },
                { src: "", alt: "Prière" },
                { src: "", alt: "Enfants école dimanche" },
                { src: "", alt: "Groupe cellule" },
              ],
            },
          },
          {
            id: "egl-don-cta",
            type: "whatsapp",
            props: {
              label: "Nous rejoindre ou nous contacter sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je souhaite en savoir plus sur votre église / vos cultes.",
            },
          },
          footer("egl-footer-home"),
        ],
      },
      {
        slug: "cultes",
        title: "Cultes & Horaires",
        sections: [
          nav("egl-nav-cultes"),
          {
            id: "egl-cultes-hero",
            type: "hero",
            props: {
              heading: "Cultes & Horaires",
              subheading: "Rejoignez-nous chaque semaine — tous les détails de nos services et réunions.",
              buttonLabel: "Nous trouver",
              buttonHref: "/contact",
              align: "center",
              background: "#2C1A5E",
            },
          },
          {
            id: "egl-cultes-horaires",
            type: "features",
            props: {
              heading: "Horaires réguliers",
              items: [
                {
                  title: "Culte du dimanche — 9h00",
                  body: "Service principal — louange, prédication, communion mensuelle (premier dimanche du mois).",
                },
                {
                  title: "Culte du dimanche — 11h00",
                  body: "Second service — même programme. Idéal pour les familles avec enfants (crèche disponible).",
                },
                {
                  title: "Prière du mercredi — 18h30",
                  body: "Culte de prière et d'intercession — environ 1 h. Ouvert à tous.",
                },
                {
                  title: "Cellules par quartier — variable",
                  body: "Réunions hebdomadaires en petits groupes. Contactez-nous pour trouver le groupe le plus proche de chez vous.",
                },
              ],
            },
          },
          {
            id: "egl-cultes-specials",
            type: "features",
            props: {
              heading: "Événements spéciaux à venir",
              items: [
                { title: "Veillée de prière", body: "Nuit de prière — date à confirmer. Ouvert à tous les membres et amis." },
                { title: "Culte de Noël", body: "25 décembre — culte spécial famille, 10h00. Invitez vos proches." },
                { title: "Retraite jeunesse", body: "Week-end spécial pour les 15–30 ans — date et lieu à venir." },
              ],
            },
          },
          {
            id: "egl-cultes-gallery",
            type: "gallery",
            props: {
              heading: "Moments de culte",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Louange" },
                { src: "", alt: "Prédication" },
                { src: "", alt: "Chorale" },
                { src: "", alt: "Prière collective" },
                { src: "", alt: "Baptême" },
                { src: "", alt: "Communion" },
              ],
            },
          },
          footer("egl-footer-cultes"),
        ],
      },
      {
        slug: "annonces",
        title: "Annonces",
        sections: [
          nav("egl-nav-annonces"),
          {
            id: "egl-annonces-hero",
            type: "hero",
            props: {
              heading: "Annonces",
              subheading: "Actualités de l'église — événements, collectes, formations, appels à bénévoles.",
              buttonLabel: "Nous rejoindre",
              buttonHref: "/contact",
              align: "left",
              background: "#2C1A5E",
            },
          },
          {
            id: "egl-annonces-list",
            type: "features",
            props: {
              heading: "Annonces du mois",
              items: [
                {
                  title: "Construction — salle polyvalente",
                  body: "Le projet de construction avance — nous avons besoin de votre soutien financier. Cible : 25 000 000 FCFA. Acquis : 14 500 000 FCFA. Donnez via Wave / Orange Money ou à l'église.",
                },
                {
                  title: "Formation des responsables de cellules",
                  body: "Journée de formation pour tous les responsables de groupes — samedi prochain, 9h à 17h. Inscription obligatoire.",
                },
                {
                  title: "Collecte vêtements & fournitures scolaires",
                  body: "Apportez vos dons au secrétariat avant fin du mois — redistribution aux familles dans le besoin.",
                },
                {
                  title: "Chorale — recrutement",
                  body: "La chorale cherche des voix — soprano, alto, ténor, basse. Répétitions le samedi à 16h. Contactez le chef de chorale.",
                },
              ],
            },
          },
          {
            id: "egl-annonces-wa",
            type: "whatsapp",
            props: {
              label: "Recevoir les annonces sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je souhaite rejoindre le groupe WhatsApp de l'église pour recevoir les annonces.",
            },
          },
          footer("egl-footer-annonces"),
        ],
      },
      {
        slug: "donner",
        title: "Donner",
        sections: [
          nav("egl-nav-donner"),
          {
            id: "egl-donner-hero",
            type: "hero",
            props: {
              heading: "Soutenez l'église",
              subheading: "Dîme, offrande, don pour la construction — Wave, Orange Money ou en mains propres.",
              buttonLabel: "Faire un don maintenant",
              buttonHref: "#form",
              align: "center",
              background: "#2C1A5E",
            },
          },
          {
            id: "egl-donner-options",
            type: "features",
            props: {
              heading: "Comment donner",
              items: [
                {
                  title: "Wave",
                  body: "Envoyez directement au numéro de l'église sur Wave — mentionnez 'Don église' dans le libellé.",
                },
                {
                  title: "Orange Money",
                  body: "Transfert au numéro Orange Money de l'église — reçu fourni sur demande.",
                },
                {
                  title: "En mains propres",
                  body: "Dons acceptés au secrétariat ou lors des cultes — enveloppes disponibles à l'entrée.",
                },
                {
                  title: "Virement bancaire",
                  body: "Pour les dons importants — contactez le secrétariat pour les coordonnées bancaires.",
                },
              ],
            },
          },
          {
            id: "egl-donner-form",
            type: "form",
            props: {
              heading: "Annoncer un don ou une dîme",
              subheading: "Pour un suivi et un reçu — indiquez votre intention de don. Nous vous envoyons les détails de paiement par WhatsApp.",
              buttonLabel: "Envoyer",
              successMessage: "Merci ! Nous vous contactons pour finaliser votre don.",
              fields: [
                { id: "nom", label: "Prénom et nom", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                {
                  id: "type",
                  label: "Type de don",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Dîme", "Offrande", "Don construction", "Collecte vêtements / fournitures", "Autre"],
                },
                { id: "montant", label: "Montant (FCFA)", type: "text", required: false, placeholder: "Ex : 10 000 FCFA", options: [] },
                {
                  id: "mode",
                  label: "Mode de paiement souhaité",
                  type: "select",
                  required: false,
                  placeholder: "",
                  options: ["Wave", "Orange Money", "En mains propres", "Virement bancaire"],
                },
              ],
            },
          },
          footer("egl-footer-donner"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("egl-nav-contact"),
          {
            id: "egl-contact-section",
            type: "contact",
            props: {
              heading: "Nous trouver",
              email: "eglise@example.com",
              phone: "+221770000000",
              address: "Votre adresse — quartier, ville · Cultes : dim 9h & 11h · Mer 18h30",
            },
          },
          {
            id: "egl-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Faut-il être membre pour assister aux cultes ?",
                  answer: "Non — tous sont bienvenus. Venez tel que vous êtes, peu importe votre parcours.",
                },
                {
                  question: "Comment devenir membre ?",
                  answer: "Assistez aux cultes, participez à un groupe de cellule, puis rencontrez un pasteur. Nous vous accompagnons.",
                },
                {
                  question: "Y a-t-il une garde d'enfants pendant les cultes ?",
                  answer: "Oui — crèche pour les 0–3 ans et école du dimanche pour les 3–15 ans pendant les deux services du dimanche.",
                },
              ],
            },
          },
          footer("egl-footer-contact"),
        ],
      },
    ],
  };
}

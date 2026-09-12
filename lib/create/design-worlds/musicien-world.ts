import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Musicien — West African musician / artiste.
 * Audio-first layout, Boomplay + Audiomack streaming links, event bookings, merch.
 * IA: Home · Musique · Événements · Merch · Contact
 */

const NAV = [
  { label: "Musique", href: "/musique" },
  { label: "Événements", href: "/evenements" },
  { label: "Merch", href: "/merch" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "Artiste", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© Artiste — musique, événements, merch. Streaming sur Boomplay & Audiomack.",
      links: [
        { label: "Musique", href: "/musique" },
        { label: "Événements", href: "/evenements" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function musicienWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Musicien",
    theme: {
      primary: "#0D0D0D",
      accent: "#FF3C00",
      background: "#111111",
      text: "#F5F5F5",
      fontDisplay: "Bebas Neue",
      fontBody: "Inter",
      spacing: "airy",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      aestheticId: "dark-fire-stage",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("music-nav-home"),
          {
            id: "music-announce",
            type: "announcement-bar",
            props: {
              text: "Nouvel EP disponible — écoutez sur Boomplay & Audiomack maintenant",
              background: "#FF3C00",
              textColor: "#fff",
            },
          },
          {
            id: "music-hero",
            type: "hero",
            props: {
              heading: "La musique africaine, sans frontières",
              subheading:
                "Afrobeat, afropop, coupé-décalé — musique disponible sur Boomplay, Audiomack et toutes les plateformes. Réservation d'artiste sur WhatsApp.",
              buttonLabel: "Écouter maintenant",
              buttonHref: "/musique",
              align: "left",
              background: "#0D0D0D",
            },
          },
          {
            id: "music-releases",
            type: "features",
            props: {
              heading: "Dernières sorties",
              items: [
                {
                  title: "Nouvel EP — «Titre EP»",
                  body: "5 titres. Disponible sur Boomplay, Audiomack, Spotify, Apple Music. Écoutez maintenant ↗",
                },
                {
                  title: "Single «Titre Single»",
                  body: "Feat. Artiste invité. Clip officiel sur YouTube — plus de 100 000 vues.",
                },
                {
                  title: "Album «Titre Album»",
                  body: "12 titres, 2023. Votre premier album — best-seller sur Boomplay en Afrique de l'Ouest.",
                },
              ],
            },
          },
          {
            id: "music-streaming-links",
            type: "features",
            props: {
              heading: "Streaming",
              items: [
                {
                  title: "Boomplay",
                  body: "Plateforme numéro 1 en Afrique — retrouvez toute la discographie sur Boomplay Music.",
                },
                {
                  title: "Audiomack",
                  body: "Écoutez gratuitement sur Audiomack — mixtapes, singles, albums en streaming.",
                },
                {
                  title: "Autres plateformes",
                  body: "Disponible aussi sur Spotify, Apple Music, Deezer, YouTube Music — cherchez le nom d'artiste.",
                },
              ],
            },
          },
          {
            id: "music-gallery-home",
            type: "gallery",
            props: {
              heading: "En images",
              layout: "featured",
              columns: 3,
              items: [
                { src: "", alt: "Scène concert" },
                { src: "", alt: "Backstage" },
                { src: "", alt: "Shooting cover" },
                { src: "", alt: "Clip tournage" },
                { src: "", alt: "Festival" },
              ],
            },
          },
          {
            id: "music-booking-cta",
            type: "whatsapp",
            props: {
              label: "Réserver l'artiste pour votre événement — WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais réserver l'artiste pour un événement. Pouvez-vous me donner les disponibilités et le cachet ?",
            },
          },
          footer("music-footer-home"),
        ],
      },
      {
        slug: "musique",
        title: "Musique",
        sections: [
          nav("music-nav-musique"),
          {
            id: "music-musique-hero",
            type: "hero",
            props: {
              heading: "Discographie",
              subheading: "Albums, EPs, singles — toute la musique en un seul endroit.",
              buttonLabel: "Écouter sur Boomplay",
              buttonHref: "#boomplay",
              align: "center",
              background: "#0D0D0D",
            },
          },
          {
            id: "music-discography",
            type: "features",
            props: {
              heading: "Albums & EPs",
              items: [
                {
                  title: "«Titre Album» — 2023",
                  body: "12 titres. Genre : Afrobeat / Afropop. Disponible sur toutes les plateformes. 🎵 Boomplay · Audiomack · Spotify",
                },
                {
                  title: "«Titre EP» — 2024",
                  body: "5 titres. Genre : Afropop / Coupé-décalé. Premier EP — produit à Dakar. 🎵 Boomplay · Audiomack",
                },
              ],
            },
          },
          {
            id: "music-singles",
            type: "features",
            props: {
              heading: "Singles notables",
              items: [
                { title: "«Single 1» — feat. Artiste A", body: "200 000+ streams Boomplay. Produit par Producer X." },
                { title: "«Single 2»", body: "Clip officiel YouTube — 150 000+ vues en 2 semaines." },
                { title: "«Single 3» — feat. Artiste B", body: "Collaboration internationale — disponible partout." },
              ],
            },
          },
          {
            id: "music-gallery-musique",
            type: "gallery",
            props: {
              heading: "Covers & visuels",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Cover album" },
                { src: "", alt: "Cover EP" },
                { src: "", alt: "Cover single 1" },
                { src: "", alt: "Cover single 2" },
                { src: "", alt: "Cover single 3" },
                { src: "", alt: "Cover promo" },
              ],
            },
          },
          footer("music-footer-musique"),
        ],
      },
      {
        slug: "evenements",
        title: "Événements",
        sections: [
          nav("music-nav-evenements"),
          {
            id: "music-events-hero",
            type: "hero",
            props: {
              heading: "Concerts & Événements",
              subheading: "Retrouvez l'artiste en live — concerts, festivals, galas, soirées privées.",
              buttonLabel: "Réserver pour votre événement",
              buttonHref: "#booking",
              align: "left",
              background: "#0D0D0D",
            },
          },
          {
            id: "music-events-upcoming",
            type: "features",
            props: {
              heading: "Prochains concerts",
              items: [
                {
                  title: "Concert — Dakar",
                  body: "Date : à confirmer · Lieu : à confirmer · Billets disponibles sur WhatsApp.",
                },
                {
                  title: "Festival — Abidjan",
                  body: "Date : à confirmer · Ouvert au public — entrée libre ou billetterie.",
                },
                {
                  title: "Gala privé — sur invitation",
                  body: "Soirées VIP sur invitation — contactez le management.",
                },
              ],
            },
          },
          {
            id: "music-events-gallery",
            type: "gallery",
            props: {
              heading: "Photos de scène",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Concert Dakar" },
                { src: "", alt: "Festival" },
                { src: "", alt: "Scène nuit" },
                { src: "", alt: "Public foule" },
                { src: "", alt: "Backstage" },
                { src: "", alt: "Danse scène" },
              ],
            },
          },
          {
            id: "music-booking-form",
            type: "form",
            props: {
              heading: "Réserver l'artiste",
              subheading: "Remplissez le formulaire — le management vous répond sous 48 h.",
              buttonLabel: "Envoyer la demande",
              successMessage: "Demande de booking reçue — nous vous répondons sous 48 h.",
              fields: [
                { id: "nom", label: "Prénom et nom (organisateur)", type: "text", required: true, placeholder: "", options: [] },
                { id: "telephone", label: "WhatsApp", type: "phone", required: true, placeholder: "+221…", options: [] },
                { id: "email", label: "Email", type: "email", required: false, placeholder: "votre@email.com", options: [] },
                { id: "date", label: "Date de l'événement", type: "text", required: true, placeholder: "Ex : samedi 20 avril 2025", options: [] },
                { id: "lieu", label: "Lieu", type: "text", required: true, placeholder: "Ville, salle…", options: [] },
                {
                  id: "type",
                  label: "Type d'événement",
                  type: "select",
                  required: true,
                  placeholder: "",
                  options: ["Concert public", "Festival", "Soirée privée / gala", "Événement d'entreprise", "Mariage / baptême", "Autre"],
                },
                {
                  id: "details",
                  label: "Détails supplémentaires",
                  type: "textarea",
                  required: false,
                  placeholder: "Nombre d'invités estimé, budget prévu, demandes particulières…",
                  options: [],
                },
              ],
            },
          },
          footer("music-footer-evenements"),
        ],
      },
      {
        slug: "merch",
        title: "Merch",
        sections: [
          nav("music-nav-merch"),
          {
            id: "music-merch-hero",
            type: "hero",
            props: {
              heading: "Boutique officielle",
              subheading: "T-shirts, casquettes, posters — commandez sur WhatsApp, paiement Wave ou Orange Money, livraison à domicile.",
              buttonLabel: "Commander sur WhatsApp",
              buttonHref: "#whatsapp",
              align: "center",
              background: "#0D0D0D",
            },
          },
          {
            id: "music-merch-products",
            type: "products",
            props: {
              heading: "Merch disponible",
              layout: "grid",
              columns: 3,
              items: [],
            },
          },
          {
            id: "music-merch-wa",
            type: "whatsapp",
            props: {
              label: "Commander le merch sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais commander du merch officiel. Quelles sont les références disponibles ?",
            },
          },
          footer("music-footer-merch"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("music-nav-contact"),
          {
            id: "music-contact-section",
            type: "contact",
            props: {
              heading: "Management & Contact",
              email: "management@artiste.example",
              phone: "+221770000000",
              address: "Management — Dakar, Sénégal · Disponible partout en Afrique",
            },
          },
          {
            id: "music-contact-wa",
            type: "whatsapp",
            props: {
              label: "Contacter le management sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour — je voudrais contacter le management de l'artiste.",
            },
          },
          {
            id: "music-faq",
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                {
                  question: "Comment réserver l'artiste pour un événement ?",
                  answer: "Remplissez le formulaire sur la page Événements ou envoyez un WhatsApp au management — réponse sous 48 h.",
                },
                {
                  question: "Où écouter la musique gratuitement ?",
                  answer: "Sur Boomplay et Audiomack — streaming gratuit avec publicités, ou premium sans pub.",
                },
                {
                  question: "Comment commander le merch ?",
                  answer: "Envoyez un WhatsApp avec la référence et la taille — livraison partout au Sénégal et dans la région.",
                },
                {
                  question: "L'artiste fait-il des collaborations ?",
                  answer: "Oui — envoyez votre projet au management par WhatsApp ou email. Toutes les demandes sont lues.",
                },
              ],
            },
          },
          footer("music-footer-contact"),
        ],
      },
    ],
  };
}

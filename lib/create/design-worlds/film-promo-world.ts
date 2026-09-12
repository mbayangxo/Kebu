import type { WebsiteDefinition } from "../website-schema";

/**
 * DËKK BI — Page promotionnelle film africain
 * Dark cinematic: noir cinéma + or cinéma + rouge intense
 * Cormorant Garamond (display) + Inter (body)
 * Promotion de film, sortie ciné, bande-annonce, presse
 */
export function filmPromoWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: 1,
    title: "DËKK BI — Le Film",
    theme: {
      primary: "#080808",
      accent: "#D4A017",
      background: "#080808",
      text: "#F0EDE8",
      fontHeading: "Cormorant Garamond",
      fontBody: "Inter",
      borderRadius: "none",
      spacing: "comfortable",
      aestheticId: "dark-cinematic-film-promo",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "🎬 EN SALLE — 14 mars 2025 dans tous les cinémas du Sénégal et de Côte d'Ivoire",
              background: "#D4A017",
              color: "#080808",
              linkText: "Trouver une salle",
              linkUrl: "/salles",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Un film de Mamadou Diallo",
              heading: "DËKK BI",
              subheading:
                "Dans les rues de Dakar, un jeune mécanicien découvre que son père disparu était au cœur d'un secret qui change tout. Un thriller africain haletant.",
              primaryCta: { label: "Bande-annonce", href: "#trailer" },
              secondaryCta: { label: "Trouver une salle", href: "/salles" },
              backgroundImageUrl: "",
              overlay: 0.7,
              textAlign: "center",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "★★★★", label: "Libération" },
                { value: "★★★★½", label: "Jeune Afrique" },
                { value: "Sélection", label: "FESPACO 2025" },
                { value: "Meilleur film", label: "FICA Abidjan" },
              ],
              background: "#D4A017",
            },
          },
          {
            type: "video",
            props: {
              heading: "Bande-annonce",
              url: "https://www.youtube.com/watch?v=example",
              caption: "DËKK BI — Bande-annonce officielle · 2025",
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Synopsis",
              heading: "Un secret enfoui.\nUne vérité qui brûle.",
              body: "Dakar, 2024. Modou, 24 ans, vit de petits boulots dans un garage de la Médina. Quand sa mère lui remet une clé USB trouvée dans les affaires de son père disparu dix ans plus tôt, sa vie bascule. Les fichiers qu'elle contient menacent des hommes puissants — et sa propre survie. DËKK BI est un thriller tendu, ancré dans le quotidien dakarois, tourné entièrement en wolof et en français.",
              imageUrl: "",
              imageSide: "right",
            },
          },
          {
            type: "features",
            props: {
              heading: "L'équipe",
              layout: "grid",
              items: [
                {
                  icon: "🎬",
                  title: "Mamadou Diallo",
                  description: "Réalisateur. Après 'Thiossane' (2020) et 'Grand Dakar' (2022), il signe ici son thriller le plus ambitieux.",
                },
                {
                  icon: "🎭",
                  title: "Ibrahima Sarr",
                  description: "Modou. Acteur de théâtre et de série. Révélation du film, nommé meilleur acteur FICA 2025.",
                },
                {
                  icon: "🎭",
                  title: "Khady Mbaye",
                  description: "Aïssatou, la mère. Comédienne de la troupe du Théâtre National Daniel Sorano.",
                },
                {
                  icon: "🎵",
                  title: "Wally Seck",
                  description: "Bande originale. Musique originale composée spécialement pour le film.",
                },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Photos de tournage",
              layout: "masonry",
              images: [
                { url: "", alt: "Tournage Médina Dakar" },
                { url: "", alt: "Ibrahima Sarr sur le plateau" },
                { url: "", alt: "Scène nuit port de Dakar" },
                { url: "", alt: "Behind the scenes réalisateur" },
                { url: "", alt: "Scène garage Médina" },
                { url: "", alt: "Conférence de presse Dakar" },
              ],
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "La critique",
              items: [
                {
                  quote:
                    "Un thriller africain d'une maîtrise rare. Mamadou Diallo impose son style — tendu, ancré, cinématographiquement généreux.",
                  author: "Olivier Barlet",
                  role: "Africultures",
                },
                {
                  quote:
                    "Ibrahima Sarr est une révélation. Il porte le film sur ses épaules avec une intensité qui ne lâche jamais le spectateur.",
                  author: "Marie-Louise Petit",
                  role: "Libération",
                },
                {
                  quote:
                    "DËKK BI prouve que le cinéma africain n'a plus rien à envier aux productions internationales. Une grande réussite.",
                  author: "Rédaction",
                  role: "Jeune Afrique",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "salles",
        title: "Salles & séances",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Où voir DËKK BI",
              subheading: "En salle dès le 14 mars 2025 au Sénégal, en Côte d'Ivoire, au Mali et en France.",
              backgroundImageUrl: "",
              overlay: 0.65,
            },
          },
          {
            type: "events",
            props: {
              heading: "Programmation",
              items: [
                {
                  title: "Avant-première — Dakar",
                  date: "2025-03-10T19:30:00",
                  location: "Cinéma MaCy, Plateau, Dakar",
                  description: "Présence de l'équipe du film. Séance de questions-réponses après la projection.",
                  price: "25 000 FCFA",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221700000000",
                },
                {
                  title: "Sortie nationale Sénégal",
                  date: "2025-03-14T00:00:00",
                  location: "Tous les cinémas partenaires",
                  description: "Séances quotidiennes 16h, 18h30, 21h00. Tarif normal en vigueur.",
                  price: "5 000 FCFA",
                  ctaLabel: "Voir les cinémas",
                  ctaHref: "/salles",
                },
                {
                  title: "Avant-première — Abidjan",
                  date: "2025-03-21T20:00:00",
                  location: "Cinéma Majestic, Plateau, Abidjan",
                  description: "Projection officielle avec Mamadou Diallo et Ibrahima Sarr.",
                  price: "30 000 FCFA",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221700000000",
                },
                {
                  title: "Projection Paris",
                  date: "2025-04-05T20:30:00",
                  location: "L'Arlequin, Paris 6e",
                  description: "Dans le cadre du Festival du Film Africain de Paris.",
                  price: "12 €",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221700000000",
                },
              ],
            },
          },
          {
            type: "map",
            props: {
              heading: "Cinémas partenaires",
              address: "Cinéma MaCy — Plateau, Dakar, Sénégal",
              embedUrl: "",
            },
          },
        ],
      },
      {
        slug: "presse",
        title: "Presse",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Espace presse",
              subheading: "Dossier de presse, photos HD, bande-annonce et contacts pour les journalistes.",
              backgroundImageUrl: "",
              overlay: 0.6,
            },
          },
          {
            type: "features",
            props: {
              heading: "Ressources disponibles",
              layout: "grid",
              items: [
                { icon: "📁", title: "Dossier de presse", description: "PDF complet 24 pages avec synopsis, biographies et photos." },
                { icon: "🖼️", title: "Photos HD", description: "65 photos de tournage et d'affiche disponibles en haute résolution." },
                { icon: "🎬", title: "Bande-annonce", description: "Fichier vidéo 4K et HD disponible sur demande." },
                { icon: "📞", title: "Attachée de presse", description: "Awa Ndiaye — awa.ndiaye@deklfilm.sn · +221 76 000 00 00" },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Contact presse",
              subheading: "Demande de dossier, interview, projection presse — contactez Awa Ndiaye.",
              phoneNumber: "221760000002",
              message: "Bonjour, je suis journaliste pour [média]. Je souhaite [demander le dossier de presse / organiser une interview / assister à une projection presse] pour DËKK BI.",
              buttonLabel: "Contacter l'attachée de presse",
            },
          },
        ],
      },
    ],
  };
}

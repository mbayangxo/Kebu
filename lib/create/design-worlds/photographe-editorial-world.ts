import type { WebsiteDefinition } from "../website-schema";

/**
 * EKKO STUDIO — Photographe éditorial & corporate
 * Monochrome élégant: noir pur + blanc cassé + touche argentée
 * Cormorant Garamond (display) + DM Sans (body)
 * Portrait éditorial, lookbook mode, corporate, événements
 */
export function photographeEditorialWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "EKKO STUDIO",
    theme: {
      primary: "#080808",
      accent: "#A8A49E",
      background: "#F8F6F3",
      text: "#080808",
      fontDisplay: "Cormorant Garamond",
      fontBody: "DM Sans",
      spacing: "airy",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "sharp",
      aestheticId: "monochrome-editorial-photographer",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Photographe Éditorial · Dakar & Paris",
              heading: "La lumière\najustée à\nvos désirs.",
              subheading:
                "Kofi Mensah — photographe éditorial et corporate basé à Dakar. Portraits, lookbooks, campagnes de marque et photographie documentaire. Clients en Afrique, France et au-delà.",
              primaryCta: { label: "Voir le portfolio", href: "/portfolio" },
              secondaryCta: { label: "Réserver une session", href: "https://wa.me/221780000000" },
              backgroundImageUrl: "",
              overlay: 0.35,
              textAlign: "left",
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Disciplines",
              tiles: [
                {
                  label: "Éditorial & Mode",
                  description: "Lookbooks, campagnes marque, shoots mode",
                  imageUrl: "",
                  href: "/portfolio",
                },
                {
                  label: "Portrait",
                  description: "Portraits professionnels, artistiques, famille",
                  imageUrl: "",
                  href: "/portfolio",
                },
                {
                  label: "Corporate",
                  description: "Photos d'entreprise, team building, presse",
                  imageUrl: "",
                  href: "/portfolio",
                },
                {
                  label: "Documentaire",
                  description: "Reportages, culture, Afrique de l'Ouest",
                  imageUrl: "",
                  href: "/portfolio",
                },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Travaux récents",
              layout: "masonry",
              images: [
                { url: "", alt: "Portrait éditorial mode femme Dakar" },
                { url: "", alt: "Lookbook collection créateur sénégalais" },
                { url: "", alt: "Portrait corporate CEO" },
                { url: "", alt: "Campagne marque artisanat africain" },
                { url: "", alt: "Reportage marché de Dakar" },
                { url: "", alt: "Session artistique studio lumière directionnelle" },
                { url: "", alt: "Portrait famille Almadies" },
                { url: "", alt: "Campaign skincare Dakar" },
              ],
              instagramHandle: "@ekkostudio",
              followLabel: "Suivre sur Instagram",
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "À propos",
              heading: "Photographe au croisement de deux mondes.",
              body: "Kofi Mensah est né à Dakar, formé à Paris. Son regard croise l'esthétique documentaire ouest-africaine et la rigueur technique de la photographie de mode européenne. Il travaille avec des marques, des créateurs et des institutions qui veulent des images qui durent.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Lire la biographie", href: "/about" },
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Collaborations",
              items: [
                {
                  quote:
                    "Kofi a transformé notre lookbook en œuvre d'art. Sa compréhension de la lumière naturelle à Dakar est unique. Nos ventes ont augmenté de 40% après la campagne.",
                  author: "Ndeye Fatou",
                  role: "Fondatrice, maison de mode NDÉYE, Dakar",
                },
                {
                  quote:
                    "Notre rapport annuel illustré par Kofi a reçu les félicitations de notre conseil d'administration. La qualité des portraits d'équipe est impressionnante.",
                  author: "Directeur Communication",
                  role: "Banque régionale d'Afrique de l'Ouest",
                },
                {
                  quote:
                    "Il sait capturer l'émotion sans jamais être intrusif. Nos photos de famille sont un trésor. On voit la lumière de Dakar dans chaque image.",
                  author: "Famille Sarr",
                  role: "Session portrait, Dakar 2024",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Réserver une session",
              subheading:
                "Type de shoot, date souhaitée, lieu. Devis personnalisé sous 4h.",
              phoneNumber: "221780000000",
              message:
                "Bonjour EKKO STUDIO, je souhaite réserver une session photo de [type : mode / portrait / corporate / famille]. Date envisagée : [date]. Lieu : [Dakar / à définir]. Merci.",
              buttonLabel: "Réserver",
            },
          },
        ],
      },
      {
        slug: "portfolio",
        title: "Portfolio",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Portfolio",
              subheading: "Mode. Portrait. Corporate. Documentaire.",
              backgroundImageUrl: "",
              overlay: 0.4,
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Séries",
              tiles: [
                { label: "Éditorial Mode", description: "Lookbooks, campagnes, créateurs", imageUrl: "", href: "/portfolio" },
                { label: "Portrait", description: "Artistique, professionnel, famille", imageUrl: "", href: "/portfolio" },
                { label: "Corporate", description: "Entreprises, institutions, presse", imageUrl: "", href: "/portfolio" },
                { label: "Afrique", description: "Documentaire et reportage", imageUrl: "", href: "/portfolio" },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "",
              layout: "masonry",
              images: [
                { url: "", alt: "Mode 1" },
                { url: "", alt: "Portrait 1" },
                { url: "", alt: "Corporate 1" },
                { url: "", alt: "Mode 2" },
                { url: "", alt: "Documentaire 1" },
                { url: "", alt: "Portrait 2" },
                { url: "", alt: "Mode 3" },
                { url: "", alt: "Corporate 2" },
                { url: "", alt: "Portrait 3" },
                { url: "", alt: "Mode 4" },
              ],
            },
          },
        ],
      },
      {
        slug: "tarifs",
        title: "Tarifs",
        sections: [
          {
            type: "products",
            props: {
              heading: "Forfaits",
              subheading:
                "Tarifs à titre indicatif. Devis précis selon le projet. Acompte 30% à la réservation.",
              columns: 3,
              items: [
                {
                  name: "Portrait Pro",
                  description:
                    "2h en studio ou extérieur. 30 photos retouchées HD. Idéal pour LinkedIn, presse, biographie.",
                  price: 120000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "Lookbook Créateur",
                  description:
                    "Demi-journée de shoot mode. 2–3 tenues, 1–2 lieux. 60 photos HD retouchées. Usage commercial.",
                  price: 350000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Populaire",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "Campagne Marque",
                  description:
                    "Journée complète. Direction artistique, 3–5 modèles, équipe, 150+ photos. Usage pub illimité.",
                  price: 950000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "Portrait Famille",
                  description:
                    "1h30 en extérieur au coucher du soleil. Jusqu'à 8 personnes. 25 photos retouchées.",
                  price: 85000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "Corporate Équipe",
                  description:
                    "Demi-journée en entreprise. Photos d'équipe, portraits individuels, ambiance bureau.",
                  price: 280000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "Reportage Événement",
                  description:
                    "Couverture complète de votre événement (4–8h). 200+ photos livrées en 48h.",
                  price: 450000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221780000000",
                },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Dans quel délai livrez-vous les photos ?",
                  answer:
                    "Portrait pro et famille : 5 jours ouvrés. Lookbook et campagne : 10–15 jours. Événement : 48h pour la galerie de sélection, 7 jours pour les retouches finales.",
                },
                {
                  question: "Les photos sont-elles libres de droits ?",
                  answer:
                    "Les forfaits personnels (portrait, famille) incluent un usage personnel illimité. Les forfaits commerciaux (lookbook, campagne, corporate) incluent un usage commercial complet. Les droits d'exclusivité totale sont négociables.",
                },
                {
                  question: "Proposez-vous des shoots hors Dakar ?",
                  answer:
                    "Oui. Je tourne régulièrement à Saint-Louis, Casamance et à Paris. Des frais de déplacement s'ajoutent selon la destination.",
                },
              ],
              contactPanel: {
                heading: "Un projet en tête ?",
                body: "Brief gratuit, réponse sous 4h.",
                ctaLabel: "Me contacter",
                ctaHref: "https://wa.me/221780000000",
              },
            },
          },
        ],
      },
      {
        slug: "about",
        title: "À propos",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Kofi Mensah",
              heading: "Photographe depuis\n15 ans.",
              body: "Formé à l'École Nationale Supérieure de la Photographie d'Arles, Kofi Mensah a débuté sa carrière comme assistant photographe à Paris avant de revenir à Dakar où il a fondé EKKO STUDIO en 2012. Il collabore avec des marques de mode, des ONG, des entreprises et des médias. Ses travaux ont été exposés à Dakar, Paris et Lagos.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Réserver une session", href: "https://wa.me/221780000000" },
            },
          },
          {
            type: "contact",
            props: {
              heading: "Contact",
              subheading: "Basé à Dakar, disponible pour projets internationaux.",
              address: "EKKO STUDIO — Mermoz, Dakar, Sénégal",
              phone: "+221 78 000 00 00",
              email: "kofi@ekkostudio.photo",
              mapEmbedUrl: "",
            },
          },
        ],
      },
    ],
  };
}

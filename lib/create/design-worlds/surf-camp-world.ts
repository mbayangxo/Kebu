import type { WebsiteDefinition } from "../website-schema";

/**
 * ATLANTIQUE SURF CAMP — Surf & activités côtières
 * Coastal energy: sable doré + bleu océan + blanc écume
 * Nunito (display) + DM Sans (body)
 * Cours de surf, camps, hébergement, Dakar / Ngor / Yoff
 */
export function surfCampWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "ATLANTIQUE SURF",
    theme: {
      primary: "#1B4D7E",
      accent: "#F5A623",
      background: "#F9F7F2",
      text: "#1A2535",
      surface: "#EEF4FB",
      fontDisplay: "Nunito",
      fontBody: "DM Sans",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "round",
      aestheticId: "coastal-surf-camp",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "🏄 Cours d'initiation dès 15 000 FCFA · Prochaine session : tous les matins à 7h sur la plage de Ngor",
              background: "#1B4D7E",
              color: "#FFFFFF",
              linkText: "Réserver",
              linkUrl: "/cours",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Surf Camp & École · Ngor, Dakar",
              heading: "L'Atlantique\nest à vous.",
              subheading:
                "ATLANTIQUE SURF est la première école de surf certifiée de Dakar. Cours débutants à avancés, camps d'été, sessions privées et trips côtiers au Sénégal.",
              primaryCta: { label: "Réserver un cours", href: "/cours" },
              secondaryCta: { label: "Nos programmes", href: "/programmes" },
              backgroundImageUrl: "",
              overlay: 0.45,
              textAlign: "center",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "800", suffix: "+", label: "Élèves formés" },
                { value: "7", label: "Moniteurs certifiés" },
                { value: "10", label: "Spots surfés" },
                { value: "4.9", prefix: "★", label: "Note Google" },
              ],
              background: "#1B4D7E",
            },
          },
          {
            type: "features",
            props: {
              heading: "Pourquoi choisir ATLANTIQUE SURF",
              layout: "grid",
              items: [
                {
                  icon: "🌊",
                  title: "Vagues toute l'année",
                  description:
                    "La presqu'île de Dakar offre des conditions de surf exceptionnelles 365 jours par an. Vagues régulières pour tous niveaux.",
                },
                {
                  icon: "🏆",
                  title: "Moniteurs certifiés",
                  description:
                    "Tous nos moniteurs sont diplômés ISA ou FFSurf. Sécurité et pédagogie professionnelle garanties.",
                },
                {
                  icon: "🤙",
                  title: "Petits groupes",
                  description:
                    "Maximum 6 élèves par moniteur. Chaque élève progresse à son rythme, avec un encadrement personnalisé.",
                },
                {
                  icon: "🏄",
                  title: "Matériel fourni",
                  description:
                    "Planches de débutant à avancé, combinaisons, leash, crème solaire — tout est inclus. Venez juste en maillot.",
                },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Nos formules",
              subheading: "Du cours unique au stage intensif d'une semaine.",
              columns: 3,
              items: [
                {
                  name: "Cours d'initiation",
                  description:
                    "2h avec un moniteur certifié. Matériel inclus. Tout débutant debout sur la planche en fin de session, garanti.",
                  price: 15000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Parfait pour débuter",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221750000000",
                },
                {
                  name: "Pack 5 cours",
                  description:
                    "5 sessions de 2h à planifier sur 2 semaines. Progression garantie du stand-up aux virages.",
                  price: 60000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Populaire",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221750000000",
                },
                {
                  name: "Stage immersion 7 jours",
                  description:
                    "Cours quotidiens matin + après-midi, hébergement surf house, repas, sorties spots secrets. La semaine qui transforme.",
                  price: 350000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Best-seller",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221750000000",
                },
                {
                  name: "Cours privé",
                  description:
                    "1h30 de coaching individuel. Analyse vidéo, corrections techniques, plan de progression personnalisé.",
                  price: 35000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221750000000",
                },
                {
                  name: "Location planche",
                  description:
                    "Location de planche à la journée ou à la semaine. Shortboard, longboard, bodyboard disponibles.",
                  price: 8000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221750000000",
                },
                {
                  name: "Surf Trip Casamance",
                  description:
                    "7 jours d'expédition surf en Casamance. Spots vierges, hébergement, transport. Niveau intermédiaire requis.",
                  price: 550000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Aventure",
                  ctaLabel: "En savoir plus",
                  ctaHref: "https://wa.me/221750000000",
                },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Dans les vagues",
              layout: "masonry",
              images: [
                { url: "", alt: "Élève debout sur la planche pour la première fois — Ngor" },
                { url: "", alt: "Session avancés — vague de Ouakam" },
                { url: "", alt: "Camp été enfants plage Yoff" },
                { url: "", alt: "Coucher de soleil depuis la plage de Ngor" },
                { url: "", alt: "Moniteur coaching technique" },
                { url: "", alt: "Trip surf Casamance" },
              ],
              instagramHandle: "@atlantiquesurf",
              followLabel: "Suivre sur Instagram",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ce que vivent nos élèves",
              items: [
                {
                  quote:
                    "Je suis venu sans jamais avoir fait de surf. En 2h avec mon moniteur, j'étais debout sur la planche. En fin de semaine, je surfais seul. Une expérience inoubliable.",
                  author: "Omar N.",
                  role: "Élève débutant, Dakar",
                },
                {
                  quote:
                    "Le stage immersion de 7 jours a changé ma vie. Je pensais que le surf était réservé aux Occidentaux. ATLANTIQUE SURF m'a prouvé le contraire.",
                  author: "Aissatou D.",
                  role: "Stage 7 jours, été 2024",
                },
                {
                  quote:
                    "J'ai emmené mes deux fils de 10 et 13 ans. Moniteurs patients, sécurité impeccable, et les garçons n'ont pas voulu partir. On reviendra chaque vacances.",
                  author: "Fatou T.",
                  role: "Mère de famille, Dakar",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Réserver votre session",
              subheading:
                "Indiquez votre niveau (débutant/intermédiaire/avancé), la date et le nombre de personnes.",
              phoneNumber: "221750000000",
              message:
                "Bonjour ATLANTIQUE SURF, je souhaite réserver [cours initiation / pack 5 cours / cours privé / stage 7 jours] pour [nombre] personne(s). Niveau : [débutant / intermédiaire / avancé]. Date souhaitée : [date].",
              buttonLabel: "Réserver maintenant",
            },
          },
        ],
      },
      {
        slug: "cours",
        title: "Cours & Tarifs",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Cours & formules",
              subheading: "Du premier essai au niveau avancé. Tous âges, tous niveaux.",
              backgroundImageUrl: "",
              overlay: 0.5,
            },
          },
          {
            type: "features",
            props: {
              heading: "Comment ça marche",
              layout: "horizontal",
              items: [
                { icon: "📱", title: "1. Réservez", description: "Via WhatsApp, précisez votre niveau et la date." },
                { icon: "🏖️", title: "2. Rendez-vous plage", description: "Retrouvez votre moniteur à la plage de Ngor à l'heure choisie." },
                { icon: "🏄", title: "3. Surfez", description: "Matériel remis, briefing sécurité, puis dans l'eau !" },
                { icon: "🎥", title: "4. Progressez", description: "Vidéos de votre session envoyées par WhatsApp soir-même." },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "FAQ surf",
              items: [
                {
                  question: "À partir de quel âge peut-on surfer ?",
                  answer:
                    "Nous accueillons les enfants à partir de 7 ans dans nos cours juniors. Des cours adultes débutants sont organisés sans limite d'âge supérieure.",
                },
                {
                  question: "Faut-il savoir nager ?",
                  answer:
                    "Oui, savoir nager est indispensable pour la sécurité. Niveau minimum : nager 25m sans assistance.",
                },
                {
                  question: "Quelles sont les conditions en ce moment ?",
                  answer:
                    "Les meilleures conditions de surf à Dakar : novembre à mars (houle atlantique, vents offshore). D'avril à octobre, conditions plus calmes, idéales pour les débutants.",
                },
              ],
              contactPanel: {
                heading: "Une question ?",
                body: "Notre équipe répond sur WhatsApp 7j/7.",
                ctaLabel: "Nous écrire",
                ctaHref: "https://wa.me/221750000000",
              },
            },
          },
        ],
      },
      {
        slug: "programmes",
        title: "Programmes",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Camp d'été",
              heading: "Camp surf pour\nenfants & ados.",
              body: "Chaque été (juillet–août), ATLANTIQUE SURF organise des camps intensifs d'une semaine pour les 7–17 ans. Cours quotidiens, activités nautiques, pique-nique sur la plage. Encadrement moniteurs certifiés. Places limitées à 15 enfants par session.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Inscrire mon enfant", href: "https://wa.me/221750000000" },
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Surf Trip",
              heading: "Explorer les\nspots secrets.",
              body: "Nos surf trips (Casamance, Saint-Louis, Saly) emmènent les surfeurs intermédiaires et avancés sur des spots peu fréquentés. Transport, hébergement et restauration inclus. 5 à 7 jours de pure glisse.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Rejoindre le prochain trip", href: "https://wa.me/221750000000" },
            },
          },
        ],
      },
    ],
  };
}

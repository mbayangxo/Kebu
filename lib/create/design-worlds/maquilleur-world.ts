import type { WebsiteDefinition } from "../website-schema";

/**
 * NOUR BY MARIAMA — Maquilleuse professionnelle freelance
 * Warm nude editorial: beige chaud + bordeaux profond + crème
 * Cormorant Garamond (display) + DM Sans (body)
 * Ciblée mariage, shooting photo, événements à Dakar
 */
export function maquilleurWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "NOUR by Mariama",
    theme: {
      primary: "#1A0810",
      accent: "#B85C6E",
      background: "#FDF8F5",
      text: "#1A0810",
      fontDisplay: "Cormorant Garamond",
      fontBody: "DM Sans",
      radius: "soft",
      spacing: "comfortable",
      headingScale: "md",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "soft-editorial-mua",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Maquilleuse professionnelle · Dakar",
              heading: "Le maquillage\nqui sublime\nvotre éclat.",
              subheading:
                "Spécialiste du maquillage mariage, shooting et événements. Je me déplace partout à Dakar et ses environs.",
              primaryCta: { label: "Réserver une prestation", href: "https://wa.me/221760000000" },
              secondaryCta: { label: "Voir mon portfolio", href: "/portfolio" },
              backgroundImageUrl: "",
              overlay: 0.45,
              textAlign: "left",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "400", suffix: "+", label: "Prestations réalisées" },
                { value: "150", suffix: "+", label: "Mariées maquillées" },
                { value: "5", label: "Ans d'expérience" },
                { value: "4.9", prefix: "★", label: "Note Google" },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "Mes prestations",
              layout: "grid",
              items: [
                {
                  icon: "💍",
                  title: "Maquillage mariée",
                  description:
                    "Maquillage longue tenue pour votre jour J. Test de maquillage inclus. Je me déplace à domicile.",
                },
                {
                  icon: "📸",
                  title: "Shooting photo & vidéo",
                  description:
                    "Looks adaptés aux contraintes de la prise de vue : studio, extérieur, flash professionnel.",
                },
                {
                  icon: "🎉",
                  title: "Événements & soirées",
                  description:
                    "Baptêmes, anniversaires, galas. Maquillage sophistiqué pour les grandes occasions.",
                },
                {
                  icon: "🎓",
                  title: "Cours particuliers",
                  description:
                    "Apprenez à vous maquiller vous-même. Cours individuels adaptés à votre type de peau.",
                },
                {
                  icon: "👰🏾",
                  title: "Forfait cortège",
                  description:
                    "Maquillage coordonné pour demoiselles d'honneur et famille de la mariée.",
                },
                {
                  icon: "🎬",
                  title: "Plateau TV & Scène",
                  description:
                    "Expérience plateau télévision et spectacles vivants. Maquillage HD adapté aux caméras HD.",
                },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Réalisations récentes",
              layout: "masonry",
              images: [
                { url: "", alt: "Maquillage mariée dakar naturel" },
                { url: "", alt: "Look smoky eye soirée" },
                { url: "", alt: "Maquillage shooting mode" },
                { url: "", alt: "Maquillage baptême nude" },
                { url: "", alt: "Maquillage scène artistique" },
                { url: "", alt: "Test maquillage mariée" },
              ],
              instagramHandle: "@nour.by.mariama",
              followLabel: "Voir plus sur Instagram",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Mes clientes témoignent",
              items: [
                {
                  quote:
                    "Mariama a sublimé mon regard pour mon mariage. Le maquillage a tenu toute la journée, même sous la chaleur de juillet. Merci !",
                  author: "Fatou Ndiaye",
                  role: "Mariée, juillet 2024",
                },
                {
                  quote:
                    "J'ai fait appel à Nour by Mariama pour un shooting mode. Résultat bluffant — les photos sont magnifiques.",
                  author: "Aicha Mbaye",
                  role: "Shooting Vogue Afrique",
                },
                {
                  quote:
                    "Les cours particuliers m'ont transformée. Je sais maintenant me maquiller seule pour toutes les occasions.",
                  author: "Rokhaya Diop",
                  role: "Cours maquillage",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Réserver ma prestation",
              subheading:
                "Précisez votre type d'événement, la date et votre ville. Je vous réponds sous 2h.",
              phoneNumber: "221760000000",
              message:
                "Bonjour Mariama, je souhaite réserver une prestation maquillage pour [mariage / shooting / événement] le [date] à [ville]. Merci de me contacter.",
              buttonLabel: "Contacter Mariama",
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
              heading: "Mon portfolio",
              subheading: "400+ prestations. Mariages, shootings, événements, plateau TV.",
              backgroundImageUrl: "",
              overlay: 0.4,
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Explorer par catégorie",
              tiles: [
                { label: "Mariées", description: "Looks de mariage longueur durée", imageUrl: "", href: "/portfolio" },
                { label: "Shootings", description: "Mode, beauté, editorial", imageUrl: "", href: "/portfolio" },
                { label: "Événements", description: "Soirées, galas, baptêmes", imageUrl: "", href: "/portfolio" },
                { label: "Scène & Plateau", description: "TV, concert, spectacle", imageUrl: "", href: "/portfolio" },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "",
              layout: "masonry",
              images: [
                { url: "", alt: "Portfolio 1" },
                { url: "", alt: "Portfolio 2" },
                { url: "", alt: "Portfolio 3" },
                { url: "", alt: "Portfolio 4" },
                { url: "", alt: "Portfolio 5" },
                { url: "", alt: "Portfolio 6" },
                { url: "", alt: "Portfolio 7" },
                { url: "", alt: "Portfolio 8" },
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
              heading: "Mes tarifs",
              subheading:
                "Déplacement inclus dans Dakar et banlieue proche. Au-delà sur devis. Paiement Wave / Orange Money accepté.",
              columns: 3,
              items: [
                {
                  name: "Maquillage Mariée",
                  description:
                    "Inclut test de maquillage J-15, maquillage jour J, retouches pendant la cérémonie. Déplacement à domicile.",
                  price: 80000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Le plus demandé",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Forfait Cortège",
                  description:
                    "Maquillage coordonné pour 3 demoiselles d'honneur ou membres du cortège. Réduction groupée.",
                  price: 90000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Maquillage Événement",
                  description:
                    "Baptême, anniversaire, gala. Look sophistiqué longue tenue. Durée : 45–60 min.",
                  price: 25000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Maquillage Shooting",
                  description:
                    "Mode, beauté, catalogue, editorial. Adapté lumière naturelle ou flash studio.",
                  price: 40000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Cours Particulier",
                  description:
                    "Séance 2h chez vous ou en atelier. Techniques de base ou perfectionnement. Fournitures incluses.",
                  price: 35000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Plateau TV / Scène",
                  description:
                    "Maquillage haute définition pour tournage, émission TV ou spectacle. Tarif demi-journée.",
                  price: 60000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221760000000",
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
                  question: "Vous déplacez-vous à l'extérieur de Dakar ?",
                  answer:
                    "Oui, je me déplace à Thiès, Saint-Louis, Ziguinchor et ailleurs sur devis incluant transport et hébergement si nécessaire.",
                },
                {
                  question: "En quoi consiste le test de maquillage mariée ?",
                  answer:
                    "Le test (inclus dans le forfait mariée) se fait 2 à 3 semaines avant le jour J. Il permet de valider le look ensemble et de tester la tenue du maquillage.",
                },
                {
                  question: "Quels produits utilisez-vous ?",
                  answer:
                    "J'utilise des marques professionnelles : MAC, Charlotte Tilbury, NARS, Laura Mercier. Tous mes produits sont testés sur peaux noires et métissées.",
                },
                {
                  question: "Comment réserver ?",
                  answer:
                    "Via WhatsApp ou le formulaire de contact. Un acompte de 50% est demandé pour confirmer la réservation. Solde le jour de la prestation.",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          {
            type: "whatsapp",
            props: {
              heading: "Prendre rendez-vous",
              subheading:
                "Disponible 7j/7. Je réponds généralement en moins de 2 heures.",
              phoneNumber: "221760000000",
              message: "Bonjour Mariama, je souhaite réserver une prestation pour [type d'événement] le [date].",
              buttonLabel: "Écrire à Mariama",
            },
          },
          {
            type: "contact",
            props: {
              heading: "Me retrouver",
              subheading: "Basée à Dakar. Déplacements dans tout le Sénégal.",
              address: "Dakar, Sénégal",
              phone: "+221 76 000 00 00",
              email: "nourby.mariama@gmail.com",
              mapEmbedUrl: "",
            },
          },
        ],
      },
    ],
  };
}

import type { WebsiteDefinition } from "../website-schema";

/**
 * NUANCE — Portfolio mode & mannequin éditorial
 * Black & white editorial: blanc pur + noir absolu + gris nuancé
 * Bodoni Moda (display) + DM Sans (body)
 * Portfolio mannequin, shootings éditoriaux, Dakar
 */
export function modeEditorialeWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "NUANCE",
    theme: {
      primary: "#0A0A0A",
      accent: "#0A0A0A",
      background: "#FAFAFA",
      text: "#0A0A0A",
      surface: "#F0F0F0",
      fontDisplay: "Bodoni Moda",
      fontBody: "DM Sans",
      spacing: "airy",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      radius: "sharp",
      aestheticId: "black-white-editorial-fashion-portfolio",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Modèle Éditorial · Dakar",
              heading: "AMINATA\nKOUYATÉ",
              subheading:
                "Mannequin et modèle éditorial basée à Dakar. Couvertures, lookbooks, campagnes publicitaires. Disponible pour les projets fashion, beauté et institutionnels.",
              primaryCta: { label: "Voir le portfolio", href: "/portfolio" },
              secondaryCta: { label: "Me contacter", href: "/contact" },
              backgroundImageUrl: "",
              overlay: 0.05,
              textAlign: "left",
            },
          },
          {
            type: "marquee",
            props: {
              items: [
                "ÉDITORIAL",
                "LOOKBOOK",
                "CAMPAGNE",
                "COUVERTURE",
                "BEAUTÉ",
                "MODE",
                "DAKAR",
                "DISPONIBLE",
              ],
              speed: 30,
              background: "#0A0A0A",
              color: "#FAFAFA",
              separator: "/",
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Sélection",
              layout: "masonry",
              columns: 3,
              items: [
                { src: "", alt: "Shooting éditorial — magazine Dakar Fashion Week" },
                { src: "", alt: "Campagne mode — marque Sénégalaise" },
                { src: "", alt: "Lookbook — créateur africain" },
                { src: "", alt: "Portrait beauté — shooting studio" },
                { src: "", alt: "Éditorial — collection pagne wax" },
                { src: "", alt: "Campagne publicitaire — marque locale" },
                { src: "", alt: "Shooting tête — beauty close-up" },
                { src: "", alt: "Fashion week — défilé Dakar" },
                { src: "", alt: "Lookbook minimaliste — noir et blanc" },
              ],
              instagramHandle: "@aminatakouate",
              followLabel: "Voir tout le portfolio",
            },
          },
          {
            type: "features",
            props: {
              heading: "Ce que je fais",
              layout: "grid",
              items: [
                {
                  icon: "📷",
                  title: "Shooting éditorial",
                  description:
                    "Magazines, lookbooks, portfolios créateurs. Style éditorial fort, composition travaillée, direction artistique claire.",
                },
                {
                  icon: "📣",
                  title: "Campagne publicitaire",
                  description:
                    "Marques mode, beauté, lifestyle — campagnes print et digital. Brief à image finale, avec ou sans équipe créative.",
                },
                {
                  icon: "👗",
                  title: "Défilés",
                  description:
                    "Fashion week Dakar, shows privés, présentations presse. Expérience passerelle depuis 2019.",
                },
                {
                  icon: "🎥",
                  title: "Contenu vidéo",
                  description:
                    "Reels, TikTok, clips mode et beauté. Motion adapté aux réseaux pour les marques qui veulent du contenu qui engage.",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "À propos",
              heading: "Aminata\nKouyaté.",
              body: "Née à Dakar, formée à l'École de Mode de Paris, Aminata Kouyaté est revenue au Sénégal en 2019 pour construire sa carrière de mannequin éditorial. Depuis, elle a collaboré avec des créateurs sénégalais, des marques panafricaines, et des magazines de mode.\n\nElle travaille dans les deux langues — français et anglais — et voyage régulièrement pour des projets en Afrique de l'Ouest et en Europe.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Voir le book complet", href: "/portfolio" },
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Booking & collaborations",
              subheading:
                "Vous avez un projet de shooting, campagne ou défilé ? Décrivez-le — on répond sous 24h.",
              phoneNumber: "221780000004",
              message:
                "Bonjour Aminata — j'aimerais vous proposer un projet. Type : [shooting éditorial / campagne / défilé / contenu vidéo]. Client/marque : [client]. Date prévue : [date]. Brief en quelques mots :",
              buttonLabel: "Envoyer le brief",
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
              heading: "PORTFOLIO",
              subheading: "Sélection de travaux — éditorial, campagnes, défilés.",
              backgroundImageUrl: "",
              overlay: 0.05,
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Par catégorie",
              columns: 4,
              items: [
                { label: "Éditorial", href: "/portfolio#editorial", imageUrl: "", description: "Magazines, lookbooks" },
                { label: "Campagnes", href: "/portfolio#campagnes", imageUrl: "", description: "Publicitaire, marques" },
                { label: "Défilés", href: "/portfolio#defiles", imageUrl: "", description: "Fashion week, shows" },
                { label: "Beauté", href: "/portfolio#beaute", imageUrl: "", description: "Beauty, close-up" },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Travaux complets",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Éditorial mag — Dakar Fashion Week 2024" },
                { src: "", alt: "Campagne prêt-à-porter — créateur sénégalais" },
                { src: "", alt: "Lookbook wax — collection capsule" },
                { src: "", alt: "Portrait beauté — studio N&B" },
                { src: "", alt: "Défilé — show nocturne Plateau" },
                { src: "", alt: "Campagne bijoux — marque dakaroise" },
                { src: "", alt: "Éditorial — couverture magazine" },
                { src: "", alt: "Lookbook minimal — tenues contemporaines" },
                { src: "", alt: "Shooting plein air — lifestyle Dakar" },
                { src: "", alt: "Campagne cosmétique — beauté africaine" },
                { src: "", alt: "Fashion week — passerelle clôture" },
                { src: "", alt: "Shooting studio — lingerie luxe" },
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
            type: "contact",
            props: {
              heading: "Booking",
              subheading: "Disponible pour projets Dakar, Afrique de l'Ouest et Europe. Réponse sous 24h.",
              email: "booking@aminatakouate.com",
              phone: "+221 78 000 00 04",
              address: "Aminata Kouyaté — Dakar, Sénégal · Déplacements sur projet",
            },
          },
          {
            type: "whatsapp",
            props: {
              label: "WhatsApp — brief projet",
              phone: "+221780000004",
              message: "Bonjour Aminata — je vous contacte pour un projet. Détails :",
            },
          },
        ],
      },
    ],
  };
}

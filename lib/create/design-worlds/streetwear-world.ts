import type { WebsiteDefinition } from "../website-schema";

/**
 * GLITCH DAKAR — Streetwear africain expérimental
 * Dark neon: noir total + rouge néon + blanc cassé
 * Space Grotesk (display) + Inter (body)
 * Drops limités, collab artistes, culture urbaine Dakar
 */
export function streetwearWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "GLITCH DAKAR",
    theme: {
      primary: "#FF1A1A",
      accent: "#FF1A1A",
      background: "#060606",
      text: "#F0F0F0",
      surface: "#111111",
      fontDisplay: "Space Grotesk",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "tight",
      radius: "sharp",
      aestheticId: "dark-neon-streetwear",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "🔴 DROP 006 — VENDREDI 00:00 · Quantités très limitées · S'inscrire à la liste",
              background: "#FF1A1A",
              color: "#060606",
              linkText: "REJOINDRE",
              linkUrl: "/drops",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Streetwear Dakar — Drop Culture",
              heading: "FAIT POUR\nCEUX QUI\nOSENT.",
              subheading:
                "GLITCH DAKAR est une marque de streetwear africain expérimental. Pièces en édition ultra-limitée, collaborations avec des artistes dakarois, design pensé pour la rue et la scène.",
              primaryCta: { label: "Voir les drops", href: "/drops" },
              secondaryCta: { label: "La culture GLITCH", href: "/culture" },
              backgroundImageUrl: "",
              overlay: 0.6,
              textAlign: "left",
            },
          },
          {
            type: "marquee",
            props: {
              items: [
                "DROP CULTURE",
                "DAKAR",
                "LIMITÉ",
                "COLLAB",
                "URBAIN",
                "AUTHENTIQUE",
                "SANS COMPROMIS",
                "STREET",
                "ARTISAN",
              ],
              speed: 40,
              background: "#FF1A1A",
              color: "#060606",
              separator: "/",
            },
          },
          {
            type: "products",
            props: {
              heading: "DROP ACTUEL — 006",
              subheading: "Pièces ultra-limitées. Chaque drop = 30 unités max. Sans restocking.",
              columns: 3,
              items: [
                {
                  name: "GLITCH TEE 006 — Noir/Rouge",
                  description:
                    "T-shirt oversize 300g coton lourd, broderie main rouge néon, print sérigraphie. Taille unique oversize. 30 pièces.",
                  price: 28000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "8 restants",
                  filterTags: ["Tee", "Drop 006"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "CARGO DAKAR 006",
                  description:
                    "Pantalon cargo technique 6 poches, fermetures YKK, coupe baggy. Noir charbon mat. 30 pièces.",
                  price: 65000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "12 restants",
                  filterTags: ["Pantalon", "Drop 006"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "HOODIE OVERSIZE 006",
                  description:
                    "Sweat capuche 400g, broderie dos GLITCH, kangaroo pocket. Lavage à froid. 30 pièces.",
                  price: 48000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "5 restants",
                  filterTags: ["Hoodie", "Drop 006"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "COLLAB ARTISTE 006 — Print",
                  description:
                    "T-shirt collab avec artiste plasticien dakarois Oumar Sy. Print unique, 20 pièces numérotées + signature.",
                  price: 45000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "COLLAB — 4 restants",
                  filterTags: ["Collab", "Tee"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "BUCKET HAT GLITCH",
                  description:
                    "Bob réversible noir/rouge, broderie logo GLITCH, intérieur imprimé. Taille unique ajustable.",
                  price: 18000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Accessoires"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "TOTE BAG STRUCTURÉ 006",
                  description:
                    "Tote bag canvas 12oz, fermeture zip, bandoulière cuir synthétique. Capacité 15L. Print exclusif.",
                  price: 22000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Accessoires"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Pourquoi GLITCH",
              heading: "LA MODE\nAFRICAINE\nSUR SES\nPROPRES TERMES.",
              body: "GLITCH DAKAR refuse les codes des marques de mode internationales. Nos pièces sont conçues à Dakar, produites à Dakar, vendues à Dakar — et exportées dans le monde entier.\n\nChaque drop est une collaboration avec l'écosystème créatif dakarois : artistes, photographes, musiciens. Pas de fast fashion. Pas de compromis.",
              imageUrl: "",
              imagePosition: "right",
              buttonLabel: "Notre manifeste",
              buttonHref: "/culture",
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Drops précédents",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "DROP 005 — Shooting rue Dakar" },
                { src: "", alt: "COLLAB DROP 004 — Artiste Karim Sall" },
                { src: "", alt: "DROP 003 — Défilé Dakar" },
                { src: "", alt: "DROP 002 — Backstage production" },
                { src: "", alt: "COLLAB DROP 001 — Photographe Maïmouna Ndiaye" },
                { src: "", alt: "DROP 006 — Preview" },
              ],
              instagramHandle: "@glitch.dakar",
              followLabel: "Suivre les drops",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "La communauté GLITCH",
              items: [
                {
                  quote:
                    "GLITCH c'est la seule marque de Dakar qui me représente vraiment. Leurs pièces tiennent dans le temps, le style est unique, et le fait que ce soit fait ici à Dakar — ça, c'est important.",
                  author: "Ibrahima D.",
                  role: "Graphiste, Dakar",
                },
                {
                  quote:
                    "J'ai le hoodie 006 et je peux pas l'enlever. La qualité est là — rien à voir avec les marques importées à ce prix-là. GLITCH c'est une autre catégorie.",
                  author: "Aminata K.",
                  role: "Musicienne, Dakar",
                },
                {
                  quote:
                    "Le drop 004 collab Karim Sall était historique. 20 pièces en 3 minutes. J'ai eu la chance d'en avoir une — ça valait le réveil à minuit.",
                  author: "Omar S.",
                  role: "Collectionneur, Abidjan",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Liste exclusive — Drop 007",
              subheading:
                "Rejoignez la liste d'attente pour le prochain drop. Accès prioritaire 24h avant le public.",
              phoneNumber: "221780000000",
              message:
                "Yo GLITCH, je veux être sur la liste pour le Drop 007. Mon prénom : [prénom]. Mes tailles : [S/M/L/XL pour les tees]. Je suis client depuis le Drop [numéro / jamais].",
              buttonLabel: "Rejoindre la liste — Drop 007",
            },
          },
        ],
      },
      {
        slug: "drops",
        title: "Drops",
        sections: [
          {
            type: "hero",
            props: {
              heading: "TOUS LES DROPS",
              subheading: "Archives et drops actifs. Chaque pièce est unique, chaque collab est limitée.",
              buttonLabel: "Rejoindre la liste",
              buttonHref: "https://wa.me/221780000000",
              align: "center",
              background: "#060606",
            },
          },
          {
            type: "products",
            props: {
              heading: "DROP 006 — En cours",
              columns: 3,
              items: [
                {
                  name: "GLITCH TEE 006",
                  description: "T-shirt oversize broderie rouge néon. 30 pièces.",
                  price: 28000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "8 restants",
                  filterTags: ["Drop 006"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "CARGO DAKAR 006",
                  description: "Pantalon cargo 6 poches, coupe baggy. 30 pièces.",
                  price: 65000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "12 restants",
                  filterTags: ["Drop 006"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "HOODIE OVERSIZE 006",
                  description: "Sweat 400g broderie dos GLITCH. 30 pièces.",
                  price: 48000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "5 restants",
                  filterTags: ["Drop 006"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
                },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "Le système GLITCH",
              layout: "horizontal",
              items: [
                { icon: "📅", title: "Drops planifiés", description: "1 drop par mois, annoncé 48h avant via WhatsApp et Instagram." },
                { icon: "🔴", title: "Quantités limitées", description: "30 pièces max par référence. Jamais de restocking. Jamais de soldes." },
                { icon: "🎨", title: "Collabs exclusives", description: "Chaque drop inclut au moins 1 collab avec un artiste dakarois." },
                { icon: "🚚", title: "Livraison", description: "Dakar : 24h. International : 5-10 jours. Paiement Wave ou Orange Money." },
              ],
            },
          },
        ],
      },
      {
        slug: "culture",
        title: "Culture",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Le manifeste GLITCH",
              heading: "DAKAR EST\nUNE SCÈNE.",
              body: "GLITCH DAKAR est né d'un refus. Le refus de copier. Le refus de suivre. Le refus que la mode africaine soit définie par des capitales lointaines.\n\nNous créons depuis Dakar, avec les artistes, musiciens, danseurs et photographes de Dakar. Chaque pièce raconte une histoire vraie. Chaque collab est un acte créatif.\n\nGLITCH, c'est le bruit que fait un système quand il se réinvente.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Rejoindre la liste Drop 007", href: "https://wa.me/221780000000" },
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Archive visuelle",
              layout: "masonry",
              images: [
                { url: "", alt: "Drop 005 — shooting rue Medina Dakar" },
                { url: "", alt: "Collab Drop 004 — atelier artiste Karim Sall" },
                { url: "", alt: "Drop 003 — défilé nocturne Plateau" },
                { url: "", alt: "Backstage production Drop 002" },
                { url: "", alt: "Premier Drop 001 — 20 pièces vendues en 2h" },
                { url: "", alt: "Équipe GLITCH — fondateurs" },
              ],
              instagramHandle: "@glitch.dakar",
              followLabel: "Toute l'archive sur Instagram",
            },
          },
        ],
      },
    ],
  };
}

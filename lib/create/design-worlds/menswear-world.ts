import type { WebsiteDefinition } from "../website-schema";

/**
 * ESSENTIEL HOM — Menswear premium & prêt-à-porter masculin
 * Quiet luxury: beige sable + noir profond + gris ardoise
 * Libre Baskerville (display) + Jost (body)
 * Vêtements homme premium, minimalisme africain, Dakar
 */
export function menswearWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "ESSENTIEL HOM",
    theme: {
      primary: "#1A1A1A",
      accent: "#8B7355",
      background: "#F7F5F1",
      text: "#1A1A1A",
      surface: "#EEEBE4",
      fontDisplay: "Libre Baskerville",
      fontBody: "Jost",
      spacing: "airy",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "wide",
      radius: "sharp",
      aestheticId: "quiet-luxury-minimal-menswear",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Menswear Premium · Dakar",
              heading: "L'essentiel.\nRien de plus.\nTout ce qu'il faut.",
              subheading:
                "ESSENTIEL HOM propose une sélection de vêtements masculins premium — coupes précises, matières nobles, silhouettes intemporelles. Conçu pour l'homme africain contemporain.",
              primaryCta: { label: "Découvrir la collection", href: "/collection" },
              secondaryCta: { label: "Notre approche", href: "/a-propos" },
              backgroundImageUrl: "",
              overlay: 0.1,
              textAlign: "left",
            },
          },
          {
            type: "products",
            props: {
              heading: "La collection",
              subheading: "Pièces pensées pour durer — matières premium, coupes précises.",
              columns: 3,
              items: [
                {
                  name: "Chemise Lin Oversized",
                  description:
                    "Chemise 100% lin lavé, coupe oversized structurée. Blanche, beige ou sage. S à XXL.",
                  price: 45000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Essentiel",
                  filterTags: ["Chemises", "Lin"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
                {
                  name: "Pantalon Chino Premium",
                  description:
                    "Chino coton stretch, coupe slim-tapered. Beige sable, kaki ou noir. Taille 38-46.",
                  price: 55000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Pantalons"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
                {
                  name: "Blazer Coton Léger",
                  description:
                    "Blazer coton sergé non doublé — léger pour le climat dakarois. Coupe droite clean. Bleu marine ou charbon.",
                  price: 85000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Signature",
                  filterTags: ["Blazers", "Business"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
                {
                  name: "T-Shirt Pima Cotton",
                  description:
                    "T-shirt pima cotton 180g, col rond ou col V. Blanc, noir, sage. Coupe ajustée.",
                  price: 22000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["T-Shirts", "Basiques"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
                {
                  name: "Polo Piqué Premium",
                  description:
                    "Polo piqué coton supima. Blanc, marine, vert olive. S-XXL. Coupe moderne.",
                  price: 32000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Polos", "Basiques"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
                {
                  name: "Veste Bomber Camel",
                  description:
                    "Bomber camel coupe boxy, fermeture YKK, poches zippées. Qualité premium pour les nuits fraîches.",
                  price: 72000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Vestes", "Outerwear"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Notre philosophie",
              heading: "Moins de pièces.\nMieux choisies.",
              body: "ESSENTIEL HOM refuse la mode rapide. Chaque pièce de notre collection est sélectionnée ou conçue pour durer — coupe juste, matière noble, couleur intemporelle. Pas de tendances éphémères. Pas de marketing creux.\n\nNous croyons que l'élégance masculine africaine mérite une garde-robe construite avec soin — pas un placard plein de pièces médiocres.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "La collection", href: "/collection" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Ce qui nous distingue",
              layout: "grid",
              items: [
                {
                  icon: "✦",
                  title: "Matières nobles",
                  description: "Lin, coton pima, coton supima, laine légère — aucun synthétique discount dans nos pièces principales.",
                },
                {
                  icon: "✦",
                  title: "Coupes précises",
                  description: "Chaque modèle est ajusté pour la morphologie africaine — épaules larges, taille haute, jambes longues.",
                },
                {
                  icon: "✦",
                  title: "Collection restreinte",
                  description: "Jamais plus de 20 références en même temps. On préfère 10 pièces parfaites à 100 pièces correctes.",
                },
                {
                  icon: "✦",
                  title: "Conseil style inclus",
                  description: "Chaque achat inclut un conseil style WhatsApp — on vous aide à construire une garde-robe cohérente.",
                },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Looks",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Chemise lin — shooting Dakar" },
                { src: "", alt: "Blazer marine — look bureau" },
                { src: "", alt: "Chino + polo — décontracté chic" },
                { src: "", alt: "Bomber camel — look soir" },
                { src: "", alt: "Capsule collection — flat lay" },
                { src: "", alt: "Portrait homme — ESSENTIEL HOM" },
              ],
              instagramHandle: "@essentielhom",
              followLabel: "Voir les looks",
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Commander & conseil style",
              subheading: "Dites-nous votre taille et ce que vous cherchez — on vous propose les bonnes pièces.",
              phoneNumber: "221780000005",
              message:
                "Bonjour ESSENTIEL HOM — je voudrais commander / avoir un conseil style. Ma taille habituelle : [S/M/L/XL/XXL]. Ce que je cherche : [casual / business / soirée / tout]. Budget :",
              buttonLabel: "Commander sur WhatsApp",
            },
          },
        ],
      },
      {
        slug: "collection",
        title: "Collection",
        sections: [
          {
            type: "hero",
            props: {
              heading: "La collection",
              subheading: "Pièces intemporelles — lin, coton, qualité premium.",
              backgroundImageUrl: "",
              overlay: 0.15,
            },
          },
          {
            type: "products",
            props: {
              heading: "Toutes les pièces",
              columns: 3,
              items: [
                {
                  name: "Chemise Lin Oversized",
                  description: "Lin lavé, coupe oversized. Blanc, beige, sage.",
                  price: 45000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Chemises"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
                {
                  name: "Chemise Oxford Coton",
                  description: "Coton oxford 100%, coupe slim. Blanc, bleu ciel.",
                  price: 38000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Chemises", "Business"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
                {
                  name: "T-Shirt Pima Cotton",
                  description: "180g, col rond. Blanc, noir, sage.",
                  price: 22000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["T-Shirts"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
                {
                  name: "Polo Piqué Premium",
                  description: "Coton supima, coupe moderne. Blanc, marine, olive.",
                  price: 32000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Polos"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
                {
                  name: "Pantalon Chino Premium",
                  description: "Coton stretch, slim-tapered. Beige, kaki, noir.",
                  price: 55000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Pantalons"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
                {
                  name: "Short Bermuda Lin",
                  description: "Lin 100%, coupe droite, longueur genou. Beige, blanc.",
                  price: 35000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Shorts"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
                {
                  name: "Blazer Coton Léger",
                  description: "Coton sergé, non doublé. Marine, charbon.",
                  price: 85000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Blazers"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
                {
                  name: "Veste Bomber Camel",
                  description: "Boxy, fermeture YKK, qualité premium.",
                  price: 72000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Vestes"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
                {
                  name: "Ensemble Lin 2 pièces",
                  description: "Chemise + pantalon lin assorti. Beige ou blanc.",
                  price: 92000,
                  currency: "FCFA",
                  badge: "Économie",
                  filterTags: ["Ensembles"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000005",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "a-propos",
        title: "À propos",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Notre histoire",
              heading: "Créé pour\nl'homme\nafricain\ncontemporain.",
              body: "ESSENTIEL HOM est né à Dakar en 2022. Notre fondateur, Moussa Sall, venait de passer 5 ans à Paris à travailler dans la mode masculine. De retour au Sénégal, il ne trouvait pas ce qu'il cherchait : des vêtements homme premium, taillés pour la morphologie africaine, pensés pour le climat et le style de vie dakarois.\n\nAlors il a décidé de les créer.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Voir la collection", href: "/collection" },
            },
          },
          {
            type: "contact",
            props: {
              heading: "Contact",
              email: "bonjour@essentielhom.sn",
              phone: "+221 78 000 00 05",
              address: "ESSENTIEL HOM — Dakar, Sénégal · Livraison partout au Sénégal",
            },
          },
        ],
      },
    ],
  };
}

import type { WebsiteDefinition } from "../website-schema";

/**
 * SOLE DAKAR — Sneaker boutique premium & culture sneaker
 * Bold monochrome: noir profond + blanc + orange brûlé accent
 * Monument Extended (display) + Inter (body)
 * Sneakers, éditions limitées, resell, collab artistes, Dakar
 */
export function sneakerWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "SOLE DAKAR",
    theme: {
      primary: "#0A0A0A",
      accent: "#FF5C00",
      background: "#F5F5F0",
      text: "#0A0A0A",
      surface: "#EBEBEB",
      fontDisplay: "Space Grotesk",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "tight",
      radius: "sharp",
      aestheticId: "bold-sneaker-culture-dakar",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "🔥 NOUVEAU DROP — Air Jordan 4 Retro · Nike Dunk Low · Adidas Samba · Livraison Dakar 24h",
              background: "#FF5C00",
              color: "#F5F5F0",
              linkText: "VOIR LES DROPS",
              linkUrl: "/collection",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Sneaker Culture · Dakar",
              heading: "LES MEILLEURES\nPAIRES.\nICI, MAINTENANT.",
              subheading:
                "SOLE DAKAR — la référence sneaker à Dakar. Authentique, livraison rapide, paiement Wave/Orange Money. Jordan, Nike, Adidas, New Balance — on a ce que tu cherches.",
              primaryCta: { label: "Shop maintenant", href: "/collection" },
              secondaryCta: { label: "Drops à venir", href: "/drops" },
              backgroundImageUrl: "",
              overlay: 0.55,
              textAlign: "left",
            },
          },
          {
            type: "marquee",
            props: {
              items: [
                "AIR JORDAN",
                "NIKE DUNK",
                "ADIDAS SAMBA",
                "NEW BALANCE",
                "AUTHENTIQUE",
                "DAKAR",
                "LIVRAISON 24H",
                "WAVE · ORANGE MONEY",
              ],
              speed: 45,
              background: "#0A0A0A",
              color: "#F5F5F0",
              separator: "·",
            },
          },
          {
            type: "products",
            props: {
              heading: "Drops récents",
              subheading: "Paires authentiques, en stock maintenant. Paiement Wave ou Orange Money.",
              columns: 3,
              items: [
                {
                  name: "Air Jordan 4 Retro 'Military Black'",
                  description:
                    "Jordan 4 OG colorway — upper cuir noir, semelle clear. Boîte originale. Pointures 40-46.",
                  price: 185000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Authentique",
                  filterTags: ["Jordan", "Nike", "Bestseller"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
                {
                  name: "Nike Dunk Low 'Panda'",
                  description:
                    "Dunk Low bicolore blanc/noir — incontournable. Stock limité. Pointures 38-47.",
                  price: 95000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Stock limité",
                  filterTags: ["Nike", "Dunk", "Bestseller"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
                {
                  name: "Adidas Samba OG 'White Gum'",
                  description:
                    "Samba OG cuir blanc, semelle gomme — la paire la plus portée du moment. Pointures 36-46.",
                  price: 85000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Tendance",
                  filterTags: ["Adidas", "Samba", "Bestseller"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
                {
                  name: "New Balance 990v6 'Grey'",
                  description:
                    "Made in USA. NB 990 v6 grey — qualité premium, amorti D-Ring. Pointures 40-46.",
                  price: 165000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["New Balance", "Premium"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
                {
                  name: "Air Force 1 Low 'White'",
                  description:
                    "AF1 tout blanc — le classique indémodable. Cuir premium. Pointures 36-47.",
                  price: 75000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Nike", "AF1", "Classique"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
                {
                  name: "Yeezy Boost 350 V2 'Zebra'",
                  description:
                    "Adidas Yeezy 350 Zebra — Primeknit stretch, Boost amorti. Certificat d'authenticité. Pointures 40-45.",
                  price: 175000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Exclusif",
                  filterTags: ["Adidas", "Yeezy", "Premium"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "Pourquoi SOLE DAKAR",
              layout: "grid",
              items: [
                {
                  icon: "✅",
                  title: "100% authentique",
                  description:
                    "Chaque paire est vérifiée par nos experts avant expédition. Certificat d'authenticité sur toutes les paires premium. Jamais de faux.",
                },
                {
                  icon: "⚡",
                  title: "Livraison express Dakar",
                  description:
                    "Commandez avant 14h, livré le soir même dans Dakar. Banlieue en 24h. Paiement à la livraison disponible.",
                },
                {
                  icon: "💳",
                  title: "Paiement Wave & Orange Money",
                  description:
                    "Wave, Orange Money, cash. Pas de carte bancaire nécessaire. Paiement sécurisé, reçu immédiat.",
                },
                {
                  icon: "🔄",
                  title: "Retours 7 jours",
                  description:
                    "Taille incorrecte ? Paire non conforme ? On reprend sans discussion dans les 7 jours suivant la réception.",
                },
              ],
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              background: "#0A0A0A",
              items: [
                { value: "500", suffix: "+", label: "Paires vendues" },
                { value: "100%", label: "Authenticité garantie" },
                { value: "2h", label: "Délai livraison Dakar" },
                { value: "4.9★", label: "Note clients" },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "La culture SOLE",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Collection Jordan — SOLE DAKAR" },
                { src: "", alt: "Nike Dunk Low Panda — shooting studio" },
                { src: "", alt: "Adidas Samba OG — lifestyle rue Dakar" },
                { src: "", alt: "New Balance 990 — détail premium" },
                { src: "", alt: "Yeezy collection — flat lay" },
                { src: "", alt: "SOLE DAKAR — sneaker wall" },
              ],
              instagramHandle: "@soledakar",
              followLabel: "Suivre les drops",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "La communauté SOLE",
              items: [
                {
                  quote:
                    "J'ai commandé des Jordan 4 Military Black — livrées en 3h à Mermoz. 100% authentiques, boîte originale. SOLE DAKAR c'est la référence à Dakar, y'a pas mieux.",
                  author: "Ibou D.",
                  role: "Sneakerhead, Dakar",
                },
                {
                  quote:
                    "Enfin une boutique qui vend du vrai à Dakar. J'ai essayé d'autres shops — j'ai eu des faux. Avec SOLE DAKAR, certificat d'authenticité à chaque achat. Never going back.",
                  author: "Aminata K.",
                  role: "Cliente régulière, Dakar",
                },
                {
                  quote:
                    "Service client au top — j'avais la mauvaise pointure, échange le lendemain sans frais. Paiement Wave simple. C'est comme ça que ça devrait marcher partout.",
                  author: "Omar S.",
                  role: "Client, Pikine",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Réserver une paire",
              subheading:
                "Envoyez-nous la paire et la pointure. On vérifie le stock et on vous confirme sous 30 min.",
              phoneNumber: "221780000001",
              message:
                "Yo SOLE DAKAR — je veux réserver : [nom de la paire]. Pointure : [pointure]. Livraison : [Dakar/banlieue/adresse]. Paiement : [Wave/Orange Money/cash livraison].",
              buttonLabel: "Réserver sur WhatsApp",
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
              heading: "TOUTE LA COLLECTION",
              subheading: "Jordan, Nike, Adidas, New Balance, Yeezy — authentique, en stock.",
              backgroundImageUrl: "",
              overlay: 0.6,
            },
          },
          {
            type: "products",
            props: {
              heading: "Toutes les paires",
              columns: 3,
              items: [
                {
                  name: "Air Jordan 1 High OG 'Chicago'",
                  description: "AJ1 colorway OG Chicago — rouge/blanc/noir. Pointures 40-46.",
                  price: 220000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Grail",
                  filterTags: ["Jordan", "Nike", "Premium"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
                {
                  name: "Air Jordan 4 Retro 'Military Black'",
                  description: "Jordan 4 Military Black. Boîte OG. Pointures 40-46.",
                  price: 185000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Jordan", "Nike"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
                {
                  name: "Nike Dunk Low 'Panda'",
                  description: "Dunk Low blanc/noir. Pointures 38-47.",
                  price: 95000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Nike", "Dunk"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
                {
                  name: "Nike Dunk Low 'Syracuse'",
                  description: "Dunk Low orange/blanc — Syracuse colorway. Pointures 38-46.",
                  price: 100000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Nike", "Dunk"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
                {
                  name: "Adidas Samba OG 'White Gum'",
                  description: "Samba OG cuir blanc semelle gomme. Pointures 36-46.",
                  price: 85000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Adidas", "Samba"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
                {
                  name: "Adidas Campus 00s 'Brown'",
                  description: "Campus 00s cuir marron — retour des 90s. Pointures 36-46.",
                  price: 78000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Adidas"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
                {
                  name: "New Balance 990v6 'Grey'",
                  description: "NB 990v6 Made in USA. Pointures 40-46.",
                  price: 165000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["New Balance", "Premium"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
                {
                  name: "New Balance 530 'Silver Navy'",
                  description: "NB 530 silver/navy — retro runner lifestyle. Pointures 36-46.",
                  price: 65000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["New Balance"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
                {
                  name: "Air Force 1 Low 'White'",
                  description: "AF1 cuir blanc all-white. Pointures 36-47.",
                  price: 75000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Nike", "AF1", "Classique"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000001",
                },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                {
                  question: "Comment vérifier l'authenticité ?",
                  answer:
                    "Toutes nos paires passent par un processus de vérification en 8 points (coutures, tags, semelle, boîte, poids, odeur). Certificat remis à chaque achat premium.",
                },
                {
                  question: "Peut-on payer à la livraison ?",
                  answer:
                    "Oui — cash à la livraison disponible pour Dakar et banlieue proche. Wave et Orange Money aussi acceptés.",
                },
                {
                  question: "Faites-vous des transferts hors Dakar ?",
                  answer:
                    "Oui — envoi par DHL Express ou Chronopost pour le Sénégal et l'Afrique de l'Ouest. Délai 2-5 jours. Devis sur WhatsApp.",
                },
              ],
              contactPanel: {
                heading: "Vous cherchez une paire spécifique ?",
                body: "On peut sourcer pour vous — dites-nous la paire et la pointure.",
                ctaLabel: "Demander sur WhatsApp",
                ctaHref: "https://wa.me/221780000001",
              },
            },
          },
        ],
      },
      {
        slug: "drops",
        title: "Drops",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Prochains drops",
              heading: "Soyez\nles premiers\ninformés.",
              body: "Rejoignez la liste WhatsApp — chaque nouveau drop est annoncé en exclusivité 24h avant la mise en vente publique. Stock limité, pas de restocking. Premier arrivé, premier servi.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Rejoindre la liste", href: "https://wa.me/221780000001" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Comment ça marche",
              layout: "horizontal",
              items: [
                { icon: "📲", title: "S'inscrire", description: "Rejoignez la liste WhatsApp drop alerts." },
                { icon: "🔔", title: "Alerte", description: "Notifié 24h avant chaque drop avec visuels et prix." },
                { icon: "⚡", title: "Réserver", description: "Répondez vite — stock ultra-limité, first come first served." },
                { icon: "📦", title: "Livraison", description: "On prépare et livre sous 24h à Dakar." },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Liste drop alerts",
              subheading: "Drop alert exclusif — les meilleures paires avant tout le monde.",
              phoneNumber: "221780000001",
              message: "Yo SOLE DAKAR — inscris-moi sur la liste drop alerts. Je cherche surtout : [Jordan / Nike / Adidas / New Balance / Yeezy / tout]. Ma pointure habituelle :",
              buttonLabel: "Rejoindre la liste",
            },
          },
        ],
      },
    ],
  };
}

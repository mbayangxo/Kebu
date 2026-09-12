import type { WebsiteDefinition } from "../website-schema";

/**
 * BOHI MAISON — Mobilier design & ameublement
 * Warm contemporary: sable naturel + bois foncé + terracotta
 * DM Serif Display (display) + Inter (body)
 * Mobilier artisanal africain, showroom, sur-mesure, Dakar
 */
export function mobilierWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "BOHI MAISON",
    theme: {
      primary: "#2D1E12",
      accent: "#C4693E",
      background: "#F7F2EB",
      text: "#2D1E12",
      surface: "#EDE5D8",
      fontDisplay: "DM Serif Display",
      fontBody: "Inter",
      spacing: "airy",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "soft",
      aestheticId: "warm-contemporary-furniture",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Mobilier Design · Dakar",
              heading: "L'art de\nvivre bien\nchez soi.",
              subheading:
                "BOHI MAISON crée et distribue des meubles design fabriqués en Afrique de l'Ouest. Collections permanentes, pièces sur-mesure et conseil en aménagement.",
              primaryCta: { label: "Voir les collections", href: "/collections" },
              secondaryCta: { label: "Visiter le showroom", href: "/contact" },
              backgroundImageUrl: "",
              overlay: 0.4,
              textAlign: "left",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "500", suffix: "+", label: "Pièces vendues" },
                { value: "7", label: "Ans de création" },
                { value: "40", suffix: "+", label: "Artisans partenaires" },
                { value: "4.8", prefix: "★", label: "Satisfaction clients" },
              ],
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Explorer par espace",
              tiles: [
                {
                  label: "Salon",
                  description: "Canapés, fauteuils, tables basses, étagères et bibliothèques",
                  imageUrl: "",
                  href: "/collections",
                },
                {
                  label: "Salle à manger",
                  description: "Tables, chaises, buffets, luminaires de table",
                  imageUrl: "",
                  href: "/collections",
                },
                {
                  label: "Chambre",
                  description: "Lits, têtes de lit, chevets, commodes, miroirs",
                  imageUrl: "",
                  href: "/collections",
                },
                {
                  label: "Bureau & Rangement",
                  description: "Bureaux, bibliothèques, étagères, armoires",
                  imageUrl: "",
                  href: "/collections",
                },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Pièces vedettes",
              subheading: "Fabriquées à Dakar. Bois locaux, tissus africains, finitions premium.",
              columns: 3,
              filterTags: ["Salon", "Chambre", "Salle à manger", "Bureau"],
              items: [
                {
                  name: "Canapé TERANGA 3 places",
                  description:
                    "Structure en acajou local, assise en mousse haute densité, tissu wax Kente premium. Livraison Dakar 3 semaines.",
                  price: 550000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Best-seller",
                  filterTags: ["Salon"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221695000000",
                },
                {
                  name: "Table à manger WENGÉ 8 places",
                  description:
                    "Plateau massif en wengé, pieds métal noir mat. 200×90cm. Livraison montée dans votre espace.",
                  price: 680000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Salle à manger"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221695000000",
                },
                {
                  name: "Lit ALMADIES 160×200",
                  description:
                    "Tête de lit cannage artisanal, pieds bois naturel. Livré avec sommier à lattes. Matelas en option.",
                  price: 420000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Chambre"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221695000000",
                },
                {
                  name: "Fauteuil BAOBAB",
                  description:
                    "Fauteuil sculptural en bois de vène, coussin interchangeable. Pièce unique signée.",
                  price: 185000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Collection signature",
                  filterTags: ["Salon"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221695000000",
                },
                {
                  name: "Bureau DAKAR 140cm",
                  description:
                    "Bureau en bois de samba peint, tiroir central et rangement latéral. Idéal pour home office.",
                  price: 245000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Bureau"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221695000000",
                },
                {
                  name: "Meuble sur-mesure",
                  description:
                    "Bibliothèque, dressing, cuisine, rangement — dessiné et fabriqué selon vos dimensions et style.",
                  price: 0,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Sur devis",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221695000000",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Notre philosophie",
              heading: "Du bois local, des mains sénégalaises.",
              body: "BOHI MAISON est né d'un refus : celui d'importer des meubles bas de gamme quand l'Afrique de l'Ouest possède des bois extraordinaires et des artisans d'exception. Tous nos meubles sont fabriqués à Dakar avec des essences locales certifiées — acajou, vène, samba, fromager — par nos 40 artisans partenaires.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Notre atelier", href: "/sur-mesure" },
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Intérieurs BOHI",
              layout: "masonry",
              images: [
                { url: "", alt: "Salon villa Almadies avec canapé Teranga" },
                { url: "", alt: "Salle à manger table wengé" },
                { url: "", alt: "Chambre parentale lit Almadies" },
                { url: "", alt: "Bureau home office bois clair" },
                { url: "", alt: "Bibliothèque sur-mesure couloir" },
                { url: "", alt: "Showroom BOHI MAISON Dakar" },
              ],
              instagramHandle: "@bohimaison",
              followLabel: "Suivre sur Instagram",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Chez eux, c'est BOHI",
              items: [
                {
                  quote:
                    "Notre salon a été complètement transformé. Le canapé Teranga est une pièce de conversation à lui tout seul. Nos invités demandent systématiquement d'où il vient.",
                  author: "Famille Ndiaye",
                  role: "Villa Almadies, Dakar",
                },
                {
                  quote:
                    "J'ai commandé un dressing sur-mesure pour un appartement aux dimensions irrégulières. L'atelier a résolu le problème parfaitement. Délai tenu, finition impeccable.",
                  author: "Mariama D.",
                  role: "Appartement Liberté 6, Dakar",
                },
                {
                  quote:
                    "Pour notre restaurant, nous avons meublé les 12 tables et 48 chaises avec BOHI. Un an après, aucune pièce n'a bougé. Qualité remarquable pour le prix.",
                  author: "Chef Oumar",
                  role: "Restaurant Le Terroir, Plateau Dakar",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Visiter le showroom ou commander",
              subheading:
                "Showroom ouvert 7j/7 à Dakar. Commandes en ligne avec livraison montée.",
              phoneNumber: "221695000000",
              message:
                "Bonjour BOHI MAISON, je suis intéressé(e) par [canapé / table / lit / meuble sur-mesure]. Mon espace est [type d'espace] à [quartier]. Budget approximatif : [montant] FCFA.",
              buttonLabel: "Nous contacter",
            },
          },
        ],
      },
      {
        slug: "collections",
        title: "Collections",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Nos collections",
              subheading: "Salon, salle à manger, chambre, bureau. Fabriqué à Dakar.",
              backgroundImageUrl: "",
              overlay: 0.4,
            },
          },
          {
            type: "products",
            props: {
              heading: "",
              columns: 3,
              filterTags: ["Salon", "Chambre", "Salle à manger", "Bureau", "Accessoires"],
              items: [
                {
                  name: "Canapé TERANGA 3 places",
                  description: "Acajou + tissu wax Kente. 3 semaines de fabrication.",
                  price: 550000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Salon"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221695000000",
                },
                {
                  name: "Canapé TERANGA 2 places",
                  description: "Modèle 2 places de la collection signature.",
                  price: 395000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Salon"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221695000000",
                },
                {
                  name: "Table basse BAOBAB",
                  description: "Plateau verre trempé + pieds acajou sculpté. 120×60cm.",
                  price: 145000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Salon"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221695000000",
                },
                {
                  name: "Table à manger WENGÉ 6 places",
                  description: "Plateau massif wengé, pieds métal. 180×90cm.",
                  price: 520000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Salle à manger"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221695000000",
                },
                {
                  name: "Chaise PLATEAU (lot de 4)",
                  description: "Structure en bois de samba, assise tissu wax. 4 coloris.",
                  price: 180000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Salle à manger"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221695000000",
                },
                {
                  name: "Lit ALMADIES 160×200",
                  description: "Cannage artisanal + pieds bois naturel. Sommier inclus.",
                  price: 420000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Chambre"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221695000000",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "sur-mesure",
        title: "Sur-Mesure",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Atelier sur-mesure",
              heading: "Le meuble\nque vous avez\ntoujours imaginé.",
              body: "Nos artisans conçoivent et fabriquent chaque pièce selon vos dimensions, votre style et vos matériaux préférés. Cuisine équipée, dressing, bibliothèque, tête de lit — rien n'est trop complexe. Visitez notre showroom, apportez votre plan, nous faisons le reste.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Demander un devis", href: "https://wa.me/221695000000" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Le processus sur-mesure",
              layout: "horizontal",
              items: [
                { icon: "📐", title: "1. Consultation", description: "Visite à domicile ou au showroom. Prise de mesures et écoute de vos envies." },
                { icon: "✏️", title: "2. Dessin", description: "Nos designers vous présentent 2–3 propositions + devis détaillé." },
                { icon: "🪵", title: "3. Fabrication", description: "4–8 semaines en atelier. Choix des bois, tissus et finitions validés avec vous." },
                { icon: "🚚", title: "4. Livraison", description: "Livraison et montage dans votre espace. Garantie 2 ans." },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "Questions sur-mesure",
              items: [
                {
                  question: "Quel est le délai pour un meuble sur-mesure ?",
                  answer:
                    "4 à 8 semaines selon la complexité. Pour une cuisine ou un dressing complet, comptez 8–12 semaines.",
                },
                {
                  question: "Livrez-vous hors Dakar ?",
                  answer:
                    "Oui, nous livrons dans tout le Sénégal. Pour Saint-Louis, Thiès, Saly et Ziguinchor, des frais de transport s'appliquent.",
                },
                {
                  question: "Quelle est la garantie ?",
                  answer:
                    "2 ans sur tous nos meubles. En cas de défaut de fabrication, nous réparons ou remplaçons à nos frais.",
                },
              ],
              contactPanel: {
                heading: "Commencer votre projet",
                body: "Consultation gratuite au showroom ou à domicile.",
                ctaLabel: "Prendre rendez-vous",
                ctaHref: "https://wa.me/221695000000",
              },
            },
          },
        ],
      },
      {
        slug: "contact",
        title: "Showroom",
        sections: [
          {
            type: "contact",
            props: {
              heading: "Notre showroom",
              subheading: "Ouvert lundi–samedi 9h–19h, dimanche 10h–17h. Parking disponible.",
              address: "BOHI MAISON — Route de Ngor, Dakar, Sénégal",
              phone: "+221 69 500 00 00",
              email: "bonjour@bohimaison.sn",
              mapEmbedUrl: "",
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Commander ou visiter",
              subheading: "Prenez rendez-vous ou commandez directement. Livraison montée partout à Dakar.",
              phoneNumber: "221695000000",
              message: "Bonjour BOHI MAISON, je souhaite [visiter le showroom / commander un meuble / demander un devis sur-mesure].",
              buttonLabel: "Nous écrire",
            },
          },
        ],
      },
    ],
  };
}

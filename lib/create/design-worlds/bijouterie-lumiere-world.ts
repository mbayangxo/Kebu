import type { WebsiteDefinition } from "../website-schema";

/**
 * LUMIÈRE FINE — Bijouterie fine & joaillerie artisanale
 * Light gold editorial: crème ivoire + or vieilli + noir doux
 * Cormorant Garamond (display) + Jost (body)
 * Bijoux sur mesure, alliances, collections or, Dakar
 */
export function bijouterieLumiereWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "LUMIÈRE FINE",
    theme: {
      primary: "#1A1209",
      accent: "#C9A84C",
      background: "#FAF8F3",
      text: "#1A1209",
      surface: "#F0EBE0",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Jost",
      spacing: "airy",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      radius: "soft",
      aestheticId: "light-gold-fine-jewelry-editorial",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Joaillerie Artisanale · Dakar",
              heading: "L'or\nqui raconte\nvotre histoire.",
              subheading:
                "LUMIÈRE FINE crée des bijoux en or pour les moments qui comptent — alliances, bagues de fiançailles, colliers héritage. Chaque pièce est faite à la main à Dakar par nos maîtres joailliers.",
              primaryCta: { label: "Découvrir les collections", href: "/collections" },
              secondaryCta: { label: "Bijou sur mesure", href: "/sur-mesure" },
              backgroundImageUrl: "",
              overlay: 0.15,
              textAlign: "left",
            },
          },
          {
            type: "marquee",
            props: {
              items: [
                "OR 18 CARATS",
                "FAIT À DAKAR",
                "ALLIANCES",
                "BAGUES",
                "COLLIERS",
                "SUR MESURE",
                "DIAMANTS",
                "HÉRITAGE",
              ],
              speed: 25,
              background: "#C9A84C",
              color: "#1A1209",
              separator: "◇",
            },
          },
          {
            type: "products",
            props: {
              heading: "Collections",
              subheading: "Or 18 carats. Pierres naturelles. Chaque pièce faite à la main.",
              columns: 3,
              items: [
                {
                  name: "Alliance Or Jaune 18K — Jonc",
                  description:
                    "Alliance classique jonc plat, or jaune 18 carats. Largeur 3mm ou 4mm. Gravure intérieure offerte.",
                  price: 285000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Bestseller",
                  filterTags: ["Alliances", "Or Jaune"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
                {
                  name: "Bague Solitaire Diamant",
                  description:
                    "Solitaire or blanc 18K, diamant certifié GIA 0.30ct. Monture 4 griffes. Taille sur commande.",
                  price: 750000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Fiançailles",
                  filterTags: ["Bagues", "Diamant"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
                {
                  name: "Collier Chaîne Or 18K — 45cm",
                  description:
                    "Chaîne maille forçat or jaune 18K, 45cm. Fermoir mousqueton. Peut porter un pendentif.",
                  price: 195000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Colliers", "Or Jaune"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
                {
                  name: "Boucles d'oreilles Créoles Or",
                  description:
                    "Créoles or jaune 18K, diamètre 25mm. Finition poli brillant. Fermoir charnière sécurisé.",
                  price: 185000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Boucles", "Or Jaune"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
                {
                  name: "Bracelet Jonc Or 18K",
                  description:
                    "Jonc rigide or jaune 18K, ouverture ressort. Largeur 4mm. Gravure intérieure possible.",
                  price: 245000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Bracelets", "Or Jaune"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
                {
                  name: "Pendentif Croissant de Lune",
                  description:
                    "Pendentif lune or jaune 18K serti de diamants 0.05ct total. Chaîne 40cm incluse.",
                  price: 320000,
                  currency: "FCFA",
                  badge: "Signature",
                  imageUrl: "",
                  filterTags: ["Colliers", "Diamant"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Notre savoir-faire",
              heading: "Façonné à\nDakar depuis\n1998.",
              body: "LUMIÈRE FINE est née de la passion d'Ibrahima Diallo, maître joaillier formé à Dakar et à Paris. Depuis 25 ans, notre atelier façonne l'or pour les familles sénégalaises — alliances de mariage, bagues héritage, cadeaux de naissance.\n\nChaque pièce est créée à la main dans notre atelier de Plateau. Nous travaillons uniquement en or 18 carats certifié, avec des pierres naturelles aux certificats vérifiables.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Notre atelier", href: "/sur-mesure" },
            },
          },
          {
            type: "features",
            props: {
              heading: "L'engagement LUMIÈRE FINE",
              layout: "grid",
              items: [
                {
                  icon: "✦",
                  title: "Or 18 carats certifié",
                  description:
                    "Tout notre or est 18 carats (750/1000) avec poinçon officiel. Certification incluse avec chaque pièce. Traçabilité complète.",
                },
                {
                  icon: "✦",
                  title: "Fait à la main à Dakar",
                  description:
                    "Chaque bijou est façonné dans notre atelier du Plateau par nos maîtres joailliers. Aucune pièce industrielle — que du travail artisanal.",
                },
                {
                  icon: "✦",
                  title: "Sur mesure & gravure",
                  description:
                    "Taille, gravure intérieure, modification de design — toutes nos pièces sont personnalisables sur commande sans frais supplémentaire.",
                },
                {
                  icon: "✦",
                  title: "Entretien à vie",
                  description:
                    "Polissage, replaqué, réparation — nous assurons l'entretien de toutes nos pièces à vie. Votre bijou vivra aussi longtemps que vous.",
                },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Nos créations",
              layout: "masonry",
              columns: 3,
              items: [
                { src: "", alt: "Alliance jonc or jaune — shooting atelier" },
                { src: "", alt: "Solitaire diamant — bague fiançailles" },
                { src: "", alt: "Collier chaîne or — portrait femme" },
                { src: "", alt: "Créoles or — bijou traditionnel moderne" },
                { src: "", alt: "Bracelet jonc or — détail main" },
                { src: "", alt: "Pendentif lune diamant — shooting editorial" },
              ],
              instagramHandle: "@lumierefine.dk",
              followLabel: "Voir toutes les créations",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ils nous ont fait confiance",
              items: [
                {
                  quote:
                    "Nos alliances de mariage ont été façonnées par LUMIÈRE FINE. La qualité est exceptionnelle — des joncs or jaune parfaitement proportionnés, avec nos prénoms gravés. 5 ans après, elles sont comme neuves.",
                  author: "Marème & Oumar",
                  role: "Mariés, Dakar",
                },
                {
                  quote:
                    "J'ai commandé une bague solitaire pour la demande en mariage de ma fille. Ibrahima a pris le temps de comprendre son style — le résultat est magnifique. Elle a dit oui !",
                  author: "Mme Ndiaye",
                  role: "Cliente, Dakar",
                },
                {
                  quote:
                    "Les créoles or que j'ai achetées chez LUMIÈRE FINE font partie de ma routine quotidienne depuis 3 ans. La solidité, l'éclat — exactement ce qu'on attend de l'or 18 carats vrai.",
                  author: "Aïda F.",
                  role: "Cliente régulière, Dakar",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Commander ou créer",
              subheading:
                "Pièce du catalogue ou création sur mesure — décrivez ce que vous cherchez. Réponse sous 2h.",
              phoneNumber: "221770000002",
              message:
                "Bonjour LUMIÈRE FINE — je voudrais [commander une pièce du catalogue / créer un bijou sur mesure]. Détails : [pièce / occasion / budget indicatif]. Je suis disponible pour un rendez-vous atelier si besoin.",
              buttonLabel: "Nous écrire sur WhatsApp",
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
              subheading: "Or 18 carats, pierres naturelles, fait à la main à Dakar.",
              backgroundImageUrl: "",
              overlay: 0.3,
            },
          },
          {
            type: "products",
            props: {
              heading: "Toutes les pièces",
              columns: 3,
              items: [
                {
                  name: "Alliance Or Jaune 18K — Jonc",
                  description: "Jonc plat or jaune 3mm ou 4mm. Gravure incluse.",
                  price: 285000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Bestseller",
                  filterTags: ["Alliances", "Or Jaune"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
                {
                  name: "Alliance Or Blanc 18K — Pavé",
                  description: "Alliance or blanc pavé diamants 0.08ct. Femme.",
                  price: 450000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Alliances", "Or Blanc", "Diamant"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
                {
                  name: "Bague Solitaire Diamant 0.30ct",
                  description: "Or blanc 18K, diamant GIA 0.30ct, 4 griffes.",
                  price: 750000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Bagues", "Diamant", "Or Blanc"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
                {
                  name: "Bague Émeraude Or Jaune",
                  description: "Or jaune 18K, émeraude naturelle 0.5ct, entourage diamants.",
                  price: 580000,
                  currency: "FCFA",
                  filterTags: ["Bagues", "Pierres", "Or Jaune"],
                  imageUrl: "",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
                {
                  name: "Collier Chaîne Or 45cm",
                  description: "Chaîne forçat or jaune 18K. Porte pendentif.",
                  price: 195000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Colliers", "Or Jaune"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
                {
                  name: "Pendentif Croissant Diamant",
                  description: "Or jaune 18K, diamants 0.05ct. Chaîne 40cm incluse.",
                  price: 320000,
                  currency: "FCFA",
                  filterTags: ["Colliers", "Diamant"],
                  imageUrl: "",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
                {
                  name: "Boucles Créoles Or 25mm",
                  description: "Créoles or jaune 18K, 25mm. Poli brillant.",
                  price: 185000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Boucles", "Or Jaune"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
                {
                  name: "Bracelet Jonc Or Jaune",
                  description: "Jonc rigide or jaune 18K 4mm. Gravure intérieure.",
                  price: 245000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Bracelets", "Or Jaune"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
                {
                  name: "Bracelet Rivière Diamants",
                  description: "Or blanc 18K, 21 diamants 0.42ct total. Fermoir sécurisé.",
                  price: 980000,
                  currency: "FCFA",
                  badge: "Luxe",
                  filterTags: ["Bracelets", "Diamant", "Or Blanc"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000002",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "sur-mesure",
        title: "Sur mesure",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Création sur mesure",
              heading: "Votre bijou,\nvos mots,\nnotre savoir-faire.",
              body: "Un bijou sur mesure chez LUMIÈRE FINE, c'est une rencontre. Vous apportez l'histoire, l'occasion, la vision — nos maîtres joailliers la transforment en pièce unique.\n\nAlliances gravées, bagues héritage familiales, pendentifs symboliques — nous fabriquons tout ce que vous imaginez, en or 18 carats, dans notre atelier du Plateau.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Prendre rendez-vous", href: "https://wa.me/221770000002" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Le processus création",
              layout: "horizontal",
              items: [
                { icon: "💬", title: "Consultation", description: "Rendez-vous atelier (gratuit) — on écoute votre projet, vos goûts, votre budget." },
                { icon: "✏️", title: "Esquisse", description: "Nos joailliers réalisent une esquisse et un devis détaillé sous 48h." },
                { icon: "🔧", title: "Fabrication", description: "Une fois validé, fabrication en 2-3 semaines dans notre atelier." },
                { icon: "✦", title: "Remise", description: "Remise en mains propres à l'atelier ou livraison sécurisée." },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "Questions sur mesure",
              items: [
                {
                  question: "Quel est le budget minimum pour un bijou sur mesure ?",
                  answer:
                    "À partir de 200 000 FCFA pour une bague simple en or 18K. Le devis est gratuit et sans engagement.",
                },
                {
                  question: "Combien de temps pour créer un bijou ?",
                  answer:
                    "En général 2 à 3 semaines après validation du devis. Pour les mariages et occasions importantes, contactez-nous au moins 6 semaines à l'avance.",
                },
                {
                  question: "Peut-on apporter son propre or ou ses pierres ?",
                  answer:
                    "Oui — nous travaillons avec vos matériaux si leur qualité est vérifiable. Nous proposons aussi de refondre des bijoux anciens pour en créer de nouveaux.",
                },
              ],
              contactPanel: {
                heading: "Prêt à créer votre bijou ?",
                body: "Consultez-nous — rdv atelier gratuit.",
                ctaLabel: "Prendre rendez-vous",
                ctaHref: "https://wa.me/221770000002",
              },
            },
          },
        ],
      },
    ],
  };
}

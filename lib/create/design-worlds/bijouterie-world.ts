import type { WebsiteDefinition } from "../website-schema";

/**
 * OR DE SAHEL — Bijouterie & joaillerie africaine
 * Dark opulence: noir profond + or 22 carats + beige ivoire
 * Cormorant Garamond (display) + Inter (body)
 * Or, bijoux traditionnels africains et joaillerie contemporaine
 */
export function bijouterieWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "OR DE SAHEL",
    theme: {
      primary: "#0E0B07",
      accent: "#C9A14A",
      background: "#0E0B07",
      text: "#F5EDD6",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Inter",
      radius: "sharp",
      spacing: "comfortable",
      headingScale: "md",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "dark-gold-jewellery",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "✨ Gravure personnalisée offerte sur toute commande · Livraison sécurisée Dakar sous 24h",
              background: "#C9A14A",
              color: "#0E0B07",
              linkText: "Découvrir",
              linkUrl: "/collections",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Bijouterie & Joaillerie · Dakar",
              heading: "L'or africain,\nfaçonné à\nla main.",
              subheading:
                "Colliers, bracelets et bagues en or 18 et 22 carats. Inspirés des traditions peule, sérère et mandingue. Fabriqués à Dakar depuis 1998.",
              primaryCta: { label: "Voir les collections", href: "/collections" },
              secondaryCta: { label: "Bijou sur-mesure", href: "https://wa.me/221775000000" },
              backgroundImageUrl: "",
              overlay: 0.65,
              textAlign: "center",
            },
          },
          {
            type: "marquee",
            props: {
              items: [
                "Or 22 carats",
                "Filigrane Peul",
                "Ambre Mauritanie",
                "Grenat Rouge",
                "Corail Méditerranée",
                "Argent Sterling",
                "Pierre de Lune",
                "Or 18 carats",
              ],
              speed: "normal",
              separator: "·",
            },
          },
          {
            type: "products",
            props: {
              heading: "Pièces vedettes",
              subheading: "Or pur, pierres naturelles, artisanat sénégalais.",
              columns: 3,
              filterTags: ["Colliers", "Bracelets", "Bagues", "Boucles", "Ensembles"],
              items: [
                {
                  name: "Collier Filigrane Peul",
                  description:
                    "Filigrane d'or 18 carats façonné main par nos artisans de Saint-Louis. Longueur 45cm réglable.",
                  price: 185000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Artisanal",
                  filterTags: ["Colliers"],
                  ctaLabel: "Acquérir",
                  ctaHref: "https://wa.me/221775000000",
                },
                {
                  name: "Bracelet Or & Ambre",
                  description:
                    "Perles d'ambre de Mauritanie serties en or 22 carats. Fermeture sécurisée. Unique.",
                  price: 240000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Pièce unique",
                  filterTags: ["Bracelets"],
                  ctaLabel: "Acquérir",
                  ctaHref: "https://wa.me/221775000000",
                },
                {
                  name: "Bague Solitaire Grenat",
                  description:
                    "Solitaire en or 18 carats et grenat rouge naturel du Mali. Taille sur demande.",
                  price: 125000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Bagues"],
                  ctaLabel: "Acquérir",
                  ctaHref: "https://wa.me/221775000000",
                },
                {
                  name: "Boucles Créoles Larges",
                  description:
                    "Créoles 4cm en or jaune 18 carats. Finition martelée. Fermeture click-it.",
                  price: 95000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Best-seller",
                  filterTags: ["Boucles"],
                  ctaLabel: "Acquérir",
                  ctaHref: "https://wa.me/221775000000",
                },
                {
                  name: "Parure Mariage Or & Corail",
                  description:
                    "Ensemble collier + boucles + bracelet. Or 22 carats et corail naturel rouge. Coffret inclus.",
                  price: 550000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Mariage",
                  filterTags: ["Ensembles"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221775000000",
                },
                {
                  name: "Bijou sur-mesure",
                  description:
                    "Bague de fiançailles, alliance ou pièce unique. Devis gratuit, délai 3–4 semaines.",
                  price: 0,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Sur devis",
                  ctaLabel: "Demander un devis",
                  ctaHref: "https://wa.me/221775000000",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Notre histoire",
              heading: "25 ans de savoir-faire orfèvre.",
              body: "Fondée en 1998 par Mamadou Diallo, maître orfèvre formé à Saint-Louis, OR DE SAHEL perpétue les traditions joaillières de l'Afrique de l'Ouest. Nos pièces puisent dans l'esthétique peule, mandingue et sérère, revisitée avec un regard contemporain. Chaque bijou est fabriqué à la main dans notre atelier de Dakar.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Notre atelier", href: "/sur-mesure" },
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Nos créations",
              layout: "masonry",
              images: [
                { url: "", alt: "Collier filigrane or 22 carats" },
                { url: "", alt: "Bracelet ambre et or" },
                { url: "", alt: "Bague solitaire grenat" },
                { url: "", alt: "Parure mariage" },
                { url: "", alt: "Créoles martelées" },
                { url: "", alt: "Atelier orfèvre Dakar" },
              ],
              instagramHandle: "@ordesahel",
              followLabel: "Suivre sur Instagram",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Elles portent nos bijoux",
              items: [
                {
                  quote:
                    "Ma parure de mariage était absolument magnifique. Mes invités n'ont pas arrêté de demander d'où venaient mes bijoux. Un travail d'orfèvre exceptionnel.",
                  author: "Marième D.",
                  role: "Mariée, Dakar 2024",
                },
                {
                  quote:
                    "J'ai commandé une bague de fiançailles sur-mesure avec une pierre trouvée au Mali. Le résultat a dépassé toutes mes espérances.",
                  author: "Ibrahima C.",
                  role: "Client fidèle depuis 2019",
                },
                {
                  quote:
                    "Le bracelet en ambre est une pièce d'exception. On ne trouve pas ce genre de travail ailleurs à Dakar.",
                  author: "Aminata K.",
                  role: "Dakar",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Commander ou créer votre bijou",
              subheading:
                "Envoyez-nous vos inspirations, votre budget et l'occasion. Devis personnalisé sous 24h.",
              phoneNumber: "221775000000",
              message:
                "Bonjour OR DE SAHEL, je suis intéressé(e) par [un bijou de la collection / un bijou sur-mesure] pour [mariage / fiançailles / cadeau / moi-même]. Mon budget est d'environ [montant] FCFA.",
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
              subheading: "Or 18 et 22 carats, argent sterling, pierres naturelles africaines.",
              backgroundImageUrl: "",
              overlay: 0.65,
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Par type",
              tiles: [
                { label: "Colliers & Pendentifs", description: "Du ras de cou au sautoir", imageUrl: "", href: "/collections" },
                { label: "Bracelets & Joncs", description: "Or, argent, pierres naturelles", imageUrl: "", href: "/collections" },
                { label: "Bagues", description: "Solitaires, alliances, chevalières", imageUrl: "", href: "/collections" },
                { label: "Boucles d'oreilles", description: "Créoles, clous, pendantes", imageUrl: "", href: "/collections" },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Toute la collection",
              columns: 3,
              filterTags: ["Colliers", "Bracelets", "Bagues", "Boucles", "Mariage"],
              items: [
                {
                  name: "Collier Filigrane Peul",
                  description: "Or 18 carats. Filigrane artisanal. 45cm.",
                  price: 185000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Colliers"],
                  ctaLabel: "Acquérir",
                  ctaHref: "https://wa.me/221775000000",
                },
                {
                  name: "Jonc Or Massif",
                  description: "Jonc fermé or 22 carats. 10mm de largeur. T48–T58.",
                  price: 195000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Bracelets"],
                  ctaLabel: "Acquérir",
                  ctaHref: "https://wa.me/221775000000",
                },
                {
                  name: "Boucles Pendantes Pierre de Lune",
                  description: "Crochets or 18 carats, pierre de lune naturelle cabochon.",
                  price: 78000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Boucles"],
                  ctaLabel: "Acquérir",
                  ctaHref: "https://wa.me/221775000000",
                },
                {
                  name: "Alliance Tradition",
                  description: "Alliance or 18 carats 3mm. Gravure offerte. Livraison 2 semaines.",
                  price: 85000,
                  currency: "FCFA",
                  filterTags: ["Bagues", "Mariage"],
                  imageUrl: "",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221775000000",
                },
                {
                  name: "Collier Grenat & Or",
                  description: "Pendentif grenat du Mali serti or 18 carats. Chaîne fine 42cm.",
                  price: 110000,
                  currency: "FCFA",
                  filterTags: ["Colliers"],
                  imageUrl: "",
                  ctaLabel: "Acquérir",
                  ctaHref: "https://wa.me/221775000000",
                },
                {
                  name: "Parure Épousée",
                  description: "Collier + boucles + bracelet coordonnés. Or 22 carats. Coffret bois inclus.",
                  price: 650000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Mariage",
                  filterTags: ["Mariage"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221775000000",
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
              eyebrow: "Joaillerie sur-mesure",
              heading: "Votre bijou unique,\ncréé avec vous.",
              body: "Bague de fiançailles, alliance, pendentif commémoratif ou parure de mariage : nos orfèvres créent chaque pièce sur-mesure en collaboration avec vous. Du premier croquis à la pièce finale, vous êtes impliqué(e) à chaque étape.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Démarrer mon projet", href: "https://wa.me/221775000000" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Le processus sur-mesure",
              layout: "horizontal",
              items: [
                { icon: "💬", title: "1. Consultation", description: "Rendez-vous en atelier ou par WhatsApp. Vous décrivez votre idée, budget et délai." },
                { icon: "✏️", title: "2. Croquis", description: "Notre orfèvre réalise 2 à 3 esquisses et vous les présente pour validation." },
                { icon: "🔬", title: "3. Devis", description: "Devis détaillé : matière, poids or, pierres, façonnage. Transparent et sans surprise." },
                { icon: "⚒️", title: "4. Fabrication", description: "3 à 4 semaines de fabrication artisanale dans notre atelier de Dakar." },
                { icon: "✨", title: "5. Livraison", description: "Remise en mains propres avec certificat d'authenticité et écrin bois OR DE SAHEL." },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "Questions sur-mesure",
              items: [
                {
                  question: "Quel est le délai pour un bijou sur-mesure ?",
                  answer:
                    "En général 3 à 4 semaines après validation du devis. Pour les alliances de mariage, nous recommandons de commander 6 semaines à l'avance minimum.",
                },
                {
                  question: "Puis-je apporter mes propres pierres ?",
                  answer:
                    "Oui. Nous travaillons avec des pierres que vous nous confiez. Un devis de façonnage est établi après examen de la pierre.",
                },
                {
                  question: "Comment est calculé le prix d'un bijou sur-mesure ?",
                  answer:
                    "Prix = poids d'or × cours du jour + coût des pierres + honoraires de façonnage. Tout est détaillé dans le devis.",
                },
              ],
              contactPanel: {
                heading: "Démarrer votre projet",
                body: "Consultation gratuite. Devis sans engagement sous 24h.",
                ctaLabel: "Nous contacter",
                ctaHref: "https://wa.me/221775000000",
              },
            },
          },
        ],
      },
    ],
  };
}

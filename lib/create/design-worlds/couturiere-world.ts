import type { WebsiteDefinition } from "../website-schema";

/**
 * CULT MODUS — Atelier couture africain contemporain
 * Dark editorial aesthetic: noir profond + rouge laque + crème ivoire
 * Cormorant Garamond (display) + Inter (body)
 * Fashion-forward, tailored for Dakar's emerging couturiers
 */
export function couturiereWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: 1,
    title: "CULT MODUS",
    theme: {
      primary: "#0C0C0C",
      accent: "#C8102E",
      background: "#F5F0EB",
      text: "#0C0C0C",
      fontHeading: "Cormorant Garamond",
      fontBody: "Inter",
      borderRadius: "none",
      spacing: "comfortable",
      aestheticId: "dark-editorial-couture",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "NOUVELLE COLLECTION — Réservations ouvertes pour la saison Tabaski 2025",
              background: "#0C0C0C",
              color: "#F5F0EB",
              linkText: "Prendre rendez-vous",
              linkUrl: "https://wa.me/221780000000",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Atelier de couture",
              heading: "L'élégance\ntaillée pour\nvous.",
              subheading:
                "Tenues de cérémonie, robes de mariée et prêt-à-porter sur-mesure, conçus à Dakar avec des tissus sélectionnés à travers l'Afrique.",
              primaryCta: { label: "Voir les collections", href: "/collections" },
              secondaryCta: { label: "Prendre rendez-vous", href: "https://wa.me/221780000000" },
              backgroundImageUrl: "",
              overlay: 0.55,
              textAlign: "left",
            },
          },
          {
            type: "marquee",
            props: {
              items: [
                "Bazin Riche",
                "Dentelle de Calais",
                "Wax Hollandais",
                "Satin Duchesse",
                "Kente Tissé Main",
                "Soie Naturelle",
                "Broderie Peul",
                "Ankara Imprimé",
              ],
              speed: "normal",
              separator: "·",
            },
          },
          {
            type: "category-tiles",
            props: {
              heading: "Collections",
              tiles: [
                {
                  label: "Cérémonie",
                  description: "Grand boubou, tenue de fête, ensemble tissé",
                  imageUrl: "",
                  href: "/collections",
                },
                {
                  label: "Mariage",
                  description: "Robe de mariée, tenue d'apparat, voile brodé",
                  imageUrl: "",
                  href: "/collections",
                },
                {
                  label: "Prêt-à-porter",
                  description: "Pièces du quotidien revisitées, coupe moderne",
                  imageUrl: "",
                  href: "/collections",
                },
                {
                  label: "Sur-Mesure",
                  description: "De la prise de mesures au dernier essayage",
                  imageUrl: "",
                  href: "/sur-mesure",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "L'atelier",
              heading: "Chaque pièce naît d'une conversation.",
              body: "Chez CULT MODUS, la couture commence par l'écoute. Nous prenons le temps de comprendre votre personnalité, l'occasion et vos envies avant de toucher un seul tissu. La coupe parfaite n'est pas un hasard — c'est le fruit d'un dialogue.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Notre processus", href: "/sur-mesure" },
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Réalisations récentes",
              layout: "masonry",
              images: [
                { url: "", alt: "Grand boubou bazin brodé" },
                { url: "", alt: "Robe de mariée wax et dentelle" },
                { url: "", alt: "Ensemble tailleur femme" },
                { url: "", alt: "Tenue Tabaski famille" },
                { url: "", alt: "Robe cocktail ankara" },
                { url: "", alt: "Boubou homme cérémonie" },
              ],
              instagramHandle: "@cultmodus_dakar",
              followLabel: "Suivre sur Instagram",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ce qu'elles disent",
              items: [
                {
                  quote:
                    "Ma robe de mariée était exactement ce que j'avais imaginé. Fatou a su traduire mes envies en une pièce absolument magnifique.",
                  author: "Khadija T.",
                  role: "Mariée, juin 2024",
                },
                {
                  quote:
                    "Le grand boubou pour le baptême de mon fils était parfait. Les broderies sont d'une finesse exceptionnelle.",
                  author: "Aminata D.",
                  role: "Cliente fidèle depuis 2021",
                },
                {
                  quote:
                    "J'avais une idée floue, ils l'ont transformée en tenue de rêve. Le service est professionnel du début à la fin.",
                  author: "Rokhaya S.",
                  role: "Dakar",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Commencer votre projet",
              subheading:
                "Décrivez-nous votre occasion, vos couleurs préférées et votre budget. Nous vous répondons sous 24h.",
              phoneNumber: "221780000000",
              message:
                "Bonjour CULT MODUS, je souhaite créer une tenue sur-mesure pour [précisez l'occasion]. Mon budget est d'environ [montant] FCFA.",
              buttonLabel: "Écrire sur WhatsApp",
            },
          },
        ],
      },
      {
        slug: "collections",
        title: "Collections",
        sections: [
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Nos créations",
              heading: "Collections\n2024–2025",
              subheading:
                "Pièces de cérémonie, tenues de mariage et prêt-à-porter. Chaque modèle peut être ajusté à vos mesures.",
              backgroundImageUrl: "",
              overlay: 0.6,
              textAlign: "center",
            },
          },
          {
            type: "products",
            props: {
              heading: "Pièces phares",
              subheading: "Prix indicatifs — devis personnalisé sur demande",
              columns: 3,
              items: [
                {
                  name: "Grand Boubou Bazin Or",
                  description:
                    "Bazin riche importé, broderies dorées au fil de soie, col et poignets ornés. Délai : 3 semaines.",
                  price: 85000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Cérémonie",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "Robe Mariée Dentelle & Wax",
                  description:
                    "Superposition de dentelle de Calais et wax hollandais, traîne amovible, bustier baleiné. Délai : 6 semaines.",
                  price: 250000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Best-seller",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "Tailleur Femme Ankara",
                  description:
                    "Veste à col Mao et pantalon droit taille haute en ankara. Doublure satin ivoire.",
                  price: 55000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "Ensemble Baptême",
                  description:
                    "Tenue 3 pièces pour cérémonie familiale : boubou, gandoura et calot brodé assorti.",
                  price: 65000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "Robe Cocktail Soirée",
                  description:
                    "Robe mi-longue en satin duchesse, découpes géométriques, dos nu avec lien tissu.",
                  price: 45000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "Kaftan Luxe",
                  description:
                    "Kaftan ample en soie naturelle, impressions exclusives peintes à la main, édition limitée.",
                  price: 120000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Édition limitée",
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221780000000",
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
            type: "hero",
            props: {
              heading: "Votre tenue,\nde A à Z",
              subheading:
                "Un processus en 5 étapes pour une pièce qui vous ressemble parfaitement.",
              backgroundImageUrl: "",
              overlay: 0.5,
              primaryCta: { label: "Démarrer mon projet", href: "https://wa.me/221780000000" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Le processus CULT MODUS",
              layout: "horizontal",
              items: [
                {
                  icon: "💬",
                  title: "1. Consultation",
                  description:
                    "Rendez-vous en atelier ou par WhatsApp pour définir votre projet, l'occasion, le style et le budget.",
                },
                {
                  icon: "🪡",
                  title: "2. Choix des tissus",
                  description:
                    "Sélection des matières dans notre stock et chez nos fournisseurs à Sandaga, Saint-Louis et Bamako.",
                },
                {
                  icon: "📐",
                  title: "3. Prise de mesures",
                  description:
                    "Séance de mesures complètes en atelier. Déplacement à domicile disponible sur Dakar.",
                },
                {
                  icon: "✂️",
                  title: "4. Confection",
                  description:
                    "Coupe, montage et finitions réalisés entièrement par nos couturières qualifiées.",
                },
                {
                  icon: "👗",
                  title: "5. Essayage & livraison",
                  description:
                    "Un essayage intermédiaire et une dernière retouche avant la remise de votre pièce.",
                },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Forfaits sur-mesure",
              subheading: "Acompte 50% à la commande, solde à la livraison · Paiement Wave / Orange Money accepté",
              columns: 3,
              items: [
                {
                  name: "Essentiel",
                  description:
                    "1 pièce (boubou ou robe), 1 essayage, tissu standard inclus jusqu'à 5m. Délai : 2 semaines.",
                  price: 35000,
                  currency: "FCFA",
                  imageUrl: "",
                  ctaLabel: "Démarrer",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "Cérémonie",
                  description:
                    "1 tenue complète (boubou + accessoire assorti), 2 essayages, tissu haut de gamme. Délai : 3 semaines.",
                  price: 85000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Populaire",
                  ctaLabel: "Démarrer",
                  ctaHref: "https://wa.me/221780000000",
                },
                {
                  name: "Mariée",
                  description:
                    "Robe ou tenue de mariée complète, 3 essayages, tissu premium sélectionné avec vous. Délai : 6 semaines.",
                  price: 200000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Sur devis",
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
                  question: "Combien de temps faut-il pour une tenue sur-mesure ?",
                  answer:
                    "En général 2 à 6 semaines selon la complexité. Nous pouvons parfois réduire ce délai pour les urgences — contactez-nous.",
                },
                {
                  question: "Puis-je apporter mes propres tissus ?",
                  answer:
                    "Oui, tout à fait. Nous travaillons avec vos tissus ou vous proposons les nôtres. Un supplément peut s'appliquer pour les tissus très difficiles à couper.",
                },
                {
                  question: "Proposez-vous des retouches après livraison ?",
                  answer:
                    "Une retouche gratuite est incluse dans les 7 jours suivant la livraison. Au-delà, des frais de retouche s'appliquent selon le travail.",
                },
                {
                  question: "Comment se passe le paiement ?",
                  answer:
                    "Acompte de 50% à la commande via Wave, Orange Money ou virement. Le solde est réglé à la livraison ou au dernier essayage.",
                },
              ],
              contactPanel: {
                heading: "Un projet particulier ?",
                body: "Collections de famille, uniformes scolaires ou professionnels, tenues de scène — parlons-en.",
                ctaLabel: "Écrire sur WhatsApp",
                ctaHref: "https://wa.me/221780000000",
              },
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
              heading: "Nous trouver",
              subheading: "Atelier ouvert du lundi au samedi, 9h–18h. Consultations sur rendez-vous.",
              address: "Atelier CULT MODUS — Plateau, Dakar, Sénégal",
              phone: "+221 78 000 00 00",
              email: "contact@cultmodus.sn",
              mapEmbedUrl: "",
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Réservez votre consultation",
              subheading:
                "Partagez-nous votre projet en quelques mots. Nous vous confirmons un créneau sous 24h.",
              phoneNumber: "221780000000",
              message:
                "Bonjour, je souhaite prendre rendez-vous pour une consultation sur-mesure. Mon occasion est [baptême / mariage / fête] et je suis disponible [vos disponibilités].",
              buttonLabel: "Prendre rendez-vous",
            },
          },
        ],
      },
    ],
  };
}

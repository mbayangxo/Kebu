import type { WebsiteDefinition } from "../website-schema";

/**
 * CLARTÉ — Marque skincare luminosité & éclat peau africaine
 * Crystal luxury: blanc cristal + charbon profond + or pâle
 * Cormorant Garamond (display) + Inter (body)
 * Sérum, crèmes, soins visage haute formulation, Dakar
 */
export function clarteSkincareWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "CLARTÉ",
    theme: {
      primary: "#1A1A1A",
      accent: "#C8A96E",
      background: "#FAFAFA",
      text: "#1A1A1A",
      surface: "#F5F3F0",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Inter",
      spacing: "airy",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "wide",
      radius: "sharp",
      aestheticId: "crystal-luxury-skincare-africa",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "Livraison offerte à Dakar dès 50 000 FCFA · Paiement Wave & Orange Money accepté",
              background: "#1A1A1A",
              color: "#FAFAFA",
              linkText: "Commander",
              linkUrl: "/boutique",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Skincare · Haute Formulation · Dakar",
              heading: "La clarté\nest une\nscience.",
              subheading:
                "CLARTÉ formule des soins actifs pour la peau africaine — texture riche, absorption rapide, résultats cliniquement prouvés. Sans compromis sur l'efficacité.",
              primaryCta: { label: "Découvrir les soins", href: "/boutique" },
              secondaryCta: { label: "Diagnostic peau", href: "/diagnostic" },
              backgroundImageUrl: "",
              overlay: 0.15,
              textAlign: "left",
            },
          },
          {
            type: "features",
            props: {
              heading: "Formulé pour la peau africaine",
              subheading: "Chaque produit CLARTÉ est développé en tenant compte des besoins spécifiques des peaux mélanisées.",
              layout: "grid",
              items: [
                {
                  title: "Actifs haute concentration",
                  body: "Vitamine C stabilisée 20%, Niacinamide, Acide Hyaluronique — des concentrations efficaces, pas cosmétiques.",
                  icon: "🔬",
                },
                {
                  title: "Testé sur peaux foncées",
                  body: "Nos formules sont développées et testées sur des peaux de phototype IV à VI pour garantir l'efficacité et la sécurité.",
                  icon: "✓",
                },
                {
                  title: "Sans perturbateurs",
                  body: "Zéro paraben, zéro huile minérale, zéro silicone occlusif. Des formules clean qui respectent votre microbiome cutané.",
                  icon: "🌿",
                },
                {
                  title: "Résultats mesurables",
                  body: "Éclat visible en 14 jours, hyperpigmentation réduite en 28 jours — garanti ou remboursé.",
                  icon: "📊",
                },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Soins essentiels",
              subheading: "Notre protocole en 3 étapes pour une peau lumineuse.",
              filterTags: ["visage", "corps", "sérum", "crème", "nettoyant"],
              showFilters: true,
              items: [
                {
                  name: "Sérum Éclat Vitamine C 20%",
                  description: "Sérum haute concentration anti-taches et éclat. Vitamine C stabilisée, Niacinamide 5%, Acide Kojique.",
                  priceLabel: "28 500 FCFA",
                  imageUrl: "",
                  filterTags: ["visage", "sérum"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander le Sérum Éclat Vitamine C 20% à 28 500 FCFA.",
                },
                {
                  name: "Crème Hydra-Lumière SPF 30",
                  description: "Hydratation intense + protection solaire. Acide Hyaluronique 3 poids moléculaires, Niacinamide, filtre UV minéral.",
                  priceLabel: "22 000 FCFA",
                  imageUrl: "",
                  filterTags: ["visage", "crème"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander la Crème Hydra-Lumière SPF 30 à 22 000 FCFA.",
                },
                {
                  name: "Gel Nettoyant Douceur Active",
                  description: "Nettoyage doux sans décapage. Acide Glycolique 2%, Aloé Vera, Zinc PCA — élimine impuretés et excès de sébum.",
                  priceLabel: "14 500 FCFA",
                  imageUrl: "",
                  filterTags: ["visage", "nettoyant"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander le Gel Nettoyant Douceur Active à 14 500 FCFA.",
                },
                {
                  name: "Huile Corps Karité Or",
                  description: "Huile sèche luxueuse au karité du Burkina, argan, jojoba. Absorption immédiate, fini satiné, parfum délicat.",
                  priceLabel: "18 000 FCFA",
                  imageUrl: "",
                  filterTags: ["corps"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander l'Huile Corps Karité Or à 18 000 FCFA.",
                },
                {
                  name: "Masque Argile Purifiant",
                  description: "Argile kaolin + charbon actif + Allantoïne. Pores resserrés, teint unifié, à utiliser 2x par semaine.",
                  priceLabel: "16 500 FCFA",
                  imageUrl: "",
                  filterTags: ["visage"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander le Masque Argile Purifiant à 16 500 FCFA.",
                },
                {
                  name: "Contour Yeux Peptides",
                  description: "Traitement anti-cernes et anti-poches. Peptides de cuivre, Caféine, Vitamine K — zone contour yeux fragile.",
                  priceLabel: "24 000 FCFA",
                  imageUrl: "",
                  filterTags: ["visage"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander le Contour Yeux Peptides à 24 000 FCFA.",
                },
              ],
            },
          },
          {
            type: "text",
            props: {
              heading: "Notre engagement",
              body: "CLARTÉ naît d'un constat simple : les peaux africaines méritent des soins formulés pour elles — pas des adaptations de produits conçus ailleurs. Chaque formule est développée à Dakar, testée sur des panélistes aux peaux mélanisées, et fabriquée selon les standards GMP. Nous croyons que la science et les ingrédients africains — karité, baobab, moringa — font les meilleurs soins au monde.",
              align: "center",
              maxWidth: "prose",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ce qu'elles disent",
              items: [
                {
                  name: "Aminata D.",
                  quote: "En 3 semaines, mes taches post-acnéiques ont clairement diminué. Le sérum vitamine C est une révélation — je ne savais pas qu'un produit local pouvait être aussi efficace.",
                  role: "Dakar",
                },
                {
                  name: "Rokhaya S.",
                  quote: "La crème SPF 30 ne laisse aucun film blanc — c'est rare pour une peau foncée. Je l'applique tous les matins et ma peau est lumineuse toute la journée.",
                  role: "Saint-Louis",
                },
                {
                  name: "Mariama K.",
                  quote: "J'ai essayé beaucoup de marques internationales très chères. CLARTÉ fait mieux pour le quart du prix et c'est formulé pour nous. Fidèle à vie.",
                  role: "Abidjan",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              phone: "221701234567",
              label: "Conseil personnalisé",
              message: "Bonjour CLARTÉ — j'aimerais un conseil skincare personnalisé pour ma peau.",
              buttonText: "Parler à une experte",
              description: "Une experte répond en moins de 2h · Lundi–Samedi 8h–20h",
            },
          },
          {
            type: "footer",
            props: {
              businessName: "CLARTÉ",
              tagline: "La clarté est une science.",
              links: [
                { label: "Boutique", href: "/boutique" },
                { label: "Diagnostic peau", href: "/diagnostic" },
                { label: "Notre histoire", href: "/a-propos" },
                { label: "FAQ", href: "/faq" },
              ],
              socialLinks: [],
              showWhatsapp: true,
              whatsappNumber: "221701234567",
            },
          },
        ],
      },
      {
        slug: "boutique",
        title: "Boutique",
        sections: [
          {
            type: "navigation",
            props: {
              brand: "CLARTÉ",
              links: [
                { label: "Accueil", href: "/accueil" },
                { label: "Boutique", href: "/boutique" },
                { label: "Diagnostic", href: "/diagnostic" },
                { label: "À propos", href: "/a-propos" },
              ],
              ctaLabel: "Commander",
              ctaHref: "/boutique",
            },
          },
          {
            type: "hero",
            props: {
              heading: "La boutique",
              subheading: "Tous nos soins visage et corps. Paiement Wave, Orange Money ou à la livraison.",
              backgroundImageUrl: "",
              overlay: 0.1,
              textAlign: "center",
            },
          },
          {
            type: "products",
            props: {
              heading: "Tous les produits",
              filterTags: ["visage", "corps", "sérum", "crème", "nettoyant"],
              showFilters: true,
              items: [
                {
                  name: "Sérum Éclat Vitamine C 20%",
                  description: "Vitamine C stabilisée, Niacinamide 5%, Acide Kojique. Anti-taches, éclat, unification du teint.",
                  priceLabel: "28 500 FCFA",
                  imageUrl: "",
                  filterTags: ["visage", "sérum"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander le Sérum Éclat Vitamine C 20%.",
                },
                {
                  name: "Crème Hydra-Lumière SPF 30",
                  description: "Hydratation 72h + protection solaire sans film blanc. Pour peaux normales à mixtes.",
                  priceLabel: "22 000 FCFA",
                  imageUrl: "",
                  filterTags: ["visage", "crème"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander la Crème Hydra-Lumière SPF 30.",
                },
                {
                  name: "Gel Nettoyant Douceur Active",
                  description: "Nettoyage doux, Acide Glycolique 2%, Aloé Vera, Zinc PCA. Convient peaux sensibles.",
                  priceLabel: "14 500 FCFA",
                  imageUrl: "",
                  filterTags: ["visage", "nettoyant"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander le Gel Nettoyant Douceur Active.",
                },
                {
                  name: "Huile Corps Karité Or",
                  description: "Karité Burkina + argan + jojoba. Fini satiné, absorption immédiate, parfum boisé délicat.",
                  priceLabel: "18 000 FCFA",
                  imageUrl: "",
                  filterTags: ["corps"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander l'Huile Corps Karité Or.",
                },
                {
                  name: "Masque Argile Purifiant",
                  description: "Kaolin + charbon actif + Allantoïne. Pores affinés, teint unifié, 2x par semaine.",
                  priceLabel: "16 500 FCFA",
                  imageUrl: "",
                  filterTags: ["visage"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander le Masque Argile Purifiant.",
                },
                {
                  name: "Contour Yeux Peptides",
                  description: "Peptides de cuivre + Caféine + Vitamine K. Anti-cernes, anti-poches, zone fragile.",
                  priceLabel: "24 000 FCFA",
                  imageUrl: "",
                  filterTags: ["visage"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander le Contour Yeux Peptides.",
                },
                {
                  name: "Tonique Rééquilibrant",
                  description: "Acide Glycolique 5%, Niacinamide, eau florale de camomille. Prépare la peau aux actifs.",
                  priceLabel: "12 500 FCFA",
                  imageUrl: "",
                  filterTags: ["visage"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander le Tonique Rééquilibrant.",
                },
                {
                  name: "Beurre Corps Baobab",
                  description: "Beurre ultra-riche au baobab du Sénégal. Peaux sèches à très sèches, coudes, genoux, talons.",
                  priceLabel: "15 000 FCFA",
                  imageUrl: "",
                  filterTags: ["corps"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander le Beurre Corps Baobab.",
                },
                {
                  name: "Protocole Starter — 3 produits",
                  description: "Gel nettoyant + Sérum Vitamine C + Crème SPF 30. Le protocole complet pour démarrer. Économisez 8 000 FCFA.",
                  priceLabel: "57 500 FCFA",
                  imageUrl: "",
                  badge: "MEILLEURE VENTE",
                  filterTags: ["visage", "sérum", "crème", "nettoyant"],
                  whatsappMessage: "Bonjour CLARTÉ — je voudrais commander le Protocole Starter 3 produits à 57 500 FCFA.",
                },
              ],
            },
          },
          {
            type: "footer",
            props: {
              businessName: "CLARTÉ",
              tagline: "La clarté est une science.",
              links: [
                { label: "Boutique", href: "/boutique" },
                { label: "Diagnostic peau", href: "/diagnostic" },
                { label: "Notre histoire", href: "/a-propos" },
                { label: "FAQ", href: "/faq" },
              ],
              socialLinks: [],
              showWhatsapp: true,
              whatsappNumber: "221701234567",
            },
          },
        ],
      },
      {
        slug: "diagnostic",
        title: "Diagnostic peau",
        sections: [
          {
            type: "navigation",
            props: {
              brand: "CLARTÉ",
              links: [
                { label: "Accueil", href: "/accueil" },
                { label: "Boutique", href: "/boutique" },
                { label: "Diagnostic", href: "/diagnostic" },
                { label: "À propos", href: "/a-propos" },
              ],
              ctaLabel: "Commander",
              ctaHref: "/boutique",
            },
          },
          {
            type: "hero",
            props: {
              heading: "Diagnostic peau gratuit",
              subheading: "Répondez à 5 questions. Recevez votre routine personnalisée CLARTÉ par WhatsApp en moins de 2h.",
              backgroundImageUrl: "",
              overlay: 0.1,
              textAlign: "center",
            },
          },
          {
            type: "form",
            props: {
              heading: "Votre diagnostic",
              subheading: "Toutes les informations restent confidentielles et servent uniquement à personnaliser vos recommandations.",
              buttonLabel: "Recevoir ma routine",
              fields: [
                { id: "prenom", label: "Prénom", type: "text", required: true },
                { id: "telephone", label: "Numéro WhatsApp", type: "phone", required: true },
                {
                  id: "type_peau",
                  label: "Mon type de peau",
                  type: "select",
                  required: true,
                  options: ["Peau sèche", "Peau grasse", "Peau mixte", "Peau normale", "Peau sensible"],
                },
                {
                  id: "preoccupation",
                  label: "Ma préoccupation principale",
                  type: "select",
                  required: true,
                  options: ["Taches et hyperpigmentation", "Manque d'éclat", "Imperfections et acné", "Rides et anti-âge", "Déshydratation", "Pores dilatés"],
                },
                {
                  id: "budget",
                  label: "Budget mensuel soins",
                  type: "select",
                  required: false,
                  options: ["Moins de 20 000 FCFA", "20 000 – 40 000 FCFA", "40 000 – 70 000 FCFA", "Plus de 70 000 FCFA"],
                },
                { id: "message", label: "Informations complémentaires (optionnel)", type: "textarea", required: false },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Le diagnostic est-il vraiment gratuit ?",
                  answer: "Oui, complètement. Aucun achat requis. Notre experte analyse votre profil et vous envoie votre routine personnalisée sur WhatsApp sans condition.",
                },
                {
                  question: "En combien de temps reçois-je ma routine ?",
                  answer: "En moins de 2h les jours ouvrés (lundi–samedi, 8h–20h). Si vous soumettez en dehors de ces horaires, vous recevez la réponse dès l'ouverture le lendemain matin.",
                },
                {
                  question: "Puis-je commencer avec un seul produit ?",
                  answer: "Absolument. Notre experte vous indiquera le produit le plus impactant pour votre peau en ce moment. Vous ajoutez les autres à votre rythme.",
                },
                {
                  question: "Vos produits conviennent-ils aux peaux sensibles ?",
                  answer: "Tous nos produits sont formulés pour les peaux mélanisées, y compris les peaux sensibles. Chaque fiche produit indique clairement si la formule convient aux peaux réactives.",
                },
              ],
            },
          },
          {
            type: "footer",
            props: {
              businessName: "CLARTÉ",
              tagline: "La clarté est une science.",
              links: [
                { label: "Boutique", href: "/boutique" },
                { label: "Diagnostic peau", href: "/diagnostic" },
                { label: "Notre histoire", href: "/a-propos" },
                { label: "FAQ", href: "/faq" },
              ],
              socialLinks: [],
              showWhatsapp: true,
              whatsappNumber: "221701234567",
            },
          },
        ],
      },
      {
        slug: "a-propos",
        title: "À propos",
        sections: [
          {
            type: "navigation",
            props: {
              brand: "CLARTÉ",
              links: [
                { label: "Accueil", href: "/accueil" },
                { label: "Boutique", href: "/boutique" },
                { label: "Diagnostic", href: "/diagnostic" },
                { label: "À propos", href: "/a-propos" },
              ],
              ctaLabel: "Commander",
              ctaHref: "/boutique",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Notre histoire",
              heading: "Née d'un\nmanque.",
              subheading:
                "CLARTÉ est née d'une frustration : aucune des marques disponibles au Sénégal n'avait été formulée pour des peaux comme les nôtres. On a décidé de changer ça.",
              primaryCta: { label: "Découvrir les soins", href: "/boutique" },
              backgroundImageUrl: "",
              overlay: 0.1,
              textAlign: "left",
            },
          },
          {
            type: "text",
            props: {
              heading: "Notre mission",
              body: "Chez CLARTÉ, nous pensons que les peaux africaines méritent des soins conçus pour elles — pas des formules exportées et réétiquetées. Depuis Dakar, nous développons chaque produit en collaboration avec des dermatologues spécialisés en dermatologie des peaux foncées. Nos ingrédients viennent d'Afrique de l'Ouest quand c'est possible : karité du Burkina Faso, baobab du Sénégal, moringa du Mali. Nous investissons dans la traçabilité et la qualité parce que votre peau le mérite.",
              align: "left",
              maxWidth: "prose",
            },
          },
          {
            type: "features",
            props: {
              heading: "Nos valeurs",
              layout: "grid",
              items: [
                {
                  title: "Science africaine",
                  body: "Développé avec des dermatologues spécialisés en phototypes IV–VI. Testé cliniquement sur des panélistes sénégalais.",
                  icon: "🔬",
                },
                {
                  title: "Ingrédients locaux",
                  body: "Karité, baobab, moringa — nous sourcions en Afrique de l'Ouest pour garantir fraîcheur, traçabilité et soutien aux producteurs locaux.",
                  icon: "🌍",
                },
                {
                  title: "Transparence totale",
                  body: "Toutes nos formules sont publiées. Vous savez exactement ce que vous mettez sur votre peau et pourquoi chaque ingrédient est là.",
                  icon: "📋",
                },
                {
                  title: "Made in Dakar",
                  body: "Formulé, testé et conditionné à Dakar. Chaque achat soutient l'industrie cosmétique africaine et crée des emplois locaux qualifiés.",
                  icon: "🏭",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              phone: "221701234567",
              label: "Parlez-nous",
              message: "Bonjour CLARTÉ — j'aimerais en savoir plus sur votre marque et vos produits.",
              buttonText: "Nous contacter",
              description: "Lundi–Samedi · 8h–20h · Réponse en moins de 2h",
            },
          },
          {
            type: "footer",
            props: {
              businessName: "CLARTÉ",
              tagline: "La clarté est une science.",
              links: [
                { label: "Boutique", href: "/boutique" },
                { label: "Diagnostic peau", href: "/diagnostic" },
                { label: "Notre histoire", href: "/a-propos" },
                { label: "FAQ", href: "/faq" },
              ],
              socialLinks: [],
              showWhatsapp: true,
              whatsappNumber: "221701234567",
            },
          },
        ],
      },
    ],
  };
}

import type { WebsiteDefinition } from "../website-schema";

/**
 * VITALITÉ AFRICA — Compléments alimentaires naturels & nutrition sportive
 * Clean health: vert forêt + jaune citron + blanc pur
 * Plus Jakarta (display) + Inter (body)
 * Compléments naturels, protéines végétales, Dakar
 */
export function supplementsWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "VITALITÉ AFRICA",
    theme: {
      primary: "#1B3A2D",
      accent: "#8CC63F",
      background: "#FFFFFF",
      text: "#1B3A2D",
      surface: "#F4FAF0",
      fontDisplay: "Plus Jakarta Sans",
      fontBody: "Inter",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "tight",
      radius: "soft",
      aestheticId: "clean-health-supplements",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "🚚 Livraison gratuite dès 50 000 FCFA · Paiement Wave & Orange Money accepté",
              background: "#8CC63F",
              color: "#1B3A2D",
              linkText: "Commander",
              linkUrl: "/produits",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Nutrition & Bien-être · Dakar",
              heading: "Performez\nà votre\nmeilleur.",
              subheading:
                "VITALITÉ AFRICA formule des compléments alimentaires adaptés au corps africain — protéines végétales, vitamines tropicales, plantes médicinales locales. Scientifiquement validés, 100% naturels.",
              primaryCta: { label: "Découvrir les produits", href: "/produits" },
              secondaryCta: { label: "Notre approche", href: "/science" },
              backgroundImageUrl: "",
              overlay: 0.15,
              textAlign: "left",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              background: "#1B3A2D",
              items: [
                { value: "5 000", suffix: "+", label: "Clients actifs" },
                { value: "97%", label: "Satisfaction client" },
                { value: "100%", label: "Naturel & local" },
                { value: "48h", label: "Livraison Dakar" },
              ],
            },
          },
          {
            type: "features",
            props: {
              heading: "Pourquoi VITALITÉ AFRICA",
              layout: "grid",
              items: [
                {
                  icon: "🌿",
                  title: "Ingrédients locaux",
                  description:
                    "Moringa, baobab, spiruline sénégalaise, gingembre, curcuma — des super-aliments africains à haute densité nutritionnelle.",
                },
                {
                  icon: "🔬",
                  title: "Formulé pour l'Afrique",
                  description:
                    "Nos formules tiennent compte du climat tropical, de l'alimentation locale et des besoins nutritionnels spécifiques aux populations africaines.",
                },
                {
                  icon: "✅",
                  title: "Qualité certifiée",
                  description:
                    "Chaque lot testé par un laboratoire indépendant. Certificats d'analyse disponibles sur demande. Sans additifs, sans OGM.",
                },
                {
                  icon: "📱",
                  title: "Suivi personnalisé",
                  description:
                    "Bilan nutritionnel gratuit par WhatsApp. Protocole sur mesure selon vos objectifs : énergie, sport, poids, santé.",
                },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Nos best-sellers",
              subheading: "Les produits plébiscités par notre communauté.",
              columns: 3,
              items: [
                {
                  name: "MORINGA BOOST — 60 gélules",
                  description:
                    "Extrait concentré de moringa sénégalais. Énergie, immunité, fer naturel. 1 mois de cure.",
                  price: 18000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "N°1 vente",
                  filterTags: ["Énergie", "Immunité"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "PROTÉINE BAOBAB — 500g",
                  description:
                    "Protéine végétale complète à base de baobab et de pois chiche africain. 22g protéines par dose. Goût naturel.",
                  price: 35000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Sport",
                  filterTags: ["Sport", "Protéines"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "SPIRULINE SÉNÉGAL — 90 comprimés",
                  description:
                    "Spiruline cultivée à Saint-Louis. Superaliment complet — vitamines, minéraux, antioxydants. 3 mois de cure.",
                  price: 22000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Énergie", "Immunité"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "CURCUMA ARTHRO — 60 gélules",
                  description:
                    "Curcuma + poivre noir pour une absorption maximale. Anti-inflammatoire naturel, santé articulaire.",
                  price: 15000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Santé", "Immunité"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "PACK ÉNERGIE FEMME",
                  description:
                    "Moringa + Fer naturel + Vitamine D3. Conçu pour les femmes actives — fatigue, carence, vitalité. 2 mois de cure.",
                  price: 42000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Spécial femme",
                  filterTags: ["Femme", "Énergie"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "PACK PERFORMANCE SPORT",
                  description:
                    "Protéine baobab + Créatine naturelle + BCAA végétaux. Gain musculaire et récupération. 1 mois.",
                  price: 58000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Populaire",
                  filterTags: ["Sport", "Protéines"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Notre engagement",
              heading: "La science au\nservice de l'Afrique.",
              body: "VITALITÉ AFRICA est fondé par Dr. Oumar Ndiaye, médecin nutritionniste dakarois formé en France. Après avoir constaté le manque de compléments alimentaires adaptés aux réalités africaines (climat, alimentation, génétique), il a créé VITALITÉ AFRICA en 2020.\n\nChaque formule est développée en collaboration avec des nutritionnistes, testée en laboratoire et adaptée au mode de vie africain.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Notre science", href: "/science" },
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ils ont transformé leur santé",
              items: [
                {
                  quote:
                    "Le Moringa Boost a changé ma vie. J'avais une fatigue chronique depuis des années. Après 1 mois de cure, j'ai retrouvé mon énergie. Mon médecin a confirmé la hausse de mon taux de fer.",
                  author: "Fatou M.",
                  role: "Enseignante, Dakar",
                },
                {
                  quote:
                    "Je m'entraîne 5 fois par semaine. La Protéine Baobab est la meilleure alternative végétale que j'ai trouvée en Afrique de l'Ouest. Goût naturel, bonne solubilité, résultats visibles en 3 semaines.",
                  author: "Aliou T.",
                  role: "Athlete, Dakar",
                },
                {
                  quote:
                    "Dr. Ndiaye m'a fait un bilan complet via WhatsApp et m'a recommandé le Pack Énergie Femme. Livraison le lendemain, suivi régulier. C'est ce type de service qu'on attendait.",
                  author: "Marième K.",
                  role: "Entrepreneuse, Thiès",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Bilan nutritionnel gratuit",
              subheading:
                "Décrivez vos objectifs — on vous recommande le protocole adapté. Réponse sous 2h.",
              phoneNumber: "221790000000",
              message:
                "Bonjour VITALITÉ AFRICA, je voudrais un bilan nutritionnel. Mon objectif : [énergie / sport / perte de poids / santé / grossesse / autre]. Mon âge : [âge]. Mes problèmes actuels : [fatigue / carence / autre].",
              buttonLabel: "Bilan gratuit WhatsApp",
            },
          },
        ],
      },
      {
        slug: "produits",
        title: "Produits",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Tous nos produits",
              subheading: "Compléments naturels, protéines, packs — formulés pour l'Afrique.",
              backgroundImageUrl: "",
              overlay: 0.4,
            },
          },
          {
            type: "products",
            props: {
              heading: "Notre gamme complète",
              columns: 3,
              items: [
                {
                  name: "MORINGA BOOST — 60 gélules",
                  description: "Énergie, immunité, fer naturel. 1 mois de cure.",
                  price: 18000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "N°1 vente",
                  filterTags: ["Énergie", "Immunité"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "SPIRULINE SÉNÉGAL — 90 comprimés",
                  description: "Superaliment complet cultivé à Saint-Louis. 3 mois.",
                  price: 22000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Énergie", "Immunité"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "PROTÉINE BAOBAB — 500g",
                  description: "22g protéines végétales par dose. Goût naturel.",
                  price: 35000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Sport", "Protéines"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "CURCUMA ARTHRO — 60 gélules",
                  description: "Anti-inflammatoire naturel, santé articulaire.",
                  price: 15000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Santé"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "GINGEMBRE DIGESTIF — 60 gélules",
                  description: "Digestion, nausées, immunité hivernale.",
                  price: 12000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Santé", "Immunité"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "VITAMINE D3 SOLEIL — 90 gélules",
                  description: "D3 naturelle + K2. Ossature, immunité, humeur.",
                  price: 16000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Santé", "Immunité"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "PACK ÉNERGIE FEMME",
                  description: "Moringa + Fer + Vitamine D3. 2 mois de cure.",
                  price: 42000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Spécial femme",
                  filterTags: ["Femme", "Énergie"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "PACK PERFORMANCE SPORT",
                  description: "Protéine + Créatine + BCAA végétaux. 1 mois.",
                  price: 58000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Populaire",
                  filterTags: ["Sport", "Protéines"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
                {
                  name: "PACK IMMUNITÉ FAMILLE",
                  description: "Moringa + Spiruline + Vitamine C naturelle. Pour toute la famille.",
                  price: 48000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Famille",
                  filterTags: ["Immunité", "Famille"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221790000000",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "science",
        title: "Notre Science",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Dr. Oumar Ndiaye — Fondateur",
              heading: "La nutrition\nau service\nde l'Afrique.",
              body: "Médecin nutritionniste diplômé de la Faculté de Médecine de Dakar et spécialisé à Lyon, Dr. Ndiaye a fondé VITALITÉ AFRICA après 8 ans de pratique clinique.\n\nSon observation : la majorité des compléments alimentaires vendus en Afrique sont formulés pour des populations occidentales, avec des ingrédients inadaptés et des prix inabordables. VITALITÉ AFRICA change ça.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Voir nos produits", href: "/produits" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Notre processus qualité",
              layout: "horizontal",
              items: [
                { icon: "🌱", title: "Sourcing local", description: "Ingrédients sourcés directement auprès de producteurs sénégalais certifiés." },
                { icon: "🔬", title: "Formulation", description: "Chaque formule développée avec notre équipe de nutritionnistes et médecins." },
                { icon: "✅", title: "Test laboratoire", description: "Chaque lot testé par un laboratoire indépendant accrédité ISO." },
                { icon: "📦", title: "Conditionnement", description: "Emballage protecteur, stockage contrôlé, livraison rapide sur Dakar." },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "FAQ",
              items: [
                {
                  question: "Les compléments conviennent-ils aux femmes enceintes ?",
                  answer:
                    "Certains oui (spiruline, fer naturel, vitamine D3) — toujours sur avis médical. Contactez-nous pour un conseil personnalisé.",
                },
                {
                  question: "Comment commander et se faire livrer ?",
                  answer:
                    "Via WhatsApp — on prend votre commande et vous précise les délais. Livraison 24-48h sur Dakar. Paiement Wave ou Orange Money.",
                },
                {
                  question: "Peut-on combiner plusieurs produits ?",
                  answer:
                    "Oui — nos packs sont conçus pour ça. Pour des combinaisons personnalisées, demandez un bilan nutritionnel gratuit sur WhatsApp.",
                },
              ],
              contactPanel: {
                heading: "Besoin d'un conseil ?",
                body: "Dr. Ndiaye et son équipe répondent sur WhatsApp.",
                ctaLabel: "Bilan gratuit",
                ctaHref: "https://wa.me/221790000000",
              },
            },
          },
        ],
      },
    ],
  };
}

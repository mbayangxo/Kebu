import type { WebsiteDefinition } from "../website-schema";

/**
 * SOLEIL DOUX — Institut de soins de la peau & beauté naturelle
 * Soft luxury: nude sable + taupe rosé + blanc ivoire
 * Gilda Display (display) + DM Sans (body)
 * Soins visage, corps, beauté naturelle, Dakar
 */
export function soinPeauWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "SOLEIL DOUX",
    theme: {
      primary: "#5C3D2E",
      accent: "#C69F7B",
      background: "#FAF8F5",
      text: "#2C1E14",
      surface: "#F2EAE0",
      fontDisplay: "Playfair Display",
      fontBody: "DM Sans",
      spacing: "airy",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "soft",
      aestheticId: "soft-luxury-skincare-studio",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "✨ Nouveau : Soin visage Éclat Naturel au beurre de karité — 35 000 FCFA · Réservez maintenant",
              background: "#C69F7B",
              color: "#FAF8F5",
              linkText: "Réserver",
              linkUrl: "/soins",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Institut de Beauté · Dakar",
              heading: "Votre peau\nmérite le\nmeilleur.",
              subheading:
                "SOLEIL DOUX est un institut de soins de la peau fondé sur les rituels de beauté africains et la science moderne. Soins personnalisés, ingrédients naturels, résultats visibles.",
              primaryCta: { label: "Réserver un soin", href: "/soins" },
              secondaryCta: { label: "Découvrir l'institut", href: "/a-propos" },
              backgroundImageUrl: "",
              overlay: 0.25,
              textAlign: "left",
            },
          },
          {
            type: "features",
            props: {
              heading: "Notre philosophie",
              layout: "grid",
              items: [
                {
                  icon: "🌿",
                  title: "100% naturel",
                  description:
                    "Formules à base de beurre de karité, huile de baobab, argile blanche et plantes médicinales africaines. Zéro produit chimique agressif.",
                },
                {
                  icon: "🔬",
                  title: "Diagnostic précis",
                  description:
                    "Chaque client reçoit un diagnostic de peau personnalisé avant tout soin. Nous adaptons chaque protocole à votre type de peau.",
                },
                {
                  icon: "✨",
                  title: "Résultats durables",
                  description:
                    "Pas de résultats éphémères — nos protocoles rééquilibrent la peau en profondeur pour un éclat qui dure.",
                },
                {
                  icon: "🤲",
                  title: "Expertise africaine",
                  description:
                    "Nos esthéticiennes connaissent les peaux africaines. Hyperpigmentation, acné, teint terne — nous avons les solutions adaptées.",
                },
              ],
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "1 200", suffix: "+", label: "Clientes satisfaites" },
                { value: "4.9", prefix: "★", label: "Note Google" },
                { value: "8", label: "Ans d'expertise" },
                { value: "100%", label: "Ingrédients naturels" },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Soins phares",
              subheading: "Chaque soin est conçu pour les peaux africaines.",
              columns: 3,
              items: [
                {
                  name: "Soin Éclat Karité",
                  description:
                    "Soin hydratant en profondeur au beurre de karité pur. Nettoie, exfolie, nourrit. Durée : 60 min. Idéal peaux sèches et ternes.",
                  price: 35000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Best-seller",
                  filterTags: ["Visage"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Soin Anti-Taches Unifiant",
                  description:
                    "Protocole correcteur hyperpigmentation — acides naturels, argile, huiles précieuses. 3 séances recommandées. Durée : 75 min.",
                  price: 45000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Recommandé",
                  filterTags: ["Visage"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Gommage Corps Baobab",
                  description:
                    "Gommage exfoliant corps à l'huile de baobab et grains de sel rose. Peau veloutée en 45 min. Adapté tous types de peau.",
                  price: 28000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Corps"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Soin Acné & Pores",
                  description:
                    "Protocole purifiant pour peaux à tendance acnéique — argile verte, aloe vera, huile d'arbre à thé. Durée : 60 min.",
                  price: 38000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Visage"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Massage Bien-être",
                  description:
                    "Massage corps relaxant aux huiles chaudes parfumées. Libère les tensions, apaise l'esprit. 60 ou 90 min.",
                  price: 30000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Corps"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Forfait Mariée",
                  description:
                    "Préparation beauté complète — soin visage, gommage corps, maquillage jour J. Forfait sur 2 séances.",
                  price: 95000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Forfait complet",
                  filterTags: ["Forfaits"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "L'Institut SOLEIL DOUX",
              heading: "Un espace pensé\npour votre peau.",
              body: "Fondé en 2016 par Ndèye Rama Sarr, esthéticienne formée à Paris et spécialisée en dermocosmétologie africaine, SOLEIL DOUX est né d'un constat simple : les produits et protocoles occidentaux ne sont pas adaptés aux peaux africaines.\n\nNotre institut à Dakar réunit des esthéticiennes expertes, un diagnostic peau personnalisé et des formulations naturelles issues du patrimoine botanique africain.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Notre histoire", href: "/a-propos" },
            },
          },
          {
            type: "gallery",
            props: {
              heading: "L'ambiance de l'institut",
              layout: "masonry",
              images: [
                { url: "", alt: "Cabine de soins SOLEIL DOUX — lumière dorée" },
                { url: "", alt: "Produits naturels karité baobab" },
                { url: "", alt: "Soin visage en cours — cliente détendue" },
                { url: "", alt: "Accueil de l'institut — espace zen" },
                { url: "", alt: "Gommage corps en cours" },
                { url: "", alt: "Résultat avant/après soin anti-taches" },
              ],
              instagramHandle: "@soleildoux.dakar",
              followLabel: "Suivre sur Instagram",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ce qu'en disent nos clientes",
              items: [
                {
                  quote:
                    "J'avais des taches sombres depuis 3 ans que rien ne faisait partir. Après 3 séances chez SOLEIL DOUX, mon teint est unifié et lumineux. C'est magique !",
                  author: "Khadija F.",
                  role: "Cliente fidèle, Dakar",
                },
                {
                  quote:
                    "L'ambiance est tellement apaisante. Ndèye Rama prend le temps d'analyser votre peau avant tout soin. Je me suis sentie vraiment écoutée et prise en charge.",
                  author: "Aminata N.",
                  role: "Cliente depuis 2021",
                },
                {
                  quote:
                    "Le gommage au baobab est une tuerie. Ma peau n'a jamais été aussi douce. Je reviens chaque mois maintenant.",
                  author: "Rokhaya D.",
                  role: "Cliente régulière, Almadies",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Réserver votre soin",
              subheading:
                "Dites-nous votre type de peau et votre objectif. On vous propose le soin adapté.",
              phoneNumber: "221760000000",
              message:
                "Bonjour SOLEIL DOUX, je souhaite réserver un soin. Mon type de peau : [sèche / grasse / mixte / sensible]. Mon objectif : [éclat / anti-taches / acné / relaxation]. Mes disponibilités : [jours/heures].",
              buttonLabel: "Réserver maintenant",
            },
          },
        ],
      },
      {
        slug: "soins",
        title: "Nos soins",
        sections: [
          {
            type: "hero",
            props: {
              heading: "Nos soins",
              subheading:
                "Visage, corps, forfaits — des protocoles naturels sur mesure pour votre peau.",
              backgroundImageUrl: "",
              overlay: 0.35,
            },
          },
          {
            type: "features",
            props: {
              heading: "Comment ça marche",
              layout: "horizontal",
              items: [
                { icon: "📋", title: "1. Diagnostic", description: "Analyse de votre peau par notre esthéticienne — type, besoins, sensibilités." },
                { icon: "🌿", title: "2. Protocole", description: "Soin personnalisé sélectionné selon votre diagnostic et vos objectifs." },
                { icon: "✨", title: "3. Soin", description: "Séance en cabine privée avec produits naturels africains." },
                { icon: "📱", title: "4. Suivi", description: "Conseils d'entretien et suivi WhatsApp entre les séances." },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Tous nos soins",
              columns: 3,
              items: [
                {
                  name: "Soin Éclat Karité",
                  description: "Hydratation profonde au beurre de karité pur. 60 min.",
                  price: 35000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Best-seller",
                  filterTags: ["Visage"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Soin Anti-Taches Unifiant",
                  description: "Correcteur hyperpigmentation, acides naturels. 75 min.",
                  price: 45000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Visage"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Soin Acné & Pores",
                  description: "Purifiant argile verte, aloe vera. 60 min.",
                  price: 38000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Visage"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Gommage Corps Baobab",
                  description: "Exfoliant corps huile de baobab + sel rose. 45 min.",
                  price: 28000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Corps"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Enveloppement Argile",
                  description: "Détox corps argile blanche et huiles essentielles. 50 min.",
                  price: 32000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Corps"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Massage Bien-être",
                  description: "Massage relaxant aux huiles chaudes. 60 ou 90 min.",
                  price: 30000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Corps"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Forfait Éclat Complet",
                  description: "Soin visage + gommage corps + massage. 2h30 de bien-être.",
                  price: 80000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Populaire",
                  filterTags: ["Forfaits"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Forfait Mariée",
                  description: "Préparation J-1 complète — visage, corps, maquillage.",
                  price: 95000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Mariée",
                  filterTags: ["Forfaits"],
                  ctaLabel: "Réserver",
                  ctaHref: "https://wa.me/221760000000",
                },
                {
                  name: "Abonnement Mensuel",
                  description: "4 soins visage par mois + suivi personnalisé. Engagement 3 mois.",
                  price: 100000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Meilleure valeur",
                  filterTags: ["Forfaits"],
                  ctaLabel: "S'abonner",
                  ctaHref: "https://wa.me/221760000000",
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
                  question: "Les soins conviennent-ils à tous les types de peau africaine ?",
                  answer:
                    "Oui — nous avons développé nos protocoles spécifiquement pour les peaux africaines dans toute leur diversité. Chaque soin commence par un diagnostic pour adapter le protocole à votre peau.",
                },
                {
                  question: "Combien de séances faut-il pour voir des résultats sur les taches ?",
                  answer:
                    "En général 3 séances espacées de 2 semaines. Certaines clientes voient une amélioration dès la première séance. Nous établissons un plan adapté lors de votre diagnostic.",
                },
                {
                  question: "Comment réserver ?",
                  answer:
                    "Via WhatsApp au +221 76 000 00 00 — on vous propose les créneaux disponibles dans la journée. Paiement par Wave ou Orange Money.",
                },
              ],
              contactPanel: {
                heading: "Une question sur votre peau ?",
                body: "Notre esthéticienne répond sur WhatsApp 7j/7.",
                ctaLabel: "Nous écrire",
                ctaHref: "https://wa.me/221760000000",
              },
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
              eyebrow: "Ndèye Rama Sarr",
              heading: "De la passion\nà l'expertise.",
              body: "Née à Dakar, formée à l'École Internationale d'Esthétique de Paris, Ndèye Rama a passé 5 ans à étudier la dermocosmétologie et les rituels de beauté africains avant d'ouvrir SOLEIL DOUX en 2016.\n\nSon constat : les peaux africaines ont besoin de soins adaptés à leurs caractéristiques uniques — pigmentation, hydratation, résilience. SOLEIL DOUX est né pour combler ce vide.",
              imageUrl: "",
              imageSide: "left",
              cta: { label: "Réserver un soin", href: "/soins" },
            },
          },
          {
            type: "contact",
            props: {
              heading: "Nous trouver",
              subheading: "Institut de beauté — Dakar Plateau. Ouvert du lundi au samedi 9h–19h.",
              address: "SOLEIL DOUX — Rue de Thiong, Plateau, Dakar, Sénégal",
              phone: "+221 76 000 00 00",
              email: "contact@soleildoux.sn",
              mapEmbedUrl: "",
            },
          },
        ],
      },
    ],
  };
}

import type { WebsiteDefinition } from "../website-schema";

/**
 * ÉCLAT NATUREL — Marque beauté & soins peau africaine
 * Clean luxury: blanc pur + vert sauge + or naturel
 * Playfair Display (display) + DM Sans (body)
 * Soins peau, huiles, crèmes, beauté naturelle africaine, Dakar
 */
export function beauteBrandWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "ÉCLAT NATUREL",
    theme: {
      primary: "#2D4A3E",
      accent: "#B8956A",
      background: "#FAFAF8",
      text: "#1A2820",
      surface: "#EDF2EE",
      fontDisplay: "Playfair Display",
      fontBody: "DM Sans",
      spacing: "airy",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "soft",
      aestheticId: "clean-luxury-african-beauty-brand",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "🌿 LIVRAISON GRATUITE dès 25 000 FCFA · Ingrédients 100% naturels · Formulé pour la peau africaine",
              background: "#2D4A3E",
              color: "#FAFAF8",
              linkText: "Découvrir",
              linkUrl: "/boutique",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Beauté naturelle · Dakar",
              heading: "La peau\nqu'on vous\na donnée,\nsublimée.",
              subheading:
                "ÉCLAT NATUREL crée des soins de peau formulés pour la peau africaine — huiles précieuses, crèmes hydratantes, sérums éclat. Ingrédients naturels, sans paraben, sans sulfate.",
              primaryCta: { label: "Découvrir les soins", href: "/boutique" },
              secondaryCta: { label: "Notre philosophie", href: "/a-propos" },
              backgroundImageUrl: "",
              overlay: 0.1,
              textAlign: "left",
            },
          },
          {
            type: "marquee",
            props: {
              items: [
                "INGRÉDIENTS NATURELS",
                "SANS PARABEN",
                "FORMULÉ POUR PEAU AFRICAINE",
                "BEURRE DE KARITÉ",
                "HUILE DE BAOBAB",
                "DAKAR",
                "CLEAN BEAUTY",
              ],
              speed: 30,
              background: "#2D4A3E",
              color: "#FAFAF8",
              separator: "·",
            },
          },
          {
            type: "products",
            props: {
              heading: "Soins best-sellers",
              subheading: "Les préférés de notre communauté. Formulés pour toutes les carnations africaines.",
              columns: 3,
              items: [
                {
                  name: "Huile de Baobab Pure",
                  description:
                    "Huile végétale 100% pure, pressée à froid. Hydratation profonde, anti-âge, éclat. Visage, corps et cheveux. 50ml.",
                  price: 18500,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Bestseller",
                  filterTags: ["Huiles", "Visage", "Corps"],
                  ctaLabel: "Ajouter",
                  ctaHref: "https://wa.me/221770000003",
                },
                {
                  name: "Crème Karité Éclat",
                  description:
                    "Crème corps beurre de karité pur + vitamine C + huile de rose musquée. Peau lisse, unifiée, lumineuse. 200ml.",
                  price: 22000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "N°1 vente",
                  filterTags: ["Crèmes", "Corps", "Éclat"],
                  ctaLabel: "Ajouter",
                  ctaHref: "https://wa.me/221770000003",
                },
                {
                  name: "Sérum Vitamine C Intense",
                  description:
                    "Sérum éclat à 15% vitamine C stabilisée + niacinamide + acide hyaluronique. Anti-taches, anti-âge. 30ml.",
                  price: 28500,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Nouveauté",
                  filterTags: ["Sérums", "Visage", "Anti-taches"],
                  ctaLabel: "Ajouter",
                  ctaHref: "https://wa.me/221770000003",
                },
                {
                  name: "Masque Argile & Aloe Vera",
                  description:
                    "Masque purifiant argile verte + aloe vera + huile d'argan. Pores resserrés, peau nette. 100ml.",
                  price: 15000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Masques", "Visage", "Purifiant"],
                  ctaLabel: "Ajouter",
                  ctaHref: "https://wa.me/221770000003",
                },
                {
                  name: "Huile Capillaire Fortifiante",
                  description:
                    "Mélange huile de ricin + huile d'avocat + romarin. Croissance, force, brillance. Pour tous types de cheveux. 100ml.",
                  price: 16500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Cheveux", "Huiles"],
                  ctaLabel: "Ajouter",
                  ctaHref: "https://wa.me/221770000003",
                },
                {
                  name: "Baume Lèvres Hibiscus",
                  description:
                    "Baume nourrissant beurre de cacao + huile de jojoba + extrait d'hibiscus. Lèvres douces, protégées. 10ml.",
                  price: 8500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Lèvres", "Corps"],
                  ctaLabel: "Ajouter",
                  ctaHref: "https://wa.me/221770000003",
                },
              ],
            },
          },
          {
            type: "split",
            props: {
              eyebrow: "Notre philosophie",
              heading: "La beauté\nafricaine\nn'a pas de\nrecette étrangère.",
              body: "ÉCLAT NATUREL est née d'une conviction : la peau africaine mérite des soins pensés pour elle — pas des adaptations de formules européennes. Nos produits sont formulés à Dakar avec des ingrédients africains purs — baobab, karité, moringa, neem — pour des résultats visibles sur toutes les carnations.\n\nSans paraben. Sans sulfate. Sans silicone. Testé dermatologiquement. Certifié clean beauty.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Notre histoire", href: "/a-propos" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Notre engagement",
              layout: "grid",
              items: [
                {
                  icon: "🌿",
                  title: "100% ingrédients naturels",
                  description:
                    "Karité, baobab, moringa, neem — tous nos actifs viennent d'Afrique de l'Ouest. Aucun ingrédient synthétique douteux.",
                },
                {
                  icon: "🔬",
                  title: "Formulé pour peau africaine",
                  description:
                    "Nos formules tiennent compte des besoins spécifiques des carnations foncées — hyperpigmentation, sécheresse, brillance.",
                },
                {
                  icon: "🚫",
                  title: "Clean — sans les mauvais ingrédients",
                  description:
                    "Sans paraben, sans sulfate, sans silicone, sans parfum artificiel. Testé dermatologiquement. Jamais sur animaux.",
                },
                {
                  icon: "♻️",
                  title: "Emballage responsable",
                  description:
                    "Flacons en verre ou plastique recyclé. Étiquettes en papier recyclé. Zéro surplastique. Packaging rechargeable en cours.",
                },
              ],
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              background: "#2D4A3E",
              items: [
                { value: "15", label: "Produits naturels" },
                { value: "3 000", suffix: "+", label: "Clientes satisfaites" },
                { value: "100%", label: "Clean beauty" },
                { value: "Dakar", label: "Formulé & livré" },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "La communauté ÉCLAT",
              layout: "grid",
              columns: 3,
              items: [
                { src: "", alt: "Huile de baobab — détail produit" },
                { src: "", alt: "Routine soin peau — femme africaine" },
                { src: "", alt: "Crème karité — texture" },
                { src: "", alt: "Sérum vitamine C — lifestyle" },
                { src: "", alt: "Collection ÉCLAT — flat lay" },
                { src: "", alt: "Client review — peau lumineuse" },
              ],
              instagramHandle: "@eclatnaturel.dakar",
              followLabel: "Suivre la communauté",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Elles témoignent",
              items: [
                {
                  quote:
                    "Le sérum vitamine C ÉCLAT NATUREL a transformé ma peau en 3 semaines. J'avais des taches post-acné depuis des années — elles ont clairement diminué. C'est le premier produit qui marche vraiment sur ma peau.",
                  author: "Fatou N.",
                  role: "Cliente, Dakar",
                },
                {
                  quote:
                    "J'utilise la crème karité éclat depuis 6 mois. Ma peau est hydratée toute la journée, même pendant la saison sèche. Et j'apprécie vraiment de connaître chaque ingrédient — rien de caché.",
                  author: "Aminata D.",
                  role: "Cliente régulière, Dakar",
                },
                {
                  quote:
                    "L'huile capillaire fortifiante a relancé la croissance de mes cheveux. En 2 mois, j'ai vu une vraie différence en densité et en brillance. Je recommande à toutes mes amies.",
                  author: "Ndéye K.",
                  role: "Cliente, Thiès",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Conseil personnalisé & commande",
              subheading:
                "Décrivez-nous votre type de peau et vos objectifs. On vous recommande les bons produits.",
              phoneNumber: "221770000003",
              message:
                "Bonjour ÉCLAT NATUREL — je voudrais [commander / avoir un conseil]. Mon type de peau : [sèche / mixte / grasse / sensible]. Mes objectifs : [hydratation / éclat / anti-taches / anti-âge]. Budget indicatif :",
              buttonLabel: "Nous écrire — WhatsApp",
            },
          },
        ],
      },
      {
        slug: "boutique",
        title: "Boutique",
        sections: [
          {
            type: "hero",
            props: {
              heading: "La boutique",
              subheading: "Soins visage, corps, cheveux — ingrédients naturels africains.",
              backgroundImageUrl: "",
              overlay: 0.2,
            },
          },
          {
            type: "products",
            props: {
              heading: "Tous les produits",
              columns: 3,
              items: [
                {
                  name: "Huile de Baobab Pure 50ml",
                  description: "Huile pressée à froid. Visage, corps, cheveux.",
                  price: 18500,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Bestseller",
                  filterTags: ["Huiles", "Visage"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000003",
                },
                {
                  name: "Crème Karité Éclat 200ml",
                  description: "Karité + vitamine C + rose musquée. Corps.",
                  price: 22000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Crèmes", "Corps"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000003",
                },
                {
                  name: "Sérum Vitamine C 15% 30ml",
                  description: "Anti-taches, anti-âge. Visage.",
                  price: 28500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Sérums", "Visage"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000003",
                },
                {
                  name: "Masque Argile & Aloe 100ml",
                  description: "Purifiant, pores resserrés.",
                  price: 15000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Masques", "Visage"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000003",
                },
                {
                  name: "Nettoyant Doux Moringa 150ml",
                  description: "Mousse nettoyante douce sans sulfate.",
                  price: 14000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Nettoyants", "Visage"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000003",
                },
                {
                  name: "Crème Nuit Régénérante 50ml",
                  description: "Nuit — huile de rose musquée + rétinol naturel.",
                  price: 25000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Crèmes", "Visage", "Nuit"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000003",
                },
                {
                  name: "Gommage Corps Sel & Karité",
                  description: "Exfoliant corps sel de mer + karité. Peau veloutée.",
                  price: 17000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Gommages", "Corps"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000003",
                },
                {
                  name: "Huile Capillaire Fortifiante 100ml",
                  description: "Ricin + avocat + romarin. Croissance et force.",
                  price: 16500,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Cheveux", "Huiles"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000003",
                },
                {
                  name: "Coffret Routine Complète",
                  description: "Nettoyant + sérum + crème jour + huile. 4 produits essentiels.",
                  price: 72000,
                  currency: "FCFA",
                  badge: "Économie -15%",
                  filterTags: ["Coffrets"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221770000003",
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
                  question: "Vos produits conviennent à toutes les peaux ?",
                  answer:
                    "Oui — formulations testées sur carnations foncées à claires. Pour peaux très sensibles, commencez par notre sérum ou l'huile de baobab pure.",
                },
                {
                  question: "Comment livrez-vous ?",
                  answer:
                    "Livraison Dakar en 24h. Banlieue et régions en 48-72h. Colissimo Sénégal disponible. Frais offerts dès 25 000 FCFA de commande.",
                },
                {
                  question: "Peut-on payer en plusieurs fois ?",
                  answer:
                    "Oui — paiement Wave ou Orange Money en 2 fois pour les commandes de 30 000 FCFA et plus.",
                },
              ],
              contactPanel: {
                heading: "Quel produit pour vous ?",
                body: "Dites-nous votre type de peau — on vous conseille.",
                ctaLabel: "Obtenir un conseil",
                ctaHref: "https://wa.me/221770000003",
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
              eyebrow: "Notre histoire",
              heading: "Née à Dakar.\nFormulée pour\nnous.",
              body: "ÉCLAT NATUREL est née en 2021 de la frustration de Khady Sow, chimiste et passionnée de beauté naturelle. \"Je cherchais des soins pour ma peau — vrais, naturels, sans les mauvais ingrédients. Tout ce que je trouvais était fait pour des peaux européennes. Alors j'ai décidé de créer les produits que je voulais trouver.\"\n\nAujourd'hui, ÉCLAT NATUREL compte 15 produits vendus dans tout le Sénégal et la diaspora africaine. Chaque formule est développée et produite à Dakar.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "Voir nos produits", href: "/boutique" },
            },
          },
          {
            type: "contact",
            props: {
              heading: "Nous contacter",
              email: "bonjour@eclatnaturel.sn",
              phone: "+221 77 000 00 03",
              address: "ÉCLAT NATUREL — Dakar, Sénégal · Livraison dans tout le Sénégal",
            },
          },
        ],
      },
    ],
  };
}

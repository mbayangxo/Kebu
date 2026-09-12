import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Makeup Brand — Gen-Z African cosmetics label.
 * Playful, colourful, unapologetic. Lip colours, blush, eye shadow, highlighters.
 * IA: Accueil · Shop · Looks · Contact
 */

const NAV = [
  { label: "Shop", href: "/shop" },
  { label: "Looks", href: "/looks" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "GLŌW LAB", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© GLŌW LAB — maquillage africain, pigments intenses, teintes pour toutes les carnations.",
      links: [
        { label: "Shop", href: "/shop" },
        { label: "Looks", href: "/looks" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function makeupBrandWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Makeup Brand",
    theme: {
      primary: "#1A0A2E",
      accent: "#FF3FBF",
      background: "#FFF5FB",
      text: "#1A0A2E",
      fontDisplay: "Playfair Display",
      fontBody: "DM Sans",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "genz-african-makeup",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("mk-nav-home"),
          {
            id: "mk-announce",
            type: "announcement-bar",
            props: {
              text: "🌟 LIVRAISON GRATUITE dès 15 000 FCFA — paiement Wave & Orange Money",
              background: "#FF3FBF",
              textColor: "#fff",
              freeShippingThreshold: 15000,
              freeShippingCurrency: "FCFA",
              freeShippingAchievedText: "Livraison gratuite débloquée — commandez maintenant 🎉",
            },
          },
          {
            id: "mk-hero",
            type: "editorial-hero",
            props: {
              heading: "GLOW FIRST.\nRULES LATER.",
              subheading:
                "Pigments intenses formulés pour les carnations africaines — du rouge lèvres ultra-mat au highlighter solaire.",
              buttonLabel: "Shopper maintenant",
              buttonHref: "/shop",
              imageUrl: "",
              imageAlt: "Modèle portant rouge à lèvres GLŌW LAB",
              align: "left",
              overlayOpacity: 0.3,
              heightVh: 85,
              background: "#1A0A2E",
            },
          },
          {
            id: "mk-marquee",
            type: "marquee",
            props: {
              items: [
                "PIGMENTS INTENSES",
                "LONGUE TENUE 12H",
                "TEINTES POUR TOUTES",
                "FORMULÉ À DAKAR",
                "SANS PLOMB NI PARABÈNES",
                "WEAR IT LOUD",
              ],
              speed: 45,
              background: "#FF3FBF",
              color: "#fff",
              separator: "★",
            },
          },
          {
            id: "mk-categories",
            type: "category-tiles",
            props: {
              heading: "Explorer par catégorie",
              columns: 4,
              items: [
                { label: "Lèvres", href: "/shop#levres", imageUrl: "", description: "Rouge à lèvres, gloss, liner" },
                { label: "Yeux", href: "/shop#yeux", imageUrl: "", description: "Fards, khôl, mascara" },
                { label: "Teint", href: "/shop#teint", imageUrl: "", description: "Fond de teint, poudre, blush" },
                { label: "Highlighter", href: "/shop#highlight", imageUrl: "", description: "Éclat solaire, strobing" },
              ],
            },
          },
          {
            id: "mk-deals",
            type: "products",
            props: {
              heading: "DEALS DE LA SEMAINE",
              layout: "grid",
              columns: 3,
              filterLabel: "Filtrer par gamme",
              orderCtaLabel: "Commander sur WhatsApp",
              promoBanner: {
                text: "Pack GLOW : achetez 3 produits → -15% automatique",
                subtext: "Code appliqué à la commande WhatsApp",
                background: "#1A0A2E",
                color: "#FF3FBF",
                insertAfterIndex: 2,
              },
              items: [
                {
                  name: "Rouge à Lèvres Ultra-Mat «Nuit Dakaroise»",
                  description:
                    "Formule longue tenue 12h — ultra-pigmentée, ne sèche pas. Nuance bordeaux profond pour teintes moyennes à foncées.",
                  priceLabel: "6 500 FCFA",
                  valuePriceLabel: "8 500 FCFA",
                  badge: "DEAL",
                  imageUrl: "",
                  filterTags: ["levres", "mat"],
                  attributes: [
                    { icon: "💄", label: "Longue tenue 12h" },
                    { icon: "🌿", label: "Sans plomb" },
                    { icon: "✨", label: "Ultra-pigmenté" },
                  ],
                  whatsappMessage:
                    "Bonjour — je voudrais commander le Rouge à Lèvres Ultra-Mat «Nuit Dakaroise» 6 500 FCFA. Quelle est votre disponibilité ?",
                },
                {
                  name: "Palette Yeux «Sahel Sunset»",
                  description:
                    "9 teintes chaudes — terracotta, ocre, or brûlé, bronze. Pigmentation intense, blendable. Idéale pour les yeux foncés.",
                  priceLabel: "14 500 FCFA",
                  badge: "BESTSELLER",
                  imageUrl: "",
                  filterTags: ["yeux", "palette"],
                  attributes: [
                    { icon: "🎨", label: "9 teintes" },
                    { icon: "✨", label: "Pigmentation intense" },
                    { icon: "🌍", label: "Pour yeux foncés" },
                  ],
                  whatsappMessage:
                    "Bonjour — je voudrais commander la Palette Yeux «Sahel Sunset» 14 500 FCFA.",
                },
                {
                  name: "Highlighter Poudre «Or de Bamako»",
                  description:
                    "Teinte or chaud multi-chrome — illumine sans saturer. Fonctionne sur les carnations les plus foncées. Fini strobe naturel.",
                  priceLabel: "9 000 FCFA",
                  badge: "NOUVEAU",
                  imageUrl: "",
                  filterTags: ["teint", "highlighter"],
                  attributes: [
                    { icon: "✨", label: "Multi-chrome" },
                    { icon: "🌍", label: "Pour carnations foncées" },
                    { icon: "💛", label: "Or chaud" },
                  ],
                  whatsappMessage:
                    "Bonjour — je voudrais commander le Highlighter «Or de Bamako» 9 000 FCFA.",
                },
                {
                  name: "Blush Poudre «Baobab Rose»",
                  description:
                    "Blush rose corail buildable — naturel sur les peaux mates, intense sur les peaux foncées. Fini satiné.",
                  priceLabel: "7 500 FCFA",
                  imageUrl: "",
                  filterTags: ["teint", "blush"],
                  attributes: [
                    { icon: "🌸", label: "Buildable" },
                    { icon: "✨", label: "Fini satiné" },
                    { icon: "🌿", label: "Sans talc" },
                  ],
                  whatsappMessage:
                    "Bonjour — je voudrais commander le Blush «Baobab Rose» 7 500 FCFA.",
                },
                {
                  name: "Gloss Lèvres «Mango Glow»",
                  description:
                    "Gloss non-poisseux parfumé à la mangue — volume + éclat, tient 4h. Teinte nude rosé universel.",
                  priceLabel: "4 500 FCFA",
                  badge: "POPULAIRE",
                  imageUrl: "",
                  filterTags: ["levres", "gloss"],
                  attributes: [
                    { icon: "🥭", label: "Parfum mangue" },
                    { icon: "💋", label: "Volume + éclat" },
                    { icon: "🌿", label: "Non-poisseux" },
                  ],
                  whatsappMessage:
                    "Bonjour — je voudrais commander le Gloss «Mango Glow» 4 500 FCFA.",
                },
                {
                  name: "Fond de Teint Sérum «Teinte Ébène»",
                  description:
                    "Coverage moyen buildable — SPF 20, formule légère hydratante. Gamme de 16 teintes pour peaux africaines du N°08 au N°16.",
                  priceLabel: "18 000 FCFA",
                  badge: "EXCLUSIF EN LIGNE",
                  imageUrl: "",
                  filterTags: ["teint", "fond-de-teint"],
                  attributes: [
                    { icon: "☀️", label: "SPF 20" },
                    { icon: "💧", label: "Hydratant" },
                    { icon: "🎨", label: "16 teintes" },
                  ],
                  hasVariants: true,
                  variants: [
                    { id: "00000000-0000-0000-0000-000000000101", name: "N°08 — Caramel", option1: "N°08 — Caramel", priceLabel: "18 000 FCFA", imageUrl: "" },
                    { id: "00000000-0000-0000-0000-000000000102", name: "N°11 — Cannelle", option1: "N°11 — Cannelle", priceLabel: "18 000 FCFA", imageUrl: "" },
                    { id: "00000000-0000-0000-0000-000000000103", name: "N°14 — Ébène", option1: "N°14 — Ébène", priceLabel: "18 000 FCFA", imageUrl: "" },
                    { id: "00000000-0000-0000-0000-000000000104", name: "N°16 — Nuit", option1: "N°16 — Nuit", priceLabel: "18 000 FCFA", imageUrl: "" },
                  ],
                  whatsappMessage:
                    "Bonjour — je voudrais commander le Fond de Teint Sérum «Teinte Ébène». Quelle teinte avez-vous en stock ?",
                },
              ],
            },
          },
          {
            id: "mk-editorial-split",
            type: "split",
            props: {
              heading: "SKINCARE D'ABORD.\nMAKEUP ENSUITE.",
              body: "On formule chaque produit pour qu'il aime ta peau — pas juste la couvrir. Pas de plomb, pas d'alcool desséchant, pas de mensonges. Juste de la couleur qui te ressemble.",
              imageUrl: "",
              imageAlt: "Flat-lay produits GLŌW LAB",
              imagePosition: "right",
              buttonLabel: "Notre philosophie",
              buttonHref: "/contact",
            },
          },
          {
            id: "mk-quiz",
            type: "quiz",
            props: {
              heading: "Ton code promo t'attend 🎁",
              subheading: "Réponds à 2 questions — on t'envoie un code -10% sur ta première commande.",
              mode: "discount-gate",
              discountTeaser: "Débloque -10% sur ta première commande",
              ctaLabel: "Recevoir mon code sur WhatsApp",
              whatsappPhone: "+221770000000",
              whatsappIntro: "Bonjour GLŌW LAB — voici mon profil pour le code promo :",
              steps: [
                {
                  id: "type-peau",
                  question: "Ton type de peau ?",
                  icon: "💆",
                  options: ["Peau grasse", "Peau mixte", "Peau sèche", "Peau normale"],
                },
                {
                  id: "budget",
                  question: "Ton budget pour un look complet ?",
                  icon: "💰",
                  options: [
                    "Moins de 10 000 FCFA",
                    "10 000 – 20 000 FCFA",
                    "20 000 – 35 000 FCFA",
                    "Plus de 35 000 FCFA",
                  ],
                },
              ],
            },
          },
          {
            id: "mk-testimonials",
            type: "testimonials",
            props: {
              heading: "Elles en parlent mieux que nous",
              topics: ["Rouge à lèvres", "Palette", "Fond de teint", "Highlighter"],
              items: [
                {
                  quote: "Le rouge «Nuit Dakaroise» tient toute la journée sans bavure — même sous le soleil de Dakar. C'est rare.",
                  name: "Aminata D.",
                  role: "Dakar",
                  skinType: "Peau grasse",
                  reviewTopics: ["Rouge à lèvres"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "La palette Sahel Sunset est INCROYABLE — les pigments sont dingues sur ma peau foncée. Enfin une palette qui me correspond.",
                  name: "Marème F.",
                  role: "Thiès",
                  skinType: "Peau foncée",
                  reviewTopics: ["Palette"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Le fond de teint tient 8h au bureau climatisé et dehors — c'est impressionnant. Le service WhatsApp est super réactif.",
                  name: "Rokhaya T.",
                  role: "Abidjan",
                  skinType: "Peau mixte",
                  reviewTopics: ["Fond de teint"],
                  verified: true,
                  rating: 4,
                },
              ],
            },
          },
          {
            id: "mk-whatsapp",
            type: "whatsapp",
            props: {
              label: "Commander sur WhatsApp — paiement Wave ou Orange Money",
              phone: "+221770000000",
              message: "Bonjour GLŌW LAB — je voudrais passer une commande. Pouvez-vous m'envoyer votre catalogue ?",
            },
          },
          footer("mk-footer-home"),
        ],
      },
      {
        slug: "shop",
        title: "Shop",
        sections: [
          nav("mk-nav-shop"),
          {
            id: "mk-shop-hero",
            type: "hero",
            props: {
              heading: "Toute la collection",
              subheading: "Pigments pour toutes les carnations — livraison à domicile, paiement Wave ou Orange Money.",
              buttonLabel: "Commencer à shopper",
              buttonHref: "#produits",
              align: "center",
              background: "#1A0A2E",
            },
          },
          {
            id: "mk-shop-products",
            type: "products",
            props: {
              heading: "Collection complète",
              layout: "grid",
              columns: 3,
              filterLabel: "Filtrer par gamme",
              orderCtaLabel: "Commander sur WhatsApp",
              items: [
                {
                  name: "Rouge à Lèvres Ultra-Mat «Nuit Dakaroise»",
                  description: "Formule longue tenue 12h — ultra-pigmentée, bordeaux profond.",
                  priceLabel: "6 500 FCFA",
                  valuePriceLabel: "8 500 FCFA",
                  badge: "DEAL",
                  imageUrl: "",
                  filterTags: ["levres", "mat"],
                  whatsappMessage: "Bonjour — je voudrais commander le Rouge à Lèvres Ultra-Mat «Nuit Dakaroise» 6 500 FCFA.",
                },
                {
                  name: "Palette Yeux «Sahel Sunset»",
                  description: "9 teintes chaudes — terracotta, ocre, or brûlé.",
                  priceLabel: "14 500 FCFA",
                  badge: "BESTSELLER",
                  imageUrl: "",
                  filterTags: ["yeux", "palette"],
                  whatsappMessage: "Bonjour — je voudrais commander la Palette Yeux «Sahel Sunset» 14 500 FCFA.",
                },
                {
                  name: "Highlighter Poudre «Or de Bamako»",
                  description: "Teinte or chaud multi-chrome, fini strobe.",
                  priceLabel: "9 000 FCFA",
                  badge: "NOUVEAU",
                  imageUrl: "",
                  filterTags: ["teint", "highlighter"],
                  whatsappMessage: "Bonjour — je voudrais commander le Highlighter «Or de Bamako» 9 000 FCFA.",
                },
                {
                  name: "Blush Poudre «Baobab Rose»",
                  description: "Rose corail buildable — fini satiné.",
                  priceLabel: "7 500 FCFA",
                  imageUrl: "",
                  filterTags: ["teint", "blush"],
                  whatsappMessage: "Bonjour — je voudrais commander le Blush «Baobab Rose» 7 500 FCFA.",
                },
                {
                  name: "Gloss Lèvres «Mango Glow»",
                  description: "Gloss non-poisseux parfumé mangue, nude rosé.",
                  priceLabel: "4 500 FCFA",
                  badge: "POPULAIRE",
                  imageUrl: "",
                  filterTags: ["levres", "gloss"],
                  whatsappMessage: "Bonjour — je voudrais commander le Gloss «Mango Glow» 4 500 FCFA.",
                },
                {
                  name: "Fond de Teint Sérum «Teinte Ébène»",
                  description: "Coverage buildable SPF 20 — 16 teintes pour peaux africaines.",
                  priceLabel: "18 000 FCFA",
                  badge: "EXCLUSIF EN LIGNE",
                  imageUrl: "",
                  filterTags: ["teint", "fond-de-teint"],
                  hasVariants: true,
                  variants: [
                    { id: "00000000-0000-0000-0000-000000000201", name: "N°08 — Caramel", option1: "N°08", priceLabel: "18 000 FCFA", imageUrl: "" },
                    { id: "00000000-0000-0000-0000-000000000202", name: "N°11 — Cannelle", option1: "N°11", priceLabel: "18 000 FCFA", imageUrl: "" },
                    { id: "00000000-0000-0000-0000-000000000203", name: "N°14 — Ébène", option1: "N°14", priceLabel: "18 000 FCFA", imageUrl: "" },
                    { id: "00000000-0000-0000-0000-000000000204", name: "N°16 — Nuit", option1: "N°16", priceLabel: "18 000 FCFA", imageUrl: "" },
                  ],
                  whatsappMessage: "Bonjour — je voudrais commander le Fond de Teint Sérum. Quelle teinte recommandez-vous ?",
                },
                {
                  name: "Crayon Khôl «Midnight»",
                  description: "Khôl longue tenue — intense et waterproof. Utilisable en liner et en ombre.",
                  priceLabel: "3 500 FCFA",
                  imageUrl: "",
                  filterTags: ["yeux", "liner"],
                  whatsappMessage: "Bonjour — je voudrais commander le Crayon Khôl «Midnight» 3 500 FCFA.",
                },
                {
                  name: "Mascara Volume «Lash Luxe»",
                  description: "Volume × 3 — formule sans grumeaux, résiste à la chaleur. Démaquillage à l'eau.",
                  priceLabel: "8 000 FCFA",
                  imageUrl: "",
                  filterTags: ["yeux", "mascara"],
                  whatsappMessage: "Bonjour — je voudrais commander le Mascara «Lash Luxe» 8 000 FCFA.",
                },
              ],
            },
          },
          footer("mk-footer-shop"),
        ],
      },
      {
        slug: "looks",
        title: "Looks",
        sections: [
          nav("mk-nav-looks"),
          {
            id: "mk-looks-hero",
            type: "hero",
            props: {
              heading: "Inspiration looks",
              subheading: "Looks créés par notre communauté — envoyez votre look avec #GlowLabDakar.",
              buttonLabel: "Partager votre look",
              buttonHref: "#",
              align: "center",
              background: "#1A0A2E",
            },
          },
          {
            id: "mk-looks-gallery",
            type: "gallery",
            props: {
              heading: "Galerie communautaire",
              layout: "grid",
              columns: 3,
              instagramHandle: "glowlab.dkr",
              followLabel: "Partager votre look #GlowLabDakar",
              items: [
                { src: "", alt: "Look soirée — rouge mat + highlight or" },
                { src: "", alt: "Look naturel bureau — teint + gloss nude" },
                { src: "", alt: "Look festival — fard coloré + glitter" },
                { src: "", alt: "Look mariée — violet prune + illuminateur" },
                { src: "", alt: "Look quotidien — BB cream + lip balm" },
                { src: "", alt: "Look bold — rouge corail + khôl noir" },
              ],
            },
          },
          {
            id: "mk-looks-whatsapp",
            type: "whatsapp",
            props: {
              label: "Reproduire un look — demander les produits sur WhatsApp",
              phone: "+221770000000",
              message: "Bonjour GLŌW LAB — j'ai vu un look dans votre galerie et je voudrais savoir quels produits il faut pour le reproduire.",
            },
          },
          footer("mk-footer-looks"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("mk-nav-contact"),
          {
            id: "mk-contact-section",
            type: "contact",
            props: {
              heading: "Contactez GLŌW LAB",
              email: "contact@glowlab.example",
              phone: "+221770000000",
              address: "GLŌW LAB — Dakar, Sénégal · Commandes partout en Afrique de l'Ouest",
            },
          },
          {
            id: "mk-contact-wa",
            type: "whatsapp",
            props: {
              label: "WhatsApp — commandes, questions, réclamations",
              phone: "+221770000000",
              message: "Bonjour GLŌW LAB — j'ai une question sur votre collection.",
            },
          },
          {
            id: "mk-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Comment passer une commande ?",
                  answer: "Choisissez vos produits dans le shop et appuyez sur 'Commander sur WhatsApp' — on prend en charge via WhatsApp, paiement Wave ou Orange Money, livraison à domicile.",
                },
                {
                  question: "Quelles teintes de fond de teint avez-vous ?",
                  answer: "16 teintes du N°08 Caramel au N°16 Nuit — toutes formulées pour les carnations africaines. WhatsApp-nous pour un test couleur.",
                },
                {
                  question: "Les produits contiennent-ils des substances nocives ?",
                  answer: "Non — sans plomb, sans parabènes, sans alcool desséchant. Chaque lot est tracé. Certains produits sont testés dermatologiquement.",
                },
                {
                  question: "Livraison dans quelles villes ?",
                  answer: "Dakar, Thiès, Saint-Louis, Abidjan, Bamako, Cotonou — et partout ailleurs sur demande. Délai 24–48h dans les grandes villes.",
                },
              ],
            },
          },
          footer("mk-footer-contact"),
        ],
      },
    ],
  };
}

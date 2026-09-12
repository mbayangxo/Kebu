import type { WebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Hair Brand — African hair extensions, wigs, tresses, bundles.
 * Feminine pink aesthetic. WhatsApp orders, Wave/Orange Money payments.
 * IA: Accueil · Shop · Tresses · Perruques · Bundles · Contact
 */

const NAV = [
  { label: "Shop", href: "/shop" },
  { label: "Tresses", href: "/shop#tresses" },
  { label: "Perruques", href: "/shop#perruques" },
  { label: "Bundles", href: "/shop#bundles" },
  { label: "Contact", href: "/contact" },
] as const;

function nav(id: string) {
  return {
    id,
    type: "navigation" as const,
    props: { brand: "COIFURE SILK", links: [...NAV] },
  };
}

function footer(id: string) {
  return {
    id,
    type: "footer" as const,
    props: {
      text: "© COIFURE SILK — extensions, perruques, tresses. Livraison à Dakar · Paiement Wave & Orange Money.",
      links: [
        { label: "Shop", href: "/shop" },
        { label: "Tresses", href: "/shop#tresses" },
        { label: "Contact", href: "/contact" },
      ],
    },
  };
}

export function hairBrandWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "Marque Cheveux",
    theme: {
      primary: "#1A0A10",
      accent: "#D4739A",
      background: "#FFF0F5",
      text: "#1A0A10",
      fontDisplay: "Playfair Display",
      fontBody: "DM Sans",
      spacing: "comfortable",
      headingScale: "xl",
      bodySize: "md",
      letterSpacing: "normal",
      aestheticId: "feminine-pink-hair",
    },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        sections: [
          nav("hr-nav-home"),
          {
            id: "hr-announce",
            type: "announcement-bar",
            props: {
              text: "✨ LIVRAISON GRATUITE dès 25 000 FCFA — commandez sur WhatsApp, payez Wave ou Orange Money",
              background: "#D4739A",
              textColor: "#fff",
              freeShippingThreshold: 25000,
              freeShippingCurrency: "FCFA",
              freeShippingAchievedText: "Livraison offerte — finalisez votre commande 🎉",
            },
          },
          {
            id: "hr-hero",
            type: "editorial-hero",
            props: {
              heading: "DES CHEVEUX\nQUI PARLENT\nAVANT TOI.",
              subheading:
                "Extensions, perruques lace front, tresses — qualité remy hair, livraison à Dakar. Commandez sur WhatsApp, payez Wave.",
              buttonLabel: "Shopper maintenant",
              buttonHref: "/shop",
              imageUrl: "",
              imageAlt: "Modèle portant extension COIFURE SILK",
              align: "left",
              overlayOpacity: 0.45,
              heightVh: 85,
              background: "#1A0A10",
            },
          },
          {
            id: "hr-marquee",
            type: "marquee",
            props: {
              items: [
                "REMY HAIR 100%",
                "LIVRAISON DAKAR",
                "LACE FRONT",
                "TRESSES NATURELLES",
                "BUNDLES QUALITÉ",
                "PAIEMENT WAVE",
                "GREAT HAIR SPEAKS LOUDER",
              ],
              speed: 50,
              background: "#D4739A",
              color: "#fff",
              separator: "·",
            },
          },
          {
            id: "hr-categories",
            type: "category-tiles",
            props: {
              heading: "Explorer par type",
              columns: 4,
              items: [
                { label: "Tresses", href: "/shop#tresses", imageUrl: "", description: "Nattes, box braids, twists" },
                { label: "Perruques", href: "/shop#perruques", imageUrl: "", description: "Lace front, full lace, U-part" },
                { label: "Extensions", href: "/shop#extensions", imageUrl: "", description: "Clip-in, tissage, weave" },
                { label: "Accessoires", href: "/shop#accessoires", imageUrl: "", description: "Bonnets, filets, pins" },
              ],
            },
          },
          {
            id: "hr-bestsellers",
            type: "products",
            props: {
              heading: "Meilleures ventes",
              layout: "grid",
              columns: 3,
              filterLabel: "Filtrer par type",
              orderCtaLabel: "Commander sur WhatsApp",
              promoBanner: {
                text: "Bundle Deal : achetez 2 paquets → -10% automatique",
                subtext: "Applicable sur extensions et weave — code WhatsApp",
                background: "#D4739A",
                color: "#fff",
                insertAfterIndex: 2,
              },
              items: [
                {
                  name: "Extension Indian Straight 18\" — Natural Black",
                  description:
                    "100% Remy Hair — lisse, brillant, fini naturel. Tissage facile, tient 3–4 mois avec entretien. 100g par paquet.",
                  priceLabel: "18 500 FCFA",
                  badge: "BESTSELLER",
                  imageUrl: "",
                  filterTags: ["extensions", "lisse"],
                  attributes: [
                    { icon: "💇", label: "100% Remy Hair" },
                    { icon: "📏", label: "18 pouces" },
                    { icon: "⚖️", label: "100g / paquet" },
                  ],
                  goodFor: ["Tissage", "Sew-in", "Quick weave"],
                  whatsappMessage:
                    "Bonjour — je voudrais commander l'Extension Indian Straight 18\" Natural Black (18 500 FCFA). Quelle quantité avez-vous en stock ?",
                },
                {
                  name: "Perruque Lace Front — Body Wave 20\"",
                  description:
                    "Lace front 13×4 — pre-plucked, baby hair inclus. Densité 150%. Pose sans colle possible. Remy hair.",
                  priceLabel: "65 000 FCFA",
                  badge: "NOUVEAU",
                  imageUrl: "",
                  filterTags: ["perruques", "lace-front"],
                  attributes: [
                    { icon: "✨", label: "Pre-plucked" },
                    { icon: "💇", label: "Lace 13×4" },
                    { icon: "📏", label: "20 pouces — densité 150%" },
                  ],
                  hasVariants: true,
                  variants: [
                    { id: "00000000-0000-0000-0000-000000000301", name: "Natural Black", option1: "Natural Black", priceLabel: "65 000 FCFA", imageUrl: "" },
                    { id: "00000000-0000-0000-0000-000000000302", name: "Dark Brown #2", option1: "Dark Brown #2", priceLabel: "65 000 FCFA", imageUrl: "" },
                    { id: "00000000-0000-0000-0000-000000000303", name: "Blonde #613", option1: "Blonde #613", priceLabel: "72 000 FCFA", imageUrl: "" },
                  ],
                  whatsappMessage:
                    "Bonjour — je voudrais commander la Perruque Lace Front Body Wave 20\". Quelle teinte avez-vous en stock ?",
                },
                {
                  name: "Tresses Crochet — Passion Twist 18\"",
                  description:
                    "Cheveux synthétiques haute qualité — pour passion twist et spring twist. Doux au toucher, résistant à la chaleur légère.",
                  priceLabel: "8 500 FCFA",
                  imageUrl: "",
                  filterTags: ["tresses", "crochet"],
                  attributes: [
                    { icon: "🌀", label: "Passion Twist" },
                    { icon: "📏", label: "18 pouces" },
                    { icon: "🔥", label: "Heat resistant" },
                  ],
                  whatsappMessage:
                    "Bonjour — je voudrais commander les Tresses Crochet Passion Twist 18\" (8 500 FCFA). Quelles couleurs avez-vous ?",
                },
                {
                  name: "Extension Clip-In — Curly Afro 16\"",
                  description:
                    "Set 7 pièces clip-in — cheveux bouclés type 3C, 120g total. Pose en 10 minutes, sans colle ni chaleur.",
                  priceLabel: "22 000 FCFA",
                  badge: "POPULAIRE",
                  imageUrl: "",
                  filterTags: ["extensions", "bouclé"],
                  attributes: [
                    { icon: "💇", label: "7 pièces" },
                    { icon: "⚡", label: "Pose 10 minutes" },
                    { icon: "🌀", label: "Type 3C" },
                  ],
                  whatsappMessage:
                    "Bonjour — je voudrais commander l'Extension Clip-In Curly Afro 16\" (22 000 FCFA).",
                },
                {
                  name: "Bundle Deal — Wavy 18\" × 3 paquets",
                  description:
                    "Pack 3 paquets ondulés assorties — parfait pour sew-in complet. Économie vs achat séparé. Livraison offerte.",
                  priceLabel: "48 000 FCFA",
                  valuePriceLabel: "55 500 FCFA",
                  badge: "DEAL",
                  imageUrl: "",
                  filterTags: ["extensions", "bundle"],
                  attributes: [
                    { icon: "📦", label: "3 paquets" },
                    { icon: "💰", label: "-13% vs achat séparé" },
                    { icon: "🚚", label: "Livraison offerte" },
                  ],
                  whatsappMessage:
                    "Bonjour — je voudrais commander le Bundle Deal Wavy 18\" × 3 paquets (48 000 FCFA).",
                },
                {
                  name: "Perruque Full Lace — Straight 22\"",
                  description:
                    "Full lace wig — liberté de coiffure totale, nœuds blanchis. 100% Remy Human Hair. Densité 180%.",
                  priceLabel: "95 000 FCFA",
                  badge: "PREMIUM",
                  imageUrl: "",
                  filterTags: ["perruques", "full-lace"],
                  attributes: [
                    { icon: "👑", label: "Full Lace" },
                    { icon: "💇", label: "180% densité" },
                    { icon: "✨", label: "Nœuds blanchis" },
                  ],
                  whatsappMessage:
                    "Bonjour — je voudrais commander la Perruque Full Lace Straight 22\" (95 000 FCFA). Avez-vous ce modèle en stock ?",
                },
              ],
            },
          },
          {
            id: "hr-education",
            type: "features",
            props: {
              heading: "Nos garanties",
              backgroundImageUrl: "",
              items: [
                {
                  icon: "✅",
                  title: "100% Remy Hair",
                  body: "Tous nos cheveux naturels sont Remy — cuticules alignées, zéro emmêlement, longévité maximale.",
                },
                {
                  icon: "🚚",
                  title: "Livraison 24h à Dakar",
                  body: "Commandez avant 14h — livraison le lendemain à Dakar, Thiès, Saint-Louis. Suivi WhatsApp en temps réel.",
                },
                {
                  icon: "💳",
                  title: "Paiement flexible",
                  body: "Wave, Orange Money, Wizall, espèces à la livraison. Paiement en 2× disponible sur commandes dès 50 000 FCFA.",
                },
                {
                  icon: "🔄",
                  title: "Échange facile",
                  body: "Teinte pas exactement celle attendue ? Échange gratuit sous 48h — on gère la logistique.",
                },
              ],
            },
          },
          {
            id: "hr-testimonials",
            type: "testimonials",
            props: {
              heading: "Elles nous font confiance",
              topics: ["Extensions", "Perruques", "Tresses", "Bundles"],
              items: [
                {
                  quote: "La perruque lace front est INCROYABLE — natural, bien posée, personne n'a vu que c'était une perruque. Livraison en 24h comme promis.",
                  name: "Fatou D.",
                  role: "Dakar",
                  reviewTopics: ["Perruques"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Bundle wavy × 3 reçu le lendemain — qualité top, pas de cheveux qui tombent après lavage. Je recommande.",
                  name: "Aïda K.",
                  role: "Thiès",
                  reviewTopics: ["Bundles", "Extensions"],
                  verified: true,
                  rating: 5,
                },
                {
                  quote: "Les tresses crochet passion twist sont douces, légères, ça tient 2 mois sans problème. Le service WhatsApp répond vite.",
                  name: "Mariama S.",
                  role: "Abidjan",
                  reviewTopics: ["Tresses"],
                  verified: true,
                  rating: 5,
                },
              ],
            },
          },
          {
            id: "hr-gallery",
            type: "gallery",
            props: {
              heading: "Nos réalisations",
              layout: "grid",
              columns: 3,
              instagramHandle: "coifuresilk",
              followLabel: "Partagez votre coiffure #CoifureSilk",
              items: [
                { src: "", alt: "Perruque lace front ondulée" },
                { src: "", alt: "Tresses box braids longues" },
                { src: "", alt: "Extension straight naturel" },
                { src: "", alt: "Passion twist couleur" },
                { src: "", alt: "Bundle wavy complet" },
                { src: "", alt: "Full lace wig blonde" },
              ],
            },
          },
          {
            id: "hr-whatsapp",
            type: "whatsapp",
            props: {
              label: "Commander sur WhatsApp — réponse en moins de 2h",
              phone: "+221770000000",
              message: "Bonjour COIFURE SILK — je voudrais passer une commande. Pouvez-vous m'envoyer votre catalogue complet ?",
            },
          },
          footer("hr-footer-home"),
        ],
      },
      {
        slug: "shop",
        title: "Shop",
        sections: [
          nav("hr-nav-shop"),
          {
            id: "hr-shop-hero",
            type: "hero",
            props: {
              heading: "Toute la collection",
              subheading: "Extensions, perruques, tresses — qualité Remy Hair, livraison à domicile.",
              buttonLabel: "Voir les best-sellers",
              buttonHref: "#bestsellers",
              align: "center",
              background: "#1A0A10",
            },
          },
          {
            id: "hr-shop-products",
            type: "products",
            props: {
              heading: "Collection complète",
              layout: "grid",
              columns: 3,
              filterLabel: "Filtrer par type",
              orderCtaLabel: "Commander sur WhatsApp",
              items: [
                {
                  name: "Extension Indian Straight 18\" — Natural Black",
                  description: "100% Remy Hair — lisse, 100g par paquet.",
                  priceLabel: "18 500 FCFA",
                  badge: "BESTSELLER",
                  imageUrl: "",
                  filterTags: ["extensions", "lisse"],
                  whatsappMessage: "Bonjour — je voudrais commander l'Extension Indian Straight 18\" (18 500 FCFA).",
                },
                {
                  name: "Perruque Lace Front — Body Wave 20\"",
                  description: "Lace front 13×4 — pre-plucked, 150% densité.",
                  priceLabel: "65 000 FCFA",
                  badge: "NOUVEAU",
                  imageUrl: "",
                  filterTags: ["perruques", "lace-front"],
                  whatsappMessage: "Bonjour — je voudrais commander la Perruque Lace Front Body Wave 20\".",
                },
                {
                  name: "Tresses Crochet Passion Twist 18\"",
                  description: "Synthétique haute qualité, doux, résistant à la chaleur.",
                  priceLabel: "8 500 FCFA",
                  imageUrl: "",
                  filterTags: ["tresses", "crochet"],
                  whatsappMessage: "Bonjour — je voudrais commander les Tresses Crochet Passion Twist 18\".",
                },
                {
                  name: "Extension Clip-In Curly Afro 16\"",
                  description: "Set 7 pièces clip-in, 120g total, type 3C.",
                  priceLabel: "22 000 FCFA",
                  badge: "POPULAIRE",
                  imageUrl: "",
                  filterTags: ["extensions", "bouclé"],
                  whatsappMessage: "Bonjour — je voudrais commander l'Extension Clip-In Curly Afro 16\".",
                },
                {
                  name: "Bundle Wavy 18\" × 3 paquets",
                  description: "Pack 3 paquets ondulés — économie -13%.",
                  priceLabel: "48 000 FCFA",
                  valuePriceLabel: "55 500 FCFA",
                  badge: "DEAL",
                  imageUrl: "",
                  filterTags: ["extensions", "bundle"],
                  whatsappMessage: "Bonjour — je voudrais commander le Bundle Wavy 18\" × 3 paquets.",
                },
                {
                  name: "Perruque Full Lace Straight 22\"",
                  description: "Full lace — liberté totale, 180% densité, Remy Human Hair.",
                  priceLabel: "95 000 FCFA",
                  badge: "PREMIUM",
                  imageUrl: "",
                  filterTags: ["perruques", "full-lace"],
                  whatsappMessage: "Bonjour — je voudrais commander la Perruque Full Lace Straight 22\".",
                },
                {
                  name: "Tresses Knotless Box Braids 24\"",
                  description: "Synthétique sans nœuds apparents — plus léger, moins de tension sur le cuir chevelu.",
                  priceLabel: "12 000 FCFA",
                  imageUrl: "",
                  filterTags: ["tresses", "knotless"],
                  whatsappMessage: "Bonjour — je voudrais commander les Tresses Knotless Box Braids 24\".",
                },
                {
                  name: "Bonnet Satin Anti-Casse",
                  description: "Bonnet satin double face — protège la coiffure la nuit, anti-casse et anti-frizz.",
                  priceLabel: "3 500 FCFA",
                  imageUrl: "",
                  filterTags: ["accessoires"],
                  whatsappMessage: "Bonjour — je voudrais commander le Bonnet Satin Anti-Casse (3 500 FCFA).",
                },
              ],
            },
          },
          footer("hr-footer-shop"),
        ],
      },
      {
        slug: "contact",
        title: "Contact",
        sections: [
          nav("hr-nav-contact"),
          {
            id: "hr-contact-section",
            type: "contact",
            props: {
              heading: "Contactez COIFURE SILK",
              email: "contact@coifuresilk.example",
              phone: "+221770000000",
              address: "COIFURE SILK — Dakar, Sénégal · Livraison partout en Afrique de l'Ouest",
            },
          },
          {
            id: "hr-contact-wa",
            type: "whatsapp",
            props: {
              label: "WhatsApp — commandes, conseils, retours",
              phone: "+221770000000",
              message: "Bonjour COIFURE SILK — j'ai une question sur votre catalogue.",
            },
          },
          {
            id: "hr-faq",
            type: "faq",
            props: {
              heading: "Questions fréquentes",
              items: [
                {
                  question: "Comment savoir quelle longueur choisir ?",
                  answer: "Envoyez-nous votre taille et une photo sur WhatsApp — notre conseillère vous recommande la longueur adaptée à votre morphologie.",
                },
                {
                  question: "Les cheveux naturels durent combien de temps ?",
                  answer: "Avec un entretien correct (lavage doux, hydratation, rangement), les cheveux Remy durent 12 à 18 mois. Les synthétiques : 2 à 4 mois.",
                },
                {
                  question: "Puis-je teindre les extensions ?",
                  answer: "Oui pour les extensions Remy Human Hair — du plus foncé vers le plus clair uniquement. Les synthétiques ne se teignent pas.",
                },
                {
                  question: "Livrez-vous en dehors de Dakar ?",
                  answer: "Oui — Thiès, Saint-Louis, Ziguinchor en 48h. Abidjan, Bamako, Cotonou en 3 à 5 jours. Contactez-nous pour les zones reculées.",
                },
              ],
              contactPanel: {
                heading: "Besoin d'un conseil personnalisé ?",
                body: "Notre conseillère répond en moins d'1h sur WhatsApp — en français, en wolof, en dioula. Diagnostic gratuit.",
                buttonLabel: "Parler à la conseillère",
                buttonHref: "/contact",
                imageUrl: "",
              },
            },
          },
          footer("hr-footer-contact"),
        ],
      },
    ],
  };
}

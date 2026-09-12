import type { WebsiteDefinition } from "../website-schema";

/**
 * PETITE ÉTOILE — Agence de mannequinat enfants & juniors
 * Playful premium: violet lavande + rose pêche + blanc + or
 * Nunito (display) + DM Sans (body)
 * Casting, modélisme enfants, e-commerce vêtements, Dakar
 */
export function agenceEnfantsWorldDefinition(): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title: "PETITE ÉTOILE",
    theme: {
      primary: "#3D1A78",
      accent: "#F4A261",
      background: "#FDFBFF",
      text: "#1E0E3C",
      surface: "#F0EAFA",
      fontDisplay: "Nunito",
      fontBody: "DM Sans",
      spacing: "comfortable",
      headingScale: "lg",
      bodySize: "md",
      letterSpacing: "normal",
      radius: "round",
      aestheticId: "playful-kids-modeling-agency",
    },
    pages: [
      {
        slug: "accueil",
        title: "Accueil",
        sections: [
          {
            type: "announcement-bar",
            props: {
              text: "✨ Castings ouverts — Enfants 3–16 ans · Inscription gratuite · Prochaine session samedi 10h",
              background: "#3D1A78",
              color: "#FFFFFF",
              linkText: "S'inscrire",
              linkUrl: "/casting",
            },
          },
          {
            type: "editorial-hero",
            props: {
              eyebrow: "Agence de Mannequinat Enfants · Dakar",
              heading: "Chaque enfant\nest une\npetite étoile.",
              subheading:
                "PETITE ÉTOILE découvre et place les jeunes talents de la mode en Afrique de l'Ouest. Castings, formations, placements pour des marques, campagnes et défilés.",
              primaryCta: { label: "Inscrire mon enfant", href: "/casting" },
              secondaryCta: { label: "Nos collections enfants", href: "/boutique" },
              backgroundImageUrl: "",
              overlay: 0.35,
              textAlign: "center",
            },
          },
          {
            type: "stats",
            props: {
              layout: "row",
              items: [
                { value: "320", suffix: "+", label: "Enfants inscrits" },
                { value: "80", suffix: "+", label: "Placements annuels" },
                { value: "7", label: "Ans d'expérience" },
                { value: "4.9", prefix: "★", label: "Avis parents" },
              ],
              background: "#F4A261",
            },
          },
          {
            type: "features",
            props: {
              heading: "Pourquoi PETITE ÉTOILE",
              layout: "grid",
              items: [
                {
                  icon: "⭐",
                  title: "Casting professionnel",
                  description:
                    "Séances de casting mensuelles à Dakar. Effraction sécurisée, accompagnement parental obligatoire, bienveillance garantie.",
                },
                {
                  icon: "📸",
                  title: "Formation & coaching",
                  description:
                    "Ateliers pose, confiance en soi, expression scénique. Nos jeunes arrivent préparés sur chaque shoot.",
                },
                {
                  icon: "🤝",
                  title: "Placement et contrats",
                  description:
                    "Nos enfants collaborent avec les meilleures marques africaines et internationales présentes en Afrique de l'Ouest.",
                },
                {
                  icon: "🛡️",
                  title: "Protection et éthique",
                  description:
                    "Charte éthique stricte, contrats clairs, présence parentale sur tous les shootings. Votre enfant est notre priorité.",
                },
              ],
            },
          },
          {
            type: "products",
            props: {
              heading: "Notre boutique enfants",
              subheading: "Collections mode enfants made in Sénégal. Livraison Dakar 24h.",
              columns: 3,
              filterTags: ["3-6 ans", "7-12 ans", "Ado", "Occasion"],
              items: [
                {
                  name: "Ensemble Wax Enfant",
                  description: "Tenue complète (haut + bas) en wax 100% coton. Disponible en 8 coloris. Du 3 au 14 ans.",
                  price: 18000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Handmade Dakar",
                  filterTags: ["3-6 ans", "7-12 ans"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221685000000",
                },
                {
                  name: "Robe Cérémonie Petite Fille",
                  description: "Robe tutu brodée pour baptêmes, communions et fêtes. Du 2 au 10 ans. Couleurs pastel.",
                  price: 25000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Cérémonie",
                  filterTags: ["3-6 ans", "7-12 ans", "Occasion"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221685000000",
                },
                {
                  name: "Tenue Garçon Casual",
                  description: "Ensemble chemise + short en tissu léger imprimé. Parfait pour l'école et les sorties.",
                  price: 15000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["3-6 ans", "7-12 ans"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221685000000",
                },
                {
                  name: "Ensemble Ado Mode",
                  description: "Look streetwear africain pour ados 12–16 ans. Hoodie + jogger tissu lourd.",
                  price: 32000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Ado"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221685000000",
                },
                {
                  name: "Tenue Mariage Enfant",
                  description: "Costume ou robe pour mariage. Disponible sur commande, délai 2 semaines.",
                  price: 45000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Sur commande",
                  filterTags: ["Occasion"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221685000000",
                },
                {
                  name: "Pack 3 essentiels bébé",
                  description: "3 bodies + 2 grenouillères + 1 bonnet. 100% coton biologique. Du 0 au 18 mois.",
                  price: 22000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["3-6 ans"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221685000000",
                },
              ],
            },
          },
          {
            type: "gallery",
            props: {
              heading: "Nos petites étoiles",
              layout: "masonry",
              images: [
                { url: "", alt: "Shooting campagne mode africaine enfants" },
                { url: "", alt: "Défilé marque locale" },
                { url: "", alt: "Casting mensuel Dakar" },
                { url: "", alt: "Enfants en tenue wax" },
                { url: "", alt: "Shooting produits bébé" },
                { url: "", alt: "Ateliers de formation pose" },
              ],
              instagramHandle: "@petiteetoile.dakar",
              followLabel: "Suivre sur Instagram",
            },
          },
          {
            type: "testimonials",
            props: {
              heading: "Ce que disent les parents",
              items: [
                {
                  quote:
                    "Ma fille Aïssatou a commencé à 5 ans. Grâce à PETITE ÉTOILE, elle a développé une confiance en elle extraordinaire. Elle a déjà participé à 3 campagnes de marques sénégalaises.",
                  author: "Mama Aïssatou",
                  role: "Mère, Dakar",
                },
                {
                  quote:
                    "L'équipe est professionnelle et bienveillante. Je suis toujours présent aux shootings et je vois comment ils prennent soin de mon fils. Je recommande à tous les parents.",
                  author: "Papa Moussa Jr.",
                  role: "Père, Thiès",
                },
                {
                  quote:
                    "On cherchait une activité qui développe la personnalité de notre fille. Elle fait du mannequinat depuis 2 ans et les résultats sont visibles : elle est à l'aise partout.",
                  author: "Famille Sylla",
                  role: "Dakar",
                },
              ],
            },
          },
          {
            type: "whatsapp",
            props: {
              heading: "Inscrire votre enfant",
              subheading:
                "Envoyez une photo de votre enfant, son âge et vos coordonnées. Réponse sous 24h.",
              phoneNumber: "221685000000",
              message:
                "Bonjour PETITE ÉTOILE, je souhaite inscrire mon enfant [prénom] âgé(e) de [âge] ans pour un casting. Nous sommes basés à [ville]. Je joins sa photo.",
              buttonLabel: "Inscrire mon enfant",
            },
          },
        ],
      },
      {
        slug: "casting",
        title: "Casting",
        sections: [
          {
            type: "split",
            props: {
              eyebrow: "Castings ouverts",
              heading: "Votre enfant\na du talent ?\nMontrez-le.",
              body: "PETITE ÉTOILE organise des sessions de casting tous les premiers samedis du mois à Dakar. Tous profils, toutes morphologies, 3 à 16 ans. L'inscription est gratuite. Les parents ou tuteurs doivent être présents.",
              imageUrl: "",
              imageSide: "right",
              cta: { label: "S'inscrire au prochain casting", href: "https://wa.me/221685000000" },
            },
          },
          {
            type: "features",
            props: {
              heading: "Comment ça marche",
              layout: "horizontal",
              items: [
                { icon: "📝", title: "1. Inscription", description: "Envoyez la photo de votre enfant, son âge et vos coordonnées via WhatsApp." },
                { icon: "📅", title: "2. Invitation casting", description: "Si le profil correspond, vous recevez une invitation pour le prochain casting mensuel." },
                { icon: "🎬", title: "3. Session casting", description: "1h de casting professionnel : pose, marche, expression. Parents présents et bienvenus." },
                { icon: "⭐", title: "4. Sélection & placement", description: "Les profils retenus intègrent notre portfolio et commencent à recevoir des propositions de missions." },
              ],
            },
          },
          {
            type: "faq",
            props: {
              heading: "Questions casting",
              items: [
                {
                  question: "À partir de quel âge peut-on s'inscrire ?",
                  answer:
                    "Nous accueillons les enfants de 3 à 16 ans. Pour les bébés (0–3 ans), nous avons un portefeuille séparé pour des missions spécifiques (publicités bébé, photos studio).",
                },
                {
                  question: "L'inscription est-elle payante ?",
                  answer:
                    "Non. L'inscription au casting est entièrement gratuite. Méfiez-vous des agences qui demandent un paiement pour un casting initial.",
                },
                {
                  question: "Combien gagne un enfant mannequin ?",
                  answer:
                    "Les rémunérations varient selon le type de mission : shooting photo (20 000–50 000 FCFA), publicité TV (50 000–150 000 FCFA), défilé (15 000–40 000 FCFA). Les paiements sont versés aux parents.",
                },
              ],
              contactPanel: {
                heading: "Prêt pour le casting ?",
                body: "Inscription gratuite, réponse sous 24h.",
                ctaLabel: "Envoyer la photo",
                ctaHref: "https://wa.me/221685000000",
              },
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
              heading: "Mode enfants",
              subheading: "Collections mode africaine pour enfants de 0 à 16 ans. Fabriqué à Dakar.",
              backgroundImageUrl: "",
              overlay: 0.3,
            },
          },
          {
            type: "products",
            props: {
              heading: "",
              columns: 3,
              filterTags: ["0-2 ans", "3-6 ans", "7-12 ans", "Ado", "Occasion"],
              items: [
                {
                  name: "Ensemble Wax Enfant",
                  description: "Tenue complète (haut + bas) wax 100% coton. Du 3 au 14 ans.",
                  price: 18000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["3-6 ans", "7-12 ans"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221685000000",
                },
                {
                  name: "Robe Cérémonie",
                  description: "Robe tutu brodée pour occasions spéciales. Du 2 au 10 ans.",
                  price: 25000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Cérémonie",
                  filterTags: ["3-6 ans", "7-12 ans", "Occasion"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221685000000",
                },
                {
                  name: "Pack 3 essentiels bébé",
                  description: "Bodies + grenouillères + bonnet. 100% coton bio. 0–18 mois.",
                  price: 22000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["0-2 ans"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221685000000",
                },
                {
                  name: "Tenue Casual Garçon",
                  description: "Chemise + short tissu léger imprimé. Tailles 2–14 ans.",
                  price: 15000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["3-6 ans", "7-12 ans"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221685000000",
                },
                {
                  name: "Ensemble Ado Mode",
                  description: "Streetwear africain 12–16 ans. Hoodie + jogger.",
                  price: 32000,
                  currency: "FCFA",
                  imageUrl: "",
                  filterTags: ["Ado"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221685000000",
                },
                {
                  name: "Tenue Mariage Enfant",
                  description: "Sur commande — délai 2 semaines. Toutes tailles.",
                  price: 45000,
                  currency: "FCFA",
                  imageUrl: "",
                  badge: "Sur commande",
                  filterTags: ["Occasion"],
                  ctaLabel: "Commander",
                  ctaHref: "https://wa.me/221685000000",
                },
              ],
            },
          },
        ],
      },
    ],
  };
}
